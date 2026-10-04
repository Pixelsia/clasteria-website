import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const baseURL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const screenshots = process.env.SCREENSHOT_DIR;
const label = text => new RegExp([...text].map(character => character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*'));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, chromiumSandbox: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  if (screenshots) await mkdir(screenshots, { recursive: true });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/access', '/support', '/articles']) {
      const response = await page.goto(`${baseURL}${path}`);
      assert.equal(response.status(), 200);
      if (path === '/support') {
        assert.equal(await page.locator('a[href="https://discord.gg/fsts95chH5"]').count(), 1);
        assert.equal(await page.locator('a[href*="TwTPa4Yp4h"]').count(), 0);
      }
      const footer = page.locator('footer');
      assert.equal(await footer.count(), 1, `${path}: one shared footer`);
      await footer.scrollIntoViewIfNeeded();
      const logo = footer.getByRole('img', { name: 'Pixelsia', exact: true });
      assert.equal(await logo.count(), 1, `${path}: one original-color logo`);
      await logo.evaluate(image => image.decode());
      assert.equal(await logo.evaluate(image => getComputedStyle(image).filter), 'none');
      assert.equal((await footer.innerText()).split('© 2026 Pixelsia').length - 1, 1);
      assert.equal(await footer.locator('[data-slot="bottom"]').count(), 0, 'the repeated lower band is removed');
      assert.ok(!(await footer.locator('[data-slot="container"]').isVisible()), 'the empty default band has no height');
      for (const [name, href] of [['Home', '/'], ['ニュース', '/articles'], ['参加・アクセス', '/access'], ['お問い合わせ', '/support'], ['採用情報', 'https://recruit.pixelsia.net/'], ['CodingCraft', 'https://codingcraft.pixelsia.net/login']]) {
        const link = footer.getByRole('link', { name: label(name) });
        assert.equal(await link.count(), 1);
        assert.equal(await link.getAttribute('href'), href);
        if (href.startsWith('https://')) {
          assert.equal(await link.getAttribute('target'), '_blank');
          const rel = (await link.getAttribute('rel')).split(' ');
          assert.ok(rel.includes('noopener') && rel.includes('noreferrer'));
        }
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} at ${width}px has no overflow`);
      if (screenshots) await footer.screenshot({ path: `${screenshots}/footer-${path === '/' ? 'home' : path.slice(1)}-${width}.png` });
    }
  }
  assert.deepEqual(errors, []);
  console.log('Passed: Home/access/support/news use one upper footer, one full-color Pixelsia logo/copyright, all internal/recruitment/CodingCraft links preserved, no lower or empty band, PC/768/390/320px no overflow or runtime errors.');
}
finally {
  await browser.close();
}
