import { describe, it, expect } from 'vitest';
import {
  analyzeSession,
  fitLearningCurve,
  getSuccessfulAttempts,
  computeRoundSummaries,
  computeTaskDifficulties,
  computeOverallStats,
  analyzeSqlComplexity,
  ols,
} from '../analysis';
import {
  createCleanSession,
  createRetrySession,
  createPartialSession,
  createEmptySession,
  CLEAN_SESSION_EXPECTED,
  RETRY_SESSION_EXPECTED,
} from './fixtures';

// ---------------------------------------------------------------------------
// OLS regression
// ---------------------------------------------------------------------------

describe('ols', () => {
  it('fits a perfect linear relationship', () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [2, 4, 6, 8, 10]; // y = 2x
    const result = ols(xs, ys);

    expect(result.slope).toBeCloseTo(2.0, 10);
    expect(result.intercept).toBeCloseTo(0.0, 10);
    expect(result.rSquared).toBeCloseTo(1.0, 10);
  });

  it('fits a relationship with intercept', () => {
    const xs = [0, 1, 2, 3, 4];
    const ys = [3, 5, 7, 9, 11]; // y = 2x + 3
    const result = ols(xs, ys);

    expect(result.slope).toBeCloseTo(2.0, 10);
    expect(result.intercept).toBeCloseTo(3.0, 10);
    expect(result.rSquared).toBeCloseTo(1.0, 10);
  });

  it('handles single point', () => {
    const xs = [1];
    const ys = [5];
    const result = ols(xs, ys);

    // With one point, slope is 0, intercept is the y value
    expect(result.intercept).toBeCloseTo(5.0, 5);
  });

  it('returns 0 R² for constant y', () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [5, 5, 5, 5, 5];
    const result = ols(xs, ys);

    expect(result.slope).toBeCloseTo(0, 5);
    expect(result.rSquared).toBeCloseTo(0, 5);
  });
});

// ---------------------------------------------------------------------------
// SQL Complexity Analysis
// ---------------------------------------------------------------------------

describe('analyzeSqlComplexity', () => {
  it('detects basic SELECT', () => {
    const result = analyzeSqlComplexity("SELECT * FROM patients WHERE last_name = 'Martinez';");
    expect(result.tier).toBe(1);
    expect(result.hasJoin).toBe(false);
    expect(result.hasGroupBy).toBe(false);
    expect(result.hasSubquery).toBe(false);
  });

  it('detects single JOIN', () => {
    const result = analyzeSqlComplexity(
      'SELECT e.*, p.name FROM encounters e JOIN providers p ON e.provider_id = p.provider_id WHERE e.patient_id = 247;'
    );
    expect(result.tier).toBe(2);
    expect(result.hasJoin).toBe(true);
    expect(result.joinCount).toBe(1);
  });

  it('detects GROUP BY', () => {
    const result = analyzeSqlComplexity(
      'SELECT p.unit, AVG(m.delay_minutes) FROM medications m JOIN patients p ON m.patient_id = p.patient_id GROUP BY p.unit;'
    );
    expect(result.tier).toBeGreaterThanOrEqual(3);
    expect(result.hasGroupBy).toBe(true);
  });

  it('detects multi-table JOINs with GROUP BY', () => {
    const result = analyzeSqlComplexity(
      "SELECT n.shift, AVG(m.delay_minutes) FROM medications m JOIN nurses n ON m.administering_nurse_id = n.nurse_id JOIN patients p ON m.patient_id = p.patient_id WHERE p.unit = 'Cardiac B' GROUP BY n.shift;"
    );
    expect(result.tier).toBeGreaterThanOrEqual(4);
    expect(result.joinCount).toBe(2);
  });

  it('detects subqueries', () => {
    const result = analyzeSqlComplexity(
      'SELECT n.name FROM medications m JOIN nurses n ON m.administering_nurse_id = n.nurse_id GROUP BY n.nurse_id, n.name HAVING AVG(m.delay_minutes) > (SELECT AVG(delay_minutes) FROM medications);'
    );
    expect(result.tier).toBeGreaterThanOrEqual(4);
    expect(result.hasSubquery).toBe(true);
    expect(result.hasHaving).toBe(true);
  });

  it('detects CASE WHEN', () => {
    const result = analyzeSqlComplexity(
      'SELECT ROUND(100.0 * SUM(CASE WHEN delay_minutes > 15 THEN 1 ELSE 0 END) / COUNT(*), 2) FROM medications;'
    );
    expect(result.hasCaseWhen).toBe(true);
    expect(result.tier).toBeGreaterThanOrEqual(4);
  });
});

