# Opens this template in HyperFrames Studio (the browser timeline editor). Works offline.
# Keep this window open while you edit; closing it stops Studio.
$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "HyperFrames Studio - SECTION_HEADER"
Set-Location -LiteralPath $PSScriptRoot

$cli = Join-Path $PSScriptRoot "node_modules\.bin\hyperframes.cmd"
if (-not (Get-Command node -ErrorAction SilentlyContinue) -or -not (Test-Path -LiteralPath $cli)) {
  Write-Host "Setup is incomplete. While online, run the setup command from README.md once, then try again." -ForegroundColor Red
  Read-Host "Press Enter to close"
  exit 1
}

# No update checks or telemetry, so nothing waits on the network.
$env:HYPERFRAMES_NO_UPDATE_CHECK = "1"
$env:HYPERFRAMES_NO_TELEMETRY = "1"

Write-Host "Starting Studio ..." -ForegroundColor Cyan
Write-Host "The timeline editor opens in your browser at http://localhost:3002" -ForegroundColor Cyan
Write-Host "  Edit text:  Variables panel (saves into index.html)" -ForegroundColor Gray
Write-Host "  Download:   Render panel -> MOV (alpha) / WebM / MP4 -> Download" -ForegroundColor Gray
Write-Host "Close this window to stop Studio." -ForegroundColor DarkGray

& $cli preview --foreground

if ($LASTEXITCODE -ne 0) {
  Write-Host "Studio exited with an error (code $LASTEXITCODE)." -ForegroundColor Red
  Read-Host "Press Enter to close"
}
