/**
 * Analysis module for SQL Time Study data.
 *
 * Computes learning curve regression, per-round summaries, difficulty scoring,
 * and SQL complexity metrics from a completed (or partial) study session.
 *
 * All math is plain TypeScript — no external dependencies. The power law
 * learning curve model is:
 *
 *   T_n = T_1 * n^b
 *
 * Linearized:
 *   ln(T) = ln(T_1) + b * ln(n)
 *
 * We solve via ordinary least squares on the log-transformed data.
 */

import type { StudySession, TaskAttempt } from '@/types';

// ---------------------------------------------------------------------------
// Public result types
// ---------------------------------------------------------------------------

export interface LearningCurveResult {
  /** Learning exponent b (slope of log-log fit). Negative means improvement. */
  exponent: number;
  /** Learning rate = 2^b. E.g., b=-0.322 → 80% learning rate. */
  learningRate: number;
  /** ln(T_1) intercept — predicted log-time for the first task. */
  intercept: number;
  /** T_1 = e^intercept — predicted time (sec) for the first task. */
  predictedFirstTaskTime: number;
  /** Coefficient of determination. 1.0 = perfect fit. */
  rSquared: number;
  /** Number of observations used in the fit. */
  n: number;
  /** Per-observation residuals: actual - predicted (in log space). */
  residuals: number[];
  /** Predicted times for each observation (in original seconds). */
  predictedTimes: number[];
}

export interface RoundSummary {
  round: number;
  title: string;
  tasksCompleted: number;
  totalTasks: number;
  totalTimeSec: number;
  avgTimeSec: number;
  medianTimeSec: number;
  minTimeSec: number;
  maxTimeSec: number;
  totalAttempts: number;
  avgAttempts: number;
  firstTrySuccessRate: number;
}

export interface TaskDifficulty {
  taskId: string;
  round: number;
  queryNum: number;
  querySequence: number;
  timeSec: number;
  attempts: number;
  /** Composite difficulty score 0-100. Higher = harder. */
  difficultyScore: number;
  /** Whether this task was solved on the first try. */
  firstTrySuccess: boolean;
  sqlComplexity: SqlComplexity;
}

export interface SqlComplexity {
  queryLength: number;
  hasJoin: boolean;
  hasGroupBy: boolean;
  hasSubquery: boolean;
  hasOrderBy: boolean;
  hasHaving: boolean;
  hasCaseWhen: boolean;
  joinCount: number;
  /** Simple complexity tier: 1 (basic) to 5 (advanced). */
  tier: number;
}

export interface AnalysisResult {
  learningCurve: LearningCurveResult | null;
  roundSummaries: RoundSummary[];
  taskDifficulties: TaskDifficulty[];
  overallStats: OverallStats;
}

export interface OverallStats {
  totalTimeSec: number;
  totalTasks: number;
  completedTasks: number;
  totalAttempts: number;
  avgTimeSec: number;
  medianTimeSec: number;
  avgAttempts: number;
  firstTrySuccessRate: number;
  /** Improvement ratio: time of last 3 tasks / time of first 3 tasks. <1 means improvement. */
  improvementRatio: number;
  /** Standard deviation of task times. */
  timeStdDev: number;
}

// ---------------------------------------------------------------------------
// Round metadata (imported lazily to avoid circular deps in tests)
// ---------------------------------------------------------------------------

const ROUND_TITLES: Record<number, string> = {
  1: 'The Patient',
  2: 'The History',
  3: 'The Pattern',
  4: 'The Root Cause',
  5: 'The Recommendation',
};

const TASKS_PER_ROUND: Record<number, number> = {
  1: 3,
  2: 3,
  3: 4,
  4: 4,
  5: 4,
};

// ---------------------------------------------------------------------------
// Core analysis function
// ---------------------------------------------------------------------------

/**
 * Run full analysis on a study session.
 * Returns null for learningCurve if fewer than 3 successful tasks exist.
 */
export function analyzeSession(session: StudySession): AnalysisResult {
  const successful = getSuccessfulAttempts(session);
  const allAttempts = session.attempts;

  return {
    learningCurve: successful.length >= 3 ? fitLearningCurve(successful) : null,
    roundSummaries: computeRoundSummaries(successful, allAttempts),
    taskDifficulties: computeTaskDifficulties(successful, allAttempts),
    overallStats: computeOverallStats(successful, allAttempts),
  };
}

// ---------------------------------------------------------------------------
// Helpers: extract successful attempts (one per task, sorted by sequence)
// ---------------------------------------------------------------------------

export function getSuccessfulAttempts(session: StudySession): TaskAttempt[] {
  const best = new Map<string, TaskAttempt>();
  for (const a of session.attempts) {
    if (a.isCorrect) {
      best.set(a.taskId, a);
    }
  }
  return Array.from(best.values()).sort((a, b) => a.querySequence - b.querySequence);
}

