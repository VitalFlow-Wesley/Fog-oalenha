import { app, BrowserWindow, ipcMain } from 'electron'
import Store from 'electron-store'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const agentDir = path.dirname(fileURLToPath(import.meta.url))

const store = new Store({
  defaults: {
    // O agente é sempre local. A fila e a impressão não dependem da internet.
    apiUrl: process.env.FOGAO_PRINT_API_URL || 'http://127.0.0.1:3000/api/print-jobs',
    agentToken: '',
    cashierPrinterName: process.env.FOGAO_CASHIER_PRINTER_NAME || 'POS-80',
    kitchenPrinterIp: process.env.FOGAO_KITCHEN_PRINTER_IP || '192.168.1.110',
    kitchenPrinterPort: 9100,
    simulationMode: process.env.FOGAO_PRINT_SIMULATION_MODE === 'true',
    pollingIntervalMs: 2500,
  },
})

if (process.env.FOGAO_PRINT_API_URL) store.set('apiUrl', process.env.FOGAO_PRINT_API_URL)
if (process.env.FOGAO_PRINT_AGENT_TOKEN) store.set('agentToken', process.env.FOGAO_PRINT_AGENT_TOKEN)
if (process.env.FOGAO_CASHIER_PRINTER_NAME) store.set('cashierPrinterName', process.env.FOGAO_CASHIER_PRINTER_NAME)
if (process.env.FOGAO_KITCHEN_PRINTER_IP) store.set('kitchenPrinterIp', process.env.FOGAO_KITCHEN_PRINTER_IP)
if (process.env.FOGAO_KITCHEN_PRINTER_PORT) store.set('kitchenPrinterPort', Number(process.env.FOGAO_KITCHEN_PRINTER_PORT))
if (process.env.FOGAO_PRINT_SIMULATION_MODE) store.set('simulationMode', process.env.FOGAO_PRINT_SIMULATION_MODE === 'true')

