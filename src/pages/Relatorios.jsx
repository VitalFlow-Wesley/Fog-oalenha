import { useMemo, useState } from 'react'
import { BarChart3, Beef, CalendarDays, CheckCircle2, ChefHat, ClipboardList, Download, Flame, Martini, PackageCheck, Printer, ReceiptText, TrendingUp, Utensils, WalletCards, Zap } from 'lucide-react'

function money(value) {
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`
}

const fallbackProducts = [
  { name: 'Cerveja', qty: 3, total: 30 },
  { name: 'Suco de cajá', qty: 2, total: 16 },
  { name: 'Coca-Cola 600ml', qty: 2, total: 18 },
  { name: 'Sobremesa da casa', qty: 2, total: 24 },
  { name: 'Água mineral', qty: 2, total: 8 },
]

export default function Relatorios({ tables }) {
  const [mode, setMode] = useState('simples')
  const [period, setPeriod] = useState('Hoje')

  const report = useMemo(() => {
    const activeTables = tables.filter(table => table.status !== 'livre')
    const closedTables = tables.filter(table => table.status === 'fechada')
    const items = tables.flatMap(table => table.items.map(item => ({ ...item, tableNumber: table.number })))
    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0)
    const kitchen = items.filter(item => item.imprimeCozinha).reduce((sum, item) => sum + item.price * item.qty, 0)
    const bar = items.filter(item => !item.imprimeCozinha).reduce((sum, item) => sum + item.price * item.qty, 0)
    const kitchenQty = items.filter(item => item.imprimeCozinha).reduce((sum, item) => sum + item.qty, 0)
    const barQty = items.filter(item => !item.imprimeCozinha).reduce((sum, item) => sum + item.qty, 0)
    const ordersQty = items.reduce((sum, item) => sum + item.qty, 0)
    const attendedTables = activeTables.length || 1
    const ticket = total / attendedTables
    const sentKitchen = activeTables.filter(table => table.kitchenSent || table.status === 'enviado').length

    const top = Object.values(items.reduce((acc, item) => {
      acc[item.name] = acc[item.name] || { name: item.name, qty: 0, total: 0 }
      acc[item.name].qty += item.qty
      acc[item.name].total += item.qty * item.price
      return acc
    }, {})).sort((a, b) => b.qty - a.qty)

    const salesByTable = activeTables.map(table => ({
      number: table.number,
      status: table.status,
      items: table.items.length,
      total: table.items.reduce((sum, item) => sum + item.price * item.qty, 0),
    }))

    return {
      activeTables,
      closedTables,
      items,
      total,
      kitchen,
      bar,
      kitchenQty,
      barQty,
      ordersQty,
      ticket,
      sentKitchen,
      top: top.length ? top : fallbackProducts,
      salesByTable,
    }
  }, [tables])

  function handlePrint() {
    window.print()
  }

  function handleExportPdf() {
    window.print()
  }

  const summaryCards = [
    { title: 'Total nas mesas', value: money(report.total), detail: 'Comandas abertas', icon: Flame, tone: 'fire', watermark: '♨' },
    { title: 'Cozinha / churrasco / sucos', value: money(report.kitchen), detail: 'Itens que imprimem', icon: Beef, tone: 'orange', watermark: '🍢' },
    { title: 'Bar', value: money(report.bar), detail: 'Itens que não imprimem', icon: Martini, tone: 'green', watermark: '🍾' },
    { title: 'Ticket médio', value: money(report.ticket), detail: 'Por mesa atendida', icon: ReceiptText, tone: 'gold', watermark: '↗' },
  ]

  return (
    <div className="page reportsPremiumPage">
      <div className="reportsHeader">
        <div>
          <span className="eyebrow reportsEyebrow">RESUMO E ANÁLISES</span>
          <h1>Relatórios</h1>
          <p>Acompanhe resultados, produtos, faturamento e desempenho da operação.</p>
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
          <button className="reportActionBtn" type="button" onClick={handlePrint}><Printer size={18} /> Imprimir</button>
          <button className="reportActionBtn" type="button" onClick={handleExportPdf}><Download size={18} /> Exportar PDF</button>
        </div>
      </div>

      <div className="reportsSummaryGrid">
        {summaryCards.map(card => {
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

      {mode === 'simples' ? (
        <>
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
                {report.top.slice(0, 5).map(item => (
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
                <div><span><ChefHat size={18} /> Itens da cozinha</span><strong>{report.kitchenQty}</strong></div>
                <div><span><Martini size={18} /> Itens do bar</span><strong>{report.barQty}</strong></div>
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
              <span>Inclui vendas, mesas, itens, desempenho e fechamento.</span>
            </div>
            <button type="button" onClick={() => setMode('completo')}>Visualizar prévia ›</button>
          </section>
        </>
      ) : (
        <section className="reportPanel fullReportPanel">
          <div className="reportPanelHeader">
            <div>
              <ClipboardList size={24} />
              <h2>Relatório completo</h2>
            </div>
            <span className="reportDate"><CalendarDays size={16} /> {period}</span>
          </div>

          <div className="fullReportGrid">
            <div>
              <h3>Vendas por mesa</h3>
              <div className="premiumReportTable compactTable">
                <div className="premiumReportRow head"><span>Mesa</span><span>Itens</span><span>Total</span></div>
                {(report.salesByTable.length ? report.salesByTable : [{ number: '01', items: 0, total: 0 }]).map(table => (
                  <div className="premiumReportRow" key={table.number}>
                    <span>Mesa {table.number}</span>
                    <span>{table.items}</span>
                    <span>{money(table.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3>Separação por setor</h3>
              <div className="sectorCards">
                <div><ChefHat size={20} /><span>Cozinha</span><strong>{money(report.kitchen)}</strong></div>
                <div><Beef size={20} /><span>Churrasco / sucos</span><strong>{money(report.kitchen)}</strong></div>
                <div><Martini size={20} /><span>Bar</span><strong>{money(report.bar)}</strong></div>
                <div><WalletCards size={20} /><span>Pagamento</span><strong>A preparar</strong></div>
              </div>
            </div>
          </div>

          <div className="fullClosingGrid">
            <div><span>Comandas abertas</span><strong>{report.activeTables.length}</strong></div>
            <div><span>Comandas fechadas</span><strong>{report.closedTables.length}</strong></div>
            <div><span>Pedidos enviados para cozinha</span><strong>{report.sentKitchen}</strong></div>
            <div><span>Resumo geral do fechamento</span><strong>{money(report.total)}</strong></div>
          </div>
        </section>
      )}
    </div>
  )
}
