import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Building2, CheckCircle2, Eye, EyeOff, KeyRound, Pencil, Plus, Printer, ReceiptText, RefreshCw, Save, Search, Settings, ShieldCheck, Store, Trash2, UserCog, Utensils, X } from 'lucide-react'
import { repairData, repairText } from '../text-normalizer.js'

const roleLabel = { admin: 'Administrador', gerente: 'Gerente', garcom: 'Garçom' }
const basePrinters = []
const seededPrinterNames = ['Impressora Caixa', 'Impressora Cozinha', 'Impressora Churrasco', 'Impressora Sucos', 'Caixa', 'Cozinha']

const productCategories = ['Refeições', 'Churrasco', 'Sucos', 'Bebidas', 'Bombons', 'Salgadinhos', 'Sorvetes', 'Sobremesas', 'Outros']
const productSectors = ['Cozinha', 'Churrasco', 'Sucos', 'Bar / Caixa']
const productCategoryOptions = productCategories.includes('Petiscos')
  ? productCategories
  : [...productCategories.slice(0, 2), 'Petiscos', ...productCategories.slice(2)]
const noPrepareCategories = ['Bebidas', 'Bombons', 'Salgadinhos', 'Sorvetes', 'Sobremesas']
const PRODUCTS_KEY = 'fogao-products-v1'
const PRODUCT_SETTINGS_KEY = 'fogao-a-lenha-products-settings'
const PERMISSIONS_KEY = 'fogao-role-permissions-v1'
const defaultPermissions = {
  admin: ['Lançar pedidos', 'Solicitar conta', 'Cancelar itens', 'Fechar mesa', 'Ver relatórios', 'Gerenciar usuários'],
  gerente: ['Lançar pedidos', 'Solicitar conta', 'Cancelar itens', 'Fechar mesa', 'Ver relatórios', 'Gerenciar usuários'],
  garcom: ['Lançar pedidos', 'Solicitar conta'],
}
const initialProducts = [
  { id: 1, name: 'Galinha caipira', category: 'Refeições', sector: 'Cozinha', price: 55, prepare: true, status: 'Ativo' },
  { id: 2, name: 'Picanha', category: 'Churrasco', sector: 'Churrasco', price: 85, prepare: true, status: 'Ativo' },
  { id: 3, name: 'Suco de cajá', category: 'Sucos', sector: 'Sucos', price: 8, prepare: true, status: 'Ativo' },
  { id: 4, name: 'Coca-Cola 600ml', category: 'Bebidas', sector: 'Bar / Caixa', price: 9, prepare: false, status: 'Ativo' },
  { id: 5, name: 'Água mineral 500ml', category: 'Bebidas', sector: 'Bar / Caixa', price: 5, prepare: false, status: 'Ativo' },
  { id: 6, name: 'Batata frita', category: 'Refeições', sector: 'Cozinha', price: 25, prepare: true, status: 'Ativo' },
  { id: 7, name: 'Salgadinho de queijo', category: 'Salgadinhos', sector: 'Bar / Caixa', price: 12, prepare: false, status: 'Ativo' },
]

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? repairData(JSON.parse(raw)) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Mantem a tela funcionando mesmo se o armazenamento local falhar.
  }
}

function normalizeProduct(product) {
  const fixedProduct = repairData(product)
  const category = fixedProduct.category === 'Churrascos' ? 'Churrasco' : (fixedProduct.category || 'Outros')
  const sector = fixedProduct.sector || fixedProduct.localSaida || inferProductConfig(category).sector
  const prepare = fixedProduct.prepare ?? fixedProduct.imprimeCozinha ?? !noPrepareCategories.includes(category)
  return {
    ...fixedProduct,
    name: repairText(fixedProduct.name || 'Produto'),
    category,
    sector,
    localSaida: fixedProduct.localSaida || sector,
    prepare,
    imprimeCozinha: prepare,
    status: fixedProduct.status || 'Ativo',
  }
}

function loadProducts() {
  const saved = readJson(PRODUCTS_KEY, null) || readJson(PRODUCT_SETTINGS_KEY, null)
  return Array.isArray(saved) && saved.length ? saved.map(normalizeProduct) : initialProducts.map(normalizeProduct)
}

function loadPermissions() {
  const saved = readJson(PERMISSIONS_KEY, {})
  return { ...defaultPermissions, ...saved }
}

