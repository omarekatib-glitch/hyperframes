# One-time setup (needs internet once). After this, the desktop shortcut works offline.
#   irm https://raw.githubusercontent.com/omarekatib-glitch/hyperframes/refs/heads/claude/sweet-shannon-ijxlan/brand-templates/section-header/setup-windows.ps1 | iex
#
# 1. Installs Node.js LTS and FFmpeg with winget if they are missing.
# 2. Downloads the SECTION_HEADER template to Documents\HyperFrames\SECTION_HEADER
#    (an existing index.html is kept, so your edits survive a re-run).
# 3. Installs the HyperFrames CLI and its render browser inside that folder.
# 4. Creates the "SECTION_HEADER Studio" shortcut on the desktop.
& {
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Base = "https://raw.githubusercontent.com/omarekatib-glitch/hyperframes/refs/heads/claude/sweet-shannon-ijxlan/brand-templates/section-header"
$Dest = Join-Path ([Environment]::GetFolderPath("MyDocuments")) "HyperFrames\SECTION_HEADER"
$CliVersion = "0.8.77"
$Files = @(
  "index.html", "package.json", "hyperframes.json", "meta.json", "README.md",
  "open-studio.ps1", "install-desktop-shortcut.ps1", "setup-windows.ps1",
  "assets/fonts/cairo-arabic-700-normal.woff2", "assets/fonts/cairo-latin-700-normal.woff2",
  "assets/fonts/montserrat-latin-700-normal.woff2", "assets/fonts/OFL-Cairo.txt",
  "assets/fonts/OFL-Montserrat.txt", "assets/vendor/gsap.min.js"
)

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
              [Environment]::GetEnvironmentVariable("Path", "User")
}
function Ensure-Tool($command, $wingetId, $label) {
  if (Get-Command $command -ErrorAction SilentlyContinue) { Write-Host "$label found."; return }
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw "$label is missing and winget is not available. Install $label manually, then re-run this command."
  }
  Write-Host "Installing $label ..."
  winget install --id $wingetId -e --accept-source-agreements --accept-package-agreements --silent
  Refresh-Path
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
    throw "$label was installed but is not on PATH yet. Close PowerShell, open a new window, and re-run this command."
  }
}

Step "Checking Node.js and FFmpeg"
Ensure-Tool "node" "OpenJS.NodeJS.LTS" "Node.js"
Ensure-Tool "ffmpeg" "Gyan.FFmpeg" "FFmpeg"

Step "Downloading the template to $Dest"
foreach ($f in $Files) {
  $target = Join-Path $Dest ($f -replace "/", "\")
  if ($f -eq "index.html" -and (Test-Path -LiteralPath $target)) {
    Write-Host "  keeping your existing index.html"
    continue
  }
  New-Item -ItemType Directory -Force -Path (Split-Path $target) | Out-Null
  Invoke-WebRequest -UseBasicParsing -Uri "$Base/$f" -OutFile $target
  Write-Host "  $f"
}

Step "Installing HyperFrames $CliVersion into the template folder (for offline use)"
Push-Location $Dest
try {
  $env:HYPERFRAMES_NO_UPDATE_CHECK = "1"
  # npm.cmd, not npm: the npm.ps1 shim is blocked under the default execution policy.
  npm.cmd install --save-exact --no-audit --no-fund "hyperframes@$CliVersion"
  if ($LASTEXITCODE -ne 0) { throw "npm install failed." }

  Step "Installing the render browser (Chrome Headless Shell)"
  & (Join-Path $Dest "node_modules\.bin\hyperframes.cmd") browser ensure
  if ($LASTEXITCODE -ne 0) { throw "hyperframes browser ensure failed." }
} finally {
  Pop-Location
}

# The desktop .cmd launcher sets HF_SKIP_SHORTCUT=1: it is the shortcut already.
if ($env:HF_SKIP_SHORTCUT -ne "1") {
  Step "Creating the desktop shortcut"
  # Inline rather than calling install-desktop-shortcut.ps1: running .ps1 files is blocked
  # under the default execution policy, but this pasted command is not.
  $shortcutPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "SECTION_HEADER Studio.lnk"
  $shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut($shortcutPath)
  $shortcut.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
  $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $Dest 'open-studio.ps1')`""
  $shortcut.WorkingDirectory = $Dest
  $shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,115"
  $shortcut.Description = "Open SECTION_HEADER in the HyperFrames timeline editor"
  $shortcut.Save()
  Write-Host "Shortcut created: $shortcutPath"
}

Write-Host "`nDone. The template and editor are installed in $Dest (works offline)." -ForegroundColor Green
}
