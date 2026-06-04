import { Flame, LayoutDashboard, ReceiptText, BarChart3, LogOut, Users } from 'lucide-react'

const baseMenu = [
  { key: 'mesas', label: 'Mesas', icon: ReceiptText },
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'relatorios', label: 'Relatórios', icon: BarChart3 },
]

const roleLabel = {
  admin: 'Administrador',
  gerente: 'Gerente',
  garcom: 'Garçom'
}

export default function Sidebar({ page, setPage, onLogout, currentUser }) {
  const menu = currentUser?.role === 'admin'
    ? [...baseMenu, { key: 'usuarios', label: 'Usuários', icon: Users }]
    : baseMenu

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brandIcon"><Flame size={26} /></div>
        <div>
          <strong>Fogão a Lenha</strong>
          <span>Gestão da churrascaria</span>
        </div>
      </div>

      <div className="loggedUserBox">
        <strong>{currentUser?.name}</strong>
        <span>{roleLabel[currentUser?.role] || 'Usuário'}</span>
      </div>

      <nav>
        {menu.map(item => {
          const Icon = item.icon
          return (
            <button
              key={item.key}
              className={`navItem ${page === item.key ? 'active' : ''}`}
              onClick={() => setPage(item.key)}
            >
              <Icon size={19} />
              {item.label}
            </button>
          )
        })}
      </nav>

      <button className="logout" onClick={onLogout}>
        <LogOut size={18} />
        Sair
      </button>
    </aside>
  )
}
