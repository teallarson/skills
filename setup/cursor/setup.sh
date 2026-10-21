#!/usr/bin/env bash
# Installs skills, subagents, the preferences rule, and local plugins for
# Cursor, including Cursor cloud agents. See setup/cursor/README.md.
set -o pipefail

here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../.." && pwd)
# shellcheck source=setup/lib.sh
. "$here/../lib.sh"

preferences="${PREFERENCES_FILE:-$repo/rules/teal-preferences.mdc}"
cache="${CURSOR_PLUGIN_CACHE:-$HOME/.cache/cursor-plugins}"
root_dir="${CURSOR_ROOT_DIR:-/.cursor}"
cursor="$HOME/.cursor"
local_plugins="$cursor/plugins/local"
# Paths this script created. Only these, or paths whose content already
# matches the source, are ever replaced; anything else is left alone.
owned_list="${XDG_STATE_HOME:-$HOME/.local/state}/teallarson-skills/cursor-owned.txt"
# Destinations written during this run, to catch two sources using one name.
written_this_run=""

export GIT_TERMINAL_PROMPT=0

mkdir -p "$cache" "$cursor/skills" "$cursor/agents" "$cursor/rules" "$local_plugins" "$(dirname "$owned_list")"
touch "$owned_list"

is_owned() { grep -qFx -- "$1" "$owned_list"; }
claim() { is_owned "$1" || echo "$1" >>"$owned_list"; }

same_dir() {
  [ -d "$1" ] && [ -d "$2" ] && [ "$(cd "$1" && pwd -P)" = "$(cd "$2" && pwd -P)" ]
}

# Copies $1 (file or directory) to $2, replacing $2 only if this script owns
# it or it already has the same content.
replace_path() {
  local src="$1" dest="$2"
  case "$written_this_run" in
    *"
$dest
"*)
      echo "$dest was already written by another source in this run; skipped $src" >&2
      return 1
      ;;
  esac
  if same_dir "$src" "$dest"; then
    echo "      $dest is the source checkout; left in place"
    return 0
  fi
  if [ -e "$dest" ] || [ -L "$dest" ]; then
    if ! is_owned "$dest" && ! diff -rq "$src" "$dest" >/dev/null 2>&1; then
      echo "$dest exists, differs from $src, and was not created by this setup; left alone. Move it aside and rerun to replace it." >&2
      return 1
    fi
    rm -rf "$dest" || return 1
  fi
  cp -a "$src" "$dest" || return 1
  claim "$dest"
  written_this_run="$written_this_run
$dest
"
}

clone_or_update() {
  local url="$1" dest="$2"
  if [ -d "$dest/.git" ]; then
    local origin
    origin=$(git -C "$dest" remote get-url origin) || return 1
    if [ "$origin" != "$url" ]; then
      echo "$dest is a checkout of $origin, not $url; left alone" >&2
      return 1
    fi
    git -C "$dest" fetch --depth 1 origin && git -C "$dest" reset --hard FETCH_HEAD
  elif [ -e "$dest" ]; then
    echo "$dest exists and is not a git checkout; left alone" >&2
    return 1
  else
    git clone --depth 1 "$url" "$dest"
  fi
}

