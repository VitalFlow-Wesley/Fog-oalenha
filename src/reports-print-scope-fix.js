function textOf(element) {
  return element?.textContent?.replace(/\s+/g, ' ').trim() || ''
}

function collectReportRows(selector) {
  return Array.from(document.querySelectorAll(selector)).map(row => {
    return Array.from(row.children).map(cell => textOf(cell)).filter(Boolean)
  }).filter(row => row.length)
}

function line(label, value) {
  return `<div class="printLine"><span>${label}</span><strong>${value}</strong></div>`
}

function section(title, rowsHtml) {
  if (!rowsHtml) return ''
  return `<hr><p><strong>${title}</strong></p>${rowsHtml}`
}

function buildReportsPrintArea() {
  const page = document.querySelector('.reportsPremiumPage')
  if (!page) return

  document.querySelectorAll('.reportsPrintReport').forEach(item => item.remove())

  const title = textOf(page.querySelector('.reportsHeader h1')) || 'Relatórios'
  const summaryRows = Array.from(page.querySelectorAll('.reportSummaryCard')).slice(0, 6).map(card => {
    const label = textOf(card.querySelector('span'))
    const value = textOf(card.querySelector('strong'))
    return label && value ? line(label, value) : ''
  }).join('')

  const sectorRows = Array.from(page.querySelectorAll('.simpleSectorCard, .sectorPerformanceCard')).map(card => {
    const name = textOf(card.querySelector('strong'))
    const qty = textOf(card.querySelector('span'))
    const total = textOf(card.querySelector('b'))
    return name ? line(`${name} ${qty}`.trim(), total || '-') : ''
  }).join('')

  const simpleProductRows = collectReportRows('.simpleProductsTable .premiumReportRow:not(.head)')
    .map(row => line(`${row[0]} (${row[1] || '0'}x)`, row[row.length - 1] || '-'))
    .join('')

  const completeProductRows = collectReportRows('.productsCompleteTable .completeTableRow:not(.head)')
    .slice(0, 10)
    .map(row => line(`${row[1] || row[0]} (${row[4] || '0'}x)`, row[5] || '-'))
    .join('')

  const resumeRows = Array.from(page.querySelectorAll('.reportResumeList > div, .indicatorRows > p')).slice(0, 10).map(row => {
    const value = textOf(row.querySelector('strong'))
    const label = textOf(row).replace(value, '').trim()
    return label && value ? line(label, value) : ''
  }).join('')

  const printArea = document.createElement('div')
  printArea.className = 'printOnly reportsPrintReport'
  printArea.innerHTML = `
    <h1>${title.toUpperCase()}</h1>
    <p><strong>Fogão a Lenha</strong></p>
    <p><strong>Gerado em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
    ${section('Resumo geral', summaryRows)}
    ${section('Resumo por setor', sectorRows)}
    ${section('Produtos', simpleProductRows || completeProductRows)}
    ${section('Indicadores', resumeRows)}
    <hr>
    <p class="printFooter">Relatório gerado pelo sistema Fogão a Lenha.</p>
  `

  page.appendChild(printArea)
}

function markReportsPrint(event) {
  const button = event.target?.closest?.('button')
  if (!button) return
  if (!document.querySelector('.reportsPremiumPage')) return

  const text = textOf(button)
  if (text.includes('Imprimir') || text.includes('Exportar PDF') || text.includes('Gerar PDF')) {
    buildReportsPrintArea()
    document.body.classList.add('print-reports-report')
  }
}

function clearReportsPrintMark() {
  document.body.classList.remove('print-reports-report')
}

document.addEventListener('click', markReportsPrint, true)
window.addEventListener('beforeprint', () => {
  if (document.querySelector('.reportsPremiumPage')) buildReportsPrintArea()
})
window.addEventListener('afterprint', clearReportsPrintMark)
window.addEventListener('focus', () => setTimeout(clearReportsPrintMark, 500))
