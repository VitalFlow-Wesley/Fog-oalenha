const WAITER_NAME_SELECTORS = ['.closingPage', '.reportsPremiumPage', '.kitchenOrdersPage', '.restaurantTablesPage']

function normalizeWaiterName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function getFirstName(fullName) {
  return normalizeWaiterName(fullName).split(' ')[0] || ''
}

function getShortWaiterName(fullName, duplicateFirstNames) {
  const parts = normalizeWaiterName(fullName).split(' ').filter(Boolean)
  if (!parts.length) return ''
  if (duplicateFirstNames.has(parts[0].toLowerCase()) && parts.length > 1) return `${parts[0]} ${parts[1]}`
  return parts[0]
}

function readTables() {
  try {
    return JSON.parse(localStorage.getItem('fogao-tables-v1') || '[]') || []
  } catch {
    return []
  }
}

function collectKnownWaiterNames() {
  const names = new Set()
  readTables().forEach(table => {
    ;['waiterName', 'kitchenWaiterName', 'openedByName', 'createdByName'].forEach(key => {
      const name = normalizeWaiterName(table?.[key])
      if (name && name !== 'Sem garçom') names.add(name)
    })
  })
  return Array.from(names).filter(name => name.split(' ').length > 1)
}

function buildWaiterNameMap() {
  const fullNames = collectKnownWaiterNames()
  const counts = fullNames.reduce((acc, name) => {
    const first = getFirstName(name).toLowerCase()
    acc[first] = (acc[first] || 0) + 1
    return acc
  }, {})
  const duplicateFirstNames = new Set(Object.keys(counts).filter(first => counts[first] > 1))

  return fullNames
    .map(fullName => ({ fullName, display: getShortWaiterName(fullName, duplicateFirstNames) }))
    .filter(item => item.display && item.fullName !== item.display)
    .sort((a, b) => b.fullName.length - a.fullName.length)
}

function shortenWaiterNames(root = document.body) {
  const nameMap = buildWaiterNameMap()
  if (!nameMap.length) return

  WAITER_NAME_SELECTORS.forEach(selector => {
    root.querySelectorAll?.(selector).forEach(target => {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT)
      const textNodes = []
      while (walker.nextNode()) textNodes.push(walker.currentNode)
      textNodes.forEach(node => {
        let text = node.nodeValue
        let changed = false
        nameMap.forEach(({ fullName, display }) => {
          if (text.includes(fullName)) {
            text = text.split(fullName).join(display)
            changed = true
          }
        })
        if (changed) node.nodeValue = text
      })
    })
  })
}

let waiterDisplayTimer = null
function scheduleWaiterDisplayFix() {
  clearTimeout(waiterDisplayTimer)
  waiterDisplayTimer = setTimeout(() => shortenWaiterNames(), 100)
}

new MutationObserver(scheduleWaiterDisplayFix).observe(document.body, { childList: true, subtree: true, characterData: true })
window.addEventListener('DOMContentLoaded', scheduleWaiterDisplayFix)
window.addEventListener('storage', scheduleWaiterDisplayFix)
window.addEventListener('beforeprint', () => shortenWaiterNames())
setTimeout(scheduleWaiterDisplayFix, 250)
