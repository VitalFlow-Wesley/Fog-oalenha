function enableDivergentClosingButtons() {
  const page = document.querySelector('.closingPage')
  if (!page) return

  const isClosed = page.classList.contains('cashClosed')
  const closeButtons = Array.from(page.querySelectorAll('button')).filter(button => {
    const text = button.textContent.trim()
    return text.includes('Fechar caixa do dia') || text.includes('Conferir e fechar caixa')
  })

  closeButtons.forEach(button => {
    if (isClosed) {
      button.disabled = true
      return
    }

    button.disabled = false
    button.removeAttribute('disabled')
    button.classList.add('closingAllowDivergence')
    button.title = 'Se houver diferença, será solicitada senha de autorização e observação.'
  })
}

const closingDivergenceStyle = document.createElement('style')
closingDivergenceStyle.textContent = `
  .closingPage:not(.cashClosed) .closingAllowDivergence {
    opacity: 1 !important;
    cursor: pointer !important;
    filter: none !important;
  }

  .closingPage:not(.cashClosed) .primaryClosingBtn,
  .closingPage:not(.cashClosed) .closeDayBtn {
    opacity: 1 !important;
    cursor: pointer !important;
  }
`
document.head.appendChild(closingDivergenceStyle)

new MutationObserver(enableDivergentClosingButtons).observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['disabled', 'class'],
})

window.addEventListener('DOMContentLoaded', enableDivergentClosingButtons)
setInterval(enableDivergentClosingButtons, 500)
setTimeout(enableDivergentClosingButtons, 300)
