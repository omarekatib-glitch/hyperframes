$cmd = @'
@echo off
setlocal
title HyperFrames Studio - SECTION_HEADER
for /f "usebackq delims=" %%D in (`powershell -NoProfile -Command "[Environment]::GetFolderPath('MyDocuments')"`) do set "DOCS=%%D"
set "HF_DIR=%DOCS%\HyperFrames\SECTION_HEADER"
set "HF_CLI=%HF_DIR%\node_modules\.bin\hyperframes.cmd"
set "HYPERFRAMES_NO_UPDATE_CHECK=1"
set "HYPERFRAMES_NO_TELEMETRY=1"

if exist "%HF_CLI%" goto run
echo First run: installing the SECTION_HEADER template and the editor. This needs internet once.
set "HF_SKIP_SHORTCUT=1"
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/omarekatib-glitch/hyperframes/refs/heads/claude/sweet-shannon-ijxlan/brand-templates/section-header/setup-windows.ps1 | iex"
if not exist "%HF_CLI%" goto failed
where node >nul 2>nul
if errorlevel 1 goto restart

:run
cd /d "%HF_DIR%"
echo Opening the timeline editor at http://localhost:3002
echo Edit text in the Variables panel. Export from the Render panel.
echo Keep this window open while you edit. Close it to stop the editor.
call "%HF_CLI%" preview --foreground
pause
exit /b

:restart
echo Setup finished. Close this window and double-click the shortcut again.
pause
exit /b

:failed
echo Setup did not finish. Read the red message above, then double-click the shortcut to try again.
pause
exit /b 1
'@
$path = Join-Path ([Environment]::GetFolderPath('Desktop')) 'HyperFrames Studio - SECTION_HEADER.cmd'
# cmd.exe needs CRLF line endings for goto labels to work reliably.
Set-Content -LiteralPath $path -Value ($cmd -replace "`r?`n", "`r`n") -Encoding ASCII
Write-Host "Created $path"
