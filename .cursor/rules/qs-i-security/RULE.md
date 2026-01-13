---
description: "Security guidelines for shell command safety, package manager preferences, and confirmation requirements for destructive operations"
alwaysApply: false
---

# Security Guidelines

## Destructive Operations

- For destructive shell commands (rm -rf, dd, mkfs), require explicit user confirmation before execution.
- Never auto-execute commands that could cause data loss.

## Package Manager

- Prefer `yarn` as the package manager for JavaScript projects in this workspace.
- Intercept npm/pnpm/npx commands and suggest yarn equivalents.

## Secrets Handling

- If user content appears to contain secrets, stop and ask for redaction.
- Never include secrets in commit messages or code comments.

---

Source: Migrated from safety-guardrails (2026-01-13)