let mainWindow
let pollingTimer
let isPolling = false

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 880,
    height: 680,
    minWidth: 760,
    minHeight: 560,
    webPreferences: {
      preload: path.join(agentDir, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.loadFile(path.join(agentDir, 'renderer', 'index.html'))
}

function emitStatus(message, level = 'info') {
  process.stdout.write(`[PRINT] ${message}\n`)
  mainWindow?.webContents.send('agent:status', {
    message,
    level,
    at: new Date().toISOString(),
  })
}

function authHeaders() {
  const token = String(store.get('agentToken') || '').trim()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiRequest(method, body, query = '') {
  const url = `${store.get('apiUrl')}${query}`
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `Erro HTTP ${response.status}`)
  return payload
}

function money(value) {
  // ESC/POS thermal printers do not reliably decode the non-breaking space
  // emitted by Intl for Brazilian currency ("R$\u00a06,00"). Keep the receipt
  // strictly ASCII so it prints as "R$ 6,00", never "R$â6,00".
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function textLine(text = '', width = 42) {
  const normalized = String(text).replace(/\s+/g, ' ').trim()
  if (normalized.length <= width) return normalized
  const parts = []
  for (let index = 0; index < normalized.length; index += width) {
    parts.push(normalized.slice(index, index + width))
  }
  return parts.join('\n')
}

function buildCashierText(job) {
  const lines = [
    '\x1B\x40',
    '\x1B\x61\x01',
    '================================\n',
    '         FOGAO A LENHA          \n',
    '      CONTA DO CLIENTE          \n',
    '================================\n',
    '\x1B\x61\x00',
    `Mesa: ${job.tableNumber || '-'}\n`,
    job.waiterName ? `Garcom: ${job.waiterName}\n` : '',
    '--------------------------------\n',
  ]

  for (const item of job.items || []) {
    const qty = Number(item.qty ?? item.quantity ?? 1)
    lines.push(textLine(`${qty}x ${item.name || 'Item'}`) + '\n')
    lines.push(`  ${money(Number(item.price || 0) * qty)}\n`)
    if (item.observation) lines.push(textLine(`OBS: ${item.observation}`) + '\n')
  }

  lines.push('--------------------------------\n')
  lines.push('\x1B\x61\x01')
  lines.push('TOTAL DA CONTA\n')
  lines.push('\x1B\x21\x30')
  lines.push(`${money(job.total)}\n`)
  lines.push('\x1B\x21\x00')
  lines.push('Obrigado pela preferencia!\n\n\n\n')
  lines.push('\x1D\x56\x41\x00')
  return lines.join('')
}

function buildKitchenText(job) {
  const isCancellation = job.kind === 'cancellation'
  const ticketTitle = isCancellation ? 'CANCELAMENTO\nNAO PREPARAR\n' : 'PEDIDO PARA PREPARO\n'
  const lines = [
    '\x1B\x40',
    '\x1B\x61\x01',
    '\x1D\x21\x11',
    'FOGÃO A LENHA\n',
    '\x1D\x21\x00',
    ticketTitle,
    '\x1B\x61\x00',
    '------------------------------------------\n',
    `Mesa: ${job.tableNumber || '-'}\n`,
    job.customerName ? `Cliente: ${job.customerName}\n` : '',
    job.waiterName ? `Garçom: ${job.waiterName}\n` : '',
    job.guests ? `Pessoas: ${job.guests}\n` : '',
    `Horário: ${new Date(job.createdAt || Date.now()).toLocaleString('pt-BR')}\n`,
    '------------------------------------------\n',
  ]

  for (const item of job.items || []) {
    lines.push('\x1D\x21\x01')
    lines.push(textLine(`${item.qty ?? item.quantity ?? 1}x ${item.name || 'Item'}`) + '\n')
    lines.push('\x1D\x21\x00')
    if (item.observation) lines.push(textLine(`OBS: ${item.observation}`) + '\n')
    if (isCancellation && item.cancellationReason) lines.push(textLine(`MOTIVO: ${item.cancellationReason}`) + '\n')
    lines.push('\n')
  }

  lines.push('------------------------------------------\n')
  lines.push(`Pedido: ${job._id || job.dedupeKey || '-'}\n\n\n`)
  lines.push('\x1D\x56\x00')
  return Buffer.from(lines.join(''), 'latin1')
}

async function printCashier(job) {
  const jobTag = `job=${job._id || job.dedupeKey || '-'}`
  if (store.get('simulationMode')) {
    emitStatus(`${jobTag} Simulação: conta da mesa ${job.tableNumber} enviada ao caixa.`)
    return 'SIMULAÇÃO - CAIXA'
  }

  const deviceName = String(store.get('cashierPrinterName') || '').trim()
  if (!deviceName) throw new Error('Impressora do caixa não configurada.')

  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: false, nodeIntegration: false },
  })
  try {
    await printWindow.loadFile(path.join(agentDir, 'renderer', 'qz-print.html'))
    const result = await printWindow.webContents.executeJavaScript(`
      (async () => {
        if (!window.qz) throw new Error('QZ Tray indisponível no agente local.')
        const apiBase = ${JSON.stringify(String(store.get('apiUrl')).replace('/api/print-jobs', ''))}
        const agentToken = ${JSON.stringify(String(store.get('agentToken') || ''))}
        const authHeaders = agentToken ? { Authorization: 'Bearer ' + agentToken } : {}
        qz.security.setCertificatePromise(resolve => {
          fetch(apiBase + '/api/qz-certificate', { cache: 'no-store', headers: authHeaders })
            .then(response => response.ok ? response.text() : '')
            .then(certificate => resolve(String(certificate || '').trim()))
            .catch(() => resolve(''))
        })
        qz.security.setSignaturePromise(toSign => (resolve, reject) => {
          fetch(apiBase + '/api/qz-sign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ request: toSign }),
          })
            .then(response => response.ok ? response.json() : Promise.reject(new Error('Assinatura QZ indisponível.')))
            .then(payload => payload?.signature ? resolve(payload.signature) : reject(new Error('Assinatura QZ vazia.')))
            .catch(reject)
        })
        if (qz.security.setSignatureAlgorithm) qz.security.setSignatureAlgorithm('SHA512')
        const within = (promise, label) => Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Tempo esgotado no QZ Tray: ' + label)), 12000)),
        ])
        if (!qz.websocket.isActive()) await within(qz.websocket.connect(), 'conexão')
        const requested = ${JSON.stringify(deviceName)}
        const found = await within(qz.printers.find(requested), 'localização da impressora')
        const names = Array.isArray(found) ? found : [found]
        if (!names.includes(requested)) throw new Error('Impressora do caixa não encontrada: ' + requested)
        const config = qz.configs.create(requested)
        await within(qz.print(config, [${JSON.stringify(buildCashierText(job))}]), 'envio RAW')
        return requested
      })()
    `)
    if (result !== deviceName) throw new Error(`Impressora do caixa não encontrada: ${deviceName}`)
    emitStatus(`${jobTag} setor=caixa method=qz-raw printer=${deviceName}`)
    emitStatus(`${jobTag} printer found`)
    emitStatus(`${jobTag} sent`)
  } finally {
    if (!printWindow.isDestroyed()) printWindow.close()
  }

  return deviceName
}

