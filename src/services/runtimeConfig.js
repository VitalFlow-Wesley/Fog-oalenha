const onlineFallback = {
  mode: 'online',
  label: 'Sistema online',
  apiBaseUrl: '/api',
  onlineUrl: window.location.origin,
  localUrl: '',
  syncEnabled: false,
}

export async function loadRuntimeConfig() {
  try {
    const response = await fetch('/api/runtime-config', { cache: 'no-store' })
    if (!response.ok) return onlineFallback
    return { ...onlineFallback, ...(await response.json()) }
  } catch {
    return onlineFallback
  }
}
