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

  if (!actions.querySelector('[data-mesas-status-card]')) {
    const card = document.createElement('div')
    card.className = 'mesasSystemStatusCard'
    card.dataset.mesasStatusCard = 'true'
    card.innerHTML = `
      <div class="mesasSystemStatusIcon">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5.5 5.7v5.5c0 4.1 2.7 7.8 6.5 9.1 3.8-1.3 6.5-5 6.5-9.1V5.7L12 3Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="m8.8 12 2.1 2.1 4.4-4.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div class="mesasSystemStatusText">
        <strong>Sistema ativo</strong>
        <small>Última atualização: <span data-mesas-status-time>${formatMesasStatusTime()}</span> <b></b></small>
      </div>`
    actions.appendChild(card)
  }

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
  .restaurantTablesPage .refreshBtn {
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

  .mesasSystemStatusCard {
    width: 230px;
    height: 72px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border: 1px solid #ead7bf;
    border-radius: 18px;
    background: rgba(255, 253, 248, .94);
    box-shadow: 0 12px 26px rgba(77, 43, 26, .07);
    color: #2d140e;
    flex: 0 0 auto;
  }

  .mesasSystemStatusIcon {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    color: #168447;
    flex: 0 0 38px;
  }

  .mesasSystemStatusIcon svg {
    width: 31px;
    height: 31px;
  }

  .mesasSystemStatusText {
    min-width: 0;
  }

  .mesasSystemStatusText strong {
    display: block;
    color: #168447;
    font-size: 17px;
    font-weight: 900;
    line-height: 1.05;
    white-space: nowrap;
  }

  .mesasSystemStatusText small {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 6px;
    color: #8a6b58;
    font-size: 12px;
    line-height: 1;
    white-space: nowrap;
  }

  .mesasSystemStatusText b {
    width: 8px;
    height: 8px;
    display: inline-block;
    border-radius: 999px;
    background: #168447;
    flex: 0 0 8px;
  }

  @media (max-width: 1120px) {
    .restaurantTablesPage .headerActions {
      align-items: stretch !important;
      flex-direction: column !important;
    }

    .mesasSystemStatusCard,
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
