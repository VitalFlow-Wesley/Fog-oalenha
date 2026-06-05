import { ClipboardList, Link2, Users } from 'lucide-react'

const statusLabel = {
  livre: 'Livre',
  ocupada: 'Ocupada',
  enviado: 'Ocupada',
  conta: 'Conta solicitada',
  juntada: 'Juntada',
  fechada: 'Fechada'
}

export default function TableCard({ table, onOpen }) {
  const total = table.items.reduce((sum, item) => sum + item.price * item.qty, 0)
  const status = table.status === 'enviado' ? 'ocupada' : table.status
  const joinedNumbers = table.mergedTableNumbers?.length ? ` + ${table.mergedTableNumbers.join(' + ')}` : ''

  return (
    <button className={`tableCard restaurantTableCard ${status}`} onClick={() => onOpen(table)}>
      <div className="tableTop">
        <strong>Mesa {table.number}{joinedNumbers}</strong>
        <span>{statusLabel[table.status] || 'Ocupada'}</span>
      </div>

      <div className="tableMeta restaurantTableMeta">
        <span>{table.status === 'juntada' ? <Link2 size={15} /> : <Users size={15} />} {table.status === 'juntada' ? `Mesa ${table.mergedToNumber}` : `${table.guests || 0} pessoas`}</span>
        <span><ClipboardList size={15} /> {table.items.length} itens</span>
      </div>

      <div className="tableDivider" />

      <div className="tableTotal">
        {table.status === 'juntada' ? 'Comanda agrupada' : `R$ ${total.toFixed(2).replace('.', ',')}`}
      </div>
    </button>
  )
}
