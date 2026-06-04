import StatCard from '../components/StatCard.jsx'

export default function Dashboard({ tables }) {
  const openTables = tables.filter(t => t.status !== 'livre')
  const freeTables = tables.filter(t => t.status === 'livre')
  const total = tables.reduce((sum, table) => sum + table.items.reduce((s, item) => s + item.price * item.qty, 0), 0)
  const kitchenSent = tables.filter(t => t.kitchenSent || t.status === 'enviado').length

  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <span className="eyebrow">Visão geral</span>
          <h1>Dashboard da operação</h1>
        </div>
        <span className="datePill">Hoje</span>
      </div>

      <div className="statsGrid">
        <StatCard title="Mesas abertas" value={openTables.length} detail="Em atendimento agora" tone="fire" />
        <StatCard title="Mesas livres" value={freeTables.length} detail="Disponíveis no salão" tone="green" />
        <StatCard title="Em consumo" value={`R$ ${total.toFixed(2).replace('.', ',')}`} detail="Total das comandas abertas" />
        <StatCard title="Pedidos enviados" value={kitchenSent} detail="Pedidos já mandados para cozinha" tone="warning" />
      </div>

      <section className="panel">
        <h2>Pedidos enviados para cozinha</h2>
        <div className="kitchenList">
          {openTables.map(table => {
            const items = table.items.filter(i => i.imprimeCozinha)
            if (!items.length || !(table.kitchenSent || table.status === 'enviado')) return null
            return (
              <div className="kitchenOrder" key={table.id}>
                <div>
                  <strong>Mesa {table.number}</strong>
                  <span>{items.map(i => `${i.qty}x ${i.name}`).join(' • ')}</span>
                </div>
                <b>Enviado</b>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
