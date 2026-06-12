import './encoding-repair-runtime.js'
import './native-edit-modal-runtime.js'
import { repairData, repairText } from './text-normalizer.js'

const PRODUCT_CONFIG_KEY = 'fogao-a-lenha-products-settings'
const PRODUCT_COMMAND_KEY = 'fogao-products-v1'
let lastProductsPayload = ''

function normalizeSavedProduct(product) {
  const fixedProduct = repairData(product)
  const category = fixedProduct.category || 'Outros'
  const sector = fixedProduct.sector || fixedProduct.localSaida || 'Bar / Caixa'
  const prepare = fixedProduct.prepare ?? fixedProduct.imprimeCozinha ?? !['Bebidas', 'Bombons', 'Salgadinhos', 'Sorvetes', 'Sobremesas'].includes(category)
  return {
    ...fixedProduct,
    name: repairText(fixedProduct.name || 'Produto'),
    category,
    sector,
    localSaida: fixedProduct.localSaida || sector,
    prepare,
    imprimeCozinha: prepare,
    status: fixedProduct.status || 'Ativo',
  }
}

function syncProductsStorage() {
  try {
    const configRaw = localStorage.getItem(PRODUCT_CONFIG_KEY)
    const commandRaw = localStorage.getItem(PRODUCT_COMMAND_KEY)
    const sourceRaw = configRaw || commandRaw
    if (!sourceRaw || sourceRaw === lastProductsPayload) return

    const products = repairData(JSON.parse(sourceRaw))
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
