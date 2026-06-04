import { useState } from 'react'
import { Plus, Settings, ShieldCheck, Trash2, UserCog, Utensils, ReceiptText, Printer, Store, KeyRound } from 'lucide-react'

const roleLabel = {
  admin: 'Administrador',
  gerente: 'Gerente',
  garcom: 'Garçom'
}

export default function Usuarios({ users, setUsers, tables, setTables, currentUser }) {
  const [activeTab, setActiveTab] = useState('colaboradores')
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'garcom' })
  const [tableQty, setTableQty] = useState(tables?.length || 12)

  const canManage = currentUser?.role === 'admin'

  function handleSubmit(event) {
    event.preventDefault()
    if (!canManage) return
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) return

    const newUser = {
      id: Date.now(),
      name: form.name.trim(),
      username: form.username.trim(),
      password: form.password.trim(),
      role: form.role,
      active: true
    }

    setUsers(prev => [...prev, newUser])
    setForm({ name: '', username: '', password: '', role: 'garcom' })
  }

  function removeUser(id) {
    if (!canManage) return
    if (id === currentUser?.id) return
    setUsers(prev => prev.filter(user => user.id !== id))
  }

  function applyTableQty() {
    if (!canManage) return
    const qty = Math.max(1, Math.min(80, Number(tableQty) || 1))
    setTables(prev => {
      const next = Array.from({ length: qty }, (_, index) => {
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
      })
      return next
    })
  }

  const settingsCards = [
    { icon: UserCog, title: 'Colaboradores', text: 'Crie login e senha para administrador, gerente e garçom.' },
    { icon: Utensils, title: 'Mesas do salão', text: 'Defina quantas mesas vão aparecer no mapa de atendimento.' },
    { icon: KeyRound, title: 'Cancelamento', text: 'Cancelamento continua liberado somente com senha de admin ou gerente.' },
    { icon: Printer, title: 'Impressão cozinha', text: 'Pedidos de cozinha, churrasco e sucos seguem para a impressora da cozinha.' },
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

      {!canManage && (
        <section className="settingsBlockedCard">
          <ShieldCheck size={24} />
          <div>
            <strong>Acesso restrito</strong>
            <span>Somente o administrador pode alterar as configurações do sistema.</span>
          </div>
        </section>
      )}

      <div className="settingsCardsGrid">
        {settingsCards.map(card => {
          const Icon = card.icon
          return (
            <section className="settingsMiniCard" key={card.title}>
              <div><Icon size={20} /></div>
              <strong>{card.title}</strong>
              <span>{card.text}</span>
            </section>
          )
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
              <div className="settingsPanelTitle">
                <UserCog size={22} />
                <h2>Adicionar colaborador</h2>
              </div>

              <form className="settingsForm" onSubmit={handleSubmit}>
                <label>
                  <span>Nome do colaborador</span>
                  <input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Ex: João Silva" />
                </label>

                <label>
                  <span>Login</span>
                  <input value={form.username} onChange={event => setForm({ ...form, username: event.target.value })} placeholder="Ex: joao" />
                </label>

                <label>
                  <span>Senha</span>
                  <input value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} placeholder="Ex: 123456" />
                </label>

                <label>
                  <span>Função</span>
                  <select value={form.role} onChange={event => setForm({ ...form, role: event.target.value })}>
                    <option value="admin">Administrador</option>
                    <option value="gerente">Gerente</option>
                    <option value="garcom">Garçom</option>
                  </select>
                </label>

                <button className="primaryBtn" type="submit">
                  <Plus size={18} /> Criar acesso
                </button>
              </form>
            </section>
          )}

          <section className="settingsPanel">
            <div className="settingsPanelTitle">
              <ShieldCheck size={22} />
              <h2>Acessos cadastrados</h2>
            </div>

            <div className="settingsUsersList">
              {users.map(user => (
                <div className="settingsUserCard" key={user.id}>
                  <div className="settingsUserAvatar">{user.name.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <strong>{user.name}</strong>
                    <span>Login: {user.username}</span>
                    <small>{roleLabel[user.role]}</small>
                  </div>
                  {canManage && user.id !== currentUser?.id && (
                    <button className="iconDanger" onClick={() => removeUser(user.id)} title="Remover usuário">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'mesas' && (
        <section className="settingsPanel wideSettingsPanel">
          <div className="settingsPanelTitle">
            <ReceiptText size={22} />
            <h2>Configuração das mesas</h2>
          </div>

          <div className="tableSettingsGrid">
            <label>
              <span>Quantidade de mesas do salão</span>
              <input type="number" min="1" max="80" value={tableQty} onChange={event => setTableQty(event.target.value)} />
            </label>

            <div className="tableSettingsPreview">
              <strong>{tables.length}</strong>
              <span>mesas cadastradas agora</span>
            </div>

            <button className="primaryBtn fit" type="button" onClick={applyTableQty} disabled={!canManage}>
              Salvar mesas
            </button>
          </div>

          <div className="settingsNotice">
            <Utensils size={18} />
            Ao aumentar mesas, novas mesas entram como livres. Ao diminuir, as últimas mesas são removidas da visualização.
          </div>
        </section>
      )}

      {activeTab === 'sistema' && (
        <section className="settingsPanel wideSettingsPanel">
          <div className="settingsPanelTitle">
            <Settings size={22} />
            <h2>Preferências do sistema</h2>
          </div>

          <div className="systemSettingsGrid">
            <div>
              <Store size={22} />
              <strong>Nome do estabelecimento</strong>
              <span>Fogão a Lenha</span>
            </div>
            <div>
              <Printer size={22} />
              <strong>Impressão</strong>
              <span>Somente cozinha, churrasco e sucos.</span>
            </div>
            <div>
              <KeyRound size={22} />
              <strong>Senha de cancelamento</strong>
              <span>Administrador ou gerente autorizam pelo próprio login/senha.</span>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
