function isWaiterView() {
  const navText = Array.from(document.querySelectorAll('.sidebar nav button')).map(button => button.textContent.trim()).join(' ')
  return navText.includes('Mesas') && navText.includes('Pedidos enviados') && !navText.includes('Dashboard')
}

function hideSummaryForWaiter() {
  const page = document.querySelector('.restaurantTablesPage')
  if (!page) return

  const summaryGrid = page.querySelector('.restaurantSummaryGrid')
  if (!summaryGrid) return

  if (isWaiterView()) {
    summaryGrid.style.display = 'none'
    page.classList.add('waiterTablesView')
  } else {
    summaryGrid.style.display = ''
    page.classList.remove('waiterTablesView')
  }
}

const waiterSummaryStyle = document.createElement('style')
waiterSummaryStyle.textContent = `
  .restaurantTablesPage.waiterTablesView .restaurantSummaryGrid {
    display: none !important;
  }
`
document.head.appendChild(waiterSummaryStyle)

new MutationObserver(hideSummaryForWaiter).observe(document.body, { childList: true, subtree: true })
window.addEventListener('DOMContentLoaded', hideSummaryForWaiter)
setTimeout(hideSummaryForWaiter, 300)
