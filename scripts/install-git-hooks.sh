#!/bin/bash
# SPDX-License-Identifier: MIT
# Install git hooks for Gecko Advisor development workflow enforcement

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

HOOKS_DIR=".git/hooks"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}     Installing Git Hooks for Gecko Advisor${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Check if .git directory exists
if [ ! -d "$HOOKS_DIR" ]; then
    echo -e "${RED}❌ ERROR: .git/hooks directory not found${NC}"
    echo "Are you in the project root directory?"
    exit 1
fi

echo "Project root: $PROJECT_ROOT"
echo "Hooks directory: $HOOKS_DIR"
echo ""

# Backup existing hooks if they exist
backup_hook() {
    local hook_name=$1
    if [ -f "$HOOKS_DIR/$hook_name" ] && [ ! -L "$HOOKS_DIR/$hook_name" ]; then
        echo -e "${YELLOW}⚠️  Backing up existing $hook_name hook${NC}"
        cp "$HOOKS_DIR/$hook_name" "$HOOKS_DIR/${hook_name}.backup.$(date +%Y%m%d-%H%M%S)"
    fi
}

# Backup existing hooks
backup_hook "pre-commit"
backup_hook "prepare-commit-msg"
backup_hook "post-checkout"

echo ""
echo -e "${GREEN}Creating hooks...${NC}"
echo ""

# ============================================================================
# PRE-COMMIT HOOK
# ============================================================================
echo "  📝 Creating pre-commit hook..."
cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash
# SPDX-License-Identifier: MIT
# Pre-commit hook for Gecko Advisor
# Runs lint, typecheck, and build checks before allowing commits

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}              Pre-Commit Checks${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Track if any checks fail
CHECKS_FAILED=0

# Function to print colored status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        CHECKS_FAILED=1
    fi
}

# Check 1: ESLint
echo -e "${YELLOW}[1/3] Running ESLint...${NC}"
if pnpm lint > /tmp/gecko-lint.log 2>&1; then
    print_status 0 "Lint passed"
else
    print_status 1 "Lint failed"
    echo ""
    echo -e "${YELLOW}Lint errors:${NC}"
    cat /tmp/gecko-lint.log
    echo ""
fi
echo ""

# Check 2: TypeScript type checking
echo -e "${YELLOW}[2/3] Running TypeScript type check...${NC}"
if pnpm typecheck > /tmp/gecko-typecheck.log 2>&1; then
    print_status 0 "Type check passed"
else
    print_status 1 "Type check failed"
    echo ""
    echo -e "${YELLOW}Type errors:${NC}"
    cat /tmp/gecko-typecheck.log
    echo ""
fi
echo ""

# Check 3: Build
echo -e "${YELLOW}[3/3] Running build...${NC}"
if pnpm build > /tmp/gecko-build.log 2>&1; then
    print_status 0 "Build passed"
else
    print_status 1 "Build failed"
    echo ""
    echo -e "${YELLOW}Build errors:${NC}"
    cat /tmp/gecko-build.log
    echo ""
fi
echo ""

