const PRODUCT_STORAGE_KEY = 'fogao-a-lenha-products-settings'
const PRODUCTS_PER_PAGE = 7

const defaultProducts = [
  { id: 1, name: 'Galinha caipira', category: 'Refeições', sector: 'Cozinha', price: 55, prepare: true, status: 'Ativo' },
  { id: 2, name: 'Picanha', category: 'Churrascos', sector: 'Churrasco', price: 85, prepare: true, status: 'Ativo' },
  { id: 3, name: 'Suco de cajá', category: 'Sucos', sector: 'Sucos', price: 8, prepare: true, status: 'Ativo' },
  { id: 4, name: 'Coca-Cola 600ml', category: 'Bebidas', sector: 'Bar / Caixa', price: 9, prepare: false, status: 'Ativo' },
  { id: 5, name: 'Água mineral 500ml', category: 'Bebidas', sector: 'Bar / Caixa', price: 5, prepare: false, status: 'Ativo' },
  { id: 6, name: 'Batata frita', category: 'Petiscos', sector: 'Cozinha', price: 25, prepare: true, status: 'Ativo' },
  { id: 7, name: 'Salgadinho de queijo', category: 'Salgadinhos', sector: 'Bar / Caixa', price: 12, prepare: false, status: 'Ativo' },
]

const categories = ['Refeições', 'Churrascos', 'Petiscos', 'Sucos', 'Bebidas', 'Bombons', 'Salgadinhos', 'Sorvetes', 'Sobremesas', 'Outros']
const sectors = ['Cozinha', 'Churrasco', 'Sucos', 'Bar / Caixa']
const noPrepareCategories = ['Bebidas', 'Bombons', 'Salgadinhos', 'Sorvetes', 'Sobremesas']

function formatMoney(value) {
  const number = Number(value || 0)
  return `R$ ${number.toFixed(2).replace('.', ',')}`
}

function parsePrice(value) {
  return Number(String(value || '0').replace(/[^0-9,.-]/g, '').replace(',', '.')) || 0
}

function normalizeProduct(product) {
  return {
    ...product,
    category: product.category === 'Churrasco' ? 'Churrascos' : product.category,
  }
}

function loadProducts() {
  try {
    const saved = JSON.parse(localStorage.getItem(PRODUCT_STORAGE_KEY) || 'null')
    const list = Array.isArray(saved) && saved.length ? saved : defaultProducts
    return list.map(normalizeProduct)
  } catch {
    return defaultProducts
  }
}

function saveProducts(products) {
  localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(products.map(normalizeProduct)))
}

function optionList(items, selected = '') {
  return items.map(item => `<option value="${item}" ${selected === item ? 'selected' : ''}>${item}</option>`).join('')
}

function sectorIcon(sector) {
  if (sector === 'Cozinha') return '👨‍🍳'
  if (sector === 'Churrasco') return '🥩'
  if (sector === 'Sucos') return '🥤'
  return '🥛'
}

function getFilteredProducts(products, search, status) {
  const term = search.trim().toLowerCase()
  return products.filter(product => {
    const matchesStatus = status === 'Todos os status' || product.status === status
    const matchesTerm = !term || [product.name, product.category, product.sector].join(' ').toLowerCase().includes(term)
    return matchesStatus && matchesTerm
  })
}

function getPaginationButtons(totalPages, currentPage) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
  const visible = totalPages <= 6 ? pages : [1, 2, 3, 'dots', totalPages]
  return `
    <button type="button" data-page="${Math.max(1, currentPage - 1)}" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button>
    ${visible.map(page => page === 'dots'
      ? '<button type="button" disabled>...</button>'
      : `<button type="button" data-page="${page}" class="${page === currentPage ? 'active' : ''}">${page}</button>`).join('')}
    <button type="button" data-page="${Math.min(totalPages, currentPage + 1)}" ${currentPage === totalPages ? 'disabled' : ''}>Próxima ›</button>
  `
}

