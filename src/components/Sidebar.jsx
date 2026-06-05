import { LayoutDashboard, ReceiptText, BarChart3, LogOut, Settings, ChefHat } from 'lucide-react'
import fogaoLogo from '../assets/fogao-logo.png'

const waiterMenu = [
  { key: 'mesas', label: 'Mesas', icon: ReceiptText },
]

const managerMenu = [
  { key: 'mesas', label: 'Mesas', icon: ReceiptText },
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'pedidos-cozinha', label: 'Pedidos', icon: ChefHat },
  { key: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  { key: 'usuarios', label: 'Configurações', icon: Settings },
]

export default function Sidebar({ page, setPage, onLogout, currentUser }) {
  const canSeeManagement = currentUser?.role === 'admin' || currentUser?.role === 'gerente'
  const menu = canSeeManagement ? managerMenu : waiterMenu

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
