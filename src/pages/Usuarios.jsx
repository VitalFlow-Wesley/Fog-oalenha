import { useMemo, useState } from 'react'
import { AlertTriangle, Building2, CheckCircle2, Eye, EyeOff, KeyRound, Pencil, Plus, Printer, ReceiptText, RefreshCw, Save, Settings, ShieldCheck, Store, Trash2, UserCog, Utensils } from 'lucide-react'

const roleLabel = { admin: 'Administrador', gerente: 'Gerente', garcom: 'Garçom' }
const basePrinters = [
  { id: 'printer1', label: 'Impressora 1', name: 'Caixa' },
  { id: 'printer2', label: 'Impressora 2', name: 'Cozinha' }
]

function normalizeSettings(settings) {
  const printers = settings?.printers?.length ? settings.printers : basePrinters
  const firstPrinter = printers[0]?.id
  const secondPrinter = printers[1]?.id || firstPrinter
  const safePrinterId = value => printers.some(p => p.id === value) ? value : firstPrinter

  return {
    establishmentName: 'Fogão a Lenha',
    cnpj: '',
    phone: '',
    address: '',
    receiptMessage: 'Obrigado pela preferência!\nVolte sempre.',
    printKitchenItems: true,
    printBarItems: false,
    printFullReceipt: true,
    requireCancelPassword: true,
    requireCloseTablePassword: true,
    requireDiscountPassword: true,
    requireReprintPassword: true,
    ...settings,
    printers,
    kitchenPrinterId: safePrinterId(settings?.kitchenPrinterId || secondPrinter),
    cashierPrinterId: safePrinterId(settings?.cashierPrinterId || firstPrinter),
    grillPrinterId: safePrinterId(settings?.grillPrinterId || settings?.kitchenPrinterId || secondPrinter),
    juicePrinterId: safePrinterId(settings?.juicePrinterId || settings?.kitchenPrinterId || secondPrinter),
  }
}

function buildTableConfig(tables) {
  return (tables || []).map((table, index) => ({
    id: table.id || index + 1,
    number: table.number || String(index + 1).padStart(2, '0'),
    displayName: table.displayName || `Mesa ${table.number || String(index + 1).padStart(2, '0')}`,
    active: table.active !== false,
    canJoin: table.canJoin !== false,
  }))
}

