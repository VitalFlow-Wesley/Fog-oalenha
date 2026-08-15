const CASH_AUTH_PASSWORD_KEY = 'fogao-cash-auth-password'
const TABLES_KEY = 'fogao-tables-v1'
const CLOSINGS_KEY = 'fogao-closings-v1'
const USERS_KEY = 'fogao-users-v1'
const SETTINGS_KEY = 'fogao-settings-v1'
const PRODUCTS_KEY = 'fogao-products-v1'
let closingModalAuthorizedUntil = 0

function readStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Mantem o app funcionando mesmo se o navegador bloquear armazenamento.
  }
}

function isCashAuthorizationPassword(password) {
  const typedPassword = String(password || '').trim()
  if (!typedPassword) return false

  const users = readStored(USERS_KEY, [])
  if (!Array.isArray(users)) return false

  return users.some(user => {
    const role = String(user.role || '').toLowerCase()
    const userPassword = String(user.password || user.senha || '').trim()
    const isAuthorizedRole = ['admin', 'administrador', 'gerente', 'manager'].includes(role)

    return user.active !== false && isAuthorizedRole && userPassword === typedPassword
  })
}

function parseCashValue(text = '') {
  const clean = String(text).replace(/[^0-9,.-]/g, '')
  if (!clean) return 0
  if (clean.includes(',') && clean.includes('.')) return Number(clean.replace(/\./g, '').replace(',', '.')) || 0
  if (clean.includes(',')) return Number(clean.replace(',', '.')) || 0
  return Number(clean) || 0
}

function getClosingDifference() {
  const diffElement = document.querySelector('.cashTotalsGrid p:last-child strong')
  return parseCashValue(diffElement?.textContent || '0')
}

function getTableTotal(table) {
  return (table.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0)
}

function getOpenCashTables(tables = readStored(TABLES_KEY, [])) {
  return Array.isArray(tables)
    ? tables.filter(table => table.status !== 'livre' || getTableTotal(table) > 0 || Number(table.guests || 0) > 0 || Boolean(table.items?.length))
    : []
}

function getClosingSnapshot() {
  const tables = readStored(TABLES_KEY, [])
  const openTables = getOpenCashTables(tables)
  const total = openTables.reduce((sum, table) => sum + getTableTotal(table), 0)
  return { tables, openTables, total }
}

async function syncResetTables(resetTables) {
  try {
    await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        users: readStored(USERS_KEY, []),
        tables: resetTables,
        settings: readStored(SETTINGS_KEY, {}),
        products: readStored(PRODUCTS_KEY, []),
      }),
    })
  } catch (error) {
    console.warn('Nao foi possivel sincronizar o fechamento agora:', error.message)
  }
}

async function resetCashMovementAfterClose(extra = {}) {
  const snapshot = getClosingSnapshot()
  const resetTables = []
  const history = readStored(CLOSINGS_KEY, [])
  const closingRecord = {
    id: `closing-${Date.now()}`,
    closedAt: new Date().toISOString(),
    total: snapshot.total,
    openTables: snapshot.openTables.length,
    tablesSnapshot: snapshot.openTables,
    ...extra,
  }

  writeStored(CLOSINGS_KEY, [closingRecord, ...history].slice(0, 60))
  writeStored(TABLES_KEY, resetTables)
  await syncResetTables(resetTables)
}

function showClosingToast(message, type = 'success') {
  document.querySelector('.closingSuccessToast')?.remove()
  const badge = document.createElement('div')
  badge.className = `closingSuccessToast ${type}`
  badge.textContent = message
  document.body.appendChild(badge)
  setTimeout(() => badge.classList.add('show'), 20)
  setTimeout(() => { badge.classList.remove('show'); setTimeout(() => badge.remove(), 220) }, 2800)
}

function openClosingConfirmModal() {
  return new Promise(resolve => {
    document.querySelector('.closingConfirmOverlay')?.remove()
    const openTables = getOpenCashTables()
    const warningText = openTables.length
      ? `Existem ${openTables.length} mesa(s) abertas ou com movimentação. Ao confirmar, todas as mesas serão apagadas, os pedidos serão limpos e o salão ficará sem mesas cadastradas.`
      : 'Os valores estão conferidos. Após fechar o caixa do dia, todas as mesas serão apagadas e o salão ficará vazio para um novo caixa.'

    const overlay = document.createElement('div')
    overlay.className = 'closingConfirmOverlay'
    overlay.innerHTML = `
      <div class="closingConfirmModal" role="dialog" aria-modal="true">
        <div class="closingConfirmIcon">🔒</div>
        <div class="closingConfirmContent">
          <span>FECHAMENTO DO CAIXA</span>
          <h3>Confirmar fechamento?</h3>
          <p>${warningText}</p>
        </div>
        <div class="closingConfirmActions">
          <button type="button" class="closingConfirmCancel">Cancelar</button>
          <button type="button" class="closingConfirmSave">Sim, fechar caixa</button>
        </div>
      </div>`

    document.body.appendChild(overlay)

    const close = value => {
      overlay.remove()
      resolve(value)
    }

    overlay.querySelector('.closingConfirmCancel').addEventListener('click', () => close(false))
    overlay.querySelector('.closingConfirmSave').addEventListener('click', () => close({ authorized: true, observation: '' }))
    overlay.addEventListener('click', event => { if (event.target === overlay) close(false) })
    overlay.addEventListener('keydown', event => { if (event.key === 'Escape') close(false) })

    setTimeout(() => overlay.querySelector('.closingConfirmSave')?.focus(), 60)
  })
}

