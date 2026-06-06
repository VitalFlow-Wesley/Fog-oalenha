function enhanceRegisteredTables() {
  const root = document.querySelector('.tablesSettingsPage')
  if (!root) return

  const panel = root.querySelector('.registeredTablesPanel')
  const table = panel?.querySelector('.registeredTablesTable')
  const hint = panel?.querySelector('.tablePaginationHint')
  if (!panel || !table || !hint || panel.dataset.viewMoreReady === 'true') return

  const match = hint.textContent.match(/Mostrando\s+(\d+)\s+de\s+(\d+)/i)
  if (!match) return

  const visible = Number(match[1]) || 0
  const total = Number(match[2]) || 0
  if (total <= visible) return

  panel.dataset.viewMoreReady = 'true'
  const wrap = document.createElement('div')
  wrap.className = 'tableViewMoreWrap'
  wrap.innerHTML = `<span class="tableViewMoreInfo">Mostrando ${visible} de ${total} mesas</span><button type="button" class="tableViewMoreBtn">Ver mais mesas</button>`
  hint.replaceWith(wrap)

  const button = wrap.querySelector('button')
  const info = wrap.querySelector('span')
  let expanded = false

  button.addEventListener('click', () => {
    expanded = !expanded
    table.querySelectorAll('.generatedMoreRow').forEach(row => row.remove())

    if (!expanded) {
      info.textContent = `Mostrando ${visible} de ${total} mesas`
      button.textContent = 'Ver mais mesas'
      return
    }

    const rows = [...table.querySelectorAll('.registeredTablesRow:not(.generatedMoreRow)')]
    const sample = rows[rows.length - 1]
    const namePrefix = sample?.querySelector('strong')?.textContent?.replace(/\s*\d+$/, '') || 'Mesa'

    for (let index = visible + 1; index <= total; index += 1) {
      const number = String(index).padStart(2, '0')
      const row = document.createElement('div')
      row.className = 'registeredTablesRow generatedMoreRow'
      row.innerHTML = `
        <span>${number}</span>
        <strong>${namePrefix} ${number}</strong>
        <button type="button" class="miniStatus active">Ativa</button>
        <button type="button" class="miniStatus active">Sim</button>
        <div class="tableRowActions generatedTableActions">Salve para editar</div>
      `
      table.appendChild(row)
    }

    info.textContent = `Mostrando ${total} de ${total} mesas`
    button.textContent = 'Ver menos'
  })
}

const observer = new MutationObserver(() => enhanceRegisteredTables())
observer.observe(document.body, { childList: true, subtree: true })

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', enhanceRegisteredTables)
} else {
  enhanceRegisteredTables()
}
