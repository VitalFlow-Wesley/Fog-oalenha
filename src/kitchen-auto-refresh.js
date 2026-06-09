function isKitchenOrdersPage() {
  return Boolean(document.querySelector('.kitchenOrdersPage'))
}

function hideManualKitchenRefresh() {
  const page = document.querySelector('.kitchenOrdersPage')
  if (!page) return

  const buttons = Array.from(page.querySelectorAll('button'))
  const refreshButton = buttons.find(button => button.textContent.trim().includes('Atualizar'))
  if (refreshButton) refreshButton.style.display = 'none'
}

function clickHiddenKitchenRefresh() {
  const page = document.querySelector('.kitchenOrdersPage')
  if (!page) return

  const buttons = Array.from(page.querySelectorAll('button'))
  const refreshButton = buttons.find(button => button.textContent.trim().includes('Atualizar'))
  refreshButton?.click()
}

const kitchenAutoRefreshStyle = document.createElement('style')
kitchenAutoRefreshStyle.textContent = `
  .kitchenOrdersPage .kitchenPrimaryBtn {
    display: none !important;
  }

  .kitchenOrdersHeaderRefined {
    grid-template-columns: minmax(280px, 1fr) minmax(560px, 680px) !important;
    align-items: center !important;
  }

  .kitchenOrdersPage .kitchenActionsRefined {
    max-width: 680px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    gap: 10px !important;
  }

  .kitchenOrdersPage .kitchenTopActions,
  .kitchenOrdersPage .kitchenBottomActions {
    display: contents !important;
  }

  .kitchenOrdersPage .kitchenSearch {
    order: 1 !important;
    flex: 1 1 360px !important;
    width: auto !important;
    min-width: 320px !important;
    max-width: none !important;
    min-height: 48px !important;
    border-radius: 16px !important;
  }

  .kitchenOrdersPage .periodSelectWrap {
    order: 2 !important;
    flex: 0 0 132px !important;
    width: 132px !important;
  }

  .kitchenOrdersPage .kitchenLightBtn {
    order: 3 !important;
    flex: 0 0 138px !important;
    width: 138px !important;
    min-height: 48px !important;
    border-radius: 16px !important;
  }

  .kitchenOrdersPage .kitchenPeriodBtn {
    min-height: 48px !important;
    border-radius: 16px !important;
  }

  .kitchenOrdersPage .kitchenPeriodMenu {
    right: auto !important;
    left: 0 !important;
  }

  @media (max-width: 1180px) {
    .kitchenOrdersHeaderRefined {
      grid-template-columns: 1fr !important;
      align-items: start !important;
    }

    .kitchenOrdersPage .kitchenActionsRefined {
      max-width: none !important;
      justify-content: stretch !important;
    }
  }

  @media (max-width: 760px) {
    .kitchenOrdersPage .kitchenActionsRefined {
      display: grid !important;
      grid-template-columns: 1fr !important;
    }

    .kitchenOrdersPage .kitchenSearch,
    .kitchenOrdersPage .periodSelectWrap,
    .kitchenOrdersPage .kitchenLightBtn {
      width: 100% !important;
      min-width: 0 !important;
      flex: none !important;
    }
  }
`
document.head.appendChild(kitchenAutoRefreshStyle)

new MutationObserver(() => {
  if (!isKitchenOrdersPage()) return
  hideManualKitchenRefresh()
}).observe(document.body, { childList: true, subtree: true })

window.addEventListener('DOMContentLoaded', hideManualKitchenRefresh)
window.addEventListener('fogao-products-updated', clickHiddenKitchenRefresh)
window.addEventListener('storage', clickHiddenKitchenRefresh)
setInterval(clickHiddenKitchenRefresh, 5 * 60 * 1000)
setTimeout(hideManualKitchenRefresh, 300)
