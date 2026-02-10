"use client";

import { useAuthFetch } from "./useAuthFetch.js";
import type { SoundCloudPlaylist, HookResult } from "../../types.js";

/** Fetch the current authenticated user's playlists. */
export function useMePlaylists(): HookResult<SoundCloudPlaylist[]> {
  return useAuthFetch<SoundCloudPlaylist[]>("/me/playlists");
}
