function isWaiterView() {
  const navText = Array.from(document.querySelectorAll('.sidebar nav button')).map(button => button.textContent.trim()).join(' ')
  return navText.includes('Mesas') && navText.includes('Pedidos enviados') && !navText.includes('Dashboard')
}

function hideRevenueForWaiter() {
  const page = document.querySelector('.restaurantTablesPage')
  if (!page) return

  const revenueCard = page.querySelector('.restaurantSummaryCard.revenue')
  if (!revenueCard) return

  if (isWaiterView()) {
    revenueCard.style.display = 'none'
    page.classList.add('waiterTablesView')
  } else {
    revenueCard.style.display = ''
    page.classList.remove('waiterTablesView')
  }
}

const waiterRevenueStyle = document.createElement('style')
waiterRevenueStyle.textContent = `
  .restaurantTablesPage.waiterTablesView .restaurantSummaryGrid {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }

  @media (max-width: 980px) {
    .restaurantTablesPage.waiterTablesView .restaurantSummaryGrid {
      grid-template-columns: 1fr !important;
    }
  }
`
document.head.appendChild(waiterRevenueStyle)

new MutationObserver(hideRevenueForWaiter).observe(document.body, { childList: true, subtree: true })
window.addEventListener('DOMContentLoaded', hideRevenueForWaiter)
setTimeout(hideRevenueForWaiter, 300)
