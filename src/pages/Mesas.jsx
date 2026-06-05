import { useEffect, useMemo, useState } from 'react'
import { products } from '../data/mockData.js'
import TableCard from '../components/TableCard.jsx'
import { Clock, DollarSign, Printer, RefreshCw, ReceiptText, Users, X } from 'lucide-react'

const categories = [...new Set(products.map(p => p.category))]

function getPrinterName(settings, role) {
  const printers = settings?.printers || []
  const printerId = role === 'cashier' ? settings?.cashierPrinterId : settings?.kitchenPrinterId
  const selected = printers.find(printer => printer.id === printerId)
  return selected?.name || selected?.label || (role === 'cashier' ? 'Caixa' : 'Cozinha')
}

function formatMoney(value) {
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`
}

export default function Mesas({ tables, setTables, users, currentUser, settings }) {
  const [selected, setSelected] = useState(null)
  const [activeCategory, setActiveCategory] = useState(categories[0])
  const [observation, setObservation] = useState('')
  const [cancelRequest, setCancelRequest] = useState(null)
  const [cancelPassword, setCancelPassword] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [printJob, setPrintJob] = useState(null)

  const table = useMemo(() => tables.find(t => t.id === selected?.id), [tables, selected])

  const summary = useMemo(() => {
    const totalTables = tables.length || 1
    const occupied = tables.filter(t => t.status === 'ocupada' || t.status === 'enviado').length
    const free = tables.filter(t => t.status === 'livre').length
    const bill = tables.filter(t => t.status === 'conta').length
    const revenue = tables.filter(t => t.status !== 'livre').reduce((sum, table) => sum + table.items.reduce((s, item) => s + item.price * item.qty, 0), 0)
    return { occupied, free, bill, revenue, occupiedPercent: Math.round((occupied / totalTables) * 100), freePercent: Math.round((free / totalTables) * 100), billPercent: Math.round((bill / totalTables) * 100) }
  }, [tables])

  useEffect(() => {
    if (!printJob) return
    const timer = setTimeout(() => window.print(), 150)
    return () => clearTimeout(timer)
  }, [printJob])

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
    const items = existing
      ? current.items.map(i => i.id === product.id && i.observation === observation ? { ...i, qty: i.qty + 1 } : i)
      : [...current.items, { ...product, qty: 1, observation }]
    updateTable(current.id, { items, status: current.status === 'livre' ? 'ocupada' : current.status })
    setObservation('')
  }

  function increaseQty(item) {
    const current = tables.find(t => t.id === selected.id)
    updateTable(current.id, { items: current.items.map(i => i.id === item.id && i.observation === item.observation ? { ...i, qty: i.qty + 1 } : i) })
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
    if (!authorizedUser && cancelPassword !== authorizationPassword) return setCancelError('Senha inválida. Cancelamento permitido somente com senha cadastrada pelo administrador ou gerente.')
    const current = tables.find(t => t.id === selected.id)
    const items = current.items.filter(i => !(i.id === cancelRequest.id && i.observation === cancelRequest.observation))
    updateTable(current.id, { items, lastCancelAuthorizedBy: authorizedUser?.name || settings?.cancelUpdatedBy || 'Autorizado' })
    setCancelRequest(null)
    setCancelPassword('')
    setCancelError('')
  }

  function sendKitchen() {
    const current = tables.find(t => t.id === selected.id)
    const kitchenPrinterName = getPrinterName(settings, 'kitchen')
    const kitchenItems = current.items.filter(i => i.imprimeCozinha || settings?.printBarItems)
    updateTable(selected.id, { status: 'enviado', kitchenSent: true, lastKitchenPrinter: kitchenPrinterName })
    setPrintJob({ type: 'kitchen', title: 'PEDIDO PARA COZINHA', table: current, items: kitchenItems, printerName: kitchenPrinterName, total: 0 })
  }

  function requestBill() {
    const current = tables.find(t => t.id === selected.id)
    const cashierPrinterName = getPrinterName(settings, 'cashier')
    const billTotal = current.items.reduce((sum, item) => sum + item.price * item.qty, 0)
    updateTable(selected.id, { status: 'conta', billRequested: true, lastCashierPrinter: cashierPrinterName })
    setPrintJob({ type: 'bill', title: 'COMANDA PARA CONFERÊNCIA', table: current, items: current.items, printerName: cashierPrinterName, total: billTotal })
  }

  function closeTable() {
    updateTable(selected.id, { status: 'livre', guests: 0, openedAt: null, items: [], kitchenSent: false, billRequested: false })
    setSelected(null)
  }

  const total = table?.items.reduce((sum, item) => sum + item.price * item.qty, 0) || 0
  const kitchenItems = table?.items.filter(i => i.imprimeCozinha || settings?.printBarItems) || []
  const filteredProducts = products.filter(p => p.category === activeCategory)
  const kitchenPrinterName = getPrinterName(settings, 'kitchen')
  const cashierPrinterName = getPrinterName(settings, 'cashier')

  return <div className="page restaurantTablesPage">
    <div className="pageHeader restaurantPageHeader"><div><span className="eyebrow restaurantEyebrow">SALÃO</span><h1>Mesas e comandas</h1><p>Acompanhe ocupação, consumo e status das mesas.</p></div><div className="headerActions"><span className="updatedPill"><Clock size={17} /> Atualizado agora há pouco</span><button className="refreshBtn" type="button"><RefreshCw size={20} /></button></div></div>
    <div className="restaurantSummaryGrid"><div className="restaurantSummaryCard occupied"><div className="summaryIcon"><Users size={26} /></div><div><span>Mesas ocupadas</span><strong>{summary.occupied}</strong><small>{summary.occupiedPercent}% do salão</small></div></div><div className="restaurantSummaryCard free"><div className="summaryIcon">▱</div><div><span>Mesas livres</span><strong>{summary.free}</strong><small>{summary.freePercent}% do salão</small></div></div><div className="restaurantSummaryCard bill"><div className="summaryIcon"><ReceiptText size={26} /></div><div><span>Contas solicitadas</span><strong>{summary.bill}</strong><small>{summary.billPercent}% do salão</small></div></div><div className="restaurantSummaryCard revenue"><div className="summaryIcon"><DollarSign size={28} /></div><div><span>Faturamento do salão</span><strong>{formatMoney(summary.revenue)}</strong><small>Hoje</small></div></div></div>
    <div className="tablesGrid restaurantTablesGrid">{tables.map(table => <TableCard table={table} key={table.id} onOpen={openTable} />)}</div>

    {table && <div className="drawerOverlay"><aside className="drawer"><div className="drawerHeader"><div><span className="eyebrow">Comanda aberta</span><h2>Mesa {table.number}</h2></div><button className="iconBtn" onClick={() => setSelected(null)}><X size={22} /></button></div><div className="drawerColumns"><section><h3>Itens da comanda</h3><div className="itemsList">{table.items.length === 0 && <p className="empty">Nenhum item lançado ainda.</p>}{table.items.map((item, index) => <div className="orderItem" key={`${item.id}-${index}-${item.observation}`}><div><strong>{item.name}</strong><span>{item.localSaida === 'bar' ? 'Bar • sai na comanda do cliente' : 'Cozinha/churrasqueira • sai no pedido da cozinha'}</span>{item.observation && <small>Obs: {item.observation}</small>}</div><div className="qty qtyWithCancel"><button className="cancelQtyBtn" onClick={() => askCancelItem(item)}>Cancelar</button><b>{item.qty}</b><button onClick={() => increaseQty(item)}>+</button></div></div>)}</div><div className="billBox"><span>Total da mesa</span><strong>{formatMoney(total)}</strong></div><div className="actionsRow"><button className="secondaryBtn" onClick={sendKitchen}>Enviar para cozinha</button><button className="secondaryBtn" onClick={requestBill}>Solicitar conta</button><button className="dangerBtn" onClick={closeTable}>Fechar mesa</button></div><div className="printPreview"><div className="printTitle"><Printer size={18} /> Impressão configurada</div><strong>Mesa {table.number}</strong><span>Enviar para cozinha: imprime pedido em {kitchenPrinterName}</span><span>Solicitar conta: imprime comanda detalhada em {cashierPrinterName}</span><span>A cozinha recebe só os itens de preparo. O caixa imprime a comanda completa do cliente para conferência.</span>{kitchenItems.length === 0 ? <span>Nenhum item de cozinha para enviar.</span> : kitchenItems.map((item, index) => <span key={`${item.id}-print-${index}`}>{item.qty}x {item.name}{item.observation ? ` — ${item.observation}` : ''}</span>)}</div></section><section><h3>Adicionar pedido</h3><input className="obsInput" value={observation} onChange={e => setObservation(e.target.value)} placeholder="Observação do item. Ex: sem cebola" /><div className="categoryTabs">{categories.map(cat => <button className={activeCategory === cat ? 'active' : ''} onClick={() => setActiveCategory(cat)} key={cat}>{cat}</button>)}</div><div className="productGrid">{filteredProducts.map(product => <button className="productCard" key={product.id} onClick={() => addItem(product)}><strong>{product.name}</strong><span>{formatMoney(product.price)}</span><small>{product.imprimeCozinha ? 'Vai para cozinha' : 'Vai na comanda do caixa'}</small></button>)}</div></section></div></aside></div>}

    {cancelRequest && <div className="authModalOverlay"><form className="authModal" onSubmit={confirmCancelItem}><div className="drawerHeader"><div><span className="eyebrow">Autorização obrigatória</span><h2>Cancelar item</h2></div><button type="button" className="iconBtn" onClick={() => setCancelRequest(null)}><X size={22} /></button></div><p>Para cancelar <strong>{cancelRequest.name}</strong>, informe a senha de autorização.</p><label><span>Senha de autorização</span><input value={cancelPassword} onChange={e => setCancelPassword(e.target.value)} type="password" placeholder="Senha de cancelamento" autoFocus /></label>{cancelError && <div className="loginError">{cancelError}</div>}<div className="actionsRow"><button className="dangerBtn" type="submit">Confirmar cancelamento</button><button className="secondaryBtn" type="button" onClick={() => setCancelRequest(null)}>Voltar</button></div></form></div>}

    {printJob && <div className="printOnly customerBillPrint"><h1>{printJob.title}</h1><p><strong>Destino:</strong> {printJob.printerName}</p><p><strong>Mesa:</strong> {printJob.table.number}</p><p><strong>Data:</strong> {new Date().toLocaleString('pt-BR')}</p><hr />{printJob.items.length === 0 ? <p>Nenhum item para impressão.</p> : printJob.items.map((item, index) => <div className="printLine" key={`${item.id}-${index}`}><span>{item.qty}x {item.name}{item.observation ? ` (${item.observation})` : ''}</span>{printJob.type === 'bill' && <strong>{formatMoney(item.price * item.qty)}</strong>}</div>)}{printJob.type === 'bill' && <><hr /><div className="printTotal"><span>Total</span><strong>{formatMoney(printJob.total)}</strong></div><p className="printFooter">Comanda para conferência do cliente.</p></>} {printJob.type === 'kitchen' && <p className="printFooter">Pedido para preparo. Não precisa atualizar status de preparo no sistema.</p>}</div>}
  </div>
}
