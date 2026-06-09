const ACCESS_EDITS_KEY = 'fogao-access-edits-v1'
const roleOptions = [
  { value: 'admin', label: 'Administrador' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'garcom', label: 'Garçom' },
]

function readAccessEdits() {
  try { return JSON.parse(localStorage.getItem(ACCESS_EDITS_KEY) || '{}') || {} } catch { return {} }
}

function writeAccessEdits(value) {
  localStorage.setItem(ACCESS_EDITS_KEY, JSON.stringify(value))
}

function showAccessToast(message) {
  document.querySelector('.accessEditToast')?.remove()
  const toast = document.createElement('div')
  toast.className = 'accessEditToast'
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => toast.classList.add('show'), 20)
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 220) }, 2600)
}

function getRowData(row) {
  const name = row.querySelector('.accessNameCell strong')?.textContent?.trim() || ''
  const login = Array.from(row.children).find(el => el.tagName === 'SPAN')?.textContent?.trim() || ''
  const roleText = row.querySelector('b')?.textContent?.trim() || 'Garçom'
  const role = roleOptions.find(item => item.label === roleText)?.value || 'garcom'
  return { name, login, role }
}

function applyRowData(row, data) {
  const nameEl = row.querySelector('.accessNameCell strong')
  const avatar = row.querySelector('.settingsUserAvatar')
  const roleEl = row.querySelector('b')
  const loginEl = Array.from(row.children).find(el => el.tagName === 'SPAN')
  if (nameEl) nameEl.textContent = data.name
  if (loginEl) loginEl.textContent = data.login
  if (roleEl) roleEl.textContent = roleOptions.find(item => item.value === data.role)?.label || 'Garçom'
  if (avatar) avatar.textContent = data.name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'US'
}

function applySavedAccessEdits() {
  const edits = readAccessEdits()
  document.querySelectorAll('.accessTableRow').forEach(row => {
    const data = getRowData(row)
    const saved = edits[data.login]
    if (saved) applyRowData(row, saved)
  })
}

function openAccessEditModal(data) {
  return new Promise(resolve => {
    document.querySelector('.accessEditOverlay')?.remove()
    const overlay = document.createElement('div')
    overlay.className = 'accessEditOverlay'
    overlay.innerHTML = `
      <div class="accessEditModal" role="dialog" aria-modal="true">
        <div class="accessEditHeader">
          <div class="accessEditIcon">👤</div>
          <div>
            <h3>Editar acesso</h3>
            <p>Atualize os dados exibidos para esse usuário.</p>
          </div>
        </div>
        <label>Nome completo<input data-field="name" value="${data.name.replace(/"/g, '&quot;')}" /></label>
        <label>Login<input data-field="login" value="${data.login.replace(/"/g, '&quot;')}" /></label>
        <label>Função<select data-field="role">${roleOptions.map(item => `<option value="${item.value}" ${item.value === data.role ? 'selected' : ''}>${item.label}</option>`).join('')}</select></label>
        <div class="accessEditActions">
          <button type="button" class="accessEditCancel">Cancelar</button>
          <button type="button" class="accessEditSave">Salvar alterações</button>
        </div>
      </div>`
    document.body.appendChild(overlay)
    const close = value => { overlay.remove(); resolve(value) }
    overlay.querySelector('.accessEditCancel').addEventListener('click', () => close(null))
    overlay.querySelector('.accessEditSave').addEventListener('click', () => {
      const next = {
        name: overlay.querySelector('[data-field="name"]').value.trim() || data.name,
        login: overlay.querySelector('[data-field="login"]').value.trim() || data.login,
        role: overlay.querySelector('[data-field="role"]').value,
      }
      close(next)
    })
    overlay.addEventListener('click', event => { if (event.target === overlay) close(null) })
    setTimeout(() => overlay.querySelector('[data-field="name"]')?.focus(), 40)
  })
}

function enhanceAccessEditButtons() {
  applySavedAccessEdits()
  document.querySelectorAll('.accessTableRow').forEach(row => {
    const editButton = row.querySelector('.accessActions button:not(.iconDanger)')
    if (!editButton || editButton.dataset.accessEditRuntime) return
    editButton.dataset.accessEditRuntime = '1'
    editButton.addEventListener('click', async event => {
      event.preventDefault()
      const current = getRowData(row)
      const next = await openAccessEditModal(current)
      if (!next) return
      const edits = readAccessEdits()
      delete edits[current.login]
      edits[next.login] = next
      writeAccessEdits(edits)
      applyRowData(row, next)
      showAccessToast('Acesso atualizado com sucesso.')
    })
  })
}

const accessEditStyle = document.createElement('style')
accessEditStyle.textContent = `
  .accessEditOverlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: grid;
    place-items: center;
    padding: 22px;
    background: rgba(28, 17, 10, .55);
  }

  .accessEditModal {
    width: min(460px, 100%);
    border: 1px solid #efd9bd;
    border-radius: 24px;
    padding: 24px;
    color: #2d140e;
    background: #fffaf3;
    box-shadow: 0 24px 70px rgba(30, 12, 4, .32);
  }

  .accessEditHeader {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 16px;
  }

  .accessEditIcon {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border-radius: 16px;
    background: #fff0d7;
    font-size: 24px;
  }

  .accessEditHeader h3 {
    margin: 0 0 4px;
    font-size: 26px;
    font-family: Georgia, 'Times New Roman', serif;
  }

  .accessEditHeader p {
    margin: 0;
    color: #7a5b47;
  }

  .accessEditModal label {
    display: grid;
    gap: 7px;
    margin-top: 12px;
    font-weight: 900;
    color: #5f4435;
  }

  .accessEditModal input,
  .accessEditModal select {
    width: 100%;
    min-height: 46px;
    border: 1px solid #e6c9a8;
    border-radius: 14px;
    background: #fffdf8;
    padding: 0 13px;
    font: 700 15px/1.4 inherit;
    color: #2d140e;
    outline: none;
  }

  .accessEditActions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 18px;
  }

  .accessEditActions button {
    min-height: 42px;
    border: 0;
    border-radius: 13px;
    padding: 0 18px;
    cursor: pointer;
    font-weight: 900;
  }

  .accessEditCancel {
    background: #f4e4d2;
    color: #6b4530;
  }

  .accessEditSave {
    background: linear-gradient(135deg, #a94925, #ef6336);
    color: #fffaf0;
  }

  .accessEditToast {
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

  .accessEditToast.show {
    opacity: 1;
    transform: translateY(0);
  }
`
document.head.appendChild(accessEditStyle)
new MutationObserver(enhanceAccessEditButtons).observe(document.body, { childList: true, subtree: true })
window.addEventListener('DOMContentLoaded', enhanceAccessEditButtons)
setTimeout(enhanceAccessEditButtons, 300)
