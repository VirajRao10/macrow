import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:4173/';
const errors = [];
const requests404 = [];

const browser = await chromium.launch({ args: ['--disable-cache', '--disk-cache-size=0'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, bypassCSP: true });
await ctx.clearCookies();
await ctx.route('**/*', (route) => {
  const headers = { ...route.request().headers(), 'cache-control': 'no-cache' };
  route.continue({ headers });
});
const page = await ctx.newPage();
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`);
  if (msg.type() === 'warning') errors.push(`[warn] ${msg.text()}`);
});
page.on('pageerror', err => errors.push(`[pageerror] ${err.message}`));
page.on('response', resp => { if (resp.status() >= 400) requests404.push(`${resp.status()} ${resp.url()}`); });

console.log('--- desktop light ---');
await page.goto(BASE + '?cb=' + Date.now(), { waitUntil: 'networkidle' });

// Light theme default
const themeAttr = await page.evaluate(() => document.documentElement.dataset.theme);
console.log('theme:', themeAttr);

// Logo visible
const logoBox = await page.locator('.brand__logo').boundingBox();
console.log('logo box:', logoBox ? `x=${Math.round(logoBox.x)} y=${Math.round(logoBox.y)} w=${Math.round(logoBox.width)} h=${Math.round(logoBox.height)}` : 'NOT VISIBLE');

// Sidebar items
const navItems = await page.locator('.sidebar .navBtn').allTextContents();
console.log('nav items:', navItems.map(s=>s.trim()));

// Active item
const activeItem = await page.locator('.navBtn[aria-current="page"]').textContent();
console.log('active item:', activeItem?.trim());

// Chart rendered (SVG has children)
const chartChildren = await page.locator('#chartSvg > *').count();
console.log('chart svg children:', chartChildren);

// Y/P/Yf values populated
const yVal = await page.locator('#statOutputValue').textContent();
const pVal = await page.locator('#statPriceValue').textContent();
const yfVal = await page.locator('#statPotentialValue').textContent();
console.log('Y:', yVal, 'P:', pVal, 'Yf:', yfVal);

// Click "Recessionary gap"
await page.click('#btnMakeRecession');
await page.waitForTimeout(300);
const yAfter = await page.locator('#statOutputValue').textContent();
const stateAfter = await page.locator('#gapLabel').textContent();
console.log('after recession -> Y:', yAfter, 'state:', stateAfter);

// Theme toggle
await page.click('#themeToggle');
await page.waitForTimeout(200);
const themeAttr2 = await page.evaluate(() => document.documentElement.dataset.theme);
console.log('after toggle theme:', themeAttr2);
const stored = await page.evaluate(() => localStorage.getItem('macrow_theme_mode_v1'));
console.log('stored theme:', stored);

// Reload and confirm dark persists
await page.reload({ waitUntil: 'networkidle' });
const themeAfterReload = await page.evaluate(() => document.documentElement.dataset.theme);
console.log('after reload theme:', themeAfterReload);

// Toggle back to light
await page.click('#themeToggle');
await page.waitForTimeout(200);

// Click sidebar "Policies"
await page.click('.navBtn[data-tab="policies"]');
await page.waitForTimeout(150);
const activeAfter = await page.locator('.navBtn[aria-current="page"]').textContent();
console.log('after click policies -> active:', activeAfter?.trim());

// Click "Scenarios" — should open scenario overlay
await page.click('#btnScenarios');
await page.waitForTimeout(200);
const scenarioVisible = await page.locator('#scenarioOverlay:not(.hidden)').count();
console.log('scenario overlay visible:', scenarioVisible > 0);
await page.click('#scenarioClose');
await page.waitForTimeout(150);

// Save a scenario
await page.click('#btnScenarios');
await page.waitForTimeout(150);
await page.fill('#scenarioName', 'Verification scenario');
await page.click('#btnSaveScenario');
await page.waitForTimeout(300);
const listItems = await page.locator('#scenarioListRoot *').count();
console.log('scenario list populated:', listItems > 0);

// Open the share panel and copy share link
await page.click('#scenarioClose');
await page.waitForTimeout(150);
await page.click('#btnOpenSharePanel');
await page.waitForTimeout(200);
await page.click('#btnShareLinkPanel');
await page.waitForTimeout(400);
const shareLinkText = await page.evaluate(() => {
  const el = document.getElementById('shareLinkPreview');
  return el ? el.textContent : '';
});
console.log('share link text length:', shareLinkText?.length || 0);
console.log('share link preview snippet:', (shareLinkText || '').slice(0, 100));

// Navigate to Learn
await page.click('.navBtn[data-tab="learn"]');
await page.waitForTimeout(200);
const learnHasContent = await page.locator('#panelLearn .learnCard, #panelLearn h2, #panelLearn .sectionTitle').first().count();
console.log('learn panel has content:', learnHasContent > 0);

// Try clicking the long-run equilibrium diagram button to surface any errors
const lrBtn = page.locator('button:has-text("Long-run"), button:has-text("Long-run equilibrium")').first();
if (await lrBtn.count()) {
  await lrBtn.click().catch(()=>{});
  await page.waitForTimeout(200);
}
const srasErrors = errors.filter(e => e.includes('asLineSegments'));
console.log('asLineSegments errors after LR view:', srasErrors.length);

// Navigate to About
await page.click('.navBtn[data-tab="about"]');
await page.waitForTimeout(150);
const aboutActive = await page.locator('.navBtn[aria-current="page"]').textContent();
console.log('about active:', aboutActive?.trim());

// Sidebar keyboard nav (focus sidebar item then ArrowDown)
await page.focus('.sidebar .navBtn[data-tab="diagram"]');
const focusBeforeArrow = await page.evaluate(() => document.activeElement?.textContent?.trim());
console.log('focus before arrow:', focusBeforeArrow);
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(50);
const focusAfterArrow = await page.evaluate(() => document.activeElement?.textContent?.trim());
console.log('focus after ArrowDown:', focusAfterArrow);

console.log('--- mobile (375x812) ---');
await page.setViewportSize({ width: 375, height: 812 });
await page.reload({ waitUntil: 'networkidle' });
const hamburgerVisible = await page.locator('#btnSidebarOpen').isVisible();
console.log('hamburger visible:', hamburgerVisible);
const sidebarOpenAtStart = await page.locator('.sidebar').evaluate(el => el.classList.contains('sidebar--open'));
console.log('sidebar open at start:', sidebarOpenAtStart);

await page.click('#btnSidebarOpen');
await page.waitForTimeout(200);
const sidebarOpen = await page.locator('.sidebar').evaluate(el => el.classList.contains('sidebar--open'));
console.log('sidebar open after click:', sidebarOpen);

// Click an item -> drawer closes
await page.click('.navBtn[data-tab="policies"]');
await page.waitForTimeout(200);
const sidebarAfterNav = await page.locator('.sidebar').evaluate(el => el.classList.contains('sidebar--open'));
console.log('sidebar open after nav-click:', sidebarAfterNav);

// Reopen + press Escape -> drawer closes
await page.click('#btnSidebarOpen');
await page.waitForTimeout(150);
const sidebarBeforeEsc = await page.locator('.sidebar').evaluate(el => el.classList.contains('sidebar--open'));
console.log('sidebar open before Esc:', sidebarBeforeEsc);
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
const sidebarAfterEsc = await page.locator('.sidebar').evaluate(el => el.classList.contains('sidebar--open'));
console.log('sidebar open after Esc:', sidebarAfterEsc);

// Backdrop click closes — verify it programmatically (sidebar covers most of the area so direct click is blocked)
await page.click('#btnSidebarOpen');
await page.waitForTimeout(150);
const backdropBefore = await page.locator('.sidebarBackdrop').evaluate(el => el.classList.contains('sidebarBackdrop--open'));
console.log('backdrop open before click:', backdropBefore);
// Dispatch the click event directly on the backdrop element (covers the case where sidebar overlays it)
await page.locator('.sidebarBackdrop').dispatchEvent('click');
await page.waitForTimeout(150);
const sidebarAfterBackdrop = await page.locator('.sidebar').evaluate(el => el.classList.contains('sidebar--open'));
console.log('sidebar open after backdrop click:', sidebarAfterBackdrop);

console.log('--- summary ---');
console.log('errors:', errors.length, errors.length ? errors : '');
console.log('4xx/5xx:', requests404.length, requests404.length ? requests404 : '');

// Take screenshots
await page.setViewportSize({ width: 1280, height: 900 });
await page.evaluate(() => document.documentElement.dataset.theme = 'light');
await page.click('.navBtn[data-tab="diagram"]');
await page.waitForTimeout(200);
await page.screenshot({ path: 'screenshot-desktop-light.png', fullPage: false });
console.log('screenshot saved: screenshot-desktop-light.png');

await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
await page.waitForTimeout(150);
await page.screenshot({ path: 'screenshot-desktop-dark.png', fullPage: false });
console.log('screenshot saved: screenshot-desktop-dark.png');

await page.evaluate(() => document.documentElement.dataset.theme = 'light');
await page.click('.navBtn[data-tab="policies"]');
await page.waitForTimeout(150);
await page.screenshot({ path: 'screenshot-policies.png', fullPage: false });
console.log('screenshot saved: screenshot-policies.png');

await page.click('.navBtn[data-tab="learn"]');
await page.waitForTimeout(200);
await page.screenshot({ path: 'screenshot-learn.png', fullPage: false });
console.log('screenshot saved: screenshot-learn.png');

await page.setViewportSize({ width: 375, height: 812 });
await page.evaluate(() => document.documentElement.dataset.theme = 'light');
await page.waitForTimeout(150);
await page.screenshot({ path: 'screenshot-mobile.png', fullPage: false });
console.log('screenshot saved: screenshot-mobile.png');

await page.click('#btnSidebarOpen');
await page.waitForTimeout(250);
await page.screenshot({ path: 'screenshot-mobile-drawer.png', fullPage: false });
console.log('screenshot saved: screenshot-mobile-drawer.png');

await browser.close();
