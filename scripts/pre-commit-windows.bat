@echo off
REM Sistema Brotar v2.1 - Backup do Hook de Versionamento para Windows CMD/PowerShell
echo --- Iniciando script de versionamento ---
node scripts\bump-version.mjs
git add src\config\version.ts
exit /b 0
