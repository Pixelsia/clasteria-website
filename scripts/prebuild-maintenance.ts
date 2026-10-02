import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveMaintenanceUrl, unpublishedRoutes, unpublishedRouteVariants } from '../shared/utils/maintenance';

export function renderMaintenanceHtml(destination: string): string {
  const href = destination.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><meta name="referrer" content="no-referrer">
<meta http-equiv="refresh" content="0;url=${href}">
<title>メンテナンスページへ移動します</title></head>
<body><p><a href="${href}" rel="noreferrer">メンテナンスページへ移動します</a></p></body></html>\n`;
}

export function renderMaintenanceWorker(destination: string): string {
  // Pages _redirects and Nitro redirect route rules forward incoming query strings.
  // A scoped Pages Function keeps the external destination exact, including on direct requests.
  return `const paths = new Set(${JSON.stringify(unpublishedRouteVariants)});
const destination = ${JSON.stringify(destination)};
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!paths.has(url.pathname)) return env.ASSETS.fetch(request);
    if (url.origin === new URL(destination).origin) {
      return new Response('Maintenance redirect configuration error.', { status: 503 });
    }
    return new Response(null, {
      status: 302,
      headers: { Location: destination, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
    });
  },
};\n`;
}

export async function writeMaintenanceAssets(publicDir: string, maintenanceUrl: string, siteUrl: string) {
  const destination = resolveMaintenanceUrl(maintenanceUrl, siteUrl);
  await mkdir(publicDir, { recursive: true });
  await Promise.all([
    writeFile(join(publicDir, '_worker.js'), renderMaintenanceWorker(destination)),
    writeFile(join(publicDir, '_routes.json'), JSON.stringify({
      version: 1,
      include: unpublishedRouteVariants,
      exclude: [],
    }, null, 2) + '\n'),
    // Generic static previews cannot emit an HTTP 302. These tiny files only redirect;
    // the unpublished Vue pages are not registered, rendered, or bundled.
    ...unpublishedRoutes.map(async (path) => {
      const directory = join(publicDir, path.slice(1));
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, 'index.html'), renderMaintenanceHtml(destination));
    }),
  ]);
}
