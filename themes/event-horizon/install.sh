#!/usr/bin/env bash
# Event Horizon installer for macOS / Linux (GNOME). Run: bash install.sh
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"

# 1. Wallpaper
dest="$HOME/Pictures/EventHorizon"; mkdir -p "$dest"
cp "$here"/wallpaper/*.png "$dest"/
wp="$dest/event-horizon-4k.png"
case "$(uname)" in
  Darwin)
    osascript -e "tell application \"System Events\" to tell every desktop to set picture to \"$wp\""
    osascript -e 'tell application "System Events" to tell appearance preferences to set dark mode to true'
    defaults write -g AppleAccentColor -int 1          # orange
    defaults write -g AppleHighlightColor -string "1.000000 0.603922 0.235294 Orange"
    ;;
  Linux)
    if command -v gsettings >/dev/null; then
      gsettings set org.gnome.desktop.background picture-uri "file://$wp" || echo "Could not set wallpaper; set $wp manually."
      gsettings set org.gnome.desktop.background picture-uri-dark "file://$wp" 2>/dev/null || true
      gsettings set org.gnome.desktop.interface color-scheme prefer-dark 2>/dev/null || true
      gsettings set org.gnome.desktop.interface accent-color orange 2>/dev/null || true
    else
      echo "Set $wp as wallpaper manually (no gsettings found)."
    fi
    ;;
esac

# 2. Claude Code status line (needs jq)
command -v jq >/dev/null || { echo "Install jq first (brew install jq / sudo apt install jq)"; exit 1; }
mkdir -p "$HOME/.claude"
cp "$here/claude-code/statusline.sh" "$HOME/.claude/statusline-event-horizon.sh"
chmod +x "$HOME/.claude/statusline-event-horizon.sh"
settings="$HOME/.claude/settings.json"
[ -f "$settings" ] || echo '{}' > "$settings"
cp "$settings" "$settings.bak"
jq '.statusLine = {"type":"command","command":"~/.claude/statusline-event-horizon.sh","padding":0}' \
  "$settings.bak" > "$settings"

echo "Event Horizon installed. Restart Claude Code to see the status line."
