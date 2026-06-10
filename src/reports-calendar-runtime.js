function formatDateBR(value) {
  if (!value) return 'Hoje'
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return 'Hoje'
  const today = new Date()
  const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  if (value === todayValue) return 'Hoje'
  return `${day}/${month}/${year}`
}

function getTodayValue() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

function enhanceReportsCalendar() {
  const reportsPage = document.querySelector('.reportsPremiumPage')
  if (!reportsPage) return

  const calendarButton = Array.from(reportsPage.querySelectorAll('.reportsActions .reportActionBtn'))
    .find(button => button.textContent.trim().includes('Hoje') || /\d{2}\/\d{2}\/\d{4}/.test(button.textContent))

  if (!calendarButton || calendarButton.dataset.calendarRuntime === '1') return
  calendarButton.dataset.calendarRuntime = '1'
  calendarButton.classList.add('reportCalendarPickerBtn')
  calendarButton.type = 'button'

  const labelSpan = document.createElement('span')
  labelSpan.className = 'reportCalendarLabel'
  labelSpan.textContent = localStorage.getItem('fogao-reports-date-label') || 'Hoje'

  const input = document.createElement('input')
  input.type = 'date'
  input.className = 'reportCalendarInput'
  input.value = localStorage.getItem('fogao-reports-date') || getTodayValue()
  input.setAttribute('aria-label', 'Selecionar data do relatório')

  const icon = calendarButton.querySelector('svg')
  calendarButton.innerHTML = ''
  if (icon) calendarButton.appendChild(icon)
  calendarButton.appendChild(labelSpan)
  calendarButton.appendChild(input)

  function openPicker() {
    try {
      if (typeof input.showPicker === 'function') input.showPicker()
      else input.click()
    } catch {
      input.click()
    }
  }

  calendarButton.addEventListener('click', event => {
    if (event.target === input) return
    event.preventDefault()
    openPicker()
  })

  input.addEventListener('change', () => {
    const label = formatDateBR(input.value)
    labelSpan.textContent = label
    localStorage.setItem('fogao-reports-date', input.value)
    localStorage.setItem('fogao-reports-date-label', label)

    const tabs = reportsPage.querySelectorAll('.periodTabs button')
    tabs.forEach(tab => tab.classList.toggle('active', tab.textContent.trim() === 'Hoje' && label === 'Hoje'))

    const livePill = reportsPage.querySelector('.liveDataPill')
    if (livePill) {
      livePill.textContent = label === 'Hoje'
        ? 'Dados atualizados em tempo real'
        : `Filtro visual selecionado: ${label}`
    }
  })
}

if (!window.__fogaoReportsCalendarRuntimeInstalled) {
  window.__fogaoReportsCalendarRuntimeInstalled = true
  window.addEventListener('DOMContentLoaded', enhanceReportsCalendar)
  window.addEventListener('focus', enhanceReportsCalendar)
  new MutationObserver(enhanceReportsCalendar).observe(document.body, { childList: true, subtree: true })
  setTimeout(enhanceReportsCalendar, 300)
}
