const TEXT_ENCODER = typeof TextEncoder !== 'undefined' ? TextEncoder : globalThis.TextEncoder;
const TEXT_DECODER = typeof TextDecoder !== 'undefined' ? TextDecoder : globalThis.TextDecoder;
const atobFn = typeof atob === 'function' ? atob : (encoded) => Buffer.from(encoded, 'base64').toString('binary');
const btoaFn = typeof btoa === 'function' ? btoa : (binary) => Buffer.from(binary, 'binary').toString('base64');
const DEFAULT_BASE_URL = typeof location !== 'undefined' && typeof location.origin === 'string' && typeof location.pathname === 'string'
  ? `${location.origin}${location.pathname}`
  : 'http://localhost/';

function resolveBaseUrl(base) {
  if (base && typeof base === 'string' && base.length) {
    return base;
  }
  return DEFAULT_BASE_URL;
}

function decodeBinaryToString(base64) {
  const binary = atobFn(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TEXT_DECODER().decode(bytes);
}

function percentDecode(binary) {
  const parts = [];
  for (let i = 0; i < binary.length; i += 1) {
    parts.push(`%${binary.charCodeAt(i).toString(16).padStart(2, '0')}`);
  }
  return decodeURIComponent(parts.join(''));
}

export function encodeScenarioPayload(payload) {
  const encodedJson = JSON.stringify(payload);
  const bytes = new TEXT_ENCODER().encode(encodedJson);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoaFn(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeScenarioPayload(raw) {
  if (typeof raw !== 'string' || !raw.length) {
    throw new Error('Empty payload');
  }
  const sanitized = raw.replace(/-/g, '+').replace(/_/g, '/');
  const padded = sanitized + '==='.slice((sanitized.length + 3) % 4);
  try {
    return JSON.parse(decodeBinaryToString(padded));
  } catch (firstError) {
    try {
      const redecoded = percentDecode(atobFn(raw));
      return JSON.parse(redecoded);
    } catch {
      throw firstError;
    }
  }
}

export function buildScenarioUrl(payload, base) {
  const resolved = resolveBaseUrl(base);
  const url = new URL(resolved);
  url.searchParams.set('scenario', encodeURIComponent(encodeScenarioPayload(payload)));
  return url.toString();
}

export function parseScenarioPayloadFromUrl(urlString, base) {
  if (!urlString) return null;
  try {
    const resolved = resolveBaseUrl(base);
    const parsed = new URL(urlString, resolved);
    const encoded = parsed.searchParams.get('scenario');
    if (!encoded) return null;
    return decodeScenarioPayload(decodeURIComponent(encoded));
  } catch {
    return null;
  }
}
