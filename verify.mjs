import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:4174/';
const errors = [];
const consoleMsgs = [];
const requests404 = [];

const browser = await chromium.launch({ args: ['--disable-cache', '--disk-cache-size=0'] });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  bypassCSP: true,
});
await ctx.clearCookies();
await ctx.route('**/*', (route) => {
  const headers = { ...route.request().headers(), 'cache-control': 'no-cache' };
  route.continue({ headers });
});

const page = await ctx.newPage();
page.on('console', msg => {
  consoleMsgs.push(`[${msg.type()}] ${msg.text()}`);
  if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`);
});
page.on('pageerror', err => errors.push(`[pageerror] ${err.message}`));
page.on('response', resp => { if (resp.status() >= 400) requests404.push(`${resp.status()} ${resp.url()}`); });

const assert = (cond, msg) => {
  if (!cond) {
    errors.push(`[assert] ${msg}`);
    console.log(`✗ ${msg}`);
  } else {
    console.log(`✓ ${msg}`);
  }
};

console.log('--- Home (light) ---');
await page.goto(BASE + '?cb=' + Date.now(), { waitUntil: 'networkidle' });
assert(await page.locator('.brand__name').textContent() === 'macrow', 'brand name is macrow');
assert(await page.locator('.brand__logo').isVisible(), 'logo visible in header');
const moduleCards = await page.locator('.moduleCard').count();
assert(moduleCards === 7, `7 module cards rendered (got ${moduleCards})`);
const navItems = await page.locator('.sidebar .navBtn').allTextContents();
assert(navItems.length === 5, `5 sidebar items (got ${navItems.length})`);
const navItemsTrim = navItems.map(s => (s || '').trim());
assert(JSON.stringify(navItemsTrim) === JSON.stringify(['Home', 'Course', 'Simulator', 'Glossary', 'About']), `sidebar order: Home, Course, Simulator, Glossary, About (got ${JSON.stringify(navItemsTrim)})`);

console.log('--- Course ---');
await page.click('.navBtn[data-nav="course"]');
await page.waitForTimeout(200);
const courseItems = await page.locator('.moduleListItem').count();
assert(courseItems === 7, `7 module list items on Course (got ${courseItems})`);

console.log('--- Module view (3.2 AD/AS) ---');
await page.click('.moduleListItem:has-text("Aggregate demand")');
await page.waitForTimeout(200);
assert(await page.locator('#moduleTitle').isVisible(), 'module title shown');
const lessonRows = await page.locator('.lessonListItem').count();
assert(lessonRows === 4, `4 lesson rows in module 3.2 (got ${lessonRows})`);

console.log('--- Lesson view (3.2.1) ---');
await page.click('.lessonListItem:has-text("aggregate demand curve")');
await page.waitForTimeout(300);
const lessonTitle = (await page.locator('#lessonTitle').textContent()) || '';
assert(lessonTitle.includes('aggregate demand curve'), `lesson title set (${lessonTitle})`);
const bodyParas = await page.locator('.lessonBody p').count();
assert(bodyParas > 0, 'lesson has body paragraphs');
const diagramImg = await page.locator('.lessonBody .diagramImg').count();
assert(diagramImg > 0, 'lesson has diagram image');
const diagramCaption = await page.locator('.lessonBody .diagramFrame__caption').count();
assert(diagramCaption > 0, 'lesson has diagram caption');
const keyTerms = await page.locator('.keyTerm').count();
assert(keyTerms > 0, 'lesson has key terms');

await page.click('#lessonComplete');
await page.waitForTimeout(200);
assert(await page.locator('#lessonCompleted').isVisible(), 'lesson shows completed state');

console.log('--- Simulator ---');
await page.click('.navBtn[data-nav="simulator"]');
await page.waitForTimeout(400);
assert(await page.locator('#chartSvg > *').count() > 0, 'chart renders SVG children');
assert(await page.locator('.presetBtn').count() >= 8, 'presets present');
const yVal = await page.locator('#statOutputValue').textContent();
assert(yVal && yVal.startsWith('Y '), `stat output value set (${yVal})`);

await page.click('[data-preset="recession"]');
await page.waitForTimeout(200);
const stateLabel = await page.locator('#gapLabel').textContent();
assert(stateLabel?.toLowerCase().includes('recession') || stateLabel?.toLowerCase().includes('near'), `state label updated (${stateLabel})`);

console.log('--- Glossary ---');
await page.click('.navBtn[data-nav="glossary"]');
await page.waitForTimeout(200);
const glossaryItems = await page.locator('.glossaryItem').count();
assert(glossaryItems >= 30, `glossary has many items (${glossaryItems})`);
await page.fill('#glossarySearch', 'gdp');
await page.waitForTimeout(200);
const filtered = await page.locator('.glossaryItem').count();
assert(filtered < glossaryItems, `search filters (${filtered} < ${glossaryItems})`);

console.log('--- About ---');
await page.click('.navBtn[data-nav="about"]');
await page.waitForTimeout(200);
assert(await page.locator('.aboutGrid').isVisible(), 'about grid visible');

console.log('--- Mobile (375) ---');
await page.setViewportSize({ width: 375, height: 812 });
await page.goto(BASE + '?cb=' + Date.now(), { waitUntil: 'networkidle' });
assert(await page.locator('#btnSidebarOpen').isVisible(), 'hamburger visible on mobile');
assert(!(await page.locator('.sidebar').evaluate(el => el.classList.contains('sidebar--open'))), 'drawer closed initially');
await page.click('#btnSidebarOpen');
await page.waitForTimeout(200);
assert(await page.locator('.sidebar').evaluate(el => el.classList.contains('sidebar--open')), 'drawer opens on hamburger click');
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
assert(!(await page.locator('.sidebar').evaluate(el => el.classList.contains('sidebar--open'))), 'drawer closes on Escape');

console.log('--- Theme ---');
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(BASE + '?cb=' + Date.now(), { waitUntil: 'networkidle' });
assert((await page.evaluate(() => document.documentElement.dataset.theme)) === 'light', 'default theme is light');
await page.click('#themeToggle');
await page.waitForTimeout(150);
assert((await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark', 'theme toggles to dark');
const stored = await page.evaluate(() => localStorage.getItem('macrow_theme_mode_v1'));
assert(stored === 'dark', `theme persisted to dark (${stored})`);

// Screenshots — light mode, fresh state
await page.evaluate(() => {
  localStorage.clear();
  document.documentElement.dataset.theme = 'light';
});
await page.goto(BASE + '?cb=' + Date.now() + '1', { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
await page.screenshot({ path: 'screenshot-home.png' });
console.log('saved screenshot-home.png');

await page.click('.navBtn[data-nav="course"]');
await page.waitForTimeout(300);
await page.screenshot({ path: 'screenshot-course.png' });
console.log('saved screenshot-course.png');

await page.click('.moduleListItem:has-text("Measuring economic activity")');
await page.waitForTimeout(300);
await page.screenshot({ path: 'screenshot-module.png' });
console.log('saved screenshot-module.png');

await page.click('.lessonListItem >> nth=0');
await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshot-lesson.png' });
console.log('saved screenshot-lesson.png');

await page.click('.navBtn[data-nav="simulator"]');
await page.waitForTimeout(500);
await page.screenshot({ path: 'screenshot-simulator.png' });
console.log('saved screenshot-simulator.png');

await page.click('.navBtn[data-nav="glossary"]');
await page.waitForTimeout(300);
await page.screenshot({ path: 'screenshot-glossary.png' });
console.log('saved screenshot-glossary.png');

await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
await page.evaluate(() => localStorage.removeItem('macrow_last_route_v2'));
await page.goto(BASE + '?cb=' + Date.now() + '2', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshot-home-dark.png' });
console.log('saved screenshot-home-dark.png');

await page.setViewportSize({ width: 375, height: 812 });
await page.evaluate(() => document.documentElement.dataset.theme = 'light');
await page.goto(BASE + '?cb=' + Date.now() + '3', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshot-mobile-home.png' });
console.log('saved screenshot-mobile-home.png');

await page.click('#btnSidebarOpen');
await page.waitForTimeout(300);
await page.screenshot({ path: 'screenshot-mobile-drawer.png' });
console.log('saved screenshot-mobile-drawer.png');

console.log('--- summary ---');
console.log('errors:', errors.length, errors.length ? errors : '');
console.log('4xx/5xx:', requests404.length, requests404.length ? requests404 : '');

await browser.close();
process.exit(errors.length > 0 || requests404.length > 0 ? 1 : 0);
