#!/usr/bin/env bash
# Symlink every skill in this repo into your Claude Code and/or Cursor skills
# directory. Run it once to install, and re-run any time you add a skill or want
# to re-sync — it's idempotent.
#
#   ./install.sh
#
# It links each skill (any top-level dir with a SKILL.md) into whichever of
# ~/.claude/skills and ~/.cursor/skills exist. Existing symlinks are refreshed;
# a real (non-symlink) file or directory at the target is left untouched and
# flagged, so a stale hand-copied skill won't be clobbered silently — remove it
# yourself, then re-run.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

link_into() {
  local dest="$1"
  [ -d "$dest" ] || return 0   # skip a tool whose skills dir doesn't exist

  echo "→ $dest"
  local linked=0 relinked=0 skipped=0
  for d in "$REPO"/*/; do
    [ -f "${d}SKILL.md" ] || continue          # only real skills
    local name target
    name="$(basename "$d")"
    target="$dest/$name"

    if [ -L "$target" ]; then
      ln -sfn "$d" "$target"; relinked=$((relinked + 1))
    elif [ -e "$target" ]; then
      echo "  ! $name: a real file/dir is already there — not replacing it. Remove it and re-run to link."
      skipped=$((skipped + 1))
    else
      ln -s "$d" "$target"; linked=$((linked + 1))
      echo "  + $name"
    fi
  done
  echo "  ($linked linked, $relinked refreshed, $skipped skipped)"
}

link_into "$HOME/.claude/skills"
link_into "$HOME/.cursor/skills"

echo "Done. Start a new agent session so the skills are picked up."
