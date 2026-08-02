import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CalendarDays, CheckCircle2, DollarSign, Flame, LockKeyhole, Printer, ReceiptText, ShieldCheck, Star, Table2, Users, X } from 'lucide-react'
import { loadRemoteState } from '../services/appStateApi.js'
import { configureQzSecurity } from '../services/qzPrintService.js'

const CLOSED_TABLES_KEY = 'fogao-closed-tables-v1'
const money = value => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const parseCurrency = value => {
  const raw = String(value || '').trim().replace(/[^0-9,.-]/g, '')
  if (!raw) return 0
  if (raw.includes(',') && raw.includes('.')) return Number(raw.replace(/\./g, '').replace(',', '.')) || 0
  if (raw.includes(',')) return Number(raw.replace(',', '.')) || 0
  return Number(raw) || 0
}
const todayInput = () => new Date().toISOString().slice(0, 10)
const managerRoles = ['admin', 'administrador', 'gerente', 'manager']

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function getStoredUsers(fallbackUsers = []) {
  try {
    const stored = JSON.parse(localStorage.getItem('fogao-users-v1') || 'null')
    if (Array.isArray(stored)) return stored
    if (Array.isArray(stored?.users)) return stored.users
  } catch {
    return fallbackUsers
  }
  return fallbackUsers
}

function validateManagerPassword(password, users = []) {
  return getStoredUsers(users).find(user => {
    const role = String(user.role || '').toLowerCase()
    const userPassword = user.password ?? user.senha
    return user.active !== false && managerRoles.includes(role) && String(userPassword || '') === password
  })
}

function getTableTotal(table) {
  return (table.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0)
}

function getTableItems(tables = []) {
  return tables.flatMap(table => (table.items || []).map(item => ({ ...item, tableNumber: table.number })))
}

function getTableWaiter(table) {
  return table.waiterName || table.kitchenWaiterName || table.openedByName || table.createdByName || 'Sem garçom'
}

function getClosedTablesForDate(history = [], date = todayInput()) {
  return (history || [])
    .filter(record => record?.date === date)
    .sort((a, b) => new Date(b.closedAt || 0) - new Date(a.closedAt || 0))
}

function closedRecordToTable(record) {
  return {
    id: record.tableId || record.id,
    number: record.tableNumber,
    status: 'fechada',
    guests: Number(record.guests || 0),
    waiterName: record.waiterName || 'Sem garcom',
    closedAt: record.closedAt,
    closedAtLabel: record.closedAtLabel,
    closedByMode: record.closedByMode,
    items: (record.items || []).map(item => ({
      ...item,
      tableNumber: record.tableNumber,
      waiterName: record.waiterName || 'Sem garcom',
      price: Number(item.price || 0),
      qty: Number(item.qty || 0),
    })),
  }
}

function buildWaiterSummary(tables = []) {
  const map = new Map()
  tables.forEach(table => {
    const waiterName = getTableWaiter(table)
    const current = map.get(waiterName) || { name: waiterName, tables: 0, total: 0 }
    current.tables += 1
    current.total += getTableTotal(table)
    map.set(waiterName, current)
  })
  return Array.from(map.values()).sort((a, b) => b.total - a.total || b.tables - a.tables)
}

function buildCategorySummary(items = []) {
  const map = new Map()
  items.forEach(item => {
    const name = item.category || 'Outros'
    const total = Number(item.price || 0) * Number(item.qty || 0)
    map.set(name, (map.get(name) || 0) + total)
  })
  return Array.from(map.entries()).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total)
}

function buildTopProducts(items = []) {
  const map = new Map()
  items.forEach(item => {
    const name = item.name || 'Produto'
    const current = map.get(name) || { name, qty: 0, total: 0 }
    current.qty += Number(item.qty || 0)
    current.total += Number(item.price || 0) * Number(item.qty || 0)
    map.set(name, current)
  })
  const list = Array.from(map.values())
  return {
    byQty: [...list].sort((a, b) => b.qty - a.qty || b.total - a.total).slice(0, 5),
    byRevenue: [...list].sort((a, b) => b.total - a.total || b.qty - a.qty).slice(0, 5),
  }
}

