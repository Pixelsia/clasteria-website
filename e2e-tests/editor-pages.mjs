import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import { chromium } from 'playwright-core';
import { defaultMaintenanceUrl, unpublishedRouteVariants, unpublishedRoutes } from '../shared/utils/maintenance.ts';

// Run against an editor-enabled local/preview build on a supported desktop:
// BASE_URL=http://localhost:3000 CHROMIUM_PATH=/path/to/chrome node e2e-tests/editor-pages.mjs
// This uses a fresh browser context. Server draft reads are fixtures; no remote
// draft is written. Canvas, Vue/Nuxt components, navigation and local storage are real.
const baseURL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const screenshotDirectory = process.env.SCREENSHOT_DIR;
const maintenanceURL = process.env.NUXT_PUBLIC_MAINTENANCE_URL || defaultMaintenanceUrl;
const definitions = [
  { id: 'home', label: 'Home' },
  { id: 'support', label: 'お問い合わせ' },
  { id: 'articles', label: 'ニュース一覧' },
  { id: 'onigokko', label: '鬼ごっこ' },
  { id: 'kakurenbo', label: 'かくれんぼ' },
  { id: 'login', label: 'ログイン' },
  { id: 'register', label: '購入・登録' },
  { id: 'leaderboard', label: 'リーダーボード' },
  { id: 'codingcraft', label: 'CodingCraft 紹介' },
  { id: 'article-draft', label: '新しい記事の下書き' },
];
const publishedHome = JSON.parse(await readFile(new URL('../app/utils/homePage.json', import.meta.url), 'utf8'));
const editedHomeTitle = '旧 Home 下書きとの互換性を確認';
const editedSupportTitle = 'お問い合わせだけを編集した見出し';
const editedPrivateTitle = '非公開ページだけを編集した見出し';
const errors = [];
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: process.env.HEADED !== '1',
  chromiumSandbox: true,
});

