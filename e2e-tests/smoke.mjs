import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const baseURL = process.env.BASE_URL || 'http://localhost:3000';
const screenshots = process.env.SCREENSHOT_DIR;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
});
const pages = ['/', '/onigokko', '/kakurenbo', '/articles', '/support'];
const excluded = ['/codingcraft', '/leaderboard', '/login', '/register'];
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
  assert.equal(await page.locator('a[href="https://discord.gg/TwTPa4Yp4h"]').count(), 1);
  await page.getByRole('button', { name: 'アドレスをコピー' }).click();
  assert.match(await page.locator('[role="status"]').innerText(), /コピーしました|コピーできませんでした/);
  await page.getByRole('button', { name: 'ゲームへの参加方法を知りたいです' }).click();
  assert.ok(await page.getByText('現在の受付状況や参加方法については').isVisible());

  for (const path of [...excluded, '/articles/20261001-missing']) {
    await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle' });
    assert.ok(await page.getByRole('heading', { name: 'ページが見つかりませんでした' }).isVisible(), `${path}: 404`);
    assert.ok(!/Player 01|Coming soon/.test(await page.locator('body').innerText()));
  }

  assert.deepEqual(errors, [], 'no uncaught browser errors');
  console.log('Passed: five pages at 1440/390/320px, images, safe links, menu/Escape/history, contacts, FAQ, excluded routes, no runtime errors.');
}
finally {
  await browser.close();
}
