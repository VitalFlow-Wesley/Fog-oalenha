const fields = {
  apiUrl: document.querySelector('#apiUrl'),
  agentToken: document.querySelector('#agentToken'),
  cashierPrinterName: document.querySelector('#cashierPrinterName'),
  kitchenPrinterIp: document.querySelector('#kitchenPrinterIp'),
  kitchenPrinterPort: document.querySelector('#kitchenPrinterPort'),
  simulationMode: document.querySelector('#simulationMode'),
}

const log = document.querySelector('#log')

function addLog(message, level = 'info') {
  const line = document.createElement('div')
  line.className = level
  line.textContent = `[${new Date().toLocaleTimeString('pt-BR')}] ${message}`
  log.prepend(line)
}

async function loadPrinters(selected = '') {
  const printers = await window.printAgent.listPrinters()
  fields.cashierPrinterName.replaceChildren()

  const placeholder = document.createElement('option')
  placeholder.value = ''
  placeholder.textContent = printers.length ? 'Selecione a impressora do caixa' : 'Nenhuma impressora encontrada'
  fields.cashierPrinterName.appendChild(placeholder)

  printers.forEach(printer => {
    const option = document.createElement('option')
    option.value = printer.name
    option.textContent = printer.displayName || printer.name
    fields.cashierPrinterName.appendChild(option)
  })

  fields.cashierPrinterName.value = selected || ''
  addLog(`${printers.length} impressora(s) encontrada(s) no Windows.`)
}

async function loadSettings() {
  const settings = await window.printAgent.getSettings()
  fields.apiUrl.value = settings.apiUrl || ''
  fields.agentToken.value = settings.agentToken || ''
  fields.kitchenPrinterIp.value = settings.kitchenPrinterIp || ''
  fields.kitchenPrinterPort.value = settings.kitchenPrinterPort || 9100
  fields.simulationMode.checked = settings.simulationMode !== false
  await loadPrinters(settings.cashierPrinterName || '')
}

function readSettings() {
  return {
    apiUrl: fields.apiUrl.value.trim(),
    agentToken: fields.agentToken.value.trim(),
    cashierPrinterName: fields.cashierPrinterName.value,
    kitchenPrinterIp: fields.kitchenPrinterIp.value.trim(),
    kitchenPrinterPort: Number(fields.kitchenPrinterPort.value || 9100),
    simulationMode: fields.simulationMode.checked,
  }
}

document.querySelector('#save').addEventListener('click', async () => {
  await window.printAgent.saveSettings(readSettings())
  addLog('Configurações salvas com sucesso.', 'success')
})

document.querySelector('#refreshPrinters').addEventListener('click', () => {
  loadPrinters(fields.cashierPrinterName.value).catch(error => addLog(error.message, 'error'))
})

document.querySelector('#testCashier').addEventListener('click', async () => {
  try {
    await window.printAgent.saveSettings(readSettings())
    await window.printAgent.testCashier()
    addLog('Teste do caixa executado.', 'success')
  } catch (error) {
    addLog(`Falha no teste do caixa: ${error.message}`, 'error')
  }
})

document.querySelector('#testKitchen').addEventListener('click', async () => {
  try {
    await window.printAgent.saveSettings(readSettings())
    await window.printAgent.testKitchen()
    addLog('Teste da cozinha executado.', 'success')
  } catch (error) {
    addLog(`Falha no teste da cozinha: ${error.message}`, 'error')
  }
})

document.querySelector('#pollNow').addEventListener('click', async () => {
  try {
    await window.printAgent.pollNow()
    addLog('Fila verificada manualmente.')
  } catch (error) {
    addLog(`Falha ao verificar fila: ${error.message}`, 'error')
  }
})

window.printAgent.onStatus(({ message, level }) => addLog(message, level))
window.printAgent.onJobsProcessed(count => addLog(`${count} trabalho(s) processado(s).`, 'success'))

loadSettings().catch(error => addLog(`Erro ao iniciar: ${error.message}`, 'error'))
