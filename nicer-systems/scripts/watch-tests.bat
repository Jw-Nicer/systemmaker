@echo off
REM ============================================================================
REM Local "watch everything" launcher for Nicer Systems.
REM
REM Double-click this file to open two console windows:
REM   1. Vitest in watch mode (auto-reruns the unit suite on file changes)
REM   2. Next.js dev server on port 3000
REM
REM Both windows stream their own output. Close either window to stop it.
REM Logs are also appended to tmp/watch-tests.log and tmp/watch-dev.log so
REM you can diff them later.
REM
REM Usage:
REM   scripts\watch-tests.bat
REM ============================================================================

setlocal

REM Resolve the repo root relative to this script so double-click works
REM regardless of the current working directory.
set "SCRIPT_DIR=%~dp0"
set "REPO_DIR=%SCRIPT_DIR%.."

pushd "%REPO_DIR%"

REM Ensure tmp exists for the log files
if not exist "tmp" mkdir "tmp"

echo.
echo ============================================================
echo   Nicer Systems — local watcher
echo   Repo: %REPO_DIR%
echo ============================================================
echo.
echo Launching two windows:
echo   1. Vitest watch   (tmp\watch-tests.log)
echo   2. Next dev server (tmp\watch-dev.log)
echo.
echo Close either window to stop that process.
echo.
timeout /t 3 /nobreak >nul

REM Launch vitest watch in a new window. The /k flag keeps the window
REM open after the command exits (or crashes) so you can read the output.
REM We tee through PowerShell to get both terminal output AND a log file.
start "Nicer — Vitest watch" cmd /k "cd /d %REPO_DIR% && npx vitest --watch 2>&1 | powershell -Command \"$input | Tee-Object -FilePath tmp\watch-tests.log -Append\""

REM Launch Next dev server in a second window. Same pattern.
start "Nicer — Next dev" cmd /k "cd /d %REPO_DIR% && npm run dev 2>&1 | powershell -Command \"$input | Tee-Object -FilePath tmp\watch-dev.log -Append\""

popd
endlocal
exit /b 0
