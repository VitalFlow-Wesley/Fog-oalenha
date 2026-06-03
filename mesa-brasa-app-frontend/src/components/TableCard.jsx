const statusLabel = {
  livre: 'Livre',
  ocupada: 'Ocupada',
  enviado: 'Pedido enviado',
  preparo: 'Em preparo',
  pronto: 'Pronto',
  conta: 'Conta solicitada',
  fechada: 'Fechada'
}

export default function TableCard({ table, onOpen }) {
  const total = table.items.reduce((sum, item) => sum + item.price * item.qty, 0)
  return (
    <button className={`tableCard ${table.status}`} onClick={() => onOpen(table)}>
      <div className="tableTop">
        <strong>Mesa {table.number}</strong>
        <span>{statusLabel[table.status]}</span>
      </div>
      <div className="tableMeta">
        <span>{table.guests || 0} pessoas</span>
        <span>{table.items.length} itens</span>
      </div>
      <div className="tableTotal">
        R$ {total.toFixed(2).replace('.', ',')}
      </div>
    </button>
  )
}
