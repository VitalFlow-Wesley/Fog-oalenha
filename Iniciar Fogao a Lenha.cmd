@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\iniciar-local.ps1" -ComAgenteImpressao
pause
