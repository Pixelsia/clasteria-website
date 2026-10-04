import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import { chromium } from 'playwright-core';

const label = text => new RegExp('^' + [...text].map(character => character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*') + '$');

const baseURL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const screenshots = process.env.SCREENSHOT_DIR;
const draftStorageKey = 'clasteria:home-draft:v1';
const published = JSON.parse(await readFile(new URL('../app/utils/homePage.json', import.meta.url), 'utf8'));
const publishedIds = published.sections.map(section => section.id);
const publishedHero = published.sections.find(section => section.kind === 'hero');
const sectionLabels = { hero: 'メインビジュアル', about: 'Clasteria の紹介', news: 'ニュース', contact: 'お問い合わせ' };
const labelsById = new Map(published.sections.map(section => [section.id, sectionLabels[section.kind]]));
const editedTitle = 'ブラウザーで編集した Home の見出し';
const addedTitle = '追加したお問い合わせセクション';
const importedTitle = 'JSON から読み込んだ Home の見出し';
const errors = [];
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
});

// Playwright Core has no expect polling; retry DOM/storage assertions until Vue and autosave settle.
async function eventually(assertion) {
  const deadline = Date.now() + 10_000;
  while (true) {
    try {
      return await assertion();
    }
    catch (error) {
      if (Date.now() >= deadline) throw error;
      await setTimeout(50);
    }
  }
}

