# Git Hooks Quick Reference

## Installation

```bash
./scripts/install-git-hooks.sh
```

## Installed Hooks

| Hook | When | What |
|------|------|------|
| `pre-commit` | Before commit | Lint, typecheck, build |
| `prepare-commit-msg` | During commit | Warn about main branch |
| `post-checkout` | After checkout | Remind about feature branches |
| `commit-msg` | During commit | Block Claude references |
| `pre-push` | Before push | Block Claude references |

## Common Commands

### Create Feature Branch

```bash
# Interactive helper
.git/hooks/create-feature-branch.sh

# Manual creation
git checkout -b feature/your-feature-name
git checkout -b fix/bug-description
git checkout -b enhance/improvement
```

### Standard Workflow

```bash
# 1. Start from main
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/my-feature

# 3. Make changes and commit
git add .
git commit -m "feat: add new feature"
# Hooks run automatically

# 4. Push
git push -u origin feature/my-feature
```

### Bypass Hooks (Use Sparingly)

```bash
# Skip pre-commit checks
git commit --no-verify -m "wip: work in progress"

# Short form
git commit -n -m "wip: work in progress"
```

## Branch Naming

Format: `<type>/<description>`

**Types:**
- `feature/` - New features
- `fix/` - Bug fixes
- `enhance/` - Enhancements
- `refactor/` - Refactoring
- `test/` - Tests
- `docs/` - Documentation
- `chore/` - Maintenance

**Examples:**
- `feature/add-user-dashboard`
- `fix/resolve-scan-timeout`
- `enhance/improve-report-ui`

## Commit Message Format

```
<type>(<scope>): <description>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style
- `refactor` - Refactoring
- `test` - Tests
- `chore` - Maintenance

**Examples:**
```bash
git commit -m "feat(scanner): add PDF support"
git commit -m "fix(api): resolve timeout"
git commit -m "docs: update README"
```

## Troubleshooting

### Checks Failing

```bash
# Run manually to see errors
pnpm lint
pnpm typecheck
pnpm build

# Fix lint issues automatically
pnpm lint --fix
```

### Check Log Files

```bash
cat /tmp/gecko-lint.log
cat /tmp/gecko-typecheck.log
cat /tmp/gecko-build.log
```

### Hook Not Executable

```bash
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/prepare-commit-msg
chmod +x .git/hooks/post-checkout
```

### Reinstall Hooks

```bash
./scripts/install-git-hooks.sh
```

## Performance Tips

1. Run checks manually during development
2. Use `--no-verify` for WIP commits (but run full checks before push)
3. Turbo cache makes subsequent runs faster
4. Commit related files together

## When to Use --no-verify

**Acceptable:**
- WIP commits
- Emergency hotfixes
- Committing non-code files

**NOT Acceptable:**
- Production commits
- PR commits
- Commits to main/stage

## Help

Full documentation: `docs/GIT_HOOKS_GUIDE.md`

Hook locations: `.git/hooks/`

Installation script: `scripts/install-git-hooks.sh`
