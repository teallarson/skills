#!/usr/bin/env bash
# Installs skills, subagents, and the preferences rule for Cursor, including
# Cursor cloud agents. See setup/cursor/README.md.
set -o pipefail

here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../.." && pwd)
# shellcheck source=setup/lib.sh
. "$here/../lib.sh"

preferences="${PREFERENCES_FILE:-$repo/rules/teal-preferences.mdc}"
cache="${CURSOR_PLUGIN_CACHE:-$HOME/.cache/cursor-plugins}"
root_dir="${CURSOR_ROOT_DIR:-/.cursor}"
cursor="$HOME/.cursor"
# Paths this script created. Only these, or paths whose content already
# matches the source, are ever replaced; anything else is left alone. Kept
# inside ~/.cursor so it is never separated from the paths it lists.
owned_list="$cursor/.teallarson-skills-owned.txt"
# Destinations written during this run, to catch two sources using one name.
written_this_run=""

export GIT_TERMINAL_PROMPT=0

# Every later step writes under these folders, so stop here instead of
# reporting each of them as a separate failure.
if ! mkdir -p "$cache" "$cursor/skills" "$cursor/agents" "$cursor/rules" || ! touch "$owned_list"; then
  fail "cannot write to $cursor or $cache; nothing installed"
  finish
fi

is_owned() { grep -qFx -- "$1" "$owned_list"; }
claim() { is_owned "$1" || echo "$1" >>"$owned_list"; }

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

# Cursor has no Workflow tool, and agents installed here have no `teal:`
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
  if [ -L "$target" ] && [ "$(readlink "$target")" = "$cursor/$name" ]; then
    return 0
  fi
  if [ -e "$target" ] || [ -L "$target" ]; then
    echo "$target already exists and is not a link to $cursor/$name; left alone" >&2
    return 1
  fi
  sudo mkdir -p "$root_dir" && sudo ln -sfn "$cursor/$name" "$target"
}

check_file() { step "exists: $1" test -f "$1"; }

# Each source is installed once, into ~/.cursor/skills and ~/.cursor/agents.
if step "fetch posthog" clone_or_update https://github.com/PostHog/ai-plugin.git "$cache/posthog"; then
  sync_skills "$cache/posthog/skills"
  sync_agents "$cache/posthog/agents"
fi
if step "fetch vercel" clone_or_update https://github.com/vercel/vercel-plugin.git "$cache/vercel"; then
  sync_skills "$cache/vercel/skills"
  sync_agents "$cache/vercel/agents"
fi
if step "fetch ui-ux-pro-max" clone_or_update https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git "$cache/ui-ux-pro-max"; then
  sync_skills "$cache/ui-ux-pro-max/.claude/skills"
fi

# This repository: copied from the checkout this script runs from.
sync_skills "$repo/skills"
sync_agents "$repo/agents"
step "preferences rule" replace_path "$preferences" "$cursor/rules/teal-preferences.mdc"
step "skill build-slices (Cursor version)" replace_path "$here/skills/build-slices" "$cursor/skills/build-slices"
step "patch implement-slices" patch_implement_slices "$cursor/skills/implement-slices/SKILL.md"

if [ "${CURSOR_LINK_ROOT:-0}" = 1 ]; then
  step "link $root_dir/rules" link_root_dir rules
  step "link $root_dir/agents" link_root_dir agents
fi

# Only this repository's files are checked by name. A missing third-party
# folder is already reported by sync_skills and sync_agents.
for skill_dir in "$repo"/skills/*/; do
  [ -f "${skill_dir}SKILL.md" ] && check_file "$cursor/skills/$(basename "$skill_dir")/SKILL.md"
done
for f in "$repo"/agents/*.md; do
  [ -f "$f" ] && check_file "$cursor/agents/$(basename "$f")"
done
check_file "$cursor/skills/build-slices/SKILL.md"
check_file "$cursor/rules/teal-preferences.mdc"
if [ "${CURSOR_LINK_ROOT:-0}" = 1 ]; then
  check_file "$root_dir/rules/teal-preferences.mdc"
  check_file "$root_dir/agents/reviewer.md"
fi

echo "cursor: $(find "$cursor/skills" -mindepth 2 -maxdepth 2 -name SKILL.md | wc -l | tr -d ' ') skills, $(find "$cursor/agents" -maxdepth 1 -name '*.md' | wc -l | tr -d ' ') subagents"
finish
