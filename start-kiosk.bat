@echo off
title FE-SCO Kiosk

:: Ruta del proyecto
cd /d C:\fe-sco

:: Levantar servidor de desarrollo en segundo plano
start /B npm run dev

:: Esperar a que el servidor levante
timeout /t 3 >nul



