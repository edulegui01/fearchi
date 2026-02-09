@echo off
title FE-SCO Kiosk

:: Ruta del proyecto
cd /d C:\fe-sco

:: Levantar servidor de produccion en segundo plano
start /B npx serve dist -s -l 3000

:: Esperar a que el servidor levante
timeout /t 3 >nul

:: Abrir Edge en modo app + pantalla completa
start msedge --app=http://localhost:3000 --start-fullscreen



start chrome --kiosk http://localhost:3000