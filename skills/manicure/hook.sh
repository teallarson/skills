#!/usr/bin/env bash
# Claude Code PostToolUse hook for Edit, Write, and MultiEdit.
# Checks only the text the tool just wrote, so stripes already in the file
# don't trip it. On a match, exits 2 so Claude sees the message and fixes it.
set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
input="$(cat)"

file="$(jq -r '.tool_input.file_path // empty' <<<"$input")" || exit 1
case "$file" in
  */node_modules/*|*/dist/*|*/build/*|*/.next/*|*.min.*) exit 0 ;;
  *.css|*.scss|*.sass|*.less|*.pcss|*.html|*.htm|*.jsx|*.tsx|*.js|*.ts|*.vue|*.svelte|*.astro|*.mdx) ;;
  *) exit 0 ;;
esac

written="$(jq -r '
  [.tool_input.new_string, .tool_input.content, (.tool_input.edits[]?.new_string)]
  | map(select(. != null)) | join("\n")' <<<"$input")" || exit 1
[ -z "$written" ] && exit 0

status=0
hits="$(rg --line-number --no-heading --pcre2 --file "$here/patterns.txt" <<<"$written")" || status=$?
case "$status" in
  0) ;;
  1) exit 0 ;;
  *) exit "$status" ;;
esac

cat >&2 <<MSG
The code you just wrote to $file looks like it puts a colored stripe on the
left edge of an element (a "fingernail"). The user never wants these. Matches in
the text you wrote:

$hits

Remove the stripe and its color class. If it showed status, selection, or a
category, use the design system's variant, an icon, a tinted background, or a
badge instead. Follow the manicure skill ($here/SKILL.md).
If this is a 1px neutral border between two layout regions, it's fine: leave it.
MSG
exit 2
