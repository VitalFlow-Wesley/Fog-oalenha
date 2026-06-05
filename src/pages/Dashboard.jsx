import { useState } from 'react'
import { BarChart3, CalendarDays, CheckCircle2, ChefHat, Clock, DollarSign, FlameKindling, RefreshCw, Utensils, Armchair, ShieldCheck, TrendingUp, ReceiptText, PackageCheck } from 'lucide-react'

function money(value) {
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`
}

export default function Dashboard({ tables, setPage }) {
  const [period, setPeriod] = useState('Hoje')
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [showPeriodMenu, setShowPeriodMenu] = useState(false)

  const openTables = tables.filter(t => t.status !== 'livre' && t.status !== 'juntada')
  const freeTables = tables.filter(t => t.status === 'livre')
  const billTables = tables.filter(t => t.status === 'conta')
  const items = tables.flatMap(table => table.items || [])
  const total = tables.reduce((sum, table) => sum + table.items.reduce((s, item) => s + item.price * item.qty, 0), 0)
  const totalItems = items.reduce((sum, item) => sum + item.qty, 0)
  const ticketMedio = openTables.length ? total / openTables.length : 0
  const kitchenOrders = openTables
    .map(table => ({
      ...table,
      kitchenItems: table.items.filter(item => item.imprimeCozinha),
    }))
    .filter(table => table.kitchenItems.length && (table.kitchenSent || table.status === 'enviado'))
  const kitchenSent = kitchenOrders.length

  function refreshDashboard() {
    setLastUpdate(new Date())
  }

  function selectPeriod(value) {
    setPeriod(value)
    setShowPeriodMenu(false)
    setLastUpdate(new Date())
  }

  const statCards = [
    { title: 'Mesas abertas', value: openTables.length, detail: 'Em atendimento agora', icon: Utensils, tone: 'fire', watermark: '♨' },
    { title: 'Mesas livres', value: freeTables.length, detail: 'Disponíveis no salão', icon: Armchair, tone: 'green', watermark: '♧' },
    { title: 'Em consumo', value: money(total), detail: 'Total das comandas abertas', icon: DollarSign, tone: 'gold', watermark: '▤' },
    { title: 'Pedidos enviados', value: kitchenSent, detail: 'Pedidos já mandados para cozinha', icon: ChefHat, tone: 'orange', watermark: '⚔' },
  ]

  return (
    <div className="page operationDashboardPage">
      <div className="dashboardHeader">
        <div>
          <span className="eyebrow dashboardEyebrow">VISÃO GERAL</span>
          <h1>Dashboard da operação</h1>
          <p className="dashboardUpdatedText">Atualizado às {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>

        <div className="dashboardActions">
          <div className="periodSelectWrap">
            <button className="dateSelect" type="button" onClick={() => setShowPeriodMenu(prev => !prev)}>
              <CalendarDays size={18} />
              {period}
              <span>⌄</span>
            </button>
            {showPeriodMenu && <div className="periodMenu">
              {['Hoje', 'Semana', 'Mês'].map(item => <button type="button" key={item} onClick={() => selectPeriod(item)}>{item}</button>)}
            </div>}
          </div>
          <button className="dashboardRefresh" type="button" onClick={refreshDashboard}>
            <RefreshCw size={18} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="dashboardStatsGrid">
        {statCards.map(card => {
          const Icon = card.icon
          return (
            <section className={`dashboardStatCard ${card.tone}`} key={card.title}>
              <div className="dashboardStatTop">
                <div className="dashboardStatIcon"><Icon size={27} /></div>
                <h3>{card.title}</h3>
              </div>
              <strong>{card.value}</strong>
              <span>{card.detail}</span>
              <em>{card.watermark}</em>
            </section>
          )
        })}
      </div>

      <div className="dashboardMainGrid">
        <section className="dashboardPanel kitchenPanelPremium">
          <div className="dashboardPanelTitle">
            <div>
              <FlameKindling size={28} />
              <h2>Pedidos enviados para cozinha</h2>
            </div>
            <ChefHat size={28} />
          </div>

          <div className="premiumKitchenList">
            {kitchenOrders.length === 0 && (
              <div className="emptyKitchenState">
                <ChefHat size={34} />
                <strong>Nenhum pedido enviado ainda</strong>
                <span>Quando o garçom enviar um pedido para a cozinha, ele aparecerá aqui.</span>
              </div>
            )}

            {kitchenOrders.map(table => (
              <div className="premiumKitchenOrder" key={table.id}>
                <div className="tableNumberBadge">{String(table.number).padStart(2, '0')}</div>
                <div>
                  <strong>Mesa {table.number}</strong>
                  <span>{table.kitchenItems.map(i => `${i.qty}x ${i.name}`).join(' • ')}</span>
                </div>
                <b><CheckCircle2 size={18} /> Enviado</b>
              </div>
            ))}
          </div>

          <button className="viewAllOrders" type="button" onClick={() => setPage?.('mesas')}>Ver todos os pedidos ›</button>
        </section>

        <aside className="dashboardPanel operationalPanel">
          <div className="dashboardPanelTitle compact">
            <div>
              <BarChart3 size={25} />
              <h2>Resumo operacional</h2>
            </div>
          </div>

          <div className="operationalList">
            <div className="operationalItem positive">
              <div className="operationalIcon"><TrendingUp size={23} /></div>
              <div><span>Faturamento atual</span><strong>{money(total)}</strong></div>
              <b>{openTables.length} mesas</b>
            </div>
            <div className="operationalItem orange">
              <div className="operationalIcon"><DollarSign size={23} /></div>
              <div><span>Ticket médio</span><strong>{money(ticketMedio)}</strong></div>
              <b>Por mesa</b>
            </div>
            <div className="operationalItem brown">
              <div className="operationalIcon"><PackageCheck size={23} /></div>
              <div><span>Itens lançados</span><strong>{totalItems}</strong></div>
              <b>{kitchenSent} enviados</b>
            </div>
            <div className="operationalItem positive">
              <div className="operationalIcon"><ReceiptText size={23} /></div>
              <div><span>Contas solicitadas</span><strong>{billTables.length}</strong></div>
              <b>Conferência</b>
            </div>
          </div>

          <div className="operationMessage"><ShieldCheck size={18} /> Métricas calculadas pelas comandas abertas no sistema.</div>
        </aside>
      </div>
    </div>
  )
}
