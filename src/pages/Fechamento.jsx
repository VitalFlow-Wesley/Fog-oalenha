import { useMemo, useState } from 'react'
import { AlertCircle, CalendarDays, CreditCard, DollarSign, FileDown, Flame, LockKeyhole, MoreHorizontal, Printer, ReceiptText, RefreshCw, Star, Table2, WalletCards } from 'lucide-react'

const money = value => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const parseCurrency = value => {
  const raw = String(value || '').trim().replace(/[^0-9,.-]/g, '')
  if (!raw) return 0
  if (raw.includes(',') && raw.includes('.')) return Number(raw.replace(/\./g, '').replace(',', '.')) || 0
  if (raw.includes(',')) return Number(raw.replace(',', '.')) || 0
  return Number(raw) || 0
}

const closingMock = {
  date: '2024-05-24',
  payments: { dinheiro: 2125, pix: 3250.5, cartao: 2019, outros: 190 },
  closedTables: 23,
  openTables: 2,
  totalOrders: 57,
  cancelledItems: { qty: 4, total: 98 },
  discounts: { qty: 3, total: 87.5 },
  reprints: 2,
  sentToKitchen: 45,
  categories: [
    { name: 'Refeições', total: 2736 },
    { name: 'Churrasco', total: 2390 },
    { name: 'Bebidas', total: 1396 },
    { name: 'Sucos', total: 653 },
    { name: 'Sobremesas', total: 409.5 },
  ],
  topProducts: [
    { name: 'Picanha', qty: 78, total: 1404 },
    { name: 'Galinha caipira', qty: 64, total: 1152 },
    { name: 'Coca-Cola 600ml', qty: 56, total: 336 },
    { name: 'Suco de cajá', qty: 42, total: 252 },
    { name: 'Arroz', qty: 38, total: 190 },
  ],
}

function scaleCategories(categories, targetTotal) {
  const baseTotal = categories.reduce((sum, item) => sum + item.total, 0) || 1
  return categories.map(item => ({ ...item, total: item.total / baseTotal * targetTotal }))
}

function buildClosingData(tables = []) {
  const tableRevenue = tables.reduce((sum, table) => sum + (table.items || []).reduce((itemSum, item) => itemSum + item.price * item.qty, 0), 0)
  const hasRealSales = tableRevenue > 0
  const openTables = tables.filter(table => table.status === 'ocupada').length || closingMock.openTables
  const sentToKitchen = tables.reduce((sum, table) => sum + (table.items || []).filter(item => item.sentToKitchen || item.printTarget === 'cozinha').reduce((qtySum, item) => qtySum + item.qty, 0), 0) || closingMock.sentToKitchen

  const payments = hasRealSales
    ? { dinheiro: tableRevenue * 0.28, pix: tableRevenue * 0.43, cartao: tableRevenue * 0.266, outros: tableRevenue * 0.024 }
    : closingMock.payments
  const total = Object.values(payments).reduce((sum, value) => sum + value, 0)
  const categories = hasRealSales ? scaleCategories(closingMock.categories, total) : closingMock.categories
  const categoryTotal = categories.reduce((sum, item) => sum + item.total, 0)

  return {
    ...closingMock,
    payments,
    total,
    categories,
    categoryTotal,
    openTables,
    sentToKitchen,
    ticketAverage: total / Math.max(closingMock.closedTables + openTables, 1),
    source: hasRealSales ? 'calculado' : 'mock',
  }
}

function MiniSummary({ icon: Icon, title, value, tone = 'green' }) {
  return <div className="closingMiniCard"><div className={`closingMiniIcon ${tone}`}><Icon size={19} /></div><span>{title}</span><strong>{value}</strong></div>
}

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  }
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle)
  const end = polarToCartesian(cx, cy, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
}

