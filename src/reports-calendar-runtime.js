function findReportDateControl() {
  const page = document.querySelector('.reportsPremiumPage')
  if (!page) return null

  const actions = page.querySelector('.reportsActions')
  if (!actions) return null

  const input = actions.querySelector('input[type="date"]')
  if (!input) return null

  return input.closest('.reportActionBtn') || input.parentElement
}

function openDatePicker(input) {
  if (!input) return

  try {
    input.focus({ preventScroll: true })
  } catch {
    input.focus()
  }

  try {
    if (typeof input.showPicker === 'function') {
      input.showPicker()
      return
    }
  } catch {
    // Alguns navegadores bloqueiam showPicker; nesse caso tenta o click normal.
  }

  input.click()
}

function fixReportsDateButton() {
  const control = findReportDateControl()
  if (!control || control.dataset.dateRuntimeFixed === '1') return

  const input = control.querySelector('input[type="date"]')
  if (!input) return

  control.dataset.dateRuntimeFixed = '1'
  control.setAttribute('role', 'button')
  control.setAttribute('tabindex', '0')
  control.style.cursor = 'pointer'

  input.style.position = 'absolute'
  input.style.left = '0'
  input.style.top = '0'
  input.style.width = '100%'
  input.style.height = '100%'
  input.style.opacity = '0'
  input.style.cursor = 'pointer'
  input.style.zIndex = '3'

  control.addEventListener('click', event => {
    const clickedInput = event.target === input
    if (!clickedInput) {
      event.preventDefault()
      openDatePicker(input)
    }
  })

  control.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openDatePicker(input)
    }
  })
}

if (!window.__fogaoReportsDateClickFixInstalled) {
  window.__fogaoReportsDateClickFixInstalled = true
  window.addEventListener('DOMContentLoaded', fixReportsDateButton)
  window.addEventListener('focus', fixReportsDateButton)
  new MutationObserver(fixReportsDateButton).observe(document.body, { childList: true, subtree: true })
  setTimeout(fixReportsDateButton, 300)
}
