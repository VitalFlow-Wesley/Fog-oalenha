$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$PidFile = Join-Path $ProjectRoot '.local-runtime\server.pid'
$AgentPidFile = Join-Path $ProjectRoot '.local-runtime\print-agent.pid'

if (Test-Path $PidFile) {
  $serverPid = [int](Get-Content -LiteralPath $PidFile)
  $process = Get-Process -Id $serverPid -ErrorAction SilentlyContinue
  if ($process -and $process.ProcessName -eq 'node') { Stop-Process -Id $serverPid -Force }
  Remove-Item -LiteralPath $PidFile -Force
}

$agentPid = $null
if (Test-Path $AgentPidFile) {
  $agentPid = [int](Get-Content -LiteralPath $AgentPidFile)
  $agent = Get-Process -Id $agentPid -ErrorAction SilentlyContinue
  if ($agent -and $agent.ProcessName -eq 'electron') { Stop-Process -Id $agentPid -Force }
  Remove-Item -LiteralPath $AgentPidFile -Force
}

# Compatibilidade com versões que gravavam o PID do npm em vez do Electron.
$orphanAgent = Get-CimInstance Win32_Process -Filter "Name = 'electron.exe'" | Where-Object { $_.CommandLine -like "*$ProjectRoot\print-agent*" } | Where-Object { $_.ParentProcessId -notin (Get-CimInstance Win32_Process -Filter "Name = 'electron.exe'" | ForEach-Object ProcessId) } | Select-Object -First 1
if ($orphanAgent) { Stop-Process -Id $orphanAgent.ProcessId -Force -ErrorAction SilentlyContinue }

Write-Host 'Servidor local e agente de impressão encerrados.' -ForegroundColor Green
