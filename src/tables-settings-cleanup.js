function cleanTablesSettings() {
  const page = document.querySelector('.tablesSettingsPage')
  if (!page) return

  const summary = page.querySelector('.tableSummaryGrid')
  if (summary) summary.remove()

  page.querySelectorAll('label span').forEach(span => {
    const text = span.textContent.trim()
    if (text === 'Quantidade de mesas do salão') span.textContent = 'Mesas do salão'
  })
}

const tablesCleanupStyle = document.createElement('style')
tablesCleanupStyle.textContent = `
  .tablesSettingsPage .tableSummaryGrid {
    display: none !important;
  }

  .tablesSettingsPage .tablesSettingsLayout {
    margin-top: 0 !important;
  }
`
document.head.appendChild(tablesCleanupStyle)

new MutationObserver(cleanTablesSettings).observe(document.body, { childList: true, subtree: true })
window.addEventListener('DOMContentLoaded', cleanTablesSettings)
setTimeout(cleanTablesSettings, 300)
