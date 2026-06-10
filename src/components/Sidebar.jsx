import { ReceiptText, BarChart3, LogOut, Settings, ChefHat, Calculator, Flame } from 'lucide-react'

const waiterMenu = [
  { key: 'mesas', label: 'Mesas', icon: ReceiptText },
  { key: 'pedidos-cozinha', label: 'Pedidos enviados', icon: ChefHat },
]

const managerMenu = [
  { key: 'mesas', label: 'Mesas', icon: ReceiptText },
  { key: 'pedidos-cozinha', label: 'Pedidos', icon: ChefHat },
  { key: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  { key: 'fechamento', label: 'Fechamento', icon: Calculator },
  { key: 'usuarios', label: 'Configurações', icon: Settings },
]

export default function Sidebar({ page, setPage, onLogout, currentUser }) {
  const canSeeManagement = currentUser?.role === 'admin' || currentUser?.role === 'gerente'
  const menu = canSeeManagement ? managerMenu : waiterMenu

  return (
    <aside className="sidebar premiumSidebar compactSidebar">
      <div className="brand sidebarLogoBrand officialLogoBrand">
        <div className="sidebarOfficialLogoWrap">
          <img
            className="sidebarOfficialLogo"
            src="/assets/logooficial.png"
            alt="Logo Fogão a Lenha"
            onError={event => {
              event.currentTarget.style.display = 'none'
              event.currentTarget.nextElementSibling?.classList.remove('hiddenLogoFallback')
            }}
          />
          <span className="sidebarLogoFallback hiddenLogoFallback" aria-hidden="true">
            <Flame size={27} />
          </span>
        </div>
        <div className="sidebarLogoText officialLogoText">
          <span>Gestão da churrascaria</span>
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

      <div className="sidebarLogoutArea">
        <button className="logoutBtn" onClick={onLogout}>
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  )
}
