import { ReceiptText, BarChart3, LogOut, Settings, ChefHat, Calculator, Flame, Cloud, Server, CalendarClock } from 'lucide-react'

const waiterMenu = [
  { key: 'mesas', label: 'Mesas', icon: ReceiptText },
  { key: 'reservas', label: 'Reservas', icon: CalendarClock },
  { key: 'pedidos-cozinha', label: 'Pedidos enviados', icon: ChefHat },
]

const managerMenu = [
  { key: 'mesas', label: 'Mesas', icon: ReceiptText },
  { key: 'reservas', label: 'Reservas', icon: CalendarClock },
  { key: 'pedidos-cozinha', label: 'Pedidos', icon: ChefHat },
  { key: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  { key: 'fechamento', label: 'Fechamento', icon: Calculator },
  { key: 'usuarios', label: 'Configurações', icon: Settings },
]

export default function Sidebar({ page, setPage, onLogout, currentUser, runtimeConfig }) {
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

      <div className={`environmentCard ${runtimeConfig?.mode === 'local' ? 'local' : 'online'}`}>
        {runtimeConfig?.mode === 'local' ? <Server size={17} /> : <Cloud size={17} />}
        <div><strong>{runtimeConfig?.mode === 'local' ? 'Modo local' : 'Modo online'}</strong><span>{runtimeConfig?.label}</span></div>
        {runtimeConfig?.mode === 'local' && runtimeConfig?.onlineUrl && <a href={runtimeConfig.onlineUrl} target="_blank" rel="noreferrer">Abrir online</a>}
        {runtimeConfig?.mode === 'online' && runtimeConfig?.localUrl && <a href={runtimeConfig.localUrl} target="_blank" rel="noreferrer">Abrir local</a>}
      </div>

      <div className="sidebarLogoutArea">
        <button className="logoutBtn" onClick={onLogout}>
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  )
}
