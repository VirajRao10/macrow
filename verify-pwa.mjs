import { chromium } from "playwright";

const APP_URL = "http://127.0.0.1:4174";
const CACHE_NAME = "macrow-v23";
const OFFLINE_PATH = "/offline.html";

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`Navigating to ${APP_URL} to trigger service worker registration...`);
  await page.goto(APP_URL, { waitUntil: "load" });

  await page.waitForFunction(() => {
    return typeof navigator !== "undefined" && !!navigator.serviceWorker?.controller;
  }, { timeout: 15000 }).catch(() => null);

  await page.waitForFunction(async (CACHE_NAME) => {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    return keys.length > 0;
  }, { timeout: 15000 }, CACHE_NAME).catch(() => null);

  const swActive = await page.evaluate(async () => {
    if (!navigator.serviceWorker) return false;
    const registration = await navigator.serviceWorker.getRegistration();
    return !!(registration && registration.active && registration.active.state !== "redundant");
  });

  const cachesList = await page.evaluate(async (CACHE_NAME) => {
    if (!caches || !caches.open) return [];
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    return requests.map((req) => new URL(req.url).pathname);
  }, CACHE_NAME);

  const hasOfflineEntry = cachesList.includes(OFFLINE_PATH);
  console.log(`Service worker active: ${swActive}`);
  console.log(`Cached entries (${cachesList.length}): ${cachesList.join(", ")}`);
  console.log(`Offline fallback cached: ${hasOfflineEntry}`);

  console.log("Switching browser context to offline mode...");
  await context.setOffline(true);

  try {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 20000 });
    console.log("Page reloaded offline successfully.");
  } catch (err) {
    console.log("Page reload offline failed (expected if SW not controlling yet):", err.message);
  }

  const offlineTitle = await page.title();
  console.log(`Title after offline reload: ${offlineTitle}`);

  let fallbackError = null;
  try {
    await page.goto(`${APP_URL}/missing-page`, { waitUntil: "domcontentloaded", timeout: 20000 });
    console.log("Navigated to missing page offline (fallback should render)." );
  } catch (err) {
    fallbackError = err;
    console.log("Offline navigation to missing page error (expected):", err.message);
  }

  const offlineHtml = await page.content();
  const offlineCaptured = offlineHtml.includes("You’re offline") || offlineHtml.includes("You're offline");
  console.log(`Offline fallback navigation to missing page satisfied: ${offlineCaptured}`);
  if (fallbackError && !offlineCaptured) {
    console.log("Fallback page likely not served (no offline indicator found).\n");
  }

  await context.setOffline(false);
  await browser.close();

  if (!swActive) {
    console.error("Service worker never became active.");
    process.exit(1);
  }
  if (!hasOfflineEntry) {
    console.error("Offline fallback assets missing from cache.");
    process.exit(1);
  }
  if (!offlineCaptured) {
    console.error("Offline fallback navigation did not render expected content.");
    process.exit(1);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
