@echo off
powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0iniciar-local.ps1" -ComAgenteImpressao -SemNavegador
