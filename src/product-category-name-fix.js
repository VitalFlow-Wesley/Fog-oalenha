import './printer-settings-runtime.js'

const PRODUCTS_KEY = 'fogao-products-v1'

const categoryMap = new Map([
  ['refeicao', 'Refeições'],
  ['refeicoes', 'Refeições'],
  ['refeicoeses', 'Refeições'],
  ['refeições', 'Refeições'],
  ['refeiçõeses', 'Refeições'],
  ['churrasco', 'Churrascos'],
  ['churrascos', 'Churrascos'],
  ['bebida', 'Bebidas'],
  ['bebidas', 'Bebidas'],
  ['suco', 'Sucos'],
  ['sucos', 'Sucos'],
  ['petisco', 'Petiscos'],
  ['petiscos', 'Petiscos'],
  ['bombom', 'Bombons'],
  ['bombons', 'Bombons'],
  ['salgadinho', 'Salgadinhos'],
  ['salgadinhos', 'Salgadinhos'],
  ['sorvete', 'Sorvetes'],
  ['sorvetes', 'Sorvetes'],
  ['sobremesa', 'Sobremesas'],
  ['sobremesas', 'Sobremesas'],
])

function key(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function normalizeCategory(value) {
  return categoryMap.get(key(value)) || String(value || '').trim()
}

function migrateStoredProducts() {
  try {
    const products = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]')
    if (!Array.isArray(products) || !products.length) return

    let changed = false
    const normalized = products.map(product => {
      const category = normalizeCategory(product?.category)
      if (!category || category === product?.category) return product
      changed = true
      return { ...product, category }
    })

    if (changed) {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(normalized))
      window.dispatchEvent(new Event('fogao-products-updated'))
    }
  } catch {
    // Mantém o app funcionando caso exista dado inválido no navegador.
  }
}

function fixVisibleCategoryLabels() {
  document.querySelectorAll('.commandCategoryTabs button').forEach(button => {
    const corrected = normalizeCategory(button.textContent)
    if (corrected && button.textContent.trim() !== corrected) {
      button.textContent = corrected
    }
  })
}

let scheduled = false
function scheduleFix() {
  if (scheduled) return
  scheduled = true
  requestAnimationFrame(() => {
    scheduled = false
    migrateStoredProducts()
    fixVisibleCategoryLabels()
  })
}

new MutationObserver(scheduleFix).observe(document.documentElement, {
  childList: true,
  subtree: true,
})

window.addEventListener('DOMContentLoaded', scheduleFix)
window.addEventListener('storage', scheduleFix)
window.addEventListener('fogao-products-updated', fixVisibleCategoryLabels)
window.setTimeout(scheduleFix, 250)
