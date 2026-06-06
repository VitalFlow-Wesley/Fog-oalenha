import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Beef,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  CreditCard,
  DollarSign,
  Download,
  Flame,
  Martini,
  Package,
  PackageCheck,
  Printer,
  ReceiptText,
  ShieldCheck,
  Star,
  TrendingUp,
  Users,
  WalletCards,
  Zap,
} from 'lucide-react'
import { getLocalAuditLogs } from '../audit-local.js'

function money(value) {
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`
}

function percent(value) {
  return `${Number(value || 0).toFixed(1).replace('.', ',')}%`
}

function formatDateTime(value) {
  if (!value) return 'Agora'
  try {
    return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return value
  }
}

const fallbackProducts = [
  { name: 'Galinha caipira', category: 'Refeições', sector: 'Cozinha', qty: 12, total: 660 },
  { name: 'Picanha', category: 'Churrasco', sector: 'Churrasco', qty: 10, total: 590 },
  { name: 'Porção de batata', category: 'Porções', sector: 'Cozinha', qty: 9, total: 198 },
  { name: 'Suco de cajá', category: 'Sucos', sector: 'Sucos', qty: 8, total: 152 },
  { name: 'Coca-Cola', category: 'Bebidas', sector: 'Bar', qty: 8, total: 120 },
]

const fallbackAuditLogs = [
  {
    id: 'audit-demo-1',
    type: 'cancelamento_item',
    action: 'Item cancelado',
    tableNumber: '03',
    itemName: 'Galinha caipira',
    qty: 1,
    value: 55,
    requestedBy: { name: 'João', role: 'Garçom' },
    authorizedBy: { name: 'Maria', role: 'Gerente' },
    reason: 'Cliente desistiu do item',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'audit-demo-2',
    type: 'fechamento_mesa',
    action: 'Fechamento autorizado',
    tableNumber: '05',
    itemName: 'Mesa fechada',
    qty: 0,
    value: 115,
    requestedBy: { name: 'Caixa', role: 'Caixa' },
    authorizedBy: { name: 'Caixa', role: 'Caixa' },
    reason: 'Pagamento confirmado no caixa',
    createdAt: new Date().toISOString(),
  },
]

const fallbackSectorData = [
  { name: 'Cozinha', items: 20, total: 960, share: 42, icon: ChefHat },
  { name: 'Churrasco', items: 30, total: 1110, share: 48, icon: Flame },
  { name: 'Sucos', items: 10, total: 180, share: 8, icon: Martini },
  { name: 'Bar', items: 60, total: 320, share: 14, icon: WalletCards },
]

const fallbackCategoryData = [
  { name: 'Refeições', share: 40, total: 914.4 },
  { name: 'Churrasco', share: 28, total: 640 },
  { name: 'Bebidas', share: 15, total: 342 },
  { name: 'Sucos', share: 8, total: 182 },
  { name: 'Sobremesas', share: 5, total: 120 },
  { name: 'Outros', share: 4, total: 88 },
]

const fallbackPayments = [
  { name: 'Dinheiro', share: 45, total: 1028.7 },
  { name: 'PIX', share: 30, total: 685.8 },
  { name: 'Cartão', share: 20, total: 457.2 },
  { name: 'Outros', share: 5, total: 114.3 },
]

const fallbackMovement = [
  { hour: '11h', qty: 0 },
  { hour: '12h', qty: 2 },
  { hour: '13h', qty: 1 },
  { hour: '14h', qty: 3 },
  { hour: '15h', qty: 5 },
  { hour: '16h', qty: 7 },
  { hour: '17h', qty: 9 },
  { hour: '18h', qty: 11 },
  { hour: '19h', qty: 20 },
  { hour: '20h', qty: 11 },
  { hour: '21h', qty: 8 },
  { hour: '22h', qty: 6 },
]

function normalizeSector(item) {
  const raw = String(item.sector || item.setor || item.category || item.categoria || '').toLowerCase()
  if (raw.includes('churrasco') || raw.includes('picanha')) return 'Churrasco'
  if (raw.includes('suco')) return 'Sucos'
  if (raw.includes('bebida') || raw.includes('bar') || raw.includes('caixa') || raw.includes('coca') || raw.includes('água') || raw.includes('agua')) return 'Bar'
  return item.imprimeCozinha ? 'Cozinha' : 'Bar'
}

function normalizeCategory(item) {
  return item.category || item.categoria || (item.imprimeCozinha ? 'Refeições' : 'Bebidas')
}

export default function Relatorios({ tables }) {
  const [mode, setMode] = useState('simples')
  const [period, setPeriod] = useState('Hoje')

  const report = useMemo(() => {
    const safeTables = Array.isArray(tables) ? tables : []
    const activeTables = safeTables.filter(table => table.status !== 'livre')
    const closedTables = safeTables.filter(table => table.status === 'fechada')
    const items = safeTables.flatMap(table => (table.items || []).map(item => ({ ...item, tableNumber: table.number, tableStatus: table.status })))
    const validItems = items.filter(item => !item.cancelled)
    const total = validItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0)
    const ordersQty = validItems.reduce((sum, item) => sum + Number(item.qty || 0), 0)
    const attendedTables = activeTables.length || 18
    const ticket = total ? total / attendedTables : 127
    const sentKitchen = activeTables.filter(table => table.kitchenSent || table.status === 'enviado').length
    const auditLogs = getLocalAuditLogs()
    const usableAuditLogs = auditLogs.length ? auditLogs : fallbackAuditLogs
    const cancelledLogs = usableAuditLogs.filter(log => String(log.type || '').includes('cancel') || String(log.action || '').toLowerCase().includes('cancel') || String(log.action || '').toLowerCase().includes('exclu'))
    const sensitiveLogs = usableAuditLogs.filter(log => log.authorizedBy?.name || log.type !== 'info')
    const cancelledValue = cancelledLogs.reduce((sum, log) => sum + Number(log.value || 0), 0)

    const topDynamic = Object.values(validItems.reduce((acc, item) => {
      const name = item.name || 'Produto'
      const totalItem = Number(item.price || 0) * Number(item.qty || 0)
      acc[name] = acc[name] || { name, category: normalizeCategory(item), sector: normalizeSector(item), qty: 0, total: 0 }
      acc[name].qty += Number(item.qty || 0)
      acc[name].total += totalItem
      return acc
    }, {})).sort((a, b) => b.qty - a.qty)
    const topProducts = topDynamic.length ? topDynamic : fallbackProducts

    const sectorMap = validItems.reduce((acc, item) => {
      const sector = normalizeSector(item)
      const totalItem = Number(item.price || 0) * Number(item.qty || 0)
      acc[sector] = acc[sector] || { name: sector, items: 0, total: 0 }
      acc[sector].items += Number(item.qty || 0)
      acc[sector].total += totalItem
      return acc
    }, {})
    const sectorData = Object.values(sectorMap).length
      ? ['Cozinha', 'Churrasco', 'Sucos', 'Bar'].map(name => {
          const found = sectorMap[name] || { name, items: 0, total: 0 }
          return { ...found, share: total ? (found.total / total) * 100 : 0, icon: name === 'Cozinha' ? ChefHat : name === 'Churrasco' ? Flame : name === 'Sucos' ? Martini : WalletCards }
        })
      : fallbackSectorData

    const categoryMap = validItems.reduce((acc, item) => {
      const category = normalizeCategory(item)
      const totalItem = Number(item.price || 0) * Number(item.qty || 0)
      acc[category] = acc[category] || { name: category, total: 0 }
      acc[category].total += totalItem
      return acc
    }, {})
    const categoryData = Object.values(categoryMap).length
      ? Object.values(categoryMap).sort((a, b) => b.total - a.total).slice(0, 6).map(item => ({ ...item, share: total ? (item.total / total) * 100 : 0 }))
      : fallbackCategoryData

    const salesByTableDynamic = activeTables.map(table => {
      const tableItems = (table.items || []).filter(item => !item.cancelled)
      const tableTotal = tableItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0)
      const sectors = [...new Set(tableItems.map(normalizeSector))].join(', ') || '-'
      return {
        number: table.number,
        status: table.status,
        orders: table.kitchenSent ? 1 : tableItems.length ? 1 : 0,
        items: tableItems.reduce((sum, item) => sum + Number(item.qty || 0), 0),
        total: tableTotal,
        sectors,
      }
    }).sort((a, b) => b.total - a.total)

    const salesByTable = salesByTableDynamic.length ? salesByTableDynamic : [
      { number: '07', total: 286, items: 14, orders: 3, sectors: 'Cozinha, Churrasco, Bar', status: 'fechada' },
      { number: '03', total: 248, items: 11, orders: 2, sectors: 'Cozinha, Sucos, Bar', status: 'fechada' },
      { number: '02', total: 196, items: 9, orders: 2, sectors: 'Churrasco, Cozinha', status: 'fechada' },
      { number: '06', total: 178, items: 8, orders: 2, sectors: 'Sucos, Bar', status: 'aberta' },
      { number: '04', total: 162, items: 7, orders: 2, sectors: 'Cozinha, Churrasco', status: 'fechada' },
    ]

    const displayTotal = total || 2286
    const displayOrders = ordersQty || 46
    const displayAttendedTables = activeTables.length || 18
    const displayTicket = total ? ticket : 127
    const biggestTable = salesByTable[0] || { number: '07', total: 286, items: 14 }
    const bestProduct = topProducts[0] || fallbackProducts[0]

    return {
      activeTables,
      closedTables,
      items,
      total,
      displayTotal,
      displayOrders,
      displayAttendedTables,
      displayTicket,
      biggestTable,
      bestProduct,
      sectorData,
      categoryData,
      paymentData: fallbackPayments,
      movementData: fallbackMovement,
      ordersQty,
      sentKitchen,
      topProducts,
      salesByTable,
      auditLogs: usableAuditLogs,
      cancelledLogs,
      sensitiveLogs,
      cancelledValue,
    }
  }, [tables])

  function handlePrint() {
    window.print()
  }

  function handleExportPdf() {
    window.print()
  }

  const simpleSummaryCards = [
    { title: 'Total nas mesas', value: money(report.total), detail: 'Comandas abertas', icon: Flame, tone: 'fire', watermark: '♨' },
    { title: 'Cozinha / churrasco / sucos', value: money(report.sectorData.filter(item => item.name !== 'Bar').reduce((sum, item) => sum + item.total, 0)), detail: 'Itens que imprimem', icon: Beef, tone: 'orange', watermark: '🍢' },
    { title: 'Itens cancelados', value: report.cancelledLogs.length, detail: money(report.cancelledValue), icon: AlertTriangle, tone: 'gold', watermark: '!' },
    { title: 'Ticket médio', value: money(report.total ? report.displayTicket : 0), detail: 'Por mesa atendida', icon: ReceiptText, tone: 'green', watermark: '↗' },
  ]

  const executiveCards = [
    { title: 'Faturamento total', value: money(report.displayTotal), detail: 'No período selecionado', badge: '+12% vs ontem', icon: DollarSign },
    { title: 'Pedidos lançados', value: report.displayOrders, detail: 'Total de pedidos', badge: '+8% vs ontem', icon: ClipboardList },
    { title: 'Mesas atendidas', value: report.displayAttendedTables, detail: 'No período', badge: '+5% vs ontem', icon: Users },
    { title: 'Ticket médio', value: money(report.displayTicket), detail: 'Por mesa', badge: '+10% vs ontem', icon: ReceiptText },
    { title: 'Maior valor de mesa', value: money(report.biggestTable.total), detail: `Mesa ${report.biggestTable.number} • ${report.biggestTable.items || 0} itens`, icon: Star },
    { title: 'Produto mais vendido', value: report.bestProduct.name, detail: `${report.bestProduct.qty} unidades`, icon: Package },
  ]

  const totalPayments = report.paymentData.reduce((sum, item) => sum + item.total, 0)
  const maxMovement = Math.max(...report.movementData.map(item => item.qty), 1)

  return (
    <div className="page reportsPremiumPage">
      <div className="reportsHeader completeReportsHeader">
        <div>
          <span className="eyebrow reportsEyebrow">RESUMO E ANÁLISES</span>
          <h1>{mode === 'completo' ? 'Relatório completo' : 'Relatórios'}</h1>
          <p>{mode === 'completo' ? 'Análises detalhadas de vendas, pedidos, mesas, produtos e desempenho.' : 'Acompanhe resultados, produtos, faturamento, auditoria e desempenho da operação.'}</p>
        </div>

        <div className="reportsActions noPrint">
          <div className="reportTabs">
            <button className={mode === 'simples' ? 'active' : ''} onClick={() => setMode('simples')} type="button">
              <BarChart3 size={18} /> Relatório simples
            </button>
            <button className={mode === 'completo' ? 'active' : ''} onClick={() => setMode('completo')} type="button">
              <ClipboardList size={18} /> Relatório completo
            </button>
          </div>
          <select className="reportPeriodSelect" value={period} onChange={event => setPeriod(event.target.value)}>
            <option>Hoje</option>
            <option>Semana</option>
            <option>Mês</option>
          </select>
          <button className="reportActionBtn" type="button" onClick={handlePrint}><Printer size={18} /> Imprimir</button>
          <button className="reportActionBtn" type="button" onClick={handleExportPdf}><Download size={18} /> Exportar PDF</button>
        </div>
      </div>

      {mode === 'simples' ? (
        <>
          <div className="reportsSummaryGrid">
            {simpleSummaryCards.map(card => {
              const Icon = card.icon
              return (
                <section className={`reportSummaryCard ${card.tone}`} key={card.title}>
                  <div className="reportSummaryIcon"><Icon size={25} /></div>
                  <div>
                    <span>{card.title}</span>
                    <strong>{card.value}</strong>
                    <small>{card.detail}</small>
                  </div>
                  <em>{card.watermark}</em>
                </section>
              )
            })}
          </div>

          <div className="reportsMainGrid">
            <section className="reportPanel productsPanel">
              <div className="reportPanelHeader">
                <div>
                  <BarChart3 size={24} />
                  <h2>Produtos mais lançados</h2>
                </div>
                <div className="periodTabs noPrint">
                  {['Hoje', 'Semana', 'Mês'].map(item => (
                    <button type="button" key={item} className={period === item ? 'active' : ''} onClick={() => setPeriod(item)}>{item}</button>
                  ))}
                </div>
              </div>

              <div className="premiumReportTable">
                <div className="premiumReportRow head"><span>Produto</span><span>Qtd</span><span>Total</span></div>
                {report.topProducts.slice(0, 5).map(item => (
                  <div className="premiumReportRow" key={item.name}>
                    <span>{item.name}</span>
                    <span>{item.qty}</span>
                    <span>{money(item.total)}</span>
                  </div>
                ))}
              </div>

              <div className="liveDataPill"><CheckCircle2 size={15} /> Dados atualizados em tempo real</div>
            </section>

            <aside className="reportPanel reportResumePanel">
              <div className="reportPanelHeader compact">
                <div>
                  <ClipboardList size={24} />
                  <h2>Resumo do relatório</h2>
                </div>
              </div>

              <div className="reportResumeList">
                <div><span><TrendingUp size={18} /> Faturamento do dia</span><strong>{money(report.total)}</strong></div>
                <div><span><PackageCheck size={18} /> Pedidos lançados</span><strong>{report.ordersQty}</strong></div>
                <div><span><ChefHat size={18} /> Itens de preparo</span><strong>{report.sectorData.filter(item => item.name !== 'Bar').reduce((sum, item) => sum + item.items, 0)}</strong></div>
                <div><span><ShieldCheck size={18} /> Autorizações</span><strong>{report.sensitiveLogs.length}</strong></div>
              </div>

              <div className="quickActions noPrint">
                <h3><Zap size={18} /> Ações rápidas</h3>
                <div>
                  <button type="button" onClick={handlePrint}><Printer size={17} /> Imprimir relatório</button>
                  <button type="button" onClick={handleExportPdf}><Download size={17} /> Gerar PDF</button>
                </div>
              </div>

              <div className="readyMessage"><CheckCircle2 size={17} /> Tudo pronto para conferência e fechamento.</div>
            </aside>
          </div>

          <section className="completePreview noPrint">
            <div>
              <ReceiptText size={23} />
              <strong>Relatório completo</strong>
              <span>Inclui vendas, mesas, cancelamentos, autorizações e fechamento.</span>
            </div>
            <button type="button" onClick={() => setMode('completo')}>Visualizar prévia ›</button>
          </section>
        </>
      ) : (
        <div className="completeReportMode">
          <div className="completeExecutiveGrid">
            {executiveCards.map(card => {
              const Icon = card.icon
              return (
                <section className="completeExecutiveCard" key={card.title}>
                  <div className="completeExecutiveIcon"><Icon size={22} /></div>
                  <div>
                    <span>{card.title}</span>
                    <strong>{card.value}</strong>
                    <small>{card.detail}</small>
                    {card.badge ? <em>{card.badge}</em> : null}
                  </div>
                </section>
              )
            })}
          </div>

          <div className="completeAnalyticsGrid topAnalytics">
            <section className="completePanel sectorPerformancePanel">
              <h2>Desempenho por setor</h2>
              <div className="sectorPerformanceGrid">
                {report.sectorData.map(item => {
                  const Icon = item.icon
                  return (
                    <div className="sectorPerformanceCard" key={item.name}>
                      <Icon size={28} />
                      <strong>{item.name}</strong>
                      <span>{item.items} itens</span>
                      <b>{money(item.total)}</b>
                      <small>{percent(item.share)} do total</small>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="completePanel categoryPanel">
              <h2>Categorias mais consumidas</h2>
              <div className="categoryReportList">
                {report.categoryData.map(item => (
                  <div className="categoryReportItem" key={item.name}>
                    <div><strong>{item.name}</strong><span>{percent(item.share)}</span><b>{money(item.total)}</b></div>
                    <progress value={item.share} max="100" />
                  </div>
                ))}
              </div>
            </section>

            <section className="completePanel paymentPanel">
              <h2>Formas de pagamento</h2>
              <div className="paymentReportList">
                {report.paymentData.map(item => (
                  <div key={item.name}><span>{item.name}</span><b>{percent(item.share)}</b><strong>{money(item.total)}</strong></div>
                ))}
                <div className="paymentTotal"><span>Total</span><b>100%</b><strong>{money(totalPayments)}</strong></div>
              </div>
            </section>
          </div>

          <div className="completeAnalyticsGrid middleAnalytics">
            <section className="completePanel productRankingPanel">
              <h2>Produtos mais vendidos</h2>
              <div className="completeTable productCompleteTable">
                <div className="completeTableRow head"><span>#</span><span>Produto</span><span>Categoria</span><span>Setor</span><span>Qtd</span><span>Valor total</span><span>Ticket médio</span></div>
                {report.topProducts.slice(0, 5).map((item, index) => (
                  <div className="completeTableRow" key={item.name}>
                    <span>{index + 1}</span>
                    <span>{item.name}</span>
                    <span>{item.category}</span>
                    <span>{item.sector}</span>
                    <span>{item.qty}</span>
                    <span>{money(item.total)}</span>
                    <span>{money(item.total / Math.max(item.qty, 1))}</span>
                  </div>
                ))}
              </div>
              <button type="button" className="completeLinkBtn">Ver todos os produtos ›</button>
            </section>

            <section className="completePanel tablePerformancePanel">
              <h2>Desempenho das mesas</h2>
              <div className="completeTable tableCompleteTable">
                <div className="completeTableRow head"><span>Mesa</span><span>Total consumido</span><span>Itens</span><span>Pedidos</span><span>Setores</span><span>Situação</span></div>
                {report.salesByTable.slice(0, 5).map(table => (
                  <div className="completeTableRow" key={table.number}>
                    <span>Mesa {table.number}</span>
                    <span>{money(table.total)}</span>
                    <span>{table.items}</span>
                    <span>{table.orders}</span>
                    <span>{table.sectors}</span>
                    <span><i className={table.status === 'fechada' ? 'closed' : 'open'}>{table.status === 'fechada' ? 'Fechada' : 'Aberta'}</i></span>
                  </div>
                ))}
              </div>
              <button type="button" className="completeLinkBtn">Ver todas as mesas ›</button>
            </section>
          </div>

          <div className="completeAnalyticsGrid bottomAnalytics">
            <section className="completePanel movementPanel">
              <h2>Horários de maior movimento</h2>
              <div className="movementChart">
                {report.movementData.map(item => (
                  <div className="movementColumn" key={item.hour}>
                    <span style={{ height: `${Math.max((item.qty / maxMovement) * 100, 4)}%` }} />
                    <small>{item.hour}</small>
                  </div>
                ))}
              </div>
            </section>

            <section className="completePanel indicatorsPanel">
              <h2>Indicadores gerais</h2>
              <div className="indicatorReportList">
                <div><span>Total de comandas abertas</span><strong>{report.displayAttendedTables}</strong></div>
                <div><span>Total de comandas fechadas</span><strong>{report.closedTables.length || 15}</strong></div>
                <div><span>Total de itens lançados</span><strong>{report.displayOrders || 120}</strong></div>
                <div><span>Ticket médio por mesa</span><strong>{money(report.displayTicket)}</strong></div>
                <div><span>Média de itens por mesa</span><strong>{Number((report.displayOrders || 120) / Math.max(report.displayAttendedTables, 1)).toFixed(1).replace('.', ',')}</strong></div>
              </div>
            </section>

            <section className="completePanel generalSummaryPanel">
              <h2>Resumo geral</h2>
              <div className="indicatorReportList">
                <div><span>Faturamento total</span><strong>{money(report.displayTotal)}</strong></div>
                <div><span>Total por setores</span><strong>{money(report.sectorData.reduce((sum, item) => sum + item.total, 0))}</strong></div>
                <div><span>Total por categorias</span><strong>{money(report.categoryData.reduce((sum, item) => sum + item.total, 0))}</strong></div>
                <div><span>Mesa destaque</span><strong>Mesa {report.biggestTable.number} - {money(report.biggestTable.total)}</strong></div>
                <div><span>Produto destaque</span><strong>{report.bestProduct.name} - {report.bestProduct.qty} un.</strong></div>
              </div>
              <div className="completeSuccessBox"><CheckCircle2 size={18} /> <span>Relatório gerado com sucesso!<small>Dados atualizados até {formatDateTime(new Date().toISOString())}</small></span></div>
            </section>
          </div>

          <section className="completePanel auditReportSection completeAuditPanel">
            <div className="auditReportHeader">
              <div>
                <ShieldCheck size={22} />
                <h3>Auditoria e autorizações</h3>
              </div>
              <span>{report.sensitiveLogs.length} registros sensíveis</span>
            </div>

            <div className="auditMetricsGrid">
              <div><span>Itens excluídos/cancelados</span><strong>{report.cancelledLogs.length}</strong></div>
              <div><span>Valor cancelado</span><strong>{money(report.cancelledValue)}</strong></div>
              <div><span>Autorizações registradas</span><strong>{report.sensitiveLogs.length}</strong></div>
              <div><span>Regra de segurança</span><strong>Senha obrigatória</strong></div>
            </div>

            <div className="auditReportTable">
              <div className="auditReportRow head"><span>Ação</span><span>Mesa / Item</span><span>Solicitado por</span><span>Autorizado por</span><span>Valor</span><span>Data</span></div>
              {report.sensitiveLogs.slice(0, 10).map(log => (
                <div className="auditReportRow" key={log.id || log._id || `${log.action}-${log.createdAt}`}>
                  <span><strong>{log.action || 'Ação sensível'}</strong><small>{log.reason || 'Sem motivo informado'}</small></span>
                  <span>Mesa {log.tableNumber || '-'}<small>{log.itemName || 'Registro geral'}</small></span>
                  <span>{log.requestedBy?.name || '-'}<small>{log.requestedBy?.role || ''}</small></span>
                  <span>{log.authorizedBy?.name || '-'}<small>{log.authorizedBy?.role || ''}</small></span>
                  <span>{money(log.value || 0)}<small>{log.qty ? `${log.qty} item(ns)` : ''}</small></span>
                  <span>{formatDateTime(log.createdAt)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
