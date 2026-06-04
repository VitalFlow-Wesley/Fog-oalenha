import { useMemo, useState } from 'react'
import { products } from '../data/mockData.js'
import TableCard from '../components/TableCard.jsx'
import { ClipboardList, Clock, DollarSign, Printer, RefreshCw, ReceiptText, Users, X } from 'lucide-react'

const categories = [...new Set(products.map(p => p.category))]

export default function Mesas({ tables, setTables, users, currentUser }) {
  const [selected, setSelected] = useState(null)
  const [activeCategory, setActiveCategory] = useState(categories[0])
  const [observation, setObservation] = useState('')
  const [cancelRequest, setCancelRequest] = useState(null)
  const [cancelPassword, setCancelPassword] = useState('')
  const [cancelError, setCancelError] = useState('')

  const table = useMemo(() => tables.find(t => t.id === selected?.id), [tables, selected])

  const summary = useMemo(() => {
    const totalTables = tables.length || 1
    const occupied = tables.filter(t => t.status === 'ocupada' || t.status === 'enviado').length
    const free = tables.filter(t => t.status === 'livre').length
    const bill = tables.filter(t => t.status === 'conta').length
    const revenue = tables
      .filter(t => t.status !== 'livre')
      .reduce((sum, table) => sum + table.items.reduce((s, item) => s + item.price * item.qty, 0), 0)

    return {
      occupied,
      free,
      bill,
      revenue,
      occupiedPercent: Math.round((occupied / totalTables) * 100),
      freePercent: Math.round((free / totalTables) * 100),
      billPercent: Math.round((bill / totalTables) * 100),
    }
  }, [tables])

  function updateTable(id, patch) {
    setTables(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  function openTable(t) {
    if (t.status === 'livre') {
      const updated = { ...t, status: 'ocupada', guests: 2, openedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
      updateTable(t.id, updated)
      setSelected(updated)
      return
    }
    setSelected(t)
  }

  function addItem(product) {
    const current = tables.find(t => t.id === selected.id)
    const existing = current.items.find(i => i.id === product.id && i.observation === observation)
    let items
    if (existing) {
      items = current.items.map(i => i.id === product.id && i.observation === observation ? { ...i, qty: i.qty + 1 } : i)
    } else {
      items = [...current.items, { ...product, qty: 1, observation }]
    }
    updateTable(current.id, { items, status: current.status === 'livre' ? 'ocupada' : current.status })
    setObservation('')
  }

  function increaseQty(item) {
    const current = tables.find(t => t.id === selected.id)
    const items = current.items.map(i => i.id === item.id && i.observation === item.observation ? { ...i, qty: i.qty + 1 } : i)
    updateTable(current.id, { items })
  }

  function askCancelItem(item) {
    setCancelRequest(item)
    setCancelPassword('')
    setCancelError('')
  }

  function confirmCancelItem(event) {
    event.preventDefault()
    const authorizedUser = users.find(user =>
      user.active &&
      ['admin', 'gerente'].includes(user.role) &&
      user.password === cancelPassword
    )

    if (!authorizedUser) {
      setCancelError('Senha inválida. Cancelamento permitido somente com senha de administrador ou gerente.')
      return
    }

    const current = tables.find(t => t.id === selected.id)
    const items = current.items.filter(i => !(i.id === cancelRequest.id && i.observation === cancelRequest.observation))
    updateTable(current.id, { items, lastCancelAuthorizedBy: authorizedUser.name })
    setCancelRequest(null)
    setCancelPassword('')
    setCancelError('')
  }

  function sendKitchen() {
    updateTable(selected.id, { status: 'enviado', kitchenSent: true })
  }

  function requestBill() {
    updateTable(selected.id, { status: 'conta', billRequested: true })
  }

  function closeTable() {
    updateTable(selected.id, { status: 'livre', guests: 0, openedAt: null, items: [], kitchenSent: false, billRequested: false })
    setSelected(null)
  }

  const total = table?.items.reduce((sum, item) => sum + item.price * item.qty, 0) || 0
  const kitchenItems = table?.items.filter(i => i.imprimeCozinha) || []
  const filteredProducts = products.filter(p => p.category === activeCategory)

  return (
    <div className="page restaurantTablesPage">
      <div className="pageHeader restaurantPageHeader">
        <div>
          <span className="eyebrow restaurantEyebrow">SALÃO</span>
          <h1>Mesas e comandas</h1>
          <p>Acompanhe ocupação, consumo e status das mesas.</p>
        </div>

        <div className="headerActions">
          <span className="updatedPill"><Clock size={17} /> Atualizado agora há pouco</span>
          <button className="refreshBtn" type="button"><RefreshCw size={20} /></button>
        </div>
      </div>

      <div className="restaurantSummaryGrid">
        <div className="restaurantSummaryCard occupied">
          <div className="summaryIcon"><Users size={26} /></div>
          <div>
            <span>Mesas ocupadas</span>
            <strong>{summary.occupied}</strong>
            <small>{summary.occupiedPercent}% do salão</small>
          </div>
        </div>
        <div className="restaurantSummaryCard free">
          <div className="summaryIcon">▱</div>
          <div>
            <span>Mesas livres</span>
            <strong>{summary.free}</strong>
            <small>{summary.freePercent}% do salão</small>
          </div>
        </div>
        <div className="restaurantSummaryCard bill">
          <div className="summaryIcon"><ReceiptText size={26} /></div>
          <div>
            <span>Contas solicitadas</span>
            <strong>{summary.bill}</strong>
            <small>{summary.billPercent}% do salão</small>
          </div>
        </div>
        <div className="restaurantSummaryCard revenue">
          <div className="summaryIcon"><DollarSign size={28} /></div>
          <div>
            <span>Faturamento do salão</span>
            <strong>R$ {summary.revenue.toFixed(2).replace('.', ',')}</strong>
            <small>Hoje</small>
          </div>
        </div>
      </div>

      <div className="tablesGrid restaurantTablesGrid">
        {tables.map(table => <TableCard table={table} key={table.id} onOpen={openTable} />)}
      </div>

      {table && (
        <div className="drawerOverlay">
          <aside className="drawer">
            <div className="drawerHeader">
              <div>
                <span className="eyebrow">Comanda aberta</span>
                <h2>Mesa {table.number}</h2>
              </div>
              <button className="iconBtn" onClick={() => setSelected(null)}><X size={22} /></button>
            </div>

            <div className="drawerColumns">
              <section>
                <h3>Itens da comanda</h3>
                <div className="itemsList">
                  {table.items.length === 0 && <p className="empty">Nenhum item lançado ainda.</p>}
                  {table.items.map((item, index) => (
                    <div className="orderItem" key={`${item.id}-${index}-${item.observation}`}>
                      <div>
                        <strong>{item.name}</strong>
                        <span>{item.localSaida === 'bar' ? 'Bar • não imprime' : 'Cozinha/churrasqueira • imprime'}</span>
                        {item.observation && <small>Obs: {item.observation}</small>}
                      </div>
                      <div className="qty qtyWithCancel">
                        <button className="cancelQtyBtn" onClick={() => askCancelItem(item)}>Cancelar</button>
                        <b>{item.qty}</b>
                        <button onClick={() => increaseQty(item)}>+</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="billBox">
                  <span>Total da mesa</span>
                  <strong>R$ {total.toFixed(2).replace('.', ',')}</strong>
                </div>

                <div className="actionsRow">
                  <button className="secondaryBtn" onClick={sendKitchen}>Enviar para cozinha</button>
                  <button className="secondaryBtn" onClick={requestBill}>Solicitar conta</button>
                  <button className="dangerBtn" onClick={closeTable}>Fechar mesa</button>
                </div>

                <div className="printPreview">
                  <div className="printTitle"><Printer size={18} /> Pedido enviado para cozinha</div>
                  <strong>Mesa {table.number}</strong>
                  <span>Sem controle de preparo no sistema. A cozinha recebe o pedido, prepara e entrega normalmente.</span>
                  {kitchenItems.length === 0 ? (
                    <span>Nenhum item de cozinha para enviar.</span>
                  ) : (
                    kitchenItems.map((item, index) => (
                      <span key={`${item.id}-print-${index}`}>{item.qty}x {item.name}{item.observation ? ` — ${item.observation}` : ''}</span>
                    ))
                  )}
                </div>
              </section>

              <section>
                <h3>Adicionar pedido</h3>
                <input className="obsInput" value={observation} onChange={e => setObservation(e.target.value)} placeholder="Observação do item. Ex: sem cebola" />

                <div className="categoryTabs">
                  {categories.map(cat => (
                    <button className={activeCategory === cat ? 'active' : ''} onClick={() => setActiveCategory(cat)} key={cat}>{cat}</button>
                  ))}
                </div>

                <div className="productGrid">
                  {filteredProducts.map(product => (
                    <button className="productCard" key={product.id} onClick={() => addItem(product)}>
                      <strong>{product.name}</strong>
                      <span>R$ {product.price.toFixed(2).replace('.', ',')}</span>
                      <small>{product.imprimeCozinha ? 'Envia para cozinha' : 'Só registra na mesa'}</small>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}

      {cancelRequest && (
        <div className="authModalOverlay">
          <form className="authModal" onSubmit={confirmCancelItem}>
            <div className="drawerHeader">
              <div>
                <span className="eyebrow">Autorização obrigatória</span>
                <h2>Cancelar item</h2>
              </div>
              <button type="button" className="iconBtn" onClick={() => setCancelRequest(null)}><X size={22} /></button>
            </div>

            <p>
              Para cancelar <strong>{cancelRequest.name}</strong>, informe a senha de autorização.
            </p>

            <label>
              <span>Senha de autorização</span>
              <input value={cancelPassword} onChange={e => setCancelPassword(e.target.value)} type="password" placeholder="Senha do gerente/admin" autoFocus />
            </label>

            {cancelError && <div className="loginError">{cancelError}</div>}

            <div className="actionsRow">
              <button className="dangerBtn" type="submit">Confirmar cancelamento</button>
              <button className="secondaryBtn" type="button" onClick={() => setCancelRequest(null)}>Voltar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
