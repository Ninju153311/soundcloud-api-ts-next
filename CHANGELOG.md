# Changelog

All notable changes to this project will be documented in this file.

## [1.7.4] - 2026-02-10

### Fixed
- Fix all ESLint errors (0 errors, 59 warnings remaining — all `no-explicit-any` in tests)
- Replace `@ts-ignore` with `@ts-expect-error` + descriptions
- Remove unused imports (`SoundCloudClient`, `useState`, `act`, `useSoundCloudContext`, `setupAuth`)
- Prefix unused state vars with underscore (`_refreshToken`, `_expiresAt`)

## [1.7.3] - 2026-02-10

### Fixed
- Added `llms.txt`, `llms-full.txt`, and `AGENTS.md` to npm `files` field — these were missing from published packages
- Updated CHANGELOG with v1.7.1 and v1.7.2 entries

## [1.7.2] - 2026-02-10

### Fixed
- Added `typesVersions` to `package.json` for compatibility with `moduleResolution: "node"` — fixes `Cannot find module 'soundcloud-api-ts-next/server'` in older TypeScript/Next.js projects

## [1.7.1] - 2026-02-10

### Changed
- Documentation updates for v1.7.0 features shipped to npm
- CHANGELOG, README, llms.txt, llms-full.txt all updated with getToken, /resolve, useResolve details
- Regenerated TypeDoc API docs

## [1.7.0] - 2026-02-10

### Added
- **Custom token provider** (`getToken`) on `SoundCloudRoutesConfig` — pass an async function that returns a token instead of using client credentials. Enables apps that store OAuth tokens in Redis, databases, or other external stores.
- **`/resolve` server route** — resolve SoundCloud URLs (e.g. `https://soundcloud.com/artist/track`) to API resources via `GET /resolve?url=`
- **`resolveUrl` method** on the object returned by `createSoundCloudRoutes()` for direct server-side URL resolution
- **`useResolve` hook** — client-side SoundCloud URL resolution

## [1.6.0] - 2026-02-10

### Added
- 100% test coverage across all metrics (statements, branches, functions, lines)
- Coverage badge in README
- 273 tests (up from 244)

### Fixed
- AbortError handling coverage for all hooks
- Infinite pagination edge case coverage (unmount during fetch, loadMore with no next_href)
- Provider cancelled-state coverage for auth fetch
- Server routes edge case coverage (PKCE cleanup, pagesHandler error paths)

## [1.5.0] - 2026-02-10

### Added
- Test suite with vitest + React Testing Library
- CI pipeline (lint, build, test on push/PR)
- ESLint configuration with TypeScript + React Hooks rules
- CHANGELOG.md, CONTRIBUTING.md, SECURITY.md
- Examples directory with minimal Next.js app

## [1.4.1] - 2026-02-10

### Added
- `llms.txt` and `llms-full.txt` for LLM/agent discoverability
- TypeDoc documentation site deployed to GitHub Pages
- API docs link in README

## [1.4.0] - 2026-02-10

### Added
- Comprehensive JSDoc on all 35+ exported functions, hooks, types, and interfaces
- Every export includes description, @param, @returns, @example, and @see tags

## [1.3.0] - 2026-02-10

### Added
- Full OAuth 2.1 authentication with PKCE
- `useSCAuth()` hook with login/logout/handleCallback
- Authenticated hooks: `useMe`, `useMeTracks`, `useMeLikes`, `useMePlaylists`, `useMeFollowings`, `useMeFollowers`
- Action hooks: `useLike`, `useFollow`, `useRepost`
- Server auth routes: /auth/login, /auth/callback, /auth/refresh, /auth/logout
- Server me routes: /me, /me/tracks, /me/likes, /me/playlists, /me/followings, /me/followers
- Server action routes: POST/DELETE for like, follow, repost on tracks/playlists/users

## [1.2.0] - 2026-02-10

### Added
- 10 infinite scroll hooks with cursor-based pagination
- Generic `useInfinite<T>` base hook with `loadMore()` and `reset()`
- `/next?url=` server route for cursor forwarding
- `InfiniteResult<T>` type

## [1.1.0] - 2026-02-10

### Added
- Full API coverage: 12 new hooks for users, tracks, playlists
- 11 new server routes
- `useUserSearch`, `usePlaylistSearch`, `usePlaylist`, `usePlaylistTracks`
- `useUserTracks`, `useUserPlaylists`, `useUserLikes`, `useUserFollowers`, `useUserFollowings`
- `useTrackComments`, `useTrackLikes`, `useRelatedTracks`

## [1.0.0] - 2026-02-10

### Added
- Initial release
- Core hooks: `useTrack`, `useTrackSearch`, `useUser`, `usePlayer`
- `SoundCloudProvider` component
- Server route handlers with `createSoundCloudRoutes()`
- Support for Next.js App Router and Pages Router
- Dual CJS/ESM build via tsup