# Optional: Warn about TODO/FIXME markers
TODO_FILES=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)
if [ -n "$TODO_FILES" ]; then
    TODO_COUNT=$(echo "$TODO_FILES" | xargs grep -i "TODO\|FIXME" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$TODO_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Found $TODO_COUNT TODO/FIXME markers in staged files${NC}"
        echo "   (This is a warning, not blocking commit)"
        echo ""
    fi
fi

# Final result
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
if [ $CHECKS_FAILED -eq 1 ]; then
    echo -e "${RED}❌ Pre-commit checks FAILED${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Fix the errors above and try again."
    echo ""
    echo -e "${YELLOW}To skip these checks (NOT RECOMMENDED):${NC}"
    echo "  git commit --no-verify"
    echo ""
    exit 1
else
    echo -e "${GREEN}✅ All pre-commit checks PASSED${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    exit 0
fi
EOF

chmod +x "$HOOKS_DIR/pre-commit"
echo -e "${GREEN}     ✅ pre-commit hook created${NC}"

# ============================================================================
# PREPARE-COMMIT-MSG HOOK
# ============================================================================
echo "  📝 Creating prepare-commit-msg hook..."
cat > "$HOOKS_DIR/prepare-commit-msg" << 'EOF'
#!/bin/bash
# SPDX-License-Identifier: MIT
# Prepare-commit-msg hook for Gecko Advisor
# Warns if committing directly to main or stage branches

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

# Colors
YELLOW='\033[1;33m'
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if on main or stage branch
if [ "$BRANCH" = "main" ]; then
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}⚠️  WARNING: You are committing directly to MAIN branch${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Best practice: Create a feature branch for your changes"
    echo ""
    echo "  To create a feature branch:"
    echo "    git checkout -b feature/your-feature-name"
    echo ""
    echo "  Or use the helper script:"
    echo "    .git/hooks/create-feature-branch.sh"
    echo ""
    echo -e "${YELLOW}Press Enter to continue with main commit, or Ctrl+C to cancel${NC}"
    read -r
    echo ""
elif [ "$BRANCH" = "stage" ]; then
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}⚠️  WARNING: You are committing directly to STAGE branch${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Confirm this is intentional for staging environment updates"
    echo ""
    echo -e "${YELLOW}Press Enter to continue, or Ctrl+C to cancel${NC}"
    read -r
    echo ""
else
    echo -e "${GREEN}✅ Working on feature branch: $BRANCH${NC}"
fi
EOF

chmod +x "$HOOKS_DIR/prepare-commit-msg"
echo -e "${GREEN}     ✅ prepare-commit-msg hook created${NC}"

# ============================================================================
# POST-CHECKOUT HOOK
# ============================================================================
echo "  📝 Creating post-checkout hook..."
cat > "$HOOKS_DIR/post-checkout" << 'EOF'
#!/bin/bash
# SPDX-License-Identifier: MIT
# Post-checkout hook for Gecko Advisor
# Reminds to create feature branch when checking out main

PREV_HEAD=$1
NEW_HEAD=$2
BRANCH_CHECKOUT_FLAG=$3

# Only run for branch checkouts (not file checkouts)
if [ "$BRANCH_CHECKOUT_FLAG" = "1" ]; then
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

    # Colors
    YELLOW='\033[1;33m'
    GREEN='\033[0;32m'
    BLUE='\033[0;34m'
    CYAN='\033[0;36m'
    NC='\033[0m'

    if [ "$CURRENT_BRANCH" = "main" ]; then
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${CYAN}💡 Reminder: Create a feature branch for your work${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
        echo ""
        echo "Suggested workflow:"
        echo ""
        echo "  For new feature:"
        echo -e "    ${GREEN}git checkout -b feature/your-feature-name${NC}"
        echo ""
        echo "  For bug fix:"
        echo -e "    ${GREEN}git checkout -b fix/bug-description${NC}"
        echo ""
        echo "  For enhancement:"
        echo -e "    ${GREEN}git checkout -b enhance/enhancement-name${NC}"
        echo ""
        echo "  For chore/maintenance:"
        echo -e "    ${GREEN}git checkout -b chore/task-description${NC}"
        echo ""
        echo "  Quick branch creation:"
        echo -e "    ${GREEN}.git/hooks/create-feature-branch.sh${NC}"
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
        echo ""
    fi
fi
EOF

chmod +x "$HOOKS_DIR/post-checkout"
echo -e "${GREEN}     ✅ post-checkout hook created${NC}"

# ============================================================================
# HELPER SCRIPT: CREATE FEATURE BRANCH
# ============================================================================
echo "  📝 Creating create-feature-branch.sh helper..."
cat > "$HOOKS_DIR/create-feature-branch.sh" << 'EOF'
#!/bin/bash
# SPDX-License-Identifier: MIT
# Helper script to create feature branches with proper naming conventions

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}         Gecko Advisor - Feature Branch Creator${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if on main
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${YELLOW}⚠️  You are currently on: $CURRENT_BRANCH${NC}"
    echo ""
    read -p "Switch to main first? (y/n): " SWITCH
    if [ "$SWITCH" = "y" ] || [ "$SWITCH" = "Y" ]; then
        git checkout main
        echo ""
        echo "Pulling latest changes from main..."
        git pull origin main
        echo ""
    fi
fi

echo "Select branch type:"
echo ""
echo "  1. feature  - New feature development"
echo "  2. fix      - Bug fix"
echo "  3. enhance  - Enhancement to existing feature"
echo "  4. refactor - Code refactoring"
echo "  5. test     - Test additions/updates"
echo "  6. docs     - Documentation updates"
echo "  7. chore    - Maintenance/tooling"
echo ""
read -p "Enter choice (1-7): " TYPE_CHOICE

case $TYPE_CHOICE in
    1) BRANCH_TYPE="feature" ;;
    2) BRANCH_TYPE="fix" ;;
    3) BRANCH_TYPE="enhance" ;;
    4) BRANCH_TYPE="refactor" ;;
    5) BRANCH_TYPE="test" ;;
    6) BRANCH_TYPE="docs" ;;
    7) BRANCH_TYPE="chore" ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
