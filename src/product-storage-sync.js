import './encoding-repair-runtime.js'
import './native-edit-modal-runtime.js'

const PRODUCT_CONFIG_KEY = 'fogao-a-lenha-products-settings'
const PRODUCT_COMMAND_KEY = 'fogao-products-v1'
let lastProductsPayload = ''

function normalizeSavedProduct(product) {
  const category = product.category || 'Outros'
  const sector = product.sector || product.localSaida || 'Bar / Caixa'
  const prepare = product.prepare ?? product.imprimeCozinha ?? !['Bebidas', 'Bombons', 'Salgadinhos', 'Sorvetes', 'Sobremesas'].includes(category)
  return {
    ...product,
    category,
    sector,
    localSaida: product.localSaida || sector,
    prepare,
    imprimeCozinha: prepare,
    status: product.status || 'Ativo',
  }
}

function syncProductsStorage() {
  try {
    const configRaw = localStorage.getItem(PRODUCT_CONFIG_KEY)
    const commandRaw = localStorage.getItem(PRODUCT_COMMAND_KEY)
    const sourceRaw = configRaw || commandRaw
    if (!sourceRaw || sourceRaw === lastProductsPayload) return

    const products = JSON.parse(sourceRaw)
    if (!Array.isArray(products)) return

    const normalized = products.map(normalizeSavedProduct)
    const payload = JSON.stringify(normalized)
    lastProductsPayload = payload
    localStorage.setItem(PRODUCT_CONFIG_KEY, payload)
    localStorage.setItem(PRODUCT_COMMAND_KEY, payload)
    window.dispatchEvent(new Event('fogao-products-updated'))
  } catch {
    // Não interrompe a tela se algum dado antigo estiver inválido.
  }
}

window.addEventListener('storage', syncProductsStorage)
window.addEventListener('fogao-products-updated', syncProductsStorage)
setInterval(syncProductsStorage, 800)
setTimeout(syncProductsStorage, 200)
