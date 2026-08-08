param([switch]$Remover)
$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$TaskName = 'Fogao a Lenha - Servidor Local'

if ($Remover) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host 'Inicializacao automatica removida.' -ForegroundColor Yellow
  exit 0
}

$launcher = Join-Path $ProjectRoot 'scripts\windows\iniciar-local.ps1'
$arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcher`" -SemNavegador -ComAgenteImpressao"
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Inicia o servidor local e o agente de impressao do Fogao a Lenha.' -Force | Out-Null
Write-Host 'Inicializacao automatica registrada. Ela sera executada no proximo inicio do Windows.' -ForegroundColor Green