// ---------------------------------------------------------------------------
// Learning Curve Regression
// ---------------------------------------------------------------------------

describe('fitLearningCurve', () => {
  it('fits the clean session with expected exponent range', () => {
    const session = createCleanSession();
    const successful = getSuccessfulAttempts(session);
    const result = fitLearningCurve(successful);

    expect(result.n).toBe(18);
    expect(result.exponent).toBeGreaterThan(CLEAN_SESSION_EXPECTED.learningExponent.min);
    expect(result.exponent).toBeLessThan(CLEAN_SESSION_EXPECTED.learningExponent.max);
    expect(result.learningRate).toBeGreaterThan(CLEAN_SESSION_EXPECTED.learningRate.min);
    expect(result.learningRate).toBeLessThan(CLEAN_SESSION_EXPECTED.learningRate.max);
    expect(result.rSquared).toBeGreaterThan(CLEAN_SESSION_EXPECTED.rSquared.min);
    expect(result.rSquared).toBeLessThan(CLEAN_SESSION_EXPECTED.rSquared.max);
  });

  it('returns correct number of residuals and predicted times', () => {
    const session = createCleanSession();
    const successful = getSuccessfulAttempts(session);
    const result = fitLearningCurve(successful);

    expect(result.residuals).toHaveLength(18);
    expect(result.predictedTimes).toHaveLength(18);
    // Predicted times should all be positive
    result.predictedTimes.forEach((t) => expect(t).toBeGreaterThan(0));
  });

  it('returns degenerate result for < 2 data points', () => {
    const result = fitLearningCurve([]);
    expect(result.n).toBe(0);
    expect(result.exponent).toBe(0);
    expect(result.learningRate).toBe(1);
  });

  it('fits a perfect power law exactly', () => {
    // Create synthetic data: T_n = 100 * n^(-0.5)
    const attempts = Array.from({ length: 10 }, (_, i) => ({
      studentId: 'test',
      sqlExpertise: 0,
      round: 1,
      queryNum: i + 1,
      taskId: `1.${i + 1}`,
      querySequence: i + 1,
      attemptNum: 1,
      timeSec: 100 * Math.pow(i + 1, -0.5),
      totalAttempts: 1,
      submittedQuery: 'SELECT 1;',
      completedAt: new Date().toISOString(),
      isCorrect: true as const,
    }));

    const result = fitLearningCurve(attempts);
    expect(result.exponent).toBeCloseTo(-0.5, 2);
    expect(result.rSquared).toBeCloseTo(1.0, 5);
    expect(result.predictedFirstTaskTime).toBeCloseTo(100, 1);
  });
});

// ---------------------------------------------------------------------------
// Round Summaries
// ---------------------------------------------------------------------------

