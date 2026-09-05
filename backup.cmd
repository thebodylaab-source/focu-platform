@echo off
REM Backup da base de dados FO.CU — duplo-clique para correr.
REM Guarda os ficheiros em .\backups\ (com data e hora no nome).
cd /d "%~dp0"
echo A exportar a base de dados FO.CU...
echo.
bun --env-file=.env scripts/backup-db.ts
echo.
echo Terminado. Os ficheiros estao na pasta "backups".
echo Copia-os para um local seguro (contem dados pessoais).
pause
