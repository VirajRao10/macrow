import { describe, it, expect } from 'vitest';
import { topicForTerm, topicCounts, topicTitle, glossaryByTopic } from '../js/topics.js';
import { COURSE, GLOSSARY } from '../js/course.js';

describe('topic assignment', () => {
  it('assigns every glossary term to a module or cross-cutting', () => {
    const grouped = glossaryByTopic();
    const total = Object.values(grouped).reduce((n, arr) => n + arr.length, 0);
    expect(total).toBe(GLOSSARY.length);
  });

  it('returns a topic id that exists in COURSE or is "cross-cutting"', () => {
    const validIds = new Set([...COURSE.map(m => m.id), 'cross-cutting']);
    GLOSSARY.forEach(entry => {
      const topic = topicForTerm(entry.term, entry.definition);
      expect(validIds.has(topic)).toBe(true);
    });
  });

  it('counts are reasonable (every module gets some terms)', () => {
    const counts = topicCounts();
    COURSE.forEach(m => {
      expect(counts[m.id]).toBeGreaterThan(0);
    });
  });

  it('places well-known macro terms in the right module', () => {
    expect(topicForTerm('GDP', '')).toBe('3.1');
    expect(topicForTerm('GNI', '')).toBe('3.1');
    expect(topicForTerm('Phillips curve', '')).toBe('3.3');
    expect(topicForTerm('Gini coefficient', '')).toBe('3.4');
    expect(topicForTerm('Quantitative easing', '')).toBe('3.5');
    expect(topicForTerm('Crowding out', '')).toBe('3.6');
    expect(topicForTerm('Supply-side policy', '')).toBe('3.7');
  });

  it('returns a sensible human title for every module id', () => {
    COURSE.forEach(m => {
      const title = topicTitle(m.id);
      expect(title).toContain(m.title);
    });
    expect(topicTitle('cross-cutting')).toBe('Cross-cutting');
    expect(topicTitle('not-a-real-id')).toBe('not-a-real-id');
  });
});
