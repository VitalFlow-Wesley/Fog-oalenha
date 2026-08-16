import { useMemo, useState } from 'react'
import { CalendarClock, CheckCircle2, ClipboardList, Plus, ReceiptText, Search, ShoppingBag, Table2, Trash2, XCircle } from 'lucide-react'
import { products as defaultProducts } from '../data/mockData.js'
import { repairData, repairText } from '../text-normalizer.js'

const PRODUCTS_KEY = 'fogao-products-v1'

function readProducts() {
  try {
    const products = repairData(JSON.parse(localStorage.getItem(PRODUCTS_KEY) || 'null'))
    return Array.isArray(products) && products.length ? products : defaultProducts
  } catch { return defaultProducts }
}

function money(value) { return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}` }
function total(reservation) { return (reservation.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0) }
function timeLabel(value) { return value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Sem horário' }

export default function Reservas({ reservations = [], setReservations, tables = [], currentUser, onActivate }) {
  const [form, setForm] = useState({ customerName: '', scheduledAt: '', type: 'mesa', peopleCount: 1, note: '' })
  const [draftItems, setDraftItems] = useState([])
  const [message, setMessage] = useState('')
  const [targetByReservation, setTargetByReservation] = useState({})
  const [productSearch, setProductSearch] = useState('')
  const products = useMemo(() => readProducts().filter(product => product.status !== 'Inativo'), [])
  const canManage = ['admin', 'gerente'].includes(currentUser?.role)
  const activeReservations = reservations.filter(item => item.status === 'agendada')
  const history = reservations.filter(item => item.status !== 'agendada')
  const visibleProducts = products.filter(product => product.name.toLocaleLowerCase('pt-BR').includes(productSearch.trim().toLocaleLowerCase('pt-BR')))

  function addProduct(product) {
    setDraftItems(items => {
      const index = items.findIndex(item => item.id === product.id)
      if (index < 0) return [...items, { ...product, qty: 1, lineId: `reservation-line-${Date.now()}-${product.id}` }]
      return items.map((item, itemIndex) => itemIndex === index ? { ...item, qty: Number(item.qty || 0) + 1 } : item)
    })
  }

  function createReservation(event) {
    event.preventDefault()
    if (!form.customerName.trim()) return setMessage('Informe o nome do cliente.')
    if (!draftItems.length) return setMessage('Inclua pelo menos um produto reservado.')
    const reservation = {
      id: `reservation-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      customerName: repairText(form.customerName.trim()), scheduledAt: form.scheduledAt || null,
      type: form.type, peopleCount: Math.max(1, Number(form.peopleCount) || 1), note: repairText(form.note),
      items: draftItems, status: 'agendada', createdAt: new Date().toISOString(), createdBy: currentUser?.name || currentUser?.username || 'Atendente',
    }
    setReservations(items => [reservation, ...items])
    setForm({ customerName: '', scheduledAt: '', type: 'mesa', peopleCount: 1, note: '' })
    setDraftItems([])
    setMessage('Reserva criada. Ela ainda não entrou no caixa nem foi enviada para preparo.')
  }

  function changeDraftQty(index, delta) {
    setDraftItems(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, qty: Number(item.qty || 0) + delta } : item).filter(item => item.qty > 0))
  }

  async function transfer(reservation) {
    const target = targetByReservation[reservation.id]
    if (!target) return setMessage('Escolha uma mesa para transferir a reserva.')
    try {
      const result = await onActivate(reservation, { tableNumber: target })
      setMessage(`Reserva transferida para a mesa ${result.table.number}. Agora ela entra no caixa.`)
    } catch (error) { setMessage(error.message || 'Não foi possível transferir a reserva.') }
  }

  async function requestBill(reservation) {
    try {
      const result = await onActivate(reservation, { requestBill: true })
      setMessage(`Conta solicitada para ${result.table.number}. O valor já entrou no caixa.`)
    } catch (error) { setMessage(error.message || 'Não foi possível solicitar a conta.') }
  }

  function closeReservation(reservation, status) {
    if (!canManage) return
    const reason = window.prompt(status === 'cancelada' ? 'Motivo do cancelamento:' : 'Motivo do fechamento / cliente não compareceu:')
    if (!reason?.trim()) return
    setReservations(items => items.map(item => item.id === reservation.id ? {
      ...item, status, closedAt: new Date().toISOString(), closedBy: currentUser?.name || currentUser?.username || 'Gerência', closeReason: repairText(reason.trim()),
    } : item))
    setMessage(status === 'cancelada' ? 'Reserva cancelada pela gerência.' : 'Reserva fechada como cliente não compareceu.')
  }

  return <div className="reservasPage">
    <header className="pageHeader reservasHeader"><div><span className="eyebrow"><CalendarClock size={16} /> AGENDA</span><h1>Reservas</h1><p>Agende pedidos sem lançar valor no caixa antes da chegada do cliente.</p></div><div className="reservasCount"><CalendarClock size={20} /><strong>{activeReservations.length}</strong><span>pendentes</span></div></header>
    {message && <div className="reservasMessage"><CheckCircle2 size={18} /> {message}</div>}
    <div className="reservasLayout">
      <form className="reservationPanel" onSubmit={createReservation}><div className="panelHeading"><Plus size={20} /><h2>Nova reserva</h2></div>
        <div className="reservationFormGrid"><label>Nome do cliente<input value={form.customerName} onChange={event => setForm({ ...form, customerName: event.target.value })} placeholder="Ex.: Maria" required /></label><label>Horário previsto<input type="datetime-local" value={form.scheduledAt} onChange={event => setForm({ ...form, scheduledAt: event.target.value })} /></label><label>Atendimento<select value={form.type} onChange={event => setForm({ ...form, type: event.target.value })}><option value="mesa">Vai consumir na mesa</option><option value="retirada">Retirada</option></select></label><label>Pessoas<input type="number" min="1" value={form.peopleCount} onChange={event => setForm({ ...form, peopleCount: event.target.value })} /></label></div>
        <label>Observação<textarea value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} placeholder="Ex.: Galinha inteira; preparar para 13h" /></label>
        <div className="reservationProducts"><h3>Produtos reservados</h3><label className="reservationSearch"><Search size={17} /><input value={productSearch} onChange={event => setProductSearch(event.target.value)} placeholder="Pesquisar produto..." aria-label="Pesquisar produto" /></label><div className="reservationProductGrid">{visibleProducts.map(product => <button type="button" key={product.id} onClick={() => addProduct(product)}><strong>{product.name}</strong><span>{money(product.price)}</span></button>)}{!visibleProducts.length && <p className="reservationNoProduct">Nenhum produto encontrado.</p>}</div></div>
        <div className="reservationDraft">{draftItems.length ? draftItems.map((item, index) => <div key={item.lineId}><span>{item.name}</span><button type="button" onClick={() => changeDraftQty(index, -1)}>−</button><strong>{item.qty}x</strong><button type="button" onClick={() => changeDraftQty(index, 1)}>+</button><b>{money(item.price * item.qty)}</b></div>) : <p>Nenhum item escolhido.</p>}<strong>Total reservado: {money(total({ items: draftItems }))}</strong></div>
        <button className="primaryBtn" type="submit"><CalendarClock size={17} /> Salvar reserva</button>
      </form>
      <section className="reservationPanel"><div className="panelHeading"><ClipboardList size={20} /><h2>Reservas agendadas</h2></div>{activeReservations.length ? activeReservations.map(reservation => <article className="reservationCard" key={reservation.id}><div className="reservationCardTitle"><div><strong>{reservation.customerName}</strong><span>{reservation.type === 'retirada' ? 'Retirada' : 'Mesa'} · {timeLabel(reservation.scheduledAt)}</span></div><b>{money(total(reservation))}</b></div><p>{reservation.items.map(item => `${item.qty}x ${item.name}`).join(' · ')}</p>{reservation.note && <small>Obs.: {reservation.note}</small>}<div className="reservationActions">{reservation.type === 'mesa' && <><select value={targetByReservation[reservation.id] || ''} onChange={event => setTargetByReservation({ ...targetByReservation, [reservation.id]: event.target.value })}><option value="">Transferir para mesa…</option>{tables.filter(table => table.status !== 'juntada').map(table => <option key={table.id} value={table.number}>Mesa {table.number}</option>)}</select><button type="button" onClick={() => transfer(reservation)}><Table2 size={16} /> Transferir</button></>}<button type="button" onClick={() => requestBill(reservation)}><ReceiptText size={16} /> Solicitar conta</button>{canManage && <><button type="button" className="dangerOutline" onClick={() => closeReservation(reservation, 'cancelada')}><XCircle size={16} /> Cancelar</button><button type="button" className="dangerOutline" onClick={() => closeReservation(reservation, 'nao_compareceu')}><Trash2 size={16} /> Fechar cliente</button></>}</div></article>) : <div className="reservationEmpty"><ShoppingBag size={28} /> Nenhuma reserva pendente.</div>}</section>
    </div>
    {canManage && history.length > 0 && <section className="reservationPanel reservationHistory"><div className="panelHeading"><ClipboardList size={20} /><h2>Histórico de cancelamentos</h2></div>{history.slice(0, 12).map(reservation => <div className="reservationHistoryRow" key={reservation.id}><strong>{reservation.customerName}</strong><span>{reservation.status === 'cancelada' ? 'Cancelada' : 'Cliente não compareceu'} · {reservation.closeReason}</span><small>{reservation.closedBy}</small></div>)}</section>}
  </div>
}