function getProductsPanel(products, search = '', status = 'Todos os status', currentPage = 1) {
  const filtered = getFilteredProducts(products, search, status)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PRODUCTS_PER_PAGE))
  const page = Math.min(Math.max(1, currentPage), totalPages)
  const start = (page - 1) * PRODUCTS_PER_PAGE
  const rows = filtered.slice(start, start + PRODUCTS_PER_PAGE).map(product => `
    <div class="productsTableRow" data-product-id="${product.id}">
      <span class="productNameCell">${product.name}</span>
      <span>${product.category}</span>
      <span class="productSectorCell"><b>${sectorIcon(product.sector)}</b> ${product.sector}</span>
      <span>${formatMoney(product.price)}</span>
      <span><em class="prepareBadge ${product.prepare ? 'yes' : 'no'}">${product.prepare ? 'Sim' : 'Não'}</em></span>
      <span><em class="statusBadge ${product.status === 'Ativo' ? 'active' : 'inactive'}">${product.status}</em></span>
      <span class="productActions"><button type="button" data-action="edit" aria-label="Editar ${product.name}" title="Editar produto"><span>✎</span></button><button type="button" data-action="delete" aria-label="Excluir ${product.name}" title="Excluir produto"><span>🗑</span></button></span>
    </div>
  `).join('')

  return `
    <div class="productsSettingsTab" data-products-panel="true" data-current-page="${page}">
      <div class="productsTopGrid">
        <section class="settingsPanel productCreatePanel">
          <div class="settingsPanelTitle"><span class="productTitleIcon">▣</span><h2>Cadastro de produto</h2></div>
          <form class="productForm">
            <label><span>Nome do produto</span><input name="name" placeholder="Ex.: Picanha" /></label>
            <label><span>Categoria</span><select name="category"><option value="">Selecione a categoria</option>${optionList(categories)}</select></label>
            <label><span>Setor de impressão</span><select name="sector"><option value="">Selecione o setor</option>${optionList(sectors)}</select></label>
            <label><span>Preço (R$)</span><input name="price" placeholder="0,00" /></label>
            <label><span>Vai para preparo?</span><select name="prepare"><option value="">Selecione</option><option value="Sim">Sim</option><option value="Não">Não</option></select></label>
            <label><span>Status</span><select name="status"><option value="Ativo">Ativo</option><option value="Inativo">Inativo</option></select></label>
            <button type="submit" class="primaryBtn addProductBtn">＋ Adicionar produto</button>
          </form>
        </section>

        <aside class="settingsPanel productTipsPanel">
          <div class="settingsPanelTitle"><span class="tipCheck">✓</span><h2>Dicas rápidas</h2></div>
          <ul>
            <li>Produtos que vão para preparo serão enviados para o setor selecionado.</li>
            <li>Itens do bar normalmente não vão para preparo.</li>
            <li>Mantenha os preços sempre atualizados.</li>
          </ul>
        </aside>
      </div>

      <section class="settingsPanel productsListPanel">
        <div class="productsListHeader">
          <div class="settingsPanelTitle"><span class="productTitleIcon">▣</span><h2>Lista de produtos cadastrados</h2></div>
          <div class="productsFilters">
            <label><input class="productSearchInput" value="${search}" placeholder="Buscar produto..." /></label>
            <select class="productStatusFilter">
              <option ${status === 'Todos os status' ? 'selected' : ''}>Todos os status</option>
              <option ${status === 'Ativo' ? 'selected' : ''}>Ativo</option>
              <option ${status === 'Inativo' ? 'selected' : ''}>Inativo</option>
            </select>
          </div>
        </div>

        <div class="productsTable">
          <div class="productsTableHead"><span>Produto</span><span>Categoria</span><span>Setor</span><span>Preço</span><span>Vai para preparo?</span><span>Status</span><span>Ações</span></div>
          ${rows || '<div class="productsEmpty">Nenhum produto encontrado.</div>'}
        </div>

        <footer class="productsPagination">
          <span>Mostrando ${filtered.length ? start + 1 : 0} a ${Math.min(filtered.length, start + PRODUCTS_PER_PAGE)} de ${filtered.length} produtos</span>
          <div>${getPaginationButtons(totalPages, page)}</div>
        </footer>
      </section>
    </div>
  `
}

