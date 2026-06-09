const MESAS_STATUS_INTERVAL_MS = 5 * 60 * 1000
let mesasStatusTimer = null

function formatMesasStatusTime(date = new Date()) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function updateMesasStatusCard() {
  const card = document.querySelector('[data-mesas-status-card]')
  if (!card) return
  const time = formatMesasStatusTime()
  card.querySelector('[data-mesas-status-time]').textContent = `Última atualização: ${time}`
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
      <div class="mesasSystemStatusIcon">✓</div>
      <div>
        <strong>Sistema ativo</strong>
        <span><span data-mesas-status-time>Última atualização: ${formatMesasStatusTime()}</span> <b></b></span>
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
    gap: 12px !important;
  }

  .restaurantTablesPage .updatedPill,
  .restaurantTablesPage .refreshBtn {
    display: none !important;
  }

  .mesasSystemStatusCard {
    min-width: 230px;
    min-height: 66px;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 18px;
    border: 1px solid #ead7bf;
    border-radius: 18px;
    background: rgba(255, 253, 248, .94);
    box-shadow: 0 14px 30px rgba(77, 43, 26, .08);
    color: #2d140e;
  }

  .mesasSystemStatusIcon {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    color: #168447;
    border: 2px solid #168447;
    font-weight: 900;
    font-size: 20px;
    line-height: 1;
  }

  .mesasSystemStatusCard strong {
    display: block;
    color: #168447;
    font-size: 18px;
    font-weight: 900;
    line-height: 1.05;
  }

  .mesasSystemStatusCard span {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
    color: #8a6b58;
    font-size: 13px;
  }

  .mesasSystemStatusCard b {
    width: 8px;
    height: 8px;
    display: inline-block;
    border-radius: 999px;
    background: #168447;
  }

  @media (max-width: 1120px) {
    .restaurantTablesPage .headerActions {
      align-items: stretch !important;
      flex-direction: column !important;
    }

    .mesasSystemStatusCard,
    .restaurantTablesPage .headerActions .primaryBtn {
      width: 100% !important;
    }
  }
`
document.head.appendChild(mesasStatusStyle)

new MutationObserver(enhanceMesasStatus).observe(document.body, { childList: true, subtree: true })
window.addEventListener('DOMContentLoaded', enhanceMesasStatus)
setTimeout(enhanceMesasStatus, 300)
