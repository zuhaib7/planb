# Event Horizon installer for Windows 10/11 (run in PowerShell from this folder):
#   powershell -ExecutionPolicy Bypass -File .\install.ps1
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Wallpaper
$pics = Join-Path $env:USERPROFILE 'Pictures\EventHorizon'
New-Item -ItemType Directory -Force -Path $pics | Out-Null
Copy-Item "$here\wallpaper\*.png" $pics -Force

# 2. Claude Code status line (needs Git Bash + jq on PATH)
$claude = Join-Path $env:USERPROFILE '.claude'
New-Item -ItemType Directory -Force -Path $claude | Out-Null
Copy-Item "$here\claude-code\statusline.sh" "$claude\statusline-event-horizon.sh" -Force
$settingsPath = Join-Path $claude 'settings.json'
$settings = if (Test-Path $settingsPath) { Get-Content $settingsPath -Raw | ConvertFrom-Json } else { [pscustomobject]@{} }
if (Test-Path $settingsPath) { Copy-Item $settingsPath "$settingsPath.bak" -Force }
$statusLine = [pscustomobject]@{ type = 'command'; command = 'bash ~/.claude/statusline-event-horizon.sh'; padding = 0 }
$settings | Add-Member -NotePropertyName statusLine -NotePropertyValue $statusLine -Force
$settings | ConvertTo-Json -Depth 20 | Set-Content $settingsPath -Encoding UTF8

# 3. Apply wallpaper + dark mode + orange accent
Start-Process "$here\os\EventHorizon.theme"
Write-Host "Event Horizon installed. Restart Claude Code to see the status line." -ForegroundColor DarkYellow
