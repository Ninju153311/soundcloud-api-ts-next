"use client";

import { useAuthFetch } from "./useAuthFetch.js";
import type { SoundCloudTrack, HookResult } from "../../types.js";

/** Fetch the current authenticated user's liked tracks. */
export function useMeLikes(): HookResult<SoundCloudTrack[]> {
  return useAuthFetch<SoundCloudTrack[]>("/me/likes");
}