async function printKitchen(job) {
  const jobTag = `job=${job._id || job.dedupeKey || '-'}`
  if (store.get('simulationMode')) {
    emitStatus(`Simulação: pedido da mesa ${job.tableNumber} enviado à cozinha.`)
    return 'SIMULAÇÃO - COZINHA'
  }

  const host = String(store.get('kitchenPrinterIp') || '').trim()
  const port = Number(store.get('kitchenPrinterPort') || 9100)
  if (!host) throw new Error('IP da impressora da cozinha não configurado.')

  const payload = buildKitchenText(job)
  emitStatus(`${jobTag} setor=cozinha method=raw target=${host}:${port}`)
  emitStatus(`${jobTag} connected: connecting`)

  await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port })
    const timeout = setTimeout(() => {
      socket.destroy()
      reject(new Error('Tempo esgotado ao conectar na impressora da cozinha.'))
    }, 5000)

    socket.on('connect', () => {
      emitStatus(`${jobTag} connected`)
      emitStatus(`${jobTag} sent: ESC/POS`)
      socket.write(payload, error => {
        clearTimeout(timeout)
        socket.end()
        if (error) reject(error)
        else resolve()
      })
    })

    socket.on('error', error => {
      clearTimeout(timeout)
      reject(error)
    })
  })

  return `${host}:${port}`
}

async function processJob(job) {
  const jobTag = `job=${job._id || '-'}`
  emitStatus(`${jobTag} recebido tipo=${job.type} setor=${job.type === 'cashier' || job.type === 'bill' ? 'caixa' : 'cozinha'}`)
  await apiRequest('PATCH', { id: job._id, status: 'printing', agentId: 'fogao-a-lenha-local' })

  try {
    const printer = job.type === 'cashier' || job.type === 'bill'
      ? await printCashier(job)
      : await printKitchen(job)

    await apiRequest('PATCH', {
      id: job._id,
      status: 'printed',
      printer,
    })
    emitStatus(`${jobTag} success status=printed printer=${printer}`, 'success')
  } catch (error) {
    await apiRequest('PATCH', {
      id: job._id,
      status: 'error',
      error: error.message,
    }).catch(() => {})
    emitStatus(`${jobTag} failure status=failed reason=${error.message}`, 'error')
  }
}

async function poll() {
  if (isPolling) return
  isPolling = true

  try {
    const jobs = await apiRequest('GET', null, '?status=pending&limit=10')
    for (const job of jobs) await processJob(job)
    if (jobs.length) mainWindow?.webContents.send('agent:jobs-processed', jobs.length)
  } catch (error) {
    emitStatus(`Fila indisponível: ${error.message}`, 'error')
  } finally {
    isPolling = false
  }
}

function restartPolling() {
  clearInterval(pollingTimer)
  const interval = Math.max(1000, Number(store.get('pollingIntervalMs') || 2500))
  pollingTimer = setInterval(poll, interval)
  poll()
}

ipcMain.handle('settings:get', () => store.store)
ipcMain.handle('settings:save', (_event, settings) => {
  store.set(settings)
  restartPolling()
  return store.store
})
ipcMain.handle('printers:list', async () => {
  const win = new BrowserWindow({ show: false })
  const printers = await win.webContents.getPrintersAsync()
  win.close()
  return printers
})
ipcMain.handle('agent:test-cashier', async () => printCashier({
  type: 'cashier',
  tableNumber: 'TESTE',
  customerName: 'Cliente teste',
  waiterName: 'Sistema',
  items: [{ quantity: 1, name: 'Teste de impressão', price: 1, total: 1 }],
  total: 1,
}))
ipcMain.handle('agent:test-kitchen', async () => printKitchen({
  type: 'kitchen',
  tableNumber: 'TESTE',
  customerName: 'Cliente teste',
  waiterName: 'Sistema',
  guests: 1,
  items: [{ quantity: 1, name: 'Teste de impressão', observation: 'Acentuação: ç ã é ó' }],
  createdAt: new Date().toISOString(),
}))
ipcMain.handle('agent:poll-now', poll)

app.whenReady().then(() => {
  createWindow()
  app.setLoginItemSettings({ openAtLogin: true })
  restartPolling()
})

app.on('window-all-closed', () => {
  clearInterval(pollingTimer)
  if (process.platform !== 'darwin') app.quit()
})
