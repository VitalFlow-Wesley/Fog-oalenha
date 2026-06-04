import { ClipboardList, Users } from 'lucide-react'

const statusLabel = {
  livre: 'Livre',
  ocupada: 'Ocupada',
  enviado: 'Ocupada',
  conta: 'Conta solicitada',
  fechada: 'Fechada'
}

export default function TableCard({ table, onOpen }) {
  const total = table.items.reduce((sum, item) => sum + item.price * item.qty, 0)
  const status = table.status === 'enviado' ? 'ocupada' : table.status

  return (
    <button className={`tableCard restaurantTableCard ${status}`} onClick={() => onOpen(table)}>
      <div className="tableTop">
        <strong>Mesa {table.number}</strong>
        <span>{statusLabel[table.status] || 'Ocupada'}</span>
      </div>

      <div className="tableMeta restaurantTableMeta">
        <span><Users size={15} /> {table.guests || 0} pessoas</span>
        <span><ClipboardList size={15} /> {table.items.length} itens</span>
      </div>

      <div className="tableDivider" />

      <div className="tableTotal">
        R$ {total.toFixed(2).replace('.', ',')}
      </div>
    </button>
  )
}
