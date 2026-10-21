# shellcheck shell=bash
# Shared helpers for setup/claude/setup.sh and setup/cursor/setup.sh.
# Written for bash 3.2 (the macOS default) as well as newer bash.

failure_count=0
failure_list=""

ok() { printf 'ok    %s\n' "$*"; }
fail() {
  printf 'FAIL  %s\n' "$*" >&2
  failure_count=$((failure_count + 1))
  failure_list="${failure_list}  - $*
"
}

# Runs a command and records a failure if it exits non-zero. The command's own
# output stays visible so the cause is next to the FAIL line.
step() {
  local label="$1"
  shift
  if "$@"; then
    ok "$label"
    return 0
  else
    local status=$?
    fail "$label (exit $status)"
    return "$status"
  fi
}

# Prints the summary and exits 1 if any step failed.
finish() {
  if [ "$failure_count" -gt 0 ]; then
    printf '\n%d step(s) failed:\n%s' "$failure_count" "$failure_list" >&2
    exit 1
  fi
  printf '\nAll steps succeeded.\n'
}

# Prints a .mdc rule without its YAML front matter.
strip_front_matter() {
  awk 'NR == 1 && $0 == "---" { in_fm = 1; next }
       in_fm && $0 == "---" { in_fm = 0; next }
       !in_fm { print }' "$1"
}

# Puts the contents of $3 between BEGIN/END marker lines named $2 in file $1.
# Text outside the markers is never changed. Appends the block when there are
# no markers, replaces it when there is exactly one well-ordered pair, and
# refuses to touch the file otherwise. Before changing an existing file it
# copies it to $1.bak.
write_marked_block() {
  local file="$1" name="$2" content="$3"
  local begin="<!-- BEGIN teallarson/skills: $name -->"
  local end="<!-- END teallarson/skills: $name -->"
  local tmp
  tmp=$(mktemp) || return 1

  if [ ! -e "$file" ]; then
    { echo "$begin"; cat "$content"; echo "$end"; } >"$tmp"
  else
    local begins ends
    begins=$(grep -cFx -- "$begin" "$file")
    ends=$(grep -cFx -- "$end" "$file")
    if [ "$begins" -eq 0 ] && [ "$ends" -eq 0 ]; then
      cat "$file" >"$tmp"
      if [ -s "$file" ]; then
        # Start the block on its own line even if the file lacks a final newline.
        [ -n "$(tail -c 1 "$file")" ] && echo >>"$tmp"
        echo >>"$tmp"
      fi
      { echo "$begin"; cat "$content"; echo "$end"; } >>"$tmp"
    elif [ "$begins" -eq 1 ] && [ "$ends" -eq 1 ] &&
      [ "$(grep -nFx -- "$begin" "$file" | cut -d: -f1)" -lt "$(grep -nFx -- "$end" "$file" | cut -d: -f1)" ]; then
      awk -v begin="$begin" -v end="$end" -v content="$content" '
        $0 == begin { print; while ((getline line < content) > 0) print line; skipping = 1; next }
        $0 == end { skipping = 0 }
        !skipping { print }' "$file" >"$tmp"
    else
      echo "$file has $begins BEGIN and $ends END markers for '$name' (expected one of each, BEGIN first); not changed" >&2
      rm -f "$tmp"
      return 1
    fi
  fi

  if [ -e "$file" ] && cmp -s "$tmp" "$file"; then
    rm -f "$tmp"
    return 0
  fi
  if [ -e "$file" ]; then
    cp -p "$file" "$file.bak" || { rm -f "$tmp"; return 1; }
  fi
  mkdir -p "$(dirname "$file")" && cat "$tmp" >"$file"
  local status=$?
  rm -f "$tmp"
  return "$status"
}
