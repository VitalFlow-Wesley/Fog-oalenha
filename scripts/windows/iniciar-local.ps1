param([switch]$SemNavegador, [switch]$ComAgenteImpressao)
$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$RuntimeDir = Join-Path $ProjectRoot '.local-runtime'
$PidFile = Join-Path $RuntimeDir 'server.pid'
$LogFile = Join-Path $RuntimeDir 'server.log'
$AgentPidFile = Join-Path $RuntimeDir 'print-agent.pid'
$AgentLogFile = Join-Path $RuntimeDir 'print-agent.log'
$AgentErrorLogFile = Join-Path $RuntimeDir 'print-agent-error.log'
New-Item -ItemType Directory -Path $RuntimeDir -Force | Out-Null

$mongoService = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
if ($mongoService -and $mongoService.Status -ne 'Running') { Start-Service -Name MongoDB }

if (Test-Path $PidFile) {
  $existingPid = [int](Get-Content -LiteralPath $PidFile)
  if (Get-Process -Id $existingPid -ErrorAction SilentlyContinue) { Write-Host "Servidor já está rodando (PID $existingPid)." }
  else { Remove-Item -LiteralPath $PidFile -Force }
}

$process = $null
if (-not (Test-Path $PidFile)) {
  $node = (Get-Command node -ErrorAction Stop).Source
  $process = Start-Process -FilePath $node -ArgumentList 'local-server/server.js' -WorkingDirectory $ProjectRoot -RedirectStandardOutput $LogFile -RedirectStandardError (Join-Path $RuntimeDir 'server-error.log') -WindowStyle Hidden -PassThru
  Set-Content -LiteralPath $PidFile -Value $process.Id
}

$health = $null
for ($attempt = 0; $attempt -lt 20; $attempt++) {
  Start-Sleep -Milliseconds 500
  try { $health = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 2; if ($health.ok) { break } } catch {}
}
if (-not $health.ok) {
  if ($process) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
  }
  throw "Servidor não respondeu. Consulte $LogFile"
}

$address = @($health.addresses)[0]
$url = if ($address) { "http://$address`:3000" } else { 'http://127.0.0.1:3000' }
Write-Host "Fogão a Lenha local funcionando: $url" -ForegroundColor Green

if ($ComAgenteImpressao) {
  $env:FOGAO_PRINT_API_URL = 'http://127.0.0.1:3000/api/print-jobs'
  $env:FOGAO_KITCHEN_PRINTER_IP = '192.168.1.110'
  $env:FOGAO_KITCHEN_PRINTER_PORT = '9100'
  $env:FOGAO_PRINT_SIMULATION_MODE = 'false'
  $envFile = Join-Path $ProjectRoot 'local-server\.env'
  if (Test-Path $envFile) {
    $tokenLine = Get-Content -LiteralPath $envFile | Where-Object { $_ -match '^PRINT_AGENT_TOKEN=' } | Select-Object -First 1
    if ($tokenLine) { $env:FOGAO_PRINT_AGENT_TOKEN = $tokenLine.Substring('PRINT_AGENT_TOKEN='.Length).Trim() }
    $kitchenIpLine = Get-Content -LiteralPath $envFile | Where-Object { $_ -match '^FOGAO_KITCHEN_PRINTER_IP=' } | Select-Object -First 1
    if ($kitchenIpLine) { $env:FOGAO_KITCHEN_PRINTER_IP = $kitchenIpLine.Substring('FOGAO_KITCHEN_PRINTER_IP='.Length).Trim() }
    $kitchenPortLine = Get-Content -LiteralPath $envFile | Where-Object { $_ -match '^FOGAO_KITCHEN_PRINTER_PORT=' } | Select-Object -First 1
    if ($kitchenPortLine) { $env:FOGAO_KITCHEN_PRINTER_PORT = $kitchenPortLine.Substring('FOGAO_KITCHEN_PRINTER_PORT='.Length).Trim() }
    $simulationLine = Get-Content -LiteralPath $envFile | Where-Object { $_ -match '^FOGAO_PRINT_SIMULATION_MODE=' } | Select-Object -First 1
    if ($simulationLine) { $env:FOGAO_PRINT_SIMULATION_MODE = $simulationLine.Substring('FOGAO_PRINT_SIMULATION_MODE='.Length).Trim() }
  }
  $agentDir = Join-Path $ProjectRoot 'print-agent'
  if (-not (Test-Path (Join-Path $agentDir 'node_modules\electron'))) {
    throw 'Agente de impressão não está instalado. Execute scripts\windows\instalar-local.ps1 uma vez antes de iniciar o sistema.'
  }
  $agentRunning = $false
  if (Test-Path $AgentPidFile) {
    $agentPid = [int](Get-Content -LiteralPath $AgentPidFile)
    $agentRunning = [bool](Get-Process -Id $agentPid -ErrorAction SilentlyContinue)
    if (-not $agentRunning) { Remove-Item -LiteralPath $AgentPidFile -Force }
  }
  if (-not $agentRunning) {
    $agentProcess = Start-Process -FilePath 'npm.cmd' -ArgumentList 'start' -WorkingDirectory $agentDir -RedirectStandardOutput $AgentLogFile -RedirectStandardError $AgentErrorLogFile -WindowStyle Hidden -PassThru
    Set-Content -LiteralPath $AgentPidFile -Value $agentProcess.Id
    Write-Host "Agente de impressão iniciado (PID $($agentProcess.Id))." -ForegroundColor Green
  } else { Write-Host "Agente de impressão já está rodando (PID $agentPid)." }
}
if (-not $SemNavegador) { Start-Process $url }