function openClosingAuthorizationModal(difference) {
  return new Promise(resolve => {
    document.querySelector('.closingConfirmOverlay')?.remove()

    const formattedDiff = `R$ ${Math.abs(difference).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    const openTables = getOpenCashTables()
    const openTablesText = openTables.length ? `<p><strong>Atenção:</strong> ${openTables.length} mesa(s) serão apagadas ao autorizar o fechamento.</p>` : ''
    const overlay = document.createElement('div')
    overlay.className = 'closingConfirmOverlay'
    overlay.innerHTML = `
      <div class="closingConfirmModal closingAuthModal" role="dialog" aria-modal="true">
        <div class="closingConfirmIcon warning">⚠️</div>
        <div class="closingConfirmContent">
          <span>DIVERGÊNCIA NO CAIXA</span>
          <h3>Autorização necessária</h3>
          <p>O fechamento está com diferença de <strong>${formattedDiff}</strong>. Para fechar mesmo assim, informe a senha de autorização e registre uma observação.</p>
          ${openTablesText}
        </div>
        <form class="closingAuthForm">
          <label>Senha de autorização<input type="password" data-auth-password placeholder="Digite a senha" autocomplete="off" /></label>
          <label>Observação obrigatória<textarea data-auth-observation placeholder="Explique o motivo da diferença no caixa..."></textarea></label>
          <div class="closingAuthError" aria-live="polite"></div>
          <div class="closingConfirmActions">
            <button type="button" class="closingConfirmCancel">Cancelar</button>
            <button type="submit" class="closingConfirmSave">Autorizar fechamento</button>
          </div>
        </form>
      </div>`

    document.body.appendChild(overlay)

    const close = value => {
      overlay.remove()
      resolve(value)
    }

    overlay.querySelector('.closingConfirmCancel').addEventListener('click', () => close(false))
    overlay.querySelector('.closingAuthModal').addEventListener('click', event => event.stopPropagation())
    overlay.addEventListener('click', event => { if (event.target === overlay) close(false) })
    overlay.addEventListener('keydown', event => { if (event.key === 'Escape') close(false) })
    overlay.querySelector('.closingAuthForm').addEventListener('submit', event => {
      event.preventDefault()
      const password = overlay.querySelector('[data-auth-password]').value.trim()
      const observation = overlay.querySelector('[data-auth-observation]').value.trim()
      const error = overlay.querySelector('.closingAuthError')

      if (!password || !observation) {
        error.textContent = 'Informe a senha de autorização e a observação para fechar o caixa.'
        return
      }

      if (!isCashAuthorizationPassword(password)) {
        error.textContent = 'Senha inválida. Use a senha de um gerente ou administrador ativo.'
        return
      }

      close({ authorized: true, observation, divergent: true })
    })

    setTimeout(() => overlay.querySelector('[data-auth-password]')?.focus(), 60)
  })
}

function appendAuthorizationNote(observation) {
  const noteField = document.querySelector('.noteField textarea')
  if (!noteField || !observation) return
  const stamp = new Date().toLocaleString('pt-BR')
  const text = `[Fechamento autorizado com divergência em ${stamp}] ${observation}`
  noteField.value = noteField.value ? `${noteField.value}\n${text}` : text
  noteField.dispatchEvent(new Event('input', { bubbles: true }))
}

const nativeClosingConfirm = window.confirm.bind(window)
window.confirm = function closingConfirmBridge(message) {
  const text = String(message || '').toLowerCase()
  if (Date.now() < closingModalAuthorizedUntil && text.includes('caixa')) {
    return true
  }
  return nativeClosingConfirm(message)
}

function enhanceClosingConfirmButtons() {
  const page = document.querySelector('.closingPage')
  if (!page) return

  const buttons = Array.from(page.querySelectorAll('button')).filter(button =>
    button.textContent.trim().includes('Fechar caixa do dia') ||
    button.textContent.trim().includes('Conferir e fechar caixa') ||
    button.textContent.trim().includes('Fechar caixa com divergência')
  )

  buttons.forEach(button => {
    button.disabled = page.classList.contains('cashClosed')

    if (button.dataset.closingConfirmRuntime) return
    button.dataset.closingConfirmRuntime = '1'

    button.addEventListener('click', async event => {
      if (page.classList.contains('cashClosed')) return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()

      const difference = getClosingDifference()
      const ok = Math.abs(difference) < 0.01
        ? await openClosingConfirmModal()
        : await openClosingAuthorizationModal(difference)

      if (!ok?.authorized) return
      if (ok.observation) appendAuthorizationNote(ok.observation)

      closingModalAuthorizedUntil = Date.now() + 5000
      setTimeout(() => button.click(), 60)
    }, true)
  })
}

const closingConfirmStyle = document.createElement('style')
closingConfirmStyle.textContent = `
  .closingConfirmOverlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: grid;
    place-items: center;
    padding: 22px;
    background: rgba(31, 18, 11, .58);
    backdrop-filter: blur(4px);
  }

  .closingConfirmModal {
    width: min(500px, 100%);
    border: 1px solid #efd9bd;
    border-radius: 26px;
    padding: 26px;
    color: #2d140e;
    background: linear-gradient(135deg, #fffdf8, #fff3e4);
    box-shadow: 0 28px 80px rgba(30, 12, 4, .34);
  }

  .closingConfirmIcon {
    width: 58px;
    height: 58px;
    display: grid;
    place-items: center;
    margin-bottom: 16px;
    border-radius: 18px;
    background: #fff0d7;
    color: #c24928;
    font-size: 28px;
  }

  .closingConfirmIcon.warning {
    background: #fff0d7;
  }

  .closingConfirmContent span {
    display: block;
    margin-bottom: 7px;
    color: #c24928;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: .12em;
  }

  .closingConfirmContent h3 {
    margin: 0 0 8px;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 30px;
    line-height: 1;
  }

  .closingConfirmContent p {
    margin: 0 0 8px;
    color: #725744;
    font-size: 15px;
    line-height: 1.45;
  }

  .closingConfirmContent p strong {
    color: #c24928;
  }

  .closingAuthForm {
    display: grid;
    gap: 12px;
    margin-top: 18px;
  }

  .closingAuthForm label {
    display: grid;
    gap: 7px;
    color: #5f4435;
    font-weight: 900;
  }

  .closingAuthForm input,
  .closingAuthForm textarea {
    width: 100%;
    border: 1px solid #e6c9a8;
    border-radius: 14px;
    background: #fffdf8;
    color: #2d140e;
    padding: 13px 14px;
    font: 700 15px/1.35 inherit;
    outline: none;
    box-sizing: border-box;
  }

  .closingAuthForm input {
    min-height: 46px;
  }

  .closingAuthForm textarea {
    min-height: 96px;
    resize: vertical;
  }

  .closingAuthError {
    min-height: 18px;
    color: #c24928;
    font-weight: 900;
    font-size: 13px;
  }

  .closingConfirmActions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 8px;
  }

  .closingConfirmActions button {
    min-height: 46px;
    border: 0;
    border-radius: 14px;
    padding: 0 18px;
    cursor: pointer;
    font-weight: 900;
    font-size: 14px;
  }

  .closingConfirmCancel {
    background: #f4e4d2;
    color: #6b4530;
  }

  .closingConfirmSave {
    color: #fffaf0;
    background: linear-gradient(135deg, #b8341d, #ef5634);
    box-shadow: 0 14px 28px rgba(199, 65, 35, .2);
  }

  .closingSuccessToast {
    position: fixed;
    right: 22px;
    bottom: 22px;
    z-index: 10001;
    padding: 13px 16px;
    border-radius: 14px;
    color: #fff;
    background: #2f7a3d;
    font-weight: 900;
    box-shadow: 0 14px 30px rgba(0, 0, 0, .22);
    opacity: 0;
    transform: translateY(12px);
    transition: .2s ease;
  }

  .closingSuccessToast.error {
    background: #c24928;
  }

  .closingSuccessToast.show {
    opacity: 1;
    transform: translateY(0);
  }

  @media (max-width: 560px) {
    .closingConfirmActions {
      flex-direction: column;
    }

    .closingConfirmActions button {
      width: 100%;
    }
  }
`
document.head.appendChild(closingConfirmStyle)

new MutationObserver(enhanceClosingConfirmButtons).observe(document.body, { childList: true, subtree: true })
window.addEventListener('DOMContentLoaded', enhanceClosingConfirmButtons)
setTimeout(enhanceClosingConfirmButtons, 300)
