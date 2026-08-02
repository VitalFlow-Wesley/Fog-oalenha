import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CalendarDays, CheckCircle2, ChefHat, Clock, Eye, FileDown, Flame, PackageCheck, Printer, RefreshCw, Search, Send, Soup, Users, X } from 'lucide-react'

const sectorConfig = {
  cozinha: { label: 'Cozinha', icon: Soup, className: 'kitchen' },
  churrasco: { label: 'Churrasco', icon: Flame, className: 'grill' },
  sucos: { label: 'Sucos', icon: '🥤', className: 'juice' },
}

function getItemSector(item) {
  if (item.category === 'Churrasco' || item.category === 'Churrascos') return 'churrasco'
  if (item.category === 'Sucos') return 'sucos'
  if (item.localSaida === 'cozinha' || item.imprimeCozinha) return 'cozinha'
  return null
}

function currentTime() {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Fortaleza',
  }).format(new Date())
}

function currentDateTime() {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Fortaleza',
  }).format(new Date())
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function getPeopleCount(table = {}) {
  return Math.max(1, Number(table.peopleCount ?? table.guests ?? 1) || 1)
}

function buildKitchenOrders(tables, orderTimes) {
  return tables
    .filter(table => table.kitchenSent || table.status === 'enviado')
    .map(table => {
      const items = (table.items || [])
        .map(item => ({ ...item, sector: getItemSector(item) }))
        .filter(item => item.sector)

      const sectors = [...new Set(items.map(item => item.sector))]
      return {
        id: table.id,
        tableNumber: table.number,
        customerName: String(table.customerName || '').trim(),
        guests: getPeopleCount(table),
        peopleCount: getPeopleCount(table),
        time: table.kitchenSentAt || orderTimes[table.id] || currentTime(),
        waiterName: table.kitchenWaiterName || table.waiterName || 'Garçom',
        items,
        sectors,
        observations: [...new Set(items.map(item => item.observation).filter(Boolean))],
      }
    })
    .filter(order => order.items.length)
}

// --- MOTOR DE IMPRESSÃO ESC/POS DA COZINHA (DELEGAÇÃO PARA O WINDOWS) ---
async function executeThermalPrint(order, currentUser, settings) {
  try {
    const qzModule = await import('qz-tray');
    const qz = qzModule.default || qzModule;

    if (!qz) throw new Error("Módulo QZ Tray indisponível localmente.");

    // MÁGICA REAL: Removemos qualquer menção a qz.security! 
    // O QZ Tray vai puxar a permissão que você já salvou no "Remember this decision".

    if (!qz.websocket.isActive()) {
      await qz.websocket.connect();
    }

    // Busca a impressora configurada (Tenta a Cozinha primeiro, depois o Caixa)
    const systemSettings = settings || readJson('fogao-a-lenha-system-settings-v1', {});
    const printers = systemSettings?.printers || [];
    const printerId = systemSettings?.kitchenPrinterId || systemSettings?.cashierPrinterId;
    const selected = printers.find(p => p.id === printerId);
    const printerName = selected?.name || selected?.label || 'POS-80';

    await qz.printers.find(printerName);
    const config = qz.configs.create(printerName);

    const removeAccents = (str) => String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, "");

    let payload = [
      '\x1B' + '\x40', 
      '\x1B' + '\x61' + '\x31', 
      '================================\n',
      '       PEDIDO DE PREPARO        \n',
      '         (REIMPRESSAO)          \n',
      '================================\n',
      '\x1B' + '\x61' + '\x30', 
      `Mesa:      ${order.tableNumber}\n`,
      `Pessoas:   ${order.peopleCount || order.guests || 1}\n`,
      `Garcom:    ${removeAccents(order.waiterName || currentUser?.name || 'Garcom')}\n`,
      `Data:      ${currentDateTime()}\n`,
      '--------------------------------\n',
    ];

    order.items.forEach(item => {
       const itemName = removeAccents(item.name).toUpperCase();
       payload.push(`${item.qty}x ${itemName}\n`);
       
       if (item.observation) {
         payload.push(`   OBS: ${removeAccents(item.observation)}\n`);
       }
    });

    payload.push('--------------------------------\n');
    payload.push('\x1B' + '\x61' + '\x31'); 
    payload.push('*** BOM PREPARO ***\n');

    payload.push('\n\n\n\n');
    payload.push('\x1D' + '\x56' + '\x41' + '\x00'); 

    await qz.print(config, payload);
    return true;
  } catch (error) {
    console.error("Falha na impressão do pedido:", error);
    alert(`Erro na impressora: ${error.message || error}`);
    return false;
  }
}

