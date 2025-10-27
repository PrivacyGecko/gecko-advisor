# Contributing to Gecko Advisor

Thank you for your interest in contributing to Gecko Advisor! We're excited to have you join our community of privacy advocates, developers, and open source enthusiasts.

This guide will help you get started with contributing to the project, whether you're fixing a bug, adding a feature, improving documentation, or sharing ideas.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Commit Message Format](#commit-message-format)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Getting Help](#getting-help)

---

## Code of Conduct

This project adheres to the Contributor Covenant Code of Conduct. By participating, you are expected to uphold this code. Please read [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) before contributing.

**In short**: Be respectful, inclusive, and constructive. We're all here to make web privacy better for everyone.

---

## How Can I Contribute?

### Reporting Bugs

Found a bug? Help us fix it!

1. **Check existing issues** to see if it's already reported
2. **Create a new issue** with:
   - Clear, descriptive title
   - Steps to reproduce the bug
   - Expected vs. actual behavior
   - Environment details (OS, Node.js version, browser)
   - Screenshots or logs (if applicable)

**Use the "bug" label** when creating the issue.

### Suggesting Features

Have an idea for a new feature?

1. **Check existing issues** to avoid duplicates
2. **Create a new issue** with:
   - Clear description of the feature
   - Use case: why is this feature valuable?
   - Proposed implementation (if you have ideas)
   - Mockups or examples (if applicable)

**Use the "enhancement" label** when creating the issue.

### Improving Documentation

Documentation improvements are always welcome!

- Fix typos, unclear explanations, or outdated information
- Add examples, tutorials, or guides
- Improve code comments and inline documentation
- Translate documentation (when we support i18n)

**Documentation lives in**:
- `/README.md` - Main project documentation
- `/assets/docs/` - Technical documentation and guides
- Inline code comments and JSDoc

### Contributing Code

Ready to write code? Great!

1. **Find an issue** to work on (or create one)
2. **Comment on the issue** to let others know you're working on it
3. **Fork and create a branch** (see Development Workflow below)
4. **Write code** following our code standards
5. **Test thoroughly** before submitting
6. **Submit a pull request** (see Pull Request Process below)

**Good first issues** are labeled with `good first issue`. These are great starting points for new contributors.

---

## Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **pnpm** 10.14.0 (pinned version)
- **Docker** and **Docker Compose** (for local development)
- **Git** for version control
- Code editor (we recommend VS Code with TypeScript extensions)

### Initial Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/gecko-advisor.git
   cd gecko-advisor
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/PrivacyGecko/gecko-advisor.git
   ```

4. **Install dependencies**:
   ```bash
   pnpm install
   ```

5. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

6. **Start development environment**:
   ```bash
   make dev
   # Or: pnpm dev (if running without Docker)
   ```

7. **Verify everything works**:
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:5000/api/health
   - Try running a scan

---

## Development Workflow

### Creating a Feature Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes:
git checkout -b fix/bug-description
```

**Branch naming conventions**:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or fixes
- `chore/` - Maintenance tasks

### Making Changes

1. **Make your changes** in the appropriate package:
   - Frontend: `apps/frontend/`
   - Backend: `apps/backend/`
   - Worker: `apps/worker/`
   - Shared: `packages/shared/`

2. **Test locally**:
   ```bash
   pnpm typecheck  # Type checking
   pnpm lint       # Linting
   pnpm test       # Run tests
   ```

3. **Keep commits focused**: Each commit should represent a single logical change

### Staying in Sync

```bash
# Regularly sync with upstream
git fetch upstream
git rebase upstream/main

# Resolve any conflicts and continue
```

---

## Code Standards

### TypeScript

- **Strict mode enabled**: All code must pass strict type checking
- **No `any` types**: Use proper types or `unknown` with type guards
- **Consistent imports**: Use `import type` for type-only imports
- **Path mapping**: Use `@privacy-advisor/shared` for shared package imports

### Code Style

- **Prettier**: All code is auto-formatted with Prettier
- **ESLint**: Follow ESLint rules (run `pnpm lint` to check)
- **Naming conventions**:
  - `camelCase` for variables and functions
  - `PascalCase` for types, interfaces, and components
  - `UPPER_SNAKE_CASE` for constants
  - Prefix unused variables with `_` (e.g., `_unusedParam`)

### Accessibility

- **WCAG AA compliance**: All UI components must meet WCAG AA standards
- **Semantic HTML**: Use proper HTML elements
- **Keyboard navigation**: All interactive elements must be keyboard accessible
- **Screen reader support**: Use ARIA labels where appropriate
- **Color contrast**: Maintain sufficient contrast ratios

### Security

