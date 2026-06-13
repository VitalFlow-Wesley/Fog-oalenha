import { useEffect, useMemo, useState } from 'react'
import { products as defaultProducts } from '../data/mockData.js'
import TableCard from '../components/TableCard.jsx'
import { ChefHat, Clock, DollarSign, History, Link2, Minus, Plus, RefreshCw, ReceiptText, Search, Split, Trash2, Users, X } from 'lucide-react'
import { repairData, repairText } from '../text-normalizer.js'
import { loadRemoteState } from '../services/appStateApi.js'

const PRODUCTS_KEY = 'fogao-products-v1'
const CLOSED_TABLES_KEY = 'fogao-closed-tables-v1'
const productIcons = {
  Refeições: '🍲',
  Churrasco: '🥩',
  Churrascos: '🥩',
  Petiscos: '🍟',
  Sucos: '🥤',
  Bebidas: '🥤',
  Bombons: '🍬',
  Salgadinhos: '🥨',
  Sorvetes: '🍨',
  Sobremesas: '🍮',
  Outros: '🍽️',
}

function normalizeProduct(product) {
  const fixedProduct = repairData(product)
  const category = fixedProduct.category || 'Outros'
  const sector = fixedProduct.sector || fixedProduct.localSaida || 'Bar / Caixa'
  return {
    ...fixedProduct,
    name: repairText(fixedProduct.name || 'Produto'),
    category,
    sector,
    localSaida: fixedProduct.localSaida || sector,
    imprimeCozinha: fixedProduct.imprimeCozinha ?? fixedProduct.prepare ?? !['Bebidas', 'Bombons', 'Salgadinhos', 'Sorvetes', 'Sobremesas'].includes(category),
    status: fixedProduct.status || 'Ativo',
  }
}

function readProducts() {
  try {
    const saved = repairData(JSON.parse(localStorage.getItem(PRODUCTS_KEY) || 'null'))
    return Array.isArray(saved) && saved.length ? saved.map(normalizeProduct) : defaultProducts.map(normalizeProduct)
  } catch {
    return defaultProducts.map(normalizeProduct)
  }
}

function getPrinterName(settings, role) {
  const printers = settings?.printers || []
  const printerId = role === 'cashier' ? settings?.cashierPrinterId : settings?.kitchenPrinterId
  const selected = printers.find(printer => printer.id === printerId)
  return selected?.name || selected?.label || (role === 'cashier' ? 'Caixa' : 'Cozinha')
}

