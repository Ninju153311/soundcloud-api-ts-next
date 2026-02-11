# Contributing to soundcloud-api-ts-next

Thanks for your interest in contributing!

## Development Setup

```bash
git clone https://github.com/twin-paws/soundcloud-api-ts-next.git
cd soundcloud-api-ts-next
pnpm install
pnpm build
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build with tsup (CJS + ESM) |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm lint` | Lint with ESLint |
| `pnpm docs` | Generate TypeDoc docs |

## Adding a New Hook

1. Create the hook file in `src/client/hooks/`
2. Follow the existing pattern (useState/useEffect, AbortController, fetch from apiPrefix)
3. Add JSDoc with description, @param, @returns, @example
4. Export from `src/client/index.ts`
5. Add corresponding server route in `src/server/routes.ts` if needed
6. Add tests in `src/__tests__/`
7. Update README.md

## Pull Requests

- Branch from `main`
- Include tests for new features
- Run `pnpm lint && pnpm build && pnpm test` before submitting
- Keep PRs focused on a single change

## Code Style

- TypeScript strict mode
- React hooks must follow the Rules of Hooks
- Use `"use client"` directive on all client components/hooks
- JSDoc on all exports
