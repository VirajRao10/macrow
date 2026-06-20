import { describe, it, expect } from 'vitest';
import { QUIZZES, getQuiz } from '../js/quizzes.js';
import { COURSE } from '../js/course.js';

describe('quizzes', () => {
  it('has a quiz for every module', () => {
    COURSE.forEach(m => {
      expect(QUIZZES[m.id], `missing quiz for ${m.id}`).toBeDefined();
    });
  });

  it('every quiz has at least 5 questions', () => {
    Object.entries(QUIZZES).forEach(([id, q]) => {
      expect(q.questions.length, `${id} has too few questions`).toBeGreaterThanOrEqual(5);
    });
  });

  it('every multiple-choice / true-false question has matching options', () => {
    Object.entries(QUIZZES).forEach(([id, q]) => {
      q.questions.forEach((question, qi) => {
        if (question.type === 'mc' || question.type === 'tf') {
          expect(Array.isArray(question.options), `${id} q${qi} options`).toBe(true);
          expect(question.options.length, `${id} q${qi} option count`).toBeGreaterThanOrEqual(2);
        }
        if (question.type === 'short') {
          expect(Array.isArray(question.accepted), `${id} q${qi} accepted`).toBe(true);
          expect(question.accepted.length, `${id} q${qi} accepted count`).toBeGreaterThan(0);
        }
        expect(['mc', 'tf', 'short']).toContain(question.type);
        expect(typeof question.correct !== 'undefined' || question.type === 'short').toBe(true);
        expect(typeof question.explain).toBe('string');
      });
    });
  });

  it('MC correct id matches one of the option ids', () => {
    Object.entries(QUIZZES).forEach(([id, q]) => {
      q.questions.forEach((question, qi) => {
        if (question.type === 'mc' || question.type === 'tf') {
          const ids = new Set(question.options.map(o => o.id));
          expect(ids.has(question.correct), `${id} q${qi} correct not in options`).toBe(true);
        }
      });
    });
  });

  it('getQuiz returns null for unknown module id', () => {
    expect(getQuiz('99.9')).toBeNull();
  });
});
