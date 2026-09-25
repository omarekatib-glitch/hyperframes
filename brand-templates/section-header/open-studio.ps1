# Opens this project in HyperFrames Studio (the browser timeline editor).
# Keep this window open while you edit; closing it stops the Studio server.
$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "HyperFrames Studio - SECTION_HEADER"
Set-Location -LiteralPath $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js is not installed. Install the LTS version from https://nodejs.org, then run this shortcut again." -ForegroundColor Red
  Read-Host "Press Enter to close"
  exit 1
}

Write-Host "Starting Studio for $PSScriptRoot ..." -ForegroundColor Cyan
Write-Host "Your browser opens at http://localhost:3002 once it is ready. Edits save to index.html in this folder." -ForegroundColor Cyan
Write-Host "Close this window to stop Studio." -ForegroundColor DarkGray

# Same pinned CLI version as package.json, so Studio matches the renders.
npx --yes hyperframes@0.8.77 preview --foreground

if ($LASTEXITCODE -ne 0) {
  Write-Host "Studio exited with an error (code $LASTEXITCODE)." -ForegroundColor Red
  Read-Host "Press Enter to close"
}
