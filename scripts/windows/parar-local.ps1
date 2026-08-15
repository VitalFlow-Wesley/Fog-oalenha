$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$PidFile = Join-Path $ProjectRoot '.local-runtime\server.pid'
if (-not (Test-Path $PidFile)) { Write-Host 'Servidor local já está parado.'; exit 0 }
$serverPid = [int](Get-Content -LiteralPath $PidFile)
$process = Get-Process -Id $serverPid -ErrorAction SilentlyContinue
if ($process -and $process.ProcessName -eq 'node') { Stop-Process -Id $serverPid -Force }
Remove-Item -LiteralPath $PidFile -Force
Write-Host 'Servidor local encerrado.' -ForegroundColor Green