read -p "Enter branch name (e.g., 'add-user-authentication'): " BRANCH_NAME

# Sanitize branch name (lowercase, replace spaces with hyphens, remove special chars)
BRANCH_NAME=$(echo "$BRANCH_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g')

if [ -z "$BRANCH_NAME" ]; then
    echo -e "${RED}❌ Branch name cannot be empty${NC}"
    exit 1
fi

FULL_BRANCH_NAME="${BRANCH_TYPE}/${BRANCH_NAME}"

echo ""
echo -e "${GREEN}Creating branch: $FULL_BRANCH_NAME${NC}"
echo ""

git checkout -b "$FULL_BRANCH_NAME"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Branch created successfully!${NC}"
    echo ""
    echo "You can now start working on your changes."
    echo ""
    echo "When ready to push:"
    echo -e "  ${CYAN}git push -u origin $FULL_BRANCH_NAME${NC}"
    echo ""
    echo "Remember to:"
    echo "  • Write clear, descriptive commit messages"
    echo "  • Keep commits focused and atomic"
    echo "  • Run tests before committing"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Failed to create branch${NC}"
    exit 1
fi
EOF

chmod +x "$HOOKS_DIR/create-feature-branch.sh"
echo -e "${GREEN}     ✅ create-feature-branch.sh helper created${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Git hooks installed successfully!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Installed hooks:"
echo ""
echo "  📋 pre-commit"
echo "     • Runs ESLint (pnpm lint)"
echo "     • Runs TypeScript type check (pnpm typecheck)"
echo "     • Runs build (pnpm build)"
echo "     • Blocks commit if any check fails"
echo ""
echo "  🔀 prepare-commit-msg"
echo "     • Warns when committing directly to main"
echo "     • Warns when committing to stage"
echo "     • Confirms feature branch usage"
echo ""
echo "  🔄 post-checkout"
echo "     • Reminds to create feature branch after checking out main"
echo "     • Provides branch naming examples"
echo ""
echo "  🛠️  Helper script: .git/hooks/create-feature-branch.sh"
echo "     • Interactive branch creation with naming conventions"
echo "     • Automatically switches to main and pulls latest"
echo ""
echo -e "${YELLOW}Note: Existing hooks preserved${NC}"
echo "  • commit-msg (blocks Claude references in messages)"
echo "  • pre-push (blocks pushing commits with Claude references)"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Quick Start:${NC}"
echo ""
echo "  Create a feature branch:"
echo "    .git/hooks/create-feature-branch.sh"
echo ""
echo "  Or manually:"
echo "    git checkout -b feature/my-new-feature"
echo ""
echo "  Make changes and commit (hooks will run automatically):"
echo "    git add ."
echo "    git commit -m 'feat: add new feature'"
echo ""
echo "  Skip pre-commit checks (NOT RECOMMENDED):"
echo "    git commit --no-verify"
echo ""
echo -e "${GREEN}Happy coding! 🦎${NC}"
echo ""
