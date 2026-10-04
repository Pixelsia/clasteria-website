import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import { chromium } from 'playwright-core';

const baseURL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const screenshots = process.env.SCREENSHOT_DIR;
const label = text => new RegExp('^' + [...text].map(character => character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*') + '$');
const published = JSON.parse(await readFile(new URL('../app/utils/homePage.json', import.meta.url), 'utf8'));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, chromiumSandbox: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.route('**/api/editor/*', (route) => {
  assert.equal(route.request().method(), 'GET', 'never writes real server drafts');
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{"draft":null}' });
});
async function ready(id = 'home') {
  await page.getByLabel(label('編集するページ')).waitFor();
  assert.equal(await page.getByLabel(label('編集するページ')).inputValue(), id);
  await page.frameLocator('iframe.gjs-frame').locator('[data-editor-section]').first().waitFor();
  await page.getByRole('button', { name: label('このPCに保存') }).first().waitFor();
}
async function assertButtonColor(locator, channels) {
  const deadline = Date.now() + 5000;
  while (true) {
    const color = await locator.evaluate(element => getComputedStyle(element).backgroundColor);
    if (color.startsWith(`rgb(${channels})`) || color.startsWith(`rgba(${channels},`)) return;
    if (Date.now() > deadline) assert.fail(`Expected button channels ${channels}; received ${color}`);
    await setTimeout(50);
  }
}
async function exportDraft() {
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: label('このPCに保存') }).first().click();
  const download = await downloading;
  return JSON.parse(await readFile(await download.path(), 'utf8'));
}
async function selectPage(id) {
  await page.getByLabel(label('編集するページ')).selectOption(id);
  const confirm = page.getByRole('button', { name: label('ブラウザーに保管して切り替え') });
  await confirm.waitFor({ state: 'visible' });
  await confirm.click();
  await page.waitForFunction(id => document.getElementById('editor-page')?.value === id, id);
  await ready(id);
}
try {
  if (screenshots) await mkdir(screenshots, { recursive: true });
  await page.goto(`${baseURL}/editor`);
  await ready();
  const canvas = page.frameLocator('iframe.gjs-frame');
  for (const id of ['hero', 'about', 'contact']) {
    const primary = canvas.locator(`[data-editor-section="${id}"] a.bg-primary`).first();
    await assertButtonColor(primary, '38, 113, 91');
  }
  assert.equal(await canvas.locator('.home-section-hero h1 > span:last-child').evaluate(element => getComputedStyle(element).color), 'rgb(123, 241, 168)', 'brand mint is preserved');
  await page.getByLabel('ボタンの色', { exact: true }).fill('#123456');
  await assertButtonColor(canvas.locator('[data-editor-section="hero"] a.bg-primary'), '18, 52, 86');
  const edited = await exportDraft();
  assert.equal(edited.sections[0].style.button, '#123456');
  assert.equal(edited.sections[0].style.accent, '#7bf1a8');
  await page.reload();
  await ready();
  assert.equal(await page.getByLabel('ボタンの色', { exact: true }).inputValue(), '#123456');
  await page.getByLabel('ボタンの色', { exact: true }).fill('#884422');
  await page.getByRole('button', { name: label('元に戻す') }).click();
  assert.equal(await page.getByLabel('ボタンの色', { exact: true }).inputValue(), '#123456');
  await page.getByRole('button', { name: label('やり直す') }).click();
  assert.equal(await page.getByLabel('ボタンの色', { exact: true }).inputValue(), '#884422');
  await page.getByRole('button', { name: label('プレビュー') }).click();
  await assertButtonColor(page.locator('.home-section-hero a.bg-primary'), '136, 68, 34');
  await page.goBack();
  await ready();
  const legacy = structuredClone(published);
  legacy.sections[0].content = Object.fromEntries(Object.entries(legacy.sections[0].content).filter(([key]) => !['serverAddress', 'serverNote', 'accessLabel', 'accessTo'].includes(key)));
  legacy.sections[0].content.title = '以前の下書き\n改行を維持';
  legacy.sections[0].style.accent = '#abcdef';
  const choosing = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: label('PCのファイルを読み込む') }).click();
  await (await choosing).setFiles({ name: 'legacy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(legacy)) });
  await canvas.getByText('以前の下書き\n改行を維持', { exact: true }).waitFor();
  const restored = await exportDraft();
  assert.equal(restored.sections[0].content.serverAddress, 'play.pixelsia.net');
  assert.equal(restored.sections[0].style.accent, '#abcdef');
  assert.equal(restored.sections[0].style.button, undefined);
  await selectPage('access');
  await page.getByLabel('見出し', { exact: true }).fill('参加・アクセスの編集\n改行も保存');
  await page.getByLabel('ボタンの色', { exact: true }).fill('#123456');
  const accessDraft = await exportDraft();
  assert.equal(accessDraft.page, 'access');
  await selectPage('home');
  assert.equal((await exportDraft()).sections[0].content.title, legacy.sections[0].content.title, 'page drafts stay separate');
  await selectPage('access');
  assert.deepEqual(await exportDraft(), accessDraft);
  const publicPage = await context.newPage();
  publicPage.on('pageerror', error => errors.push(error.message));
  for (const width of [1440, 390, 320]) {
    await publicPage.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await publicPage.goto(`${baseURL}/`);
    await publicPage.locator('.hero-connection').waitFor();
    assert.equal(await publicPage.locator('.hero-connection p').nth(1).innerText(), 'play.pixelsia.net');
    assert.ok((await publicPage.locator('.hero-connection').innerText()).includes('正式な接続先と公開時期は未定'));
    assert.equal(await publicPage.locator('a[href*="play.pixelsia.net"]').count(), 0);
    assert.ok(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px Home has no overflow`);
    if (screenshots) await publicPage.screenshot({ path: `${screenshots}/home-access-${width}.png`, fullPage: true });
    await publicPage.locator('.hero-connection').getByRole('link', { name: label('参加・アクセスのご案内') }).click();
    await publicPage.getByRole('heading', { name: label('接続情報'), exact: true }).waitFor();
    assert.equal(new URL(publicPage.url()).pathname, '/access');
    assert.ok((await publicPage.locator('main').innerText()).includes('対応する Minecraft の版'));
    assert.ok((await publicPage.locator('main').innerText()).includes('対応バージョン・ポート'));
    assert.ok(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px access has no overflow`);
    if (screenshots) await publicPage.screenshot({ path: `${screenshots}/access-${width}.png`, fullPage: true });
    await publicPage.goBack();
    await publicPage.locator('.hero-connection').waitFor();
    assert.equal(new URL(publicPage.url()).pathname, '/');
  }
  assert.deepEqual(errors, []);
  console.log('Passed: editor green across Home buttons, independent button color/brand, save/reload/undo/redo/preview, legacy JSON migration, access draft isolation, public access navigation/back, PC/390/320px no overflow, no server writes or runtime errors.');
}
finally { await browser.close(); }
