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

  it('includes answer explanations and SRAS/LRAS shift coverage', () => {
    const questions = buildQuizQuestions(glossary, () => 0.42);
    expect(questions.every(q => typeof q.explanation === 'string' && q.explanation.length > 0)).toBe(true);

    const combinedText = questions.map(q => `${q.prompt} ${q.answer}`).join(' ');
    expect(combinedText).toMatch(/SRAS/i);
    expect(combinedText).toMatch(/LRAS/i);
  });

  it('handles empty glossary by returning stable fallback quiz items', () => {
    const questions = buildQuizQuestions([], () => 0.1);
    expect(questions).toHaveLength(10);
    expect(questions.every(q => q.options.length === 4)).toBe(true);
    expect(questions.every(q => q.options.includes(q.answer))).toBe(true);
  });

  it('handles empty practice concepts without crashing', () => {
    const practice = buildPracticeFromConcepts([], () => 0.5);
    expect(practice).toHaveLength(0);
  });
});
