const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

async function parseResponse(response) {
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) throw new Error(data?.message || 'Erro ao comunicar com o servidor')
  return data
}

export async function getData(path) {
  return parseResponse(await fetch(`${BASE_URL}${path}`))
}

export async function sendData(path, method, body) {
  return parseResponse(await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }))
}

export const http = {
  get: getData,
  post: (path, body) => sendData(path, 'POST', body),
  put: (path, body) => sendData(path, 'PUT', body),
  patch: (path, body) => sendData(path, 'PATCH', body),
}

export { BASE_URL }
