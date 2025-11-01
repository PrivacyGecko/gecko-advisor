# Git Hooks Development Workflow Guide

## Overview

This guide covers the Git hooks installed in the Gecko Advisor project to enforce code quality and development workflow best practices. These hooks automatically run at specific points in your Git workflow to ensure consistency and quality.

## Table of Contents

1. [Installed Hooks](#installed-hooks)
2. [Hook Descriptions](#hook-descriptions)
3. [Installation](#installation)
4. [Usage Examples](#usage-examples)
5. [Bypassing Hooks](#bypassing-hooks)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

## Installed Hooks

The following Git hooks are installed:

| Hook | Trigger | Purpose |
|------|---------|---------|
| `pre-commit` | Before commit is created | Runs lint, typecheck, and build checks |
| `prepare-commit-msg` | After commit message prepared | Warns about committing to main/stage branches |
| `post-checkout` | After checking out a branch | Reminds to create feature branches |
| `commit-msg` | After commit message entered | Blocks Claude references in messages (existing) |
| `pre-push` | Before pushing to remote | Blocks pushing commits with Claude references (existing) |

**Helper Script:**
- `.git/hooks/create-feature-branch.sh` - Interactive feature branch creation tool

## Hook Descriptions

### 1. Pre-Commit Hook

**File:** `.git/hooks/pre-commit`

**What it does:**
- Runs ESLint on all packages (`pnpm lint`)
- Runs TypeScript type checking on all packages (`pnpm typecheck`)
- Runs production build on all packages (`pnpm build`)
- Warns about TODO/FIXME markers (non-blocking)
- Blocks commit if any check fails

**When it runs:**
- Automatically before every `git commit`
- Does NOT run with `git commit --no-verify`

**Example output:**
```
═══════════════════════════════════════════════════════════════
              Pre-Commit Checks
═══════════════════════════════════════════════════════════════

[1/3] Running ESLint...
✅ Lint passed

[2/3] Running TypeScript type check...
✅ Type check passed

[3/3] Running build...
✅ Build passed

═══════════════════════════════════════════════════════════════
✅ All pre-commit checks PASSED
═══════════════════════════════════════════════════════════════
```

**On failure:**
```
═══════════════════════════════════════════════════════════════
❌ Pre-commit checks FAILED
═══════════════════════════════════════════════════════════════

Fix the errors above and try again.

To skip these checks (NOT RECOMMENDED):
  git commit --no-verify
```

### 2. Prepare-Commit-Msg Hook

**File:** `.git/hooks/prepare-commit-msg`

**What it does:**
- Checks which branch you're committing to
- Warns if committing directly to `main` branch
- Warns if committing to `stage` branch
- Confirms when on feature branch
- Requires user confirmation for main/stage commits

**When it runs:**
- After commit message is prepared, before commit is finalized
- Runs even with `--no-verify` on pre-commit

**Example output on main branch:**
```
═══════════════════════════════════════════════════════════════
⚠️  WARNING: You are committing directly to MAIN branch
═══════════════════════════════════════════════════════════════

Best practice: Create a feature branch for your changes

  To create a feature branch:
    git checkout -b feature/your-feature-name

  Or use the helper script:
    .git/hooks/create-feature-branch.sh

Press Enter to continue with main commit, or Ctrl+C to cancel
```

**Example output on feature branch:**
```
✅ Working on feature branch: feature/add-user-dashboard
```

### 3. Post-Checkout Hook

**File:** `.git/hooks/post-checkout`

**What it does:**
- Runs after checking out a branch
- Detects when you check out `main` branch
- Displays reminder to create feature branch
- Shows branch naming examples

**When it runs:**
- Automatically after `git checkout <branch>`
- Only for branch checkouts (not file checkouts)

**Example output:**
```
═══════════════════════════════════════════════════════════════
💡 Reminder: Create a feature branch for your work
═══════════════════════════════════════════════════════════════

Suggested workflow:

  For new feature:
    git checkout -b feature/your-feature-name

  For bug fix:
    git checkout -b fix/bug-description

  For enhancement:
    git checkout -b enhance/enhancement-name

  For chore/maintenance:
    git checkout -b chore/task-description

  Quick branch creation:
    .git/hooks/create-feature-branch.sh

═══════════════════════════════════════════════════════════════
```

### 4. Commit-Msg Hook (Existing)

**File:** `.git/hooks/commit-msg`

**What it does:**
- Scans commit message for Claude/Anthropic references
- Blocks commits with AI assistant references
- Prevents pushing commits with AI tool attribution

**Pattern detection:**
- "Claude"
- "Anthropic"
- Emojis with Claude references

### 5. Pre-Push Hook (Existing)

**File:** `.git/hooks/pre-push`

**What it does:**
- Checks all commits being pushed for Claude references
- Prevents pushing commits with AI attribution
- Shows which commits contain references

### 6. Create Feature Branch Helper

**File:** `.git/hooks/create-feature-branch.sh`

**What it does:**
- Interactive script to create properly named feature branches
- Automatically switches to main and pulls latest
- Sanitizes branch names
- Sets up branch for first push

**Usage:**
```bash
.git/hooks/create-feature-branch.sh
```

**Interactive prompts:**
```
═══════════════════════════════════════════════════════════════
         Gecko Advisor - Feature Branch Creator
═══════════════════════════════════════════════════════════════

Select branch type:
  1. feature  - New feature development
  2. fix      - Bug fix
  3. enhance  - Enhancement to existing feature
  4. refactor - Code refactoring
  5. test     - Test additions/updates
  6. docs     - Documentation updates
  7. chore    - Maintenance/tooling

Enter choice (1-7): 1

Enter branch name (e.g., 'add-user-authentication'): Add User Dashboard

Creating branch: feature/add-user-dashboard

✅ Branch created successfully!

You can now start working on your changes.

When ready to push:
  git push -u origin feature/add-user-dashboard
```

## Installation

### First Time Installation

Run the installation script from the project root:

```bash
cd /Users/pothamsettyk/Projects/Privacy-Advisor
./scripts/install-git-hooks.sh
```

### Reinstallation

If hooks need to be reinstalled (e.g., after pulling updates):

```bash
./scripts/install-git-hooks.sh
```

The script will:
- Backup any existing custom hooks
- Install all new hooks
- Make hooks executable
- Preserve existing hooks (commit-msg, pre-push)

### Manual Installation

If you prefer manual installation, copy the hook files from `scripts/install-git-hooks.sh` to `.git/hooks/` and make them executable:

```bash
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/prepare-commit-msg
chmod +x .git/hooks/post-checkout
chmod +x .git/hooks/create-feature-branch.sh
```

## Usage Examples

### Standard Workflow

1. **Check out main and ensure up-to-date:**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Create feature branch:**
   ```bash
   # Option 1: Use helper script
   .git/hooks/create-feature-branch.sh

   # Option 2: Manual creation
   git checkout -b feature/add-privacy-dashboard
   ```

3. **Make changes and commit:**
   ```bash
   # Make your code changes
   git add .
   git commit -m "feat: add privacy dashboard"

   # Hooks will automatically run:
   # - pre-commit: lint, typecheck, build
   # - prepare-commit-msg: confirm feature branch
   # - commit-msg: check for Claude references
   ```

4. **Push changes:**
   ```bash
   git push -u origin feature/add-privacy-dashboard

   # pre-push hook will check for Claude references
   ```

### Creating Different Branch Types

**Feature branch:**
```bash
git checkout -b feature/add-export-functionality
```

**Bug fix:**
```bash
git checkout -b fix/resolve-scan-timeout
```

**Enhancement:**
```bash
git checkout -b enhance/improve-report-ui
```

**Refactoring:**
```bash
git checkout -b refactor/extract-scanner-logic
```

**Tests:**
```bash
git checkout -b test/add-e2e-coverage
```

**Documentation:**
```bash
git checkout -b docs/update-api-documentation
```

**Chores:**
```bash
git checkout -b chore/update-dependencies
```

### Handling Failed Pre-Commit Checks

If pre-commit checks fail:

1. **Fix the issues:**
   ```bash
   # ESLint errors
   pnpm lint --fix

   # TypeScript errors
   # Fix manually in your code

   # Build errors
   # Fix compilation issues
   ```

2. **Try committing again:**
   ```bash
   git add .
   git commit -m "fix: resolve type errors"
   ```

3. **If checks still fail, review output:**
   - Check `/tmp/gecko-lint.log`
   - Check `/tmp/gecko-typecheck.log`
   - Check `/tmp/gecko-build.log`

## Bypassing Hooks

### When to Bypass

**Use `--no-verify` only when:**
- Working on a work-in-progress (WIP) commit
- Need to commit despite known issues
- Emergency hotfix situation
- Committing non-code files

**DO NOT bypass for:**
- Production commits
- Pull request commits
- Final commits before push
- Commits to main/stage branches

### How to Bypass

**Skip pre-commit hook:**
```bash
git commit --no-verify -m "wip: work in progress"
# or
git commit -n -m "wip: work in progress"
```

**Note:** The `prepare-commit-msg`, `commit-msg`, and `pre-push` hooks may still run.

## Troubleshooting

### Hook Not Running

**Problem:** Hook doesn't execute

**Solutions:**
1. Check hook is executable:
   ```bash
   ls -la .git/hooks/ | grep pre-commit
   ```

2. Make executable if needed:
   ```bash
   chmod +x .git/hooks/pre-commit
   ```

3. Reinstall hooks:
   ```bash
   ./scripts/install-git-hooks.sh
   ```

### Hook Fails Unexpectedly

**Problem:** Hook fails with errors

**Solutions:**
1. Check log files:
   ```bash
   cat /tmp/gecko-lint.log
   cat /tmp/gecko-typecheck.log
   cat /tmp/gecko-build.log
   ```

2. Run checks manually:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm build
   ```

3. Check dependencies installed:
   ```bash
   pnpm install
   ```

### Pre-Commit Takes Too Long

**Problem:** Commit is slow due to pre-commit checks

**Solutions:**
1. Use turbo cache (already configured):
   - Subsequent runs are faster

2. Run checks manually before committing:
   ```bash
   pnpm lint && pnpm typecheck && pnpm build
   git commit -m "feat: your changes"
   ```

3. For WIP commits, use `--no-verify`:
   ```bash
   git commit --no-verify -m "wip: partial implementation"
   ```

### Permission Denied Errors

**Problem:** Permission denied when executing hook

**Solution:**
```bash
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/prepare-commit-msg
chmod +x .git/hooks/post-checkout
chmod +x .git/hooks/create-feature-branch.sh
```

### Hooks Don't Work After Pull

**Problem:** Hooks stop working after pulling changes

**Solution:**
Git hooks are not version controlled. Reinstall after pulling:
```bash
./scripts/install-git-hooks.sh
```

## Best Practices

### Branch Naming Convention

Follow this pattern: `<type>/<description>`

**Types:**
- `feature/` - New features
- `fix/` - Bug fixes
- `enhance/` - Enhancements to existing features
- `refactor/` - Code refactoring
- `test/` - Test additions/updates
- `docs/` - Documentation updates
- `chore/` - Maintenance, tooling, dependencies

**Description:**
- Use lowercase
- Use hyphens to separate words
- Be descriptive but concise
- Examples:
  - `feature/add-user-dashboard`
  - `fix/resolve-scan-timeout`
  - `enhance/improve-report-ui`

### Commit Message Convention

Follow conventional commits format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Test additions/updates
- `chore` - Maintenance tasks

**Examples:**
```bash
git commit -m "feat(scanner): add PDF policy support"
git commit -m "fix(api): resolve timeout in scan endpoint"
git commit -m "docs: update installation guide"
git commit -m "refactor(worker): extract job processing logic"
```

### Development Workflow

1. **Always start from main:**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Create feature branch:**
   ```bash
   git checkout -b feature/your-feature
   ```

3. **Make atomic commits:**
   - One logical change per commit
   - Ensure all checks pass
   - Write clear commit messages

4. **Keep branch updated:**
   ```bash
   git checkout main
   git pull origin main
   git checkout feature/your-feature
   git merge main
   ```

5. **Push regularly:**
   ```bash
   git push -u origin feature/your-feature
   ```

6. **Create pull request:**
   - Use GitHub UI or CLI
   - Link to related issues
   - Request reviews

### Pre-Commit Performance Tips

1. **Run checks manually during development:**
   ```bash
   # Quick type check
   pnpm typecheck

   # Quick lint check
   pnpm lint
   ```

2. **Use turbo cache:**
   - Already configured
   - Second runs are much faster

3. **Commit related files together:**
   - Reduces number of commits
   - Reduces number of hook runs

4. **Use `--no-verify` for WIP commits:**
   - But always run full checks before pushing

### Hook Maintenance

1. **Update hooks when needed:**
   - Pull latest `scripts/install-git-hooks.sh`
   - Run `./scripts/install-git-hooks.sh`

2. **Test hooks after updates:**
   ```bash
   # Make a test commit
   git checkout -b test/hook-verification
   echo "test" >> README.md
   git add README.md
   git commit -m "test: verify hooks"
   ```

3. **Document custom modifications:**
   - If you customize hooks, document in this file

## Hook File Locations

All hooks are located in `.git/hooks/`:

```
.git/hooks/
├── pre-commit                    # Lint, typecheck, build
├── prepare-commit-msg            # Branch enforcement
├── post-checkout                 # Feature branch reminders
├── commit-msg                    # Claude reference check (existing)
├── pre-push                      # Claude reference check (existing)
└── create-feature-branch.sh      # Helper script
```

**Installation script:**
```
scripts/install-git-hooks.sh      # Installs all hooks
```

## Summary

The Git hooks in Gecko Advisor enforce:

1. **Code Quality:** Lint, typecheck, and build checks before commits
2. **Workflow Best Practices:** Feature branch development
3. **Clean Git History:** No AI assistant references
4. **Developer Experience:** Interactive helpers and clear feedback

These hooks help maintain high code quality and consistent development practices across the team while providing flexibility to bypass checks when absolutely necessary.

For questions or issues, consult the troubleshooting section or reach out to the team.
