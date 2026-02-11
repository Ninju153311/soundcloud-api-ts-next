/**
 * Client-side entry point for `soundcloud-api-ts-next`.
 *
 * Re-exports the {@link SoundCloudProvider}, all React hooks for fetching
 * SoundCloud data, authentication, and mutation actions (like, follow, repost).
 *
 * @example
 * ```tsx
 * import { SoundCloudProvider, useTrack, useTrackSearch } from "soundcloud-api-ts-next";
 * ```
 *
 * @module
 */

export { SoundCloudProvider, useSoundCloudContext } from "./provider.js";
export type { SoundCloudProviderProps, SoundCloudContextValue } from "./provider.js";
export { useTrackSearch } from "./hooks/useTrackSearch.js";
export type { UseTrackSearchOptions } from "./hooks/useTrackSearch.js";
export { useTrack } from "./hooks/useTrack.js";
export { useUser } from "./hooks/useUser.js";
export { usePlayer } from "./hooks/usePlayer.js";
export { useUserTracks } from "./hooks/useUserTracks.js";
export { useUserPlaylists } from "./hooks/useUserPlaylists.js";
export { useUserLikes } from "./hooks/useUserLikes.js";
export { useUserFollowers } from "./hooks/useUserFollowers.js";
export { useUserFollowings } from "./hooks/useUserFollowings.js";
export { useTrackComments } from "./hooks/useTrackComments.js";
export { useTrackLikes } from "./hooks/useTrackLikes.js";
export { useRelatedTracks } from "./hooks/useRelatedTracks.js";
export { usePlaylist } from "./hooks/usePlaylist.js";
export { usePlaylistTracks } from "./hooks/usePlaylistTracks.js";
export { usePlaylistSearch } from "./hooks/usePlaylistSearch.js";
export { useUserSearch } from "./hooks/useUserSearch.js";
export { useResolve } from "./hooks/useResolve.js";

// Infinite/paginated hooks
export { useInfiniteTrackSearch } from "./hooks/useInfiniteTrackSearch.js";
export { useInfiniteUserSearch } from "./hooks/useInfiniteUserSearch.js";
export { useInfinitePlaylistSearch } from "./hooks/useInfinitePlaylistSearch.js";
export { useInfiniteUserTracks } from "./hooks/useInfiniteUserTracks.js";
export { useInfiniteUserPlaylists } from "./hooks/useInfiniteUserPlaylists.js";
export { useInfiniteUserLikes } from "./hooks/useInfiniteUserLikes.js";
export { useInfiniteUserFollowers } from "./hooks/useInfiniteUserFollowers.js";
export { useInfiniteUserFollowings } from "./hooks/useInfiniteUserFollowings.js";
export { useInfiniteTrackComments } from "./hooks/useInfiniteTrackComments.js";
export { useInfinitePlaylistTracks } from "./hooks/useInfinitePlaylistTracks.js";

// Auth hooks
export { useSCAuth } from "./hooks/useSCAuth.js";
export { useMe } from "./hooks/useMe.js";
export { useMeTracks } from "./hooks/useMeTracks.js";
export { useMeLikes } from "./hooks/useMeLikes.js";
export { useMePlaylists } from "./hooks/useMePlaylists.js";
export { useMeFollowings } from "./hooks/useMeFollowings.js";
export { useMeFollowers } from "./hooks/useMeFollowers.js";

// Action hooks
export { useFollow } from "./hooks/useFollow.js";
export { useLike } from "./hooks/useLike.js";
export { useRepost } from "./hooks/useRepost.js";
