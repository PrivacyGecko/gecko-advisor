<!--
SPDX-FileCopyrightText: 2025 Privacy Gecko
SPDX-License-Identifier: MIT
-->

# Git History Cleaning Guide

This guide explains how to clean sensitive data from Git history before open sourcing Gecko Advisor.

**⚠️ WARNING**: Rewriting Git history is destructive and will change all commit hashes. This should only be done BEFORE making the repository public. All contributors must re-clone after history rewriting.

---

## Table of Contents

1. [When to Clean Git History](#when-to-clean-git-history)
2. [Backup First](#backup-first)
3. [Method 1: Fresh Repository (Recommended)](#method-1-fresh-repository-recommended)
4. [Method 2: BFG Repo-Cleaner](#method-2-bfg-repo-cleaner)
5. [Method 3: git-filter-repo](#method-3-git-filter-repo)
6. [Method 4: Manual git filter-branch](#method-4-manual-git-filter-branch)
7. [Verification](#verification)
8. [Post-Cleanup](#post-cleanup)

---

## When to Clean Git History

Clean git history if the security audit reveals:

- ✅ **Environment files** (`.env`, `.env.production`) committed in the past
- ✅ **API keys, passwords, tokens** in old commits
- ✅ **Database credentials** in configuration files
- ✅ **Server IP addresses** or production URLs
- ✅ **Private keys** or certificates
- ✅ **Large binary files** that shouldn't be in the repository

If the security audit shows **no critical issues in git history**, you can skip this step.

---

## Backup First

**ALWAYS** create a complete backup before modifying git history:

```bash
# Create a backup directory
mkdir -p ~/gecko-advisor-backup-$(date +%Y%m%d)

# Clone the entire repository with all branches
cd ~/gecko-advisor-backup-$(date +%Y%m%d)
git clone --mirror /path/to/gecko-advisor gecko-advisor-mirror.git

# Verify backup
cd gecko-advisor-mirror.git
git log --all --oneline | head -20

# Archive for extra safety
cd ..
tar -czf gecko-advisor-backup-$(date +%Y%m%d-%H%M%S).tar.gz gecko-advisor-mirror.git
```

---

## Method 1: Fresh Repository (Recommended)

**Recommended approach**: Create a clean repository with current state only.

### Advantages
- ✅ Simplest and safest approach
- ✅ No risk of leaked secrets in history
- ✅ Clean, linear commit history
- ✅ Smaller repository size

### Disadvantages
- ❌ Loses all commit history
- ❌ Loses contributor attribution (can be preserved in AUTHORS file)

### Steps

```bash
# 1. Create a new directory for the clean repository
mkdir ~/gecko-advisor-clean
cd ~/gecko-advisor-clean

# 2. Initialize new git repository
git init
git branch -m main

# 3. Copy current codebase (excluding git directory)
rsync -av --progress \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.turbo' \
  --exclude='test-results' \
  --exclude='assets/dlogs' \
  --exclude='assets/ss' \
  --exclude='assets/prompts' \
  --exclude='Project-Docs' \
  /path/to/original/gecko-advisor/ .

# 4. Create .env.example (if not already present)
cp .env .env.example
# Manually edit .env.example to remove all sensitive values

# 5. Initial commit
git add .
git commit -m "feat: Initial public release of Gecko Advisor

Privacy-first website scanner with deterministic scoring.

- React frontend with Vite and TailwindCSS
- Express backend with Prisma ORM
- BullMQ worker for scan processing
- PostgreSQL database with full schema
- Docker deployment configuration
- Comprehensive documentation"

# 6. Create GitHub repository and push
# (Follow instructions in PRE_RELEASE_CHECKLIST.md)
```

### Preserving Attribution

Create an `AUTHORS` file to preserve contributor recognition:

```bash
# Generate AUTHORS file from old repository
cd /path/to/original/gecko-advisor
git log --format='%aN <%aE>' | sort -u > AUTHORS

# Copy to new repository
cp AUTHORS ~/gecko-advisor-clean/
cd ~/gecko-advisor-clean
git add AUTHORS
git commit -m "docs: Add contributors list"
```

---

## Method 2: BFG Repo-Cleaner

**Use when**: You want to preserve history but remove specific sensitive files or text patterns.

### Installation

```bash
# macOS with Homebrew
brew install bfg

# Or download JAR directly
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar
```

### Remove Sensitive Files

```bash
# Clone fresh copy
git clone --mirror /path/to/gecko-advisor gecko-advisor-clean.git
cd gecko-advisor-clean.git

# Remove all .env files from history
bfg --delete-files ".env*" --no-blob-protection

# Remove specific files
bfg --delete-files "credentials.json" --no-blob-protection

# Remove files larger than 10MB
bfg --strip-blobs-bigger-than 10M

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Verify
git log --all --oneline -- .env
# Should show no results
```

### Replace Text Patterns

```bash
# Create a replacements file
cat > passwords.txt <<EOF
PASSWORD1
SECRET_API_KEY_ABC123
production-db-password
EOF

# Replace with ***REMOVED***
bfg --replace-text passwords.txt

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

---

## Method 3: git-filter-repo

**Use when**: You need fine-grained control over history rewriting.

### Installation

```bash
# macOS with Homebrew
brew install git-filter-repo

# Or with pip
pip3 install git-filter-repo
```

### Remove Files

```bash
# Clone fresh copy
git clone /path/to/gecko-advisor gecko-advisor-clean
cd gecko-advisor-clean

# Remove .env files from all history
git filter-repo --path .env --invert-paths
git filter-repo --path .env.production --invert-paths
git filter-repo --path .env.stage --invert-paths

# Remove directory from history
git filter-repo --path Project-Docs --invert-paths
git filter-repo --path assets/prompts --invert-paths

# Analyze what would be removed (dry run)
git filter-repo --path .env --invert-paths --dry-run
```

### Replace Text

```bash
# Replace sensitive strings
git filter-repo --replace-text <(cat <<EOF
password123==>***REMOVED***
api-key-abc123==>***REMOVED***
65.108.148.246==>***REMOVED***
EOF
)
```

---

## Method 4: Manual git filter-branch

**Use when**: Other methods are not available (least recommended).

### Remove Files

```bash
# Clone fresh copy
git clone /path/to/gecko-advisor gecko-advisor-clean
cd gecko-advisor-clean

# Remove .env files from history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env .env.production .env.stage' \
  --prune-empty --tag-name-filter cat -- --all

# Remove directory from history
git filter-branch --force --index-filter \
  'git rm -r --cached --ignore-unmatch Project-Docs/' \
  --prune-empty --tag-name-filter cat -- --all

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

---

## Verification

After cleaning, verify sensitive data is removed:

```bash
# 1. Run security audit
./scripts/security-audit.sh --output cleaned-audit.txt

# 2. Search for specific sensitive strings
git log --all --source --full-history -S "PASSWORD123"
git log --all --source --full-history -S "65.108.148.246"

# 3. Check for removed files
git log --all --full-history -- .env
git log --all --full-history -- Project-Docs/

# 4. Check repository size
du -sh .git
git count-objects -vH

# 5. List all files ever in repository
git log --pretty=format: --name-only --diff-filter=A | sort -u | grep -E "\.env|credential|secret"
```

---

## Post-Cleanup

### 1. Force Push to New Remote

```bash
# Add new GitHub repository as remote
git remote add origin-clean https://github.com/YOUR_ORG/gecko-advisor.git

# Push all branches
git push origin-clean --all --force

# Push all tags
git push origin-clean --tags --force
```

### 2. Update Team

**Send notification to all contributors:**

> **Git History Rewritten for Open Source Release**
>
> We've cleaned the git history to remove sensitive data before open sourcing Gecko Advisor.
>
> **Action required:**
> 1. Delete your local clone: `rm -rf gecko-advisor`
> 2. Re-clone from new repository: `git clone https://github.com/YOUR_ORG/gecko-advisor.git`
> 3. Do NOT push from old clones (all commit hashes have changed)

### 3. Rotate Credentials

Even after cleaning git history, **rotate all credentials** that may have been exposed:

```bash
# Credentials to rotate:
- Database passwords
- API keys (Cloudflare Turnstile, etc.)
- Object storage access keys
- Admin API keys
- JWT secrets
- Any production credentials
```

### 4. Archive Old Repository

```bash
# Make old repository read-only
cd /path/to/original/gecko-advisor
git tag -a archive/pre-oss -m "Archive before open source release"
git push origin archive/pre-oss

# Optional: Delete branches on old remote
git push origin --delete stage
git push origin --delete main
```

---

## Recommended Approach for Gecko Advisor

Based on the security audit results, we recommend:

### If Security Audit shows CRITICAL issues in history:
→ **Use Method 1 (Fresh Repository)** - Safest and simplest

### If Security Audit shows only WARNING issues:
→ **Use Method 2 (BFG) or Method 3 (git-filter-repo)** - Preserves history

### If Security Audit shows no issues:
→ **No cleaning needed** - Proceed with normal repository migration

---

## Additional Resources

- [BFG Repo-Cleaner Documentation](https://rtyley.github.io/bfg-repo-cleaner/)
- [git-filter-repo Documentation](https://github.com/newren/git-filter-repo)
- [GitHub Guide: Removing Sensitive Data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [Atlassian Git History Rewriting](https://www.atlassian.com/git/tutorials/rewriting-history)

---

## Questions?

If you encounter issues during git history cleaning:

1. **Stop immediately** - Don't push anything
2. **Restore from backup** - Use the backup created at the start
3. **Review this guide** - Ensure you followed all steps correctly
4. **Seek help** - Create an issue in the private repository

**Remember**: It's better to start fresh (Method 1) than to risk leaking sensitive data.
