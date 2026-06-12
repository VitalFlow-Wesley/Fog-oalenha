function compactClosedTables() {
  const modal = document.querySelector('.closedTablesModal')
  if (!modal || modal.dataset.compactReady) return

  const dateFilter = modal.querySelector('.closedTablesDateFilter')
  const summary = modal.querySelector('.closedTablesSummary')
  if (!dateFilter || !summary) return

  const toolbar = document.createElement('div')
  toolbar.className = 'closedTablesCompactToolbar'

  const dateItem = document.createElement('label')
  dateItem.className = 'closedTablesCompactItem closedTablesCompactDateItem'
  const dateLabel = document.createElement('span')
  dateLabel.className = 'closedTablesCompactLabel'
  dateLabel.textContent = 'Data'
  const dateInput = dateFilter.querySelector('input')
  if (!dateInput) return
  dateInput.classList.add('closedTablesCompactDate')
  dateItem.append(dateLabel, dateInput)
  toolbar.append(dateItem)

  Array.from(summary.children).forEach(item => {
    item.classList.add('closedTablesCompactItem')
    toolbar.append(item)
  })

  dateFilter.replaceWith(toolbar)
  summary.remove()
  modal.dataset.compactReady = 'true'
}

document.addEventListener('click', function () {
  setTimeout(compactClosedTables, 50)
}, true)

setInterval(compactClosedTables, 500)
