---
name: git-workflow
description: Commit and integrate changes the way this repo does it, with Conventional Commit messages and a linear history (rebase, never merge commits). Use whenever creating a commit, amending one, pulling, syncing a branch with main, or landing a branch or PR.
---

# Git workflow

History on `main` is linear and every commit is a semantic (Conventional Commits) commit. Keep it that way.

## Commit messages

Format: `type(scope): summary`, then an optional body.

- **Types** used here:
  - `feat` new visible behaviour or content
  - `fix` a bug or accessibility defect
  - `style` visual look only (fonts, colours, spacing), no behaviour change
  - `docs` README, CLAUDE.md, skills' prose, in-page "about" copy
  - `test` the visual-check / accessibility harness
  - `chore` credits, tooling, dependencies, anything else
  - `refactor`, `perf`, `build`, `ci` if they genuinely fit
- **Scope** is optional and names the area: a feature (`journal`, `fire`), a concern (`a11y`) or a tool (`visual-check`). Reuse existing scopes; check with `git log --format=%s`.
- **Summary**: imperative, lowercase start, no trailing full stop, about 72 characters max. Say what changes for the reader of the site, e.g. `fix(a11y): reflow journal and calling card at 320px`.
- **Body**: wrap at ~72 columns and explain *why* and any non-obvious trade-off, not a list of files. Skip it for trivial changes.
- One logical change per commit. Split unrelated work into separate commits rather than writing `feat: x and y`.
- Keep the attribution trailer the session asks for at the end of the body.

## Linear history: rebase, never merge

- Never create merge commits. Don't run `git merge` without `--ff-only`, and don't use "Create a merge commit" on GitHub PRs.
- Pull with rebase: `git pull --rebase` (or `git fetch` then `git rebase origin/main`).
- To bring a branch up to date with `main`: `git rebase main`, resolve conflicts per commit, `git rebase --continue`.
- To land a branch locally: rebase it onto `main`, then `git checkout main && git merge --ff-only <branch>`.
- To land a PR: `gh pr merge --rebase` (or `--squash` when the branch is one logical change); never `--merge`.
- After rebasing a branch that was already pushed, use `git push --force-with-lease`, never plain `--force`, and never force-push `main`.
- Interactive rebase (`-i`) isn't available in this environment; to tidy commits use `git commit --fixup <sha>` plus `GIT_SEQUENCE_EDITOR=: git rebase -i --autosquash <base>`, or `git reset --soft` and recommit.

## Before committing

- Only commit or push when the user asks.
- Review `git status` and `git diff --staged`; stage specific paths rather than `git add -A`, and never commit `.env`, `.shots/` or other local output.
- After UI changes, run the `visual-check` skill first.