function normalizeSettings(settings) {
  const rawPrinters = Array.isArray(settings?.printers) ? settings.printers : basePrinters
  const onlySeededPrinters = rawPrinters.length > 0 && rawPrinters.every(printer => seededPrinterNames.includes(printer?.name))
  const printers = onlySeededPrinters ? [] : rawPrinters.filter(Boolean)
  const safePrinterId = value => printers.some(p => p.id === value) ? value : ''
  return {
    establishmentName: 'Fogão a Lenha',
    cnpj: '12.345.678/0001-90',
    phone: '',
    address: '',
    receiptMessage: 'Obrigado pela preferência!\nVolte sempre.',
    printKitchenItems: true,
    printFullReceipt: true,
    allowReprint: true,
    printBarItems: false,
    requireCancelPassword: true,
    requireCloseTablePassword: true,
    requireDiscountPassword: true,
    requireReprintPassword: true,
    ...settings,
    printers,
    cashierPrinterId: safePrinterId(settings?.cashierPrinterId),
    kitchenPrinterId: safePrinterId(settings?.kitchenPrinterId),
    grillPrinterId: safePrinterId(settings?.grillPrinterId),
    juicePrinterId: safePrinterId(settings?.juicePrinterId),
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
  return <label className="passwordSettingField"><span>{label}</span><div className="passwordInputWrap"><input type={visible ? 'text' : 'password'} value={value} placeholder={placeholder} onChange={onChange} /><button type="button" onClick={onToggle} aria-label="Mostrar ou ocultar senha">{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
}

function ActiveToggle({ active, onClick }) {
  return <button type="button" className={`printToggle ${active ? 'active' : ''}`} onClick={onClick}><span /></button>
}

function formatMoney(value) {
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`
}

function parsePrice(value) {
  return Number(String(value || '0').replace(/[^0-9,.-]/g, '').replace(',', '.')) || 0
}

function inferProductConfig(category) {
  const prepare = !noPrepareCategories.includes(category)
  if (category === 'Churrasco') return { prepare: true, sector: 'Churrasco' }
  if (category === 'Sucos') return { prepare: true, sector: 'Sucos' }
  if (prepare) return { prepare: true, sector: 'Cozinha' }
  return { prepare: false, sector: 'Bar / Caixa' }
}

function ProductSectorIcon({ sector }) {
  if (sector === 'Cozinha') return <Printer size={15} />
  if (sector === 'Churrasco') return <Utensils size={15} />
  if (sector === 'Sucos') return <Store size={15} />
  return <ReceiptText size={15} />
}

export default function Usuarios({ users, setUsers, tables, setTables, currentUser, settings, setSettings }) {
  const [activeTab, setActiveTab] = useState('colaboradores')
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'garcom' })
  const [tableQty, setTableQty] = useState(tables?.length || 12)
  const [tablePrefix, setTablePrefix] = useState('Mesa')
  const [tableStart, setTableStart] = useState('01')
  const [autoNumberTables, setAutoNumberTables] = useState(true)
  const [allowJoinTables, setAllowJoinTables] = useState(true)
  const [showOnlyActiveTables, setShowOnlyActiveTables] = useState(false)
  const [tableConfigs, setTableConfigs] = useState(() => buildTableConfig(tables))
  
  const [systemForm, setSystemForm] = useState(() => {
    try {
      const saved = localStorage.getItem('fogao-a-lenha-system-settings-v1')
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error("Erro ao ler estado das impressoras:", e)
    }
    return normalizeSettings(settings)
  })

  const [cancelForm, setCancelForm] = useState({ managerPassword: '', newPassword: '', confirmPassword: '' })
  const [showPasswords, setShowPasswords] = useState({ manager: false, new: false, confirm: false, form: false })
  const [systemMessage, setSystemMessage] = useState('')
  const [cancelMessage, setCancelMessage] = useState('')
  const [products, setProducts] = useState(loadProducts)
  const [productForm, setProductForm] = useState({ name: '', category: '', sector: '', price: '', prepare: '', status: 'Ativo' })
  const [productSearch, setProductSearch] = useState('')
  const [productStatusFilter, setProductStatusFilter] = useState('Todos os status')
  const [productPage, setProductPage] = useState(1)
  const [editingProduct, setEditingProduct] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)
  const [permissionsOpen, setPermissionsOpen] = useState(false)
  const [permissions, setPermissions] = useState(loadPermissions)
  const [textEditModal, setTextEditModal] = useState(null)

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'gerente'
  const canDeleteAccess = currentUser?.role === 'admin' || currentUser?.role === 'gerente'
  const canChangeSensitive = currentUser?.role === 'admin' || currentUser?.role === 'gerente'
  const printerOptions = useMemo(() => systemForm.printers || [], [systemForm.printers])
  const activeTables = tableConfigs.filter(table => table.active)
  const visibleTableConfigs = showOnlyActiveTables ? activeTables : tableConfigs
  const totalUsers = users.length
  const totalAdmins = users.filter(user => user.role === 'admin').length
  const totalWaiters = users.filter(user => user.role === 'garcom').length
  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase()
    return products.filter(product => {
      const matchesStatus = productStatusFilter === 'Todos os status' || product.status === productStatusFilter
      const matchesTerm = !term || [product.name, product.category, product.sector].join(' ').toLowerCase().includes(term)
      return matchesStatus && matchesTerm
    })
  }, [products, productSearch, productStatusFilter])
  const productsPerPage = 7
  const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / productsPerPage))
  const safeProductPage = Math.min(productPage, totalProductPages)
  const paginatedProducts = filteredProducts.slice((safeProductPage - 1) * productsPerPage, safeProductPage * productsPerPage)

  const printerAssignments = [
    { key: 'caixa', sector: 'Caixa', icon: ReceiptText, field: 'cashierPrinterId', description: 'Comanda do cliente sai em' },
    { key: 'cozinha', sector: 'Cozinha', icon: Printer, field: 'kitchenPrinterId', description: 'Pedidos da cozinha saem em' },
    { key: 'churrasco', sector: 'Churrasco', icon: Utensils, field: 'grillPrinterId', description: 'Pedidos do churrasco saem em' },
    { key: 'sucos', sector: 'Sucos', icon: Store, field: 'juicePrinterId', description: 'Pedidos dos sucos saem em' },
  ]

  const authToggles = [
    ['requireCancelPassword', 'Exigir senha para cancelar item'],
    ['requireCloseTablePassword', 'Exigir senha para fechar mesa'],
    ['requireDiscountPassword', 'Exigir autorização para desconto'],
    ['requireReprintPassword', 'Exigir senha para reimpressão de comanda'],
  ]

  const permissionOptions = ['Lançar pedidos', 'Solicitar conta', 'Cancelar itens', 'Fechar mesa', 'Ver relatórios', 'Gerenciar usuários']

  function showMessage(text) {
    setSystemMessage(text);
    setTimeout(() => setSystemMessage(''), 2500);
  }

  useEffect(() => {
    try {
      localStorage.setItem('fogao-a-lenha-system-settings-v1', JSON.stringify(systemForm))
    } catch (e) {
      console.error("Falha ao salvar preferências de hardware:", e)
    }
  }, [systemForm])

  useEffect(() => {
    const normalized = products.map(normalizeProduct)
    writeJson(PRODUCTS_KEY, normalized)
    writeJson(PRODUCT_SETTINGS_KEY, normalized)
    window.dispatchEvent(new Event('fogao-products-updated'))
  }, [products])

  useEffect(() => {
    setProductPage(1)
  }, [productSearch, productStatusFilter])

  useEffect(() => {
    writeJson(PERMISSIONS_KEY, permissions)
  }, [permissions])

  function addUser(e) {
    e.preventDefault()
    if (!canManage || !form.name || !form.username || !form.password) return
    setUsers(prev => [...prev, { id: Date.now(), ...form, active: true }])
    setForm({ name: '', username: '', password: '', role: 'garcom' })
  }

  function saveEditedUser(event) {
    event.preventDefault()
    if (!editingUser?.name?.trim() || !editingUser?.username?.trim()) return
    const duplicated = users.some(user => user.id !== editingUser.id && user.username?.trim().toLowerCase() === editingUser.username.trim().toLowerCase())
    if (duplicated) {
      showMessage('Já existe outro usuário com esse login.')
      return
    }
    setUsers(prev => prev.map(user => user.id === editingUser.id ? {
      ...user,
      name: editingUser.name.trim(),
      username: editingUser.username.trim(),
      role: editingUser.role,
      active: editingUser.active !== false,
      ...(editingUser.password ? { password: editingUser.password } : {}),
    } : user))
    setEditingUser(null)
    showMessage('Acesso atualizado.')
  }

  function requestDeleteUser(user) {
    if (!canDeleteAccess) return
    if (String(user.id) === String(currentUser?.id)) {
      showMessage('Não é possível excluir o usuário conectado.')
      return
    }
    setDeletingUser(user)
  }

  function confirmDeleteUser() {
    if (!deletingUser || !canDeleteAccess) return
    setUsers(prev => prev.filter(user => String(user.id) !== String(deletingUser.id)))
    setDeletingUser(null)
    showMessage('Acesso excluído com sucesso.')
  }

  // --- MOTOR DE IMPRESSÃO ESC/POS LIMPO (DEIXA O WINDOWS CONTROLAR) ---
  async function executeThermalPrint(targetPrinterName, logLabel) {
    try {
      const qzModule = await import('qz-tray');
      const qz = qzModule.default || qzModule;

      if (!qz) throw new Error("Módulo QZ Tray indisponível localmente.");

      // SEGREDO: Omitimos qualquer configuração de 'qz.security' aqui. 
      // Isso força o QZ Tray a ignorar a criptografia web e usar a permissão do Windows.

      if (!qz.websocket.isActive()) {
        await qz.websocket.connect();
      }

      await qz.printers.find(targetPrinterName);
      const config = qz.configs.create(targetPrinterName);

      const now = new Date();
      const formattedDate = now.toLocaleDateString('pt-BR');
      const formattedTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const receiptPayload = [
        '\x1B' + '\x40',          
        '\x1B' + '\x61' + '\x31', 
        '================================\n',
        '         FOGAO A LENHA          \n',
        '       TESTE DE IMPRESSAO       \n',
        '================================\n',
        '\x1B' + '\x40',          
        `Data:      ${formattedDate}\n`,
        `Hora:      ${formattedTime}\n`,
        `Destino:   ${logLabel.toUpperCase()}\n`,
        `Hardware:  ${targetPrinterName}\n`,
        '--------------------------------\n',
        '\x1B' + '\x61' + '\x31', 
        'Status:\n',
        '[ OK - COMUNICACAO ATIVA ]\n',
        '================================\n',
        '\n\n\n\n',               
        '\x1D' + '\x56' + '\x41' + '\x00' 
      ];

      await qz.print(config, receiptPayload);
      return true;
    } catch (error) {
      console.error("Falha no barramento de hardware térmico:", error);
      alert(`Falha ao disparar barramento térmico: ${error.message || error}`);
      return false;
    }
  }

  function generateTableConfigs(qty = tableQty) {
    const quantity = Math.max(1, Math.min(80, Number(qty) || 1))
    const startNumber = Math.max(1, Number(tableStart) || 1)
    const nextConfigs = Array.from({ length: quantity }, (_, index) => {
      const number = String(startNumber + index).padStart(2, '0')
      const previous = tableConfigs[index]
      return { id: previous?.id || index + 1, number, displayName: autoNumberTables ? `${tablePrefix || 'Mesa'} ${number}` : (previous?.displayName || `${tablePrefix || 'Mesa'} ${number}`), active: previous?.active !== false, canJoin: previous?.canJoin ?? allowJoinTables }
    })
    setTableConfigs(nextConfigs)
    setTableQty(quantity)
    return nextConfigs
  }

  function applyTableQty(configs = tableConfigs) {
    if (!canManage) return
    const source = configs.length ? configs : generateTableConfigs()
    setTables(prev => source.map((config, index) => ({ ...(prev[index] || {}), id: config.id || index + 1, number: config.number, displayName: config.displayName, active: config.active, canJoin: config.canJoin, status: prev[index]?.status || 'livre', guests: prev[index]?.guests || 0, openedAt: prev[index]?.openedAt || null, items: prev[index]?.items || [], kitchenSent: prev[index]?.kitchenSent || false, billRequested: prev[index]?.billRequested || false })))
    showMessage('Configurações das mesas salvas com sucesso.')
  }

  function resetTableNumbers() { const configs = generateTableConfigs(tableQty); applyTableQty(configs) }
  
  function editTableName(id) {
    const table = tableConfigs.find(item => item.id === id)
    setTextEditModal({
      type: 'table',
      id,
      title: 'Editar mesa',
      subtitle: table?.displayName || 'Mesa',
      label: 'Nome exibido da mesa',
      value: table?.displayName || '',
      placeholder: 'Ex.: Mesa varanda',
    })
  }

  async function addPrinter() {
    const id = `printer-${Date.now()}`
    setSystemForm(prev => {
      const nextNumber = prev.printers.length + 1
      return { ...prev, printers: [...prev.printers, { id, label: `Impressora ${nextNumber}`, name: `Impressora ${nextNumber}` }] }
    })
    setTextEditModal({
      type: 'printer',
      id,
      title: 'Adicionar impressora',
      subtitle: 'Nova impressora',
      label: 'Nome da impressora',
      value: '',
      placeholder: 'Ex.: Impressora cozinha',
      creating: true,
    })
  }

  function removePrinter(id) {
    setSystemForm(prev => {
      const printers = prev.printers.filter(p => p.id !== id).map((p, i) => ({ ...p, label: `Impressora ${i + 1}` }))
      return {
        ...prev,
        printers,
        kitchenPrinterId: prev.kitchenPrinterId === id ? '' : prev.kitchenPrinterId,
        cashierPrinterId: prev.cashierPrinterId === id ? '' : prev.cashierPrinterId,
        grillPrinterId: prev.grillPrinterId === id ? '' : prev.grillPrinterId,
        juicePrinterId: prev.juicePrinterId === id ? '' : prev.juicePrinterId,
      }
    })
  }

  function updatePrinterName(id, name) { setSystemForm(prev => ({ ...prev, printers: prev.printers.map(printer => printer.id === id ? { ...printer, name } : printer) })) }
  
  function editPrinterName(printer) {
    if (!printer) return
    setTextEditModal({
      type: 'printer',
      id: printer.id,
      title: 'Editar impressora',
      subtitle: printer.name || printer.label || 'Impressora',
      label: 'Nome da impressora',
      value: printer.name || '',
      placeholder: 'Ex.: Impressora cozinha',
    })
  }

  function closeTextEditModal() {
    if (textEditModal?.type === 'printer' && textEditModal.creating) {
      removePrinter(textEditModal.id)
    }
    setTextEditModal(null)
  }

  function saveTextEdit(event) {
    event.preventDefault()
    const value = textEditModal?.value?.trim()
    if (!value) return setTextEditModal(prev => ({ ...prev, error: 'Informe um nome para salvar.' }))
    if (textEditModal.type === 'table') {
      setTableConfigs(prev => prev.map(item => item.id === textEditModal.id ? { ...item, displayName: value } : item))
      showMessage('Nome da mesa atualizado.')
    }
    if (textEditModal.type === 'printer') {
      updatePrinterName(textEditModal.id, value)
      showMessage('Nome da impressora atualizado.')
    }
    setTextEditModal(null)
  }

  function saveSystem(e) {
    e?.preventDefault?.()
    if (!canChangeSensitive) return
    const printers = systemForm.printers.map((p, i) => ({ ...p, label: `Impressora ${i + 1}`, name: p.name.trim() || `Impressora ${i + 1}` }))
    const printerExists = id => printers.some(printer => printer.id === id)
    const nextSettings = {
      ...systemForm,
      printers,
      kitchenPrinterId: printerExists(systemForm.kitchenPrinterId) ? systemForm.kitchenPrinterId : '',
      cashierPrinterId: printerExists(systemForm.cashierPrinterId) ? systemForm.cashierPrinterId : '',
      grillPrinterId: printerExists(systemForm.grillPrinterId) ? systemForm.grillPrinterId : '',
      juicePrinterId: printerExists(systemForm.juicePrinterId) ? systemForm.juicePrinterId : '',
    }
    setSettings(prev => ({ ...prev, ...nextSettings }))
    setSystemForm(prev => ({ ...prev, ...nextSettings }))
    showMessage('Configurações salvas com sucesso.')
  }

  function restoreDefaults() { const defaults = normalizeSettings({ printers: basePrinters }); setSystemForm(defaults); showMessage('Padrões restaurados. Clique em salvar para confirmar.') }
  
  async function testPrinter(name) {
    const printerHardwareTarget = name && name !== 'Sem nome' ? name : 'POS-80';
    const printSuccess = await executeThermalPrint(printerHardwareTarget, name);
    if (printSuccess) {
      showMessage(`Papel de teste enviado com sucesso para: ${printerHardwareTarget}`);
    }
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

  function handleProductCategory(category) {
    const inferred = inferProductConfig(category)
    setProductForm(prev => ({ ...prev, category, sector: inferred.sector, prepare: inferred.prepare ? 'Sim' : 'Não' }))
  }

  function addProduct(e) {
    e.preventDefault()
    if (!productForm.name.trim()) return
    const product = normalizeProduct({ id: Date.now(), name: productForm.name.trim(), category: productForm.category || 'Outros', sector: productForm.sector || 'Bar / Caixa', price: parsePrice(productForm.price), prepare: productForm.prepare === 'Sim', status: productForm.status || 'Ativo' })
    setProducts(prev => [product, ...prev])
    setProductForm({ name: '', category: '', sector: '', price: '', prepare: '', status: 'Ativo' })
  }

  function editProduct(product) { setEditingProduct({ ...normalizeProduct(product), priceText: String(product.price || '').replace('.', ','), deleteMode: false }) }
  function deleteProduct(product) { setEditingProduct({ ...normalizeProduct(product), priceText: String(product.price || '').replace('.', ','), deleteMode: true }) }

  function saveEditedProduct(event) {
    event.preventDefault()
    if (!editingProduct) return
    if (editingProduct.deleteMode) {
      setProducts(prev => prev.filter(item => item.id !== editingProduct.id))
      setEditingProduct(null)
      return
    }
    if (!editingProduct.name?.trim()) return
    const nextProduct = normalizeProduct({
      ...editingProduct,
      name: editingProduct.name.trim(),
      price: parsePrice(editingProduct.priceText),
      prepare: editingProduct.prepare === true || editingProduct.prepare === 'Sim',
    })
    setProducts(prev => prev.map(item => item.id === editingProduct.id ? nextProduct : item))
    setEditingProduct(null)
  }

  function savePermissions(event) {
    event.preventDefault()
    writeJson(PERMISSIONS_KEY, permissions)
    setPermissionsOpen(false)
    showMessage('Permissões salvas com sucesso.')
  }

  return <div className="page settingsPremiumPage compactSettingsPage refinedSettingsPage">
    <header className="settingsTopHeader"><div><span className="eyebrow settingsEyebrow">CONTROLE DO SISTEMA</span><h1>Configurações</h1><p>Gerencie acessos, mesas, impressões, produtos e preferências do sistema.</p></div><div className="systemActiveCard"><ShieldCheck size={24} /><div><strong>Sistema ativo</strong><span>Última atualização: agora <b /></span></div></div></header>

    <nav className="settingsTabs settingsTabsLarge">
      <button className={activeTab === 'colaboradores' ? 'active' : ''} onClick={() => setActiveTab('colaboradores')}><UserCog size={18} /> Acessos</button>
      <button className={activeTab === 'mesas' ? 'active' : ''} onClick={() => setActiveTab('mesas')}><Utensils size={18} /> Mesas</button>
      <button className={activeTab === 'impressao' ? 'active' : ''} onClick={() => setActiveTab('impressao')}><Printer size={18} /> Impressão</button>
      <button className={activeTab === 'produtos' ? 'active' : ''} onClick={() => setActiveTab('produtos')}><Store size={18} /> Produtos</button>
      <button className={activeTab === 'sistema' ? 'active' : ''} onClick={() => setActiveTab('sistema')}><Settings size={18} /> Sistema</button>
    </nav>

    {activeTab === 'colaboradores' && <div className="accessSettingsTab"><section className="accessSummaryGrid"><div className="accessSummaryCard"><UserCog size={22} /><div><span>Total de usuários</span><strong>{totalUsers}</strong><small>Usuários cadastrados</small></div></div><div className="accessSummaryCard"><ShieldCheck size={22} /><div><span>Administradores</span><strong>{totalAdmins}</strong><small>Acesso total ao sistema</small></div></div><div className="accessSummaryCard"><Utensils size={22} /><div><span>Garçons</span><strong>{totalWaiters}</strong><small>Acessos de atendimento</small></div></div></section><div className="accessMainGrid">{canManage && <section className="settingsPanel accessCreatePanel"><div className="settingsPanelTitle"><Plus size={22} /><h2>Criar novo acesso</h2></div><form className="settingsForm accessCreateForm" onSubmit={addUser}><label><span>Nome completo</span><input placeholder="Ex.: João da Silva" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label><span>Login</span><input placeholder="Ex.: joao.silva" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></label><label className="span2"><span>Senha</span><div className="passwordInputWrap"><input type={showPasswords.form ? 'text' : 'password'} placeholder="Digite uma senha" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /><button type="button" onClick={() => setShowPasswords(prev => ({ ...prev, form: !prev.form }))}>{showPasswords.form ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label><label className="span2"><span>Função</span><select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="admin">Administrador</option><option value="gerente">Gerente</option><option value="garcom">Garçom</option></select></label><div className="permissionsChecklist"><strong>Permissões</strong>{permissionOptions.map((item, index) => <label key={item}><input type="checkbox" defaultChecked={index < 2 || form.role === 'admin'} /> {item}</label>)}</div><button className="primaryBtn"><Plus size={18} /> Criar acesso</button></form></section>}<section className="settingsPanel accessListPanel"><div className="settingsPanelTitle"><UserCog size={22} /><h2>Acessos cadastrados</h2></div><div className="accessTable"><div className="accessTableHead"><span>Nome</span><span>Login</span><span>Função</span><span>Status</span><span>Ações</span></div>{users.map(user => <div className="accessTableRow" key={user.id}><div className="accessNameCell"><div className="settingsUserAvatar">{user.name.slice(0, 2).toUpperCase()}</div><strong>{user.name}</strong></div><span>{user.username}</span><b>{roleLabel[user.role]}</b><em>{user.active === false ? '● Inativo' : '● Ativo'}</em><div className="accessActions"><button type="button" onClick={() => setEditingUser({ ...user, password: '' })}><Pencil size={16} /></button>{canDeleteAccess && user.id !== currentUser?.id && <button type="button" className="iconDanger" onClick={() => requestDeleteUser(user)}><Trash2 size={16} /></button>}</div></div>)}</div><div className="permissionsInfoBox"><ShieldCheck size={20} /><div><strong>Permissões por função</strong><span>As permissões definem o que cada função pode executar.</span></div><button type="button" onClick={() => setPermissionsOpen(true)}>Gerenciar permissões</button></div></section></div><div className="settingsTipBar"><AlertTriangle size={18} /><strong>Dica</strong><span>Mantenha os acessos organizados e revise as permissões periodicamente.</span></div></div>}

    {activeTab === 'mesas' && <div className="tablesSettingsPage"><section className="tableSummaryGrid"><div className="tableSummaryCard"><Utensils size={22} /><span>Mesas cadastradas</span><strong>{tableConfigs.length}</strong></div><div className="tableSummaryCard positive"><CheckCircle2 size={22} /><span>Mesas ativas</span><strong>{activeTables.length}</strong></div><div className="tableSummaryCard join"><KeyRound size={22} /><span>Juntar mesas</span><strong>{allowJoinTables ? 'Permitido' : 'Desativado'}</strong></div></section><div className="tablesSettingsLayout"><div className="tablesLeftColumn"><section className="settingsPanel tableConfigPanel"><div className="settingsPanelTitle"><ReceiptText size={22} /><h2>Configuração das mesas</h2></div><div className="tableConfigGrid"><label><span>Quantidade de mesas do salão</span><input type="number" min="1" max="80" value={tableQty} onChange={e => setTableQty(e.target.value)} /></label><label><span>Prefixo das mesas</span><input value={tablePrefix} onChange={e => setTablePrefix(e.target.value)} /></label><label><span>Numeração inicial</span><input value={tableStart} onChange={e => setTableStart(e.target.value)} /></label></div><div className="tableToggles"><label><input type="checkbox" checked={autoNumberTables} onChange={e => setAutoNumberTables(e.target.checked)} /> Gerar numeração automática</label><label><input type="checkbox" checked={allowJoinTables} onChange={e => { setAllowJoinTables(e.target.checked); setTableConfigs(prev => prev.map(table => ({ ...table, canJoin: e.target.checked }))) }} /> Permitir juntar mesas</label><label><input type="checkbox" checked={showOnlyActiveTables} onChange={e => setShowOnlyActiveTables(e.target.checked)} /> Exibir apenas mesas ativas</label></div><div className="tableConfigActions"><button className="primaryBtn" onClick={() => applyTableQty()}><Save size={17} /> Salvar configuração das mesas</button><button className="secondaryBtn" onClick={() => generateTableConfigs()}><Plus size={17} /> Gerar mesas</button><button className="secondaryBtn" onClick={resetTableNumbers}><RefreshCw size={17} /> Resetar numeração</button></div></section><section className="settingsPanel tablePreviewPanel"><div className="settingsPanelTitle"><Eye size={22} /><h2>Prévia das mesas cadastradas</h2></div><div className="tablePreviewGrid">{visibleTableConfigs.slice(0, 24).map(table => <span className={!table.active ? 'inactive' : ''} key={table.id}><Utensils size={14} /> {table.displayName}</span>)}</div></section></div><section className="settingsPanel registeredTablesPanel"><div className="settingsPanelTitle"><Utensils size={22} /><h2>Mesas cadastradas</h2></div><div className="registeredTablesTable"><div className="registeredTablesHead"><span>Mesa</span><span>Nome exibido</span><span>Status</span><span>Pode juntar</span><span>Ações</span></div>{visibleTableConfigs.slice(0, 8).map(table => <div className="registeredTablesRow" key={table.id}><span>{table.number}</span><strong>{table.displayName}</strong><button type="button" className={`miniStatus ${table.active ? 'active' : 'inactive'}`} onClick={() => setTableConfigs(prev => prev.map(item => item.id === table.id ? { ...item, active: !item.active } : item))}>{table.active ? 'Ativa' : 'Inativa'}</button><button type="button" className={`miniStatus ${table.canJoin ? 'active' : 'blocked'}`} onClick={() => setTableConfigs(prev => prev.map(item => item.id === table.id ? { ...item, canJoin: !item.canJoin } : item))}>{table.canJoin ? 'Sim' : 'Não'}</button><div className="tableRowActions"><button type="button" onClick={() => editTableName(table.id)}><Pencil size={15} /> Editar</button>{tableConfigs.length > 1 && <button type="button" className="dangerOutline" onClick={() => setTableConfigs(prev => prev.filter(item => item.id !== table.id))}><Trash2 size={15} /></button>}</div></div>)}</div><div className="tablePaginationHint">Mostrando {Math.min(visibleTableConfigs.length, 8)} de {visibleTableConfigs.length} mesas</div></section></div><div className="tableTipBox"><AlertTriangle size={18} /><span>Dica: organize nomes personalizados para mesas conforme o fluxo do salão.</span></div>{systemMessage && <div className="settingsSuccess fullSystemMessage"><CheckCircle2 size={17} /> {systemMessage}</div>}</div>}

    {activeTab === 'impressao' && <div className="printSettingsTab printSettingsTabV2"><section className="settingsPanel printBlock printPrintersBlock"><div className="printBlockHeader"><div className="printNumberTitle"><Printer size={21} /><h2>1. Impressoras cadastradas</h2></div><button type="button" className="addPrinterBtn solid" onClick={addPrinter}><Plus size={16} /> Adicionar impressora</button></div><div className="printerTableV2"><div className="printerTableHead"><span>Impressora</span><span>Nome</span><span>Status</span><span>Ações</span></div>{printerOptions.length ? printerOptions.map((printer, index) => <div className="printerTableRow" key={printer.id}><span className="sectorCell"><Printer size={16} /> {printer.label || `Impressora ${index + 1}`}</span><strong>{printer.name || 'Sem nome'}</strong> <em>• Cadastrada</em><div className="printerTableActions"><button type="button" onClick={() => testPrinter(printer?.name)}><Printer size={15} /> Testar</button><button type="button" onClick={() => editPrinterName(printer)}><Pencil size={15} /></button><button type="button" className="iconDanger" onClick={() => removePrinter(printer.id)}><Trash2 size={15} /></button></div></div>) : <div className="printerEmptyState"><Printer size={18} /><strong>Nenhuma impressora cadastrada</strong><span>Clique em adicionar e configure um nome para a impressora.</span></div>}</div></section><section className="settingsPanel printBlock printRulesBlock"><div className="printNumberTitle"><Printer size={21} /><h2>2. Regras de impressão por setor</h2></div><div className="printRulesLayout"><div className="printRulesSelects">{printerAssignments.filter(row => row.key !== 'caixa').map(row => <label key={row.key}><span>{row.description}</span><select value={systemForm[row.field] || ''} disabled={!printerOptions.length} onChange={e => setSystemForm({ ...systemForm, [row.field]: e.target.value })}><option value="">{printerOptions.length ? 'Nenhuma impressora' : 'Cadastre uma impressora'}</option>{printerOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>)}<label><span>Comanda do cliente sai em</span><select value={systemForm.cashierPrinterId || ''} disabled={!printerOptions.length} onChange={e => setSystemForm({ ...systemForm, cashierPrinterId: e.target.value })}><option value="">{printerOptions.length ? 'Nenhuma impressora' : 'Cadastre uma impressora'}</option>{printerOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div><div className="currentRulesBox"><CheckCircle2 size={20} /><strong>Regras atuais</strong><ul><li>Pedidos de preparo são enviados para os setores configurados.</li><li>Comanda do cliente é impressa no caixa para conferência.</li></ul></div></div></section><section className="settingsPanel printBlock printTypesBlock"><div className="printNumberTitle"><Printer size={21} /><h2>3. Tipos de impressão</h2></div><div className="printTypeList"><div className="printTypeRow"><ReceiptText size={20} /><div><strong>Pedido de preparo</strong><span>Impressão dos itens enviados para setores de produção.</span></div><ActiveToggle active={systemForm.printKitchenItems} onClick={() => setSystemForm(prev => ({ ...prev, printKitchenItems: !prev.printKitchenItems }))} /></div><div className="printTypeRow"><ReceiptText size={20} /><div><strong>Comanda do cliente</strong><span>Impressão da comanda completa do cliente no caixa.</span></div><ActiveToggle active={systemForm.printFullReceipt} onClick={() => setSystemForm(prev => ({ ...prev, printFullReceipt: !prev.printFullReceipt }))} /></div><div className="printTypeRow"><RefreshCw size={20} /><div><strong>Reimpressão</strong><span>Permitir reimpressão de pedidos e comandas.</span></div><ActiveToggle active={systemForm.allowReprint} onClick={() => setSystemForm(prev => ({ ...prev, allowReprint: !prev.allowReprint }))} /></div></div></section><section className="settingsPanel printBlock receiptModelBlock"><div className="printBlockHeader"><div className="printNumberTitle"><Printer size={21} /><h2>4. Modelo da comanda do cliente</h2></div><button type="button" className="editReceiptBtn"><Pencil size={15} /> Editar modelo</button></div><div className="receiptPreviewLayout"><div className="receiptPreview"><h3>FOGÃO A LENHA</h3><p>Churrascaria & Restaurante</p><small>CNPJ: {systemForm.cnpj || '12.345.678/0001-90'}</small><hr /><div><span>Mesa: 05</span><span>Data: 25/05/2024 13:45</span></div><p>1x Picanha <b>R$ 85,00</b></p><p>2x Refrigerante <b>R$ 18,00</b></p><p>1x Suco Natural <b>R$ 12,00</b></p><hr /><strong className="receiptTotal">TOTAL <b>R$ 115,00</b></strong>{systemForm.receiptMessage || 'Obrigado pela preferência!\nVolte sempre!'}</div><div className="receiptInfoList"><strong>Informações exibidas</strong>{['Nome do estabelecimento','CNPJ','Mesa','Data e hora','Itens do pedido','Total','Mensagem final'].map(item => <span key={item}><CheckCircle2 size={15} /> {item}</span>)}</div></div></section><div className="printFooterBar"><div><AlertTriangle size={18} /><strong>Dica:</strong><span>Configure corretamente as impressoras para evitar desvios em horários de pico.</span></div><div><button type="button" className="secondaryBtn" onClick={restoreDefaults}><RefreshCw size={17} /> Restaurar padrões</button><button type="button" className="primaryBtn" disabled={!canChangeSensitive} onClick={saveSystem}><Save size={18} /> Salvar configurações</button></div></div>{systemMessage && <div className="settingsSuccess fullSystemMessage"><CheckCircle2 size={17} /> {systemMessage}</div>}</div>}

    {activeTab === 'produtos' && <div className="productsSettingsTab"><div className="productsTopGrid"><section className="settingsPanel productCreatePanel"><div className="settingsPanelTitle"><Store size={22} /><h2>Cadastro de produto</h2></div><form className="productForm" onSubmit={addProduct}><label><span>Nome do produto</span><input placeholder="Ex.: Picanha" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} /></label><label><span>Categoria</span><select value={productForm.category} onChange={e => handleProductCategory(e.target.value)}><option value="">Selecione a categoria</option>{productCategoryOptions.map(category => <option key={category}>{category}</option>)}</select></label><label><span>Setor de impressão</span><select value={productForm.sector} onChange={e => setProductForm({ ...productForm, sector: e.target.value })}><option value="">Selecione o setor</option>{productSectors.map(sector => <option key={sector}>{sector}</option>)}</select></label><label><span>Preço (R$)</span><input placeholder="0,00" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} /></label><label><span>Vai para preparo?</span><select value={productForm.prepare} onChange={e => setProductForm({ ...productForm, prepare: e.target.value })}><option value="">Selecione</option><option>Sim</option><option>Não</option></select></label><label><span>Status</span><select value={productForm.status} onChange={e => setProductForm({ ...productForm, status: e.target.value })}><option>Ativo</option><option>Inativo</option></select></label><button className="primaryBtn addProductBtn"><Plus size={18} /> Adicionar produto</button></form></section><aside className="settingsPanel productTipsPanel"><div className="settingsPanelTitle"><CheckCircle2 size={22} /><h2>Dicas rápidas</h2></div><ul><li>Produtos em setores de produção imprimem cupons automáticos.</li><li>Mantenha o cardápio sempre limpo e atualizado.</li></ul></aside></div><section className="settingsPanel productsListPanel"><div className="productsListHeader"><div className="settingsPanelTitle"><Store size={22} /><h2>Lista de produtos cadastrados</h2></div><div className="productsFilters"><label><Search size={15} /><input placeholder="Buscar produto..." value={productSearch} onChange={e => setProductSearch(e.target.value)} /></label><select value={productStatusFilter} onChange={e => setProductStatusFilter(e.target.value)}><option>Todos os status</option><option>Ativo</option><option>Inativo</option></select></div></div><div className="productsTable"><div className="productsTableHead"><span>Produto</span><span>Categoria</span><span>Setor</span><span>Preço</span><span>Vai para preparo?</span><span>Status</span><span>Ações</span></div>{paginatedProducts.map(product => <div className="productsTableRow" key={product.id}><span className="productNameCell">{product.name}</span><span>{product.category}</span><span className="productSectorCell"><ProductSectorIcon sector={product.sector} /> {product.sector}</span><span>{formatMoney(product.price)}</span><span><em className={`prepareBadge ${product.prepare ? 'yes' : 'no'}`}>{product.prepare ? 'Sim' : 'Não'}</em></span><span><em className={`statusBadge ${product.status === 'Ativo' ? 'active' : 'inactive'}`}>{product.status}</em></span><span className="productActions"><button type="button" onClick={() => editProduct(product)}><Pencil size={15} /></button><button type="button" onClick={() => deleteProduct(product)}><Trash2 size={15} /></button></span></div>)}</div><footer className="productsPagination"><span>Mostrando {filteredProducts.length ? ((safeProductPage - 1) * productsPerPage) + 1 : 0} a {Math.min(filteredProducts.length, safeProductPage * productsPerPage)} de {filteredProducts.length} produtos</span><div><button type="button" disabled={safeProductPage === 1} onClick={() => setProductPage(page => Math.max(1, page - 1))}>Anterior</button>{Array.from({ length: totalProductPages }, (_, index) => index + 1).slice(0, 6).map(page => <button type="button" key={page} className={safeProductPage === page ? 'active' : ''} onClick={() => setProductPage(page)}>{page}</button>)}<button type="button" disabled={safeProductPage === totalProductPages} onClick={() => setProductPage(page => Math.min(totalProductPages, page + 1))}>Próxima</button></div></footer></section></div>}

    {activeTab === 'sistema' && <div className="systemSettingsGridV2 refinedSystemGrid"><section className="settingsPanel systemCard establishmentSystemCard"><div className="settingsPanelTitle numberedTitle"><div className="titleBadge"><Building2 size={20} /></div><h2>Dados da empresa</h2></div><div className="establishmentGrid"><label><span>Nome do estabelecimento</span><input value={systemForm.establishmentName} onChange={e => setSystemForm({ ...systemForm, establishmentName: e.target.value })} /></label><label><span>Telefone</span><input value={systemForm.phone || ''} placeholder="(00) 00000-0000" onChange={e => setSystemForm({ ...systemForm, phone: e.target.value })} /></label><label><span>CNPJ</span><input value={systemForm.cnpj || ''} placeholder="00.000.000/0000-00" onChange={e => setSystemForm({ ...systemForm, cnpj: e.target.value })} /></label><label><span>Endereço</span><input value={systemForm.address || ''} placeholder="Rua, número, bairro, cidade" onChange={e => setSystemForm({ ...systemForm, address: e.target.value })} /></label></div></section><section className="settingsPanel systemCard printRulesSystemCard"><div className="settingsPanelTitle numberedTitle"><div className="titleBadge"><Settings size={20} /></div><h2>Preferências</h2></div><div className="establishmentGrid"><label><span>Nome exibido no sistema</span><input value={systemForm.establishmentName} onChange={e => setSystemForm({ ...systemForm, establishmentName: e.target.value })} /></label><label><span>Horário de funcionamento</span><input placeholder="Ex.: 10h às 23h" /></label><label className="span2"><span>Mensagem da comanda/cupom</span><textarea maxLength={120} value={systemForm.receiptMessage || ''} onChange={e => setSystemForm({ ...systemForm, receiptMessage: e.target.value })} /></label><small className="receiptCounter">{(systemForm.receiptMessage || '').length}/120</small></div></section><section className="settingsPanel systemCard securitySystemCard"><div className="settingsPanelTitle numberedTitle"><div className="titleBadge"><ShieldCheck size={20} /></div><h2>Cancelamentos e autorizações</h2></div><div className="securityGrid"><form className="securityPasswordBox" onSubmit={changeCancelPassword}><h3>Senha de cancelamento</h3><PasswordField label="Senha atual do administrador ou gerente" value={cancelForm.managerPassword} visible={showPasswords.manager} onToggle={() => setShowPasswords(prev => ({ ...prev, manager: !prev.manager }))} onChange={e => setCancelForm({ ...cancelForm, managerPassword: e.target.value })} placeholder="Confirme sua autorização" /><PasswordField label="Nova senha de cancelamento" value={cancelForm.newPassword} visible={showPasswords.new} onToggle={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))} onChange={e => setCancelForm({ ...cancelForm, newPassword: e.target.value })} placeholder="Nova senha" /><PasswordField label="Confirmar nova senha" value={cancelForm.confirmPassword} visible={showPasswords.confirm} onToggle={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))} onChange={e => setCancelForm({ ...cancelForm, confirmPassword: e.target.value })} placeholder="Repita a nova senha" /><button className="primaryBtn"><KeyRound size={18} /> Salvar nova senha</button><p>Administradores e gerentes validam ações críticas pelo próprio login.</p></form><div className="authorizationBox"><h3>Ações protegidas</h3>{authToggles.map(([key, label]) => <label className="switchRow" key={key}><button type="button" className={`fakeSwitch ${systemForm[key] ? 'active' : ''}`} onClick={() => setSystemForm(prev => ({ ...prev, [key]: !prev[key] }))}><span /></button><strong>{label}</strong></label>)}</div></div>{cancelMessage && <div className={cancelMessage.includes('atualizada') ? 'settingsSuccess' : 'settingsError'}>{cancelMessage.includes('atualizada') ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}{cancelMessage}</div>}</section><div className="systemFooterActions"><button type="button" className="secondaryBtn" onClick={restoreDefaults}><RefreshCw size={17} /> Restaurar padrões</button><button type="button" className="primaryBtn" disabled={!canChangeSensitive} onClick={saveSystem}><Save size={18} /> Salvar configurações</button></div>{systemMessage && <div className="settingsSuccess fullSystemMessage"><CheckCircle2 size={17} /> {systemMessage}</div>}</div>}
    
    {textEditModal && <div className="authModalOverlay">
      <form className="authModal settingsTextEditModal" onSubmit={saveTextEdit}>
        <div className="drawerHeader"><div><span className="eyebrow">{textEditModal.title}</span><h2>{textEditModal.subtitle}</h2></div><button type="button" className="iconBtn" onClick={closeTextEditModal}><X size={22} /></button></div>
        <label><span>{textEditModal.label}</span><input value={textEditModal.value || ''} placeholder={textEditModal.placeholder} onChange={event => setTextEditModal(prev => ({ ...prev, value: event.target.value, error: '' }))} autoFocus /></label>
        {textEditModal.error && <p className="settingsModalError"><AlertTriangle size={16} /> {textEditModal.error}</p>}
        <div className="actionsRow"><button className="secondaryBtn" type="button" onClick={closeTextEditModal}>Cancelar</button><button className="primaryBtn" type="submit">Salvar</button></div>
      </form>
    </div>}

    {deletingUser && <div className="authModalOverlay">
      <div className="authModal settingsDeleteModal" role="dialog" aria-modal="true">
        <div className="drawerHeader"><div><span className="eyebrow">Excluir acesso</span><h2>{deletingUser.name}</h2></div><button type="button" className="iconBtn" onClick={() => setDeletingUser(null)}><X size={22} /></button></div>
        <div className="deleteWarningBox"><AlertTriangle size={20} /><div><strong>Essa ação remove o login do sistema.</strong><span>O usuário perderá o acesso imediatamente.</span></div></div>
        <div className="deleteUserSummary"><span>Login</span><strong>{deletingUser.username}</strong><span>Função</span><strong>{roleLabel[deletingUser.role] || deletingUser.role}</strong></div>
        <div className="actionsRow"><button className="secondaryBtn" type="button" onClick={() => setDeletingUser(null)}>Cancelar</button><button className="primaryBtn dangerBtn" type="button" onClick={confirmDeleteUser}><Trash2 size={16} /> Excluir acesso</button></div>
      </div>
    </div>}

    {editingUser && <div className="authModalOverlay">
      <form className="authModal settingsEditModal" onSubmit={saveEditedUser}>
        <div className="drawerHeader"><div><span className="eyebrow">Editar acesso</span><h2>{editingUser.name}</h2></div><button type="button" className="iconBtn" onClick={() => setEditingUser(null)}><X size={22} /></button></div>
        <label><span>Nome completo</span><input value={editingUser.name || ''} onChange={event => setEditingUser(prev => ({ ...prev, name: event.target.value }))} autoFocus /></label>
        <label><span>Login</span><input value={editingUser.username || ''} onChange={event => setEditingUser(prev => ({ ...prev, username: event.target.value }))} /></label>
        <label><span>Função</span><select value={editingUser.role || 'garcom'} onChange={event => setEditingUser(prev => ({ ...prev, role: event.target.value }))}><option value="admin">Administrador</option><option value="gerente">Gerente</option><option value="garcom">Garçom</option></select></label>
        <label><span>Nova senha (opcional)</span><input type="password" value={editingUser.password || ''} onChange={event => setEditingUser(prev => ({ ...prev, password: event.target.value }))} placeholder="Deixe em branco para manter a atual" /></label>
        <label className="switchRow"><button type="button" className={`fakeSwitch ${editingUser.active !== false ? 'active' : ''}`} onClick={() => setEditingUser(prev => ({ ...prev, active: prev.active === false }))}><span /></button><strong>Usuário ativo</strong></label>
        <div className="actionsRow"><button className="secondaryBtn" type="button" onClick={() => setEditingUser(null)}>Cancelar</button><button className="primaryBtn" type="submit">Salvar alterações</button></div>
      </form>
    </div>}

    {editingProduct && <div className="authModalOverlay">
      <form className="authModal settingsEditModal" onSubmit={saveEditedProduct}>
        <div className="drawerHeader"><div><span className="eyebrow">{editingProduct.deleteMode ? 'Excluir produto' : 'Editar produto'}</span><h2>{editingProduct.name}</h2></div><button type="button" className="iconBtn" onClick={() => setEditingProduct(null)}><X size={22} /></button></div>
        {editingProduct.deleteMode ? (
          <p>Confirme a exclusão deste produto. Essa ação remove o item do cadastro, mas não altera históricos já registrados.</p>
        ) : (
          <>
            <label><span>Nome do produto</span><input value={editingProduct.name || ''} onChange={event => setEditingProduct(prev => ({ ...prev, name: event.target.value }))} autoFocus /></label>
            <label><span>Categoria</span><select value={editingProduct.category || 'Outros'} onChange={event => { const inferred = inferProductConfig(event.target.value); setEditingProduct(prev => ({ ...prev, category: event.target.value, sector: inferred.sector, prepare: inferred.prepare })) }}>{productCategoryOptions.map(category => <option key={category}>{category}</option>)}</select></label>
            <label><span>Setor de impressão</span><select value={editingProduct.sector || 'Bar / Caixa'} onChange={event => setEditingProduct(prev => ({ ...prev, sector: event.target.value }))}>{productSectors.map(sector => <option key={sector}>{sector}</option>)}</select></label>
            <label><span>Preço (R$)</span><input value={editingProduct.priceText || ''} onChange={event => setEditingProduct(prev => ({ ...prev, priceText: event.target.value }))} /></label>
            <label><span>Vai para preparo?</span><select value={editingProduct.prepare ? 'Sim' : 'Não'} onChange={event => setEditingProduct(prev => ({ ...prev, prepare: event.target.value === 'Sim' }))}><option>Sim</option><option>Não</option></select></label>
            <label><span>Status</span><select value={editingProduct.status || 'Ativo'} onChange={event => setEditingProduct(prev => ({ ...prev, status: event.target.value }))}><option>Ativo</option><option>Inativo</option></select></label>
          </>
        )}
        <div className="actionsRow"><button className="secondaryBtn" type="button" onClick={() => setEditingProduct(null)}>Cancelar</button><button className={editingProduct.deleteMode ? 'dangerBtn' : 'primaryBtn'} type="submit">{editingProduct.deleteMode ? 'Excluir produto' : 'Salvar alterações'}</button></div>
      </form>
    </div>}

    {permissionsOpen && <div className="authModalOverlay">
      <form className="authModal permissionsReactModal" onSubmit={savePermissions}>
        <div className="drawerHeader"><div><span className="eyebrow">Permissões</span><h2>Gerenciar permissões</h2></div><button type="button" className="iconBtn" onClick={() => setPermissionsOpen(false)}><X size={22} /></button></div>
        <div className="permissionsRoleGrid">
          {Object.entries(roleLabel).map(([role, label]) => <section className="permissionsRoleCard" key={role}>
            <h4>{label}</h4>
            <div className="permissionsChecks">{permissionOptions.map(permission => <label key={permission}><input type="checkbox" disabled={role === 'admin'} checked={(permissions[role] || []).includes(permission)} onChange={event => setPermissions(prev => ({ ...prev, [role]: event.target.checked ? [...(prev[role] || []), permission] : (prev[role] || []).filter(item => item !== permission) }))} /> <span>{permission}</span></label>)}</div>
            {role === 'admin' && <small>Administrador mantém acesso total.</small>}
          </section>)}
        </div>
        <div className="actionsRow"><button className="secondaryBtn" type="button" onClick={() => setPermissionsOpen(false)}>Cancelar</button><button className="primaryBtn" type="submit">Salvar permissões</button></div>
      </form>
    </div>}
  </div>
}