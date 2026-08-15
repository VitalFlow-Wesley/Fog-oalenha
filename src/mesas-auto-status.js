const MESAS_STATUS_INTERVAL_MS = 5 * 60 * 1000
let mesasStatusTimer = null

function formatMesasStatusTime(date = new Date()) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function updateMesasStatusCard() {
  const card = document.querySelector('[data-mesas-status-card]')
  if (!card) return
  card.querySelector('[data-mesas-status-time]').textContent = formatMesasStatusTime()
}

function enhanceMesasStatus() {
  const page = document.querySelector('.restaurantTablesPage')
  if (!page) return

  const actions = page.querySelector('.headerActions')
  if (!actions) return

  actions.querySelector('.updatedPill')?.remove()
  actions.querySelector('.refreshBtn')?.remove()
  actions.querySelector('[data-mesas-status-card]')?.remove()

  if (!mesasStatusTimer) {
    mesasStatusTimer = window.setInterval(updateMesasStatusCard, MESAS_STATUS_INTERVAL_MS)
  }
}

const mesasStatusStyle = document.createElement('style')
mesasStatusStyle.textContent = `
  .restaurantTablesPage .headerActions {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    gap: 10px !important;
    flex-wrap: nowrap !important;
  }

  .restaurantTablesPage .updatedPill,
  .restaurantTablesPage .refreshBtn,
  .restaurantTablesPage .mesasSystemStatusCard {
    display: none !important;
  }

  .restaurantTablesPage .headerActions .primaryBtn {
    width: auto !important;
    min-width: 230px !important;
    max-width: 250px !important;
    height: 48px !important;
    min-height: 48px !important;
    padding: 0 22px !important;
    white-space: nowrap !important;
  }

  @media (max-width: 1120px) {
    .restaurantTablesPage .headerActions {
      align-items: stretch !important;
      flex-direction: column !important;
    }

    .restaurantTablesPage .headerActions .primaryBtn {
      width: 100% !important;
      max-width: none !important;
    }
  }
`
document.head.appendChild(mesasStatusStyle)

new MutationObserver(enhanceMesasStatus).observe(document.body, { childList: true, subtree: true })
window.addEventListener('DOMContentLoaded', enhanceMesasStatus)
setTimeout(enhanceMesasStatus, 300)
