# Creates a "SECTION_HEADER Studio" shortcut on the desktop that runs open-studio.ps1.
$ErrorActionPreference = "Stop"
$launcher = Join-Path $PSScriptRoot "open-studio.ps1"
if (-not (Test-Path -LiteralPath $launcher)) { throw "open-studio.ps1 not found next to this script." }

$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "SECTION_HEADER Studio.lnk"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$launcher`""
$shortcut.WorkingDirectory = $PSScriptRoot
$shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,115"
$shortcut.Description = "Open SECTION_HEADER in the HyperFrames timeline editor"
$shortcut.Save()

Write-Host "Shortcut created: $shortcutPath" -ForegroundColor Green
