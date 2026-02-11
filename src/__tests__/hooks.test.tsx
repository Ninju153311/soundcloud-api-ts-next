import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { SoundCloudProvider } from '../client/provider.js';
import { useTrack } from '../client/hooks/useTrack.js';
import { useTrackSearch } from '../client/hooks/useTrackSearch.js';
import { useUser } from '../client/hooks/useUser.js';
import { usePlaylist } from '../client/hooks/usePlaylist.js';
import { usePlayer } from '../client/hooks/usePlayer.js';
import { useInfiniteTrackSearch } from '../client/hooks/useInfiniteTrackSearch.js';
import { useSCAuth } from '../client/hooks/useSCAuth.js';
import type { ReactNode } from 'react';

function Wrapper({ children }: { children: ReactNode }) {
  return <SoundCloudProvider apiPrefix="">{children}</SoundCloudProvider>;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetchJson(data: unknown) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => data,
  });
}

describe('useTrack', () => {
  function TrackComp({ id }: { id: number }) {
    const { data, loading, error } = useTrack(id);
    if (loading) return <span>loading</span>;
    if (error) return <span>error</span>;
    return <span>{data?.title}</span>;
  }

  it('renders loading then data', async () => {
    mockFetchJson({ id: 1, title: 'Test Track' });
    render(<TrackComp id={1} />, { wrapper: Wrapper });
    expect(screen.getByText('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Test Track')).toBeInTheDocument());
  });
});

describe('useTrackSearch', () => {
  function SearchComp({ q }: { q: string }) {
    const { data, loading } = useTrackSearch(q);
    if (loading) return <span>loading</span>;
    return <span>{data?.length ?? 0} results</span>;
  }

  it('returns results', async () => {
    mockFetchJson([{ id: 1, title: 'A' }, { id: 2, title: 'B' }]);
    render(<SearchComp q="test" />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByText('2 results')).toBeInTheDocument());
  });
});

describe('useUser', () => {
  function UserComp({ id }: { id: number }) {
    const { data, loading } = useUser(id);
    if (loading) return <span>loading</span>;
    return <span>{data?.username}</span>;
  }

  it('fetches user by ID', async () => {
    mockFetchJson({ id: 42, username: 'testuser' });
    render(<UserComp id={42} />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByText('testuser')).toBeInTheDocument());
  });
});

describe('usePlaylist', () => {
  function PlaylistComp({ id }: { id: number }) {
    const { data, loading } = usePlaylist(id);
    if (loading) return <span>loading</span>;
    return <span>{data?.title}</span>;
  }

  it('fetches playlist by ID', async () => {
    mockFetchJson({ id: 10, title: 'My Playlist' });
    render(<PlaylistComp id={10} />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByText('My Playlist')).toBeInTheDocument());
  });
});

describe('usePlayer', () => {
  function PlayerComp({ id }: { id: number }) {
    const { playing, toggle } = usePlayer(id);
    return (
      <div>
        <span data-testid="state">{playing ? 'playing' : 'paused'}</span>
        <button onClick={toggle}>toggle</button>
      </div>
    );
  }

  it('starts paused', async () => {
    mockFetchJson({ url: 'https://example.com/stream.mp3' });
    render(<PlayerComp id={1} />, { wrapper: Wrapper });
    expect(screen.getByTestId('state').textContent).toBe('paused');
  });
});

describe('useInfiniteTrackSearch', () => {
  function InfiniteComp({ q }: { q: string }) {
    const { data, hasMore, loading, loadMore } = useInfiniteTrackSearch(q);
    if (loading && data.length === 0) return <span>loading</span>;
    return (
      <div>
        <span data-testid="count">{data.length}</span>
        <span data-testid="hasMore">{String(hasMore)}</span>
        <button onClick={loadMore}>more</button>
      </div>
    );
  }

  it('loads initial data with hasMore', async () => {
    mockFetchJson({ collection: [{ id: 1 }, { id: 2 }], next_href: 'http://next' });
    render(<InfiniteComp q="test" />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
    expect(screen.getByTestId('hasMore').textContent).toBe('true');
  });
});

describe('useSCAuth', () => {
  function AuthComp() {
    const { isAuthenticated, login } = useSCAuth();
    return (
      <div>
        <span data-testid="auth">{String(isAuthenticated)}</span>
        <button onClick={login}>login</button>
      </div>
    );
  }

  it('starts unauthenticated', () => {
    render(<AuthComp />, { wrapper: Wrapper });
    expect(screen.getByTestId('auth').textContent).toBe('false');
  });

  it('login calls fetch for auth URL', async () => {
    mockFetchJson({ url: 'https://soundcloud.com/connect' });
    render(<AuthComp />, { wrapper: Wrapper });
    await act(async () => {
      screen.getByText('login').click();
    });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/auth/login'));
  });
});