sync_skills() {
  local src_root="$1" skill_dir name
  if [ ! -d "$src_root" ]; then
    fail "skills folder not found: $src_root"
    return
  fi
  for skill_dir in "$src_root"/*/; do
    [ -f "${skill_dir}SKILL.md" ] || continue
    skill_dir="${skill_dir%/}"
    name=$(basename "$skill_dir")
    step "skill $name" replace_path "$skill_dir" "$cursor/skills/$name"
  done
}

sync_agents() {
  local src="$1" f
  if [ ! -d "$src" ]; then
    fail "agents folder not found: $src"
    return
  fi
  for f in "$src"/*.md; do
    [ -f "$f" ] || continue
    step "agent $(basename "$f")" replace_path "$f" "$cursor/agents/$(basename "$f")"
  done
}

install_local_plugin() {
  local name="$1" src="$2" dest="$local_plugins/$1"
  replace_path "$src" "$dest" || return 1
  same_dir "$src" "$dest" || rm -rf "$dest/.git"
}

# Cursor has no Workflow tool and loads plugin agents without the `teal:`
# prefix, so implement-slices is pointed at the Cursor build-slices skill.
patch_implement_slices() {
  python3 - "$1" <<'PY'
import re
import sys
from pathlib import Path

p = Path(sys.argv[1])
text = re.sub(r"`teal:(researcher|ui-checker|reviewer)`", r"`\1`", p.read_text())
old = "Call the Workflow tool with the plugin workflow `teal:build-slices` (or `scriptPath: ${CLAUDE_PLUGIN_ROOT}/workflows/build-slices.js`) and these args:"
new = "Follow the `build-slices` skill. It runs the same stages with Cursor subagents. Pass these args:"
if old not in text and new not in text:
    sys.exit(f"{p}: expected text not found: {old}")
p.write_text(text.replace(old, new))
PY
}

link_root_dir() {
  local name="$1" target="$root_dir/$1"
  if [ -e "$target" ] && [ ! -L "$target" ]; then
    echo "$target exists and is not a symlink; left alone" >&2
    return 1
  fi
  sudo mkdir -p "$root_dir" && sudo ln -sfn "$cursor/$name" "$target"
}

check_file() { step "exists: $1" test -f "$1"; }

# Third-party sources: Cursor reads their skills and agents from the clones.
if step "fetch posthog" clone_or_update https://github.com/PostHog/ai-plugin.git "$cache/posthog"; then
  sync_skills "$cache/posthog/skills"
  sync_agents "$cache/posthog/agents"
fi
if step "fetch vercel" clone_or_update https://github.com/vercel/vercel-plugin.git "$cache/vercel"; then
  sync_skills "$cache/vercel/skills"
  sync_agents "$cache/vercel/agents"
  step "local plugin vercel" install_local_plugin vercel "$cache/vercel"
fi
if step "fetch ui-ux-pro-max" clone_or_update https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git "$cache/ui-ux-pro-max"; then
  sync_skills "$cache/ui-ux-pro-max/.claude/skills"
  if step "local plugin ui-ux-pro-max" install_local_plugin ui-ux-pro-max "$cache/ui-ux-pro-max"; then
    manifest="$local_plugins/ui-ux-pro-max/.cursor-plugin/plugin.json"
    if [ ! -f "$manifest" ]; then
      mkdir -p "$(dirname "$manifest")"
      cat >"$manifest" <<'EOF'
{
  "name": "ui-ux-pro-max",
  "description": "UI/UX design intelligence for pages, components, color, typography, layout, and accessibility.",
  "skills": ".claude/skills"
}
EOF
      ok "wrote $manifest"
    fi
  fi
fi

# This repository: copied from the checkout this script runs from.
sync_skills "$repo/skills"
sync_agents "$repo/agents"
step "preferences rule" replace_path "$preferences" "$cursor/rules/teal-preferences.mdc"
step "skill build-slices (Cursor version)" replace_path "$here/skills/build-slices" "$cursor/skills/build-slices"
step "patch implement-slices" patch_implement_slices "$cursor/skills/implement-slices/SKILL.md"

if step "local plugin teal" install_local_plugin teal "$repo" && ! same_dir "$repo" "$local_plugins/teal"; then
  plugin="$local_plugins/teal"
  step "local plugin teal: preferences rule" cp "$preferences" "$plugin/rules/teal-preferences.mdc"
  step "local plugin teal: build-slices skill" cp -R "$here/skills/build-slices" "$plugin/skills/"
  step "local plugin teal: patch implement-slices" patch_implement_slices "$plugin/skills/implement-slices/SKILL.md"
fi

if [ "${CURSOR_LINK_ROOT:-0}" = 1 ]; then
  step "link $root_dir/rules" link_root_dir rules
  step "link $root_dir/agents" link_root_dir agents
fi

check_file "$cursor/skills/worktree/SKILL.md"
check_file "$cursor/skills/build-slices/SKILL.md"
check_file "$cursor/skills/ui-ux-pro-max/SKILL.md"
check_file "$cursor/skills/vercel-cli/SKILL.md"
check_file "$cursor/skills/building-a-dashboard/SKILL.md"
check_file "$cursor/agents/researcher.md"
check_file "$cursor/agents/reviewer.md"
check_file "$cursor/agents/ui-checker.md"
check_file "$cursor/agents/error-analyzer.md"
check_file "$cursor/agents/ai-architect.md"
check_file "$cursor/agents/deployment-expert.md"
check_file "$cursor/agents/performance-optimizer.md"
check_file "$cursor/rules/teal-preferences.mdc"
check_file "$local_plugins/teal/workflows/build-slices.js"
check_file "$local_plugins/teal/agents/researcher.md"
check_file "$local_plugins/teal/skills/build-slices/SKILL.md"
check_file "$local_plugins/ui-ux-pro-max/.cursor-plugin/plugin.json"
if [ "${CURSOR_LINK_ROOT:-0}" = 1 ]; then
  check_file "$root_dir/rules/teal-preferences.mdc"
  check_file "$root_dir/agents/reviewer.md"
fi

echo "cursor: $(find "$cursor/skills" -mindepth 2 -maxdepth 2 -name SKILL.md | wc -l | tr -d ' ') skills, $(find "$cursor/agents" -maxdepth 1 -name '*.md' | wc -l | tr -d ' ') subagents"
finish
