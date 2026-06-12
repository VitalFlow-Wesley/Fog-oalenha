function rpEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]))
}

function rpMoney(value) {
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`
}

function rpLine(label, value) {
  return `<div class="printLine"><span>${rpEscape(label)}</span><strong>${rpEscape(value)}</strong></div>`
}

function rpPaymentTotal(payments = {}) {
  return Object.values(payments).reduce((sum, value) => sum + Number(value || 0), 0)
}

function rpTables(record = {}) {
  return [...(record.tables || []), ...(record.closedTables || [])]
}

function rebuildClosingsPrint() {
  const page = document.querySelector('.reportsPremiumPage')
  const title = page?.querySelector('.reportsHeader h1')?.textContent?.trim() || ''
  if (!title.toLowerCase().includes('fechamentos')) return

  const printArea = page.querySelector('.reportsPrintReport')
  if (!printArea) return

  let closings = []
  try { closings = JSON.parse(localStorage.getItem('fogao-closings-v1') || '[]') } catch { closings = [] }
  const selectedDate = localStorage.getItem('fogao-reports-date') || new Date().toISOString().slice(0, 10)
  closings = closings.filter(record => record.date === selectedDate)

  const summary = closings.reduce((acc, record) => {
    const informed = Number(record.informedTotal ?? rpPaymentTotal(record.payments || {}))
    acc.total += Number(record.total || 0)
    acc.informed += informed
    acc.difference += Number(record.difference ?? informed - Number(record.total || 0))
    return acc
  }, { total: 0, informed: 0, difference: 0 })

  const details = closings.map((record, index) => {
    const payments = record.payments || {}
    const informed = Number(record.informedTotal ?? rpPaymentTotal(payments))
    const difference = Number(record.difference ?? informed - Number(record.total || 0))
    const tables = rpTables(record)
    const tableRows = tables.length ? tables.map(table => {
      const total = Number(table.total || (table.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0))
      const waiter = table.waiterName || table.kitchenWaiterName || table.openedByName || table.createdByName || 'Sem garçom'
      const itemRows = (table.items || []).map(item => rpLine(`${Number(item.qty || 0)}x ${item.name || 'Produto'}`, rpMoney(Number(item.price || 0) * Number(item.qty || 0)))).join('')
      return `<div class="printClosingTable"><p><strong>Mesa ${rpEscape(table.number || table.tableNumber || '-')}</strong> — ${rpEscape(waiter)} — ${rpEscape(rpMoney(total))}</p>${itemRows}</div>`
    }).join('') : '<p>Nenhuma mesa registrada.</p>'

    return `<hr><h2>Fechamento ${index + 1}</h2>
      ${rpLine('Fechado em', record.closedAtLabel || record.closedAt || record.date || '-')}
      ${rpLine('Operador responsável', record.operatorName || 'Não informado')}
      ${rpLine('Total fechado', rpMoney(record.total))}
      ${rpLine('Total informado', rpMoney(informed))}
      ${rpLine('Diferença', rpMoney(difference))}
      ${rpLine('Mesas', String(record.tableCount || tables.length || 0))}
      ${rpLine('Itens', String(record.itemCount || 0))}
      <p><strong>Formas de pagamento</strong></p>
      ${rpLine('Dinheiro', rpMoney(payments.dinheiro))}
      ${rpLine('PIX', rpMoney(payments.pix))}
      ${rpLine('Cartão', rpMoney(payments.cartao))}
      ${rpLine('Outros', rpMoney(payments.outros))}
      ${record.note ? `<p><strong>Observação:</strong> ${rpEscape(record.note)}</p>` : ''}
      <p><strong>Mesas do fechamento</strong></p>${tableRows}`
  }).join('')

  printArea.innerHTML = `<h1>FECHAMENTOS ANTERIORES</h1>
    <p><strong>Fogão a Lenha</strong></p>
    <p><strong>Gerado em:</strong> ${rpEscape(new Date().toLocaleString('pt-BR'))}</p>
    <hr><p><strong>Resumo geral</strong></p>
    ${rpLine('Fechamentos', String(closings.length))}
    ${rpLine('Total fechado', rpMoney(summary.total))}
    ${rpLine('Total informado', rpMoney(summary.informed))}
    ${rpLine('Diferença', rpMoney(summary.difference))}
    ${details || '<p>Nenhum fechamento encontrado nesta data.</p>'}
    <hr><p class="printFooter">Relatório gerado pelo sistema Fogão a Lenha.</p>`
}

document.addEventListener('click', event => {
  const button = event.target?.closest?.('button')
  const text = button?.textContent || ''
  if (text.includes('Imprimir') || text.includes('Exportar PDF')) rebuildClosingsPrint()
}, true)

window.addEventListener('beforeprint', rebuildClosingsPrint)
