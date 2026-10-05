#!/usr/bin/env bash
# Lists places that may draw a colored stripe down the left edge of an element.
# Usage: find-fingernails.sh [path ...]   (defaults to the current directory)
# Exits 1 when anything matches, so it can run as a check.
# The patterns live in patterns.txt, shared with hook.sh.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
paths=("$@")
[ ${#paths[@]} -eq 0 ] && paths=(.)

status=0
rg --line-number --no-heading --pcre2 --file "$here/patterns.txt" \
  --glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!**/build/**' \
  --glob '!**/.next/**' --glob '!**/*.min.*' --glob '!**/*.map' \
  --glob '!**/*.lock' --glob '!**/*lock.json' \
  --type-add 'ui:*.{css,scss,sass,less,pcss,html,htm,jsx,tsx,js,ts,vue,svelte,astro,mdx}' \
  --type ui \
  "${paths[@]}" || status=$?
case "$status" in
  0) exit 1 ;; # Matches require classification by the skill.
  1) exit 0 ;;
  *) exit "$status" ;;
esac
