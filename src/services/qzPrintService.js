let qzSecuritySetupPromise = null
let qzConnectionAvailableUntil = 0

function removeAccents(str) {
  return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function formatMoney(value) {
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`
}

function getPeopleCount(table = {}) {
  return Math.max(1, Number(table.peopleCount ?? table.guests ?? 1) || 1)
}

function currentDateParts() {
  const now = new Date()
  return {
    date: now.toLocaleDateString('pt-BR'),
    time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  }
}

async function loadQz() {
  const qzModule = await import('qz-tray')
  const qz = qzModule.default || qzModule
  if (!qz) throw new Error('Modulo QZ Tray indisponivel localmente.')
  await configureQzSecurity(qz)
  return qz
}

async function fetchQzCertificate() {
  try {
    const response = await fetch('/api/qz-certificate', { cache: 'no-store' })
    if (!response.ok || response.status === 204) return ''
    return (await response.text()).trim()
  } catch (error) {
    console.warn('Certificado QZ indisponivel:', error.message)
    return ''
  }
}

export async function configureQzSecurity(qz) {
  if (!qz?.security) return false
  if (qzSecuritySetupPromise) return qzSecuritySetupPromise

  qzSecuritySetupPromise = fetchQzCertificate().then(certificate => {
    if (!certificate) {
      console.warn('Certificado QZ nao configurado; impressao seguira como solicitacao anonima.')
      return false
    }

    qz.security.setCertificatePromise((resolve) => {
      resolve(certificate)
    })

    qz.security.setSignaturePromise(toSign => (resolve, reject) => {
      fetch('/api/qz-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: toSign }),
      })
        .then(response => {
          if (!response.ok || response.status === 204) {
            throw new Error('Assinatura QZ indisponivel no servidor.')
          }
          return response.json()
        })
        .then(data => {
          if (!data?.signature) throw new Error('Assinatura QZ vazia.')
          resolve(data.signature)
        })
        .catch(reject)
    })

    if (qz.security.setSignatureAlgorithm) {
      qz.security.setSignatureAlgorithm('SHA512')
    }

    return true
  })

  return qzSecuritySetupPromise
}

export function buildThermalPayload(job) {
  const table = job.table || {}
  const type = job.type === 'cashier' ? 'bill' : job.type
  const title = job.title || (type === 'bill' ? 'COMANDA DO CLIENTE' : 'PEDIDO DE PREPARO')
  const tableNumber = table.number || job.tableNumber || ''
  const mergedNumbers = table.mergedTableNumbers?.length ? ` + ${table.mergedTableNumbers.join(' + ')}` : ''
  const waiterName = job.waiterName || table.kitchenWaiterName || table.waiterName || 'Garcom'
  const peopleCount = job.peopleCount || job.guests || getPeopleCount(table)
  const { date, time } = currentDateParts()

  const payload = [
    '\x1B' + '\x40',
    '\x1B' + '\x61' + '\x31',
    '================================\n',
    '         FOGAO A LENHA          \n',
    `      ${removeAccents(title)}      \n`,
    ...(job.reprint ? ['         (REIMPRESSAO)          \n'] : []),
    '================================\n',
    '\x1B' + '\x61' + '\x30',
    `Mesa:      ${tableNumber}${mergedNumbers}\n`,
    ...(type === 'kitchen' ? [`Pessoas:   ${peopleCount}\n`] : []),
    `Garcom:    ${removeAccents(waiterName)}\n`,
    `Data:      ${date} as ${time}\n`,
    '--------------------------------\n',
  ]

  const items = Array.isArray(job.items) ? job.items : []
  if (!items.length) {
    payload.push('Nenhum item.\n')
  } else {
    items.forEach(item => {
      const itemName = removeAccents(item.name).toUpperCase()
      let line = `${item.qty}x ${itemName}`
      if (item.originTable) line += ` (Mesa ${item.originTable})`

      if (type === 'bill') {
        payload.push(`${line}\n`)
        payload.push('\x1B' + '\x61' + '\x32')
        payload.push(`${formatMoney(Number(item.price || 0) * Number(item.qty || 0))}\n`)
        payload.push('\x1B' + '\x61' + '\x30')
      } else {
        payload.push(`${line}\n`)
      }

      if (item.observation) {
        payload.push(`   OBS: ${removeAccents(item.observation)}\n`)
      }
    })
  }

  payload.push('--------------------------------\n')

  if (type === 'bill') {
    payload.push('\x1B' + '\x61' + '\x31')
    payload.push('TOTAL DA CONTA\n')
    payload.push('\x1B' + '\x21' + '\x30')
    payload.push(`${formatMoney(job.total)}\n`)
    payload.push('\x1B' + '\x21' + '\x00')
    payload.push('--------------------------------\n')
    payload.push('Obrigado pela preferencia!\n')
  } else {
    payload.push('\x1B' + '\x61' + '\x31')
    payload.push('*** BOM PREPARO ***\n')
  }

  payload.push('\n\n\n\n')
  payload.push('\x1D' + '\x56' + '\x41' + '\x00')
  return payload
}

export async function ensureQzReady() {
  if (Date.now() < qzConnectionAvailableUntil) return true
  const qz = await loadQz()
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect()
  }
  qzConnectionAvailableUntil = Date.now() + 30000
  return true
}

export async function executeThermalPrint(job, options = {}) {
  const { silent = false } = options

  if (!job || !job.printerName) {
    const message = 'Nenhuma impressora configurada para este setor. Verifique as configuracoes de impressao.'
    if (!silent) alert(message)
    throw new Error(message)
  }

  try {
    const qz = await loadQz()
    if (!qz.websocket.isActive()) {
      await qz.websocket.connect()
    }
    await qz.printers.find(job.printerName)
    const config = qz.configs.create(job.printerName)
    await qz.print(config, buildThermalPayload(job))
    return true
  } catch (error) {
    console.error('Falha na impressao:', error)
    if (!silent) alert(`Erro na impressora: ${error.message || error}`)
    throw error
  }
}
