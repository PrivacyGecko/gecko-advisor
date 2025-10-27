# Contributing to Gecko Advisor

Thank you for your interest in contributing to Gecko Advisor!

## Commit Message Guidelines

### ❌ DO NOT Include AI Attribution

**Never** include AI tool references in commit messages:
- No "Generated with Claude Code"
- No "Co-Authored-By: Claude"
- No robot emojis (🤖) with AI references

### ✅ DO Write Clean Commit Messages

Follow conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Example:**
```
fix(e2e): Correct test suite grep patterns to match actual test names

The E2E tests were failing because the --grep patterns in the workflow
didn't match the actual test.describe() names in the test files.

Fixed mappings:
- "core-scanning-journey" → "Core Privacy Scanning Journey"
- "performance-validation" → "Performance Validation"
```

## Pre-commit Hook

A git hook is installed that will **automatically reject** commits containing Claude references. If you see an error when committing, remove the AI attribution lines from your commit message.

## Questions?

Open an issue or discussion on GitHub!