async function eventually(assertion) {
  const deadline = Date.now() + 15_000;
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
  const draftRequests = [];
  await context.route('**/api/editor/*', async (route) => {
    const request = route.request();
    draftRequests.push({ method: request.method(), path: new URL(request.url()).pathname });
    assert.equal(request.method(), 'GET', 'this QA script must not write server drafts');
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ draft: null }) });
  });
  context.on('page', (tab) => {
    tab.on('pageerror', error => errors.push(`${tab.url()}: ${error.message}`));
    tab.on('console', (message) => {
      if (message.type() === 'error' || (message.type() === 'warning' && /\[Vue warn\]/.test(message.text()))) {
        errors.push(`${tab.url()}: ${message.text()}`);
      }
    });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  if (screenshotDirectory) await mkdir(screenshotDirectory, { recursive: true });
  const canvas = page.frameLocator('.editor-canvas iframe');
  const selector = page.getByLabel('編集するページ', { exact: true });
  const title = page.getByLabel('見出し', { exact: true });
  const switchDialog = page.getByRole('alertdialog', { name: 'ページを切り替える前の確認' });

  async function ready(id) {
    const definition = definitions.find(item => item.id === id);
    await page.getByRole('heading', { name: `${definition.label} を編集`, exact: true }).waitFor();
    await eventually(async () => {
      assert.ok(await selector.isEnabled(), `${id}: page selector is ready after server check`);
      assert.equal(await selector.inputValue(), id);
      assert.ok(await page.getByRole('button', { name: '下書き書き出し', exact: true }).isEnabled());
      assert.equal(await canvas.locator('h1').count(), 1, `${id}: a real main heading renders`);
      assert.ok(await canvas.locator('h1').isVisible(), `${id}: canvas heading is visible`);
      assert.equal(await page.getByRole('alert').count(), 0, `${id}: no editor errors`);
    });
  }

  async function selectPage(id) {
    await selector.selectOption(id);
    // Empty server fixtures make each page locally unsaved. Exercise the actual
    // save-before-switch confirmation rather than changing URLs or editor state.
    await switchDialog.waitFor();
    await switchDialog.getByRole('button', { name: 'ブラウザーに保管して切り替え', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/editor' && url.searchParams.get('page') === id);
    await ready(id);
  }

  async function exportDraft(id) {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '下書き書き出し', exact: true }).click(),
    ]);
    assert.equal(download.suggestedFilename(), `clasteria-${id}-draft.json`);
    assert.equal(await download.failure(), null);
    const result = JSON.parse(await readFile(await download.path(), 'utf8'));
    assert.equal(result.page, id);
    return result;
  }

  async function importDraft(document) {
    await page.getByLabel('下書き JSON ファイル', { exact: true }).setInputFiles({
      name: `clasteria-${document.page}-draft.json`, mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(document)),
    });
  }

  async function stored(id) {
    return page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), `clasteria:${id}-draft:v1`);
  }

  async function checkCanvas(document) {
    await eventually(async () => {
      assert.deepEqual(
        await canvas.locator('[data-editor-section]').evaluateAll(nodes => nodes.map(node => node.dataset.editorSection)),
        document.sections.map(section => section.id), `${document.page}: all section wrappers render in order`,
      );
      assert.equal(await canvas.locator('.home-section, .page-section').count(), document.sections.length);
    });
    for (const section of document.sections) {
      const wrapper = canvas.locator(`[data-editor-section="${section.id}"]`);
      const expectedText = section.content.title || section.content.emailTitle || section.content.body;
      if (expectedText) assert.ok((await wrapper.innerText()).includes(expectedText), `${document.page}/${section.id}: content`);
      assert.ok(await wrapper.evaluate(element => element.getBoundingClientRect().height > 0), 'nonempty canvas section');
    }
    for (const image of await canvas.locator('img').all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(element => element.decode().catch(() => {}));
      assert.ok(await image.evaluate(element => element.naturalWidth > 0), `${document.page}: image loads in canvas`);
    }
  }

  async function checkLayout(id, width) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await page.getByRole('button', { name: width === 1440 ? 'PC' : 'スマートフォン', exact: true }).click();
    await eventually(async () => {
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${id}: shell fits ${width}px`);
      assert.ok(await canvas.locator('body').evaluate(element => (
        element.ownerDocument.documentElement.scrollWidth <= element.ownerDocument.defaultView.innerWidth
      )), `${id}: canvas fits device width`);
      assert.ok(await canvas.locator('h1').isVisible());
    });
    await title.scrollIntoViewIfNeeded();
    assert.ok(await title.isVisible(), `${id}: editing controls are reachable at ${width}px`);
    if (screenshotDirectory) await page.screenshot({ path: `${screenshotDirectory}/editor-${id}-${width}.png`, fullPage: true });
  }

  async function checkPlazaImage(original) {
    const hero = original.sections.find(section => ['hero', 'page-hero'].includes(section.kind));
    if (!hero) return;
    const src = '/images/clasteria/portal-plaza.png';
    const picker = page.getByLabel('背景画像', { exact: true });
    assert.equal(await picker.locator(`option[value="${src}"]`).innerText(), 'ネザーゲートのある広場');
    await picker.selectOption(src);
    async function loaded(image) {
      await image.waitFor();
      await eventually(async () => {
        assert.equal(new URL(await image.evaluate(element => element.currentSrc)).pathname, src);
      });
      await image.evaluate(element => element.decode());
      assert.deepEqual(await image.evaluate(element => [element.naturalWidth, element.naturalHeight]), [1920, 1009]);
    }
    await loaded(canvas.locator(`[data-editor-section="${hero.id}"] img`));
    const draft = await exportDraft(original.page);
    assert.equal(draft.sections.find(section => section.id === hero.id).content.image, src);
    await importDraft(draft);
    await eventually(async () => assert.deepEqual(await stored(original.page), draft));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await ready(original.page);
    assert.equal(await picker.inputValue(), src);
    await loaded(canvas.locator(`[data-editor-section="${hero.id}"] img`));
    await page.getByRole('button', { name: 'プレビュー', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/editor/preview');
    await loaded(page.locator(`[data-document-page="${original.page}"] img[src="${src}"]`).first());
    if (screenshotDirectory) await page.screenshot({ path: `${screenshotDirectory}/plaza-preview-${original.page}.png`, fullPage: true });
    await page.getByRole('link', { name: '編集に戻る', exact: true }).click();
    await ready(original.page);
    await picker.selectOption(hero.content.image);
    await eventually(async () => assert.deepEqual(await stored(original.page), original));
    assert.deepEqual(await exportDraft(original.page), original, 'image QA restores the isolated original draft');
  }

  const response = await page.goto(`${baseURL}/editor`, { waitUntil: 'domcontentloaded' });
  assert.equal(response.status(), 200);
  await ready('home');
  assert.deepEqual(await selector.locator('option').evaluateAll(nodes => nodes.map(node => node.value)), definitions.map(item => item.id));
  assert.deepEqual(await exportDraft('home'), publishedHome, 'default Home schema remains backward compatible');
  const legacyHome = structuredClone(publishedHome);
  legacyHome.sections.find(section => section.kind === 'hero').content.title = editedHomeTitle;
  await importDraft(legacyHome);
  await eventually(async () => assert.deepEqual(await stored('home'), legacyHome, 'legacy Home JSON uses its original storage key'));

  const originals = new Map();
  for (const definition of definitions) {
    if (definition.id !== 'home') await selectPage(definition.id);
    const document = await exportDraft(definition.id);
    originals.set(definition.id, document);
    await checkCanvas(document);
    await checkLayout(definition.id, 1440);
    await checkLayout(definition.id, 390);
    await checkPlazaImage(document);
    if (definition.id === 'login') {
      assert.equal(await canvas.locator('input:not([disabled])').count(), 0, 'login fields are inactive');
      assert.ok(await canvas.getByRole('button', { name: document.sections.find(item => item.kind === 'login-form').content.primaryLabel }).isDisabled());
    }
    if (definition.id === 'register') {
      assert.ok(await canvas.getByRole('button', { name: document.sections.find(item => item.kind === 'register-form').content.primaryLabel }).isDisabled());
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  assert.deepEqual([...new Set(draftRequests.map(request => request.path))].sort(), definitions.map(item => `/api/editor/${item.id}`).sort());

  await selectPage('support');
  await title.fill(editedSupportTitle);
  await title.press('Tab');
  await page.getByLabel('アクセント色', { exact: true }).fill('#123456');
  await page.getByLabel('背景色', { exact: true }).fill('#fedcba');
  await page.getByLabel('上下の余白', { exact: true }).selectOption('roomy');
  await eventually(async () => {
    assert.equal(await canvas.locator('h1').innerText(), editedSupportTitle);
    assert.equal(await canvas.locator('.page-section-page-hero').evaluate(element => element.style.getPropertyValue('--page-accent')), '#123456');
    const saved = await stored('support');
    assert.equal(saved.sections[0].content.title, editedSupportTitle);
    assert.deepEqual(saved.sections[0].style, { accent: '#123456', background: '#fedcba', spacing: 'roomy' });
  });
  const supportDraft = await exportDraft('support');
  await selector.selectOption('onigokko');
  await switchDialog.getByRole('button', { name: 'キャンセル', exact: true }).click();
  await switchDialog.waitFor({ state: 'hidden' });
  await ready('support');
  assert.deepEqual(await exportDraft('support'), supportDraft, 'canceling a switch retains editor contents');

  await selectPage('onigokko');
  assert.deepEqual(await exportDraft('onigokko'), originals.get('onigokko'), 'support edits do not affect another page');
  await title.fill(editedPrivateTitle);
  await title.press('Tab');
  await eventually(async () => assert.equal((await stored('onigokko')).sections[0].content.title, editedPrivateTitle));
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await switchDialog.waitFor();
  await switchDialog.getByRole('button', { name: 'キャンセル', exact: true }).click();
  await switchDialog.waitFor({ state: 'hidden' });
  await ready('onigokko');
  assert.equal(new URL(page.url()).searchParams.get('page'), 'onigokko', 'canceling browser Back retains the current route');
  assert.equal(await canvas.locator('h1').innerText(), editedPrivateTitle, 'browser Back cannot bypass the unsaved-page guard');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready('onigokko');
  assert.equal(await canvas.locator('h1').innerText(), editedPrivateTitle, 'reload restores the selected page');
  assert.deepEqual(await stored('support'), supportDraft, 'another page draft remains isolated');
  assert.deepEqual(await stored('home'), legacyHome, 'Home draft remains isolated');
  const privateDraft = await exportDraft('onigokko');
  await importDraft(supportDraft);
  await page.getByRole('alert').waitFor();
  assert.match(await page.getByRole('alert').innerText(), /ページ.*(一致|別)|別のページ/);
  assert.deepEqual(await exportDraft('onigokko'), privateDraft, 'cross-page import leaves current content intact');
  assert.deepEqual(await stored('onigokko'), privateDraft, 'cross-page import leaves storage intact');
  await importDraft(privateDraft);
  await ready('onigokko');

  await page.getByRole('button', { name: 'プレビュー', exact: true }).click();
  await page.waitForURL(url => url.pathname === '/editor/preview' && url.searchParams.get('page') === 'onigokko');
  await page.locator('[data-document-page="onigokko"] h1').waitFor();
  assert.equal(await page.locator('[data-document-page="onigokko"] h1').innerText(), editedPrivateTitle);
  assert.equal(await page.locator('.editor-canvas iframe').count(), 0, 'preview is the real component document');
  assert.equal(await page.getByRole('link', { name: '公開版を見る', exact: true }).count(), 0, 'private preview has no public-page link');
  await page.getByRole('link', { name: '編集に戻る', exact: true }).click();
  await ready('onigokko');
  await selectPage('home');
  assert.equal(await canvas.locator('h1').innerText(), editedHomeTitle, 'existing Home draft survives all page switches');

  for (const path of ['/', '/support', '/articles']) {
    await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('h1').count(), 1, `${path}: published page renders`);
    const text = await page.locator('body').innerText();
    for (const edited of [editedHomeTitle, editedSupportTitle, editedPrivateTitle]) assert.ok(!text.includes(edited), `${path}: draft isolation`);
    const links = await page.locator('a[href]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    assert.ok(!links.some(href => unpublishedRoutes.includes(href)), `${path}: public navigation hides private routes`);
  }
  // Stub only the external landing page to test redirect destinations without
  // depending on its uptime. No application route or redirect logic is mocked.
  await page.route(url => url.origin === new URL(maintenanceURL).origin, route => route.fulfill({
    contentType: 'text/html', body: '<!doctype html><title>Maintenance</title><h1>Maintenance</h1>',
  }));
  for (const path of unpublishedRouteVariants) {
    await page.goto(`${baseURL}${path}?draft=do-not-forward`);
    await page.waitForURL(maintenanceURL);
    assert.equal(page.url(), maintenanceURL, `${path}: private route still redirects without forwarding query`);
  }
  assert.deepEqual(errors, [], 'no browser errors or Vue warnings across canvas, preview, and public routes');
  console.log('Passed: all 10 pages, PC/mobile real canvases, legacy Home, page-specific autosave/reload, edit/style isolation, switch cancel, cross-page import rejection, selected-page preview, inactive forms, and safe public routes.');
}
finally {
  await browser.close();
}
