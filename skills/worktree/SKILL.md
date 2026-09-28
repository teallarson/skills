---
name: worktree
description: Create, list, and remove git worktrees with the worktree-create and worktree-manage scripts, which symlink or copy .env files into each worktree. Use when the user mentions a worktree, parallel branches, multiple features at once, or a hotfix they need to start without stashing or switching branches.
---

# Git worktrees with .env syncing

The scripts come from https://github.com/teallarson/git-worktree-tools and need Git 2.5 or later.

## Before running a command

1. Check that you are in a git repository: `git rev-parse --show-toplevel`.
2. Check that the scripts are on PATH: `which worktree-create worktree-manage`. If they are not, use the full path the user gives or look in common install locations. If they are found but won't run: `chmod +x /path/to/git-worktree-tools/worktree-*`.
3. Show the user the full command you run.

## .env files

By default each worktree gets symlinks to the main repo's `.env*` files, so editing `.env` in any worktree changes it in all of them.

When the user wants different settings in one worktree (a different database, `DEBUG=true`), give it real copies: create it with `--copy-env`, or run `materialize` on an existing worktree.

## Commands

```bash
worktree-create [OPTIONS] <branch-name>    # new branch from main in .worktrees/<branch-name>
  -b, --base <branch>                      # base branch (default: main)
  -d, --dir <path>                         # worktree root (default: .worktrees)
  -c, --copy-env                           # copy .env files instead of symlinking
  -h, --help

worktree-manage list                       # worktrees, .env count, symlinked vs real files
worktree-manage materialize <branch-name>  # replace one worktree's .env symlinks with copies
worktree-manage materialize-all            # same, for every worktree
worktree-manage remove <branch-name>       # delete the worktree, then prompt to delete its branch
```

`remove` asks whether to delete the branch too. Ask the user before answering that prompt.

If the user has uncommitted work and needs another branch, such as for a hotfix, create a worktree instead of stashing or switching: `worktree-create -b main hotfix-<name>`.

Suggest branch names with a prefix: `feature-`, `fix-`, `hotfix-`, or `experiment-`. Suggest adding `.worktrees/` to `.gitignore`.

After creating a worktree, tell the user its path and the `cd` command to get there.

## Errors

- Base branch doesn't exist: run `git branch -a` and pick one that does.
- Worktree already exists: choose a different name, remove the existing worktree first, or use `-d` for a different directory.

## Without the scripts

Plain git works but does not handle `.env` files:

```bash
git worktree list
git worktree add <path> <branch>
git worktree remove <path>
```
