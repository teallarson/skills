#!/usr/bin/env bash
# Codex Cloud install script for any repository. Paste it into the
# environment's Install script, or give this file to its setup conversation.
# Do not run it on your own machine: it installs system packages and writes
# links into /usr/local/bin. See setup/codex/README.md.
#
# It installs tools, dependencies, and skills. It does not start app services
# or run tests.
set -Eeuo pipefail
trap 'printf "Install failed at line %s (exit %s).\n" "$LINENO" "$?" >&2' ERR
export DEBIAN_FRONTEND=noninteractive UV_HTTP_RETRIES=8 GIT_TERMINAL_PROMPT=0

# Settings. Each can be overridden from the environment.
MISE_VERSION="${MISE_VERSION:-2026.7.5}"
# Folders (relative to the repo root) searched for lockfiles and go.mod.
DEP_ROOTS="${DEP_ROOTS:-.}"
# Extra apt packages the repo needs, for example "postgresql-client".
EXTRA_APT_PACKAGES="${EXTRA_APT_PACKAGES:-}"
# Node version to install with mise when the repo's tool files don't provide
# node. Empty skips it.
NODE_FALLBACK_VERSION="${NODE_FALLBACK_VERSION-22}"
INSTALL_DOCKER="${INSTALL_DOCKER:-1}"
# Links placed here stay on PATH after this setup shell exits.
BIN_LINK_DIR="${BIN_LINK_DIR:-/usr/local/bin}"
codex_home="${CODEX_HOME:-$HOME/.codex}"
cache="${SKILL_CACHE:-$HOME/.cache/codex-skill-sources}"

# Skill sources, one per line: name, git URL, folder of skills in that repo.
# Every skill folder (a folder with SKILL.md) is linked into ~/.agents/skills.
SKILL_SOURCES="${SKILL_SOURCES:-teal https://github.com/teallarson/skills.git skills
posthog https://github.com/PostHog/ai-plugin.git skills
vercel https://github.com/vercel/vercel-plugin.git skills
ui-ux-pro-max https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git .claude/skills}"
# Linked as $CODEX_HOME/AGENTS.md unless that file already exists.
PREFERENCES_FILE="${PREFERENCES_FILE:-$cache/teal/rules/teal-preferences.mdc}"

repo=$(git -C "${REPO_DIR:-$PWD}" rev-parse --show-toplevel)
cd "$repo"

as_root() {
  if [ "$(id -u)" -eq 0 ]; then "$@"; else sudo -n "$@"; fi
}

as_root apt-get update
# shellcheck disable=SC2086 # EXTRA_APT_PACKAGES is a space-separated list.
as_root apt-get install -y --no-install-recommends \
  ca-certificates curl git build-essential pkg-config jq python3 $EXTRA_APT_PACKAGES

# Installs the Docker CLI and compose plugin only. Starting the daemon needs
# privileges Codex Cloud may not grant, so that is left alone.
if [ "$INSTALL_DOCKER" = 1 ]; then
  if ! command -v docker >/dev/null 2>&1; then
    as_root apt-get install -y --no-install-recommends docker.io
  fi
  if ! docker compose version >/dev/null 2>&1; then
    as_root apt-get install -y --no-install-recommends docker-compose-v2
  fi
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
if [ ! -x "$HOME/.local/bin/mise" ] ||
  ! "$HOME/.local/bin/mise" --version | grep -Fq "$MISE_VERSION"; then
  curl --fail --silent --show-error --location --retry 3 \
    https://mise.run -o "$tmp/mise-install.sh"
  MISE_VERSION="$MISE_VERSION" sh "$tmp/mise-install.sh"
fi
export PATH="$HOME/.local/bin:$HOME/.local/share/mise/shims:$HOME/go/bin:$PATH"

if [ -f .tool-versions ] || [ -f mise.toml ] || [ -f .mise.toml ]; then
  mise trust "$repo"
  mise install
fi
if [ -n "$NODE_FALLBACK_VERSION" ] && ! command -v node >/dev/null 2>&1; then
  mise use --global "node@$NODE_FALLBACK_VERSION"
fi
mise reshim

as_root ln -sfn "$HOME/.local/bin/mise" "$BIN_LINK_DIR/mise"
for bin in "$HOME/.local/share/mise/shims/"*; do
  [ -f "$bin" ] || continue
  as_root ln -sfn "$bin" "$BIN_LINK_DIR/$(basename "$bin")"
done

