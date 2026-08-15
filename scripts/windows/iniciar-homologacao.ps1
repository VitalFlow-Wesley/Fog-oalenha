param()
$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$SourceEnv = Join-Path $ProjectRoot 'local-server\.env'
$TestEnv = Join-Path $ProjectRoot '.local-runtime\homologacao.env'
if (-not (Test-Path $SourceEnv)) { throw 'Configuração local não encontrada.' }

$content = Get-Content -Raw -LiteralPath $SourceEnv
$content = [regex]::Replace($content, '(?m)^MONGODB_DB=.*$', 'MONGODB_DB=fogao_a_lenha_homologacao')
$content = [regex]::Replace($content, '(?m)^PORT=.*$', 'PORT=3001')
$content = [regex]::Replace($content, '(?m)^SYNC_ENABLED=.*$', 'SYNC_ENABLED=false')
Set-Content -LiteralPath $TestEnv -Value $content -Encoding UTF8

$env:FOGAO_LOCAL_ENV = $TestEnv
$env:PORT = '3001'
Write-Host 'Homologação isolada: http://127.0.0.1:3001 (banco fogao_a_lenha_homologacao)' -ForegroundColor Green
node (Join-Path $ProjectRoot 'local-server\server.js')
