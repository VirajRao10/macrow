import { describe, it, expect } from 'vitest';
import { buildScenarioUrl, decodeScenarioPayload, encodeScenarioPayload, parseScenarioPayloadFromUrl } from '../js/scenario-share.js';

describe('scenario sharing helpers', () => {
  const payload = {
    name: 'Saved demo',
    category: 'custom',
    params: { govSpending: 12, taxRate: 20 }
  };

  it('round-trips payload via encode/decode', () => {
    const encoded = encodeScenarioPayload(payload);
    const decoded = decodeScenarioPayload(encoded);
    expect(decoded).toEqual(payload);
  });

  it('builds shareable URL with scenario query and parses it back', () => {
    const url = buildScenarioUrl(payload, 'https://example.com/macro');
    expect(url.startsWith('https://example.com/macro')).toBe(true);
    expect(new URL(url).searchParams.has('scenario')).toBe(true);
    const parsed = parseScenarioPayloadFromUrl(url);
    expect(parsed).toEqual(payload);
  });

  it('returns null when scenario param is missing', () => {
    expect(parseScenarioPayloadFromUrl('https://example.com?foo=bar')).toBeNull();
  });

  it('resolves relative URLs when a base is provided', () => {
    const url = buildScenarioUrl(payload, 'https://example.com/macro');
    const relative = url.replace('https://example.com', '');
    const parsed = parseScenarioPayloadFromUrl(relative, 'https://example.com');
    expect(parsed).toEqual(payload);
  });
});
