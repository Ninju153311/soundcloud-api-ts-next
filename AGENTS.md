# AGENTS.md — soundcloud-api-ts-next

Instructions for AI coding agents working with this package.

## Overview

React hooks and Next.js API route handlers for the SoundCloud API. Client secrets stay on the server. Built on `soundcloud-api-ts`.

## Setup

```bash
npm install soundcloud-api-ts-next
```

Requires: React 18+/19+, Next.js 13+/14+/15+

### 1. Create API Routes (App Router)

```ts
// app/api/soundcloud/[...soundcloud]/route.ts
import { createSoundCloudRoutes } from "soundcloud-api-ts-next/server";

const routes = createSoundCloudRoutes({
  clientId: process.env.SOUNDCLOUD_CLIENT_ID!,
  clientSecret: process.env.SOUNDCLOUD_CLIENT_SECRET!,
  redirectUri: process.env.SOUNDCLOUD_REDIRECT_URI,
});

export const { GET, POST, DELETE } = routes.handler();
```

### 2. Wrap App with Provider

```tsx
import { SoundCloudProvider } from "soundcloud-api-ts-next";

export default function Layout({ children }) {
  return <SoundCloudProvider apiPrefix="/api/soundcloud">{children}</SoundCloudProvider>;
}
```

### 3. Use Hooks

```tsx
import { useTrack, useTrackSearch, usePlayer } from "soundcloud-api-ts-next";

const { data: track } = useTrack(123456);
const { data: results } = useTrackSearch("lofi");
const player = usePlayer(trackId);
```

## Key Concepts

1. **All SoundCloud API calls go through your Next.js API routes** — client secrets never reach the browser
2. **Hooks return `{ data, loading, error }`** — standard pattern for all data hooks
3. **Infinite hooks return `{ data, loading, error, hasMore, loadMore, reset }`** — for scroll pagination
4. **Action hooks return mutation functions** — `useLike().likeTrack(id)`, `useFollow().follow(id)`
5. **Auth is managed via `useSCAuth()`** — handles OAuth redirect flow with PKCE

## Project Structure

```
src/
  index.ts           — Client-side exports (hooks, provider, types)
  server.ts          — Server-side exports (createSoundCloudRoutes)
  client/            — React hooks and provider implementation
  server/            — API route handler implementation
  types.ts           — Shared type definitions
```

## Build

```bash
pnpm build       # tsup → dist/ (ESM + CJS + .d.ts)
pnpm typecheck   # tsc --noEmit
pnpm docs        # TypeDoc → API docs site
```

## Publishing

Uses **Trusted Publishing** via GitHub Releases (same as soundcloud-api-ts).

## Gotchas

1. **Two entry points** — `soundcloud-api-ts-next` (client hooks) and `soundcloud-api-ts-next/server` (route handlers). Don't import server code in client components.
2. **Provider required** — all hooks need `<SoundCloudProvider>` in the component tree.
3. **API prefix must match** — the `apiPrefix` in the provider must match your route file path.
4. **Auth hooks need redirectUri** — set `redirectUri` in `createSoundCloudRoutes` config for OAuth flow.

## Related Packages

- [soundcloud-api-ts](https://github.com/twin-paws/soundcloud-api-ts) — The underlying API client (dependency)

## Full Documentation

https://twin-paws.github.io/soundcloud-api-ts-next/
