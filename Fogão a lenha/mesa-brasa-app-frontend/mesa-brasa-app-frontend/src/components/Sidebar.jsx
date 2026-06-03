import { Flame, Home, LayoutDashboard, ReceiptText, BarChart3, LogOut } from 'lucide-react'

const menu = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'mesas', label: 'Mesas', icon: ReceiptText },
  { key: 'relatorios', label: 'Relatórios', icon: BarChart3 },
]

export default function Sidebar({ page, setPage, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brandIcon"><Flame size={26} /></div>
        <div>
          <strong>Mesa & Brasa</strong>
          <span>Churrascaria familiar</span>
        </div>
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