function buildClosingData(tables = [], closedTablesHistory = [], selectedDate = todayInput()) {
  const activeTables = tables.filter(table => ['ocupada', 'enviado', 'conta'].includes(table.status) || getTableTotal(table) > 0 || Number(table.guests || 0) > 0)
  const closedTableRecords = getClosedTablesForDate(closedTablesHistory, selectedDate)
  const closedTables = closedTableRecords.map(closedRecordToTable)
  const conferenceTables = [...activeTables, ...closedTables]
  const items = getTableItems(conferenceTables)
  const total = conferenceTables.reduce((sum, table) => sum + getTableTotal(table), 0)
  const totalItems = items.reduce((sum, item) => sum + Number(item.qty || 0), 0)
  const sentToKitchen = items.filter(item => item.sentToKitchen || item.printTarget === 'cozinha' || item.imprimeCozinha).reduce((sum, item) => sum + Number(item.qty || 0), 0)
  const categories = buildCategorySummary(items)
  const topProducts = buildTopProducts(items)
  const waiters = buildWaiterSummary(conferenceTables)
  const topWaiter = waiters[0] || { name: 'Nenhum garçom', tables: 0, total: 0 }

  return {
    date: selectedDate,
    total,
    payments: { dinheiro: 0, pix: 0, cartao: 0, outros: 0 },
    closedTables: closedTableRecords.length,
    openTables: activeTables.length,
    conferenceTables: conferenceTables.length,
    totalOrders: totalItems,
    cancelledItems: { qty: 0, total: 0 },
    discounts: { qty: 0, total: 0 },
    reprints: 0,
    sentToKitchen,
    categories,
    categoryTotal: total,
    topProductsByQty: topProducts.byQty,
    topProductsByRevenue: topProducts.byRevenue,
    waiters,
    topWaiter,
    ticketAverage: conferenceTables.length ? total / conferenceTables.length : 0,
  }
}

function MiniSummary({ icon: Icon, title, value, tone = 'green' }) {
  return <div className="closingMiniCard"><div className={`closingMiniIcon ${tone}`}><Icon size={19} /></div><span>{title}</span><strong>{value}</strong></div>
}

function ProductRanking({ products, emptyMessage = 'Nenhum produto vendido ainda.' }) {
  if (!products.length) return <div className="productsEmpty">{emptyMessage}</div>
  return products.map((item, index) => <div className="productRank" key={item.name}><em>{index + 1}</em><span>{item.name}</span><b>{item.qty}</b><strong>{money(item.total)}</strong></div>)
}

function PaymentVisual({ data }) {
  const total = data.total || 1
  const items = [
    ['Dinheiro', data.payments.dinheiro, 'cash'],
    ['PIX', data.payments.pix, 'pix'],
    ['Cartão', data.payments.cartao, 'card'],
    ['Outros', data.payments.outros, 'other'],
  ]
  const cashPercent = items[0][1] / total * 100
  const pixPercent = (items[0][1] + items[1][1]) / total * 100
  const cardPercent = (items[0][1] + items[1][1] + items[2][1]) / total * 100
  const gradient = `conic-gradient(#4e9f53 0 ${cashPercent}%, #2aa889 ${cashPercent}% ${pixPercent}%, #4777b8 ${pixPercent}% ${cardPercent}%, #9164bd 0)`
  return <div className="paymentVisual"><div className="donut" style={{ background: gradient }}><div><strong>{money(data.total)}</strong><span>Total informado</span></div></div><div className="paymentLegend">{items.map(([label, value, key]) => <div key={label}><i className={key} /><span>{label}<small>{data.total ? (value / data.total * 100).toFixed(1).replace('.', ',') : '0,0'}%</small></span><b>{money(value)}</b></div>)}</div></div>
}

function CategoryBars({ categories, total }) {
  const base = total || categories.reduce((sum, item) => sum + item.total, 0) || 1
  if (!categories.length) return <div className="productsEmpty">Nenhuma venda por categoria ainda.</div>
  return <div className="categoryBars">{categories.map(item => { const percent = item.total / base * 100; return <div className="categoryLine" key={item.name}><div><span>{item.name}</span><b>{percent.toFixed(1).replace('.', ',')}%</b></div><div className="progress"><span style={{ width: `${Math.min(percent, 100)}%` }} /></div><small>{money(item.total)}</small></div> })}</div>
}

