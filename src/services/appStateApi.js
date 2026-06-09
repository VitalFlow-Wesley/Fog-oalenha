const API_STATE_URL = '/api/state'

export async function loadRemoteState() {
  const response = await fetch(API_STATE_URL, { method: 'GET' })
  if (!response.ok) throw new Error('Não foi possível carregar dados do servidor.')
  return response.json()
}

export async function saveRemoteState(state) {
  const response = await fetch(API_STATE_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error || 'Não foi possível salvar dados no servidor.')
  }

  return response.json()
}
