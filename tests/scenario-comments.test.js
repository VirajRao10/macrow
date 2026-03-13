import { describe, it, expect } from 'vitest';
import { normalizeScenarios, addCommentToScenario, formatCommentTimestamp } from '../js/scenario-comments.js';

describe('Scenario comments helpers', () => {
  it('normalizes saved scenarios with defaults and comments', () => {
    const defaults = { delivery: 1, productivity: 2 };
    const raw = [
      {
        id: 'saved-1',
        params: { delivery: 5 },
        comments: [{ id: 'c1', text: 'Keep supply-side note', createdAt: 1000 }]
      }
    ];
    const normalized = normalizeScenarios(raw, defaults);
    expect(normalized).toHaveLength(1);
    expect(normalized[0].params).toEqual({ delivery: 5, productivity: 2 });
    expect(normalized[0].comments).toHaveLength(1);
    expect(normalized[0].comments[0].text).toBe('Keep supply-side note');
  });

  it('adds trimmed comment and honors given timestamp', () => {
    const scenario = { id: 's1', comments: [{ id: 'old', text: 'Existing', createdAt: 1 }] };
    const comment = addCommentToScenario(scenario, '  New insight  ', 123456);
    expect(comment).not.toBeNull();
    expect(comment?.text).toBe('New insight');
    expect(comment?.createdAt).toBe(123456);
    expect(scenario.comments[0]).toBe(comment);
    expect(scenario.comments).toHaveLength(2);
  });

  it('does not add empty comments', () => {
    const scenario = { id: 's2', comments: [] };
    const result = addCommentToScenario(scenario, '   ');
    expect(result).toBeNull();
    expect(scenario.comments).toHaveLength(0);
  });

  it('formats timestamps cleanly', () => {
    const formatted = formatCommentTimestamp(1677628800000);
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
  });

  it('returns empty string for invalid timestamps', () => {
    expect(formatCommentTimestamp('abc')).toBe('');
  });
});