export default function PedidosCozinha({ tables, currentUser, settings }) {
  const [activeSector, setActiveSector] = useState('todos')
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('Hoje')
  const [showPeriodMenu, setShowPeriodMenu] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [details, setDetails] = useState(null)
  const [orderTimes, setOrderTimes] = useState({})
  const isWaiter = currentUser?.role === 'garcom'
  const canSeeManagementSummary = !isWaiter

  useEffect(() => {
    setOrderTimes(prev => {
      let changed = false
      const next = { ...prev }
      tables.forEach(table => {
        if ((table.kitchenSent || table.status === 'enviado') && (table.items || []).length && !next[table.id]) {
          next[table.id] = table.kitchenSentAt || currentTime()
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [tables])

  const orders = useMemo(() => buildKitchenOrders(tables, orderTimes), [tables, orderTimes])

  const summary = useMemo(() => {
    const sentItems = orders.flatMap(order => order.items)
    const countBySector = sentItems.reduce((acc, item) => {
      acc[item.sector] = (acc[item.sector] || 0) + item.qty
      return acc
    }, { cozinha: 0, churrasco: 0, sucos: 0 })

    const lastOrder = orders[orders.length - 1]
    return {
      totalOrders: orders.length,
      tablesWithOrders: new Set(orders.map(order => order.tableNumber)).size,
      totalItems: sentItems.reduce((sum, item) => sum + item.qty, 0),
      lastOrder,
      countBySector,
    }
  }, [orders])

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase()
    return orders.filter(order => {
      const matchesSector = activeSector === 'todos' || order.sectors.includes(activeSector)
      const matchesSearch = !term ||
        `mesa ${order.tableNumber}`.toLowerCase().includes(term) ||
        order.customerName.toLowerCase().includes(term) ||
        order.items.some(item => item.name.toLowerCase().includes(term) || sectorConfig[item.sector]?.label.toLowerCase().includes(term))
      return matchesSector && matchesSearch
    })
  }, [orders, activeSector, search])

  function handlePrint() {
    window.print()
  }

  function handleRefresh() {
    setLastUpdate(new Date())
  }

  function selectPeriod(value) {
    setPeriod(value)
    setShowPeriodMenu(false)
    setLastUpdate(new Date())
  }

  async function reprintOrder(order) {
    await executeThermalPrint(order, currentUser, settings);
  }

  const topCards = [
    { title: 'Pedidos enviados', value: summary.totalOrders, icon: Send, tone: 'fire' },
    { title: 'Mesas com pedidos', value: summary.tablesWithOrders, icon: Users, tone: 'green' },
    { title: 'Itens enviados', value: summary.totalItems, icon: PackageCheck, tone: 'gold' },
    { title: 'Último envio', value: summary.lastOrder ? summary.lastOrder.time : '--:--', icon: Clock, tone: 'orange' },
  ]

  const sectorMetrics = [
    { key: 'cozinha', label: 'Cozinha', value: summary.countBySector.cozinha, icon: Soup },
    { key: 'churrasco', label: 'Churrasco', value: summary.countBySector.churrasco, icon: Flame },
    { key: 'sucos', label: 'Sucos', value: summary.countBySector.sucos, icon: '🥤' },
  ]

  return (
    <div className={`page kitchenOrdersPage ${isWaiter ? 'waiterKitchenView' : 'managerKitchenView'}`}>
      <header className="kitchenOrdersHeader kitchenOrdersHeaderRefined">
        <div className="kitchenTitleBlock">
          <span className="kitchenEyebrow">COZINHA</span>
          <h1>Pedidos enviados</h1>
          <p>{isWaiter ? 'Acompanhe somente os pedidos enviados para preparo.' : 'Acompanhe os pedidos enviados para preparo.'}</p>
        </div>

        <div className="kitchenActions kitchenActionsRefined noPrint">
          {canSeeManagementSummary && <div className="kitchenTopActions">
            <div className="periodSelectWrap">
              <button className="kitchenPeriodBtn" type="button" onClick={() => setShowPeriodMenu(prev => !prev)}>
                <CalendarDays size={18} /> {period} <span>⌄</span>
              </button>
              {showPeriodMenu && <div className="periodMenu kitchenPeriodMenu">
                {['Hoje', 'Semana', 'Mês'].map(item => <button type="button" key={item} onClick={() => selectPeriod(item)}>{item}</button>)}
              </div>}
            </div>
            <button className="kitchenPrimaryBtn" type="button" onClick={handleRefresh}><RefreshCw size={18} /> Atualizar</button>
          </div>}
          <div className="kitchenBottomActions">
            <label className="kitchenSearch">
              <Search size={18} />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por mesa, cliente ou item..." />
            </label>
            {canSeeManagementSummary && <button className="kitchenLightBtn" type="button" onClick={handlePrint}><Printer size={18} /> Imprimir</button>}
          </div>
        </div>
      </header>

      {canSeeManagementSummary && <section className="kitchenSummaryGrid">
        {topCards.map(card => {
          const Icon = card.icon
          return (
            <div className={`kitchenSummaryCard ${card.tone}`} key={card.title}>
              <div className="summaryRoundIcon"><Icon size={24} /></div>
              <div>
                <span>{card.title}</span>
                <strong>{card.value}</strong>
              </div>
            </div>
          )
        })}
      </section>}

      <div className="kitchenFilterChips noPrint">
        <button className={activeSector === 'todos' ? 'active' : ''} type="button" onClick={() => setActiveSector('todos')}>Todos</button>
        {Object.entries(sectorConfig).map(([key, sector]) => {
          const Icon = sector.icon
          return (
            <button className={`${activeSector === key ? 'active' : ''} ${sector.className}`} type="button" key={key} onClick={() => setActiveSector(key)}>
              {typeof Icon === 'string' ? Icon : <Icon size={16} />} {sector.label}
            </button>
          )
        })}
      </div>

      <div className="kitchenOrdersLayout">
        <section className="kitchenOrdersList">
          {filteredOrders.length === 0 && (
            <div className="emptyKitchenState">
              <ChefHat size={34} />
              <strong>Nenhum pedido encontrado</strong>
              <span>Envie um pedido pela comanda ou ajuste os filtros de busca.</span>
            </div>
          )}

          {filteredOrders.map(order => (
            <article className="kitchenOrderCard" key={order.id}>
              <div className="kitchenTableBadge">{String(order.tableNumber).padStart(2, '0')}</div>
              <div className="kitchenOrderMesa">
                <strong>Mesa {order.tableNumber}</strong>
                {order.customerName && <small className="kitchenCustomerName">{order.customerName}</small>}
                <span>{order.time}</span>
              </div>

              <div className="kitchenOrderContent">
                <div className="sectorBadges">
                  {order.sectors.map(sectorKey => {
                    const sector = sectorConfig[sectorKey]
                    const Icon = sector.icon
                    return <span className={sector.className} key={sectorKey}>{typeof Icon === 'string' ? Icon : <Icon size={15} />} {sector.label}</span>
                  })}
                </div>
                <ul>
                  {order.items.map((item, index) => <li key={`${item.id}-${index}`}>{item.qty}x {item.name}</li>)}
                </ul>
                {order.observations.map(obs => <p className="kitchenObs" key={obs}>Obs: {obs}</p>)}
              </div>

              <div className="kitchenOrderActions noPrint">
                <span className="sentBadge"><CheckCircle2 size={16} /> Enviado</span>
                <button type="button" onClick={() => setDetails(order)}><Eye size={16} /> Ver detalhes</button>
                <button type="button" onClick={() => reprintOrder(order)}><Printer size={16} /> Reimprimir</button>
              </div>
            </article>
          ))}
        </section>

        {canSeeManagementSummary && <aside className="kitchenOperationalCard kitchenOperationalCardRefined">
          <div className="kitchenSideTitle"><BarChart3 size={22} /><h2>Resumo operacional</h2></div>

          <div className="lastOrderBox">
            <Clock size={20} />
            <div>
              <span>Último pedido</span>
              <strong>{summary.lastOrder ? `Mesa ${summary.lastOrder.tableNumber} às ${summary.lastOrder.time}` : 'Nenhum envio'}</strong>
              {summary.lastOrder?.customerName && <small className="lastOrderCustomer">{summary.lastOrder.customerName}</small>}
            </div>
          </div>

          <div className="sectorMetricGrid">
            {sectorMetrics.map(metric => {
              const Icon = metric.icon
              return (
                <div className={`sectorMetricBox ${metric.key}`} key={metric.key}>
                  {typeof Icon === 'string' ? <span className="emojiIcon">{Icon}</span> : <Icon size={18} />}
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small>{metric.value === 1 ? 'item' : 'itens'}</small>
                </div>
              )
            })}
          </div>

          <div className="totalSentBox">
            <PackageCheck size={20} />
            <span>Total de itens enviados</span>
            <strong>{summary.totalItems}</strong>
          </div>

          <button className="exportPdfBtn noPrint" type="button" onClick={handlePrint}><FileDown size={18} /> Exportar PDF</button>
          <div className="kitchenFlowMessage"><CheckCircle2 size={18} /> Fluxo da cozinha sob controle!</div>
        </aside>}
      </div>

      {details && <div className="authModalOverlay noPrint">
        <div className="authModal kitchenDetailsModal">
          <div className="drawerHeader">
            <div><span className="eyebrow">DETALHES DO PEDIDO</span><h2>Mesa {details.tableNumber}</h2>{details.customerName && <p className="kitchenDetailsCustomer">Cliente: {details.customerName}</p>}</div>
            <button type="button" className="iconBtn" onClick={() => setDetails(null)}><X size={22} /></button>
          </div>
          <p>Pedido enviado às {details.time}</p>
          <div className="sectorBadges">{details.sectors.map(sectorKey => {
            const sector = sectorConfig[sectorKey]
            const Icon = sector.icon
            return <span className={sector.className} key={sectorKey}>{typeof Icon === 'string' ? Icon : <Icon size={15} />} {sector.label}</span>
          })}</div>
          <ul className="kitchenDetailsList">{details.items.map((item, index) => <li key={`${item.id}-${index}`}><strong>{item.qty}x {item.name}</strong>{item.observation && <small>Obs: {item.observation}</small>}</li>)}</ul>
          <button className="secondaryBtn" type="button" onClick={() => reprintOrder(details)}><Printer size={17} /> Reimprimir pedido</button>
        </div>
      </div>}
    </div>
  )
}