// --- MOTOR DE IMPRESSÃO ESC/POS (DELEGAÇÃO TOTAL PARA O WINDOWS, SEM CRIPTOGRAFIA MANUAL) ---
async function executeThermalPrint(data, received, informedTotal, difference, note, currentUser, date, settings) {
  try {
    const qzModule = await import('qz-tray');
    const qz = qzModule.default || qzModule;
    await configureQzSecurity(qz);

    if (!qz) throw new Error("Módulo QZ Tray indisponível localmente.");

    // A mágica: NÃO adicionamos qz.security.setCertificatePromise nem setSignaturePromise aqui.
    // Assim, o QZ Tray trata como site anônimo e pede a permissão na tela, que foi o que funcionou antes!

    if (!qz.websocket.isActive()) {
      await qz.websocket.connect();
    }

    // Busca a impressora configurada (Caixa)
    const systemSettings = settings || readJson('fogao-a-lenha-system-settings-v1', {});
    const printers = systemSettings?.printers || [];
    const printerId = systemSettings?.cashierPrinterId;
    const selected = printers.find(p => p.id === printerId);
    const printerName = selected?.name || selected?.label || 'POS-80';

    await qz.printers.find(printerName);
    const config = qz.configs.create(printerName);

    const removeAccents = (str) => String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, "");

    let payload = [
      '\x1B' + '\x40', 
      '\x1B' + '\x61' + '\x31', 
      '================================\n',
      '       FECHAMENTO DE CAIXA      \n',
      '          FOGAO A LENHA         \n',
      '================================\n',
      '\x1B' + '\x61' + '\x30', 
      `Data:     ${date}\n`,
      `Operador: ${removeAccents(currentUser?.name || currentUser?.username || 'Operador')}\n`,
      '--------------------------------\n',
    ];

    const addLine = (label, value) => {
      payload.push(`${label}\n`);
      payload.push('\x1B' + '\x61' + '\x32'); 
      payload.push(`${value}\n`);
      payload.push('\x1B' + '\x61' + '\x30'); 
    };

    addLine("Faturamento total:", money(data.total));
    addLine("Total informado no caixa:", money(informedTotal));
    addLine("Diferenca final:", money(difference));
    
    payload.push('--------------------------------\n');
    payload.push(`Mesas abertas no salao: ${data.openTables}\n`);
    payload.push(`Mesas fechadas no dia:  ${data.closedTables}\n`);
    payload.push(`Total de itens:         ${data.totalOrders}\n`);
    payload.push(`Ticket medio:           ${money(data.ticketAverage)}\n`);
    payload.push('--------------------------------\n');
    
    payload.push('\x1B' + '\x61' + '\x31');
    payload.push('RECEBIMENTOS INFORMADOS\n');
    payload.push('\x1B' + '\x61' + '\x30');
    addLine("Dinheiro:", money(received.dinheiro));
    addLine("PIX:", money(received.pix));
    addLine("Cartao:", money(received.cartao));
    addLine("Outros:", money(received.outros));
    payload.push('--------------------------------\n');

    if (data.categories.length > 0) {
      payload.push('\x1B' + '\x61' + '\x31');
      payload.push('VENDAS POR CATEGORIA\n');
      payload.push('\x1B' + '\x61' + '\x30');
      data.categories.forEach(c => addLine(removeAccents(c.name) + ":", money(c.total)));
      payload.push('--------------------------------\n');
    }

    if (data.topProductsByQty.length > 0) {
      payload.push('\x1B' + '\x61' + '\x31');
      payload.push('PRODUTOS MAIS VENDIDOS\n');
      payload.push('\x1B' + '\x61' + '\x30');
      data.topProductsByQty.forEach((p, i) => addLine(`${i+1}. ${removeAccents(p.name)} (${p.qty}x):`, money(p.total)));
      payload.push('--------------------------------\n');
    }

    if (data.waiters.length > 0) {
      payload.push('\x1B' + '\x61' + '\x31');
      payload.push('RANKING POR GARCOM\n');
      payload.push('\x1B' + '\x61' + '\x30');
      data.waiters.forEach(w => addLine(`${removeAccents(w.name)} (${w.tables} mesas):`, money(w.total)));
      payload.push('--------------------------------\n');
    }

    if (note) {
      payload.push(`Observacao:\n${removeAccents(note)}\n`);
      payload.push('--------------------------------\n');
    }

    payload.push('\x1B' + '\x61' + '\x31'); 
    payload.push('Relatorio gerado pelo sistema.\n');

    payload.push('\n\n\n\n');
    payload.push('\x1D' + '\x56' + '\x41' + '\x00'); 

    await qz.print(config, payload);
    return true;
  } catch (err) {
    console.error("Falha na impressão do fechamento:", err);
    alert(`Erro na impressora: ${err.message || err}`);
    return false;
  }
}

