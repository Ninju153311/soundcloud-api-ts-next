"use client";

import { useAuthFetch } from "./useAuthFetch.js";
import type { SoundCloudUser, HookResult } from "../../types.js";

/** Fetch the current authenticated user's profile. */
export function useMe(): HookResult<SoundCloudUser> {
  return useAuthFetch<SoundCloudUser>("/me");
}
