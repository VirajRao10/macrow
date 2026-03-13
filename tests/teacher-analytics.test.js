import { describe, it, expect } from 'vitest';
import { computeQuizStreak, summarizeTeacherAnalytics } from '../js/teacher-analytics.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 1, 27, 12, 0, 0);

describe('computeQuizStreak', () => {
  it('returns zero when there are no attempts', () => {
    expect(computeQuizStreak([], NOW)).toBe(0);
  });

  it('counts consecutive days and stops when a gap appears', () => {
    const attempts = [
      { ts: NOW - 2 * DAY_MS, score: 85 },
      { ts: NOW - 1 * DAY_MS, score: 70 },
      { ts: NOW, score: 80 },
      { ts: NOW - 4 * DAY_MS, score: 60 }
    ];

    expect(computeQuizStreak(attempts, NOW)).toBe(3);
  });
});

describe('summarizeTeacherAnalytics', () => {
  it('aggregates metrics from stored data', () => {
    const progress = {
      quizAttempts: [
        { ts: NOW - 2 * DAY_MS, score: 85 },
        { ts: NOW - 1 * DAY_MS, score: 70 },
        { ts: NOW, score: 80 }
      ]
    };
    const scenarios = [
      { id: 'a', category: 'recession' },
      { id: 'b', category: 'growth' },
      { id: 'c', category: 'growth' }
    ];
    const assignmentTs = NOW - 1.5 * DAY_MS;
    const teacherData = {
      assignedScenarios: [
        { scenario: 'Recession prompt', assignedAt: assignmentTs }
      ]
    };

    const report = summarizeTeacherAnalytics({ progress, scenarios, teacherData, now: NOW });

    expect(report.attemptsCount).toBe(3);
    expect(report.avgScore).toBe(78.3);
    expect(report.lastScore).toBe(80);
    expect(report.bestScore).toBe(85);
    expect(report.streak).toBe(3);
    expect(report.lastAttemptTs).toBe(NOW);
    expect(report.totalScenarios).toBe(3);
    expect(report.scenarioCategories).toBe(2);
    expect(report.assignmentsCount).toBe(1);
    expect(report.lastAssignmentTs).toBe(assignmentTs);
  });

  it('returns safe defaults when data is missing', () => {
    const report = summarizeTeacherAnalytics();
    expect(report.attemptsCount).toBe(0);
    expect(report.avgScore).toBeNull();
    expect(report.lastScore).toBeNull();
    expect(report.bestScore).toBeNull();
    expect(report.streak).toBe(0);
    expect(report.totalScenarios).toBe(0);
    expect(report.scenarioCategories).toBe(0);
    expect(report.assignmentsCount).toBe(0);
    expect(report.lastAssignmentTs).toBeNull();
  });
});
