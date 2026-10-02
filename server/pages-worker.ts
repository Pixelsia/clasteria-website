import { handleDraftRequest } from './editor/drafts';
import type { DraftEnvironment } from './editor/drafts';
import { unpublishedRouteVariants } from '../shared/utils/maintenance';

declare const MAINTENANCE_DESTINATION: string;
declare const EDITOR_SCOPE: string;
const paths = new Set<string>(unpublishedRouteVariants);
type Environment = DraftEnvironment & { ASSETS: { fetch: (request: Request) => Promise<Response> } };

export default {
  async fetch(request: Request, env: Environment) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/editor/')) return handleDraftRequest(request, env, EDITOR_SCOPE);
    if (!paths.has(url.pathname)) return env.ASSETS.fetch(request);
    if (url.origin === new URL(MAINTENANCE_DESTINATION).origin) {
      return new Response('Maintenance redirect configuration error.', { status: 503 });
    }
    return new Response(null, {
      status: 302,
      headers: { 'Location': MAINTENANCE_DESTINATION, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
    });
  },
};
