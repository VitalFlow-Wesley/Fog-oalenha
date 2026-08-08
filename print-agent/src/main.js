import { app, BrowserWindow, ipcMain } from 'electron'
import Store from 'electron-store'
import net from 'node:net'

const store = new Store({
  defaults: {
    apiUrl: process.env.FOGAO_PRINT_API_URL || 'https://project-c6vsh.vercel.app/api/print-jobs',
    agentToken: '',
    cashierPrinterName: '',
    kitchenPrinterIp: '',
    kitchenPrinterPort: 9100,
    simulationMode: true,
    pollingIntervalMs: 2500,
  },
})

if (process.env.FOGAO_PRINT_API_URL) store.set('apiUrl', process.env.FOGAO_PRINT_API_URL)
if (process.env.FOGAO_PRINT_AGENT_TOKEN) store.set('agentToken', process.env.FOGAO_PRINT_AGENT_TOKEN)

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
      preload: new URL('./preload.cjs', import.meta.url).pathname,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.loadFile(new URL('./renderer/index.html', import.meta.url).pathname)
}

function emitStatus(message, level = 'info') {
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
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function buildCashierHtml(job) {
  const items = (job.items || []).map(item => `
    <div class="item">
      <span>${escapeHtml(item.quantity || 1)}x ${escapeHtml(item.name || 'Item')}</span>
      <strong>${money(item.total ?? (Number(item.price || 0) * Number(item.quantity || 1)))}</strong>
    </div>
  `).join('')

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: 80mm auto; margin: 3mm; }
    body { width: 72mm; margin: 0; font-family: Arial, sans-serif; font-size: 12px; color: #000; }
    h1 { font-size: 18px; text-align: center; margin: 0 0 3px; }
    .center { text-align: center; }
    .line { border-top: 1px dashed #000; margin: 8px 0; }
    .item { display: flex; justify-content: space-between; gap: 8px; margin: 4px 0; }
    .total { display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; }
  </style></head><body>
    <h1>FOGÃO A LENHA</h1>
    <div class="center">CONTA DO CLIENTE</div>
    <div class="line"></div>
    <div>Mesa: ${escapeHtml(job.tableNumber)}</div>
    ${job.customerName ? `<div>Cliente: ${escapeHtml(job.customerName)}</div>` : ''}
    ${job.waiterName ? `<div>Garçom: ${escapeHtml(job.waiterName)}</div>` : ''}
    <div class="line"></div>
    ${items}
    <div class="line"></div>
    <div class="total"><span>TOTAL</span><strong>${money(job.total)}</strong></div>
    <div class="line"></div>
    <div class="center">Obrigado pela preferência!</div>
  </body></html>`
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

function buildKitchenText(job) {
  const lines = [
    '\x1B\x40',
    '\x1B\x61\x01',
    '\x1D\x21\x11',
    'FOGÃO A LENHA\n',
    '\x1D\x21\x00',
    'PEDIDO PARA PREPARO\n',
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
    lines.push(textLine(`${item.quantity || 1}x ${item.name || 'Item'}`) + '\n')
    lines.push('\x1D\x21\x00')
    if (item.observation) lines.push(textLine(`OBS: ${item.observation}`) + '\n')
    lines.push('\n')
  }

  lines.push('------------------------------------------\n')
  lines.push(`Pedido: ${job._id || job.dedupeKey || '-'}\n\n\n`)
  lines.push('\x1D\x56\x00')
  return Buffer.from(lines.join(''), 'latin1')
}

async function printCashier(job) {
  if (store.get('simulationMode')) {
    emitStatus(`Simulação: conta da mesa ${job.tableNumber} enviada ao caixa.`)
    return 'SIMULAÇÃO - CAIXA'
  }

  const deviceName = String(store.get('cashierPrinterName') || '').trim()
  if (!deviceName) throw new Error('Impressora do caixa não configurada.')

  const printWindow = new BrowserWindow({ show: false })
  await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildCashierHtml(job))}`)

  await new Promise((resolve, reject) => {
    printWindow.webContents.print({
      silent: true,
      deviceName,
      printBackground: false,
      margins: { marginType: 'none' },
    }, (success, reason) => {
      printWindow.close()
      if (success) resolve()
      else reject(new Error(reason || 'Falha ao imprimir no caixa.'))
    })
  })

  return deviceName
}

async function printKitchen(job) {
  if (store.get('simulationMode')) {
    emitStatus(`Simulação: pedido da mesa ${job.tableNumber} enviado à cozinha.`)
    return 'SIMULAÇÃO - COZINHA'
  }

  const host = String(store.get('kitchenPrinterIp') || '').trim()
  const port = Number(store.get('kitchenPrinterPort') || 9100)
  if (!host) throw new Error('IP da impressora da cozinha não configurado.')

  const payload = buildKitchenText(job)

  await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port })
    const timeout = setTimeout(() => {
      socket.destroy()
      reject(new Error('Tempo esgotado ao conectar na impressora da cozinha.'))
    }, 5000)

    socket.on('connect', () => {
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
  await apiRequest('PATCH', { id: job._id, status: 'printing' })

  try {
    const printer = job.type === 'cashier'
      ? await printCashier(job)
      : await printKitchen(job)

    await apiRequest('PATCH', {
      id: job._id,
      status: 'printed',
      printer,
    })
    emitStatus(`${job.type === 'cashier' ? 'Conta' : 'Pedido'} da mesa ${job.tableNumber} impresso com sucesso.`, 'success')
  } catch (error) {
    await apiRequest('PATCH', {
      id: job._id,
      status: 'error',
      error: error.message,
    }).catch(() => {})
    emitStatus(`Erro na impressão da mesa ${job.tableNumber}: ${error.message}`, 'error')
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