for root in $DEP_ROOTS; do
  if [ ! -d "$root" ]; then
    echo "DEP_ROOTS entry not found: $root" >&2
    exit 1
  fi
done

# Prints each folder under DEP_ROOTS that has a file with one of the given
# names, skipping installed dependencies and test fixtures.
find_project_dirs() {
  local root name names=()
  for name in "$@"; do names+=(-o -name "$name"); done
  for root in $DEP_ROOTS; do
    find "$root" -type d \( -name .git -o -name node_modules -o -name .venv -o -name vendor -o -name testdata \) -prune \
      -o -type f \( "${names[@]:1}" \) -exec dirname {} \;
  done | sort -u
}

# Runs one install command in each project folder, one at a time, so memory
# use stays bounded and the failing project is the last one printed. The list
# is read on fd 3 so installers that read stdin can't consume it.
install_each() {
  local label="$1" file_names="$2" dir
  shift 2
  # shellcheck disable=SC2086 # file_names is a space-separated list.
  while IFS= read -r dir <&3; do
    echo "$label dependencies: $dir"
    (cd "$dir" && "$@")
  done 3< <(find_project_dirs $file_names)
}

# Lockfiles are never rewritten: every install fails if the lockfile is stale.
install_each Bun "bun.lock bun.lockb" bun install --frozen-lockfile
install_each npm package-lock.json npm ci
install_each Python uv.lock uv sync --locked --all-extras
install_each Go go.mod go mod download

mkdir -p "$cache" "$HOME/.agents/skills" "$codex_home"
sync_source() {
  local name="$1" url="$2" subdir="$3" dest="$cache/$1" skill target
  if [ -d "$dest/.git" ]; then
    if [ -n "$(git -C "$dest" status --porcelain)" ]; then
      echo "Local changes in $dest; refusing to overwrite." >&2
      return 1
    fi
    git -C "$dest" pull --ff-only
  elif [ -e "$dest" ]; then
    echo "Unexpected path $dest; refusing to overwrite." >&2
    return 1
  else
    git clone --depth 1 "$url" "$dest"
  fi
  if [ ! -d "$dest/$subdir" ]; then
    echo "Skills directory missing: $dest/$subdir" >&2
    return 1
  fi
  for skill in "$dest/$subdir/"*/; do
    [ -f "${skill}SKILL.md" ] || continue
    target="$HOME/.agents/skills/$(basename "$skill")"
    if [ -L "$target" ] && [ "$(readlink "$target")" = "${skill%/}" ]; then
      continue
    elif [ -e "$target" ] || [ -L "$target" ]; then
      echo "Skill collision at $target; resolve it before continuing." >&2
      return 1
    fi
    ln -s "${skill%/}" "$target"
  done
  printf 'Skill source %s: %s\n' "$name" "$(git -C "$dest" rev-parse HEAD)"
}
while read -r name url subdir; do
  [ -n "$name" ] || continue
  sync_source "$name" "$url" "$subdir"
done <<EOF
$SKILL_SOURCES
EOF

if [ ! -s "$PREFERENCES_FILE" ]; then
  echo "Preferences file missing or empty: $PREFERENCES_FILE" >&2
  exit 1
fi
agents="$codex_home/AGENTS.md"
if [ -L "$agents" ] && [ "$(readlink "$agents")" = "$PREFERENCES_FILE" ]; then
  :
elif [ -e "$agents" ] || [ -L "$agents" ]; then
  echo "Existing $agents preserved. Add a reference to $PREFERENCES_FILE manually." >&2
else
  ln -s "$PREFERENCES_FILE" "$agents"
fi

skill_count=0
for skill in "$HOME/.agents/skills/"*/; do
  [ -f "${skill}SKILL.md" ] && skill_count=$((skill_count + 1))
done
if [ "$skill_count" -eq 0 ]; then
  echo "No skills found in $HOME/.agents/skills." >&2
  exit 1
fi
echo "Skills in $HOME/.agents/skills: $skill_count"

for tool in bun node npm uv go; do
  if command -v "$tool" >/dev/null 2>&1; then
    printf '%s: %s\n' "$tool" "$("$tool" --version 2>/dev/null || "$tool" version)"
  else
    printf '%s: not installed\n' "$tool"
  fi
done
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  echo 'Docker daemon reachable.'
else
  echo 'Docker daemon unavailable. Container-backed integration tests are not ready.' >&2
fi
printf 'Dependency setup finished for %s at %s. No app services or tests were run.\n' "$repo" "$(git rev-parse HEAD)"
