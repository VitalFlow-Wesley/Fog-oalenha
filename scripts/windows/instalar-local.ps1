param([switch]$InstalarMongoDb)
$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$EnvFile = Join-Path $ProjectRoot 'local-server\.env'
$EnvExample = Join-Path $ProjectRoot 'local-server\.env.example'

if ($InstalarMongoDb -and -not (Get-Command mongod -ErrorAction SilentlyContinue)) {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { throw 'winget não encontrado. Instale o MongoDB Community Edition manualmente.' }
  winget install --exact --id MongoDB.Server --accept-package-agreements --accept-source-agreements
}

if (-not (Test-Path $EnvFile)) {
  Copy-Item -LiteralPath $EnvExample -Destination $EnvFile
  $secret = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
  $token = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(36))
  $content = Get-Content -Raw -LiteralPath $EnvFile
  $content = $content.Replace('GERAR_UMA_CHAVE_LOCAL_FORTE', $secret).Replace('GERAR_UM_TOKEN_LOCAL_FORTE', $token)
  Set-Content -LiteralPath $EnvFile -Value $content -Encoding UTF8
}

Push-Location $ProjectRoot
try {
  npm install
  npm run local:build
} finally { Pop-Location }

Push-Location (Join-Path $ProjectRoot 'print-agent')
try {
  npm install
} finally { Pop-Location }

$ruleName = 'Fogao a Lenha - Servidor Local'
if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
  try { New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Private | Out-Null }
  catch { Write-Warning 'Execute este instalador como Administrador para liberar a porta 3000 no Firewall.' }
}

Write-Host 'Instalação preparada. Execute iniciar-local.ps1 para ligar o sistema.' -ForegroundColor Green