// ---------------------------------------------------------------------------
// Learning Curve Regression (OLS on log-log)
// ---------------------------------------------------------------------------

export function fitLearningCurve(successful: TaskAttempt[]): LearningCurveResult {
  const n = successful.length;
  if (n < 2) {
    return {
      exponent: 0,
      learningRate: 1,
      intercept: 0,
      predictedFirstTaskTime: 0,
      rSquared: 0,
      n,
      residuals: [],
      predictedTimes: [],
    };
  }

  // x = ln(querySequence), y = ln(timeSec)
  const xs: number[] = [];
  const ys: number[] = [];

  for (const a of successful) {
    // Guard against zero/negative times (shouldn't happen, but be safe)
    const t = Math.max(a.timeSec, 0.01);
    xs.push(Math.log(a.querySequence));
    ys.push(Math.log(t));
  }

  // OLS: y = intercept + slope * x
  const { slope, intercept, rSquared } = ols(xs, ys);

  // Residuals and predicted values
  const residuals: number[] = [];
  const predictedTimes: number[] = [];
  for (let i = 0; i < n; i++) {
    const yHat = intercept + slope * xs[i];
    residuals.push(ys[i] - yHat);
    predictedTimes.push(Math.exp(yHat));
  }

  return {
    exponent: round4(slope),
    learningRate: round4(Math.pow(2, slope)),
    intercept: round4(intercept),
    predictedFirstTaskTime: round4(Math.exp(intercept)),
    rSquared: round4(rSquared),
    n,
    residuals: residuals.map(round4),
    predictedTimes: predictedTimes.map(round4),
  };
}

/** Ordinary least squares for simple linear regression. */
export function ols(xs: number[], ys: number[]): { slope: number; intercept: number; rSquared: number } {
  const n = xs.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumX2 += xs[i] * xs[i];
  }

  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-12) {
    return { slope: 0, intercept: sumY / n, rSquared: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R²
  const yMean = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const yHat = intercept + slope * xs[i];
    ssTot += (ys[i] - yMean) ** 2;
    ssRes += (ys[i] - yHat) ** 2;
  }

  const rSquared = ssTot < 1e-12 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, rSquared };
}

// ---------------------------------------------------------------------------
// Round Summaries
// ---------------------------------------------------------------------------

export function computeRoundSummaries(
  successful: TaskAttempt[],
  allAttempts: TaskAttempt[]
): RoundSummary[] {
  const summaries: RoundSummary[] = [];

  for (let round = 1; round <= 5; round++) {
    const roundSuccessful = successful.filter((a) => a.round === round);
    const roundAll = allAttempts.filter((a) => a.round === round);

    const times = roundSuccessful.map((a) => a.timeSec);
    const sortedTimes = [...times].sort((a, b) => a - b);

    // Count first-try successes: tasks where the first attempt was correct
    const firstAttemptPerTask = new Map<string, boolean>();
    for (const a of roundAll) {
      if (!firstAttemptPerTask.has(a.taskId)) {
        firstAttemptPerTask.set(a.taskId, a.isCorrect);
      }
    }
    const firstTrySuccesses = Array.from(firstAttemptPerTask.values()).filter(Boolean).length;

    summaries.push({
      round,
      title: ROUND_TITLES[round] || `Round ${round}`,
      tasksCompleted: roundSuccessful.length,
      totalTasks: TASKS_PER_ROUND[round] || 0,
      totalTimeSec: round2(times.reduce((s, t) => s + t, 0)),
      avgTimeSec: round2(times.length > 0 ? times.reduce((s, t) => s + t, 0) / times.length : 0),
      medianTimeSec: round2(median(sortedTimes)),
      minTimeSec: round2(sortedTimes[0] ?? 0),
      maxTimeSec: round2(sortedTimes[sortedTimes.length - 1] ?? 0),
      totalAttempts: roundAll.length,
      avgAttempts: round2(roundSuccessful.length > 0 ? roundAll.length / roundSuccessful.length : 0),
      firstTrySuccessRate: round2(
        firstAttemptPerTask.size > 0 ? firstTrySuccesses / firstAttemptPerTask.size : 0
      ),
    });
  }

  return summaries;
}

// ---------------------------------------------------------------------------
// Task Difficulty Scoring
// ---------------------------------------------------------------------------

