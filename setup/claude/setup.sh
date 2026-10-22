#!/usr/bin/env bash
# Adds plugin marketplaces, installs plugins, and adds the shared working
# preferences to ~/.claude/CLAUDE.md. See setup/claude/README.md.
set -o pipefail

here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../.." && pwd)
# shellcheck source=setup/lib.sh
. "$here/../lib.sh"

preferences="${PREFERENCES_FILE:-$repo/rules/teal-preferences.mdc}"
claude_md="$HOME/.claude/CLAUDE.md"

marketplaces="anthropics/claude-plugins-official
teallarson/skills
nextlevelbuilder/ui-ux-pro-max-skill"

plugins="teal@teallarson
ui-ux-pro-max@ui-ux-pro-max-skill
vercel@claude-plugins-official
posthog@claude-plugins-official"

export CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1

add_marketplace() {
  local source="$1" list
  list=$(claude plugin marketplace list --json) || return 1
  if printf '%s' "$list" | grep -qF "\"repo\": \"$source\""; then
    echo "      already added"
    return 0
  fi
  claude plugin marketplace add "$source"
}

install_plugin() {
  local id="$1" list
  list=$(claude plugin list --json) || return 1
  if printf '%s' "$list" | grep -qF "\"id\": \"$id\""; then
    echo "      already installed"
    return 0
  fi
  claude plugin install "$id"
}

# The install command's exit code is not the only signal: confirm the plugin
# shows up in the installed list afterwards.
check_installed() {
  claude plugin list --json | grep -qF "\"id\": \"$1\""
}

if command -v claude >/dev/null 2>&1; then
  for source in $marketplaces; do
    step "marketplace $source" add_marketplace "$source"
  done
  for id in $plugins; do
    step "install $id" install_plugin "$id" &&
      step "installed list includes $id" check_installed "$id"
  done
else
  fail "claude CLI not found on PATH; skipped all marketplaces and plugins"
fi

add_preferences() {
  if [ ! -f "$preferences" ]; then
    echo "preferences file not found: $preferences" >&2
    return 1
  fi
  local body status
  body=$(mktemp) || return 1
  strip_front_matter "$preferences" >"$body"
  write_marked_block "$claude_md" preferences "$body"
  status=$?
  rm -f "$body"
  return "$status"
}

if [ "${SKIP_CLAUDE_MD:-0}" = 1 ]; then
  ok "CLAUDE.md skipped (SKIP_CLAUDE_MD=1)"
else
  step "preferences block in $claude_md" add_preferences
fi

finish
