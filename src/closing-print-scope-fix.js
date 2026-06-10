function markClosingPrint(event) {
  const button = event.target?.closest?.('button')
  if (!button) return
  if (!document.querySelector('.closingPage')) return

  const text = button.textContent.replace(/\s+/g, ' ').trim()
  if (text.includes('Imprimir fechamento') || text.includes('Exportar PDF')) {
    document.body.classList.add('print-closing-report')
  }
}

function clearClosingPrintMark() {
  document.body.classList.remove('print-closing-report')
}

document.addEventListener('click', markClosingPrint, true)
window.addEventListener('afterprint', clearClosingPrintMark)
window.addEventListener('focus', () => setTimeout(clearClosingPrintMark, 500))
