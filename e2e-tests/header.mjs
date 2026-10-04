import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const baseURL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const screenshots = process.env.SCREENSHOT_DIR;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, chromiumSandbox: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
async function headerAppearance() {
  return page.locator('header').evaluate((header) => {
    const style = getComputedStyle(header);
    return {
      background: style.backgroundColor, image: style.backgroundImage, blur: style.backdropFilter,
      opacity: style.opacity, border: style.borderBottom, position: style.position,
      top: header.getBoundingClientRect().top,
    };
  });
}
try {
  if (screenshots) await mkdir(screenshots, { recursive: true });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    let baseline;
    for (const path of ['/support', '/', '/access', '/articles', '/']) {
      assert.equal((await page.goto(`${baseURL}${path}`)).status(), 200);
      const appearance = await headerAppearance();
      assert.equal(appearance.background, 'rgb(255, 255, 255)');
      assert.equal(appearance.image, 'none');
      assert.equal(appearance.blur, 'none');
      assert.equal(appearance.opacity, '1');
      assert.equal(appearance.position, 'sticky');
      assert.equal(appearance.top, 0);
      baseline ??= appearance;
      assert.deepEqual(appearance, baseline, `${path}: matches other pages`);
      const mainTop = await page.locator('main').evaluate(main => main.getBoundingClientRect().top);
      const headerBottom = await page.locator('header').evaluate(header => header.getBoundingClientRect().bottom);
      assert.ok(mainTop >= headerBottom, 'the initial main content is below the header');
      const scrollTarget = await page.evaluate(
        () => Math.min(450, document.documentElement.scrollHeight - innerHeight),
      );
      await page.evaluate(target => scrollTo(0, target), scrollTarget);
      await page.waitForFunction(target => Math.abs(scrollY - target) < 2, scrollTarget);
      assert.deepEqual(await headerAppearance(), baseline, 'scrolling keeps the same opaque header pinned at the top');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (width < 1024) {
        await page.getByRole('button', { name: 'メニューを開く' }).click();
        const menu = page.locator('#mobile-navigation');
        assert.ok(await menu.isVisible());
        assert.equal(await menu.evaluate(menu => getComputedStyle(menu).backgroundColor), 'rgb(255, 255, 255)');
        await page.keyboard.press('Escape');
        assert.equal(await menu.count(), 0);
      }
      if (screenshots && path === '/') {
        await page.screenshot({ path: `${screenshots}/header-home-scrolled-${width}.png` });
        await page.evaluate(() => scrollTo(0, 0));
        await page.waitForFunction(() => scrollY === 0);
        await page.screenshot({ path: `${screenshots}/header-home-top-${width}.png` });
      }
    }
    // Exercise client-side navigation as well as document loads.
    if (width < 1024) await page.getByRole('button', { name: 'メニューを開く' }).click();
    const nav = page.getByRole('navigation', { name: width < 1024 ? 'モバイルナビゲーション' : 'メインナビゲーション', exact: true });
    await nav.getByRole('link', { name: 'お問い合わせ', exact: true }).click();
    await page.waitForURL('**/support');
    assert.deepEqual(await headerAppearance(), baseline);
    await page.goBack();
    await page.waitForURL(baseURL + '/');
    assert.deepEqual(await headerAppearance(), baseline);
  }
  assert.deepEqual(errors, []);
  console.log('Passed: opaque white header, identical border/sticky behavior across Home/support/access/news, top/scroll, PC/768/390/320px, mobile menu and route round trips; no overlap or runtime errors.');
}
finally {
  await browser.close();
}
