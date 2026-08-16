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

function Get-LocalServerProcess {
  param([int]$ProcessId)
  $candidate = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
  # O Windows registra o comando relativo usado pelo launcher, portanto o diretório
  # de trabalho não aparece no CommandLine. A combinação node + server local é a
  # identidade estável deste processo.
  if ($candidate -and $candidate.Name -eq 'node.exe' -and $candidate.CommandLine -like '*local-server/server.js*') {
    return $candidate
  }
  return $null
}

function Get-PrintAgentRoots {
  param([string]$AgentDirectory)
  $agents = @(Get-CimInstance Win32_Process -Filter "Name = 'electron.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*$AgentDirectory*" })
  $agentIds = @($agents | ForEach-Object { $_.ProcessId })
  return @($agents | Where-Object { $_.ParentProcessId -notin $agentIds })
}

$mongoService = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
if ($mongoService -and $mongoService.Status -ne 'Running') { Start-Service -Name MongoDB }

if (Test-Path $PidFile) {
  $existingPid = [int](Get-Content -LiteralPath $PidFile)
  if (Get-LocalServerProcess -ProcessId $existingPid) { Write-Host "Servidor já está rodando (PID $existingPid)." }
  else {
    Write-Host "Removendo PID antigo do servidor ($existingPid)." -ForegroundColor Yellow
    Remove-Item -LiteralPath $PidFile -Force
  }
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
$localUrl = 'http://127.0.0.1:3000'
$networkUrl = if ($address) { "http://$address`:3000" } else { $localUrl }
Write-Host "Fogão a Lenha local funcionando neste computador: $localUrl" -ForegroundColor Green
Write-Host "Acesso pelos celulares: $networkUrl" -ForegroundColor Green

if ($ComAgenteImpressao) {
  $env:FOGAO_PRINT_API_URL = 'http://127.0.0.1:3000/api/print-jobs'
  $env:FOGAO_KITCHEN_PRINTER_IP = '192.168.1.110'
  $env:FOGAO_KITCHEN_PRINTER_PORT = '9100'
  $env:FOGAO_CASHIER_PRINTER_NAME = 'POS-80'
  $env:FOGAO_PRINT_SIMULATION_MODE = 'false'
  $envFile = Join-Path $ProjectRoot 'local-server\.env'
  if (Test-Path $envFile) {
    $tokenLine = Get-Content -LiteralPath $envFile | Where-Object { $_ -match '^PRINT_AGENT_TOKEN=' } | Select-Object -First 1
    if ($tokenLine) { $env:FOGAO_PRINT_AGENT_TOKEN = $tokenLine.Substring('PRINT_AGENT_TOKEN='.Length).Trim() }
    $kitchenIpLine = Get-Content -LiteralPath $envFile | Where-Object { $_ -match '^FOGAO_KITCHEN_PRINTER_IP=' } | Select-Object -First 1
    if ($kitchenIpLine) { $env:FOGAO_KITCHEN_PRINTER_IP = $kitchenIpLine.Substring('FOGAO_KITCHEN_PRINTER_IP='.Length).Trim() }
    $kitchenPortLine = Get-Content -LiteralPath $envFile | Where-Object { $_ -match '^FOGAO_KITCHEN_PRINTER_PORT=' } | Select-Object -First 1
    if ($kitchenPortLine) { $env:FOGAO_KITCHEN_PRINTER_PORT = $kitchenPortLine.Substring('FOGAO_KITCHEN_PRINTER_PORT='.Length).Trim() }
    $cashierPrinterLine = Get-Content -LiteralPath $envFile | Where-Object { $_ -match '^FOGAO_CASHIER_PRINTER_NAME=' } | Select-Object -First 1
    if ($cashierPrinterLine) { $env:FOGAO_CASHIER_PRINTER_NAME = $cashierPrinterLine.Substring('FOGAO_CASHIER_PRINTER_NAME='.Length).Trim() }
    $simulationLine = Get-Content -LiteralPath $envFile | Where-Object { $_ -match '^FOGAO_PRINT_SIMULATION_MODE=' } | Select-Object -First 1
    if ($simulationLine) { $env:FOGAO_PRINT_SIMULATION_MODE = $simulationLine.Substring('FOGAO_PRINT_SIMULATION_MODE='.Length).Trim() }
  }
  $agentDir = Join-Path $ProjectRoot 'print-agent'
  $agentExecutable = Join-Path $agentDir 'node_modules\electron\dist\electron.exe'
  if (-not (Test-Path $agentExecutable)) {
    throw 'Agente de impressão não está instalado. Execute scripts\windows\instalar-local.ps1 uma vez antes de iniciar o sistema.'
  }
  $agentRunning = $false
  if (Test-Path $AgentPidFile) {
    $agentPid = [int](Get-Content -LiteralPath $AgentPidFile)
    $agentRunning = [bool](Get-PrintAgentRoots -AgentDirectory $agentDir | Where-Object { $_.ProcessId -eq $agentPid })
    if (-not $agentRunning) {
      Write-Host "Removendo PID antigo do agente ($agentPid)." -ForegroundColor Yellow
      Remove-Item -LiteralPath $AgentPidFile -Force
    }
  }
  if (-not $agentRunning) {
    $existingAgent = Get-PrintAgentRoots -AgentDirectory $agentDir | Select-Object -First 1
    if ($existingAgent) {
      $agentPid = [int]$existingAgent.ProcessId
      $agentRunning = $true
      Set-Content -LiteralPath $AgentPidFile -Value $agentPid
    }
  }
  if (-not $agentRunning) {
    $agentProcess = Start-Process -FilePath $agentExecutable -ArgumentList '.' -WorkingDirectory $agentDir -RedirectStandardOutput $AgentLogFile -RedirectStandardError $AgentErrorLogFile -WindowStyle Hidden -PassThru
    Set-Content -LiteralPath $AgentPidFile -Value $agentProcess.Id
    Write-Host "Agente de impressão iniciado (PID $($agentProcess.Id))." -ForegroundColor Green
  } else { Write-Host "Agente de impressão já está rodando (PID $agentPid)." }
}
if (-not $SemNavegador) { Start-Process $localUrl }
