import { LayoutDashboard, ReceiptText, BarChart3, LogOut, Users, ChevronDown } from 'lucide-react'
import fogaoLogo from '../assets/fogaoLogo.js'

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
    <aside className="sidebar premiumSidebar">
      <div className="brand sidebarLogoBrand">
        <img src={fogaoLogo} alt="Logo Fogão a Lenha" />
        <span>Gestão da churrascaria</span>
      </div>

      <div className="loggedUserBox premiumUserBox">
        <div className="userAvatar">👤</div>
        <div>
          <strong>{currentUser?.name || 'Administrador'}</strong>
          <span>{roleLabel[currentUser?.role] || 'Administrador'}</span>
        </div>
        <ChevronDown size={18} />
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
              <Icon size={20} />
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
