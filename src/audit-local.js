const AUDIT_STORAGE_KEY = 'fogao-a-lenha-audit-logs'

export function getLocalAuditLogs() {
  try {
    const logs = JSON.parse(localStorage.getItem(AUDIT_STORAGE_KEY) || '[]')
    return Array.isArray(logs) ? logs : []
  } catch {
    return []
  }
}

export function saveLocalAuditLog(log) {
  const nextLog = {
    id: log.id || Date.now(),
    createdAt: log.createdAt || new Date().toISOString(),
    ...log,
  }
  const logs = [nextLog, ...getLocalAuditLogs()].slice(0, 500)
  localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs))
  return nextLog
}

export function clearLocalAuditLogs() {
  localStorage.removeItem(AUDIT_STORAGE_KEY)
}
