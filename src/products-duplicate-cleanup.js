function cleanupDuplicateProductsPanels() {
  const page = document.querySelector('.settingsPremiumPage')
  if (!page) return

  const panels = Array.from(page.querySelectorAll('[data-products-panel="true"], .productsSettingsTab'))
    .filter((panel, index, list) => list.indexOf(panel) === index)

  if (panels.length > 1) {
    const keep = panels[panels.length - 1]
    panels.forEach(panel => {
      if (panel !== keep) panel.remove()
    })
  }

  const activePanel = page.querySelector('[data-products-panel="true"], .productsSettingsTab')
  if (!activePanel) return

  const lists = Array.from(activePanel.querySelectorAll('.productsListPanel'))
  if (lists.length > 1) {
    const keepList = lists[lists.length - 1]
    lists.forEach(list => {
      if (list !== keepList) list.remove()
    })
  }
}

const productsDuplicateObserver = new MutationObserver(() => cleanupDuplicateProductsPanels())
productsDuplicateObserver.observe(document.body, { childList: true, subtree: true })
window.addEventListener('DOMContentLoaded', cleanupDuplicateProductsPanels)
window.addEventListener('load', cleanupDuplicateProductsPanels)
setInterval(cleanupDuplicateProductsPanels, 700)
