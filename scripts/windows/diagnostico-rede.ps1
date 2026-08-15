$addresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object InterfaceAlias, IPAddress
$addresses | Format-Table
Test-NetConnection -ComputerName 127.0.0.1 -Port 3000
Write-Host 'Nos celulares, abra http://IP-DO-CAIXA:3000 usando um dos endereços acima.'
