function enhanceMovementChart() {
  document.querySelectorAll('.movementChart').forEach(chart => {
    const columns = [...chart.children]
    if (!columns.length) return

    const values = columns.map(column => {
      const bar = column.querySelector('span')
      const rawHeight = Number.parseFloat(bar?.style.height || '0')
      return Number.isFinite(rawHeight) ? Math.max(0, rawHeight - 8) / 24 : 0
    })

    const maxValue = Math.max(0, ...values)

    columns.forEach((column, index) => {
      const bar = column.querySelector('span')
      const label = column.querySelector('small')
      if (!bar || !label) return

      const value = Math.round(values[index])
      const ratio = maxValue > 0 ? value / maxValue : 0
      const normalizedHeight = value > 0 ? Math.max(14, Math.round(ratio * 112)) : 8

      bar.style.height = `${normalizedHeight}px`
      bar.dataset.level = ratio >= 1 && value > 0 ? 'peak' : ratio >= 0.66 ? 'high' : ratio >= 0.34 ? 'medium' : value > 0 ? 'low' : 'empty'
      bar.title = `${label.textContent}: ${value} ${value === 1 ? 'comanda' : 'comandas'}`

      let valueLabel = column.querySelector('.movementBarValue')
      if (!valueLabel) {
        valueLabel = document.createElement('b')
        valueLabel.className = 'movementBarValue'
        column.insertBefore(valueLabel, bar)
      }
      valueLabel.textContent = value > 0 ? String(value) : ''

      let peakLabel = column.querySelector('.movementPeakLabel')
      if (bar.dataset.level === 'peak') {
        if (!peakLabel) {
          peakLabel = document.createElement('em')
          peakLabel.className = 'movementPeakLabel'
          column.insertBefore(peakLabel, valueLabel)
        }
        peakLabel.textContent = 'Pico'
      } else {
        peakLabel?.remove()
      }
    })
  })
}

let scheduled = false
function scheduleEnhanceMovementChart() {
  if (scheduled) return
  scheduled = true
  requestAnimationFrame(() => {
    scheduled = false
    enhanceMovementChart()
  })
}

const observer = new MutationObserver(scheduleEnhanceMovementChart)
observer.observe(document.documentElement, { childList: true, subtree: true })
window.addEventListener('focus', scheduleEnhanceMovementChart)
window.setTimeout(scheduleEnhanceMovementChart, 300)
