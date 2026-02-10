"use client";

import { useAuthFetch } from "./useAuthFetch.js";
import type { SoundCloudTrack, HookResult } from "../../types.js";

/** Fetch the current authenticated user's tracks. */
export function useMeTracks(): HookResult<SoundCloudTrack[]> {
  return useAuthFetch<SoundCloudTrack[]>("/me/tracks");
}
