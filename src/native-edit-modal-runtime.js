function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function buildModal() {
  const overlay = document.createElement('div')
  overlay.className = 'nativeEditModalOverlay'
  overlay.hidden = true

  const card = document.createElement('div')
  card.className = 'nativeEditModalCard'
  card.setAttribute('role', 'dialog')
  card.setAttribute('aria-modal', 'true')

  const eyebrow = document.createElement('span')
  eyebrow.className = 'nativeEditModalEyebrow'
  eyebrow.textContent = 'EDIÇÃO'

  const title = document.createElement('h2')
  const description = document.createElement('p')
  description.className = 'nativeEditModalDescription'

  const form = document.createElement('form')
  form.className = 'nativeEditModalForm'

  const label = document.createElement('label')
  const labelText = document.createElement('span')
  const input = document.createElement('input')
  input.maxLength = 80
  input.required = true
  label.append(labelText, input)

  const error = document.createElement('p')
  error.className = 'nativeEditModalError'
  error.hidden = true

  const actions = document.createElement('div')
  actions.className = 'nativeEditModalActions'
  const cancel = document.createElement('button')
  cancel.type = 'button'
  cancel.textContent = 'Cancelar'
  const save = document.createElement('button')
  save.type = 'submit'
  save.textContent = 'Salvar alteração'
  actions.append(cancel, save)
  form.append(label, error, actions)
  card.append(eyebrow, title, description, form)
  overlay.append(card)
  document.body.append(overlay)

  return { overlay, title, description, labelText, input, error, form, cancel }
}

let modalElements

function closeEditor() {
  if (!modalElements) return
  modalElements.overlay.hidden = true
  document.body.classList.remove('native-edit-modal-open')
}

function openEditor(options) {
  modalElements ||= buildModal()
  const { overlay, title, description, labelText, input, error, form, cancel } = modalElements
  title.textContent = options.title
  description.textContent = options.description
  labelText.textContent = options.label
  input.value = options.value || ''
  error.hidden = true

  cancel.onclick = closeEditor
  overlay.onclick = event => {
    if (event.target === overlay) closeEditor()
  }
  form.onsubmit = event => {
    event.preventDefault()
    const nextValue = input.value.trim()
    if (!nextValue) {
      error.textContent = 'Digite um nome válido.'
      error.hidden = false
      return
    }
    try {
      options.onSave(nextValue)
      closeEditor()
    } catch (saveError) {
      error.textContent = saveError.message || 'Não foi possível salvar.'
      error.hidden = false
    }
  }

  overlay.hidden = false
  document.body.classList.add('native-edit-modal-open')
  setTimeout(() => input.focus(), 30)
}

function updateTable(number, currentName, nextName) {
  const tables = readJson('fogao-tables-v1', [])
  let changed = false
  const updated = tables.map(table => {
    if (String(table.number) !== String(number) && table.displayName !== currentName) return table
    changed = true
    return { ...table, displayName: nextName }
  })
  if (!changed) throw new Error('Mesa não encontrada.')
  writeJson('fogao-tables-v1', updated)
  window.dispatchEvent(new Event('fogao-tables-updated'))
  setTimeout(() => window.location.reload(), 200)
}

function updatePrinter(currentName, nextName) {
  const settings = readJson('fogao-settings-v1', {})
  const printers = Array.isArray(settings.printers) ? settings.printers : []
  let changed = false
  const updated = printers.map(printer => {
    if (changed || printer.name !== currentName) return printer
    changed = true
    return { ...printer, name: nextName }
  })
  if (!changed) throw new Error('Impressora não encontrada.')
  writeJson('fogao-settings-v1', { ...settings, printers: updated })
  window.dispatchEvent(new Event('fogao-settings-updated'))
  setTimeout(() => window.location.reload(), 200)
}

document.addEventListener('click', event => {
  const button = event.target.closest('button')
  if (!button) return

  const tableRow = button.closest('.registeredTablesRow')
  if (tableRow && button.textContent.includes('Editar')) {
    event.preventDefault()
    event.stopPropagation()
    const number = tableRow.querySelector(':scope > span')?.textContent?.trim() || ''
    const currentName = tableRow.querySelector(':scope > strong')?.textContent?.trim() || ''
    openEditor({
      title: 'Editar nome da mesa',
      description: 'Defina como esta mesa será exibida no salão e nas comandas.',
      label: 'Nome exibido',
      value: currentName,
      onSave: nextName => updateTable(number, currentName, nextName),
    })
    return
  }

  const printerRow = button.closest('.printerTableRow')
  const printerActions = button.closest('.printerTableActions')
  if (printerRow && printerActions && !button.textContent.includes('Testar') && !button.classList.contains('iconDanger')) {
    event.preventDefault()
    event.stopPropagation()
    const currentName = printerRow.querySelector(':scope > strong')?.textContent?.trim() || ''
    openEditor({
      title: 'Editar impressora',
      description: 'Altere o nome usado para identificar esta impressora.',
      label: 'Nome da impressora',
      value: currentName,
      onSave: nextName => updatePrinter(currentName, nextName),
    })
  }
}, true)

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeEditor()
})
