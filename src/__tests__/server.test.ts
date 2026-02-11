import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock soundcloud-api-ts before importing routes
vi.mock('soundcloud-api-ts', () => ({
  getClientToken: vi.fn().mockResolvedValue({ access_token: 'tok', expires_in: 3600 }),
  searchTracks: vi.fn().mockResolvedValue({ collection: [{ id: 1 }], next_href: null }),
  getTrack: vi.fn().mockResolvedValue({ id: 1, title: 'Track' }),
  getUser: vi.fn().mockResolvedValue({ id: 2, username: 'user' }),
  getUserTracks: vi.fn().mockResolvedValue({ collection: [] }),
  getTrackStreams: vi.fn().mockResolvedValue({ http_mp3_128_url: 'url' }),
  getFollowers: vi.fn().mockResolvedValue({ collection: [] }),
  getFollowings: vi.fn().mockResolvedValue({ collection: [] }),
  getUserPlaylists: vi.fn().mockResolvedValue({ collection: [] }),
  getUserLikesTracks: vi.fn().mockResolvedValue({ collection: [] }),
  getTrackComments: vi.fn().mockResolvedValue({ collection: [] }),
  getTrackLikes: vi.fn().mockResolvedValue({ collection: [] }),
  getRelatedTracks: vi.fn().mockResolvedValue({ collection: [] }),
  getPlaylist: vi.fn().mockResolvedValue({ id: 3, title: 'Playlist' }),
  getPlaylistTracks: vi.fn().mockResolvedValue({ collection: [] }),
  searchUsers: vi.fn().mockResolvedValue({ collection: [] }),
  searchPlaylists: vi.fn().mockResolvedValue({ collection: [] }),
  scFetchUrl: vi.fn().mockResolvedValue({ collection: [] }),
  getAuthorizationUrl: vi.fn().mockReturnValue('https://soundcloud.com/connect?test'),
  generateCodeVerifier: vi.fn().mockReturnValue('verifier123'),
  generateCodeChallenge: vi.fn().mockResolvedValue('challenge123'),
  getUserToken: vi.fn().mockResolvedValue({ access_token: 'user_tok', refresh_token: 'ref', expires_in: 3600 }),
  refreshUserToken: vi.fn().mockResolvedValue({ access_token: 'new_tok' }),
  signOut: vi.fn().mockResolvedValue(undefined),
  SoundCloudClient: vi.fn(),
  getMe: vi.fn().mockResolvedValue({ id: 1 }),
  getMeTracks: vi.fn().mockResolvedValue({ collection: [] }),
  getMeLikesTracks: vi.fn().mockResolvedValue({ collection: [] }),
  getMePlaylists: vi.fn().mockResolvedValue({ collection: [] }),
  getMeFollowings: vi.fn().mockResolvedValue({ collection: [] }),
  getMeFollowers: vi.fn().mockResolvedValue({ collection: [] }),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  likeTrack: vi.fn(),
  unlikeTrack: vi.fn(),
  likePlaylist: vi.fn(),
  unlikePlaylist: vi.fn(),
  repostTrack: vi.fn(),
  unrepostTrack: vi.fn(),
  repostPlaylist: vi.fn(),
  unrepostPlaylist: vi.fn(),
}));

import { createSoundCloudRoutes } from '../server/routes.js';

describe('createSoundCloudRoutes', () => {
  let handle: (request: Request) => Promise<Response>;

  beforeEach(() => {
    const routes = createSoundCloudRoutes({
      clientId: 'test_id',
      clientSecret: 'test_secret',
      redirectUri: 'http://localhost:3000/callback',
    });
    handle = routes.handler();
  });

  it('returns expected methods', () => {
    const routes = createSoundCloudRoutes({
      clientId: 'test_id',
      clientSecret: 'test_secret',
    });
    expect(routes).toHaveProperty('handler');
    expect(routes).toHaveProperty('searchTracks');
    expect(routes).toHaveProperty('getTrack');
    expect(routes).toHaveProperty('getUser');
    expect(routes).toHaveProperty('getPlaylist');
  });

  it('handles track search', async () => {
    const req = new Request('http://localhost/api/soundcloud/search/tracks?q=test');
    const res = await handle(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('collection');
  });

  it('handles single track', async () => {
    const req = new Request('http://localhost/api/soundcloud/tracks/1');
    const res = await handle(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Track');
  });

  it('handles single user', async () => {
    const req = new Request('http://localhost/api/soundcloud/users/2');
    const res = await handle(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.username).toBe('user');
  });

  it('handles playlist', async () => {
    const req = new Request('http://localhost/api/soundcloud/playlists/3');
    const res = await handle(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Playlist');
  });

  it('returns 404 for unknown routes', async () => {
    const req = new Request('http://localhost/api/soundcloud/unknown');
    const res = await handle(req);
    expect(res.status).toBe(404);
  });

  it('handles auth login', async () => {
    const req = new Request('http://localhost/api/soundcloud/auth/login');
    const res = await handle(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('url');
  });
});
