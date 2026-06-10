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
    // fallback
  }

  input.click()
}

function fixReportsDateButton() {
  const control = findReportDateControl()
  if (!control) return

  const input = control.querySelector('input[type="date"]')
  if (!input) return

  control.setAttribute('role', 'button')
  control.setAttribute('tabindex', '0')
  control.style.cursor = 'pointer'
  control.style.pointerEvents = 'auto'

  input.style.position = 'absolute'
  input.style.left = '0'
  input.style.top = '0'
  input.style.width = '1px'
  input.style.height = '1px'
  input.style.opacity = '0'
  input.style.pointerEvents = 'none'
  input.style.zIndex = '0'

  if (control.dataset.dateRuntimeFixed === '1') return
  control.dataset.dateRuntimeFixed = '1'

  control.addEventListener('click', event => {
    event.preventDefault()
    openDatePicker(input)
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
  window.addEventListener('click', () => setTimeout(fixReportsDateButton, 50), true)
  new MutationObserver(fixReportsDateButton).observe(document.body, { childList: true, subtree: true })
  setTimeout(fixReportsDateButton, 300)
}
