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
  .kitchenOrdersPage .kitchenPrimaryBtn,
  .kitchenOrdersPage .periodSelectWrap,
  .kitchenOrdersPage .kitchenLightBtn {
    display: none !important;
  }

  .kitchenOrdersHeaderRefined {
    grid-template-columns: minmax(280px, 1fr) minmax(420px, 620px) !important;
    align-items: start !important;
  }

  .kitchenOrdersPage .kitchenActionsRefined {
    max-width: 620px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    gap: 10px !important;
    margin-top: 24px !important;
  }

  .kitchenOrdersPage .kitchenTopActions,
  .kitchenOrdersPage .kitchenBottomActions {
    display: contents !important;
  }

  .kitchenOrdersPage .kitchenSearch {
    order: 1 !important;
    flex: 1 1 100% !important;
    width: 100% !important;
    min-width: 360px !important;
    max-width: 620px !important;
    height: 56px !important;
    min-height: 56px !important;
    box-sizing: border-box !important;
    border-radius: 18px !important;
  }

  @media (max-width: 1180px) {
    .kitchenOrdersHeaderRefined {
      grid-template-columns: 1fr !important;
      align-items: start !important;
    }

    .kitchenOrdersPage .kitchenActionsRefined {
      max-width: none !important;
      justify-content: stretch !important;
      margin-top: 4px !important;
    }

    .kitchenOrdersPage .kitchenSearch {
      max-width: none !important;
    }
  }

  @media (max-width: 760px) {
    .kitchenOrdersPage .kitchenActionsRefined {
      display: grid !important;
      grid-template-columns: 1fr !important;
    }

    .kitchenOrdersPage .kitchenSearch {
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
