function openClosingConfirmModal() {
  return new Promise(resolve => {
    document.querySelector('.closingConfirmOverlay')?.remove()

    const overlay = document.createElement('div')
    overlay.className = 'closingConfirmOverlay'
    overlay.innerHTML = `
      <div class="closingConfirmModal" role="dialog" aria-modal="true">
        <div class="closingConfirmIcon">🔒</div>
        <div class="closingConfirmContent">
          <span>FECHAMENTO DO CAIXA</span>
          <h3>Confirmar fechamento?</h3>
          <p>Após fechar o caixa do dia, os dados não devem ser alterados. Revise os valores antes de continuar.</p>
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
    overlay.querySelector('.closingConfirmSave').addEventListener('click', () => close(true))
    overlay.addEventListener('click', event => {
      if (event.target === overlay) close(false)
    })
    overlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') close(false)
    })

    setTimeout(() => overlay.querySelector('.closingConfirmSave')?.focus(), 60)
  })
}

function enhanceClosingConfirmButtons() {
  const page = document.querySelector('.closingPage')
  if (!page) return

  const buttons = Array.from(page.querySelectorAll('button')).filter(button =>
    button.textContent.trim().includes('Fechar caixa do dia') ||
    button.textContent.trim().includes('Conferir e fechar caixa')
  )

  buttons.forEach(button => {
    if (button.dataset.closingConfirmRuntime) return
    button.dataset.closingConfirmRuntime = '1'

    button.addEventListener('click', async event => {
      if (button.disabled) return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()

      const ok = await openClosingConfirmModal()
      if (!ok) return

      const badge = document.createElement('div')
      badge.className = 'closingSuccessToast'
      badge.textContent = 'Caixa fechado com sucesso.'
      document.body.appendChild(badge)
      setTimeout(() => badge.classList.add('show'), 20)
      setTimeout(() => { badge.classList.remove('show'); setTimeout(() => badge.remove(), 220) }, 2600)

      page.classList.add('cashClosed')
      buttons.forEach(btn => { btn.disabled = true })
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
    width: min(470px, 100%);
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
    margin: 0;
    color: #725744;
    font-size: 15px;
    line-height: 1.45;
  }

  .closingConfirmActions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 22px;
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
