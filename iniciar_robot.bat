@echo off
chcp 65001 > nul
title Robot RPA - IEP Augusto Wiese
echo =================================================================
echo        ROBOT RPA - ATENCION DOCUMENTARIA IEP AUGUSTO WIESE
echo =================================================================
echo.
echo  Iniciando servicio de monitoreo continuo de solicitudes...
echo  Presiona [Ctrl + C] o cierra esta ventana cuando desees apagarlo.
echo.
cd /d "%~dp0\rpa_worker"
.\venv\Scripts\python.exe core\rpa_logic.py
pause