function PasswordField({ label, value, onChange, visible, onToggle, placeholder }) {
  return (
    <label className="passwordSettingField">
      <span>{label}</span>
      <div className="passwordInputWrap">
        <input type={visible ? 'text' : 'password'} value={value} placeholder={placeholder} onChange={onChange} />
        <button type="button" onClick={onToggle} aria-label="Mostrar ou ocultar senha">{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button>
      </div>
    </label>
  )
}

export default function Usuarios({ users, setUsers, tables, setTables, currentUser, settings, setSettings }) {
  const [activeTab, setActiveTab] = useState('mesas')
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'garcom' })
  const [tableQty, setTableQty] = useState(tables?.length || 12)
  const [tablePrefix, setTablePrefix] = useState('Mesa')
  const [tableStart, setTableStart] = useState('01')
  const [autoNumberTables, setAutoNumberTables] = useState(true)
  const [allowJoinTables, setAllowJoinTables] = useState(true)
  const [showOnlyActiveTables, setShowOnlyActiveTables] = useState(false)
  const [tableConfigs, setTableConfigs] = useState(() => buildTableConfig(tables))
  const [systemForm, setSystemForm] = useState(normalizeSettings(settings))
  const [cancelForm, setCancelForm] = useState({ managerPassword: '', newPassword: '', confirmPassword: '' })
  const [showPasswords, setShowPasswords] = useState({ manager: false, new: false, confirm: false })
  const [systemMessage, setSystemMessage] = useState('')
  const [cancelMessage, setCancelMessage] = useState('')
  const canManage = currentUser?.role === 'admin'
  const canChangeSensitive = currentUser?.role === 'admin' || currentUser?.role === 'gerente'

  const printerOptions = useMemo(() => systemForm.printers || [], [systemForm.printers])
  const getPrinterName = id => printerOptions.find(p => p.id === id)?.name || 'Não definida'
  const activeTables = tableConfigs.filter(table => table.active)
  const visibleTableConfigs = showOnlyActiveTables ? activeTables : tableConfigs

  const sectorRows = [
    { key: 'caixa', sector: 'Caixa', icon: ReceiptText, printerId: systemForm.cashierPrinterId },
    { key: 'cozinha', sector: 'Cozinha', icon: Printer, printerId: systemForm.kitchenPrinterId },
    { key: 'churrasco', sector: 'Churrasco', icon: Utensils, printerId: systemForm.grillPrinterId },
    { key: 'sucos', sector: 'Sucos', icon: Store, printerId: systemForm.juicePrinterId },
  ]

  const authToggles = [
    ['requireCancelPassword', 'Exigir senha para cancelar item'],
    ['requireCloseTablePassword', 'Exigir senha para fechar mesa'],
    ['requireDiscountPassword', 'Exigir senha para aplicar desconto'],
    ['requireReprintPassword', 'Exigir senha para reimpressão de comanda'],
  ]

  function addUser(e) {
    e.preventDefault()
    if (!canManage || !form.name || !form.username || !form.password) return
    setUsers(prev => [...prev, { id: Date.now(), ...form, active: true }])
    setForm({ name: '', username: '', password: '', role: 'garcom' })
  }

  function generateTableConfigs(qty = tableQty) {
    const quantity = Math.max(1, Math.min(80, Number(qty) || 1))
    const startNumber = Math.max(1, Number(tableStart) || 1)
    const nextConfigs = Array.from({ length: quantity }, (_, index) => {
      const number = String(startNumber + index).padStart(2, '0')
      const previous = tableConfigs[index]
      return {
        id: previous?.id || index + 1,
        number,
        displayName: autoNumberTables ? `${tablePrefix || 'Mesa'} ${number}` : (previous?.displayName || `${tablePrefix || 'Mesa'} ${number}`),
        active: previous?.active !== false,
        canJoin: previous?.canJoin ?? allowJoinTables,
      }
    })
    setTableConfigs(nextConfigs)
    setTableQty(quantity)
    return nextConfigs
  }

  function applyTableQty(configs = tableConfigs) {
    if (!canManage) return
    const source = configs.length ? configs : generateTableConfigs()
    setTables(prev => source.map((config, index) => ({
      ...(prev[index] || {}),
      id: config.id || index + 1,
      number: config.number,
      displayName: config.displayName,
      active: config.active,
      canJoin: config.canJoin,
      status: prev[index]?.status || 'livre',
      guests: prev[index]?.guests || 0,
      openedAt: prev[index]?.openedAt || null,
      items: prev[index]?.items || [],
      kitchenSent: prev[index]?.kitchenSent || false,
      billRequested: prev[index]?.billRequested || false,
    })))
    setSystemMessage('Configurações das mesas salvas com sucesso.')
    setTimeout(() => setSystemMessage(''), 2500)
  }

  function resetTableNumbers() {
    const configs = generateTableConfigs(tableQty)
    applyTableQty(configs)
  }

  function editTableName(id) {
    const table = tableConfigs.find(item => item.id === id)
    const nextName = window.prompt('Nome exibido da mesa:', table?.displayName || '')
    if (!nextName) return
    setTableConfigs(prev => prev.map(item => item.id === id ? { ...item, displayName: nextName } : item))
  }

  function addPrinter() {
    setSystemForm(prev => {
      const nextNumber = prev.printers.length + 1
      return { ...prev, printers: [...prev.printers, { id: `printer-${Date.now()}`, label: `Impressora ${nextNumber}`, name: `Impressora ${nextNumber}` }] }
    })
  }

  function removePrinter(id) {
    setSystemForm(prev => {
      if (prev.printers.length <= 1) return prev
      const printers = prev.printers.filter(p => p.id !== id).map((p, i) => ({ ...p, label: `Impressora ${i + 1}` }))
      const fallback = printers[0].id
      return {
        ...prev,
        printers,
        kitchenPrinterId: prev.kitchenPrinterId === id ? fallback : prev.kitchenPrinterId,
        cashierPrinterId: prev.cashierPrinterId === id ? fallback : prev.cashierPrinterId,
        grillPrinterId: prev.grillPrinterId === id ? fallback : prev.grillPrinterId,
        juicePrinterId: prev.juicePrinterId === id ? fallback : prev.juicePrinterId,
      }
    })
  }

  function saveSystem(e) {
    e?.preventDefault?.()
    if (!canChangeSensitive) return
    const printers = systemForm.printers.map((p, i) => ({ ...p, label: `Impressora ${i + 1}`, name: p.name.trim() || `Impressora ${i + 1}` }))
    setSettings(prev => ({ ...prev, ...systemForm, printers }))
    setSystemForm(prev => ({ ...prev, printers }))
    setSystemMessage('Configurações salvas com sucesso.')
    setTimeout(() => setSystemMessage(''), 2500)
  }

  function restoreDefaults() {
    const defaults = normalizeSettings({ printers: basePrinters })
    setSystemForm(defaults)
    setSystemMessage('Padrões restaurados. Clique em salvar configurações para confirmar.')
  }

  function testPrinter(name) {
    setSystemMessage(`Teste preparado para ${name}. A integração real será ligada na etapa da impressora.`)
    setTimeout(() => setSystemMessage(''), 3000)
  }

  function changeCancelPassword(e) {
    e.preventDefault()
    const authorized = users.find(u => u.active && ['admin', 'gerente'].includes(u.role) && u.password === cancelForm.managerPassword)
    if (!authorized) return setCancelMessage('Senha de administrador ou gerente inválida.')
    if (cancelForm.newPassword.length < 4) return setCancelMessage('A nova senha precisa ter pelo menos 4 caracteres.')
    if (cancelForm.newPassword !== cancelForm.confirmPassword) return setCancelMessage('A confirmação da nova senha não confere.')
    setSettings(prev => ({ ...prev, cancelPassword: cancelForm.newPassword, cancelUpdatedBy: authorized.name }))
    setSystemForm(prev => ({ ...prev, cancelPassword: cancelForm.newPassword, cancelUpdatedBy: authorized.name }))
    setCancelForm({ managerPassword: '', newPassword: '', confirmPassword: '' })
    setCancelMessage(`Senha de cancelamento atualizada por ${authorized.name}.`)
  }

  return <div className="page settingsPremiumPage compactSettingsPage">
    <div className="settingsHeader"><span className="eyebrow settingsEyebrow">CONTROLE DO SISTEMA</span><h1>Configurações</h1><p>Gerencie acessos, mesas, impressões e preferências do sistema.</p></div>
    <div className="settingsTabs"><button className={activeTab === 'colaboradores' ? 'active' : ''} onClick={() => setActiveTab('colaboradores')}>Acessos</button><button className={activeTab === 'mesas' ? 'active' : ''} onClick={() => setActiveTab('mesas')}>Mesas</button><button className={activeTab === 'impressao' ? 'active' : ''} onClick={() => setActiveTab('impressao')}>Impressão</button><button className={activeTab === 'sistema' ? 'active' : ''} onClick={() => setActiveTab('sistema')}>Sistema</button></div>

    {activeTab === 'colaboradores' && <div className="settingsMainGrid">
      {canManage && <section className="settingsPanel"><div className="settingsPanelTitle"><UserCog size={22} /><h2>Adicionar colaborador</h2></div><form className="settingsForm" onSubmit={addUser}><label><span>Nome</span><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label><span>Login</span><input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></label><label><span>Senha</span><input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label><label><span>Função</span><select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="admin">Administrador</option><option value="gerente">Gerente</option><option value="garcom">Garçom</option></select></label><button className="primaryBtn"><Plus size={18} /> Criar acesso</button></form></section>}
      <section className="settingsPanel"><div className="settingsPanelTitle"><UserCog size={22} /><h2>Acessos cadastrados</h2></div><div className="settingsUsersList">{users.map(user => <div className="settingsUserCard" key={user.id}><div className="settingsUserAvatar">{user.name.slice(0, 2).toUpperCase()}</div><div><strong>{user.name}</strong><span>Login: {user.username}</span><small>{roleLabel[user.role]}</small></div>{canManage && user.id !== currentUser?.id && <button className="iconDanger" onClick={() => setUsers(prev => prev.filter(u => u.id !== user.id))}><Trash2 size={18} /></button>}</div>)}</div></section>
    </div>}

    {activeTab === 'mesas' && <div className="tablesSettingsPage">
      <section className="tableSummaryGrid">
        <div className="tableSummaryCard"><Utensils size={22} /><span>Mesas cadastradas</span><strong>{tableConfigs.length}</strong></div>
        <div className="tableSummaryCard positive"><CheckCircle2 size={22} /><span>Mesas ativas</span><strong>{activeTables.length}</strong></div>
        <div className="tableSummaryCard join"><KeyRound size={22} /><span>Juntar mesas</span><strong>{allowJoinTables ? 'Permitido' : 'Desativado'}</strong></div>
      </section>

      <div className="tablesSettingsLayout">
        <div className="tablesLeftColumn">
          <section className="settingsPanel tableConfigPanel">
            <div className="settingsPanelTitle"><ReceiptText size={22} /><h2>Configuração das mesas</h2></div>
            <div className="tableConfigGrid">
              <label><span>Quantidade de mesas do salão</span><input type="number" min="1" max="80" value={tableQty} onChange={e => setTableQty(e.target.value)} /></label>
              <label><span>Prefixo das mesas</span><input value={tablePrefix} onChange={e => setTablePrefix(e.target.value)} /></label>
              <label><span>Numeração inicial</span><input value={tableStart} onChange={e => setTableStart(e.target.value)} /></label>
            </div>
            <div className="tableToggles">
              <label><input type="checkbox" checked={autoNumberTables} onChange={e => setAutoNumberTables(e.target.checked)} /> Gerar numeração automática</label>
              <label><input type="checkbox" checked={allowJoinTables} onChange={e => { setAllowJoinTables(e.target.checked); setTableConfigs(prev => prev.map(table => ({ ...table, canJoin: e.target.checked }))) }} /> Permitir juntar mesas</label>
              <label><input type="checkbox" checked={showOnlyActiveTables} onChange={e => setShowOnlyActiveTables(e.target.checked)} /> Exibir apenas mesas ativas</label>
            </div>
            <div className="tableConfigActions"><button className="primaryBtn" onClick={() => applyTableQty()}><Save size={17} /> Salvar configurações</button><button className="secondaryBtn" onClick={() => generateTableConfigs()}><Plus size={17} /> Gerar mesas</button><button className="secondaryBtn" onClick={resetTableNumbers}><RefreshCw size={17} /> Resetar numeração</button></div>
          </section>

          <section className="settingsPanel tablePreviewPanel">
            <div className="settingsPanelTitle"><Eye size={22} /><h2>Prévia das mesas cadastradas</h2></div>
            <div className="tablePreviewGrid">{visibleTableConfigs.slice(0, 24).map(table => <span className={!table.active ? 'inactive' : ''} key={table.id}><Utensils size={14} /> {table.displayName}</span>)}</div>
          </section>
        </div>

        <section className="settingsPanel registeredTablesPanel">
          <div className="settingsPanelTitle"><Utensils size={22} /><h2>Mesas cadastradas</h2></div>
          <div className="registeredTablesTable">
            <div className="registeredTablesHead"><span>Mesa</span><span>Nome exibido</span><span>Status</span><span>Pode juntar</span><span>Ações</span></div>
            {visibleTableConfigs.slice(0, 8).map(table => <div className="registeredTablesRow" key={table.id}>
              <span>{table.number}</span>
              <strong>{table.displayName}</strong>
              <button type="button" className={`miniStatus ${table.active ? 'active' : 'inactive'}`} onClick={() => setTableConfigs(prev => prev.map(item => item.id === table.id ? { ...item, active: !item.active } : item))}>{table.active ? 'Ativa' : 'Inativa'}</button>
              <button type="button" className={`miniStatus ${table.canJoin ? 'active' : 'blocked'}`} onClick={() => setTableConfigs(prev => prev.map(item => item.id === table.id ? { ...item, canJoin: !item.canJoin } : item))}>{table.canJoin ? 'Sim' : 'Não'}</button>
              <div className="tableRowActions"><button type="button" onClick={() => editTableName(table.id)}><Pencil size={15} /> Editar</button>{tableConfigs.length > 1 && <button type="button" className="dangerOutline" onClick={() => setTableConfigs(prev => prev.filter(item => item.id !== table.id))}><Trash2 size={15} /></button>}</div>
            </div>)}
          </div>
          <div className="tablePaginationHint">Mostrando {Math.min(visibleTableConfigs.length, 8)} de {visibleTableConfigs.length} mesas</div>
        </section>
      </div>

      <div className="tableTipBox"><AlertTriangle size={18} /><span>Dica: organize nomes personalizados para mesas especiais e revise permissões de junção conforme o fluxo do salão.</span></div>
      {systemMessage && <div className="settingsSuccess fullSystemMessage"><CheckCircle2 size={17} /> {systemMessage}</div>}
    </div>}

    {activeTab === 'impressao' && <section className="settingsPanel wideSettingsPanel"><div className="settingsPanelTitle"><Printer size={22} /><h2>Impressão</h2></div><p className="settingsHelpText">As impressoras e regras de saída ficam centralizadas na aba Sistema para evitar configuração duplicada.</p><button className="primaryBtn fit" onClick={() => setActiveTab('sistema')}>Abrir configurações do sistema</button></section>}

    {activeTab === 'sistema' && <div className="systemSettingsGridV2">
      <section className="settingsPanel systemCard establishmentSystemCard"><div className="settingsPanelTitle numberedTitle"><div className="titleBadge"><Building2 size={20} /></div><h2>1. Dados do estabelecimento</h2></div><div className="establishmentGrid"><label><span>Nome do estabelecimento</span><input value={systemForm.establishmentName} onChange={e => setSystemForm({ ...systemForm, establishmentName: e.target.value })} /></label><label><span>CNPJ</span><input value={systemForm.cnpj || ''} placeholder="00.000.000/0000-00" onChange={e => setSystemForm({ ...systemForm, cnpj: e.target.value })} /></label><label><span>Telefone</span><input value={systemForm.phone || ''} placeholder="(00) 00000-0000" onChange={e => setSystemForm({ ...systemForm, phone: e.target.value })} /></label><label className="span2"><span>Endereço</span><textarea value={systemForm.address || ''} placeholder="Rua, número, bairro, cidade" onChange={e => setSystemForm({ ...systemForm, address: e.target.value })} /></label><label className="span2"><span>Mensagem da comanda/cupom</span><textarea maxLength={120} value={systemForm.receiptMessage || ''} onChange={e => setSystemForm({ ...systemForm, receiptMessage: e.target.value })} /></label><small className="receiptCounter">{(systemForm.receiptMessage || '').length}/120</small></div></section>
      <section className="settingsPanel systemCard printersSystemCard"><div className="cardTitleWithAction"><div className="settingsPanelTitle numberedTitle"><div className="titleBadge"><Printer size={20} /></div><h2>2. Impressoras cadastradas</h2></div><button type="button" className="addPrinterBtn solid" onClick={addPrinter}><Plus size={16} /> Adicionar impressora</button></div><div className="printerTable"><div className="printerTableHead"><span>Setor</span><span>Impressora vinculada</span><span>Status</span><span>Ações</span></div>{sectorRows.map(row => { const Icon = row.icon; return <div className="printerTableRow" key={row.key}><span className="sectorName"><Icon size={17} /> {row.sector}</span><strong>{getPrinterName(row.printerId)}</strong><span className="onlineBadge">● Online</span><div className="printerActions"><button type="button" onClick={() => testPrinter(getPrinterName(row.printerId))}><Printer size={15} /> Testar</button><button type="button" aria-label="Editar impressora"><Pencil size={15} /></button><button type="button" aria-label="Excluir impressora" className="dangerOutline" onClick={() => removePrinter(row.printerId)} disabled={systemForm.printers.length <= 1}><Trash2 size={15} /></button></div></div> })}</div></section>
      <section className="settingsPanel systemCard printRulesSystemCard"><div className="settingsPanelTitle numberedTitle"><div className="titleBadge"><Printer size={20} /></div><h2>3. Regras de impressão</h2></div><div className="printRulesGrid"><label><span>Pedidos da cozinha saem em</span><select value={systemForm.kitchenPrinterId} onChange={e => setSystemForm({ ...systemForm, kitchenPrinterId: e.target.value })}>{printerOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label><span>Comanda do cliente sai em</span><select value={systemForm.cashierPrinterId} onChange={e => setSystemForm({ ...systemForm, cashierPrinterId: e.target.value })}>{printerOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label><span>Pedidos do churrasco saem em</span><select value={systemForm.grillPrinterId} onChange={e => setSystemForm({ ...systemForm, grillPrinterId: e.target.value })}>{printerOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label><span>Pedidos dos sucos saem em</span><select value={systemForm.juicePrinterId} onChange={e => setSystemForm({ ...systemForm, juicePrinterId: e.target.value })}>{printerOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div><div className="toggleList"><label><input type="checkbox" checked={systemForm.printKitchenItems} onChange={e => setSystemForm({ ...systemForm, printKitchenItems: e.target.checked })} /><span>Enviar itens de cozinha/churrasco/sucos para preparo</span></label><label><input type="checkbox" checked={systemForm.printBarItems} onChange={e => setSystemForm({ ...systemForm, printBarItems: e.target.checked })} /><span>Enviar itens do bar também para preparo</span></label><label><input type="checkbox" checked={systemForm.printFullReceipt} onChange={e => setSystemForm({ ...systemForm, printFullReceipt: e.target.checked })} /><span>Imprimir comanda completa no caixa</span></label></div><div className="rulesBox"><CheckCircle2 size={18} /><div><strong>Regras atuais</strong><p>Pedidos de preparo são enviados para os setores configurados.</p><p>Comanda do cliente é impressa no caixa para conferência.</p><p>Itens do bar permanecem apenas na comanda do cliente.</p></div></div></section>
      <section className="settingsPanel systemCard securitySystemCard"><div className="settingsPanelTitle numberedTitle"><div className="titleBadge"><ShieldCheck size={20} /></div><h2>4. Segurança e autorizações</h2></div><div className="securityGrid"><form className="securityPasswordBox" onSubmit={changeCancelPassword}><h3>Senha de cancelamento</h3><PasswordField label="Senha atual do administrador ou gerente" value={cancelForm.managerPassword} visible={showPasswords.manager} onToggle={() => setShowPasswords(prev => ({ ...prev, manager: !prev.manager }))} onChange={e => setCancelForm({ ...cancelForm, managerPassword: e.target.value })} /><PasswordField label="Nova senha de cancelamento" value={cancelForm.newPassword} visible={showPasswords.new} onToggle={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))} onChange={e => setCancelForm({ ...cancelForm, newPassword: e.target.value })} /><PasswordField label="Confirmar nova senha" value={cancelForm.confirmPassword} visible={showPasswords.confirm} onToggle={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))} onChange={e => setCancelForm({ ...cancelForm, confirmPassword: e.target.value })} /><button className="primaryBtn"><KeyRound size={18} /> Salvar nova senha</button><p>Essa senha será exigida ao cancelar itens ou executar ações protegidas.</p></form><div className="authorizationBox"><h3>Autorizações que exigem senha</h3>{authToggles.map(([key, label]) => <label className="switchRow" key={key}><button type="button" className={`fakeSwitch ${systemForm[key] ? 'active' : ''}`} onClick={() => setSystemForm(prev => ({ ...prev, [key]: !prev[key] }))}><span /></button><strong>{label}</strong></label>)}</div></div>{cancelMessage && <div className={cancelMessage.includes('atualizada') ? 'settingsSuccess' : 'settingsError'}>{cancelMessage.includes('atualizada') ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}{cancelMessage}</div>}</section>
      <div className="systemFooterActions"><button type="button" className="secondaryBtn" onClick={restoreDefaults}><RefreshCw size={17} /> Restaurar padrões</button><button type="button" className="primaryBtn" disabled={!canChangeSensitive} onClick={saveSystem}><Save size={18} /> Salvar configurações</button></div>{systemMessage && <div className="settingsSuccess fullSystemMessage"><CheckCircle2 size={17} /> {systemMessage}</div>}
    </div>}
  </div>
}
