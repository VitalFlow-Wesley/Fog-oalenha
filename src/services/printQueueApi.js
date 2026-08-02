const PRINT_JOBS_ENDPOINT = '/api/print-jobs'

function browserSource() {
  try {
    const key = 'fogao-print-device-id'
    const current = localStorage.getItem(key)
    if (current) return current
    const next = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `device-${Date.now()}-${Math.random()}`
    localStorage.setItem(key, next)
    return next
  } catch {
    return `device-${Date.now()}`
  }
}

async function requestPrintQueue(path = '', options = {}) {
  const response = await fetch(`${PRINT_JOBS_ENDPOINT}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  if (response.status === 204) return null
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.error || 'Falha na fila de impressao.')
  }
  return data
}

export async function enqueuePrintJob(job) {
  const dedupeKey = job.dedupeKey || `${job.type || 'print'}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  return requestPrintQueue('', {
    method: 'POST',
    body: JSON.stringify({
      ...job,
      dedupeKey,
      tableNumber: job.tableNumber || job.table?.number || '',
      customerName: job.customerName || job.table?.customerName || '',
      guests: job.guests ?? job.peopleCount ?? job.table?.guests ?? 0,
      peopleCount: job.peopleCount ?? job.table?.peopleCount ?? job.table?.guests ?? 0,
      sourceDevice: browserSource(),
    }),
  })
}

export async function fetchPendingPrintJobs(limit = 5) {
  return requestPrintQueue(`?status=pending&limit=${limit}`)
}

export async function updatePrintJobStatus(id, status, patch = {}) {
  return requestPrintQueue('', {
    method: 'PATCH',
    body: JSON.stringify({ id, status, ...patch }),
  })
}