export function computeTaskDifficulties(
  successful: TaskAttempt[],
  allAttempts: TaskAttempt[]
): TaskDifficulty[] {
  // Count attempts per task
  const attemptCounts = new Map<string, number>();
  for (const a of allAttempts) {
    attemptCounts.set(a.taskId, (attemptCounts.get(a.taskId) || 0) + 1);
  }

  // Check first-try success per task
  const firstAttemptCorrect = new Map<string, boolean>();
  for (const a of allAttempts) {
    if (!firstAttemptCorrect.has(a.taskId)) {
      firstAttemptCorrect.set(a.taskId, a.isCorrect);
    }
  }

  // Find max time and max attempts for normalization
  const maxTime = Math.max(...successful.map((a) => a.timeSec), 1);
  const maxAttempts = Math.max(...Array.from(attemptCounts.values()), 1);

  return successful.map((a) => {
    const attempts = attemptCounts.get(a.taskId) || 1;
    const complexity = analyzeSqlComplexity(a.submittedQuery);

    // Difficulty score: weighted combination of normalized time, attempts, and complexity
    const timeNorm = a.timeSec / maxTime;
    const attemptNorm = (attempts - 1) / Math.max(maxAttempts - 1, 1);
    const complexityNorm = (complexity.tier - 1) / 4;

    const difficultyScore = Math.round(
      (timeNorm * 0.4 + attemptNorm * 0.35 + complexityNorm * 0.25) * 100
    );

    return {
      taskId: a.taskId,
      round: a.round,
      queryNum: a.queryNum,
      querySequence: a.querySequence,
      timeSec: round2(a.timeSec),
      attempts,
      difficultyScore: Math.min(100, Math.max(0, difficultyScore)),
      firstTrySuccess: firstAttemptCorrect.get(a.taskId) ?? false,
      sqlComplexity: complexity,
    };
  });
}

// ---------------------------------------------------------------------------
// SQL Complexity Analysis
// ---------------------------------------------------------------------------

export function analyzeSqlComplexity(sql: string): SqlComplexity {
  const upper = sql.toUpperCase();

  const hasJoin = /\bJOIN\b/.test(upper);
  const hasGroupBy = /\bGROUP\s+BY\b/.test(upper);
  const hasSubquery = /\(\s*SELECT\b/.test(upper);
  const hasOrderBy = /\bORDER\s+BY\b/.test(upper);
  const hasHaving = /\bHAVING\b/.test(upper);
  const hasCaseWhen = /\bCASE\s+WHEN\b/.test(upper);

  // Count JOINs
  const joinCount = (upper.match(/\bJOIN\b/g) || []).length;

  // Tier assignment
  let tier = 1; // basic SELECT/WHERE
  if (hasJoin && !hasGroupBy && !hasSubquery) tier = 2;
  if (hasGroupBy && !hasSubquery) tier = 3;
  if (hasJoin && hasGroupBy) tier = 3;
  if (joinCount >= 2 && hasGroupBy) tier = 4;
  if (hasSubquery || hasHaving || hasCaseWhen) tier = 4;
  if (hasSubquery && (hasGroupBy || joinCount >= 2)) tier = 5;

  return {
    queryLength: sql.length,
    hasJoin,
    hasGroupBy,
    hasSubquery,
    hasOrderBy,
    hasHaving,
    hasCaseWhen,
    joinCount,
    tier,
  };
}

// ---------------------------------------------------------------------------
// Overall Statistics
// ---------------------------------------------------------------------------

export function computeOverallStats(
  successful: TaskAttempt[],
  allAttempts: TaskAttempt[]
): OverallStats {
  const times = successful.map((a) => a.timeSec);
  const sortedTimes = [...times].sort((a, b) => a - b);
  const totalTime = times.reduce((s, t) => s + t, 0);
  const avgTime = times.length > 0 ? totalTime / times.length : 0;

  // First-try success
  const firstAttemptPerTask = new Map<string, boolean>();
  for (const a of allAttempts) {
    if (!firstAttemptPerTask.has(a.taskId)) {
      firstAttemptPerTask.set(a.taskId, a.isCorrect);
    }
  }
  const firstTrySuccesses = Array.from(firstAttemptPerTask.values()).filter(Boolean).length;

  // Improvement ratio: avg of last 3 / avg of first 3
  let improvementRatio = 1;
  if (successful.length >= 6) {
    const first3Avg = successful.slice(0, 3).reduce((s, a) => s + a.timeSec, 0) / 3;
    const last3Avg = successful.slice(-3).reduce((s, a) => s + a.timeSec, 0) / 3;
    improvementRatio = first3Avg > 0 ? last3Avg / first3Avg : 1;
  }

  // Standard deviation
  const variance = times.length > 1
    ? times.reduce((s, t) => s + (t - avgTime) ** 2, 0) / (times.length - 1)
    : 0;

  return {
    totalTimeSec: round2(totalTime),
    totalTasks: 18,
    completedTasks: successful.length,
    totalAttempts: allAttempts.length,
    avgTimeSec: round2(avgTime),
    medianTimeSec: round2(median(sortedTimes)),
    avgAttempts: round2(
      successful.length > 0 ? allAttempts.length / successful.length : 0
    ),
    firstTrySuccessRate: round2(
      firstAttemptPerTask.size > 0 ? firstTrySuccesses / firstAttemptPerTask.size : 0
    ),
    improvementRatio: round4(improvementRatio),
    timeStdDev: round2(Math.sqrt(variance)),
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
