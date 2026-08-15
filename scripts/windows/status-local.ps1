$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Write-Host 'MongoDB:'
Get-Service -Name MongoDB -ErrorAction SilentlyContinue | Select-Object Name, Status
Write-Host 'Servidor:'
try { Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 3 | ConvertTo-Json } catch { Write-Host 'Indisponível' -ForegroundColor Red }
Write-Host 'Sincronização:'
try { Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/sync-status' -TimeoutSec 3 | ConvertTo-Json } catch { Write-Host 'Indisponível' -ForegroundColor Yellow }
