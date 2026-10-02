import { isUnpublishedRoute, resolveMaintenanceUrl } from '#shared/utils/maintenance';

export default defineNuxtRouteMiddleware((to) => {
  if (!isUnpublishedRoute(to.path)) return;

  const config = useRuntimeConfig();
  const destination = resolveMaintenanceUrl(config.public.maintenanceUrl, useRequestURL().origin);
  // A fixed URL deliberately drops the incoming query instead of forwarding it externally.
  return navigateTo(destination, { external: true, redirectCode: 302, replace: true });
});
