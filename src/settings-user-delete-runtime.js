import { saveRemoteState } from './services/appStateApi.js'

const USERS_KEY = 'fogao-users-v1'
const TABLES_KEY = 'fogao-tables-v1'
const SETTINGS_KEY = 'fogao-settings-v1'
const PRODUCTS_KEY = 'fogao-products-v1'
const SALES_KEY = 'fogao-sales-history-v1'
const CLOSINGS_KEY = 'fogao-closings-v1'
const CLOSED_TABLES_KEY = 'fogao-closed-tables-v1'
const SESSION_KEY = 'fogao-a-lenha-session'

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null')
    return value ?? fallback
  } catch {
    return fallback
  }
}

function currentUser() {
  const users = readJson(USERS_KEY, [])
  const session = readJson(SESSION_KEY, null)
  return users.find(user => String(user.id) === String(session?.userId)) || null
}

async function removeUser(user) {
  const operator = currentUser()
  if (!operator || !['admin', 'gerente'].includes(operator.role)) return
  if (String(operator.id) === String(user.id)) {
    window.alert('Não é possível excluir o usuário que está conectado.')
    return
  }

  const confirmed = window.confirm(`Excluir o acesso de ${user.name}?`)
  if (!confirmed) return

  const users = readJson(USERS_KEY, []).filter(item => String(item.id) !== String(user.id))
  localStorage.setItem(USERS_KEY, JSON.stringify(users))

  try {
    await saveRemoteState({
      users,
      tables: readJson(TABLES_KEY, []),
      settings: readJson(SETTINGS_KEY, {}),
      products: readJson(PRODUCTS_KEY, []),
      salesHistory: readJson(SALES_KEY, []),
      closings: readJson(CLOSINGS_KEY, []),
      closedTablesHistory: readJson(CLOSED_TABLES_KEY, []),
    })
  } catch (error) {
    console.warn('Usuário removido localmente; sincronização remota pendente:', error.message)
  }

  window.location.reload()
}

function addDeleteButtons() {
  const operator = currentUser()
  if (!operator || !['admin', 'gerente'].includes(operator.role)) return

  const users = readJson(USERS_KEY, [])
  document.querySelectorAll('.accessTableRow').forEach(row => {
    const actions = row.querySelector('.accessActions')
    if (!actions || actions.querySelector('.runtimeDeleteUserBtn')) return

    const username = row.querySelector(':scope > span')?.textContent?.trim()
    const name = row.querySelector('.accessNameCell strong')?.textContent?.trim()
    const user = users.find(item => item.username === username) || users.find(item => item.name === name)
    if (!user || String(user.id) === String(operator.id)) return

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'iconDanger runtimeDeleteUserBtn'
    button.title = `Excluir ${user.name}`
    button.setAttribute('aria-label', `Excluir acesso de ${user.name}`)
    button.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>'
    button.addEventListener('click', () => removeUser(user))
    actions.appendChild(button)
  })
}

let scheduled = false
function schedule() {
  if (scheduled) return
  scheduled = true
  requestAnimationFrame(() => {
    scheduled = false
    addDeleteButtons()
  })
}

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener('DOMContentLoaded', schedule)
window.addEventListener('storage', schedule)
window.setTimeout(schedule, 300)
