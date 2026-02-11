import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SoundCloudProvider, useSoundCloudContext } from '../client/provider.js';

function ContextReader() {
  const ctx = useSoundCloudContext();
  return (
    <div>
      <span data-testid="prefix">{ctx.apiPrefix}</span>
      <span data-testid="auth">{String(ctx.isAuthenticated)}</span>
      <span data-testid="loading">{String(ctx.authLoading)}</span>
    </div>
  );
}

describe('SoundCloudProvider', () => {
  it('renders children', () => {
    render(
      <SoundCloudProvider>
        <span>hello</span>
      </SoundCloudProvider>,
    );
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('provides default apiPrefix', () => {
    render(
      <SoundCloudProvider>
        <ContextReader />
      </SoundCloudProvider>,
    );
    expect(screen.getByTestId('prefix').textContent).toBe('/api/soundcloud');
  });

  it('accepts custom apiPrefix', () => {
    render(
      <SoundCloudProvider apiPrefix="/custom/sc">
        <ContextReader />
      </SoundCloudProvider>,
    );
    expect(screen.getByTestId('prefix').textContent).toBe('/custom/sc');
  });

  it('initializes auth state correctly', () => {
    render(
      <SoundCloudProvider>
        <ContextReader />
      </SoundCloudProvider>,
    );
    expect(screen.getByTestId('auth').textContent).toBe('false');
    expect(screen.getByTestId('loading').textContent).toBe('false');
  });
});
