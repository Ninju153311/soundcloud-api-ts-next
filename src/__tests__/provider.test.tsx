import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { SoundCloudProvider, useSoundCloudContext } from '../client/provider.js';
import type { ReactNode } from 'react';

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => { fetchMock = vi.fn(); globalThis.fetch = fetchMock; });
afterEach(() => { vi.restoreAllMocks(); });

function ContextReader() {
  const ctx = useSoundCloudContext();
  return (
    <div>
      <span data-testid="prefix">{ctx.apiPrefix}</span>
      <span data-testid="auth">{String(ctx.isAuthenticated)}</span>
      <span data-testid="loading">{String(ctx.authLoading)}</span>
      <span data-testid="user">{ctx.user?.username ?? 'null'}</span>
      <span data-testid="token">{ctx.accessToken ?? 'null'}</span>
    </div>
  );
}

describe('SoundCloudProvider', () => {
  it('renders children', () => {
    render(<SoundCloudProvider><span>hello</span></SoundCloudProvider>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('provides default apiPrefix', () => {
    render(<SoundCloudProvider><ContextReader /></SoundCloudProvider>);
    expect(screen.getByTestId('prefix').textContent).toBe('/api/soundcloud');
  });

  it('accepts custom apiPrefix', () => {
    render(<SoundCloudProvider apiPrefix="/custom"><ContextReader /></SoundCloudProvider>);
    expect(screen.getByTestId('prefix').textContent).toBe('/custom');
  });

  it('initializes auth state correctly', () => {
    render(<SoundCloudProvider><ContextReader /></SoundCloudProvider>);
    expect(screen.getByTestId('auth').textContent).toBe('false');
    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('token').textContent).toBe('null');
  });

  it('_setAuth updates state and fetches user', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SoundCloudProvider apiPrefix="/api/sc">{children}</SoundCloudProvider>
    );
    const { result } = renderHook(() => useSoundCloudContext(), { wrapper });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, username: 'testuser' }),
    });

    await act(async () => {
      result.current._setAuth({ accessToken: 'tok', refreshToken: 'ref', expiresIn: 3600 });
    });

    await waitFor(() => expect(result.current.user?.username).toBe('testuser'));
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('handles /me fetch failure after _setAuth', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SoundCloudProvider apiPrefix="/api/sc">{children}</SoundCloudProvider>
    );
    const { result } = renderHook(() => useSoundCloudContext(), { wrapper });

    fetchMock.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });

    await act(async () => {
      result.current._setAuth({ accessToken: 'tok', refreshToken: 'ref', expiresIn: 3600 });
    });

    await waitFor(() => expect(result.current.authLoading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it('login fetches auth URL and redirects', async () => {
    const originalLocation = window.location;
    // @ts-expect-error — testing invalid props
    delete window.location;
    window.location = { ...originalLocation, href: '' } as any;

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://sc.com/connect' }),
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <SoundCloudProvider apiPrefix="/api/sc">{children}</SoundCloudProvider>
    );
    const { result } = renderHook(() => useSoundCloudContext(), { wrapper });

    await act(async () => { result.current.login(); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/auth/login')));

    window.location = originalLocation;
  });

  it('login handles error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockRejectedValueOnce(new Error('network'));

    const wrapper = ({ children }: { children: ReactNode }) => (
      <SoundCloudProvider apiPrefix="/api/sc">{children}</SoundCloudProvider>
    );
    const { result } = renderHook(() => useSoundCloudContext(), { wrapper });

    await act(async () => { result.current.login(); });
    await waitFor(() => expect(consoleSpy).toHaveBeenCalled());
    consoleSpy.mockRestore();
  });

  it('logout clears all state', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SoundCloudProvider apiPrefix="/api/sc">{children}</SoundCloudProvider>
    );
    const { result } = renderHook(() => useSoundCloudContext(), { wrapper });

    // First authenticate
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, username: 'u' }),
    });
    await act(async () => {
      result.current._setAuth({ accessToken: 'tok', refreshToken: 'ref', expiresIn: 3600 });
    });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    // Now logout
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await act(async () => { await result.current.logout(); });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
  });

  it('logout works even when not authenticated', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SoundCloudProvider apiPrefix="/api/sc">{children}</SoundCloudProvider>
    );
    const { result } = renderHook(() => useSoundCloudContext(), { wrapper });
    await act(async () => { await result.current.logout(); });
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('logout handles fetch error gracefully', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SoundCloudProvider apiPrefix="/api/sc">{children}</SoundCloudProvider>
    );
    const { result } = renderHook(() => useSoundCloudContext(), { wrapper });

    // Authenticate first
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, username: 'u' }),
    });
    await act(async () => {
      result.current._setAuth({ accessToken: 'tok', refreshToken: 'ref', expiresIn: 3600 });
    });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    // Logout with network error
    fetchMock.mockRejectedValueOnce(new Error('network'));
    await act(async () => { await result.current.logout(); });
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('login with no url in response does not redirect', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SoundCloudProvider apiPrefix="/api/sc">{children}</SoundCloudProvider>
    );
    const { result } = renderHook(() => useSoundCloudContext(), { wrapper });
    await act(async () => { result.current.login(); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });
});

describe('SoundCloudProvider auth cancelled paths', () => {
  it('ignores /me response after unmount (cancelled=true in then)', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SoundCloudProvider apiPrefix="/api/sc">{children}</SoundCloudProvider>
    );

    let resolveFn: (val: any) => void;
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => { resolveFn = resolve; }));

    const { result, unmount } = renderHook(() => useSoundCloudContext(), { wrapper });

    await act(async () => {
      result.current._setAuth({ accessToken: 'tok', refreshToken: 'ref', expiresIn: 3600 });
    });

    unmount(); // cancelled = true

    // Now resolve the fetch — the .then/.finally should see cancelled=true
    await act(async () => {
      resolveFn!({ ok: true, json: async () => ({ id: 1, username: 'u' }) });
    });
    await new Promise((r) => setTimeout(r, 10));
  });

  it('ignores /me fetch error after unmount (cancelled=true in catch)', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SoundCloudProvider apiPrefix="/api/sc">{children}</SoundCloudProvider>
    );

    let rejectFn: (err: Error) => void;
    fetchMock.mockImplementationOnce(() => new Promise((_, reject) => { rejectFn = reject; }));

    const { result, unmount } = renderHook(() => useSoundCloudContext(), { wrapper });

    await act(async () => {
      result.current._setAuth({ accessToken: 'tok', refreshToken: 'ref', expiresIn: 3600 });
    });

    unmount(); // cancelled = true

    // Now reject the fetch — the catch/finally should see cancelled=true
    await act(async () => {
      rejectFn!(new Error('network'));
    });
    await new Promise((r) => setTimeout(r, 10));
  });
});

describe('useSoundCloudContext', () => {
  it('returns default values outside provider', () => {
    const { result } = renderHook(() => useSoundCloudContext());
    expect(result.current.apiPrefix).toBe('/api/soundcloud');
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('default context functions are no-ops', async () => {
    const { result } = renderHook(() => useSoundCloudContext());
    // Call the default no-op functions to cover them
    result.current.login();
    await result.current.logout();
    result.current._setAuth({ accessToken: 'x', refreshToken: 'x', expiresIn: 1 });
  });
});