function hideSettingsSections(page, nav) {
  Array.from(page.children).forEach(child => {
    if (child === nav || child.classList.contains('settingsTopHeader') || child.dataset.productsPanel === 'true') return
    child.dataset.productsPreviousDisplay = child.style.display || ''
    child.style.display = 'none'
  })
}

function showSettingsSections(page) {
  page.querySelector('[data-products-panel="true"]')?.remove()
  page.querySelector('[data-products-modal="true"]')?.remove()
  page.querySelector('[data-products-tab="true"]')?.classList.remove('active')
  Array.from(page.children).forEach(child => {
    if (child.dataset.productsPreviousDisplay !== undefined) {
      child.style.display = child.dataset.productsPreviousDisplay
      delete child.dataset.productsPreviousDisplay
    }
  })
}

function openProductsTab(page, nav) {
  const buttons = nav.querySelectorAll('button')
  buttons.forEach(button => button.classList.remove('active'))
  const productButton = nav.querySelector('[data-products-tab="true"]')
  productButton?.classList.add('active')
  hideSettingsSections(page, nav)
  page.querySelector('[data-products-panel="true"]')?.remove()
  page.insertAdjacentHTML('beforeend', getProductsPanel(loadProducts()))
  bindProductsEvents(page)
}

function inferProductDefaults(category, sectorSelect, prepareSelect) {
  const shouldPrepare = !noPrepareCategories.includes(category)
  prepareSelect.value = category ? (shouldPrepare ? 'Sim' : 'Não') : ''
  if (category === 'Churrascos') sectorSelect.value = 'Churrasco'
  else if (category === 'Sucos') sectorSelect.value = 'Sucos'
  else if (shouldPrepare) sectorSelect.value = 'Cozinha'
  else sectorSelect.value = 'Bar / Caixa'
}

function openProductModal(page, product, mode) {
  page.querySelector('[data-products-modal="true"]')?.remove()
  const isDelete = mode === 'delete'
  const modalHtml = `
    <div class="productsModalOverlay" data-products-modal="true">
      <div class="productsModal">
        <button type="button" class="productsModalClose" data-modal-cancel>×</button>
        <span class="productsModalIcon">${isDelete ? '🗑' : '✎'}</span>
        <h3>${isDelete ? 'Excluir produto' : 'Editar produto'}</h3>
        <p>${isDelete ? `Tem certeza que deseja excluir <strong>${product.name}</strong>?` : 'Atualize as informações do produto abaixo.'}</p>
        ${isDelete ? '' : `
          <label>Nome do produto<input name="modalName" value="${product.name}" /></label>
          <label>Preço (R$)<input name="modalPrice" value="${String(product.price).replace('.', ',')}" /></label>
          <label>Categoria<select name="modalCategory">${optionList(categories, product.category)}</select></label>
          <label>Status<select name="modalStatus"><option ${product.status === 'Ativo' ? 'selected' : ''}>Ativo</option><option ${product.status === 'Inativo' ? 'selected' : ''}>Inativo</option></select></label>
        `}
        <div class="productsModalActions">
          <button type="button" data-modal-cancel>Cancelar</button>
          <button type="button" class="${isDelete ? 'danger' : 'save'}" data-modal-confirm>${isDelete ? 'Excluir produto' : 'Salvar alterações'}</button>
        </div>
      </div>
    </div>
  `
  page.insertAdjacentHTML('beforeend', modalHtml)
  const overlay = page.querySelector('[data-products-modal="true"]')
  const close = () => overlay?.remove()
  overlay.querySelectorAll('[data-modal-cancel]').forEach(button => button.addEventListener('click', close))
  overlay.addEventListener('click', event => { if (event.target === overlay) close() })
  overlay.querySelector('[data-modal-confirm]')?.addEventListener('click', () => {
    const products = loadProducts()
    if (isDelete) {
      saveProducts(products.filter(item => item.id !== product.id))
    } else {
      const nextName = overlay.querySelector('[name="modalName"]')?.value.trim() || product.name
      const nextPrice = parsePrice(overlay.querySelector('[name="modalPrice"]')?.value || product.price)
      const nextCategory = overlay.querySelector('[name="modalCategory"]')?.value || product.category
      const nextStatus = overlay.querySelector('[name="modalStatus"]')?.value || product.status
      saveProducts(products.map(item => item.id === product.id ? { ...item, name: nextName, price: nextPrice, category: nextCategory, status: nextStatus } : item))
    }
    close()
    rerenderProductsPanel(page)
  })
}

