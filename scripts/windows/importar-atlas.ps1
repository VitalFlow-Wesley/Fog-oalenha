$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$EnvFile = Join-Path $ProjectRoot 'local-server\.env'
if (-not (Test-Path $EnvFile)) { throw 'Execute instalar-local.ps1 primeiro.' }
$content = Get-Content -Raw -LiteralPath $EnvFile
if ($content -notmatch '(?m)^ONLINE_MONGODB_URI=.+') { throw 'Configure ONLINE_MONGODB_URI no arquivo local-server\.env sem enviar esse arquivo ao GitHub.' }
Push-Location $ProjectRoot
try { npm run local:sync:pull } finally { Pop-Location }
Write-Host 'Dados do Atlas importados e mesclados no MongoDB local.' -ForegroundColor Green