export default function Fechamento({ tables = [], currentUser, settings, onCloseCash }) {
  const [date, setDate] = useState(todayInput())
  const [closedTablesHistory, setClosedTablesHistory] = useState(() => readJson(CLOSED_TABLES_KEY, []))
  const data = useMemo(() => buildClosingData(tables, closedTablesHistory, date), [tables, closedTablesHistory, date])
  const [reportedPayments, setReportedPayments] = useState(() => ({ dinheiro: '', pix: '', cartao: '', outros: '' }))
  const [note, setNote] = useState('')
  const [closed, setClosed] = useState(false)
  const [closingMessage, setClosingMessage] = useState('')
  const [isClosing, setIsClosing] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [authPassword, setAuthPassword] = useState('')
  const [authObservation, setAuthObservation] = useState('')
  const [modalError, setModalError] = useState('')

  useEffect(() => {
    let cancelled = false
    const syncClosedTables = async () => {
      const localHistory = readJson(CLOSED_TABLES_KEY, [])
      setClosedTablesHistory(localHistory)

      try {
        const remoteState = await loadRemoteState()
        if (cancelled || !Array.isArray(remoteState?.closedTablesHistory)) return
        if (remoteState.closedTablesHistory.length) {
          localStorage.setItem(CLOSED_TABLES_KEY, JSON.stringify(remoteState.closedTablesHistory))
          setClosedTablesHistory(remoteState.closedTablesHistory)
        }
      } catch {
      }
    }
    syncClosedTables()
    window.addEventListener('fogao-closed-tables-updated', syncClosedTables)
    window.addEventListener('storage', syncClosedTables)
    window.addEventListener('focus', syncClosedTables)
    return () => {
      cancelled = true
      window.removeEventListener('fogao-closed-tables-updated', syncClosedTables)
      window.removeEventListener('storage', syncClosedTables)
      window.removeEventListener('focus', syncClosedTables)
    }
  }, [])

  const received = {
    dinheiro: parseCurrency(reportedPayments.dinheiro),
    pix: parseCurrency(reportedPayments.pix),
    cartao: parseCurrency(reportedPayments.cartao),
    outros: parseCurrency(reportedPayments.outros),
  }
  const informedTotal = Object.values(received).reduce((sum, value) => sum + value, 0)
  const difference = informedTotal - data.total
  const differenceOk = Math.abs(difference) < 0.01
  const hasDivergence = !differenceOk
  const hasOpenTables = data.openTables > 0
  const requiresAttention = hasDivergence || hasOpenTables
  const receivedData = { ...data, payments: received, total: informedTotal }

  function setPayment(key, value) {
    setReportedPayments(prev => ({ ...prev, [key]: value }))
  }

  async function handlePrint() { 
    await executeThermalPrint(data, received, informedTotal, difference, note, currentUser, date, settings);
  }
  
  function openCloseModal() {
    if (isClosing || closed) return
    setModalError('')
    setAuthPassword('')
    setAuthObservation(note)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setModalError('')
    setAuthPassword('')
  }

  async function confirmCloseCash() {
    if (isClosing || closed) return
    const cleanObservation = authObservation.trim()
    let authorizedBy = null
    let closingNote = note.trim()

    if (hasDivergence) {
      if (!cleanObservation) {
        setModalError('Informe uma observação explicando a divergência.')
        return
      }

      authorizedBy = validateManagerPassword(authPassword)
      if (!authorizedBy) {
        setModalError('Senha inválida. Use a senha de um gerente ou administrador ativo.')
        return
      }

      closingNote = `Divergência autorizada por gerente/admin. Observação: ${cleanObservation}`
    }

    setIsClosing(true)
    try {
      await onCloseCash?.({ date, payments: received, note: closingNote })
      setClosed(true)
      setReportedPayments({ dinheiro: '', pix: '', cartao: '', outros: '' })
      setNote(closingNote)
      setClosingMessage(differenceOk ? 'Caixa fechado com sucesso. O histórico do dia foi salvo e um novo caixa foi iniciado.' : `Caixa fechado com divergência de ${money(difference)}. O histórico do dia foi salvo e um novo caixa foi iniciado.`)
      closeModal()
    } catch (error) {
      setClosingMessage(`Caixa fechado localmente, mas houve falha ao sincronizar: ${error.message}`)
      setClosed(true)
    } finally {
      setIsClosing(false)
    }
  }

  return <div className={`page closingPage ${closed ? 'cashClosed' : ''}`}>
    <header className="closingHeader"><div><span className="closingEyebrow">FECHAMENTO DO DIA</span><h1>Fechamento de Caixa</h1><p>Acompanhe o resumo do caixa, confira valores e feche o caixa do dia.</p>{closed && <em className="closedBadge">Caixa fechado por {currentUser?.name || 'operador'} agora</em>}{closingMessage && <p className="closingSuccessMessage">{closingMessage}</p>}</div><div className="closingHeaderActions"><label><CalendarDays size={18} /><input type="date" value={date} onChange={e => setDate(e.target.value)} disabled={closed} /></label></div></header>

    <section className="closingMainGrid"><div className="closingPanel daySummary"><h2><span><Flame size={20} /></span>Resumo do dia</h2><div className="closingMiniGrid compactClosingSummary"><MiniSummary icon={DollarSign} title="Faturamento total" value={money(data.total)} /><MiniSummary icon={Table2} title="Mesas fechadas" value={data.closedTables} tone="orange" /><MiniSummary icon={Table2} title="Mesas abertas" value={data.openTables} tone="yellow" /><MiniSummary icon={ReceiptText} title="Total de itens" value={data.totalOrders} tone="blue" /></div><div className="ticketAverage"><span><Star size={17} /> Ticket médio</span><strong>{money(data.ticketAverage)}</strong></div><div className="ticketAverage topWaiterHighlight"><span><Users size={17} /> Garçom destaque</span><strong>{data.topWaiter.name} · {data.topWaiter.tables} mesa{data.topWaiter.tables === 1 ? '' : 's'} · {money(data.topWaiter.total)}</strong></div></div>

      <div className="closingPanel cashConference"><h2><span><LockKeyhole size={20} /></span>Conferência do caixa</h2><p className="conferenceHint">Informe dinheiro, PIX, cartão e outros recebimentos. Se houver divergência, o caixa ainda pode ser fechado e a diferença ficará registrada no histórico.</p><div className="cashRows paymentConferenceGrid"><label><span>Dinheiro recebido</span><input value={reportedPayments.dinheiro} onChange={e => setPayment('dinheiro', e.target.value)} disabled={closed} placeholder="0,00" /></label><label><span>PIX recebido</span><input value={reportedPayments.pix} onChange={e => setPayment('pix', e.target.value)} disabled={closed} placeholder="0,00" /></label><label><span>Cartões recebidos</span><input value={reportedPayments.cartao} onChange={e => setPayment('cartao', e.target.value)} disabled={closed} placeholder="0,00" /></label><label><span>Outros recebimentos</span><input value={reportedPayments.outros} onChange={e => setPayment('outros', e.target.value)} disabled={closed} placeholder="0,00" /></label></div><div className="cashTotalsGrid"><p><span>Total lançado nas mesas</span><strong>{money(data.total)}</strong></p><p><span>Total informado no caixa</span><strong>{money(informedTotal)}</strong></p><p><span>Diferença final</span><strong className={differenceOk ? 'positive' : 'negative'}>{money(difference)}</strong></p></div><label className="noteField"><span>{hasDivergence ? 'Observação obrigatória:' : 'Observação (opcional):'}</span><textarea placeholder="Digite alguma observação sobre o fechamento..." value={note} onChange={e => setNote(e.target.value)} disabled={closed} /></label><button type="button" className="primaryClosingBtn" onClick={openCloseModal} disabled={closed || isClosing}><LockKeyhole size={19} /> {isClosing ? 'Fechando caixa...' : differenceOk ? 'Conferir e fechar caixa' : 'Fechar caixa com divergência'}</button></div></section>

    <section className="closingDetailsGrid"><div className="closingPanel paymentPanel"><h3>Recebimentos informados</h3><PaymentVisual data={receivedData} /></div><div className="closingPanel categoryPanel"><h3>Vendas por categoria</h3><CategoryBars categories={data.categories} total={data.categoryTotal} /></div><div className="closingPanel topProductsPanel"><h3>Produtos mais vendidos por quantidade</h3><ProductRanking products={data.topProductsByQty} /></div><div className="closingPanel topProductsRevenuePanel"><h3>Produtos com maior faturamento</h3><ProductRanking products={data.topProductsByRevenue} /></div><div className="closingPanel otherDetailsPanel"><h3>Outros detalhes</h3><p><Users size={17} /><span>Garçom que mais vendeu</span><strong>{data.topWaiter.name}</strong><small>{data.topWaiter.tables} mesa{data.topWaiter.tables === 1 ? '' : 's'} · {money(data.topWaiter.total)}</small></p><p><AlertCircle size={17} /><span>Itens cancelados</span><strong>{data.cancelledItems.qty}</strong><small>{money(data.cancelledItems.total)}</small></p><p><Star size={17} /><span>Descontos concedidos</span><strong>{data.discounts.qty}</strong><small>{money(data.discounts.total)}</small></p><p><Printer size={17} /><span>Reimpressões</span><strong>{data.reprints}</strong><small>ações</small></p><p><Flame size={17} /><span>Pedidos enviados para preparo</span><strong>{data.sentToKitchen}</strong><small>itens</small></p></div></section>

    <div className="printOnly closingPrintReport">
      <h1>FECHAMENTO DE CAIXA</h1>
      <p><strong>Fogão a Lenha</strong></p>
      <p><strong>Data:</strong> {date}</p>
      <p><strong>Operador:</strong> {currentUser?.name || currentUser?.username || 'Operador'}</p>
      <hr />
      <div className="printLine"><span>Faturamento total</span><strong>{money(data.total)}</strong></div>
      <div className="printLine"><span>Total informado</span><strong>{money(informedTotal)}</strong></div>
      <div className="printLine"><span>Diferença final</span><strong>{money(difference)}</strong></div>
      <div className="printLine"><span>Mesas abertas</span><strong>{data.openTables}</strong></div>
      <div className="printLine"><span>Mesas fechadas no dia</span><strong>{data.closedTables}</strong></div>
      <div className="printLine"><span>Total de itens</span><strong>{data.totalOrders}</strong></div>
      <div className="printLine"><span>Ticket médio</span><strong>{money(data.ticketAverage)}</strong></div>
      <div className="printLine"><span>Garçom destaque</span><strong>{data.topWaiter.name}</strong></div>
      <div className="printLine"><span>Mesas atendidas</span><strong>{data.topWaiter.tables}</strong></div>
      <div className="printLine"><span>Vendido pelo garçom</span><strong>{money(data.topWaiter.total)}</strong></div>
      <hr />
      <p><strong>Recebimentos informados</strong></p>
      <div className="printLine"><span>Dinheiro</span><strong>{money(received.dinheiro)}</strong></div>
      <div className="printLine"><span>PIX</span><strong>{money(received.pix)}</strong></div>
      <div className="printLine"><span>Cartão</span><strong>{money(received.cartao)}</strong></div>
      <div className="printLine"><span>Outros</span><strong>{money(received.outros)}</strong></div>
      <hr />
      <p><strong>Vendas por categoria</strong></p>
      {data.categories.length ? data.categories.map(item => <div className="printLine" key={item.name}><span>{item.name}</span><strong>{money(item.total)}</strong></div>) : <p>Nenhuma venda por categoria.</p>}
      <hr />
      <p><strong>Produtos mais vendidos por quantidade</strong></p>
      {data.topProductsByQty.length ? data.topProductsByQty.map((item, index) => <div className="printLine" key={item.name}><span>{index + 1}. {item.name} ({item.qty}x)</span><strong>{money(item.total)}</strong></div>) : <p>Nenhum produto vendido.</p>}
      <hr />
      <p><strong>Produtos com maior faturamento</strong></p>
      {data.topProductsByRevenue.length ? data.topProductsByRevenue.map((item, index) => <div className="printLine" key={item.name}><span>{index + 1}. {item.name} ({item.qty}x)</span><strong>{money(item.total)}</strong></div>) : <p>Nenhum produto vendido.</p>}
      <hr />
      <p><strong>Ranking por garçom</strong></p>
      {data.waiters.length ? data.waiters.map(item => <div className="printLine" key={item.name}><span>{item.name} ({item.tables} mesa{item.tables === 1 ? '' : 's'})</span><strong>{money(item.total)}</strong></div>) : <p>Nenhum garçom identificado.</p>}
      {note && <><hr /><p><strong>Observação:</strong> {note}</p></>}
      <hr />
      <p className="printFooter">Relatório gerado pelo sistema Fogão a Lenha.</p>
    </div>

    <footer className="closingActions"><button type="button" onClick={handlePrint}><Printer size={20} /> Imprimir fechamento</button><button type="button" className="closeDayBtn" onClick={openCloseModal} disabled={closed || isClosing}><LockKeyhole size={20} /> {isClosing ? 'Fechando...' : differenceOk ? 'Fechar caixa do dia' : 'Fechar caixa com divergência'}</button></footer>

    {modalOpen && <style>{`.closingModalOverlay{position:fixed;inset:0;z-index:80;background:rgba(31,16,10,.62);display:grid;place-items:center;padding:18px;backdrop-filter:blur(3px)}.closingModalCard{width:min(620px,100%);max-height:92vh;overflow:auto;border-radius:22px;border:1px solid #ead7bf;background:linear-gradient(135deg,#fffdf8,#fff4e4);box-shadow:0 28px 70px rgba(31,16,10,.32);padding:24px;position:relative;color:#351b12}.closingModalCard.hasDivergence{border-color:#e7b18d}.closingModalClose{position:absolute;right:16px;top:16px;width:38px;height:38px;border:1px solid #ead7bf;border-radius:999px;background:#fffaf2;color:#5a2d1f;display:grid;place-items:center;cursor:pointer}.closingModalHeader{display:grid;grid-template-columns:48px minmax(0,1fr);gap:14px;align-items:center;margin-right:34px}.closingModalHeader>span{width:48px;height:48px;border-radius:16px;background:#f8e8d8;color:#bd381d;display:grid;place-items:center}.closingModalHeader h2{margin:0;font-family:Georgia,serif;font-size:28px;line-height:1.05;color:#32180f}.closingModalHeader p{margin:6px 0 0;color:#7b6253;font-weight:700}.closingModalAlert{margin-top:18px;border:1px solid #f1b38e;border-radius:16px;background:#fff0e6;color:#9d2e1c;padding:13px 14px;display:flex;gap:10px;align-items:flex-start;font-weight:900}.closingModalSummary{margin-top:18px;display:grid;gap:10px}.closingModalSummary p{margin:0;display:flex;justify-content:space-between;gap:16px;align-items:center;border:1px solid #ead7bf;border-radius:14px;background:#fffaf2;padding:12px 14px}.closingModalSummary span{font-weight:850;color:#5a4033}.closingModalSummary strong{font-size:18px;color:#2f1a12;text-align:right}.closingModalSummary strong.negative{color:#d2472b}.closingModalSummary strong.positive{color:#52740f}.closingModalFields{display:grid;gap:12px;margin-top:18px}.closingModalFields label{display:grid;gap:7px;font-weight:900;color:#3b261d}.closingModalFields input,.closingModalFields textarea{width:100%;border:1px solid #e2cdb3;border-radius:13px;background:#fffaf4;color:#32180f;padding:12px 13px;font-size:15px}.closingModalFields textarea{min-height:96px;resize:vertical}.closingModalNote{margin-top:16px;border-radius:14px;background:#fffaf2;border:1px solid #ead7bf;padding:12px 14px;display:grid;gap:4px}.closingModalError{margin-top:14px;border:1px solid #efb3a0;border-radius:14px;background:#fff0eb;color:#a93420;padding:12px 14px;display:flex;gap:9px;align-items:center;font-weight:900}.closingModalActions{margin-top:20px;display:grid;grid-template-columns:1fr 1.35fr;gap:12px}.closingModalActions button{height:50px;border-radius:14px;font-weight:950;font-size:15px;cursor:pointer}.closingCancelBtn{border:1px solid #e2cdb3;background:#fffaf4;color:#4a2b1f}.closingConfirmBtn{border:0;background:linear-gradient(135deg,#bd381d,#f05a36);color:#fff;box-shadow:0 12px 24px rgba(199,65,35,.22)}@media(max-width:640px){.closingModalOverlay{padding:10px;place-items:end center}.closingModalCard{border-radius:20px 20px 0 0;padding:20px 16px}.closingModalHeader{grid-template-columns:40px minmax(0,1fr);gap:11px}.closingModalHeader>span{width:40px;height:40px;border-radius:13px}.closingModalHeader h2{font-size:24px}.closingModalSummary p{display:grid;gap:4px}.closingModalSummary strong{text-align:left}.closingModalActions{grid-template-columns:1fr}}`}</style>}
    {modalOpen && <div className="closingModalOverlay" role="dialog" aria-modal="true" aria-labelledby="closingModalTitle">
      <div className={`closingModalCard ${requiresAttention ? 'hasDivergence' : ''}`}>
        <button type="button" className="closingModalClose" onClick={closeModal} aria-label="Fechar"><X size={20} /></button>
        <div className="closingModalHeader">
          <span>{requiresAttention ? <ShieldCheck size={24} /> : <CheckCircle2 size={24} />}</span>
          <div>
            <h2 id="closingModalTitle">{hasDivergence ? 'Autorização necessária' : 'Confirmar fechamento'}</h2>
            <p>{hasOpenTables ? 'Existem mesas abertas. Ao confirmar, todas serão fechadas e removidas do salão.' : hasDivergence ? 'Existe diferença no caixa. Confirme os valores e autorize o fechamento.' : 'Revise o resumo antes de fechar o caixa do dia.'}</p>
          </div>
        </div>

        {requiresAttention && <div className="closingModalAlert"><AlertCircle size={20} /> {hasOpenTables ? `${data.openTables} mesa${data.openTables === 1 ? '' : 's'} aberta${data.openTables === 1 ? '' : 's'} serão fechadas e apagadas do salão ao confirmar.` : 'As mesas serão fechadas, pedidos limpos e o salão será zerado ao confirmar.'}</div>}

        <div className="closingModalSummary">
          <p><span>Total lançado nas mesas</span><strong>{money(data.total)}</strong></p>
          <p><span>Total informado no caixa</span><strong>{money(informedTotal)}</strong></p>
          <p><span>Diferença final</span><strong className={differenceOk ? 'positive' : 'negative'}>{money(difference)}</strong></p>
          <p><span>Mesas na conferência</span><strong>{data.conferenceTables}</strong></p>
        </div>

        {hasDivergence && <div className="closingModalFields">
          <label><span>Senha de autorização</span><input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} autoFocus /></label>
          <label><span>Observação obrigatória</span><textarea value={authObservation} onChange={e => setAuthObservation(e.target.value)} placeholder="Explique a divergência encontrada no caixa." /></label>
        </div>}

        {!hasDivergence && note.trim() && <div className="closingModalNote"><strong>Observação</strong><span>{note.trim()}</span></div>}
        {modalError && <div className="closingModalError"><AlertCircle size={18} /> {modalError}</div>}

        <div className="closingModalActions">
          <button type="button" className="closingCancelBtn" onClick={closeModal}>Cancelar</button>
          <button type="button" className="closingConfirmBtn" onClick={confirmCloseCash} disabled={isClosing}>{hasDivergence ? 'Autorizar e fechar caixa' : 'Confirmar fechamento'}</button>
        </div>
      </div>
    </div>}
  </div>
}
