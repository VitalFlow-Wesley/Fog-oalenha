import { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, CalendarDays, CheckCircle2, ChefHat, ClipboardList, Flame, History, Martini, PackageCheck, Printer, ReceiptText, Star, Table2, TrendingUp, Utensils, WalletCards } from 'lucide-react'
import { loadRemoteState } from '../services/appStateApi.js'
import { configureQzSecurity } from '../services/qzPrintService.js'

const SALES_KEY = 'fogao-sales-history-v1'
const CLOSED_TABLES_KEY = 'fogao-closed-tables-v1'
const CLOSINGS_KEY = 'fogao-closings-v1'
const REPORTS_OPEN_DAY_KEY = 'fogao-reports-open-day'

function money(value) {
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`
}

function percent(value, total) {
  if (!total) return '0%'
  return `${Math.round((Number(value || 0) / total) * 100)}%`
}

function todayKey() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDateBR(value) {
  if (!value) return 'Hoje'
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return value === todayKey() ? 'Hoje' : `${day}/${month}/${year}`
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function initialReportDate() {
  const currentDay = todayKey()
  const openDay = localStorage.getItem(REPORTS_OPEN_DAY_KEY)
  if (openDay !== currentDay) {
    localStorage.setItem(REPORTS_OPEN_DAY_KEY, currentDay)
    localStorage.setItem('fogao-reports-date', currentDay)
    localStorage.setItem('fogao-reports-date-label', formatDateBR(currentDay))
    return currentDay
  }
  return localStorage.getItem('fogao-reports-date') || currentDay
}

function getItemTotal(item) {
  return Number(item.price || 0) * Number(item.qty || 0)
}

function getTableTotal(table) {
  return (table.items || []).reduce((sum, item) => sum + getItemTotal(item), 0)
}

function hasTableMovement(table) {
  return table.status !== 'livre' || getTableTotal(table) > 0 || Number(table.guests || 0) > 0 || Boolean(table.items?.length)
}

function getSector(item) {
  const category = String(item.category || '').toLowerCase()
  const local = String(item.localSaida || item.sector || '').toLowerCase()
  if (category.includes('churrasco') || local.includes('churrasco')) return 'Churrasco'
  if (category.includes('suco') || local.includes('suco')) return 'Sucos'
  if (category.includes('bebida') || category.includes('bombom') || category.includes('salgadinho') || category.includes('sorvete') || category.includes('sobremesa') || local.includes('bar')) return 'Bar'
  return 'Cozinha'
}

function groupProducts(items = []) {
  const list = Object.values(items.reduce((acc, item) => {
    const key = item.name || 'Produto'
    acc[key] = acc[key] || { name: key, qty: 0, total: 0, items: [] }
    acc[key].qty += Number(item.qty || 0)
    acc[key].total += getItemTotal(item)
    acc[key].items.push(item)
    return acc
  }, {}))

  return {
    byRevenue: [...list].sort((a, b) => b.total - a.total || b.qty - a.qty),
    byQty: [...list].sort((a, b) => b.qty - a.qty || b.total - a.total),
  }
}

function groupBy(items, getKey) {
  return Object.values(items.reduce((acc, item) => {
    const key = getKey(item)
    acc[key] = acc[key] || { name: key, qty: 0, total: 0, items: [] }
    acc[key].qty += Number(item.qty || 0)
    acc[key].total += getItemTotal(item)
    acc[key].items.push(item)
    return acc
  }, {})).sort((a, b) => b.total - a.total)
}

function getTableWaiter(table) {
  return table.waiterName || table.kitchenWaiterName || table.openedByName || table.createdByName || 'Sem garçom'
}

function normalizeHistoryRecord(record) {
  const total = Number(record.total || 0)
  const status = record.status || (record.type === 'mesa_aberta' ? 'aberta' : 'fechada')
  const waiterName = record.waiterName || 'Sem garçom'
  return {
    ...record,
    total,
    status,
    number: record.tableNumber,
    guests: Number(record.guests || 0),
    waiterName,
    items: (record.items || []).map(item => ({ ...item, sector: getSector(item), tableNumber: record.tableNumber, waiterName })),
  }
}

function buildActiveRecord(table) {
  const total = getTableTotal(table)
  const waiterName = getTableWaiter(table)
  return {
    id: `open-${table.id || table.number}`,
    type: 'mesa_aberta',
    status: 'aberta',
    date: todayKey(),
    tableId: table.id,
    tableNumber: table.number,
    guests: Number(table.guests || 0),
    waiterName,
    total,
    closedAt: table.openedAt || new Date().toISOString(),
    closedAtLabel: table.openedAt || table.kitchenSentAt || new Date().toISOString(),
    items: (table.items || []).map(item => ({
      id: item.id,
      name: item.name || 'Produto',
      qty: Number(item.qty || 0),
      price: Number(item.price || 0),
      category: item.category || 'Outros',
      sector: item.sector || item.localSaida || '',
      localSaida: item.localSaida || item.sector || '',
      imprimeCozinha: Boolean(item.imprimeCozinha),
      observation: item.observation || '',
    })),
  }
}

function buildReportFromHistory(records = []) {
  const salesTables = records.map(normalizeHistoryRecord).filter(record => record.items.length > 0 || record.total > 0)
  const items = salesTables.flatMap(table => table.items.map(item => ({ ...item, tableId: table.tableId, tableNumber: table.tableNumber, waiterName: table.waiterName })))
  const total = salesTables.reduce((sum, table) => sum + Number(table.total || 0), 0)
  const ordersQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0)
  const tableNumbers = new Set(salesTables.map(table => table.tableNumber))
  const ticket = tableNumbers.size ? total / tableNumbers.size : 0
  const productGroups = groupProducts(items)
  const topProductsByRevenue = productGroups.byRevenue.slice(0, 8)
  const topProductsByQty = productGroups.byQty.slice(0, 8)
  const categories = groupBy(items, item => item.category || 'Outros')
  const sectors = ['Cozinha', 'Churrasco', 'Sucos', 'Bar'].map(name => {
    const sectorItems = items.filter(item => item.sector === name)
    return { name, qty: sectorItems.reduce((sum, item) => sum + Number(item.qty || 0), 0), total: sectorItems.reduce((sum, item) => sum + getItemTotal(item), 0) }
  })
  const salesByTable = salesTables.map(table => {
    const sectorsText = [...new Set(table.items.map(item => item.sector))].join(', ') || '-'
    const itemsQty = table.items.reduce((sum, item) => sum + Number(item.qty || 0), 0)
    return { number: table.tableNumber, status: table.status || 'fechada', total: table.total, items: itemsQty, orders: table.items.length, sectorsText, guests: table.guests, waiterName: table.waiterName, closedAtLabel: table.closedAtLabel }
  }).sort((a, b) => b.total - a.total)
  const waiterRanking = Object.values(salesByTable.reduce((acc, table) => {
    const name = table.waiterName
    acc[name] = acc[name] || { name, tables: 0, total: 0 }
    acc[name].tables += 1
    acc[name].total += table.total
    return acc
  }, {})).sort((a, b) => b.total - a.total)
  const hours = Array.from({ length: 12 }, (_, index) => {
    const hour = 11 + index
    const count = salesTables.filter(table => Number(String(table.closedAtLabel || '').slice(11, 13)) === hour || Number(String(table.closedAt || '').slice(11, 13)) === hour).length
    return { label: `${hour}h`, count }
  })
  const closedTables = salesTables.filter(table => table.status === 'fechada')
  const openTables = salesTables.filter(table => table.status === 'aberta')

  return { salesTables, sentTables: salesTables, closedTables, openTables, items, total, ordersQty, ticket, topProductsByRevenue, topProductsByQty, categories, sectors, salesByTable, waiterRanking, topWaiter: waiterRanking[0], topTable: salesByTable[0], topProductByRevenue: topProductsByRevenue[0], topProductByQty: topProductsByQty[0], hours }
}

function SummaryCard({ icon: Icon, title, value, detail, tone = 'fire' }) {
  return <section className={`reportSummaryCard completeMetric ${tone}`}><div className="reportSummaryIcon"><Icon size={24} /></div><div><span>{title}</span><strong>{value}</strong><small>{detail}</small></div></section>
}

function ProductTable({ products, type }) {
  return <div className="completeTable productsCompleteTable"><div className="completeTableRow head"><span>#</span><span>Produto</span><span>Categoria</span><span>Setor</span><span>Qtd</span><span>Valor total</span><span>{type === 'qty' ? 'Faturamento' : 'Ticket médio'}</span></div>{products.length ? products.slice(0, 7).map((item, index) => { const first = item.items?.[0] || {}; return <div className="completeTableRow" key={item.name}><span>{index + 1}</span><span>{item.name}</span><span>{first.category || '-'}</span><span>{first.sector || '-'}</span><span>{item.qty}</span><span>{money(item.total)}</span><span>{type === 'qty' ? money(item.total) : money(item.qty ? item.total / item.qty : 0)}</span></div> }) : <div className="completeTableRow"><span>-</span><span>Nenhum produto vendido</span><span>-</span><span>-</span><span>0</span><span>{money(0)}</span><span>{money(0)}</span></div>}</div>
}

function SectorIcon({ name }) {
  if (name === 'Cozinha') return <ChefHat size={22} />
  if (name === 'Churrasco') return <Flame size={22} />
  if (name === 'Sucos') return <Utensils size={22} />
  return <Martini size={22} />
}

function paymentLabel(key) {
  const labels = { dinheiro: 'Dinheiro', pix: 'PIX', cartao: 'Cartão', outros: 'Outros' }
  return labels[key] || key
}

function paymentTotal(payments = {}) {
  return Object.values(payments || {}).reduce((sum, value) => sum + Number(value || 0), 0)
}

function closingTables(record = {}) {
  const activeTables = (record.tables || []).map(table => ({
    id: table.id || table.tableId || table.number,
    number: table.number || table.tableNumber,
    waiterName: getTableWaiter(table),
    total: getTableTotal(table),
    itemsQty: (table.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0),
    origin: 'Fechamento do caixa',
  }))
  const closedTables = (record.closedTables || []).map(table => ({
    id: table.id || table.tableId || table.tableNumber,
    number: table.tableNumber || table.number,
    waiterName: table.waiterName || 'Sem garçom',
    total: Number(table.total || 0),
    itemsQty: (table.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0),
    origin: table.closedByMode === 'fechamento_caixa' ? 'Fechamento do caixa' : 'Fechada pela mesa',
  }))
  return [...activeTables, ...closedTables]
}

// --- MOTOR DE IMPRESSÃO ESC/POS DOS RELATÓRIOS (QZ TRAY SILENCIOSO) ---
// Removidos os códigos de segurança para usar o "Remember this decision" do Windows
async function executeThermalPrint(mode, report, selectedClosing, dateLabel, settings) {
  try {
    const qzModule = await import('qz-tray');
    const qz = qzModule.default || qzModule;
    await configureQzSecurity(qz);

    if (!qz) throw new Error("Módulo QZ Tray indisponível localmente.");

    if (!qz.websocket.isActive()) {
      await qz.websocket.connect();
    }

    // Busca a impressora configurada para o Caixa/Bar
    const systemSettings = settings || readJson('fogao-a-lenha-system-settings-v1', {});
    const printers = systemSettings?.printers || [];
    const printerId = systemSettings?.cashierPrinterId;
    const selected = printers.find(p => p.id === printerId);
    // Se não achar a do caixa, tenta a primeira da lista, se não houver nenhuma usa POS-80
    const printerName = selected?.name || selected?.label || printers[0]?.name || 'POS-80';

    await qz.printers.find(printerName);
    const config = qz.configs.create(printerName);

    const removeAccents = (str) => String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, "");

    let payload = [
      '\x1B' + '\x40', // Init
      '\x1B' + '\x61' + '\x31', // Centralizar
      '================================\n',
    ];

    const addLine = (label, value) => {
      payload.push(`${label}\n`);
      payload.push('\x1B' + '\x61' + '\x32'); // Direita
      payload.push(`${value}\n`);
      payload.push('\x1B' + '\x61' + '\x30'); // Esquerda
    };

    if (mode === 'fechamentos' && selectedClosing) {
      // TICKET DE HISTÓRICO DE FECHAMENTO
      payload.push('       HISTORICO DE CAIXA       \n');
      payload.push('          FOGAO A LENHA         \n');
      payload.push('================================\n');
      payload.push('\x1B' + '\x61' + '\x30');
      payload.push(`Data:     ${dateLabel}\n`);
      payload.push(`Operador: ${removeAccents(selectedClosing.operatorName || 'Operador')}\n`);
      payload.push(`Fechado:  ${removeAccents(selectedClosing.closedAtLabel || '-')}\n`);
      payload.push('--------------------------------\n');
      
      const informedTotal = Number(selectedClosing.informedTotal ?? paymentTotal(selectedClosing.payments));
      const diff = Number(selectedClosing.difference ?? informedTotal - Number(selectedClosing.total || 0));

      addLine("Faturamento total:", money(selectedClosing.total));
      addLine("Total informado:", money(informedTotal));
      addLine("Diferenca:", money(diff));
      payload.push('--------------------------------\n');
      
      payload.push('\x1B' + '\x61' + '\x31');
      payload.push('PAGAMENTOS\n');
      payload.push('\x1B' + '\x61' + '\x30');
      const payments = selectedClosing.payments || {};
      Object.entries(payments).forEach(([k, v]) => {
          if (v > 0) addLine(`${removeAccents(paymentLabel(k))}:`, money(v));
      });
      payload.push('--------------------------------\n');
      
      if (selectedClosing.note) {
          payload.push(`Obs: ${removeAccents(selectedClosing.note)}\n`);
          payload.push('--------------------------------\n');
      }
    } else {
      // TICKET DE RESUMO DE RELATÓRIO DO DIA
      payload.push('       RELATORIO DE VENDAS      \n');
      payload.push('          FOGAO A LENHA         \n');
      payload.push('================================\n');
      payload.push('\x1B' + '\x61' + '\x30');
      payload.push(`Data:     ${dateLabel}\n`);
      payload.push(`Gerado:   ${new Date().toLocaleTimeString('pt-BR')}\n`);
      payload.push('--------------------------------\n');
      
      addLine("Faturamento total:", money(report.total));
      addLine("Pedidos lancados:", String(report.ordersQty));
      addLine("Mesas atendidas:", String(report.salesTables.length));
      addLine("Ticket medio:", money(report.ticket));
      payload.push('--------------------------------\n');

      if (report.sectors && report.sectors.length > 0) {
        payload.push('\x1B' + '\x61' + '\x31');
        payload.push('DESEMPENHO POR SETOR\n');
        payload.push('\x1B' + '\x61' + '\x30');
        report.sectors.forEach(s => addLine(`${removeAccents(s.name)} (${s.qty} un):`, money(s.total)));
        payload.push('--------------------------------\n');
      }

      if (report.categories && report.categories.length > 0) {
        payload.push('\x1B' + '\x61' + '\x31');
        payload.push('VENDAS POR CATEGORIA\n');
        payload.push('\x1B' + '\x61' + '\x30');
        report.categories.slice(0, 6).forEach(c => addLine(`${removeAccents(c.name)}:`, money(c.total)));
        payload.push('--------------------------------\n');
      }

      if (report.topProductsByQty && report.topProductsByQty.length > 0) {
        payload.push('\x1B' + '\x61' + '\x31');
        payload.push('PRODUTOS MAIS VENDIDOS\n');
        payload.push('\x1B' + '\x61' + '\x30');
        report.topProductsByQty.slice(0, 5).forEach((p, i) => addLine(`${i+1}. ${removeAccents(p.name)} (${p.qty}x):`, money(p.total)));
        payload.push('--------------------------------\n');
      }
    }

    payload.push('\x1B' + '\x61' + '\x31');
    payload.push('Relatorio gerado pelo sistema.\n');
    payload.push('\n\n\n\n');
    payload.push('\x1D' + '\x56' + '\x41' + '\x00'); // Cortar

    await qz.print(config, payload);
    return true;
  } catch (err) {
    console.error("Falha na impressão do relatório:", err);
    alert(`Erro na impressora: ${err.message || err}`);
    return false;
  }
}

function ClosingsHistoryView({ closings, summary, selectedClosing, onSelectClosing, dateLabel }) {
  const selectedPayments = selectedClosing?.payments || {}
  const selectedTables = selectedClosing ? closingTables(selectedClosing) : []
  const selectedDifference = Number(selectedClosing?.difference ?? paymentTotal(selectedPayments) - Number(selectedClosing?.total || 0))

  return (
    <div className="closingsHistoryLayout">
      <div className="reportsSummaryGrid closingsSummaryGrid">
        <SummaryCard title="Fechamentos" value={summary.count} detail={`Registros em ${dateLabel}`} icon={History} tone="fire" />
        <SummaryCard title="Total fechado" value={money(summary.total)} detail="Valor lançado nas mesas" icon={WalletCards} tone="green" />
        <SummaryCard title="Informado" value={money(summary.informedTotal)} detail="Recebido no caixa" icon={ReceiptText} tone="orange" />
        <SummaryCard title="Diferença" value={money(summary.difference)} detail="Informado x lançado" icon={TrendingUp} tone={Math.abs(summary.difference) < 0.01 ? 'green' : 'gold'} />
      </div>

      <section className="reportPanel closingsHistoryPanel">
        <div className="reportPanelTitleRow">
          <h2>Fechamentos de {dateLabel}</h2>
          <span>{closings.length} registros</span>
        </div>
        {closings.length ? (
          <div className="closingsHistoryGrid">
            <div className="closingsHistoryList">
              {closings.map(record => {
                const difference = Number(record.difference ?? paymentTotal(record.payments) - Number(record.total || 0))
                return (
                  <button className={`closingHistoryItem ${selectedClosing?.id === record.id ? 'active' : ''}`} key={record.id} type="button" onClick={() => onSelectClosing(record.id)}>
                    <span>
                      <strong>{record.closedAtLabel || formatDateBR(record.date)}</strong>
                      <small>{record.operatorName || 'Operador'} · {record.tableCount || closingTables(record).length || 0} mesas</small>
                    </span>
                    <b>{money(record.total)}</b>
                    <em className={Math.abs(difference) < 0.01 ? 'success' : 'warning'}>{Math.abs(difference) < 0.01 ? 'Sem diferença' : money(difference)}</em>
                  </button>
                )
              })}
            </div>

            <div className="closingHistoryDetails">
              <div className="closingDetailHero">
                <div><span>Total fechado</span><strong>{money(selectedClosing?.total || 0)}</strong></div>
                <div><span>Total informado</span><strong>{money(selectedClosing?.informedTotal ?? paymentTotal(selectedPayments))}</strong></div>
                <div><span>Diferença</span><strong className={Math.abs(selectedDifference) < 0.01 ? 'success' : 'warning'}>{money(selectedDifference)}</strong></div>
              </div>

              <div className="closingDetailInfo">
                <p><span>Operador</span><strong>{selectedClosing?.operatorName || 'Operador'}</strong></p>
                <p><span>Fechado em</span><strong>{selectedClosing?.closedAtLabel || '-'}</strong></p>
                <p><span>Mesas</span><strong>{selectedClosing?.tableCount || selectedTables.length || 0}</strong></p>
                <p><span>Itens</span><strong>{selectedClosing?.itemCount || selectedTables.reduce((sum, table) => sum + Number(table.itemsQty || 0), 0)}</strong></p>
              </div>

              <div className="closingPaymentGrid">
                {Object.keys(selectedPayments).length ? Object.entries(selectedPayments).map(([key, value]) => (
                  <div key={key}><span>{paymentLabel(key)}</span><strong>{money(value)}</strong></div>
                )) : <div><span>Pagamentos</span><strong>{money(0)}</strong></div>}
              </div>

              <div className="closingTablesBlock">
                <h3>Mesas do fechamento</h3>
                <div className="closingTablesList">
                  {selectedTables.length ? selectedTables.map(table => (
                    <div key={`${table.id}-${table.number}`}>
                      <span>Mesa {table.number || '-'}</span>
                      <small>{table.waiterName || 'Sem garçom'} · {table.itemsQty || 0} itens · {table.origin}</small>
                      <strong>{money(table.total)}</strong>
                    </div>
                  )) : <p>Nenhuma mesa registrada nesse fechamento.</p>}
                </div>
              </div>

              {selectedClosing?.note && <div className="closingNoteBox"><strong>Observação</strong><span>{selectedClosing.note}</span></div>}
            </div>
          </div>
        ) : (
          <div className="emptyClosingsHistory">
            <History size={28} />
            <strong>Nenhum fechamento encontrado</strong>
            <span>Quando o caixa for fechado, o registro aparece aqui para consulta posterior.</span>
          </div>
        )}
      </section>
    </div>
  )
}

export default function Relatorios({ tables = [], settings }) {
  const [mode, setMode] = useState('simples')
  const [period, setPeriod] = useState('Hoje')
  const [selectedDate, setSelectedDate] = useState(initialReportDate)
  const [history, setHistory] = useState(() => readJson(SALES_KEY, []))
  const [closedTablesHistory, setClosedTablesHistory] = useState(() => readJson(CLOSED_TABLES_KEY, []))
  const [closingsHistory, setClosingsHistory] = useState(() => readJson(CLOSINGS_KEY, []))
  const [includeClosedTables, setIncludeClosedTables] = useState(false)
  const [selectedClosingId, setSelectedClosingId] = useState('')
  const currentDayRef = useRef(todayKey())

  useEffect(() => {
    async function loadHistory() {
      try {
        const remote = await loadRemoteState()
        if (Array.isArray(remote.salesHistory)) {
          localStorage.setItem(SALES_KEY, JSON.stringify(remote.salesHistory))
          setHistory(remote.salesHistory)
        }
        if (Array.isArray(remote.closedTablesHistory)) {
          localStorage.setItem(CLOSED_TABLES_KEY, JSON.stringify(remote.closedTablesHistory))
          setClosedTablesHistory(remote.closedTablesHistory)
        }
        if (Array.isArray(remote.closings)) {
          localStorage.setItem(CLOSINGS_KEY, JSON.stringify(remote.closings))
          setClosingsHistory(remote.closings)
        }
      } catch {
        setHistory(readJson(SALES_KEY, []))
        setClosedTablesHistory(readJson(CLOSED_TABLES_KEY, []))
        setClosingsHistory(readJson(CLOSINGS_KEY, []))
      }
    }
    loadHistory()
    const onUpdate = () => setHistory(readJson(SALES_KEY, []))
    const onClosedTablesUpdate = () => setClosedTablesHistory(readJson(CLOSED_TABLES_KEY, []))
    const onClosingsUpdate = () => setClosingsHistory(readJson(CLOSINGS_KEY, []))
    window.addEventListener('fogao-sales-history-updated', onUpdate)
    window.addEventListener('fogao-closed-tables-updated', onClosedTablesUpdate)
    window.addEventListener('fogao-closings-updated', onClosingsUpdate)
    window.addEventListener('focus', loadHistory)
    return () => {
      window.removeEventListener('fogao-sales-history-updated', onUpdate)
      window.removeEventListener('fogao-closed-tables-updated', onClosedTablesUpdate)
      window.removeEventListener('fogao-closings-updated', onClosingsUpdate)
      window.removeEventListener('focus', loadHistory)
    }
  }, [])

  useEffect(() => {
    const syncCurrentDay = () => {
      const currentDay = todayKey()
      if (currentDayRef.current === currentDay) return
      currentDayRef.current = currentDay
      localStorage.setItem(REPORTS_OPEN_DAY_KEY, currentDay)
      localStorage.setItem('fogao-reports-date', currentDay)
      localStorage.setItem('fogao-reports-date-label', formatDateBR(currentDay))
      setSelectedDate(currentDay)
    }
    const interval = setInterval(syncCurrentDay, 60 * 1000)
    window.addEventListener('focus', syncCurrentDay)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', syncCurrentDay)
    }
  }, [])

  const activeRecords = useMemo(() => {
    if (selectedDate !== todayKey()) return []
    return (tables || []).filter(hasTableMovement).map(buildActiveRecord).filter(record => record.items.length || record.total > 0)
  }, [tables, selectedDate])
  const recordsForDate = useMemo(() => [...history.filter(record => record.date === selectedDate), ...activeRecords], [history, selectedDate, activeRecords])
  const report = useMemo(() => buildReportFromHistory(recordsForDate), [recordsForDate])
  const closedTablesForDate = useMemo(() => {
    return (closedTablesHistory || [])
      .filter(record => record.date === selectedDate)
      .map(record => ({
        ...record,
        itemsQty: (record.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0),
        sourceLabel: record.closedByMode === 'fechamento_caixa' ? 'Fechamento do caixa' : 'Fechada pela mesa',
      }))
      .sort((a, b) => new Date(b.closedAt || 0) - new Date(a.closedAt || 0))
  }, [closedTablesHistory, selectedDate])
  const closingsForDate = useMemo(() => {
    return (closingsHistory || [])
      .filter(record => record.date === selectedDate)
      .sort((a, b) => new Date(b.closedAt || 0) - new Date(a.closedAt || 0))
  }, [closingsHistory, selectedDate])
  const selectedClosing = useMemo(() => {
    return closingsForDate.find(record => record.id === selectedClosingId) || closingsForDate[0] || null
  }, [closingsForDate, selectedClosingId])
  const closingsSummary = useMemo(() => {
    return closingsForDate.reduce((acc, record) => {
      const informed = Number(record.informedTotal ?? paymentTotal(record.payments))
      const difference = Number(record.difference ?? informed - Number(record.total || 0))
      acc.count += 1
      acc.total += Number(record.total || 0)
      acc.informedTotal += informed
      acc.difference += difference
      return acc
    }, { count: 0, total: 0, informedTotal: 0, difference: 0 })
  }, [closingsForDate])

  useEffect(() => {
    if (!closingsForDate.length) {
      setSelectedClosingId('')
      return
    }
    if (!closingsForDate.some(record => record.id === selectedClosingId)) {
      setSelectedClosingId(closingsForDate[0].id)
    }
  }, [closingsForDate, selectedClosingId])

  const dateLabel = formatDateBR(selectedDate)
  const hasMovement = recordsForDate.length > 0

  function handleDateChange(event) {
    const value = event.target.value || todayKey()
    setSelectedDate(value)
    localStorage.setItem(REPORTS_OPEN_DAY_KEY, todayKey())
    localStorage.setItem('fogao-reports-date', value)
    localStorage.setItem('fogao-reports-date-label', formatDateBR(value))
  }

  // --- BOTÃO DE IMPRESSÃO TÉRMICA (BAR / CAIXA) ---
  async function handlePrint() {
    await executeThermalPrint(mode, report, selectedClosing, dateLabel, settings);
  }
  
  const summaryCards = [
    { title: 'Faturamento total', value: money(report.total), detail: `Movimentação de ${dateLabel}`, icon: WalletCards, tone: 'fire' },
    { title: 'Pedidos lançados', value: report.ordersQty, detail: 'Itens vendidos no período', icon: ReceiptText, tone: 'orange' },
    { title: 'Mesas atendidas', value: report.salesTables.length, detail: 'Mesas com movimento no período', icon: Table2, tone: 'green' },
    { title: 'Ticket médio', value: money(report.ticket), detail: 'Por mesa atendida', icon: ClipboardList, tone: 'gold' },
    { title: 'Maior valor de mesa', value: money(report.topTable?.total || 0), detail: report.topTable ? `Mesa ${report.topTable.number} · ${report.topTable.guests || 0} pessoas` : 'Sem mesa', icon: Star, tone: 'fire' },
    { title: 'Produto mais vendido', value: report.topProductByQty?.name || '-', detail: report.topProductByQty ? `${report.topProductByQty.qty} unidades · ${money(report.topProductByQty.total)}` : 'Sem vendas', icon: PackageCheck, tone: 'orange' },
  ]
  const reportTitle = mode === 'fechamentos' ? 'Fechamentos anteriores' : mode === 'completo' ? 'Relatório completo' : 'Relatórios'
  const reportSubtitle = mode === 'fechamentos' ? 'Consulte caixas fechados, valores informados, diferenças e mesas do fechamento.' : mode === 'completo' ? 'Análises detalhadas de vendas, pedidos, mesas, produtos e desempenho.' : 'Acompanhe resultados, pedidos, setores e desempenho da operação.'

  return (
    <div className="page reportsPremiumPage completeReportPage">
      <div className="reportsHeader">
        <div>
          <span className="eyebrow reportsEyebrow">RESUMO E ANÁLISES</span>
          <h1>{reportTitle}</h1>
          <p>{reportSubtitle}</p>
        </div>
        <div className="reportsActions noPrint">
          <button className="reportActionBtn" type="button" onClick={handlePrint}><Printer size={18} /> Imprimir</button>
          <label className="reportActionBtn reportDateBtn" style={{ position: 'relative', cursor: 'pointer' }}><CalendarDays size={16} /> {dateLabel}<input type="date" value={selectedDate} onChange={handleDateChange} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} /></label>
          <div className="reportTabs"><button className={mode === 'simples' ? 'active' : ''} onClick={() => setMode('simples')} type="button">Simples</button><button className={mode === 'completo' ? 'active' : ''} onClick={() => setMode('completo')} type="button">Completo</button><button className={mode === 'fechamentos' ? 'active' : ''} onClick={() => setMode('fechamentos')} type="button">Fechamentos</button></div>
          {mode === 'completo' && <label className="reportClosedToggle"><input type="checkbox" checked={includeClosedTables} onChange={event => setIncludeClosedTables(event.target.checked)} /> Incluir mesas fechadas do dia</label>}
        </div>
      </div>

      {mode === 'fechamentos' ? (
        <ClosingsHistoryView closings={closingsForDate} summary={closingsSummary} selectedClosing={selectedClosing} onSelectClosing={setSelectedClosingId} dateLabel={dateLabel} />
      ) : mode === 'simples' ? (
        <>
          <div className="reportsSummaryGrid simpleSummaryGrid">{summaryCards.slice(0, 4).map(card => <SummaryCard key={card.title} {...card} />)}</div>
          <section className="reportPanel simpleSectorPanel"><h2><BarChart3 size={22} /> Resumo por setor</h2><div className="simpleSectorGrid">{report.sectors.map(sector => <div className="simpleSectorCard" key={sector.name}><div><SectorIcon name={sector.name} /></div><strong>{sector.name}</strong><span>{sector.qty} itens</span><i /> <b>{money(sector.total)}</b></div>)}</div></section>
          <div className="reportsMainGrid simpleReportGrid">
            <section className="reportPanel productsPanel"><div className="reportPanelHeader"><div><BarChart3 size={24} /><h2>Produtos mais lançados</h2></div><div className="periodTabs noPrint">{['Hoje', 'Semana', 'Mês'].map(item => <button type="button" key={item} className={period === item ? 'active' : ''} onClick={() => setPeriod(item)}>{item}</button>)}</div></div><div className="premiumReportTable simpleProductsTable"><div className="premiumReportRow head"><span>Produto</span><span>Qtd</span><span>Setor</span><span>Total</span></div>{report.topProductsByQty.length ? report.topProductsByQty.slice(0, 5).map(item => { const first = item.items?.[0] || {}; return <div className="premiumReportRow" key={item.name}><span>{item.name}</span><span>{item.qty}</span><span><em>{first.sector || '-'}</em></span><span>{money(item.total)}</span></div> }) : <div className="premiumReportRow"><span>Nenhum produto vendido nessa data</span><span>0</span><span><em>-</em></span><span>{money(0)}</span></div>}</div><div className="liveDataPill"><CheckCircle2 size={15} /> {hasMovement ? `Movimentação carregada de ${dateLabel}` : `Nenhuma movimentação salva em ${dateLabel}`}</div></section>
            <aside className="reportPanel reportResumePanel simpleResumePanel"><div className="reportPanelHeader compact"><div><ClipboardList size={24} /><h2>Resumo do relatório</h2></div></div><div className="reportResumeList"><div><span><TrendingUp size={18} /> Faturamento do dia</span><strong>{money(report.total)}</strong></div><div><span><PackageCheck size={18} /> Pedidos lançados</span><strong>{report.ordersQty}</strong></div>{report.sectors.map(sector => <div key={sector.name}><span><SectorIcon name={sector.name} /> Itens do {sector.name.toLowerCase()}</span><strong>{sector.qty}</strong></div>)}<div><span><Table2 size={18} /> Mesas atendidas</span><strong>{report.salesTables.length}</strong></div></div><div className="readyMessage"><CheckCircle2 size={17} /> Relatório baseado no histórico salvo e mesas abertas.</div></aside>
          </div>
        </>
      ) : (
        <>
          <div className="reportsSummaryGrid completeSummaryGrid">{summaryCards.map(card => <SummaryCard key={card.title} {...card} />)}</div>
          <div className="completeReportLayout">
            <section className="reportPanel sectorPerformancePanel"><h2>Desempenho por setor</h2><div className="sectorPerformanceGrid">{report.sectors.map(sector => <div className="sectorPerformanceCard" key={sector.name}><div><SectorIcon name={sector.name} /></div><strong>{sector.name}</strong><span>{sector.qty} itens</span><b>{money(sector.total)}</b><small>{percent(sector.total, report.total)} do total</small></div>)}</div></section>
            <section className="reportPanel categoryPanelComplete"><h2>Categorias mais consumidas</h2><div className="categoryBars">{report.categories.length ? report.categories.slice(0, 6).map(item => <div className="categoryLine" key={item.name}><div><span>{item.name}</span><b>{percent(item.total, report.total)}</b></div><div className="progress"><span style={{ width: percent(item.total, report.total) }} /></div><small>{money(item.total)} · {item.qty} itens</small></div>) : <p>Nenhuma categoria vendida nessa data.</p>}</div></section>
            <section className="reportPanel quantityProductsComplete"><h2>Produtos mais vendidos por quantidade</h2><ProductTable products={report.topProductsByQty} type="qty" /></section>
            <section className="reportPanel revenueProductsComplete"><h2>Produtos com maior faturamento</h2><ProductTable products={report.topProductsByRevenue} type="revenue" /></section>
            <section className="reportPanel tablePerformanceComplete"><h2>Desempenho das mesas</h2><div className="completeTable tablesCompleteTable"><div className="completeTableRow head"><span>Mesa</span><span>Total consumido</span><span>Itens</span><span>Pedidos</span><span>Setores</span><span>Garçom</span><span>Situação</span></div>{report.salesByTable.length ? report.salesByTable.slice(0, 7).map(table => <div className="completeTableRow" key={`${table.number}-${table.status}-${table.closedAtLabel}`}><span>Mesa {table.number}</span><span>{money(table.total)}</span><span>{table.items}</span><span>{table.orders}</span><span>{table.sectorsText}</span><span>{table.waiterName}</span><span><em className={table.status === 'aberta' ? 'warning' : 'success'}>{table.status === 'aberta' ? 'Aberta' : 'Fechada'}</em></span></div>) : <div className="completeTableRow"><span>-</span><span>{money(0)}</span><span>0</span><span>0</span><span>-</span><span>-</span><span><em>Sem venda</em></span></div>}</div></section>
            {includeClosedTables && <section className="reportPanel closedTablesReportPanel"><div className="reportPanelTitleRow"><h2>Mesas fechadas do dia</h2><span>{closedTablesForDate.length} mesas em {dateLabel}</span></div><div className="completeTable closedTablesReportTable"><div className="completeTableRow head"><span>Mesa</span><span>Garçom</span><span>Horário</span><span>Itens</span><span>Origem</span><span>Total</span></div>{closedTablesForDate.length ? closedTablesForDate.map(record => <div className="completeTableRow" key={record.id}><span>Mesa {record.tableNumber}</span><span>{record.waiterName || 'Sem garçom'}</span><span>{record.closedAtLabel || '-'}</span><span>{record.itemsQty}</span><span>{record.sourceLabel}</span><span>{money(record.total)}</span></div>) : <div className="completeTableRow"><span>-</span><span>Nenhuma mesa fechada nessa data</span><span>-</span><span>0</span><span>-</span><span>{money(0)}</span></div>}</div></section>}
            <section className="reportPanel movementPanel"><h2>Horários de maior movimento</h2><div className="movementChart">{report.hours.map(hour => <div key={hour.label}><span style={{ height: `${Math.max(8, hour.count * 24)}px` }} /><small>{hour.label}</small></div>)}</div></section>
            <section className="reportPanel indicatorsPanel"><h2>Indicadores gerais</h2><div className="indicatorRows"><p><span>Total de comandas com movimento</span><strong>{report.salesTables.length}</strong></p><p><span>Total de itens vendidos</span><strong>{report.ordersQty}</strong></p><p><span>Ticket médio por mesa</span><strong>{money(report.ticket)}</strong></p><p><span>Média de itens por mesa</span><strong>{report.salesTables.length ? (report.ordersQty / report.salesTables.length).toFixed(1).replace('.', ',') : '0,0'}</strong></p></div></section>
            <section className="reportPanel generalSummaryPanel"><h2>Resumo geral</h2><div className="indicatorRows"><p><span>Faturamento total</span><strong>{money(report.total)}</strong></p><p><span>Mesa destaque</span><strong>{report.topTable ? `Mesa ${report.topTable.number} · ${money(report.topTable.total)}` : '-'}</strong></p><p><span>Mais vendido em quantidade</span><strong>{report.topProductByQty ? `${report.topProductByQty.name} · ${report.topProductByQty.qty} un.` : '-'}</strong></p><p><span>Maior faturamento</span><strong>{report.topProductByRevenue ? `${report.topProductByRevenue.name} · ${money(report.topProductByRevenue.total)}` : '-'}</strong></p><p><span>Garçom destaque</span><strong>{report.topWaiter ? `${report.topWaiter.name} · ${report.topWaiter.tables} mesas · ${money(report.topWaiter.total)}` : '-'}</strong></p></div><div className="readyMessage"><CheckCircle2 size={17} /> Relatório gerado com histórico salvo e mesas abertas de {dateLabel}.</div></section>
          </div>
        </>
      )}
    </div>
  )
}
