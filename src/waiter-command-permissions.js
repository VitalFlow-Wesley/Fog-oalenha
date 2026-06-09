function isWaiterSessionView() {
  const sidebarText = Array.from(document.querySelectorAll('.sidebar nav button'))
    .map(button => button.textContent.trim())
    .join(' ')

  return sidebarText.includes('Mesas') && sidebarText.includes('Pedidos enviados') && !sidebarText.includes('Dashboard')
}

function applyWaiterCommandPermissions() {
  const isWaiter = isWaiterSessionView()

  document.querySelectorAll('.commandDrawer .commandDanger').forEach(button => {
    if (isWaiter && button.textContent.trim().includes('Fechar mesa')) {
      button.style.display = 'none'
      button.disabled = true
    } else {
      button.style.display = ''
      button.disabled = false
    }
  })
}

new MutationObserver(applyWaiterCommandPermissions).observe(document.body, { childList: true, subtree: true })
window.addEventListener('DOMContentLoaded', applyWaiterCommandPermissions)
setTimeout(applyWaiterCommandPermissions, 300)
