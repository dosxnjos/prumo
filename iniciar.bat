@echo off
rem Porta fixa em 5177 de propósito: os dados ficam no IndexedDB do
rem navegador, por origem (inclui a porta). Se essa porta mudar, o app
rem abre "vazio" — os dados continuam lá, só ficam noutra origem.
cd /d "%~dp0"
echo Iniciando o Prumo em http://localhost:5177 ...
call npm run dev -- --port 5177 --strictPort --open
pause
