import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const baseURL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const screenshots = process.env.SCREENSHOT_DIR;
const label = text => new RegExp([...text].map(character => character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*'));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, chromiumSandbox: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
async function verifyLink(link) {
  assert.equal(await link.getAttribute('href'), 'https://recruit.pixelsia.net/');
  assert.equal(await link.getAttribute('target'), '_blank');
  const rel = (await link.getAttribute('rel')).split(' ');
  assert.ok(rel.includes('noopener') && rel.includes('noreferrer'));
  assert.equal(await link.getAttribute('aria-current'), null, 'external link never claims the current internal page');
}
async function visitRecruit(link) {
  const opening = page.waitForEvent('popup');
  await link.click();
  const popup = await opening;
  await popup.waitForURL('https://recruit.pixelsia.net/**', { waitUntil: 'domcontentloaded' });
  assert.equal(new URL(popup.url()).hostname, 'recruit.pixelsia.net');
  assert.ok((await popup.title()).includes('Pixelsia Recruit'));
  await popup.close();
  assert.equal(new URL(page.url()).pathname, '/', 'the original page remains open');
}
try {
  if (screenshots) await mkdir(screenshots, { recursive: true });
  await page.goto(baseURL);
  const desktop = page.getByRole('navigation', { name: label('メインナビゲーション') }).getByRole('link', { name: label('採用情報') });
  await desktop.waitFor();
  await verifyLink(desktop);
  await visitRecruit(desktop);
  const footer = page.locator('footer').getByRole('link', { name: label('採用情報') });
  await verifyLink(footer);
  assert.ok((await footer.innerText()).includes('外部サイト'));
  await visitRecruit(footer);
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: width >= 1024 ? 1000 : 844 });
    await page.goto(baseURL);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px no horizontal overflow`);
    if (width >= 1024) {
      assert.ok(await desktop.isVisible());
      if (screenshots && width === 1440) await page.screenshot({ path: `${screenshots}/recruit-desktop.png`, fullPage: true });
      continue;
    }
    const toggle = page.getByRole('button', { name: label('メニューを開く') });
    assert.equal(await toggle.locator('svg[aria-hidden="true"] path').getAttribute('d'), 'M4 6h16M4 12h16M4 18h16');
    await toggle.click();
    assert.equal(await page.getByRole('button', { name: label('メニューを閉じる') }).getAttribute('aria-expanded'), 'true');
    assert.equal(await page.getByRole('button', { name: label('メニューを閉じる') }).locator('svg path').getAttribute('d'), 'M6 6l12 12M6 18 18 6');
    const mobileNav = page.getByRole('navigation', { name: label('モバイルナビゲーション') });
    const mobile = mobileNav.getByRole('link', { name: label('採用情報') });
    await verifyLink(mobile);
    assert.ok((await mobile.innerText()).includes('外部サイト'));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px expanded menu has no overflow`);
    if (screenshots) await page.screenshot({ path: `${screenshots}/recruit-mobile-${width}.png` });
    await page.keyboard.press('Escape');
    await mobileNav.waitFor({ state: 'hidden' });
    assert.ok(await toggle.evaluate(element => element === document.activeElement), 'Escape returns focus to the menu button');
    await toggle.click();
    await visitRecruit(mobile);
    await mobileNav.waitFor({ state: 'hidden' });
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    await toggle.click();
    await mobileNav.getByRole('link', { name: label('参加・アクセス') }).click();
    await page.waitForURL('**/access');
    await mobileNav.waitFor({ state: 'hidden' });
    await page.goBack();
    assert.equal(new URL(page.url()).pathname, '/');
    await page.locator('.hero-connection').waitFor();
  }
  assert.deepEqual(errors, []);
  console.log('Passed: official recruitment header/footer/mobile links, real external destination, safe new-tab attributes, PC/1024/390/320px layout, menu open/Escape/focus/click close, existing access navigation and back, no runtime errors.');
}
finally {
  await browser.close();
}
