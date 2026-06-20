import { describe, it, expect } from 'vitest';
import { COURSE } from '../js/course.js';

describe('course enrichment', () => {
  it('every lesson has 2-3 key takeaways', () => {
    COURSE.forEach(mod => {
      mod.lessons.forEach(lesson => {
        expect(Array.isArray(lesson.keyTakeaways), `${lesson.id} missing keyTakeaways`).toBe(true);
        expect(lesson.keyTakeaways.length, `${lesson.id} keyTakeaways count`).toBeGreaterThanOrEqual(2);
        expect(lesson.keyTakeaways.length, `${lesson.id} keyTakeaways too many`).toBeLessThanOrEqual(4);
      });
    });
  });

  it('calculation-heavy lessons have a worked example', () => {
    const lessonsWithExamples = Object.values(COURSE).flatMap(m => m.lessons).filter(l => l.workedExample);
    expect(lessonsWithExamples.length).toBeGreaterThanOrEqual(5);
  });

  it('worked examples have scenario, steps, and answer', () => {
    COURSE.forEach(mod => {
      mod.lessons.forEach(lesson => {
        if (lesson.workedExample) {
          expect(typeof lesson.workedExample.scenario).toBe('string');
          expect(Array.isArray(lesson.workedExample.steps)).toBe(true);
          expect(lesson.workedExample.steps.length).toBeGreaterThan(0);
          expect(typeof lesson.workedExample.answer).toBe('string');
        }
      });
    });
  });

  it('lessons with commonMistakes have at least one item', () => {
    COURSE.forEach(mod => {
      mod.lessons.forEach(lesson => {
        if (lesson.commonMistakes) {
          expect(Array.isArray(lesson.commonMistakes)).toBe(true);
          expect(lesson.commonMistakes.length).toBeGreaterThan(0);
        }
      });
    });
  });

  it('key terms in lessons are non-empty strings', () => {
    COURSE.forEach(mod => {
      mod.lessons.forEach(lesson => {
        if (lesson.keyTerms) {
          expect(lesson.keyTerms.length).toBeGreaterThan(0);
          lesson.keyTerms.forEach(t => expect(typeof t).toBe('string'));
        }
      });
    });
  });
});
