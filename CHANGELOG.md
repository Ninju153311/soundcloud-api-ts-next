# Changelog

All notable changes to this project will be documented in this file.

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