function PaymentVisual({ data }) {
  const total = data.total || 1
  const items = [
    { label: 'Dinheiro', value: data.payments.dinheiro, key: 'cash', color: '#2fa85f' },
    { label: 'PIX', value: data.payments.pix, key: 'pix', color: '#09aa92' },
    { label: 'Cartão', value: data.payments.cartao, key: 'card', color: '#4f78bd' },
    { label: 'Outros', value: data.payments.outros, key: 'other', color: '#a45ac3' },
  ]
  const [activePayment, setActivePayment] = useState(null)
  let startAngle = 0
  const segments = items.map(item => {
    const percent = item.value / total * 100
    const endAngle = startAngle + percent / 100 * 360
    const segment = { ...item, percent, startAngle, endAngle }
    startAngle = endAngle
    return segment
  })
  const active = activePayment || segments[0]

  return <div className="paymentVisual interactivePaymentVisual">
    <div className="donut paymentDonutSvg" onMouseLeave={() => setActivePayment(null)}>
      <svg viewBox="0 0 140 140" role="img" aria-label="Vendas por forma de pagamento">
        <circle className="paymentTrack" cx="70" cy="70" r="54" />
        {segments.map(segment => (
          <path
            key={segment.key}
            className={`paymentSegment ${active?.key === segment.key ? 'active' : ''}`}
            d={describeArc(70, 70, 54, segment.startAngle, segment.endAngle)}
            stroke={segment.color}
            onMouseEnter={() => setActivePayment(segment)}
          >
            <title>{`${segment.label}: ${money(segment.value)} (${segment.percent.toFixed(1).replace('.', ',')}%)`}</title>
          </path>
        ))}
      </svg>
      <div className="donutCenter"><strong>{money(total)}</strong><span>Total</span></div>
      {activePayment && <div className="paymentHoverTooltip"><div><i style={{ background: active.color }} /> <strong>{active.label}</strong></div><p>{money(active.value)}</p><small>{active.percent.toFixed(1).replace('.', ',')}% do total</small></div>}
    </div>
    <div className="paymentLegend">{segments.map(item => <div key={item.label} onMouseEnter={() => setActivePayment(item)} onMouseLeave={() => setActivePayment(null)} className={active?.key === item.key ? 'active' : ''}><i className={item.key} /><span>{item.label}<small>{item.percent.toFixed(1).replace('.', ',')}%</small></span><b>{money(item.value)}</b></div>)}</div>
  </div>
}

function CategoryBars({ categories, total }) {
  const base = categories.reduce((sum, item) => sum + item.total, 0) || total || 1
  return <div className="categoryBars">{categories.map(item => { const percent = item.total / base * 100; return <div className="categoryLine" key={item.name}><div><span>{item.name}</span><b>{percent.toFixed(1).replace('.', ',')}%</b></div><div className="progress"><span style={{ width: `${Math.min(percent, 100)}%` }} /></div><small>{money(item.total)}</small></div> })}</div>
}

