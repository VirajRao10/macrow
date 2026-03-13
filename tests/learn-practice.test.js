import { describe, it, expect } from 'vitest';
import { evaluatePracticeAnswer, computePracticeScore } from '../js/learn-practice.js';

describe('learn practice helpers', () => {
  const sampleQuestion = {
    answer: 'Correct answer',
    explanation: 'Because the model shows that transmission runs that way.'
  };

  it('flags correct selections and keeps explanations', () => {
    const result = evaluatePracticeAnswer(sampleQuestion, 'Correct answer');
    expect(result.isCorrect).toBe(true);
    expect(result.message).toContain('✅ Correct');
    expect(result.message).toContain(sampleQuestion.explanation);
  });

  it('shows the expected answer when a choice is wrong', () => {
    const result = evaluatePracticeAnswer(sampleQuestion, 'Wrong answer');
    expect(result.isCorrect).toBe(false);
    expect(result.message).toContain('❌ Correct answer:');
    expect(result.message).toContain(sampleQuestion.answer);
  });

  it('computes scores even when no outcomes are recorded', () => {
    const emptyScore = computePracticeScore([]);
    expect(emptyScore).toEqual({ total: 0, correct: 0, score: 0 });

    const mixedScore = computePracticeScore([
      { isCorrect: true },
      { isCorrect: false },
      { isCorrect: true }
    ]);
    expect(mixedScore).toEqual({ total: 3, correct: 2, score: 67 });
  });
});