try {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 1000 } });
  context.on('page', page => page.on('pageerror', error => errors.push(`${page.url()}: ${error.message}`)));
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  if (screenshots) await mkdir(screenshots, { recursive: true });

  const canvas = page.frameLocator('.editor-canvas iframe.gjs-frame');
  const canvasSections = canvas.locator('[data-editor-section]');
  const sectionList = page.getByRole('list', { name: 'セクション一覧' });
  const sectionButtons = sectionList.getByRole('button');
  const titleField = page.getByLabel('見出し', { exact: true });

  async function ready() {
    await page.getByRole('heading', { name: label('Home を編集') }).waitFor();
    await eventually(async () => {
      assert.ok(await page.getByRole('button', { name: /この\s*PC\s*に\s*保存/ }).isEnabled());
    });
    await canvas.locator('.home-section-hero h1').waitFor();
  }

  async function canvasOrder(ids) {
    await eventually(async () => {
      const actual = await canvasSections.evaluateAll(nodes => nodes.map(node => node.dataset.editorSection));
      assert.deepEqual(actual, ids, 'canvas section order');
      const list = (await sectionButtons.allTextContents()).map(text => text.trim());
      assert.deepEqual(list, ids.map((id, index) => `${index + 1}. ${labelsById.get(id)}`), 'section list matches canvas order');
    });
  }

  async function draft() {
    // Observe persisted browser state without injecting documents or accessing the editor model.
    return page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), draftStorageKey);
  }

  async function exportDraft() {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /この\s*PC\s*に\s*保存/ }).click(),
    ]);
    assert.equal(download.suggestedFilename(), 'clasteria-home-draft.json');
    assert.equal(await download.failure(), null, 'JSON download succeeds');
    return JSON.parse(await readFile(await download.path(), 'utf8'));
  }

  async function importDraft(document) {
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: /PC\s*の\s*ファイルを\s*読み込む/ }).click(),
    ]);
    await chooser.setFiles({
      name: 'clasteria-home-draft.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(document)),
    });
  }

  const response = await page.goto(`${baseURL}/editor`, { waitUntil: 'domcontentloaded' });
  assert.equal(response.status(), 200, '/editor responds successfully');
  await ready();
  if (screenshots) await page.screenshot({ path: `${screenshots}/editor-modern-desktop.png`, fullPage: true });
  assert.equal(await page.getByRole('alert').count(), 0, 'editor loads without an error notice');
  await canvasOrder(publishedIds);
  await eventually(async () => assert.equal(await canvas.locator('.home-section').count(), published.sections.length));
  assert.ok(await canvas.locator('.home-section-hero picture img').isVisible(), 'real hero image renders in the iframe');
  assert.equal(await canvas.locator('[data-editor-section="hero"] [data-editor-field="primaryLabel"], [data-editor-section="hero"] [data-editor-field="secondaryLabel"]').count(), 0, 'hero action links stay hidden');
  assert.equal(await titleField.inputValue(), publishedHero.content.title);
  assert.ok(await page.getByRole('button', { name: label('複製') }).isDisabled(), 'hero cannot be duplicated');
  assert.ok(await page.getByRole('button', { name: label('削除') }).isDisabled(), 'hero cannot be deleted');

  // Edit the rendered text itself, including a line break, then flush directly to preview.
  const inlineTitle = canvas.locator('[data-editor-section="hero"] [data-editor-field="title"]');
  await inlineTitle.dblclick();
  await inlineTitle.fill('画面から直接編集\n入力を保持');
  await page.getByRole('button', { name: label('プレビュー') }).click();
  await page.getByRole('heading', { name: /画面から直接編集/ }).waitFor();
  await page.getByRole('link', { name: /編集に\s*戻る/ }).click();
  await ready();
  assert.match(await titleField.inputValue(), /画面から直接編集\n入力を保持/);
  await inlineTitle.dblclick();
  await inlineTitle.fill('取り消す文章');
  await inlineTitle.press('Escape');
  await eventually(async () => assert.match(await titleField.inputValue(), /画面から直接編集/));

  // ボタンの直接編集は、表示中の紹介セクションで確認する。
  await sectionList.getByRole('button', { name: /Clasteria の紹介/ }).click();
  const inlineButton = canvas.locator('[data-editor-section="about"] [data-editor-field="primaryLabel"]');
  await inlineButton.dblclick();
  await inlineButton.fill('編集したボタン');
  await inlineButton.press('Enter');
  await eventually(async () => assert.equal(await page.getByLabel('ボタンの文字', { exact: true }).inputValue(), '編集したボタン'));
  assert.equal(new URL(page.url()).pathname, '/editor', 'editing a link label keeps the editor open');

  await sectionList.getByRole('button', { name: /メインビジュアル/ }).click();
  await titleField.fill(editedTitle);
  await titleField.press('Tab');
  await canvas.getByText(editedTitle, { exact: true }).waitFor();

  await sectionList.getByRole('button', { name: /Clasteria の紹介/ }).click();
  await page.getByRole('button', { name: label('上へ') }).click();
  const movedIds = [publishedIds[1], publishedIds[0], ...publishedIds.slice(2)];
  await canvasOrder(movedIds);
  await page.getByRole('button', { name: label('元に戻す') }).click();
  await canvasOrder(publishedIds);
  await page.getByRole('button', { name: label('やり直す') }).click();
  await canvasOrder(movedIds);
  await sectionList.getByRole('button', { name: /Clasteria の紹介/ }).click();
  await page.getByRole('button', { name: label('下へ') }).click();
  await canvasOrder(publishedIds);
  assert.ok(await canvas.getByText(editedTitle, { exact: true }).isVisible(), 'reordering preserves edited content');

  await page.getByRole('button', { name: label('＋ お問い合わせ') }).click();
  await eventually(async () => assert.equal(await canvasSections.count(), published.sections.length + 1));
  const addedId = await canvasSections.last().getAttribute('data-editor-section');
  assert.ok(addedId && !publishedIds.includes(addedId), 'added section has a new identity');
  labelsById.set(addedId, sectionLabels.contact);
  await titleField.fill(addedTitle);
  await titleField.press('Tab');
  await canvas.getByText(addedTitle, { exact: true }).waitFor();
  await page.getByRole('button', { name: label('複製') }).click();
  await eventually(async () => {
    assert.equal(await canvasSections.count(), published.sections.length + 2);
    assert.equal(await canvas.getByText(addedTitle, { exact: true }).count(), 2, 'duplicate retains its content');
  });
  const duplicateId = await canvasSections.last().getAttribute('data-editor-section');
  assert.notEqual(duplicateId, addedId, 'duplicate has its own identity');
  await page.getByRole('button', { name: label('削除') }).click();
  await canvasOrder([...publishedIds, addedId]);
  assert.equal(await canvas.getByText(addedTitle, { exact: true }).count(), 1, 'only the duplicate is deleted');

  await eventually(async () => {
    const saved = await draft();
    assert.equal(saved?.sections.length, published.sections.length + 1, 'autosave persists section changes');
    assert.equal(saved.sections.find(section => section.kind === 'hero').content.title, editedTitle);
    assert.equal(saved.sections.at(-1).content.title, addedTitle);
  });
  const saved = await draft();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready();
  await canvas.getByText(editedTitle, { exact: true }).waitFor();
  await canvas.getByText(addedTitle, { exact: true }).waitFor();
  await canvasOrder(saved.sections.map(section => section.id));
  assert.deepEqual(await draft(), saved, 'reload restores the local draft');

  const exported = await exportDraft();
  assert.equal(exported.version, 1);
  assert.equal(exported.page, 'home');
  assert.deepEqual(exported, saved, 'download contains the full edited and reordered document');
  assert.equal(new Set(exported.sections.map(section => section.id)).size, exported.sections.length);

  const invalid = structuredClone(exported);
  const invalidHero = invalid.sections.find(section => section.kind === 'hero');
  invalidHero.content.title = 'この不正な下書きは表示しない';
  invalidHero.content.primaryTo = 'javascript:alert(1)';
  await importDraft(invalid);
  await page.getByRole('alert').waitFor();
  assert.match(await page.getByRole('alert').innerText(), /リンクは公開済みの移動先/);
  assert.equal(await canvas.getByText(invalidHero.content.title, { exact: true }).count(), 0);
  assert.ok(await canvas.getByText(editedTitle, { exact: true }).isVisible());
  assert.deepEqual(await draft(), exported, 'invalid import does not replace the saved draft');
  assert.deepEqual(await exportDraft(), exported, 'invalid import does not replace the current document');

  const imported = structuredClone(exported);
  imported.sections.find(section => section.kind === 'hero').content.title = importedTitle;
  await importDraft(imported);
  await canvas.getByText(importedTitle, { exact: true }).waitFor();
  assert.equal(await page.getByRole('alert').count(), 0, 'valid import clears the previous error');
  await eventually(async () => assert.deepEqual(await draft(), imported, 'valid import is saved'));
  assert.deepEqual(await exportDraft(), imported, 'valid import round-trips through JSON');
  if (screenshots) await page.screenshot({ path: `${screenshots}/editor-1440.png`, fullPage: true });

  await page.getByRole('button', { name: label('プレビュー') }).click();
  await page.waitForURL(`${baseURL}/editor/preview?page=home`);
  await page.locator('.home-section-hero h1').getByText(importedTitle, { exact: true }).waitFor();
  assert.equal(await page.locator('.editor-canvas iframe.gjs-frame').count(), 0, 'preview is the real page, not the editor canvas');
  assert.deepEqual(
    await page.locator('.home-section').evaluateAll(nodes => nodes.map(node => node.dataset.sectionId)),
    imported.sections.map(section => section.id),
    'preview renders the imported document in order',
  );
  if (screenshots) await page.screenshot({ path: `${screenshots}/editor-preview-1440.png`, fullPage: true });

  await page.getByRole('link', { name: label('公開版を見る') }).click();
  await page.waitForURL(`${baseURL}/`);
  await page.locator('.home-section-hero h1').getByText(publishedHero.content.title, { exact: true }).waitFor();
  assert.equal(await page.getByText(importedTitle, { exact: true }).count(), 0, 'local draft never changes the public Home');
  assert.deepEqual(
    await page.locator('.home-section').evaluateAll(nodes => nodes.map(node => node.dataset.sectionId)),
    publishedIds,
    'published page retains its published sections',
  );
  assert.deepEqual(await draft(), imported, 'viewing the public Home does not discard the draft');

  await page.goto(`${baseURL}/editor`, { waitUntil: 'domcontentloaded' });
  await ready();
  await canvas.getByText(importedTitle, { exact: true }).waitFor();
  await page.getByRole('button', { name: label('初期デザインにリセット') }).click();
  const resetDialog = page.getByRole('alertdialog', { name: '下書きをリセット' });
  await resetDialog.waitFor();
  await resetDialog.getByRole('button', { name: label('キャンセル') }).click();
  await resetDialog.waitFor({ state: 'hidden' });
  assert.deepEqual(await draft(), imported, 'cancel keeps the saved draft');
  assert.deepEqual(await exportDraft(), imported, 'cancel keeps the current document');
  await page.getByRole('button', { name: label('初期デザインにリセット') }).click();
  await resetDialog.getByRole('button', { name: label('リセットする') }).click();
  await resetDialog.waitFor({ state: 'hidden' });
  await canvasOrder(publishedIds);
  await canvas.getByText(publishedHero.content.title, { exact: true }).waitFor();
  await eventually(async () => assert.deepEqual(await draft(), published, 'confirmed reset saves the published document'));
  assert.deepEqual(await exportDraft(), published, 'confirmed reset restores all published content');
  await eventually(async () => assert.ok(await page.getByRole('button', { name: label('元に戻す') }).isDisabled(), 'reset clears undo history'));

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.getByRole('button', { name: label('スマートフォン') }).click();
    await canvas.locator('.home-section-hero h1').waitFor();
    await eventually(async () => {
      const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
      assert.ok(fits, `/editor: no horizontal overflow at ${width}px`);
    });
    await titleField.scrollIntoViewIfNeeded();
    assert.ok(await titleField.isVisible(), `editing controls remain reachable at ${width}px`);
    if (screenshots) await page.screenshot({ path: `${screenshots}/editor-${width}.png`, fullPage: true });
  }

  assert.deepEqual(errors, [], 'no uncaught browser errors in editor, canvas, preview, or published Home');
  console.log('Passed: Vue canvas, edit, reorder, undo/redo, add/duplicate/delete, draft reload, JSON export/import validation, real preview, public Home isolation, reset/cancel, mobile overflow, no runtime errors.');
}
finally {
  await browser.close();
}
