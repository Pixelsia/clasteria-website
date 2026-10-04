import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const baseURL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const legacy = 'https://discord.gg/TwTPa4Yp4h';
const approved = 'https://discord.gg/fsts95chH5';
const label = text => new RegExp([...text].join('\\s*'));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, chromiumSandbox: true });
async function exportDraft(page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'), page.getByRole('button', { name: /この\s*PC\s*に\s*保存/ }).click(),
  ]);
  assert.equal(await download.failure(), null);
  return JSON.parse(await readFile(await download.path(), 'utf8'));
}
async function ready(page) {
  await page.getByRole('button', { name: /この\s*PC\s*に\s*保存/ }).waitFor();
  await page.waitForFunction(() => document.querySelector('.editor-canvas iframe')?.contentDocument?.querySelector('h1'));
  assert.equal(await page.getByRole('alert').count(), 0);
}
try {
  for (const id of ['home', 'support', 'access']) {
    console.log(`Checking ${id} defaults`);
    const seedContext = await browser.newContext();
    await seedContext.route('**/api/editor/*', route => route.fulfill({ contentType: 'application/json', body: '{"draft":null}' }));
    const seedPage = await seedContext.newPage();
    await seedPage.goto(`${baseURL}/editor?page=${id}`);
    await ready(seedPage);
    const source = await exportDraft(seedPage);
    await seedContext.close();
    Object.assign(source.sections[0].content, {
      primaryTo: legacy, title: `保存済み ${id} の見出し\n二行目`, description: `本文中の ${legacy} は保持`,
    });
    source.sections[0].style = { accent: '#AaBbCc', background: '#123456', button: '#654321', spacing: 'roomy' };
    const contact = source.sections.find(section => section.kind === 'support-contact');
    if (contact) contact.content.discordTo = legacy;
    const raw = JSON.stringify(source);
    const expected = structuredClone(source);
    for (const section of expected.sections) {
      for (const key of Object.keys(section.content)) {
        if (key.endsWith('To') && section.content[key] === legacy) section.content[key] = approved;
      }
    }
    for (const mode of ['local', 'server']) {
      console.log(`Checking ${id} ${mode} legacy draft`);
      const context = await browser.newContext();
      const puts = [];
      const errors = [];
      const draft = { document: source, revision: 7, updatedAt: '2026-10-02T19:00:00.000Z' };
      if (mode === 'local') {
        await context.addInitScript(({ id, raw, draft }) => {
          localStorage.setItem(`clasteria:${id}-draft:v1`, raw);
          localStorage.setItem(`clasteria:${id}-draft-server:v1`, JSON.stringify({ current: raw, base: draft }));
        }, { id, raw, draft });
      }
      // Fixture-only API: never read or write a real D1 draft.
      await context.route('**/api/editor/*', async (route) => {
        if (route.request().method() === 'PUT') {
          const body = route.request().postDataJSON();
          puts.push(body);
          await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ draft: {
            document: body.document, revision: body.baseRevision + 1, updatedAt: draft.updatedAt,
          } }) });
        }
        else await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ draft }) });
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${baseURL}/editor?page=${id}`);
      await ready(page);
      const canvas = page.frameLocator('.editor-canvas iframe.gjs-frame');
      await canvas.locator('h1').filter({ hasText: `保存済み ${id}` }).waitFor();
      assert.ok(await canvas.locator(`a[href="${approved}"]`).count() > 0);
      assert.equal(await canvas.locator(`a[href="${legacy}"]`).count(), 0);
      assert.deepEqual(await exportDraft(page), expected);
      assert.deepEqual(puts, [], 'read and file export do not save server drafts');
      await page.getByLabel('見出し', { exact: true }).fill(`明示保存 ${id}`);
      await page.getByLabel('見出し', { exact: true }).blur();
      await page.locator('.editor-secondary-actions > summary').click();
      await Promise.all([
        page.waitForResponse(response => response.request().method() === 'PUT'),
        page.getByRole('button', { name: label('サーバーにバックアップ') }).click({ timeout: 10_000 }),
      ]);
      assert.equal(puts.length, 1);
      assert.equal(puts[0].baseRevision, 7);
      expected.sections[0].content.title = `明示保存 ${id}`;
      assert.deepEqual(puts[0].document, expected);
      expected.sections[0].content.title = source.sections[0].content.title;
      assert.equal(JSON.stringify(source), raw);
      assert.deepEqual(errors, []);
      await context.close();
    }
  }
  console.log('Passed: legacy Home/support/access browser and server fixtures load all edits, display new Discord links, export updated JSON, preserve revision, and PUT only after explicit backup.');
}
finally {
  await browser.close();
}
