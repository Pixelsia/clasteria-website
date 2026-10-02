import { afterEach, describe, expect, it, vi } from 'vitest';
import { unpublishedRouteVariants } from '../../shared/utils/maintenance';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('maintenance route middleware', () => {
  it('redirects only known routes and never passes through request queries', async () => {
    vi.stubGlobal('defineNuxtRouteMiddleware', (middleware: unknown) => middleware);
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { maintenanceUrl: 'https://pixelsia.net/' } }));
    vi.stubGlobal('useRequestURL', () => new URL('https://clasteria.pixelsia.net/login?token=private'));
    const navigate = vi.fn(() => 'navigation result');
    vi.stubGlobal('navigateTo', navigate);
    const { default: middleware } = await import('./maintenance.global');
    for (const path of unpublishedRouteVariants) {
      expect(middleware({ path, query: { token: 'private' } } as never, {} as never)).toBe('navigation result');
      expect(navigate).toHaveBeenLastCalledWith('https://pixelsia.net/', {
        external: true,
        redirectCode: 302,
        replace: true,
      });
    }
    navigate.mockClear();
    for (const path of ['/', '/articles', '/support', '/missing', '/login/extra']) {
      middleware({ path } as never, {} as never);
    }
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not navigate into a same-origin loop', async () => {
    vi.stubGlobal('defineNuxtRouteMiddleware', (middleware: unknown) => middleware);
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { maintenanceUrl: 'https://pixelsia.net/' } }));
    vi.stubGlobal('useRequestURL', () => new URL('https://pixelsia.net/login'));
    const navigate = vi.fn();
    vi.stubGlobal('navigateTo', navigate);
    const { default: middleware } = await import('./maintenance.global');
    expect(() => middleware({ path: '/login' } as never, {} as never)).toThrow();
    expect(navigate).not.toHaveBeenCalled();
  });
});
