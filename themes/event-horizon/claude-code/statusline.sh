#!/usr/bin/env bash
# Event Horizon status line for Claude Code.
# Claude Code pipes session JSON on stdin; we print one coloured line.
# Needs: bash + jq (macOS: brew install jq · Windows: Git Bash + winget install jqlang.jq)

input=$(cat)
j() { printf '%s' "$input" | jq -r "$1 // empty" 2>/dev/null; }

# 24-bit colours from the Event Horizon palette
ORANGE='\033[38;2;255;154;60m'   # accretion disk
GOLD='\033[38;2;255;210;122m'    # photon ring
VIOLET='\033[38;2;155;123;255m'  # nebula
CYAN='\033[38;2;34;211;238m'     # blue-shift
DIM='\033[38;2;139;133;168m'     # starlight
RED='\033[38;2;255;90;95m'
RESET='\033[0m'

model=$(j '.model.display_name')
dir=$(j '.workspace.current_dir'); [ -z "$dir" ] && dir=$(j '.cwd')
dir_name=${dir##*/}
cost=$(j '.cost.total_cost_usd')
ctx=$(j '.context_window.used_percentage')

branch=""
if [ -n "$dir" ] && git -C "$dir" rev-parse --git-dir >/dev/null 2>&1; then
  branch=$(git -C "$dir" branch --show-current 2>/dev/null)
  [ -n "$(git -C "$dir" status --porcelain 2>/dev/null | head -1)" ] && branch="$branch*"
fi

sep="${DIM} │ ${RESET}"
line="${ORANGE}◉${RESET} ${GOLD}${model:-Claude}${RESET}"
line+="${sep}${VIOLET}${dir_name:-~}${RESET}"
[ -n "$branch" ] && line+="${sep}${CYAN}⎇ ${branch}${RESET}"

if [ -n "$ctx" ]; then
  pct=${ctx%.*}
  # context gauge: 10 cells, turns red as you approach the horizon
  filled=$(( pct / 10 )); bar=""
  for i in $(seq 1 10); do [ "$i" -le "$filled" ] && bar+="█" || bar+="░"; done
  colour=$GOLD; [ "$pct" -ge 70 ] && colour=$ORANGE; [ "$pct" -ge 90 ] && colour=$RED
  line+="${sep}${colour}${bar} ${pct}%${RESET}"
fi

[ -n "$cost" ] && line+="${sep}${DIM}\$$(printf '%.2f' "$cost")${RESET}"

printf '%b\n' "$line"