function rerenderProductsPanel(page, pageNumber) {
  const panel = page.querySelector('[data-products-panel="true"]')
  const search = panel?.querySelector('.productSearchInput')?.value || ''
  const status = panel?.querySelector('.productStatusFilter')?.value || 'Todos os status'
  const currentPage = Number(pageNumber || panel?.dataset.currentPage || 1)
  panel.outerHTML = getProductsPanel(loadProducts(), search, status, currentPage)
  bindProductsEvents(page)
}

function bindProductsEvents(page) {
  const panel = page.querySelector('[data-products-panel="true"]')
  if (!panel) return
  const form = panel.querySelector('.productForm')
  const categorySelect = form?.querySelector('[name="category"]')
  const sectorSelect = form?.querySelector('[name="sector"]')
  const prepareSelect = form?.querySelector('[name="prepare"]')

  categorySelect?.addEventListener('change', () => inferProductDefaults(categorySelect.value, sectorSelect, prepareSelect))

  form?.addEventListener('submit', event => {
    event.preventDefault()
    const data = new FormData(form)
    const name = String(data.get('name') || '').trim()
    if (!name) return
    const products = loadProducts()
    const product = {
      id: Date.now(),
      name,
      category: String(data.get('category') || 'Outros'),
      sector: String(data.get('sector') || 'Bar / Caixa'),
      price: parsePrice(data.get('price')),
      prepare: data.get('prepare') === 'Sim',
      status: String(data.get('status') || 'Ativo'),
    }
    saveProducts([product, ...products])
    openProductsTab(page, page.querySelector('.settingsTabs'))
  })

  panel.querySelector('.productSearchInput')?.addEventListener('input', () => rerenderProductsPanel(page, 1))
  panel.querySelector('.productStatusFilter')?.addEventListener('change', () => rerenderProductsPanel(page, 1))
  panel.querySelectorAll('.productsPagination [data-page]').forEach(button => button.addEventListener('click', () => rerenderProductsPanel(page, Number(button.dataset.page))))
  panel.querySelectorAll('.productActions button').forEach(button => button.addEventListener('click', () => {
    const row = button.closest('[data-product-id]')
    const id = Number(row?.dataset.productId)
    const product = loadProducts().find(item => item.id === id)
    if (!product) return
    openProductModal(page, product, button.dataset.action)
  }))
}

function enhanceSettingsProducts() {
  const page = document.querySelector('.settingsPremiumPage')
  const nav = page?.querySelector('.settingsTabs')
  if (!page || !nav) return

  if (!nav.querySelector('[data-products-tab="true"]')) {
    const systemButton = Array.from(nav.querySelectorAll('button')).find(button => button.textContent.includes('Sistema'))
    const productButton = document.createElement('button')
    productButton.type = 'button'
    productButton.dataset.productsTab = 'true'
    productButton.innerHTML = '<span class="productsTabIcon">▣</span> Produtos'
    productButton.addEventListener('click', () => openProductsTab(page, nav))
    nav.insertBefore(productButton, systemButton || null)
  }

  nav.querySelectorAll('button:not([data-products-tab="true"])').forEach(button => {
    if (button.dataset.productsListenerAttached) return
    button.dataset.productsListenerAttached = 'true'
    button.addEventListener('click', () => showSettingsSections(page))
  })

  const headerText = page.querySelector('.settingsTopHeader p')
  if (headerText && !headerText.textContent.includes('produtos')) {
    headerText.textContent = 'Gerencie acessos, mesas, impressões, produtos e preferências do sistema.'
  }
}

const observer = new MutationObserver(enhanceSettingsProducts)
observer.observe(document.body, { childList: true, subtree: true })
window.addEventListener('DOMContentLoaded', enhanceSettingsProducts)
setTimeout(enhanceSettingsProducts, 300)
