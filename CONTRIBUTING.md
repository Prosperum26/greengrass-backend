# Contributing Guide

Thanks for contributing to Greengrass Backend.

## Development Workflow

1. Fork or create a feature branch from `main`.
2. Keep changes scoped to one concern per PR.
3. Add/update tests for behavior changes.
4. Run checks locally before pushing.

## Local Validation Checklist

Run these commands before opening a PR:

```bash
yarn test
yarn test:e2e
yarn build
```

Optional:

```bash
yarn lint:check
```

## Branch and Commit Recommendations

- Branch naming:
  - `feat/<feature-name>`
  - `fix/<issue-name>`
  - `chore/<task-name>`
- Prefer small, focused commits with clear messages.

## Coding Standards

- Use TypeScript strict typing where possible.
- Keep controller logic thin, business logic in services.
- Validate external inputs via DTO + class-validator.
- Reuse common guards/decorators/utils from `src/common`.
- Avoid introducing duplicate infrastructure abstractions.

## Testing Expectations

- Unit tests for service/controller behavior.
- E2E tests for critical API paths.
- Add regression tests when fixing bugs.

## Pull Request Checklist

- [ ] Scope is clear and documented
- [ ] Tests added/updated
- [ ] `yarn test` passes
- [ ] `yarn test:e2e` passes
- [ ] `yarn build` passes
- [ ] README/docs updated when API or setup changes

## Security Notes

- Never commit secrets.
- Use `.env.example` as a template only.
- Prefer secure defaults and explicit authorization checks.
