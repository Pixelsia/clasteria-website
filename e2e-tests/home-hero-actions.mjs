import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const baseURL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const screenshots = process.env.SCREENSHOT_DIR;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, chromiumSandbox: true });
const errors = [];
async function exportDraft(page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'), page.getByRole('button', { name: /この\s*PC\s*に\s*保存/ }).click(),
  ]);
  assert.equal(await download.failure(), null);
  return JSON.parse(await readFile(await download.path(), 'utf8'));
}
try {
  if (screenshots) await mkdir(screenshots, { recursive: true });
  let context = await browser.newContext();
  await context.route('**/api/editor/*', (route) => {
    assert.equal(route.request().method(), 'GET', 'no server writes during this check');
    return route.fulfill({ contentType: 'application/json', body: '{"draft":null}' });
  });
  let page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal((await page.goto(baseURL)).status(), 200);
    const hero = page.locator('main .home-section-hero');
    assert.equal(await hero.locator('a[href="/articles"], a[href="/support"]').count(), 0);
    assert.equal(await hero.locator('a[href="/access"]').count(), 1);
    assert.ok((await hero.innerText()).includes('play.pixelsia.net'));
    assert.equal(await page.locator('main .home-section-news').count(), 1);
    assert.equal(await page.locator('main .home-section-contact').count(), 1);
    const description = hero.locator('.site-reveal > p').nth(1);
    const connection = hero.locator('.hero-connection');
    const paragraphBounds = await description.boundingBox();
    const gap = (await connection.boundingBox()).y - paragraphBounds.y - paragraphBounds.height;
    assert.ok(gap >= 20 && gap <= 36, `normal spacing after removing buttons: ${gap}`);
    for (const href of ['/articles', '/support', '/access', 'https://recruit.pixelsia.net/']) {
      assert.equal(await page.locator('footer').locator(`a[href="${href}"]`).count(), 1);
      assert.ok(await page.locator('header').locator(`a[href="${href}"]`).count() > 0);
    }
    assert.equal(await page.locator('footer img[alt="Pixelsia"]').count(), 1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.site-reveal')).opacity === '1');
    if (screenshots) await page.screenshot({ path: `${screenshots}/home-hero-${width}.png` });
  }
  await page.goto(`${baseURL}/editor`);
  await page.getByRole('button', { name: /この\s*PC\s*に\s*保存/ }).waitFor();
  const source = await exportDraft(page);
  Object.assign(source.sections[0].content, {
    title: '保存済みのHome\n改行を保持', primaryLabel: '古いお知らせ', secondaryLabel: '古いお問い合わせ',
  });
  source.sections[0].style = { accent: '#AaBbCc', background: '#123456', button: '#654321', spacing: 'roomy' };
  const raw = JSON.stringify(source);
  await context.close();
  context = await browser.newContext();
  await context.addInitScript(raw => localStorage.setItem('clasteria:home-draft:v1', raw), raw);
  await context.route('**/api/editor/*', (route) => {
    assert.equal(route.request().method(), 'GET');
    return route.fulfill({ contentType: 'application/json', body: '{"draft":null}' });
  });
  page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${baseURL}/editor`);
  const canvas = page.frameLocator('.editor-canvas iframe.gjs-frame');
  await canvas.locator('h1').filter({ hasText: '保存済みのHome' }).waitFor();
  assert.equal(await canvas.locator('.home-section-hero a[href="/articles"], .home-section-hero a[href="/support"]').count(), 0);
  assert.equal(await canvas.locator('.home-section-hero a[href="/access"]').count(), 1);
  for (const key of ['primaryLabel', 'primaryTo', 'secondaryLabel', 'secondaryTo']) {
    assert.equal(await page.locator(`#editor-field-${key}`).count(), 0, 'removed actions have no ineffective editor controls');
  }
  assert.equal(await page.locator('#editor-field-accessLabel').count(), 1);
  assert.equal(await page.getByRole('alert').count(), 0);
  assert.deepEqual(await exportDraft(page), source, 'legacy settings, sections and all edits survive roundtrip');
  assert.deepEqual(errors, []);
  await context.close();
  console.log('Passed: only the two Home hero actions removed, normal spacing, access/news/contact/navigation/footer preserved, PC/390/320px no overflow; legacy JSON loads and roundtrips unchanged with matching editor canvas/controls.');
}
finally {
  await browser.close();
}
