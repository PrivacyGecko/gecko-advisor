# Claude Code Instructions for Gecko Advisor

This file contains instructions for AI assistants working on this project.

---

## 🚨 CRITICAL: Git Commit Policy

**NEVER include AI tool attribution in git commits!**

### ❌ FORBIDDEN in Commit Messages:
- `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
- `Co-Authored-By: Claude <noreply@anthropic.com>`
- Any mention of "Claude", "Anthropic", or AI code generation tools
- Robot emojis (🤖) with AI references

### ✅ CORRECT Commit Format:
```
<type>(<scope>): <subject>

<body describing the changes>

<optional footer>
```

**Example:**
```
fix(e2e): Correct test suite grep patterns to match actual test names

The E2E tests were failing because the --grep patterns didn't match
the actual test.describe() names in the test files.
```

### Enforcement:
- **Local:** `.git/hooks/commit-msg` hook blocks commits with AI references
- **CI:** `.github/workflows/commit-lint.yml` checks all PR commits
- **Docs:** `.github/CONTRIBUTING.md` explains this policy to contributors

---

## 📋 Project Context

### Project Information
- **Name:** Gecko Advisor (formerly Privacy Advisor)
- **Purpose:** Open-source privacy scanner for websites
- **License:** MIT
- **Tech Stack:** TypeScript, React, Express, Playwright, PostgreSQL, Redis

### Key Components
- **Frontend:** React + TanStack Router + Tailwind CSS (port 5173)
- **Backend:** Express + Prisma (port 5000)
- **Worker:** BullMQ background jobs
- **E2E Tests:** Playwright with Nginx reverse proxy (port 8080)

### Important Files
- `apps/frontend/` - React frontend application
- `apps/backend/` - Express backend API
- `apps/worker/` - Background job processor
- `packages/shared/` - Shared types and utilities
- `tests/e2e/` - End-to-end tests with Playwright

---

## 🧪 Testing Guidelines

### E2E Test Structure
- Tests use **human-readable names** in `test.describe()` blocks
- Example: `test.describe('Core Privacy Scanning Journey', () => {})`
- NOT kebab-case like `core-scanning-journey`

### Running Tests Locally
```bash
# Install dependencies
pnpm install

# Run E2E tests
cd tests/e2e
pnpm exec playwright test

# Run specific test suite
pnpm exec playwright test --grep "Core Privacy Scanning Journey"
```

---

## 🔧 Development Workflow

### Branch Strategy
- `main` - Production-ready code
- `stage` - Staging environment
- Feature branches for development

### Before Committing
1. Run linter: `pnpm lint`
2. Run type check: `pnpm typecheck`
3. Run tests: `pnpm test`
4. Ensure **no AI attribution** in commit message

### Code Style
- Use TypeScript strict mode
- Follow Prettier formatting (automatic on save)
- Add SPDX license headers to new files: `// SPDX-License-Identifier: MIT`

---

## 📝 Communication Style

When working with the maintainer:
- Be concise and technical
- Provide clear explanations of issues and solutions
- Update todo lists for complex multi-step tasks
- Ask clarifying questions when requirements are ambiguous
- **Never** add emojis to code or commits unless explicitly requested

---

## 🎯 Current Priorities

1. **E2E Tests:** Fix all test failures, ensure 100% passing
2. **CI/CD:** Resolve linting and typecheck errors
3. **Stage Deployment:** Prepare for stage.geckoadvisor.com deployment
4. **Code Quality:** Maintain high standards, proper error handling

---

## 📚 Additional Resources

- **Contributing Guide:** `.github/CONTRIBUTING.md`
- **E2E Test Docs:** `tests/e2e/README.md`
- **Project Plan:** `plan.md`

---

*Last Updated: 2025-10-27*
