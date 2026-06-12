function arrangeMobileCommand() {
  const isMobile = window.matchMedia('(max-width: 900px)').matches

  document.querySelectorAll('.commandHeader').forEach(header => {
    const titleRow = header.querySelector('.commandTitleRow')
    const actions = header.querySelector('.commandActions')
    const guests = header.querySelector('.commandGuestsEditor')

    if (!titleRow || !actions || !guests) return

    if (isMobile) {
      if (guests.parentElement !== actions) {
        actions.insertBefore(guests, actions.firstChild)
      }
      header.classList.add('commandHeaderMobileReady')
    } else {
      if (guests.parentElement !== titleRow) {
        titleRow.appendChild(guests)
      }
      header.classList.remove('commandHeaderMobileReady')
    }
  })
}

let scheduled = false
function scheduleArrangeMobileCommand() {
  if (scheduled) return
  scheduled = true
  requestAnimationFrame(() => {
    scheduled = false
    arrangeMobileCommand()
  })
}

new MutationObserver(scheduleArrangeMobileCommand).observe(document.documentElement, {
  childList: true,
  subtree: true,
})

window.addEventListener('resize', scheduleArrangeMobileCommand)
window.addEventListener('orientationchange', scheduleArrangeMobileCommand)
window.addEventListener('DOMContentLoaded', scheduleArrangeMobileCommand)
window.setTimeout(scheduleArrangeMobileCommand, 200)
