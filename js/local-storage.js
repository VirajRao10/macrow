const PROBE_KEY = '__macrow_storage_probe__';

function detectStorage() {
  if (typeof globalThis === 'undefined') {
    return null;
  }
  const candidate = globalThis.localStorage;
  if (!candidate) {
    return null;
  }
  try {
    const testKey = PROBE_KEY;
    candidate.setItem(testKey, testKey);
    candidate.removeItem(testKey);
    return candidate;
  } catch (error) {
    return null;
  }
}

function resolveStorage() {
  return detectStorage();
}

export function storageAvailable() {
  return resolveStorage() !== null;
}

export function storageGet(key, fallback = null) {
  const storage = resolveStorage();
  if (!storage) {
    return fallback;
  }
  try {
    const value = storage.getItem(key);
    return value === null ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

export function storageSet(key, value) {
  const storage = resolveStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(key, value);
  } catch (error) {
    // swallow storage errors (e.g., quota in private mode)
  }
}

export function storageRemove(key) {
  const storage = resolveStorage();
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(key);
  } catch (error) {
    // ignore removal errors
  }
}
