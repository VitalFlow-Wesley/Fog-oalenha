import { useState } from 'react'
import { Plus, Settings, Trash2, UserCog, Utensils, ReceiptText, Printer, KeyRound, Save, CheckCircle2, AlertTriangle } from 'lucide-react'

const roleLabel = { admin: 'Administrador', gerente: 'Gerente', garcom: 'Garçom' }
const basePrinters = [{ id: 'printer1', label: 'Impressora 1', name: 'Caixa' }, { id: 'printer2', label: 'Impressora 2', name: 'Cozinha' }]

function normalizeSettings(settings) {
  const printers = settings?.printers?.length ? settings.printers : basePrinters
  return {
    ...settings,
    printers,
    kitchenPrinterId: printers.some(p => p.id === settings?.kitchenPrinterId) ? settings.kitchenPrinterId : printers[1]?.id || printers[0]?.id,
    cashierPrinterId: printers.some(p => p.id === settings?.cashierPrinterId) ? settings.cashierPrinterId : printers[0]?.id,
  }
}

export default function Usuarios({ users, setUsers, tables, setTables, currentUser, settings, setSettings }) {
  const [activeTab, setActiveTab] = useState('colaboradores')
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'garcom' })
  const [tableQty, setTableQty] = useState(tables?.length || 12)
  const [systemForm, setSystemForm] = useState(normalizeSettings(settings))
  const [cancelForm, setCancelForm] = useState({ managerPassword: '', newPassword: '', confirmPassword: '' })
  const [systemMessage, setSystemMessage] = useState('')
  const [cancelMessage, setCancelMessage] = useState('')
  const canManage = currentUser?.role === 'admin'
  const canChangeSensitive = currentUser?.role === 'admin' || currentUser?.role === 'gerente'

  function addUser(e) {
    e.preventDefault()
    if (!canManage || !form.name || !form.username || !form.password) return
    setUsers(prev => [...prev, { id: Date.now(), ...form, active: true }])
    setForm({ name: '', username: '', password: '', role: 'garcom' })
  }

  function applyTableQty() {
    if (!canManage) return
    const qty = Math.max(1, Math.min(80, Number(tableQty) || 1))
    setTables(prev => Array.from({ length: qty }, (_, index) => prev[index] || { id: index + 1, number: String(index + 1).padStart(2, '0'), status: 'livre', guests: 0, openedAt: null, items: [], kitchenSent: false, billRequested: false }))
  }

  function addPrinter() {
    setSystemForm(prev => ({ ...prev, printers: [...prev.printers, { id: `printer-${Date.now()}`, label: `Impressora ${prev.printers.length + 1}`, name: `Impressora ${prev.printers.length + 1}` }] }))
  }

  function removePrinter(id) {
    setSystemForm(prev => {
      if (prev.printers.length <= 1) return prev
      const printers = prev.printers.filter(p => p.id !== id).map((p, i) => ({ ...p, label: `Impressora ${i + 1}` }))
      return { ...prev, printers, kitchenPrinterId: prev.kitchenPrinterId === id ? printers[0].id : prev.kitchenPrinterId, cashierPrinterId: prev.cashierPrinterId === id ? printers[0].id : prev.cashierPrinterId }
    })
  }

  function saveSystem(e) {
    e.preventDefault()
    if (!canChangeSensitive) return
    const printers = systemForm.printers.map((p, i) => ({ ...p, label: `Impressora ${i + 1}`, name: p.name.trim() || `Impressora ${i + 1}` }))
    setSettings(prev => ({ ...prev, ...systemForm, printers }))
    setSystemForm(prev => ({ ...prev, printers }))
    setSystemMessage('Configurações salvas com sucesso.')
    setTimeout(() => setSystemMessage(''), 2500)
  }

  function changeCancelPassword(e) {
    e.preventDefault()
    const authorized = users.find(u => u.active && ['admin', 'gerente'].includes(u.role) && u.password === cancelForm.managerPassword)
    if (!authorized) return setCancelMessage('Senha de administrador ou gerente inválida.')
    if (cancelForm.newPassword.length < 4) return setCancelMessage('A nova senha precisa ter pelo menos 4 caracteres.')
    if (cancelForm.newPassword !== cancelForm.confirmPassword) return setCancelMessage('A confirmação da nova senha não confere.')
    setSettings(prev => ({ ...prev, cancelPassword: cancelForm.newPassword, cancelUpdatedBy: authorized.name }))
    setCancelForm({ managerPassword: '', newPassword: '', confirmPassword: '' })
    setCancelMessage(`Senha de cancelamento atualizada por ${authorized.name}.`)
  }

  const kitchenPrinter = systemForm.printers.find(p => p.id === systemForm.kitchenPrinterId)
  const cashierPrinter = systemForm.printers.find(p => p.id === systemForm.cashierPrinterId)
  const cards = [
    [UserCog, 'Colaboradores', 'Crie login e senha para administrador, gerente e garçom.'],
    [Utensils, 'Mesas do salão', 'Defina quantas mesas vão aparecer no atendimento.'],
    [KeyRound, 'Cancelamento', 'Altere a senha de cancelamento com autorização.'],
    [Printer, 'Impressoras', 'Separe pedidos da cozinha e comanda do cliente.'],
  ]

  return <div className="page settingsPremiumPage">
    <div className="settingsHeader"><span className="eyebrow settingsEyebrow">CONTROLE DO SISTEMA</span><h1>Configurações</h1><p>Gerencie colaboradores, mesas, permissões e preferências do Fogão a Lenha.</p></div>
    <div className="settingsCardsGrid">{cards.map(([Icon, title, text]) => <section className="settingsMiniCard" key={title}><div><Icon size={20} /></div><strong>{title}</strong><span>{text}</span></section>)}</div>
    <div className="settingsTabs"><button className={activeTab === 'colaboradores' ? 'active' : ''} onClick={() => setActiveTab('colaboradores')}>Colaboradores</button><button className={activeTab === 'mesas' ? 'active' : ''} onClick={() => setActiveTab('mesas')}>Mesas</button><button className={activeTab === 'sistema' ? 'active' : ''} onClick={() => setActiveTab('sistema')}>Sistema</button></div>

    {activeTab === 'colaboradores' && <div className="settingsMainGrid">
      {canManage && <section className="settingsPanel"><div className="settingsPanelTitle"><UserCog size={22} /><h2>Adicionar colaborador</h2></div><form className="settingsForm" onSubmit={addUser}><label><span>Nome</span><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label><span>Login</span><input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></label><label><span>Senha</span><input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label><label><span>Função</span><select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="admin">Administrador</option><option value="gerente">Gerente</option><option value="garcom">Garçom</option></select></label><button className="primaryBtn"><Plus size={18} /> Criar acesso</button></form></section>}
      <section className="settingsPanel"><div className="settingsPanelTitle"><UserCog size={22} /><h2>Acessos cadastrados</h2></div><div className="settingsUsersList">{users.map(user => <div className="settingsUserCard" key={user.id}><div className="settingsUserAvatar">{user.name.slice(0, 2).toUpperCase()}</div><div><strong>{user.name}</strong><span>Login: {user.username}</span><small>{roleLabel[user.role]}</small></div>{canManage && user.id !== currentUser?.id && <button className="iconDanger" onClick={() => setUsers(prev => prev.filter(u => u.id !== user.id))}><Trash2 size={18} /></button>}</div>)}</div></section>
    </div>}

    {activeTab === 'mesas' && <section className="settingsPanel wideSettingsPanel"><div className="settingsPanelTitle"><ReceiptText size={22} /><h2>Configuração das mesas</h2></div><div className="tableSettingsGrid"><label><span>Quantidade de mesas do salão</span><input type="number" min="1" max="80" value={tableQty} onChange={e => setTableQty(e.target.value)} /></label><div className="tableSettingsPreview"><strong>{tables.length}</strong><span>mesas cadastradas agora</span></div><button className="primaryBtn fit" onClick={applyTableQty}>Salvar mesas</button></div></section>}

    {activeTab === 'sistema' && <div className="systemSettingsStack"><section className="settingsPanel wideSettingsPanel"><div className="settingsPanelTitle"><Settings size={22} /><h2>Dados e impressoras</h2></div><form className="systemSettingsForm printerDynamicForm" onSubmit={saveSystem}><label className="establishmentField"><span>Nome do estabelecimento</span><input value={systemForm.establishmentName} onChange={e => setSystemForm({ ...systemForm, establishmentName: e.target.value })} /></label><div className="printerListEditor"><div className="printerListHeader"><strong>Impressoras cadastradas</strong><button type="button" className="addPrinterBtn" onClick={addPrinter}><Plus size={16} /> Adicionar impressora</button></div>{systemForm.printers.map((printer, index) => <div className="printerEditorRow" key={printer.id}><span>Impressora {index + 1}</span><input value={printer.name} onChange={e => setSystemForm(prev => ({ ...prev, printers: prev.printers.map(p => p.id === printer.id ? { ...p, name: e.target.value } : p) }))} /><button type="button" className="iconDanger" onClick={() => removePrinter(printer.id)} disabled={systemForm.printers.length <= 1}><Trash2 size={17} /></button></div>)}</div><label><span>Pedidos da cozinha saem em</span><select value={systemForm.kitchenPrinterId} onChange={e => setSystemForm({ ...systemForm, kitchenPrinterId: e.target.value })}>{systemForm.printers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label><span>Comanda do cliente sai em</span><select value={systemForm.cashierPrinterId} onChange={e => setSystemForm({ ...systemForm, cashierPrinterId: e.target.value })}>{systemForm.printers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><div className="printerRolePreview"><div><Printer size={20} /><strong>Pedidos para preparo</strong><span>{kitchenPrinter?.name}</span><small>Cozinha/churrasco/sucos</small></div><div><ReceiptText size={20} /><strong>Comanda para conferência</strong><span>{cashierPrinter?.name}</span><small>Conta completa do cliente</small></div></div><div className="printChecks"><label><input type="checkbox" checked={systemForm.printKitchenItems} onChange={e => setSystemForm({ ...systemForm, printKitchenItems: e.target.checked })} /> Enviar itens de cozinha/churrasco/sucos para preparo</label><label><input type="checkbox" checked={systemForm.printBarItems} onChange={e => setSystemForm({ ...systemForm, printBarItems: e.target.checked })} /> Enviar itens do bar também para preparo</label></div><button className="primaryBtn fit" disabled={!canChangeSensitive}><Save size={18} /> Salvar configurações</button></form>{systemMessage && <div className="settingsSuccess"><CheckCircle2 size={17} /> {systemMessage}</div>}</section><section className="settingsPanel wideSettingsPanel"><div className="settingsPanelTitle"><KeyRound size={22} /><h2>Senha de cancelamento</h2></div><form className="systemSettingsForm cancelPasswordForm" onSubmit={changeCancelPassword}><label><span>Senha do administrador ou gerente</span><input type="password" value={cancelForm.managerPassword} onChange={e => setCancelForm({ ...cancelForm, managerPassword: e.target.value })} /></label><label><span>Nova senha de cancelamento</span><input type="password" value={cancelForm.newPassword} onChange={e => setCancelForm({ ...cancelForm, newPassword: e.target.value })} /></label><label><span>Confirmar nova senha</span><input type="password" value={cancelForm.confirmPassword} onChange={e => setCancelForm({ ...cancelForm, confirmPassword: e.target.value })} /></label><button className="primaryBtn fit"><KeyRound size={18} /> Alterar senha</button></form>{cancelMessage && <div className={cancelMessage.includes('atualizada') ? 'settingsSuccess' : 'settingsError'}>{cancelMessage.includes('atualizada') ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}{cancelMessage}</div>}</section></div>}
  </div>
}