describe('computeRoundSummaries', () => {
  it('computes summaries for all 5 rounds in clean session', () => {
    const session = createCleanSession();
    const successful = getSuccessfulAttempts(session);
    const summaries = computeRoundSummaries(successful, session.attempts);

    expect(summaries).toHaveLength(5);

    // Round 1: 3 tasks
    expect(summaries[0].round).toBe(1);
    expect(summaries[0].tasksCompleted).toBe(3);
    expect(summaries[0].totalTasks).toBe(3);
    expect(summaries[0].firstTrySuccessRate).toBe(1.0);

    // Round 3: 4 tasks
    expect(summaries[2].round).toBe(3);
    expect(summaries[2].tasksCompleted).toBe(4);
    expect(summaries[2].totalTasks).toBe(4);

    // Round 5: 4 tasks
    expect(summaries[4].round).toBe(5);
    expect(summaries[4].tasksCompleted).toBe(4);
    expect(summaries[4].totalTasks).toBe(4);

    // All summaries should have positive avg times
    summaries.forEach((s) => {
      expect(s.avgTimeSec).toBeGreaterThan(0);
      expect(s.medianTimeSec).toBeGreaterThan(0);
      expect(s.totalTimeSec).toBeGreaterThan(0);
    });
  });

  it('shows lower first-try success rate for retry session', () => {
    const session = createRetrySession();
    const successful = getSuccessfulAttempts(session);
    const summaries = computeRoundSummaries(successful, session.attempts);

    // Round 1 first query had retries, so first-try rate < 1.0
    expect(summaries[0].firstTrySuccessRate).toBeLessThan(1.0);
    // But some rounds might still have some first-try successes
    summaries.forEach((s) => {
      expect(s.firstTrySuccessRate).toBeGreaterThanOrEqual(0);
      expect(s.firstTrySuccessRate).toBeLessThanOrEqual(1);
    });
  });

  it('handles partial session', () => {
    const session = createPartialSession();
    const successful = getSuccessfulAttempts(session);
    const summaries = computeRoundSummaries(successful, session.attempts);

    // Rounds 1 and 2 should be complete
    expect(summaries[0].tasksCompleted).toBe(3);
    expect(summaries[1].tasksCompleted).toBe(3);

    // Round 3 should be partially complete
    expect(summaries[2].tasksCompleted).toBe(3); // 3 of 4

    // Rounds 4 and 5 should be empty
    expect(summaries[3].tasksCompleted).toBe(0);
    expect(summaries[4].tasksCompleted).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Task Difficulties
// ---------------------------------------------------------------------------

describe('computeTaskDifficulties', () => {
  it('computes difficulties for all 18 tasks in clean session', () => {
    const session = createCleanSession();
    const successful = getSuccessfulAttempts(session);
    const difficulties = computeTaskDifficulties(successful, session.attempts);

    expect(difficulties).toHaveLength(18);

    // All should be first-try success in clean session
    difficulties.forEach((d) => {
      expect(d.firstTrySuccess).toBe(true);
      expect(d.attempts).toBe(1);
      expect(d.difficultyScore).toBeGreaterThanOrEqual(0);
      expect(d.difficultyScore).toBeLessThanOrEqual(100);
    });

    // Earlier tasks took more time (student was slower), but later tasks
    // have higher SQL complexity. The time component (40% weight) should
    // still make first tasks score higher on average than the midpoint.
    const firstThree = difficulties.slice(0, 3);
    const avgFirstDifficulty = firstThree.reduce((s, d) => s + d.difficultyScore, 0) / 3;
    // First tasks should have non-trivial difficulty (>20) due to longer times
    expect(avgFirstDifficulty).toBeGreaterThan(20);

    // Verify the time component dominates for early tasks
    const firstTask = difficulties[0];
    expect(firstTask.timeSec).toBeGreaterThan(difficulties[difficulties.length - 1].timeSec);
  });

  it('assigns SQL complexity tiers correctly', () => {
    const session = createCleanSession();
    const successful = getSuccessfulAttempts(session);
    const difficulties = computeTaskDifficulties(successful, session.attempts);

    // Round 1 tasks should be tier 1 (basic SELECT)
    const round1 = difficulties.filter((d) => d.round === 1);
    round1.forEach((d) => {
      expect(d.sqlComplexity.tier).toBeLessThanOrEqual(2);
    });

    // Round 5 tasks should be higher tier
    const round5 = difficulties.filter((d) => d.round === 5);
    round5.forEach((d) => {
      expect(d.sqlComplexity.tier).toBeGreaterThanOrEqual(3);
    });
  });

  it('shows higher attempts for retry tasks', () => {
    const session = createRetrySession();
    const successful = getSuccessfulAttempts(session);
    const difficulties = computeTaskDifficulties(successful, session.attempts);

    // First query of round 1 should have >1 attempt
    const task11 = difficulties.find((d) => d.taskId === '1.1');
    expect(task11?.attempts).toBeGreaterThan(1);
    expect(task11?.firstTrySuccess).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Overall Stats
// ---------------------------------------------------------------------------

describe('computeOverallStats', () => {
  it('computes correct stats for clean session', () => {
    const session = createCleanSession();
    const successful = getSuccessfulAttempts(session);
    const stats = computeOverallStats(successful, session.attempts);

    expect(stats.completedTasks).toBe(CLEAN_SESSION_EXPECTED.completedTasks);
    expect(stats.totalTasks).toBe(18);
    expect(stats.totalAttempts).toBe(CLEAN_SESSION_EXPECTED.totalAttempts);
    expect(stats.firstTrySuccessRate).toBe(CLEAN_SESSION_EXPECTED.firstTrySuccessRate);
    expect(stats.avgTimeSec).toBeGreaterThan(0);
    expect(stats.medianTimeSec).toBeGreaterThan(0);
    expect(stats.timeStdDev).toBeGreaterThan(0);

    // Improvement ratio should show improvement
    expect(stats.improvementRatio).toBeGreaterThan(CLEAN_SESSION_EXPECTED.improvementRatio.min);
    expect(stats.improvementRatio).toBeLessThan(CLEAN_SESSION_EXPECTED.improvementRatio.max);
  });

  it('computes correct stats for retry session', () => {
    const session = createRetrySession();
    const successful = getSuccessfulAttempts(session);
    const stats = computeOverallStats(successful, session.attempts);

    expect(stats.completedTasks).toBe(RETRY_SESSION_EXPECTED.completedTasks);
    expect(stats.totalAttempts).toBeGreaterThan(RETRY_SESSION_EXPECTED.totalAttempts.min);
    expect(stats.totalAttempts).toBeLessThan(RETRY_SESSION_EXPECTED.totalAttempts.max);
    expect(stats.firstTrySuccessRate).toBeGreaterThan(RETRY_SESSION_EXPECTED.firstTrySuccessRate.min);
    expect(stats.firstTrySuccessRate).toBeLessThan(RETRY_SESSION_EXPECTED.firstTrySuccessRate.max);
    expect(stats.avgAttempts).toBeGreaterThan(1.0);
  });

  it('handles empty session', () => {
    const session = createEmptySession();
    const successful = getSuccessfulAttempts(session);
    const stats = computeOverallStats(successful, session.attempts);

    expect(stats.completedTasks).toBe(0);
    expect(stats.totalAttempts).toBe(0);
    expect(stats.avgTimeSec).toBe(0);
    expect(stats.improvementRatio).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Full Analysis Pipeline
// ---------------------------------------------------------------------------

describe('analyzeSession', () => {
  it('returns complete analysis for clean session', () => {
    const session = createCleanSession();
    const analysis = analyzeSession(session);

    expect(analysis.learningCurve).not.toBeNull();
    expect(analysis.roundSummaries).toHaveLength(5);
    expect(analysis.taskDifficulties).toHaveLength(18);
    expect(analysis.overallStats.completedTasks).toBe(18);
  });

  it('returns null learning curve for empty session', () => {
    const session = createEmptySession();
    const analysis = analyzeSession(session);

    expect(analysis.learningCurve).toBeNull();
    expect(analysis.roundSummaries).toHaveLength(5);
    expect(analysis.taskDifficulties).toHaveLength(0);
  });

  it('returns learning curve for partial session (9 tasks)', () => {
    const session = createPartialSession();
    const analysis = analyzeSession(session);

    expect(analysis.learningCurve).not.toBeNull();
    expect(analysis.learningCurve!.n).toBe(9);
    expect(analysis.taskDifficulties).toHaveLength(9);
  });
});
