import { describe, it, expect } from 'vitest';
import { buildPracticeFromConcepts, buildQuizQuestions } from '../js/assessments.js';

const glossary = Array.from({ length: 12 }, (_, i) => ({
  term: `Concept ${i + 1}`,
  blurb: `Definition ${i + 1}`
}));

describe('assessment generators', () => {
  it('builds quiz questions with valid options and answers', () => {
    const questions = buildQuizQuestions(glossary, () => 0);
    expect(questions).toHaveLength(10);
    for (const q of questions) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain(q.answer);
    }
  });

  it('randomizes quiz and practice selection when RNG changes', () => {
    const lowQuiz = buildQuizQuestions(glossary, () => 0);
    const highQuiz = buildQuizQuestions(glossary, () => 0.9999);
    expect(lowQuiz.map(q => q.answer)).not.toEqual(highQuiz.map(q => q.answer));

    const lowPractice = buildPracticeFromConcepts(glossary, () => 0);
    const highPractice = buildPracticeFromConcepts(glossary, () => 0.9999);
    expect(lowPractice.map(p => p.prompt)).not.toEqual(highPractice.map(p => p.prompt));
  });
});
