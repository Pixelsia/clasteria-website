import { describe, expect, it } from 'vitest';
import {
  defaultMaintenanceUrl,
  isUnpublishedRoute,
  resolveMaintenanceUrl,
  unpublishedRoutes,
  unpublishedRouteVariants,
} from './maintenance';

describe('unpublished route policy', () => {
  it('matches only the six exact routes and one trailing slash', () => {
    expect(unpublishedRoutes).toEqual([
      '/onigokko', '/kakurenbo', '/codingcraft', '/leaderboard', '/login', '/register',
    ]);
    expect(unpublishedRouteVariants).toHaveLength(12);
    expect(unpublishedRouteVariants.every(isUnpublishedRoute)).toBe(true);
    for (const path of ['/', '/articles', '/support', '/missing', '/login/extra', '/login//', '/LOGIN']) {
      expect(isUnpublishedRoute(path), path).toBe(false);
    }
  });

  it('uses the verified external maintenance root and supports a later dedicated URL', () => {
    expect(resolveMaintenanceUrl(defaultMaintenanceUrl, 'https://clasteria.pixelsia.net')).toBe('https://pixelsia.net/');
    expect(resolveMaintenanceUrl('https://pixelsia.net/maintenance', 'https://clasteria.pixelsia.net'))
      .toBe('https://pixelsia.net/maintenance');
  });

  it('rejects invalid destinations, credentials, query strings, and fragments', () => {
    for (const destination of [
      '/maintenance', '', 'javascript:alert(1)', 'http://pixelsia.net/',
      'https://user:password@pixelsia.net/', 'https://pixelsia.net/?token=private', 'https://pixelsia.net/#fragment',
    ]) {
      expect(() => resolveMaintenanceUrl(destination, 'https://clasteria.pixelsia.net')).toThrow();
    }
  });

  it('fails closed on same-origin roots, aliases, and unpublished redirect destinations', () => {
    for (const destination of [
      'https://clasteria.pixelsia.net/', 'https://clasteria.pixelsia.net/maintenance',
      'https://clasteria.pixelsia.net/login', 'https://pixelsia.net/register/',
    ]) {
      expect(() => resolveMaintenanceUrl(destination, 'https://clasteria.pixelsia.net')).toThrow();
    }
    expect(() => resolveMaintenanceUrl('https://pixelsia.net/', 'https://pixelsia.net/')).toThrow();
  });
});
