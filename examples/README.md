# Examples — soundcloud-api-ts-next

Complete guide to building a Next.js app with `soundcloud-api-ts-next`.

## Project Structure

```
my-sc-app/
├── app/
│   ├── layout.tsx          # Provider wrapper
│   ├── page.tsx            # Search page
│   ├── track/[id]/page.tsx # Track detail + player
│   ├── callback/page.tsx   # OAuth callback
│   └── api/soundcloud/[...route]/route.ts  # API routes
├── package.json
└── .env.local
```

## 1. Install Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "soundcloud-api-ts-next": "^1.5.0"
  }
}
```

## 2. Environment Variables

```env
# .env.local
SOUNDCLOUD_CLIENT_ID=your_client_id
SOUNDCLOUD_CLIENT_SECRET=your_client_secret
SOUNDCLOUD_REDIRECT_URI=http://localhost:3000/api/soundcloud/auth/callback
```

## 3. API Route (App Router)

```ts
// app/api/soundcloud/[...route]/route.ts
import { createSoundCloudRoutes } from "soundcloud-api-ts-next/server";

const sc = createSoundCloudRoutes({
  clientId: process.env.SOUNDCLOUD_CLIENT_ID!,
  clientSecret: process.env.SOUNDCLOUD_CLIENT_SECRET!,
  redirectUri: process.env.SOUNDCLOUD_REDIRECT_URI,
});

export const GET = sc.GET;
export const POST = sc.POST;
export const DELETE = sc.DELETE;
```

## 4. Layout with Provider

```tsx
// app/layout.tsx
import { SoundCloudProvider } from "soundcloud-api-ts-next";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SoundCloudProvider apiPrefix="/api/soundcloud">
          {children}
        </SoundCloudProvider>
      </body>
    </html>
  );
}
```

## 5. Search Page with Infinite Scroll

```tsx
// app/page.tsx
"use client";
import { useState } from "react";
import { useInfiniteTrackSearch } from "soundcloud-api-ts-next";
import Link from "next/link";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const { data: tracks, loading, hasMore, loadMore } = useInfiniteTrackSearch(query);

  return (
    <div>
      <input
        placeholder="Search tracks..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul>
        {tracks.map((track) => (
          <li key={track.id}>
            <Link href={`/track/${track.id}`}>{track.title}</Link>
            <span> — {track.user?.username}</span>
          </li>
        ))}
      </ul>
      {loading && <p>Loading...</p>}
      {hasMore && !loading && <button onClick={loadMore}>Load More</button>}
    </div>
  );
}
```

## 6. Track Detail with Player

```tsx
// app/track/[id]/page.tsx
"use client";
import { useTrack, usePlayer } from "soundcloud-api-ts-next";
import { use } from "react";

export default function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: track, loading } = useTrack(id);
  const { playing, progress, duration, toggle, seek } = usePlayer(id);

  if (loading) return <p>Loading...</p>;
  if (!track) return <p>Track not found</p>;

  return (
    <div>
      <h1>{track.title}</h1>
      <p>By {track.user?.username}</p>
      <button onClick={toggle}>{playing ? "⏸ Pause" : "▶ Play"}</button>
      <input
        type="range"
        min={0}
        max={duration}
        value={progress}
        onChange={(e) => seek(Number(e.target.value))}
      />
      <span>{Math.round(progress)}s / {Math.round(duration)}s</span>
    </div>
  );
}
```

## 7. OAuth Login Flow

```tsx
// app/callback/page.tsx
"use client";
import { useSCAuth } from "soundcloud-api-ts-next";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CallbackPage() {
  const { handleCallback } = useSCAuth();
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    if (code && state) {
      handleCallback(code, state).then(() => router.push("/"));
    }
  }, [params, handleCallback, router]);

  return <p>Authenticating...</p>;
}
```

### Login Button

```tsx
"use client";
import { useSCAuth } from "soundcloud-api-ts-next";

export function LoginButton() {
  const { isAuthenticated, user, login, logout } = useSCAuth();

  if (isAuthenticated) {
    return (
      <div>
        <span>Welcome, {user?.username}!</span>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return <button onClick={login}>Login with SoundCloud</button>;
}
```
