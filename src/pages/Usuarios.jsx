import { useState } from 'react'
import { Plus, Settings, ShieldCheck, Trash2, UserCog, Utensils, ReceiptText, Printer, KeyRound, Save, CheckCircle2, AlertTriangle } from 'lucide-react'

const roleLabel = {
  admin: 'Administrador',
  gerente: 'Gerente',
  garcom: 'Garçom'
}

function normalizeSettings(settings) {
  const fallbackPrinters = [
    { id: 'printer1', label: 'Impressora 1', name: settings?.printerCashier || 'Caixa' },
    { id: 'printer2', label: 'Impressora 2', name: settings?.printerKitchen || 'Cozinha' }
  ]

  const printers = settings?.printers?.length ? settings.printers : fallbackPrinters
  const activePrinterId = printers.some(printer => printer.id === settings?.activePrinterId)
    ? settings.activePrinterId
    : printers[0]?.id || ''

  return {
    ...settings,
    printers,
    activePrinterId
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

  function handleSubmit(event) {
    event.preventDefault()
    if (!canManage) return
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) return

    setUsers(prev => [...prev, {
      id: Date.now(),
      name: form.name.trim(),
      username: form.username.trim(),
      password: form.password.trim(),
      role: form.role,
      active: true
    }])
    setForm({ name: '', username: '', password: '', role: 'garcom' })
  }

  function removeUser(id) {
    if (!canManage || id === currentUser?.id) return
    setUsers(prev => prev.filter(user => user.id !== id))
  }

  function applyTableQty() {
    if (!canManage) return
    const qty = Math.max(1, Math.min(80, Number(tableQty) || 1))
    setTables(prev => Array.from({ length: qty }, (_, index) => {
      const current = prev[index]
      return current || {
        id: index + 1,
        number: String(index + 1).padStart(2, '0'),
        status: 'livre',
        guests: 0,
        openedAt: null,
        items: [],
        kitchenSent: false,
        billRequested: false
      }
    }))
  }

  function updatePrinterName(id, name) {
    setSystemForm(prev => ({
      ...prev,
      printers: prev.printers.map(printer => printer.id === id ? { ...printer, name } : printer)
    }))
  }

  function addPrinter() {
    setSystemForm(prev => {
      const nextNumber = prev.printers.length + 1
      const newPrinter = {
        id: `printer-${Date.now()}`,
        label: `Impressora ${nextNumber}`,
        name: `Impressora ${nextNumber}`
      }
      return {
        ...prev,
        printers: [...prev.printers, newPrinter],
        activePrinterId: prev.activePrinterId || newPrinter.id
      }
    })
  }

  function removePrinter(id) {
    setSystemForm(prev => {
      if (prev.printers.length <= 1) return prev
      const nextPrinters = prev.printers.filter(printer => printer.id !== id)
      const activePrinterId = prev.activePrinterId === id ? nextPrinters[0]?.id || '' : prev.activePrinterId
      return {
        ...prev,
        printers: nextPrinters.map((printer, index) => ({ ...printer, label: `Impressora ${index + 1}` })),
        activePrinterId
      }
    })
  }

  function saveSystemSettings(event) {
    event.preventDefault()
    if (!canChangeSensitive) return

    const cleanedPrinters = systemForm.printers
      .map((printer, index) => ({
        ...printer,
        label: `Impressora ${index + 1}`,
        name: printer.name.trim() || `Impressora ${index + 1}`
      }))

    const activePrinterId = cleanedPrinters.some(printer => printer.id === systemForm.activePrinterId)
      ? systemForm.activePrinterId
      : cleanedPrinters[0]?.id || ''

    setSettings(prev => ({
      ...prev,
      ...systemForm,
      printers: cleanedPrinters,
      activePrinterId
    }))
    setSystemForm(prev => ({ ...prev, printers: cleanedPrinters, activePrinterId }))
    setSystemMessage('Configurações do sistema salvas com sucesso.')
    setTimeout(() => setSystemMessage(''), 3000)
  }

  function changeCancelPassword(event) {
    event.preventDefault()
    setCancelMessage('')
    if (!canChangeSensitive) return

    const authorizedUser = users.find(user => user.active && ['admin', 'gerente'].includes(user.role) && user.password === cancelForm.managerPassword)

    if (!authorizedUser) {
      setCancelMessage('Senha de administrador ou gerente inválida.')
      return
    }

    if (!cancelForm.newPassword.trim() || cancelForm.newPassword.length < 4) {
      setCancelMessage('A nova senha de cancelamento precisa ter pelo menos 4 caracteres.')
      return
    }

    if (cancelForm.newPassword !== cancelForm.confirmPassword) {
      setCancelMessage('A confirmação da nova senha não confere.')
      return
    }

    setSettings(prev => ({ ...prev, cancelPassword: cancelForm.newPassword, cancelUpdatedBy: authorizedUser.name }))
    setCancelForm({ managerPassword: '', newPassword: '', confirmPassword: '' })
    setCancelMessage(`Senha de cancelamento atualizada por ${authorizedUser.name}.`)
  }

  const activePrinter = systemForm.printers.find(printer => printer.id === systemForm.activePrinterId)

  const settingsCards = [
    { icon: UserCog, title: 'Colaboradores', text: 'Crie login e senha para administrador, gerente e garçom.' },
    { icon: Utensils, title: 'Mesas do salão', text: 'Defina quantas mesas vão aparecer no mapa de atendimento.' },
    { icon: KeyRound, title: 'Cancelamento', text: 'Altere a senha de cancelamento com autorização de admin ou gerente.' },
    { icon: Printer, title: 'Impressoras', text: 'Adicione, renomeie ou exclua impressoras do sistema.' },
  ]

  return (
    <div className="page settingsPremiumPage">
      <div className="settingsHeader">
        <div>
          <span className="eyebrow settingsEyebrow">CONTROLE DO SISTEMA</span>
          <h1>Configurações</h1>
          <p>Gerencie colaboradores, mesas, permissões e preferências do Fogão a Lenha.</p>
        </div>
      </div>

      {!canChangeSensitive && (
        <section className="settingsBlockedCard"><ShieldCheck size={24} /><div><strong>Acesso restrito</strong><span>Somente administrador ou gerente podem alterar as configurações do sistema.</span></div></section>
      )}

      <div className="settingsCardsGrid">
        {settingsCards.map(card => {
          const Icon = card.icon
          return <section className="settingsMiniCard" key={card.title}><div><Icon size={20} /></div><strong>{card.title}</strong><span>{card.text}</span></section>
        })}
      </div>

      <div className="settingsTabs">
        <button className={activeTab === 'colaboradores' ? 'active' : ''} onClick={() => setActiveTab('colaboradores')}>Colaboradores</button>
        <button className={activeTab === 'mesas' ? 'active' : ''} onClick={() => setActiveTab('mesas')}>Mesas</button>
        <button className={activeTab === 'sistema' ? 'active' : ''} onClick={() => setActiveTab('sistema')}>Sistema</button>
      </div>

      {activeTab === 'colaboradores' && (
        <div className="settingsMainGrid">
          {canManage && (
            <section className="settingsPanel">
              <div className="settingsPanelTitle"><UserCog size={22} /><h2>Adicionar colaborador</h2></div>
              <form className="settingsForm" onSubmit={handleSubmit}>
                <label><span>Nome do colaborador</span><input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Ex: João Silva" /></label>
                <label><span>Login</span><input value={form.username} onChange={event => setForm({ ...form, username: event.target.value })} placeholder="Ex: joao" /></label>
                <label><span>Senha</span><input value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} placeholder="Ex: 123456" /></label>
                <label><span>Função</span><select value={form.role} onChange={event => setForm({ ...form, role: event.target.value })}><option value="admin">Administrador</option><option value="gerente">Gerente</option><option value="garcom">Garçom</option></select></label>
                <button className="primaryBtn" type="submit"><Plus size={18} /> Criar acesso</button>
              </form>
            </section>
          )}

          <section className="settingsPanel">
            <div className="settingsPanelTitle"><ShieldCheck size={22} /><h2>Acessos cadastrados</h2></div>
            <div className="settingsUsersList">
              {users.map(user => <div className="settingsUserCard" key={user.id}><div className="settingsUserAvatar">{user.name.slice(0, 2).toUpperCase()}</div><div><strong>{user.name}</strong><span>Login: {user.username}</span><small>{roleLabel[user.role]}</small></div>{canManage && user.id !== currentUser?.id && <button className="iconDanger" onClick={() => removeUser(user.id)} title="Remover usuário"><Trash2 size={18} /></button>}</div>)}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'mesas' && (
        <section className="settingsPanel wideSettingsPanel">
          <div className="settingsPanelTitle"><ReceiptText size={22} /><h2>Configuração das mesas</h2></div>
          <div className="tableSettingsGrid">
            <label><span>Quantidade de mesas do salão</span><input type="number" min="1" max="80" value={tableQty} onChange={event => setTableQty(event.target.value)} /></label>
            <div className="tableSettingsPreview"><strong>{tables.length}</strong><span>mesas cadastradas agora</span></div>
            <button className="primaryBtn fit" type="button" onClick={applyTableQty} disabled={!canManage}>Salvar mesas</button>
          </div>
          <div className="settingsNotice"><Utensils size={18} /> Ao aumentar mesas, novas mesas entram como livres. Ao diminuir, as últimas mesas são removidas da visualização.</div>
        </section>
      )}

      {activeTab === 'sistema' && (
        <div className="systemSettingsStack">
          <section className="settingsPanel wideSettingsPanel">
            <div className="settingsPanelTitle"><Settings size={22} /><h2>Dados e impressoras</h2></div>
            <form className="systemSettingsForm printerDynamicForm" onSubmit={saveSystemSettings}>
              <label className="establishmentField"><span>Nome do estabelecimento</span><input value={systemForm.establishmentName} onChange={event => setSystemForm({ ...systemForm, establishmentName: event.target.value })} placeholder="Nome do restaurante" /></label>

              <div className="printerListEditor">
                <div className="printerListHeader"><strong>Impressoras cadastradas</strong><button type="button" className="addPrinterBtn" onClick={addPrinter}><Plus size={16} /> Adicionar impressora</button></div>
                {systemForm.printers.map((printer, index) => (
                  <div className="printerEditorRow" key={printer.id}>
                    <span>{`Impressora ${index + 1}`}</span>
                    <input value={printer.name} onChange={event => updatePrinterName(printer.id, event.target.value)} placeholder={`Nome da impressora ${index + 1}`} />
                    <button type="button" className="iconDanger" onClick={() => removePrinter(printer.id)} disabled={systemForm.printers.length <= 1} title="Excluir impressora"><Trash2 size={17} /></button>
                  </div>
                ))}
              </div>

              <label><span>Impressora ativa para pedidos</span><select value={systemForm.activePrinterId} onChange={event => setSystemForm({ ...systemForm, activePrinterId: event.target.value })}>{systemForm.printers.map(printer => <option key={printer.id} value={printer.id}>{printer.name || printer.label}</option>)}</select></label>

              <div className="activePrinterPreview"><Printer size={20} /><div><strong>Impressora ativa</strong><span>{activePrinter?.name || activePrinter?.label || 'Nenhuma impressora selecionada'}</span></div></div>

              <div className="printChecks"><label><input type="checkbox" checked={systemForm.printKitchenItems} onChange={event => setSystemForm({ ...systemForm, printKitchenItems: event.target.checked })} /> Imprimir cozinha/churrasco/sucos</label><label><input type="checkbox" checked={systemForm.printBarItems} onChange={event => setSystemForm({ ...systemForm, printBarItems: event.target.checked })} /> Imprimir itens do bar também</label></div>

              <button className="primaryBtn fit" type="submit" disabled={!canChangeSensitive}><Save size={18} /> Salvar configurações</button>
            </form>
            {systemMessage && <div className="settingsSuccess"><CheckCircle2 size={17} /> {systemMessage}</div>}
          </section>

          <section className="settingsPanel wideSettingsPanel">
            <div className="settingsPanelTitle"><KeyRound size={22} /><h2>Senha de cancelamento</h2></div>
            <form className="systemSettingsForm cancelPasswordForm" onSubmit={changeCancelPassword}>
              <label><span>Senha do administrador ou gerente</span><input type="password" value={cancelForm.managerPassword} onChange={event => setCancelForm({ ...cancelForm, managerPassword: event.target.value })} placeholder="Confirme sua autorização" /></label>
              <label><span>Nova senha de cancelamento</span><input type="password" value={cancelForm.newPassword} onChange={event => setCancelForm({ ...cancelForm, newPassword: event.target.value })} placeholder="Nova senha" /></label>
              <label><span>Confirmar nova senha</span><input type="password" value={cancelForm.confirmPassword} onChange={event => setCancelForm({ ...cancelForm, confirmPassword: event.target.value })} placeholder="Repita a nova senha" /></label>
              <button className="primaryBtn fit" type="submit" disabled={!canChangeSensitive}><KeyRound size={18} /> Alterar senha</button>
            </form>
            {cancelMessage && <div className={cancelMessage.includes('atualizada') ? 'settingsSuccess' : 'settingsError'}>{cancelMessage.includes('atualizada') ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}{cancelMessage}</div>}
            <div className="settingsNotice"><ShieldCheck size={18} /> A senha de cancelamento atual foi definida por: {settings?.cancelUpdatedBy || 'Sistema'}.</div>
          </section>
        </div>
      )}
    </div>
  )
}
