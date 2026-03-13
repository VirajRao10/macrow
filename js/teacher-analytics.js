const DAY_MS = 24 * 60 * 60 * 1000;

export function computeQuizStreak(attempts = [], now = Date.now(), maxDays = 30) {
  const seenDays = new Set();
  attempts.forEach((attempt) => {
    const ts = Number(attempt?.ts);
    if (!Number.isFinite(ts)) return;
    const dayStart = new Date(ts).setHours(0, 0, 0, 0);
    seenDays.add(dayStart);
  });

  let streak = 0;
  let cursor = new Date(now).setHours(0, 0, 0, 0);
  while (streak < maxDays) {
    if (seenDays.has(cursor)) {
      streak += 1;
      cursor -= DAY_MS;
    } else {
      break;
    }
  }
  return streak;
}

export function summarizeTeacherAnalytics({
  progress = {},
  scenarios = [],
  teacherData = {},
  now = Date.now()
} = {}) {
  const attempts = Array.isArray(progress.quizAttempts) ? progress.quizAttempts.filter(Boolean) : [];
  const avgScore = attempts.length
    ? Number((
      attempts.reduce((acc, attempt) => acc + (Number(attempt.score) || 0), 0)
      / attempts.length
    ).toFixed(1))
    : null;
  const sortedAttempts = [...attempts].sort((a, b) => (Number(a.ts) || 0) - (Number(b.ts) || 0));
  const lastAttempt = sortedAttempts[sortedAttempts.length - 1];
  const bestScore = attempts.length
    ? Math.max(...attempts.map((attempt) => Number(attempt.score) || 0))
    : null;
  const streak = computeQuizStreak(sortedAttempts, now);
  const totalScenarios = Array.isArray(scenarios) ? scenarios.length : 0;
  const scenarioCategories = new Set(
    (Array.isArray(scenarios) ? scenarios : [])
      .map((s) => s?.category)
      .filter(Boolean)
  ).size;
  const assignedScenarios = Array.isArray(teacherData.assignedScenarios)
    ? teacherData.assignedScenarios
    : [];
  const lastAssignment = assignedScenarios[0];

  return {
    attemptsCount: attempts.length,
    avgScore,
    lastScore: lastAttempt ? Number(lastAttempt.score) || null : null,
    lastAttemptTs: lastAttempt ? Number(lastAttempt.ts) || null : null,
    bestScore,
    streak,
    totalScenarios,
    scenarioCategories,
    assignmentsCount: assignedScenarios.length,
    lastAssignmentTs: lastAssignment ? Number(lastAssignment.assignedAt) || null : null
  };
}
