import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { unpublishedRoutes, unpublishedRouteVariants } from '../shared/utils/maintenance';
import { renderMaintenanceHtml, renderMaintenanceWorker, writeMaintenanceAssets } from './prebuild-maintenance';

const destination = 'https://pixelsia.net/';
const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

describe('maintenance deployment assets', () => {
  it('emits scoped Cloudflare invocation rules and redirect-only static fallbacks', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'clasteria-maintenance-'));
    directories.push(directory);
    await writeMaintenanceAssets(directory, destination, 'https://clasteria.pixelsia.net');
    expect(JSON.parse(await readFile(join(directory, '_routes.json'), 'utf8'))).toEqual({
      version: 1,
      include: unpublishedRouteVariants,
      exclude: [],
    });
    expect(await readdir(directory)).not.toContain('index.html');
    for (const path of unpublishedRoutes) {
      const html = await readFile(join(directory, path, 'index.html'), 'utf8');
      expect(html).toContain('http-equiv="refresh" content="0;url=https://pixelsia.net/"');
      expect(html).toContain('name="robots" content="noindex"');
      expect(html).not.toMatch(/_nuxt|Player 01|Coming soon/);
    }
  });

  it('escapes the static fallback URL', () => {
    expect(renderMaintenanceHtml('https://pixelsia.net/a&b"<'))
      .toContain('href="https://pixelsia.net/a&amp;b&quot;&lt;"');
  });

  it('runs the generated Worker with exact 302 destinations and no query forwarding', async () => {
    const worker = runInNewContext(renderMaintenanceWorker(destination).replace('export default', 'worker ='), {
      URL,
      Response,
    });
    const assets = vi.fn(async () => new Response('asset or custom 404', { status: 404 }));
    for (const path of unpublishedRouteVariants) {
      for (const method of ['GET', 'HEAD']) {
        const request = new Request(`https://clasteria.pixelsia.net${path}?token=private`, { method });
        const response = await worker.fetch(request, { ASSETS: { fetch: assets } });
        expect(response.status).toBe(302);
        expect(response.headers.get('Location')).toBe(destination);
        expect(response.headers.get('Cache-Control')).toBe('no-store');
        expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
      }
    }
    expect(assets).not.toHaveBeenCalled();
    for (const path of ['/', '/articles', '/support', '/unknown', '/login/extra']) {
      const request = new Request(`https://clasteria.pixelsia.net${path}`);
      const response = await worker.fetch(request, { ASSETS: { fetch: assets } });
      expect(response.status).toBe(404);
      expect(assets).toHaveBeenLastCalledWith(request);
    }
  });

  it('does not loop if the deployed hostname is accidentally the maintenance hostname', async () => {
    const worker = runInNewContext(renderMaintenanceWorker(destination).replace('export default', 'worker ='), {
      URL,
      Response,
    });
    const response = await worker.fetch(new Request('https://pixelsia.net/login'), {});
    expect(response.status).toBe(503);
    expect(response.headers.get('Location')).toBeNull();
  });
});
