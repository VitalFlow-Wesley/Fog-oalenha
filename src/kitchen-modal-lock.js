let scrollPosition = 0
let modalLocked = false

function lockPage() {
  if (modalLocked) return
  modalLocked = true
  scrollPosition = window.scrollY || 0
  document.documentElement.classList.add('kitchen-modal-open')
  document.body.classList.add('kitchen-modal-open')
  document.body.style.position = 'fixed'
  document.body.style.top = '-' + scrollPosition + 'px'
  document.body.style.left = '0'
  document.body.style.right = '0'
  document.body.style.width = '100%'
}

function unlockPage() {
  if (!modalLocked) return
  modalLocked = false
  document.documentElement.classList.remove('kitchen-modal-open')
  document.body.classList.remove('kitchen-modal-open')
  document.body.style.position = ''
  document.body.style.top = ''
  document.body.style.left = ''
  document.body.style.right = ''
  document.body.style.width = ''
  window.scrollTo(0, scrollPosition)
}

function updateLock() {
  if (document.querySelector('.kitchenDetailsModal')) lockPage()
  else unlockPage()
}

function stopOuterScroll(event) {
  if (!document.querySelector('.kitchenDetailsModal')) return
  if (event.target.closest('.kitchenDetailsList')) return
  event.preventDefault()
}

new MutationObserver(updateLock).observe(document.documentElement, { childList: true, subtree: true })
document.addEventListener('touchmove', stopOuterScroll, { passive: false })
window.setTimeout(updateLock, 200)
