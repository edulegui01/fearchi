@echo off
title FE-SCO Kiosk

:: Ruta del proyecto
cd /d C:\fe-sco

:: Levantar servidor de produccion en segundo plano
start /B npx serve dist -s -l 5173

:: Esperar a que el servidor levante
timeout /t 3 >nul



