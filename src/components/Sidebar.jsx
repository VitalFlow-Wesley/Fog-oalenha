import { LayoutDashboard, ReceiptText, BarChart3, LogOut, Users } from 'lucide-react'
import fogaoLogo from '../assets/fogao-logo.png'

const baseMenu = [
  { key: 'mesas', label: 'Mesas', icon: ReceiptText },
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'relatorios', label: 'Relatórios', icon: BarChart3 },
]

export default function Sidebar({ page, setPage, onLogout, currentUser }) {
  const menu = currentUser?.role === 'admin'
    ? [...baseMenu, { key: 'usuarios', label: 'Usuários', icon: Users }]
    : baseMenu

  return (
    <aside className="sidebar premiumSidebar compactSidebar">
      <div className="brand sidebarLogoBrand">
        <img src={fogaoLogo} alt="Logo Fogão a Lenha" />
        <span>Gestão da churrascaria</span>
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
