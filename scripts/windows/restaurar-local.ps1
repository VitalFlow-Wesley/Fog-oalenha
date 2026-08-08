param([Parameter(Mandatory=$true)][string]$Arquivo)
$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$EnvFile = Join-Path $ProjectRoot 'local-server\.env'
$mongoUri = 'mongodb://127.0.0.1:27017/fogao_a_lenha'
if (Test-Path $EnvFile) {
  $uriLine = Get-Content -LiteralPath $EnvFile | Where-Object { $_ -match '^MONGODB_URI=' } | Select-Object -First 1
  if ($uriLine) { $mongoUri = $uriLine.Substring('MONGODB_URI='.Length).Trim() }
}
$resolved = (Resolve-Path -LiteralPath $Arquivo).Path
if (-not $resolved.EndsWith('.archive.gz')) { throw 'Selecione um backup .archive.gz válido.' }
$confirmation = Read-Host "Digite RESTAURAR para substituir o banco local usando $resolved"
if ($confirmation -ne 'RESTAURAR') { Write-Host 'Restauração cancelada.'; exit 1 }
mongorestore --uri=$mongoUri --archive=$resolved --gzip --drop
Write-Host 'Banco local restaurado.' -ForegroundColor Green
