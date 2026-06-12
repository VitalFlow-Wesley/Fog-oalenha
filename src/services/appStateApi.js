const API_STATE_URL = '/api/state'

let remoteDisabled = import.meta.env.DEV

function disableRemoteSync(reason) {
  remoteDisabled = true
  if (reason) {
    console.warn('Sincronizacao remota desativada, usando dados locais:', reason)
  }
}

async function readJsonResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '')
    throw new Error(text ? `Resposta invalida do servidor: ${text.slice(0, 40)}` : 'Resposta invalida do servidor.')
  }
  return response.json()
}

export async function loadRemoteState() {
  if (remoteDisabled) return {}

  try {
    const response = await fetch(API_STATE_URL, { method: 'GET', cache: 'no-store' })

    if (response.status === 404 || response.status === 405) {
      disableRemoteSync(`endpoint indisponivel (${response.status})`)
      return {}
    }

    if (!response.ok) throw new Error('Nao foi possivel carregar dados do servidor.')
    return await readJsonResponse(response)
  } catch (error) {
    disableRemoteSync(error.message)
    return {}
  }
}

export async function saveRemoteState(state) {
  if (remoteDisabled) return null

  try {
    const response = await fetch(API_STATE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
      cache: 'no-store',
    })

    if (response.status === 404 || response.status === 405) {
      disableRemoteSync(`endpoint indisponivel (${response.status})`)
      return null
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.error || 'Nao foi possivel salvar dados no servidor.')
    }

    return await readJsonResponse(response)
  } catch (error) {
    disableRemoteSync(error.message)
    return null
  }
}
