---
alwaysApply: true
---

# Core Development Principles

## Keep It Simple

- Reject over-engineering: don't add complexity for "future needs"
- Single responsibility: each function/component does one thing
- Delete dead code: clean up unused code, comments, and dependencies

## Type Safety First

- Avoid `any` type: use specific types
- Avoid type assertions
- Leverage type inference: let TypeScript infer types

## Fail Fast

- Validate parameters at function start
- Don't silently swallow errors
- Error messages must explain cause and solution

## Complete Implementation Required

- No placeholder implementations (TODO, FIXME, XXX)
- No mock data as final implementation
- No deferred implementation ("to be done later")
- Every feature must be fully implemented and usable

## Reuse First

- Search for existing implementations before coding
- Extend existing utilities rather than creating new ones
- Share type definitions: avoid duplicate types

---

Source: Migrated from development-specifications (2026-01-13)
