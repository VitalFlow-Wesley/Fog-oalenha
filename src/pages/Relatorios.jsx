import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CalendarDays, CheckCircle2, ChefHat, ClipboardList, Download, Flame, Martini, PackageCheck, Printer, ReceiptText, Star, Table2, TrendingUp, Utensils, WalletCards } from 'lucide-react'

const SALES_KEY = 'fogao-sales-history-v1'

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

function getItemTotal(item) {
  return Number(item.price || 0) * Number(item.qty || 0)
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

function normalizeHistoryRecord(record) {
  const total = Number(record.total || 0)
  return {
    ...record,
    total,
    status: 'fechada',
    number: record.tableNumber,
    guests: Number(record.guests || 0),
    waiterName: record.waiterName || 'Sem garçom',
    items: (record.items || []).map(item => ({ ...item, sector: getSector(item), tableNumber: record.tableNumber, waiterName: record.waiterName || 'Sem garçom' })),
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
    return { number: table.tableNumber, status: 'fechada', total: table.total, items: itemsQty, orders: table.items.length, sectorsText, guests: table.guests, waiterName: table.waiterName, closedAtLabel: table.closedAtLabel }
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

  return { salesTables, sentTables: salesTables, closedTables: salesTables, items, total, ordersQty, ticket, topProductsByRevenue, topProductsByQty, categories, sectors, salesByTable, waiterRanking, topWaiter: waiterRanking[0], topTable: salesByTable[0], topProductByRevenue: topProductsByRevenue[0], topProductByQty: topProductsByQty[0], hours }
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

export default function Relatorios() {
  const [mode, setMode] = useState('simples')
  const [period, setPeriod] = useState('Hoje')
  const [selectedDate, setSelectedDate] = useState(() => localStorage.getItem('fogao-reports-date') || todayKey())
  const [history, setHistory] = useState(() => readJson(SALES_KEY, []))

  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await fetch('/api/state')
        const remote = response.ok ? await response.json() : {}
        if (Array.isArray(remote.salesHistory)) {
          localStorage.setItem(SALES_KEY, JSON.stringify(remote.salesHistory))
          setHistory(remote.salesHistory)
        }
      } catch {
        setHistory(readJson(SALES_KEY, []))
      }
    }
    loadHistory()
    const onUpdate = () => setHistory(readJson(SALES_KEY, []))
    window.addEventListener('fogao-sales-history-updated', onUpdate)
    window.addEventListener('focus', loadHistory)
    return () => {
      window.removeEventListener('fogao-sales-history-updated', onUpdate)
      window.removeEventListener('focus', loadHistory)
    }
  }, [])

  const recordsForDate = useMemo(() => history.filter(record => record.date === selectedDate), [history, selectedDate])
  const report = useMemo(() => buildReportFromHistory(recordsForDate), [recordsForDate])
  const dateLabel = formatDateBR(selectedDate)

  function handleDateChange(event) {
    const value = event.target.value || todayKey()
    setSelectedDate(value)
    localStorage.setItem('fogao-reports-date', value)
    localStorage.setItem('fogao-reports-date-label', formatDateBR(value))
  }

  function handlePrint() { window.print() }
  function handleExportPdf() { window.print() }

  const summaryCards = [
    { title: 'Faturamento total', value: money(report.total), detail: `Movimentação de ${dateLabel}`, icon: WalletCards, tone: 'fire' },
    { title: 'Pedidos lançados', value: report.ordersQty, detail: 'Itens vendidos no período', icon: ReceiptText, tone: 'orange' },
    { title: 'Mesas atendidas', value: report.salesTables.length, detail: 'Mesas fechadas no período', icon: Table2, tone: 'green' },
    { title: 'Ticket médio', value: money(report.ticket), detail: 'Por mesa atendida', icon: ClipboardList, tone: 'gold' },
    { title: 'Maior valor de mesa', value: money(report.topTable?.total || 0), detail: report.topTable ? `Mesa ${report.topTable.number} · ${report.topTable.guests || 0} pessoas` : 'Sem mesa', icon: Star, tone: 'fire' },
    { title: 'Produto mais vendido', value: report.topProductByQty?.name || '-', detail: report.topProductByQty ? `${report.topProductByQty.qty} unidades · ${money(report.topProductByQty.total)}` : 'Sem vendas', icon: PackageCheck, tone: 'orange' },
  ]

  return (
    <div className="page reportsPremiumPage completeReportPage">
      <div className="reportsHeader">
        <div>
          <span className="eyebrow reportsEyebrow">RESUMO E ANÁLISES</span>
          <h1>{mode === 'completo' ? 'Relatório completo' : 'Relatórios'}</h1>
          <p>{mode === 'completo' ? 'Análises detalhadas de vendas, pedidos, mesas, produtos e desempenho.' : 'Acompanhe resultados, pedidos, setores e desempenho da operação.'}</p>
        </div>
        <div className="reportsActions noPrint">
          <div className="reportTabs"><button className={mode === 'simples' ? 'active' : ''} onClick={() => setMode('simples')} type="button">Relatório simples</button><button className={mode === 'completo' ? 'active' : ''} onClick={() => setMode('completo')} type="button">Relatório completo</button></div>
          <label className="reportActionBtn" style={{ position: 'relative', cursor: 'pointer' }}><CalendarDays size={16} /> {dateLabel}<input type="date" value={selectedDate} onChange={handleDateChange} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} /></label>
          <button className="reportActionBtn" type="button" onClick={handlePrint}><Printer size={18} /> Imprimir</button>
          <button className="reportActionBtn" type="button" onClick={handleExportPdf}><Download size={18} /> Exportar PDF</button>
        </div>
      </div>

      {mode === 'simples' ? (
        <>
          <div className="reportsSummaryGrid simpleSummaryGrid">{summaryCards.slice(0, 4).map(card => <SummaryCard key={card.title} {...card} />)}</div>
          <section className="reportPanel simpleSectorPanel"><h2><BarChart3 size={22} /> Resumo por setor</h2><div className="simpleSectorGrid">{report.sectors.map(sector => <div className="simpleSectorCard" key={sector.name}><div><SectorIcon name={sector.name} /></div><strong>{sector.name}</strong><span>{sector.qty} itens</span><i /> <b>{money(sector.total)}</b></div>)}</div></section>
          <div className="reportsMainGrid simpleReportGrid">
            <section className="reportPanel productsPanel"><div className="reportPanelHeader"><div><BarChart3 size={24} /><h2>Produtos mais lançados</h2></div><div className="periodTabs noPrint">{['Hoje', 'Semana', 'Mês'].map(item => <button type="button" key={item} className={period === item ? 'active' : ''} onClick={() => setPeriod(item)}>{item}</button>)}</div></div><div className="premiumReportTable simpleProductsTable"><div className="premiumReportRow head"><span>Produto</span><span>Qtd</span><span>Setor</span><span>Total</span></div>{report.topProductsByQty.length ? report.topProductsByQty.slice(0, 5).map(item => { const first = item.items?.[0] || {}; return <div className="premiumReportRow" key={item.name}><span>{item.name}</span><span>{item.qty}</span><span><em>{first.sector || '-'}</em></span><span>{money(item.total)}</span></div> }) : <div className="premiumReportRow"><span>Nenhum produto vendido nessa data</span><span>0</span><span><em>-</em></span><span>{money(0)}</span></div>}</div><div className="liveDataPill"><CheckCircle2 size={15} /> {recordsForDate.length ? `Movimentação carregada de ${dateLabel}` : `Nenhuma movimentação salva em ${dateLabel}`}</div></section>
            <aside className="reportPanel reportResumePanel simpleResumePanel"><div className="reportPanelHeader compact"><div><ClipboardList size={24} /><h2>Resumo do relatório</h2></div></div><div className="reportResumeList"><div><span><TrendingUp size={18} /> Faturamento do dia</span><strong>{money(report.total)}</strong></div><div><span><PackageCheck size={18} /> Pedidos lançados</span><strong>{report.ordersQty}</strong></div>{report.sectors.map(sector => <div key={sector.name}><span><SectorIcon name={sector.name} /> Itens do {sector.name.toLowerCase()}</span><strong>{sector.qty}</strong></div>)}<div><span><Table2 size={18} /> Mesas atendidas</span><strong>{report.salesTables.length}</strong></div></div><div className="readyMessage"><CheckCircle2 size={17} /> Relatório baseado no histórico salvo.</div></aside>
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
            <section className="reportPanel tablePerformanceComplete"><h2>Desempenho das mesas</h2><div className="completeTable tablesCompleteTable"><div className="completeTableRow head"><span>Mesa</span><span>Total consumido</span><span>Itens</span><span>Pedidos</span><span>Setores</span><span>Garçom</span><span>Situação</span></div>{report.salesByTable.length ? report.salesByTable.slice(0, 7).map(table => <div className="completeTableRow" key={`${table.number}-${table.closedAtLabel}`}><span>Mesa {table.number}</span><span>{money(table.total)}</span><span>{table.items}</span><span>{table.orders}</span><span>{table.sectorsText}</span><span>{table.waiterName}</span><span><em className="success">Fechada</em></span></div>) : <div className="completeTableRow"><span>-</span><span>{money(0)}</span><span>0</span><span>0</span><span>-</span><span>-</span><span><em>Sem venda</em></span></div>}</div></section>
            <section className="reportPanel movementPanel"><h2>Horários de maior movimento</h2><div className="movementChart">{report.hours.map(hour => <div key={hour.label}><span style={{ height: `${Math.max(8, hour.count * 24)}px` }} /><small>{hour.label}</small></div>)}</div></section>
            <section className="reportPanel indicatorsPanel"><h2>Indicadores gerais</h2><div className="indicatorRows"><p><span>Total de comandas fechadas</span><strong>{report.closedTables.length}</strong></p><p><span>Total de itens vendidos</span><strong>{report.ordersQty}</strong></p><p><span>Ticket médio por mesa</span><strong>{money(report.ticket)}</strong></p><p><span>Média de itens por mesa</span><strong>{report.salesTables.length ? (report.ordersQty / report.salesTables.length).toFixed(1).replace('.', ',') : '0,0'}</strong></p></div></section>
            <section className="reportPanel generalSummaryPanel"><h2>Resumo geral</h2><div className="indicatorRows"><p><span>Faturamento total</span><strong>{money(report.total)}</strong></p><p><span>Mesa destaque</span><strong>{report.topTable ? `Mesa ${report.topTable.number} · ${money(report.topTable.total)}` : '-'}</strong></p><p><span>Mais vendido em quantidade</span><strong>{report.topProductByQty ? `${report.topProductByQty.name} · ${report.topProductByQty.qty} un.` : '-'}</strong></p><p><span>Maior faturamento</span><strong>{report.topProductByRevenue ? `${report.topProductByRevenue.name} · ${money(report.topProductByRevenue.total)}` : '-'}</strong></p><p><span>Garçom destaque</span><strong>{report.topWaiter ? `${report.topWaiter.name} · ${report.topWaiter.tables} mesas · ${money(report.topWaiter.total)}` : '-'}</strong></p></div><div className="readyMessage"><CheckCircle2 size={17} /> Relatório gerado com o histórico salvo de {dateLabel}.</div></section>
          </div>
        </>
      )}
    </div>
  )
}