- **Input validation**: Validate all user inputs with Zod schemas
- **No hardcoded secrets**: Use environment variables
- **XSS prevention**: Sanitize user-generated content
- **CSRF protection**: Follow existing patterns for API endpoints
- **Rate limiting**: Respect existing rate limits, don't bypass them

---

## Commit Message Format

We follow **Conventional Commits** for clear, structured commit history.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring (no functional change)
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build config)
- `perf`: Performance improvements
- `ci`: CI/CD changes

### Examples

```bash
# Simple feature
git commit -m "feat(worker): add support for custom user agents"

# Bug fix with scope
git commit -m "fix(backend): correct rate limit calculation for scan endpoint"

# Documentation
git commit -m "docs: update installation instructions for Windows"

# Breaking change
git commit -m "feat(api)!: change scan endpoint response format

BREAKING CHANGE: The /api/v2/scan endpoint now returns scanId and slug instead of id."
```

### Scope (optional but recommended)

- `frontend` - Frontend changes
- `backend` - Backend API changes
- `worker` - Worker/scanner changes
- `shared` - Shared package changes
- `prisma` - Database schema changes
- `docker` - Docker/deployment changes
- `deps` - Dependency updates

---

## Pull Request Process

### Before Submitting

1. **Ensure all checks pass**:
   ```bash
   pnpm typecheck  # Must pass with no errors
   pnpm lint       # Must pass with no warnings
   pnpm test       # All tests must pass
   ```

2. **Update documentation**:
   - Update README if you changed public APIs or features
   - Add/update code comments for complex logic

3. **Test thoroughly**:
   - Test your changes manually
   - Add unit tests for new functionality
   - Test edge cases and error handling

### Submitting a Pull Request

1. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a pull request** on GitHub with:
   - **Clear title**: Follow commit message format (e.g., "feat: add dark mode toggle")
   - **Description**: Explain what changed and why
   - **Related issues**: Reference issues with "Fixes #123" or "Relates to #456"
   - **Testing**: Describe how you tested the changes
   - **Screenshots**: Include before/after screenshots for UI changes

3. **PR template checklist**:
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] All tests pass (`pnpm test`)
   - [ ] Type checking passes (`pnpm typecheck`)
   - [ ] Linting passes (`pnpm lint`)
   - [ ] Manual testing completed

   ## Related Issues
   Fixes #123

   ## Screenshots (if applicable)
   Add screenshots here
   ```

### After Submitting

- **Respond to feedback**: Address review comments promptly
- **Keep it updated**: Rebase on main if conflicts arise
- **Be patient**: Reviews may take a few days
- **Stay engaged**: Participate in the discussion

### Review Process

1. **Automated checks** run on every PR (type checking, linting, tests)
2. **Code review** by maintainers (typically 1-2 reviewers)
3. **Approval required** before merging
4. **Squash and merge** is the default merge strategy

---

## Testing Requirements

### Unit Tests

- **Vitest** for backend and worker tests
- **Test files**: `*.test.ts` or `*.spec.ts`
- **Coverage**: Aim for 80%+ coverage on new code
- **Run tests**: `pnpm test`

### Integration Tests

- Test API endpoints with real database (test fixtures available)
- Test worker jobs with BullMQ test utilities
- Use `USE_FIXTURES=1` for deterministic testing with `.test` domains

### E2E Tests (Future)

- Planned: Playwright for end-to-end frontend tests
- Coming soon: Full user flow testing

### Manual Testing

Before submitting a PR, manually test:
1. **Happy path**: Does the feature work as expected?
2. **Error cases**: How does it handle invalid inputs?
3. **Edge cases**: Boundary conditions, empty states, etc.
4. **Regression**: Does it break existing functionality?
5. **Performance**: Does it impact load times or responsiveness?

---

## Getting Help

### Where to Ask Questions

- **GitHub Discussions**: For general questions and ideas
- **GitHub Issues**: For specific bugs or feature requests
- **Discord** (coming soon): For real-time chat with the community
- **Email**: hello@geckoadvisor.com for direct inquiries

### Resources

- **README.md**: Quick start and overview
- **assets/docs/**: Technical documentation and architecture guides
- **Code comments**: Inline documentation in the codebase

### Stuck on Something?

Don't hesitate to ask! We're here to help:
- Comment on the issue you're working on
- Open a draft pull request and ask for early feedback
- Reach out via email or discussions

**Remember**: There are no stupid questions. We all started somewhere, and we want to help you succeed.

---

## Recognition

Contributors are recognized in:
- GitHub contributor list
- Release notes (for significant contributions)
- Community highlights (with permission)

---

## Thank You!

Every contribution, no matter how small, makes Gecko Advisor better for everyone. We appreciate your time, effort, and commitment to web privacy.

**Happy coding, and welcome to the Gecko Advisor community!**
