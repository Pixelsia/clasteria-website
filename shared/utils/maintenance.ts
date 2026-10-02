export const defaultMaintenanceUrl = 'https://pixelsia.net/';

// Keep this list exact: unknown URLs must still reach the custom 404 page.
export const unpublishedRoutes = [
  '/onigokko',
  '/kakurenbo',
  '/codingcraft',
  '/leaderboard',
  '/login',
  '/register',
] as const;

export const unpublishedRouteVariants = unpublishedRoutes.flatMap(path => [path, `${path}/`]);

export function isUnpublishedRoute(path: string): boolean {
  return unpublishedRouteVariants.includes(path);
}

export function resolveMaintenanceUrl(value: string, siteUrl: string): string {
  const destination = new URL(value);
  if (destination.protocol !== 'https:' || destination.username || destination.password
    || destination.search || destination.hash) {
    throw new Error('Maintenance URL must be an absolute HTTPS URL without credentials, query, or fragment.');
  }
  if (destination.origin === new URL(siteUrl).origin || isUnpublishedRoute(destination.pathname)) {
    throw new Error('Maintenance URL must use a separate origin and must not target an unpublished route.');
  }
  return destination.href;
}
