param([string]$Destino)
$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$EnvFile = Join-Path $ProjectRoot 'local-server\.env'
$mongoUri = 'mongodb://127.0.0.1:27017/fogao_a_lenha'
if (Test-Path $EnvFile) {
  $uriLine = Get-Content -LiteralPath $EnvFile | Where-Object { $_ -match '^MONGODB_URI=' } | Select-Object -First 1
  if ($uriLine) { $mongoUri = $uriLine.Substring('MONGODB_URI='.Length).Trim() }
}
if (-not $Destino) { $Destino = Join-Path $ProjectRoot 'backups' }
New-Item -ItemType Directory -Path $Destino -Force | Out-Null
$stamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$arquivo = Join-Path (Resolve-Path $Destino).Path "fogao-local_$stamp.archive.gz"
mongodump --uri=$mongoUri --archive=$arquivo --gzip
Get-ChildItem -LiteralPath $Destino -Filter 'fogao-local_*.archive.gz' | Sort-Object LastWriteTime -Descending | Select-Object -Skip 30 | Remove-Item -Force
Write-Host "Backup criado em $arquivo" -ForegroundColor Green