function formatMoney(value) {
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`
}

function formatUpdateTime(date) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function todayKey() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function getItemsQty(record) {
  return (record.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0)
}

function getClosedTableRecords(history, date = todayKey()) {
  return (history || [])
    .filter(record => record.date === date)
    .map(record => ({
      ...record,
      itemsQty: getItemsQty(record),
      sourceLabel: record.closedByMode === 'fechamento_caixa' ? 'Fechamento do caixa' : 'Fechada pela mesa',
    }))
    .sort((a, b) => new Date(b.closedAt || 0) - new Date(a.closedAt || 0))
}

function createTable(nextId) {
  return {
    id: nextId,
    number: String(nextId).padStart(2, '0'),
    status: 'ocupada',
    guests: 2,
    openedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    items: [],
    kitchenSent: false,
    billRequested: false,
  }
}

export default function Mesas({ tables, setTables, users, currentUser, settings, onCloseTable }) {
  const [selected, setSelected] = useState(null)
  const [availableProducts, setAvailableProducts] = useState(() => readProducts())
  const [closedTablesOpen, setClosedTablesOpen] = useState(false)
  const [closedTablesDate, setClosedTablesDate] = useState(todayKey())
  const [selectedClosedTable, setSelectedClosedTable] = useState(null)
  const [closedTablesHistory, setClosedTablesHistory] = useState(() => readJson(CLOSED_TABLES_KEY, []))
  const categories = useMemo(() => [...new Set(availableProducts.filter(p => p.status !== 'Inativo').map(p => p.category))], [availableProducts])
  const [activeCategory, setActiveCategory] = useState(categories[0] || 'Refeições')
  const [observation, setObservation] = useState('')
  const [cancelRequest, setCancelRequest] = useState(null)
  const [cancelPassword, setCancelPassword] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [printJob, setPrintJob] = useState(null)
  const [joinTargetId, setJoinTargetId] = useState('')
  const [joinModalOpen, setJoinModalOpen] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  const table = useMemo(() => tables.find(t => t.id === selected?.id), [tables, selected])
  const summary = useMemo(() => {
    const visibleTables = tables.filter(t => t.status !== 'juntada')
    const totalTables = visibleTables.length || 1
    const occupied = visibleTables.filter(t => t.status === 'ocupada' || t.status === 'enviado').length
    const free = visibleTables.filter(t => t.status === 'livre').length
    const bill = visibleTables.filter(t => t.status === 'conta').length
    const revenue = visibleTables
      .filter(t => t.status !== 'livre')
      .reduce((sum, tableItem) => sum + tableItem.items.reduce((s, item) => s + item.price * item.qty, 0), 0)

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

  const mergeTargets = useMemo(
    () => table ? tables.filter(t => t.id !== table.id && t.status !== 'juntada' && !t.mergedTableIds?.length) : [],
    [tables, table]
  )
  const closedTablesToday = useMemo(() => getClosedTableRecords(closedTablesHistory, closedTablesDate), [closedTablesHistory, closedTablesDate])

  useEffect(() => {
    if (!categories.length) return
    if (!categories.includes(activeCategory)) setActiveCategory(categories[0])
  }, [categories, activeCategory])

  useEffect(() => {
    function syncProducts() { setAvailableProducts(readProducts()) }
    window.addEventListener('storage', syncProducts)
    window.addEventListener('focus', syncProducts)
    const timer = setInterval(syncProducts, 1500)
    return () => {
      window.removeEventListener('storage', syncProducts)
      window.removeEventListener('focus', syncProducts)
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (!printJob) return undefined
    const timer = setTimeout(() => window.print(), 150)
    return () => clearTimeout(timer)
  }, [printJob])

  useEffect(() => {
    async function syncClosedTablesHistory() {
      try {
        const remote = await loadRemoteState()
        if (Array.isArray(remote.closedTablesHistory)) {
          localStorage.setItem(CLOSED_TABLES_KEY, JSON.stringify(remote.closedTablesHistory))
          setClosedTablesHistory(remote.closedTablesHistory)
          return
        }
      } catch {
        // Usa o histórico local se a sincronização remota não responder.
      }
      setClosedTablesHistory(readJson(CLOSED_TABLES_KEY, []))
    }

    const onUpdate = () => setClosedTablesHistory(readJson(CLOSED_TABLES_KEY, []))
    syncClosedTablesHistory()
    window.addEventListener('fogao-closed-tables-updated', onUpdate)
    window.addEventListener('focus', syncClosedTablesHistory)
    return () => {
      window.removeEventListener('fogao-closed-tables-updated', onUpdate)
      window.removeEventListener('focus', syncClosedTablesHistory)
    }
  }, [])

  function updateTable(id, patch) {
    setTables(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  function touch() {
    setLastUpdate(new Date())
    setIsRefreshing(true)
    window.setTimeout(() => setIsRefreshing(false), 650)
  }

  function currentWaiterName() {
    return currentUser?.name || currentUser?.username || 'Garçom'
  }

  function waiterPatch(table = {}) {
    const waiterName = currentWaiterName()
    return {
      waiterName: table.waiterName || waiterName,
      openedByName: table.openedByName || waiterName,
      createdByName: table.createdByName || waiterName,
      kitchenWaiterName: table.kitchenWaiterName || waiterName,
    }
  }

  function addTable() {
    const nextId = tables.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1
    const newTable = createTable(nextId)
    setTables(prev => [...prev, newTable])
    setSelected(newTable)
    touch()
  }

  function openTable(t) {
    if (t.status === 'juntada' && t.mergedTo) {
      const main = tables.find(tableItem => tableItem.id === t.mergedTo)
      if (main) setSelected(main)
      return
    }
    if (t.status === 'livre') {
      const updated = { ...t, ...waiterPatch(t), status: 'ocupada', guests: 2, openedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
      updateTable(t.id, updated)
      setSelected(updated)
      touch()
      return
    }
    setSelected(t)
  }

  function addItem(product) {
    const current = tables.find(t => t.id === selected.id)
    if (!current) return
    const existing = current.items.find(i => i.id === product.id && i.observation === observation)
    const waiterName = currentWaiterName()
    const items = existing
      ? current.items.map(i => i.id === product.id && i.observation === observation ? { ...i, qty: i.qty + 1 } : i)
      : [...current.items, { ...product, qty: 1, observation, waiterName, launchedByName: waiterName }]
    updateTable(current.id, { ...waiterPatch(current), items, status: current.status === 'livre' ? 'ocupada' : current.status })
    setObservation('')
    touch()
  }

  function changeQty(item, delta) {
    const current = tables.find(t => t.id === selected.id)
    if (!current) return
    const items = current.items.map(i => i.id === item.id && i.observation === item.observation && i.originTable === item.originTable ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
    updateTable(current.id, { items })
    touch()
  }

  function changeGuests(nextValue) {
    const current = tables.find(t => t.id === selected?.id)
    if (!current) return
    const guests = Math.max(1, Math.min(99, Number(nextValue) || 1))
    updateTable(current.id, { guests })
    setSelected(prev => prev ? { ...prev, guests } : prev)
    touch()
  }

  function askCancelItem(item) {
    setCancelRequest(item)
    setCancelPassword('')
    setCancelError('')
  }

  function confirmCancelItem(event) {
    event.preventDefault()
    const authorizationPassword = settings?.cancelPassword || ''
    const authorizedUser = users.find(user => user.active && ['admin', 'gerente'].includes(user.role) && (user.password === cancelPassword || authorizationPassword === cancelPassword))
    if (!authorizedUser && cancelPassword !== authorizationPassword) {
      setCancelError('Senha inválida. Cancelamento permitido somente com senha cadastrada pelo administrador ou gerente.')
      return
    }
    const current = tables.find(t => t.id === selected.id)
    if (!current) return
    const items = current.items.filter(i => !(i.id === cancelRequest.id && i.observation === cancelRequest.observation && i.originTable === cancelRequest.originTable))
    updateTable(current.id, { items, lastCancelAuthorizedBy: authorizedUser?.name || settings?.cancelUpdatedBy || 'Autorizado' })
    setCancelRequest(null)
    setCancelPassword('')
    setCancelError('')
    touch()
  }

  function joinTable() {
    if (!table || !joinTargetId) return
    const target = tables.find(t => t.id === Number(joinTargetId))
    if (!target || target.status === 'juntada') return
    const joinedIds = [...(table.mergedTableIds || []), target.id]
    const joinedNumbers = [...(table.mergedTableNumbers || []), target.number]
    const mergedItems = [...table.items, ...target.items.map(item => ({ ...item, originTable: target.number }))]
    const nextStatus = table.status === 'conta' || target.status === 'conta' ? 'conta' : 'ocupada'
    setTables(prev => prev.map(t => {
      if (t.id === table.id) return { ...t, status: nextStatus, guests: (t.guests || 0) + (target.guests || 0), items: mergedItems, mergedTableIds: joinedIds, mergedTableNumbers: joinedNumbers }
      if (t.id === target.id) return { ...t, status: 'juntada', items: [], guests: 0, mergedTo: table.id, mergedToNumber: table.number, previousMergeState: target }
      return t
    }))
    setSelected(prev => ({ ...prev, status: nextStatus, guests: (prev.guests || 0) + (target.guests || 0), items: mergedItems, mergedTableIds: joinedIds, mergedTableNumbers: joinedNumbers }))
    setJoinTargetId('')
    setJoinModalOpen(false)
    touch()
  }

  function splitTables() {
    if (!table?.mergedTableIds?.length) return
    setTables(prev => prev.map(t => {
      if (t.id === table.id) return { ...t, guests: Math.max(1, t.guests - table.mergedTableIds.length), items: t.items.filter(item => !item.originTable), mergedTableIds: [], mergedTableNumbers: [] }
      if (table.mergedTableIds.includes(t.id)) {
        const previous = t.previousMergeState || t
        return { ...previous, mergedTo: undefined, mergedToNumber: undefined, previousMergeState: undefined }
      }
      return t
    }))
    setSelected(prev => ({ ...prev, guests: Math.max(1, prev.guests - prev.mergedTableIds.length), items: prev.items.filter(item => !item.originTable), mergedTableIds: [], mergedTableNumbers: [] }))
    touch()
  }

  function sendKitchen() {
    const current = tables.find(t => t.id === selected.id)
    if (!current) return
    const kitchenPrinterName = getPrinterName(settings, 'kitchen')
    const kitchenItems = current.items.filter(i => i.imprimeCozinha || settings?.printBarItems)
    const waiterName = currentUser?.name || currentUser?.username || 'Garçom'
    const kitchenSentAt = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    updateTable(selected.id, { status: 'enviado', kitchenSent: true, kitchenSentAt, kitchenWaiterName: waiterName, lastKitchenPrinter: kitchenPrinterName })
    setPrintJob({ type: 'kitchen', title: 'PEDIDO PARA COZINHA', table: current, items: kitchenItems, printerName: kitchenPrinterName, waiterName, total: 0 })
    touch()
  }

  function requestBill() {
    const current = tables.find(t => t.id === selected.id)
    if (!current) return
    const cashierPrinterName = getPrinterName(settings, 'cashier')
    const billTotal = current.items.reduce((sum, item) => sum + item.price * item.qty, 0)
    updateTable(selected.id, { status: 'conta', billRequested: true, lastCashierPrinter: cashierPrinterName })
    setPrintJob({ type: 'bill', title: 'COMANDA PARA CONFERÊNCIA', table: current, items: current.items, printerName: cashierPrinterName, waiterName: currentUser?.name || currentUser?.username || 'Atendente', total: billTotal })
    touch()
  }

  async function closeTable() {
    if (onCloseTable) {
      await onCloseTable(selected.id)
    } else {
      setTables(prev => prev.map(t => {
        if (t.id === selected.id) return { ...t, status: 'livre', guests: 0, openedAt: null, items: [], kitchenSent: false, billRequested: false, mergedTableIds: [], mergedTableNumbers: [] }
        if (selected.mergedTableIds?.includes(t.id)) return { ...t, status: 'livre', guests: 0, openedAt: null, items: [], kitchenSent: false, billRequested: false, mergedTo: undefined, mergedToNumber: undefined, previousMergeState: undefined }
        return t
      }))
    }
    setClosedTablesHistory(readJson(CLOSED_TABLES_KEY, []))
    setSelected(null)
    touch()
  }

  const total = table?.items.reduce((sum, item) => sum + item.price * item.qty, 0) || 0
  const filteredProducts = availableProducts.filter(p => p.status !== 'Inativo' && p.category === activeCategory)
  const tableLabel = table ? `Mesa ${table.number}${table.mergedTableNumbers?.length ? ` + ${table.mergedTableNumbers.join(' + ')}` : ''}` : ''
  const totalItems = table?.items.reduce((sum, item) => sum + item.qty, 0) || 0
  const updatedLabel = isRefreshing ? 'Atualizando...' : `Atualizado às ${formatUpdateTime(lastUpdate)}`

  return (
    <div className="page restaurantTablesPage">
      <div className="pageHeader restaurantPageHeader">
        <div>
          <span className="eyebrow restaurantEyebrow">SALÃO</span>
          <h1>Mesas e comandas</h1>
          <p>Acompanhe ocupação, consumo e status das mesas.</p>
        </div>
        <div className="headerActions">
          <button className="secondaryTableBtn" type="button" onClick={() => setClosedTablesOpen(true)}>
            <History size={18} /> Mesas fechadas <strong>{closedTablesToday.length}</strong>
          </button>
          <button className="primaryBtn" type="button" onClick={addTable}><Plus size={18} /> Adicionar mesa</button>
          <span className={`updatedPill ${isRefreshing ? 'refreshing' : ''}`}><Clock size={17} /> {updatedLabel}</span>
          <button className={`refreshBtn ${isRefreshing ? 'refreshing' : ''}`} type="button" onClick={touch} title="Atualizar mesas"><RefreshCw size={20} /></button>
        </div>
      </div>

      <div className="restaurantSummaryGrid">
        <div className="restaurantSummaryCard occupied"><div className="summaryIcon"><Users size={26} /></div><div><span>Mesas ocupadas</span><strong>{summary.occupied}</strong><small>{summary.occupiedPercent}% do salão</small></div></div>
        <div className="restaurantSummaryCard free"><div className="summaryIcon">▱</div><div><span>Mesas livres</span><strong>{summary.free}</strong><small>{summary.freePercent}% do salão</small></div></div>
        <div className="restaurantSummaryCard bill"><div className="summaryIcon"><ReceiptText size={26} /></div><div><span>Contas solicitadas</span><strong>{summary.bill}</strong><small>{summary.billPercent}% do salão</small></div></div>
        <div className="restaurantSummaryCard revenue"><div className="summaryIcon"><DollarSign size={28} /></div><div><span>Faturamento do salão</span><strong>{formatMoney(summary.revenue)}</strong><small>Hoje</small></div></div>
      </div>

      {tables.length === 0 ? (
        <section className="emptyState restaurantEmptyState">
          <div className="emptyIcon">🍽️</div>
          <h2>Nenhuma mesa aberta ainda</h2>
          <p>Comece adicionando as mesas conforme os clientes forem chegando no salão.</p>
          <button className="primaryBtn" type="button" onClick={addTable}><Plus size={18} /> Adicionar primeira mesa</button>
        </section>
      ) : (
        <div className="tablesGrid restaurantTablesGrid">
          {tables.map(tableItem => <TableCard table={tableItem} key={tableItem.id} onOpen={openTable} />)}
        </div>
      )}

      {table && (
        <div className="drawerOverlay commandOverlay">
          <aside className="drawer commandDrawer">
            <button className="commandClose" onClick={() => setSelected(null)}><X size={24} /></button>
            <header className="commandHeader">
              <div>
                <span className="commandEyebrow">COMANDA ABERTA</span>
                <div className="commandTitleRow">
                  <h2>{tableLabel}</h2>
                  <div className="commandGuestsEditor" aria-label="Quantidade de pessoas na mesa">
                    <Users size={18} />
                    <button type="button" onClick={() => changeGuests((table.guests || 1) - 1)}><Minus size={13} /></button>
                    <input type="number" min="1" max="99" value={table.guests || 1} onChange={event => changeGuests(event.target.value)} />
                    <button type="button" onClick={() => changeGuests((table.guests || 1) + 1)}><Plus size={13} /></button>
                    <span>pessoas</span>
                  </div>
                </div>
              </div>
              <div className="commandActions">
                <button className="commandBtn" onClick={() => setJoinModalOpen(true)}><Link2 size={18} /> Juntar mesas</button>
                {table.mergedTableIds?.length > 0 && <button className="commandBtn" onClick={splitTables}><Split size={18} /> Separar mesas</button>}
                <button className="commandBtn" onClick={sendKitchen}><ChefHat size={18} /> Enviar para cozinha</button>
                <button className="commandBtn" onClick={requestBill}><ReceiptText size={18} /> Solicitar conta</button>
                <button className="commandBtn commandDanger" onClick={closeTable}>Fechar mesa</button>
              </div>
            </header>

            <div className="commandMainGrid">
              <section className="commandPanel">
                <h3>Itens da comanda</h3>
                <div className="commandItemsList">
                  {table.items.length === 0 && <p className="empty">Nenhum item lançado ainda.</p>}
                  {table.items.map((item, index) => (
                    <div className="commandItem" key={`${item.id}-${index}-${item.observation}-${item.originTable || ''}`}>
                      <div className="commandItemInfo">
                        <strong>{item.name}</strong>
                        {item.originTable && <small>Origem: Mesa {item.originTable}</small>}
                        {item.observation && <small>Obs.: {item.observation}</small>}
                      </div>
                      <div className="commandItemControls">
                        <div className="qtyStepper"><button onClick={() => changeQty(item, -1)}><Minus size={14} /></button><b>{item.qty}</b><button onClick={() => changeQty(item, 1)}><Plus size={14} /></button></div>
                        <button className="removeItemBtn" onClick={() => askCancelItem(item)}><Trash2 size={16} /></button>
                        <strong>{formatMoney(item.price * item.qty)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="commandTotalCard"><div><span>Total da mesa</span><small>{totalItems} itens</small></div><strong>{formatMoney(total)}</strong></div>
              </section>

              <section className="commandPanel commandProductsPanel">
                <h3>Adicionar pedido</h3>
                <label className="commandObs"><Search size={20} /><input className="obsInput" value={observation} onChange={e => setObservation(e.target.value)} placeholder="Observação do item. Ex.: sem cebola" /></label>
                <div className="commandCategoryTabs">{categories.map(cat => <button className={activeCategory === cat ? 'active' : ''} onClick={() => setActiveCategory(cat)} key={cat}>{cat}</button>)}</div>
                <div className="commandProductGrid">{filteredProducts.map(product => <button className="commandProductCard" key={product.id} onClick={() => addItem(product)}><div className="productThumb">{productIcons[product.category] || '🍽️'}</div><div><strong>{product.name}</strong><span>{formatMoney(product.price)}</span><small>{product.imprimeCozinha ? 'Vai para cozinha' : 'Sai na comanda'}</small></div><em><Plus size={20} /></em></button>)}</div>
              </section>
            </div>
          </aside>
        </div>
      )}

      {joinModalOpen && table && (
        <div className="authModalOverlay">
          <form className="authModal joinTableModal" onSubmit={e => { e.preventDefault(); joinTable() }}>
            <div className="drawerHeader"><div><span className="eyebrow">Juntar mesas</span><h2>{tableLabel}</h2></div><button type="button" className="iconBtn" onClick={() => { setJoinModalOpen(false); setJoinTargetId('') }}><X size={22} /></button></div>
            <p>Escolha a mesa que será agrupada na comanda principal.</p>
            <label><span>Mesa para juntar</span><select value={joinTargetId} onChange={e => setJoinTargetId(e.target.value)} autoFocus><option value="">Selecione uma mesa</option>{mergeTargets.map(target => <option key={target.id} value={target.id}>Mesa {target.number} - {target.status === 'livre' ? 'Livre' : 'Ocupada'}</option>)}</select></label>
            {mergeTargets.length === 0 && <div className="loginError">Não há mesas disponíveis para juntar no momento.</div>}
            <div className="actionsRow"><button className="secondaryBtn" type="submit" disabled={!joinTargetId}>Confirmar junção</button><button className="secondaryBtn" type="button" onClick={() => { setJoinModalOpen(false); setJoinTargetId('') }}>Cancelar</button></div>
          </form>
        </div>
      )}

      {cancelRequest && (
        <div className="authModalOverlay">
          <form className="authModal" onSubmit={confirmCancelItem}>
            <div className="drawerHeader"><div><span className="eyebrow">Autorização obrigatória</span><h2>Cancelar item</h2></div><button type="button" className="iconBtn" onClick={() => setCancelRequest(null)}><X size={22} /></button></div>
            <p>Para cancelar <strong>{cancelRequest.name}</strong>, informe a senha de autorização.</p>
            <label><span>Senha de autorização</span><input value={cancelPassword} onChange={e => setCancelPassword(e.target.value)} type="password" placeholder="Senha de cancelamento" autoFocus /></label>
            {cancelError && <div className="loginError">{cancelError}</div>}
            <div className="actionsRow"><button className="dangerBtn" type="submit">Confirmar cancelamento</button><button className="secondaryBtn" type="button" onClick={() => setCancelRequest(null)}>Voltar</button></div>
          </form>
        </div>
      )}

      {closedTablesOpen && (
        <div className="authModalOverlay closedTablesOverlay">
          <section className="authModal closedTablesModal">
            <div className="drawerHeader">
              <div>
                <span className="eyebrow">Histórico do dia</span>
                <h2>Mesas fechadas</h2>
              </div>
              <button type="button" className="iconBtn" onClick={() => setClosedTablesOpen(false)}><X size={22} /></button>
            </div>
            <label className="closedTablesDateFilter">
              <span>Data</span>
              <input type="date" value={closedTablesDate} onChange={event => setClosedTablesDate(event.target.value || todayKey())} />
            </label>
            <div className="closedTablesSummary">
              <div><span>Mesas</span><strong>{closedTablesToday.length}</strong></div>
              <div><span>Itens</span><strong>{closedTablesToday.reduce((sum, record) => sum + record.itemsQty, 0)}</strong></div>
              <div><span>Consumo</span><strong>{formatMoney(closedTablesToday.reduce((sum, record) => sum + Number(record.total || 0), 0))}</strong></div>
            </div>
            <div className="closedTablesList">
              {closedTablesToday.length ? closedTablesToday.map(record => (
                <article className="closedTableCard" key={record.id}>
                  <header>
                    <div>
                      <strong>Mesa {record.tableNumber}</strong>
                      <span>{record.sourceLabel} · {record.closedAtLabel || 'Hoje'}</span>
                    </div>
                    <b>{formatMoney(record.total)}</b>
                  </header>
                  <div className="closedTableMeta">
                    <span>{record.guests || 0} pessoas</span>
                    <span>{record.itemsQty} itens</span>
                    <span>{record.waiterName || 'Sem garçom'}</span>
                  </div>
                  <div className="closedTableFooter">
                    <span>{record.observation || 'Sem observação'}</span>
                    <button type="button" onClick={() => setSelectedClosedTable(record)}>Ver consumo</button>
                  </div>
                </article>
              )) : (
                <div className="closedTablesEmpty">
                  <strong>Nenhuma mesa fechada hoje</strong>
                  <span>As mesas fechadas manualmente ou pelo fechamento do caixa aparecerão aqui.</span>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {selectedClosedTable && (
        <div className="authModalOverlay closedTablesOverlay">
          <section className="authModal closedConsumptionModal">
            <div className="drawerHeader">
              <div>
                <span className="eyebrow">Consumo fechado</span>
                <h2>Mesa {selectedClosedTable.tableNumber}</h2>
              </div>
              <button type="button" className="iconBtn" onClick={() => setSelectedClosedTable(null)}><X size={22} /></button>
            </div>
            <div className="closedConsumptionHero">
              <div><span>Garçom</span><strong>{selectedClosedTable.waiterName || 'Sem garçom'}</strong></div>
              <div><span>Data e hora</span><strong>{selectedClosedTable.closedAtLabel || 'Hoje'}</strong></div>
              <div><span>Total</span><strong>{formatMoney(selectedClosedTable.total)}</strong></div>
            </div>
            <div className="closedConsumptionItems">
              {(selectedClosedTable.items || []).map((item, index) => (
                <div className="closedConsumptionRow" key={`${selectedClosedTable.id}-${item.id}-${index}`}>
                  <span>{Number(item.qty || 0)}x</span>
                  <strong>{item.name}</strong>
                  <em>{item.category || item.sector || '-'}</em>
                  <b>{formatMoney(item.price)}</b>
                  <b>{formatMoney(item.total ?? Number(item.price || 0) * Number(item.qty || 0))}</b>
                </div>
              ))}
            </div>
            {selectedClosedTable.observation && <p className="closedConsumptionNote">{selectedClosedTable.observation}</p>}
          </section>
        </div>
      )}

      {printJob && (
        <div className="printOnly customerBillPrint">
          <h1>{printJob.title}</h1>
          <p><strong>Garçom:</strong> {printJob.waiterName}</p>
          <p><strong>Mesa:</strong> {printJob.table.number}{printJob.table.mergedTableNumbers?.length ? ` + ${printJob.table.mergedTableNumbers.join(' + ')}` : ''}</p>
          <p><strong>Data:</strong> {new Date().toLocaleString('pt-BR')}</p>
          <hr />
          {printJob.items.length === 0 ? <p>Nenhum item para impressão.</p> : printJob.items.map((item, index) => <div className="printLine" key={`${item.id}-${index}`}><span>{item.qty}x {item.name}{item.originTable ? ` - Mesa ${item.originTable}` : ''}{item.observation ? ` (${item.observation})` : ''}</span>{printJob.type === 'bill' && <strong>{formatMoney(item.price * item.qty)}</strong>}</div>)}
          {printJob.type === 'bill' && <><hr /><div className="printTotal"><span>Total</span><strong>{formatMoney(printJob.total)}</strong></div><p className="printFooter">Comanda para conferência do cliente.</p></>}
        </div>
      )}
    </div>
  )
}
