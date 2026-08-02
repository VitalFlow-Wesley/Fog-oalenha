const PERMISSIONS_KEY = 'fogao-role-permissions-v1'
const defaultPermissions = {
  admin: ['Lançar pedidos', 'Solicitar conta', 'Cancelar itens', 'Fechar mesa', 'Ver relatórios', 'Gerenciar usuários'],
  gerente: ['Lançar pedidos', 'Solicitar conta', 'Cancelar itens', 'Fechar mesa', 'Ver relatórios', 'Gerenciar usuários'],
  garcom: ['Lançar pedidos', 'Solicitar conta'],
}
const permissionLabels = ['Lançar pedidos', 'Solicitar conta', 'Cancelar itens', 'Fechar mesa', 'Ver relatórios', 'Gerenciar usuários']
const roleLabels = { admin: 'Administrador', gerente: 'Gerente', garcom: 'Garçom' }

function readPermissions() {
  try {
    const saved = JSON.parse(localStorage.getItem(PERMISSIONS_KEY) || 'null') || {}
    return { ...defaultPermissions, ...saved }
  } catch {
    return defaultPermissions
  }
}

function writePermissions(value) {
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(value))
}

function permissionToast(message) {
  document.querySelector('.permissionToast')?.remove()
  const toast = document.createElement('div')
  toast.className = 'permissionToast'
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => toast.classList.add('show'), 20)
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 220) }, 2600)
}

function openPermissionsModal() {
  document.querySelector('.permissionsModalOverlay')?.remove()
  const current = readPermissions()
  const overlay = document.createElement('div')
  overlay.className = 'permissionsModalOverlay'
  overlay.innerHTML = `
    <div class="permissionsModalBox" role="dialog" aria-modal="true">
      <div class="permissionsModalHeader">
        <div class="permissionsModalIcon">🛡️</div>
        <div>
          <h3>Gerenciar permissões</h3>
          <p>Defina o que cada função pode acessar e executar no sistema.</p>
        </div>
      </div>
      <div class="permissionsRoleGrid">
        ${Object.keys(roleLabels).map(role => `
          <section class="permissionsRoleCard" data-role="${role}">
            <h4>${roleLabels[role]}</h4>
            <div class="permissionsChecks">
              ${permissionLabels.map(label => `
                <label>
                  <input type="checkbox" data-permission="${label}" ${current[role]?.includes(label) ? 'checked' : ''} ${role === 'admin' ? 'disabled' : ''}>
                  <span>${label}</span>
                </label>
              `).join('')}
            </div>
            ${role === 'admin' ? '<small>Administrador sempre mantém acesso total.</small>' : ''}
          </section>
        `).join('')}
      </div>
      <div class="permissionsModalActions">
        <button type="button" class="permissionsCancel">Cancelar</button>
        <button type="button" class="permissionsSave">Salvar permissões</button>
      </div>
    </div>`
  document.body.appendChild(overlay)

  const close = () => overlay.remove()
  overlay.querySelector('.permissionsCancel').addEventListener('click', close)
  overlay.addEventListener('click', event => { if (event.target === overlay) close() })
  overlay.querySelector('.permissionsSave').addEventListener('click', () => {
    const next = { ...defaultPermissions }
    overlay.querySelectorAll('.permissionsRoleCard').forEach(card => {
      const role = card.dataset.role
      if (role === 'admin') return
      next[role] = Array.from(card.querySelectorAll('input:checked')).map(input => input.dataset.permission)
    })
    writePermissions(next)
    close()
    permissionToast('Permissões salvas com sucesso.')
  })
}

function enhancePermissionsButton() {
  const page = document.querySelector('.settingsPremiumPage')
  if (!page) return
  const buttons = Array.from(page.querySelectorAll('button'))
  const button = buttons.find(btn => btn.textContent.trim().includes('Gerenciar permissões'))
  if (!button || button.dataset.permissionsRuntime) return
  button.dataset.permissionsRuntime = '1'
  button.addEventListener('click', event => {
    event.preventDefault()
    openPermissionsModal()
  })
}

const permissionsStyle = document.createElement('style')
permissionsStyle.textContent = `
  .permissionsModalOverlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: grid;
    place-items: center;
    padding: 22px;
    background: rgba(28, 17, 10, .55);
  }

  .permissionsModalBox {
    width: min(860px, 100%);
    max-height: min(720px, 92vh);
    overflow: auto;
    border: 1px solid #efd9bd;
    border-radius: 24px;
    padding: 24px;
    color: #2d140e;
    background: #fffaf3;
    box-shadow: 0 24px 70px rgba(30, 12, 4, .32);
  }

  .permissionsModalHeader {
    display: flex;
    gap: 14px;
    align-items: center;
    margin-bottom: 18px;
  }

  .permissionsModalIcon {
    width: 50px;
    height: 50px;
    display: grid;
    place-items: center;
    border-radius: 16px;
    background: #fff0d7;
    font-size: 24px;
    flex: 0 0 50px;
  }

  .permissionsModalHeader h3 {
    margin: 0 0 4px;
    font-size: 28px;
    font-family: Georgia, 'Times New Roman', serif;
  }

  .permissionsModalHeader p {
    margin: 0;
    color: #7a5b47;
  }

  .permissionsRoleGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .permissionsRoleCard {
    border: 1px solid #efd9bd;
    border-radius: 18px;
    padding: 16px;
    background: #fffdf8;
  }

  .permissionsRoleCard h4 {
    margin: 0 0 12px;
    font-size: 18px;
  }

  .permissionsChecks {
    display: grid;
    gap: 10px;
  }

  .permissionsChecks label {
    display: flex;
    align-items: center;
    gap: 9px;
    font-weight: 800;
    color: #5f4435;
    font-size: 13px;
  }

  .permissionsChecks input {
    width: 16px;
    height: 16px;
    accent-color: #c94d2b;
  }

  .permissionsRoleCard small {
    display: block;
    margin-top: 12px;
    color: #8a6b58;
    font-weight: 700;
  }

  .permissionsModalActions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 18px;
  }

  .permissionsModalActions button {
    min-height: 42px;
    border: 0;
    border-radius: 13px;
    padding: 0 18px;
    cursor: pointer;
    font-weight: 900;
  }

  .permissionsCancel {
    background: #f4e4d2;
    color: #6b4530;
  }

  .permissionsSave {
    background: linear-gradient(135deg, #a94925, #ef6336);
    color: #fffaf0;
  }

  .permissionToast {
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

  .permissionToast.show {
    opacity: 1;
    transform: translateY(0);
  }

  @media (max-width: 820px) {
    .permissionsRoleGrid {
      grid-template-columns: 1fr;
    }
  }
`
document.head.appendChild(permissionsStyle)
new MutationObserver(enhancePermissionsButton).observe(document.body, { childList: true, subtree: true })
window.addEventListener('DOMContentLoaded', enhancePermissionsButton)
setTimeout(enhancePermissionsButton, 300)
