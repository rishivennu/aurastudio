import { NextRequest } from "next/server";
import { deviceById, validTz } from "@/lib/dayimg";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// never trust the Host header here: the script downloads and runs on the user's machine
const SAFE = /^https?:\/\/[A-Za-z0-9.\-]+(:\d+)?$/;
const site = () => (SAFE.test(SITE) ? SITE : null);

function windows(url: string) {
  return `# aura.studio daily wallpaper for Windows
# Run once:   right-click > Run with PowerShell, or:  powershell -ExecutionPolicy Bypass -File aura-daily.ps1 -Install
# Remove:     powershell -ExecutionPolicy Bypass -File aura-daily.ps1 -Uninstall
param([switch]$Install, [switch]$Uninstall)
$ErrorActionPreference = "Stop"
$url  = "${url}"
$dir  = Join-Path $env:LOCALAPPDATA "aura"
$task = "aura daily wallpaper"
if ($Uninstall) {
  Unregister-ScheduledTask -TaskName $task -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Removed. Your current wallpaper stays as it is."
  exit
}
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$self = Join-Path $dir "aura-daily.ps1"
if ($Install -or -not (Get-ScheduledTask -TaskName $task -ErrorAction SilentlyContinue)) {
  if ($PSCommandPath -and $PSCommandPath -ne $self) { Copy-Item -LiteralPath $PSCommandPath -Destination $self -Force }
  if (-not (Test-Path $self)) { Write-Host "Save this file to disk and run it from there."; exit 1 }
  $action  = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File \`"$self\`""
  $trigger = New-ScheduledTaskTrigger -Daily -At (Get-Date -Hour 7 -Minute 0 -Second 0)
  $set     = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
  Register-ScheduledTask -TaskName $task -Action $action -Trigger $trigger -Settings $set -Force | Out-Null
  Write-Host "Installed. Your wallpaper changes every morning at 7 (or as soon as the PC is on)."
}
# a new file name each day, because Windows caches the old image by path
$file = Join-Path $dir ("daily-" + (Get-Date -Format "yyyyMMdd") + ".jpg")
Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $file
Get-ChildItem $dir -Filter "daily-*.jpg" | Where-Object { $_.FullName -ne $file } | Remove-Item -ErrorAction SilentlyContinue
if (-not ([System.Management.Automation.PSTypeName]"AuraWall").Type) {
Add-Type @"
using System.Runtime.InteropServices;
public class AuraWall { [DllImport("user32.dll", CharSet = CharSet.Auto)] public static extern int SystemParametersInfo(int a, int b, string c, int d); }
"@
}
[AuraWall]::SystemParametersInfo(20, 0, $file, 3) | Out-Null
Write-Host "Today's wallpaper is set."
`.replace(/\n/g, "\r\n");
}

function mac(url: string) {
  return `#!/bin/sh
# aura.studio daily wallpaper for macOS
# Install:   sh aura-daily.sh install      Remove:   sh aura-daily.sh uninstall
URL="${url}"
DIR="$HOME/Library/Application Support/aura"
PL="$HOME/Library/LaunchAgents/studio.aura.daily.plist"
mkdir -p "$DIR"
if [ "$1" = "uninstall" ]; then
  launchctl bootout "gui/$(id -u)" "$PL" 2>/dev/null || launchctl unload "$PL" 2>/dev/null; rm -f "$PL" "$DIR/aura-daily.sh"
  echo "Removed. Your current wallpaper stays as it is."; exit 0
fi
if [ "$1" = "install" ]; then
  if [ ! -f "$0" ]; then echo "Save this file and run: sh aura-daily.sh install"; exit 1; fi
  cp "$0" "$DIR/aura-daily.sh"
  mkdir -p "$HOME/Library/LaunchAgents"
  cat > "$PL" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>studio.aura.daily</string>
  <key>ProgramArguments</key><array><string>/bin/sh</string><string>$DIR/aura-daily.sh</string></array>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>7</integer><key>Minute</key><integer>0</integer></dict>
  <key>RunAtLoad</key><true/>
</dict></plist>
PLIST
  launchctl bootout "gui/$(id -u)" "$PL" 2>/dev/null || launchctl unload "$PL" 2>/dev/null
  launchctl bootstrap "gui/$(id -u)" "$PL" 2>/dev/null || launchctl load "$PL"
  echo "Installed. Your wallpaper changes every morning at 7."
fi
F="$DIR/daily-$(date +%Y%m%d).jpg"
curl -fsSL "$URL" -o "$F" || exit 1
find "$DIR" -name 'daily-*.jpg' ! -name "$(basename "$F")" -delete
osascript -e "tell application \\"System Events\\" to tell every desktop to set picture to POSIX file \\"$F\\""
`;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const os = q.get("os") === "mac" ? "mac" : "windows";
  const dev = deviceById(q.get("device") || "desktop");
  const tz = validTz(q.get("tz"));
  const base = site();
  if (!base) return new Response("Set NEXT_PUBLIC_SITE_URL to this site's address to enable scripts.", { status: 503 });
  const url = `${base}/api/daily?device=${dev.id}${tz ? `&tz=${encodeURIComponent(tz)}` : ""}`;
  const body = os === "mac" ? mac(url) : windows(url);
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename=${os === "mac" ? "aura-daily.sh" : "aura-daily.ps1"}`,
      "cache-control": "no-store",
    },
  });
}
