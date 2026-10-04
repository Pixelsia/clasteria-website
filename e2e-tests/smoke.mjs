import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { defaultMaintenanceUrl, unpublishedRoutes, unpublishedRouteVariants } from '../shared/utils/maintenance.ts';

const baseURL = process.env.BASE_URL || 'http://localhost:3000';
const screenshots = process.env.SCREENSHOT_DIR;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
});
const pages = ['/', '/articles', '/support'];
const excluded = unpublishedRoutes;
const maintenanceUrl = process.env.NUXT_PUBLIC_MAINTENANCE_URL || defaultMaintenanceUrl;
const errors = [];

try {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  if (screenshots) await mkdir(screenshots, { recursive: true });

  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    for (const path of pages) {
      const response = await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200, `${path}: successful response`);
      assert.equal(await page.locator('h1').count(), 1, `${path}: one main heading`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path}: no overflow at ${width}`);
      const links = await page.locator('a[href]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
      assert.ok(!links.some(href => excluded.includes(href)), `${path}: no unsupported links`);
      assert.ok(!links.some(href => href.includes('.example')), `${path}: no sample links`);
      for (const image of await page.locator('img').all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate(element => element.decode().catch(() => {}));
        assert.ok(await image.evaluate(element => element.naturalWidth > 0), `${path}: image loads`);
      }
      if (screenshots && width !== 320) {
        await page.screenshot({ path: `${screenshots}/${width}-${path.replaceAll('/', '') || 'home'}.png`, fullPage: true });
      }
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseURL);
  const menu = page.getByRole('button', { name: 'メニューを開く' });
  await menu.click();
  assert.equal(await page.locator('#mobile-navigation').count(), 1);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#mobile-navigation').count(), 0);
  assert.equal(await menu.getAttribute('aria-expanded'), 'false');
  await menu.click();
  await page.locator('#mobile-navigation').getByRole('link', { name: 'ニュース', exact: true }).click();
  await page.waitForURL('**/articles');
  assert.equal(await page.locator('#mobile-navigation').count(), 0);
  await page.goBack();
  await page.waitForURL(baseURL + '/');
  assert.equal(await page.locator('#mobile-navigation').count(), 0);
  await page.goForward();
  await page.waitForURL('**/articles');
  assert.equal(await page.locator('#mobile-navigation').count(), 0);

  await page.goto(`${baseURL}/support`);
  assert.ok(await page.locator('a[href="mailto:support@pixelsia.net"]').count());
  assert.equal(await page.locator('a[href="https://discord.gg/fsts95chH5"]').count(), 1);
  await page.getByRole('button', { name: 'アドレスをコピー' }).click();
  assert.match(await page.locator('[role="status"]').innerText(), /コピーしました|コピーできませんでした/);
  await page.getByRole('button', { name: 'ゲームへの参加方法を知りたいです' }).click();
  assert.ok(await page.getByText('現在の受付状況や参加方法については').isVisible());

  // Stub only the external destination: verify navigation without relying on its uptime.
  await page.route(url => url.origin === new URL(maintenanceUrl).origin, route => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><title>Maintenance test destination</title><h1>Maintenance test destination</h1>',
  }));
  for (const path of unpublishedRouteVariants) {
    const url = `${baseURL}${path}?maintenance_test=private`;
    if (process.env.REQUIRE_HTTP_REDIRECTS === '1') {
      const response = await context.request.get(url, { maxRedirects: 0 });
      assert.equal(response.status(), 302, `${path}: temporary HTTP redirect`);
      assert.equal(response.headers().location, maintenanceUrl, `${path}: no query forwarding`);
    }
    await page.goto(url);
    await page.waitForURL(maintenanceUrl);
    assert.equal(page.url(), maintenanceUrl, `${path}: clean maintenance destination`);
  }

  // Exercise Nuxt client navigation as well as direct static/HTTP requests.
  await page.goto(baseURL);
  await page.waitForFunction(() => !!document.querySelector('#__nuxt')?.__vue_app__);
  await page.evaluate(() => {
    document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push('/login?maintenance_test=private');
  });
  await page.waitForURL(maintenanceUrl);
  assert.equal(page.url(), maintenanceUrl, 'client navigation uses the same clean destination');

  for (const path of ['/missing', '/login/extra', '/articles/20261001-missing']) {
    await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle' });
    assert.ok(await page.getByRole('heading', { name: 'ページが見つかりませんでした' }).isVisible(), `${path}: 404`);
    assert.ok(!/Player 01|Coming soon/.test(await page.locator('body').innerText()));
  }

  assert.deepEqual(errors, [], 'no uncaught browser errors');
  console.log('Passed: three pages at 1440/390/320px, images, safe links, menu/Escape/history, contacts, FAQ, maintenance redirects, unknown-route 404, no runtime errors.');
}
finally {
  await browser.close();
}
