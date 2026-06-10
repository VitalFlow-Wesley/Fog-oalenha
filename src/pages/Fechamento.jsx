import { useMemo, useState } from 'react'
import { AlertCircle, CalendarDays, DollarSign, FileDown, Flame, LockKeyhole, Printer, ReceiptText, Star, Table2, Users } from 'lucide-react'

const money = value => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const parseCurrency = value => {
  const raw = String(value || '').trim().replace(/[^0-9,.-]/g, '')
  if (!raw) return 0
  if (raw.includes(',') && raw.includes('.')) return Number(raw.replace(/\./g, '').replace(',', '.')) || 0
  if (raw.includes(',')) return Number(raw.replace(',', '.')) || 0
  return Number(raw) || 0
}
const todayInput = () => new Date().toISOString().slice(0, 10)

function getTableTotal(table) {
  return (table.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0)
}

function getTableItems(tables = []) {
  return tables.flatMap(table => (table.items || []).map(item => ({ ...item, tableNumber: table.number })))
}

function getTableWaiter(table) {
  return table.waiterName || table.kitchenWaiterName || table.openedByName || table.createdByName || 'Sem garçom'
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

function buildClosingData(tables = []) {
  const activeTables = tables.filter(table => ['ocupada', 'enviado', 'conta'].includes(table.status) || getTableTotal(table) > 0 || Number(table.guests || 0) > 0)
  const closedTables = tables.filter(table => table.status === 'livre' && table.closedAt).length
  const items = getTableItems(activeTables)
  const total = activeTables.reduce((sum, table) => sum + getTableTotal(table), 0)
  const totalItems = items.reduce((sum, item) => sum + Number(item.qty || 0), 0)
  const sentToKitchen = items.filter(item => item.sentToKitchen || item.printTarget === 'cozinha' || item.imprimeCozinha).reduce((sum, item) => sum + Number(item.qty || 0), 0)
  const categories = buildCategorySummary(items)
  const topProducts = buildTopProducts(items)
  const waiters = buildWaiterSummary(activeTables)
  const topWaiter = waiters[0] || { name: 'Nenhum garçom', tables: 0, total: 0 }

  return {
    date: todayInput(),
    total,
    payments: { dinheiro: 0, pix: 0, cartao: 0, outros: 0 },
    closedTables,
    openTables: activeTables.length,
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
    ticketAverage: activeTables.length ? total / activeTables.length : 0,
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

export default function Fechamento({ tables = [], currentUser, onCloseCash }) {
  const data = useMemo(() => buildClosingData(tables), [tables])
  const [date, setDate] = useState(data.date)
  const [reportedPayments, setReportedPayments] = useState(() => ({ dinheiro: '', pix: '', cartao: '', outros: '' }))
  const [note, setNote] = useState('')
  const [closed, setClosed] = useState(false)
  const [closingMessage, setClosingMessage] = useState('')
  const [isClosing, setIsClosing] = useState(false)

  const received = {
    dinheiro: parseCurrency(reportedPayments.dinheiro),
    pix: parseCurrency(reportedPayments.pix),
    cartao: parseCurrency(reportedPayments.cartao),
    outros: parseCurrency(reportedPayments.outros),
  }
  const informedTotal = Object.values(received).reduce((sum, value) => sum + value, 0)
  const difference = informedTotal - data.total
  const differenceOk = Math.abs(difference) < 0.01
  const receivedData = { ...data, payments: received, total: informedTotal }

  function setPayment(key, value) {
    setReportedPayments(prev => ({ ...prev, [key]: value }))
  }
  function handlePrint() { window.print() }
  function handlePdf() { window.print() }
  async function closeCash() {
    if (!differenceOk || isClosing || closed) return
    const hasMovement = data.openTables > 0 || data.total > 0 || data.totalOrders > 0
    const message = hasMovement
      ? `Existem ${data.openTables} mesa(s) abertas ou com movimentação. Ao confirmar, todas serão fechadas, os pedidos serão limpos e o salão será zerado para iniciar um novo caixa.`
      : 'Fechar o caixa mesmo sem movimentação?'
    if (!window.confirm(message)) return

    setIsClosing(true)
    try {
      await onCloseCash?.({ date, payments: received, note })
      setClosed(true)
      setReportedPayments({ dinheiro: '', pix: '', cartao: '', outros: '' })
      setNote('')
      setClosingMessage('Caixa fechado com sucesso. O histórico do dia foi salvo e um novo caixa foi iniciado.')
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

      <div className="closingPanel cashConference"><h2><span><LockKeyhole size={20} /></span>Conferência do caixa</h2><p className="conferenceHint">Informe dinheiro, PIX, cartão e outros recebimentos. A soma precisa bater com o faturamento total das mesas.</p><div className="cashRows paymentConferenceGrid"><label><span>Dinheiro recebido</span><input value={reportedPayments.dinheiro} onChange={e => setPayment('dinheiro', e.target.value)} disabled={closed} placeholder="0,00" /></label><label><span>PIX recebido</span><input value={reportedPayments.pix} onChange={e => setPayment('pix', e.target.value)} disabled={closed} placeholder="0,00" /></label><label><span>Cartões recebidos</span><input value={reportedPayments.cartao} onChange={e => setPayment('cartao', e.target.value)} disabled={closed} placeholder="0,00" /></label><label><span>Outros recebimentos</span><input value={reportedPayments.outros} onChange={e => setPayment('outros', e.target.value)} disabled={closed} placeholder="0,00" /></label></div><div className="cashTotalsGrid"><p><span>Total lançado nas mesas</span><strong>{money(data.total)}</strong></p><p><span>Total informado no caixa</span><strong>{money(informedTotal)}</strong></p><p><span>Diferença final</span><strong className={differenceOk ? 'positive' : 'negative'}>{money(difference)}</strong></p></div><label className="noteField"><span>Observação (opcional):</span><textarea placeholder="Digite alguma observação sobre o fechamento..." value={note} onChange={e => setNote(e.target.value)} disabled={closed} /></label><button type="button" className="primaryClosingBtn" onClick={closeCash} disabled={closed || isClosing || !differenceOk}><LockKeyhole size={19} /> {isClosing ? 'Fechando caixa...' : 'Conferir e fechar caixa'}</button></div></section>

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

    <footer className="closingActions"><button type="button" onClick={handlePrint}><Printer size={20} /> Imprimir fechamento</button><button type="button" onClick={handlePdf}><FileDown size={20} /> Exportar PDF</button><button type="button" className="closeDayBtn" onClick={closeCash} disabled={closed || isClosing || !differenceOk}><LockKeyhole size={20} /> {isClosing ? 'Fechando...' : 'Fechar caixa do dia'}</button></footer>
  </div>
}
