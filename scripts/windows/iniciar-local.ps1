param([switch]$SemNavegador, [switch]$ComAgenteImpressao)
$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$RuntimeDir = Join-Path $ProjectRoot '.local-runtime'
$PidFile = Join-Path $RuntimeDir 'server.pid'
$LogFile = Join-Path $RuntimeDir 'server.log'
New-Item -ItemType Directory -Path $RuntimeDir -Force | Out-Null

$mongoService = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
if ($mongoService -and $mongoService.Status -ne 'Running') { Start-Service -Name MongoDB }

if (Test-Path $PidFile) {
  $existingPid = [int](Get-Content -LiteralPath $PidFile)
  if (Get-Process -Id $existingPid -ErrorAction SilentlyContinue) { Write-Host "Servidor já está rodando (PID $existingPid)."; exit 0 }
  Remove-Item -LiteralPath $PidFile -Force
}

$node = (Get-Command node -ErrorAction Stop).Source
$process = Start-Process -FilePath $node -ArgumentList 'local-server/server.js' -WorkingDirectory $ProjectRoot -RedirectStandardOutput $LogFile -RedirectStandardError (Join-Path $RuntimeDir 'server-error.log') -WindowStyle Hidden -PassThru
Set-Content -LiteralPath $PidFile -Value $process.Id

$health = $null
for ($attempt = 0; $attempt -lt 20; $attempt++) {
  Start-Sleep -Milliseconds 500
  try { $health = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 2; if ($health.ok) { break } } catch {}
}
if (-not $health.ok) {
  Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
  throw "Servidor não respondeu. Consulte $LogFile"
}

$address = @($health.addresses)[0]
$url = if ($address) { "http://$address`:3000" } else { 'http://127.0.0.1:3000' }
Write-Host "Fogão a Lenha local funcionando: $url" -ForegroundColor Green

if ($ComAgenteImpressao) {
  $env:FOGAO_PRINT_API_URL = 'http://127.0.0.1:3000/api/print-jobs'
  $envFile = Join-Path $ProjectRoot 'local-server\.env'
  if (Test-Path $envFile) {
    $tokenLine = Get-Content -LiteralPath $envFile | Where-Object { $_ -match '^PRINT_AGENT_TOKEN=' } | Select-Object -First 1
    if ($tokenLine) { $env:FOGAO_PRINT_AGENT_TOKEN = $tokenLine.Substring('PRINT_AGENT_TOKEN='.Length).Trim() }
  }
  Push-Location (Join-Path $ProjectRoot 'print-agent')
  try { Start-Process -FilePath 'npm.cmd' -ArgumentList 'start' -WorkingDirectory (Get-Location).Path -WindowStyle Hidden } finally { Pop-Location }
}
if (-not $SemNavegador) { Start-Process $url }
