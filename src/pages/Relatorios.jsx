import StatCard from '../components/StatCard.jsx'

export default function Relatorios({ tables }) {
  const total = tables.reduce((sum, table) => sum + table.items.reduce((s, item) => s + item.price * item.qty, 0), 0)
  const kitchen = tables.reduce((sum, table) => sum + table.items.filter(i => i.imprimeCozinha).reduce((s, item) => s + item.price * item.qty, 0), 0)
  const bar = tables.reduce((sum, table) => sum + table.items.filter(i => !i.imprimeCozinha).reduce((s, item) => s + item.price * item.qty, 0), 0)
  const items = tables.flatMap(t => t.items)
  const top = Object.values(items.reduce((acc, item) => {
    acc[item.name] = acc[item.name] || { name: item.name, qty: 0, total: 0 }
    acc[item.name].qty += item.qty
    acc[item.name].total += item.qty * item.price
    return acc
  }, {})).sort((a,b) => b.qty - a.qty)

  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <span className="eyebrow">Resumo simples</span>
          <h1>Relatórios</h1>
        </div>
      </div>

      <div className="statsGrid">
        <StatCard title="Total nas mesas" value={`R$ ${total.toFixed(2).replace('.', ',')}`} detail="Comandas abertas da demonstração" tone="fire" />
        <StatCard title="Cozinha/churrasco/sucos" value={`R$ ${kitchen.toFixed(2).replace('.', ',')}`} detail="Itens que imprimem" />
        <StatCard title="Bar" value={`R$ ${bar.toFixed(2).replace('.', ',')}`} detail="Itens que não imprimem" tone="green" />
      </div>

      <section className="panel">
        <h2>Produtos mais lançados</h2>
        <div className="reportTable">
          <div className="reportRow head"><span>Produto</span><span>Qtd</span><span>Total</span></div>
          {top.map(item => (
            <div className="reportRow" key={item.name}>
              <span>{item.name}</span>
              <span>{item.qty}</span>
              <span>R$ {item.total.toFixed(2).replace('.', ',')}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