export default function Fechamento({ tables = [], currentUser }) {
  const data = useMemo(() => buildClosingData(tables), [tables])
  const [date, setDate] = useState(data.date)
  const [reportedCash, setReportedCash] = useState(String(data.payments.dinheiro.toFixed(2)).replace('.', ','))
  const [note, setNote] = useState('')
  const [closed, setClosed] = useState(false)

  const expectedCash = data.payments.dinheiro
  const difference = parseCurrency(reportedCash) - expectedCash
  const differenceOk = Math.abs(difference) < 0.01

  function handlePrint() { window.print() }
  function handlePdf() { window.print() }
  function closeCash() {
    if (!window.confirm('Tem certeza que deseja fechar o caixa do dia? Após fechado, os dados não devem ser alterados.')) return
    setClosed(true)
  }

  return <div className={`page closingPage ${closed ? 'cashClosed' : ''}`}>
    <header className="closingHeader"><div><span className="closingEyebrow">FECHAMENTO DO DIA</span><h1>Fechamento de Caixa</h1><p>Acompanhe o resumo do caixa, confira valores e feche o caixa do dia.</p>{closed && <em className="closedBadge">Caixa fechado por {currentUser?.name || 'operador'} agora</em>}</div><div className="closingHeaderActions"><label><CalendarDays size={18} /><input type="date" value={date} onChange={e => setDate(e.target.value)} disabled={closed} /></label><button type="button" onClick={() => window.location.reload()}><RefreshCw size={18} /> Atualizar</button></div></header>

    <section className="closingMainGrid"><div className="closingPanel daySummary"><h2><span><Flame size={20} /></span>Resumo do dia</h2><div className="closingMiniGrid"><MiniSummary icon={DollarSign} title="Faturamento total" value={money(data.total)} /><MiniSummary icon={DollarSign} title="Dinheiro" value={money(data.payments.dinheiro)} /><MiniSummary icon={WalletCards} title="PIX" value={money(data.payments.pix)} /><MiniSummary icon={CreditCard} title="Cartão" value={money(data.payments.cartao)} tone="blue" /><MiniSummary icon={MoreHorizontal} title="Outros" value={money(data.payments.outros)} tone="purple" /><MiniSummary icon={Table2} title="Mesas fechadas" value={data.closedTables} tone="orange" /><MiniSummary icon={Table2} title="Mesas abertas" value={data.openTables} tone="yellow" /><MiniSummary icon={ReceiptText} title="Total de pedidos" value={data.totalOrders} tone="blue" /></div><div className="ticketAverage"><span><Star size={17} /> Ticket médio</span><strong>{money(data.ticketAverage)}</strong></div></div>

      <div className="closingPanel cashConference"><h2><span><LockKeyhole size={20} /></span>Conferência do caixa</h2><div className="cashRows"><p><span>Valor esperado no caixa:</span><strong>{money(expectedCash)}</strong></p><label><span>Valor informado pelo operador:</span><input value={reportedCash} onChange={e => setReportedCash(e.target.value)} disabled={closed} /></label><p><span>Diferença:</span><strong className={differenceOk ? 'positive' : 'negative'}>{money(difference)}</strong></p></div><label className="noteField"><span>Observação (opcional):</span><textarea placeholder="Digite alguma observação sobre o fechamento..." value={note} onChange={e => setNote(e.target.value)} disabled={closed} /></label><button type="button" className="primaryClosingBtn" onClick={closeCash} disabled={closed}><LockKeyhole size={19} /> Conferir e fechar caixa</button></div></section>

    <section className="closingDetailsGrid"><div className="closingPanel paymentPanel"><h3>Vendas por forma de pagamento</h3><PaymentVisual data={data} /></div><div className="closingPanel categoryPanel"><h3>Vendas por categoria</h3><CategoryBars categories={data.categories} total={data.categoryTotal} /></div><div className="closingPanel topProductsPanel"><h3>Produtos mais vendidos</h3>{data.topProducts.map((item, index) => <div className="productRank" key={item.name}><em>{index + 1}</em><span>{item.name}</span><b>{item.qty}</b><strong>{money(item.total)}</strong></div>)}</div><div className="closingPanel otherDetailsPanel"><h3>Outros detalhes</h3><p><AlertCircle size={17} /><span>Itens cancelados</span><strong>{data.cancelledItems.qty}</strong><small>{money(data.cancelledItems.total)}</small></p><p><Star size={17} /><span>Descontos concedidos</span><strong>{data.discounts.qty}</strong><small>{money(data.discounts.total)}</small></p><p><Printer size={17} /><span>Reimpressões</span><strong>{data.reprints}</strong><small>ações</small></p><p><Flame size={17} /><span>Pedidos enviados para preparo</span><strong>{data.sentToKitchen}</strong><small>itens</small></p></div></section>

    <footer className="closingActions"><button type="button" onClick={handlePrint}><Printer size={20} /> Imprimir fechamento</button><button type="button" onClick={handlePdf}><FileDown size={20} /> Exportar PDF</button><button type="button" className="closeDayBtn" onClick={closeCash} disabled={closed}><LockKeyhole size={20} /> Fechar caixa do dia</button></footer>
  </div>
}
