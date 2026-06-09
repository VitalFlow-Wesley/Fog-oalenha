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
