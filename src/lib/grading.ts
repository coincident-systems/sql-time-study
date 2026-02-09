/**
 * Auto-grading rubric engine for SQL Time Study.
 *
 * Computes a weighted score (0-100) from analysis outputs, with per-criterion
 * breakdowns. Designed to assist — not replace — instructor grading.
 *
 * Rubric criteria:
 *   1. Completion (20%) — Did the student finish all 18 tasks?
 *   2. Learning Curve (25%) — Is the learning exponent negative? How strong?
 *   3. Efficiency (20%) — Low attempt counts, high first-try rate
 *   4. Improvement Trend (15%) — Last-3-avg vs first-3-avg
 *   5. Time Performance (20%) — Reasonable task times, not suspiciously fast
 */

import type { AnalysisResult } from './analysis';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface GradingResult {
  /** Overall weighted score 0-100. */
  totalScore: number;
  /** Letter grade based on totalScore. */
  letterGrade: string;
  /** Per-criterion breakdown. */
  criteria: CriterionResult[];
  /** Anomaly flags for instructor review. */
  flags: GradingFlag[];
  /** Human-readable summary. */
  summary: string;
}

export interface CriterionResult {
  name: string;
  description: string;
  weight: number;
  /** Raw score 0-100 for this criterion. */
  rawScore: number;
  /** Weighted contribution to total (rawScore * weight). */
  weightedScore: number;
  /** Short explanation of the score. */
  rationale: string;
}

export interface GradingFlag {
  severity: 'info' | 'warning' | 'critical';
  code: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface RubricConfig {
  /** Expected total tasks (default 18). */
  totalTasks: number;
  /** Minimum seconds per task to avoid "suspiciously fast" flag (default 3). */
  minSecondsPerTask: number;
  /** Maximum reasonable seconds per task (default 600 = 10 min). */
  maxSecondsPerTask: number;
  /** Target learning exponent for "good" score. More negative = more learning. */
  targetExponent: number;
  /** R² threshold below which the learning curve fit is considered weak (default 0.15). */
  minRSquared: number;
}

const DEFAULT_CONFIG: RubricConfig = {
  totalTasks: 18,
  minSecondsPerTask: 3,
  maxSecondsPerTask: 600,
  targetExponent: -0.3,
  minRSquared: 0.15,
};

// ---------------------------------------------------------------------------
// Main grading function
// ---------------------------------------------------------------------------

export function gradeSession(
  analysis: AnalysisResult,
  config: Partial<RubricConfig> = {}
): GradingResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const flags: GradingFlag[] = [];

  // 1. Completion (20%)
  const completion = scoreCompletion(analysis, cfg, flags);

  // 2. Learning Curve (25%)
  const learningCurve = scoreLearningCurve(analysis, cfg, flags);

  // 3. Efficiency (20%)
  const efficiency = scoreEfficiency(analysis, cfg, flags);

  // 4. Improvement Trend (15%)
  const improvement = scoreImprovement(analysis, cfg, flags);

  // 5. Time Performance (20%)
  const timePerformance = scoreTimePerformance(analysis, cfg, flags);

  const criteria = [completion, learningCurve, efficiency, improvement, timePerformance];
  const totalScore = Math.round(
    criteria.reduce((sum, c) => sum + c.weightedScore, 0)
  );

  return {
    totalScore: Math.min(100, Math.max(0, totalScore)),
    letterGrade: toLetterGrade(totalScore),
    criteria,
    flags,
    summary: buildSummary(totalScore, criteria, flags),
  };
}

// ---------------------------------------------------------------------------
// Criterion scorers
// ---------------------------------------------------------------------------

function scoreCompletion(
  analysis: AnalysisResult,
  cfg: RubricConfig,
  flags: GradingFlag[]
): CriterionResult {
  const weight = 0.20;
  const completed = analysis.overallStats.completedTasks;
  const total = cfg.totalTasks;

  // Full marks for completing all tasks. Partial credit scales linearly.
  const rawScore = Math.round((completed / total) * 100);

  if (completed < total) {
    flags.push({
      severity: completed < total * 0.5 ? 'critical' : 'warning',
      code: 'INCOMPLETE',
      message: `Only ${completed}/${total} tasks completed.`,
    });
  }

  return {
    name: 'Completion',
    description: 'Did the student complete all 18 SQL tasks?',
    weight,
    rawScore,
    weightedScore: round2(rawScore * weight),
    rationale: completed === total
      ? 'All tasks completed.'
      : `${completed}/${total} tasks completed (${Math.round((completed / total) * 100)}%).`,
  };
}

function scoreLearningCurve(
  analysis: AnalysisResult,
  cfg: RubricConfig,
  flags: GradingFlag[]
): CriterionResult {
  const weight = 0.25;
  const lc = analysis.learningCurve;

  if (!lc || lc.n < 3) {
    flags.push({
      severity: 'warning',
      code: 'INSUFFICIENT_DATA_FOR_LC',
      message: 'Not enough data points to fit a learning curve.',
    });
    return {
      name: 'Learning Curve',
      description: 'Evidence of learning (negative exponent, reasonable fit)',
      weight,
      rawScore: 0,
      weightedScore: 0,
      rationale: 'Insufficient data for learning curve analysis.',
    };
  }

  // Score components:
  // - Exponent negativity (60%): How negative is the exponent?
  // - R² goodness-of-fit (40%): How well does the model fit?

  // Exponent scoring: target is cfg.targetExponent (e.g. -0.3).
  // Score 100 if exponent <= target, scale linearly from 0 (exponent=0) to 100 (exponent=target).
  // Positive exponent (getting worse) = 0.
  let exponentScore: number;
  if (lc.exponent >= 0) {
    exponentScore = 0;
    flags.push({
      severity: 'warning',
      code: 'POSITIVE_EXPONENT',
      message: `Learning exponent is positive (${lc.exponent}), indicating no improvement over time.`,
    });
  } else if (lc.exponent <= cfg.targetExponent) {
    exponentScore = 100;
  } else {
    // Linear interpolation: 0 at exponent=0, 100 at exponent=target
    exponentScore = Math.round((lc.exponent / cfg.targetExponent) * 100);
  }

  // R² scoring: 0 to minRSquared = 0, minRSquared to 0.7 = linear 0-100, >0.7 = 100
  let rSquaredScore: number;
  if (lc.rSquared < cfg.minRSquared) {
    rSquaredScore = 0;
    if (lc.exponent < 0) {
      flags.push({
        severity: 'info',
        code: 'WEAK_FIT',
        message: `R² is low (${lc.rSquared}), meaning the learning curve model doesn't explain much variance.`,
      });
    }
  } else if (lc.rSquared >= 0.7) {
    rSquaredScore = 100;
  } else {
    rSquaredScore = Math.round(((lc.rSquared - cfg.minRSquared) / (0.7 - cfg.minRSquared)) * 100);
  }

  const rawScore = Math.round(exponentScore * 0.6 + rSquaredScore * 0.4);

  return {
    name: 'Learning Curve',
    description: 'Evidence of learning (negative exponent, reasonable fit)',
    weight,
    rawScore,
    weightedScore: round2(rawScore * weight),
    rationale: `Exponent: ${lc.exponent} (rate: ${(lc.learningRate * 100).toFixed(1)}%), R²: ${lc.rSquared}.`,
  };
}

function scoreEfficiency(
  analysis: AnalysisResult,
  _cfg: RubricConfig,
  flags: GradingFlag[]
): CriterionResult {
  const weight = 0.20;
  const stats = analysis.overallStats;

  // First-try success rate: 100% = perfect, 0% = 0
  const firstTryScore = Math.round(stats.firstTrySuccessRate * 100);

  // Attempt efficiency: avg 1.0 = 100, avg 3.0+ = 0
  const avgAttempts = stats.avgAttempts;
  let attemptScore: number;
  if (avgAttempts <= 1.0) {
    attemptScore = 100;
  } else if (avgAttempts >= 3.0) {
    attemptScore = 0;
  } else {
    attemptScore = Math.round(((3.0 - avgAttempts) / 2.0) * 100);
  }

  const rawScore = Math.round(firstTryScore * 0.5 + attemptScore * 0.5);

  if (avgAttempts > 2.5) {
    flags.push({
      severity: 'info',
      code: 'HIGH_RETRY_RATE',
      message: `Average ${avgAttempts.toFixed(1)} attempts per task. Student may need SQL fundamentals review.`,
    });
  }

  return {
    name: 'Efficiency',
    description: 'Low attempt counts, high first-try success rate',
    weight,
    rawScore,
    weightedScore: round2(rawScore * weight),
    rationale: `First-try rate: ${(stats.firstTrySuccessRate * 100).toFixed(0)}%, avg attempts: ${avgAttempts.toFixed(1)}.`,
  };
}

function scoreImprovement(
  analysis: AnalysisResult,
  _cfg: RubricConfig,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _flags: GradingFlag[]
): CriterionResult {
  const weight = 0.15;
  const ratio = analysis.overallStats.improvementRatio;

  // Ratio < 1 means improvement. 0.5 or lower = 100. 1.0 = 50. 1.5+ = 0.
  let rawScore: number;
  if (ratio <= 0.5) {
    rawScore = 100;
  } else if (ratio >= 1.5) {
    rawScore = 0;
  } else if (ratio <= 1.0) {
    // 0.5 → 100, 1.0 → 50
    rawScore = Math.round(100 - (ratio - 0.5) * 100);
  } else {
    // 1.0 → 50, 1.5 → 0
    rawScore = Math.round(50 - (ratio - 1.0) * 100);
  }

  return {
    name: 'Improvement Trend',
    description: 'Performance improvement from first 3 to last 3 tasks',
    weight,
    rawScore: Math.min(100, Math.max(0, rawScore)),
    weightedScore: round2(Math.min(100, Math.max(0, rawScore)) * weight),
    rationale: `Improvement ratio: ${ratio.toFixed(2)} (last 3 / first 3 avg time). ${ratio < 1 ? 'Student improved.' : ratio === 1 ? 'No change.' : 'Student got slower.'}`,
  };
}

function scoreTimePerformance(
  analysis: AnalysisResult,
  cfg: RubricConfig,
  flags: GradingFlag[]
): CriterionResult {
  const weight = 0.20;
  const stats = analysis.overallStats;

  // Check for anomalies
  const avgTime = stats.avgTimeSec;
  const tasks = analysis.taskDifficulties;

  // Suspiciously fast: avg < minSecondsPerTask
  const suspiciouslyFast = tasks.filter((t) => t.timeSec < cfg.minSecondsPerTask);
  if (suspiciouslyFast.length > 3) {
    flags.push({
      severity: 'critical',
      code: 'SUSPICIOUSLY_FAST',
      message: `${suspiciouslyFast.length} tasks completed in under ${cfg.minSecondsPerTask}s each. Possible copy-paste or pre-knowledge.`,
    });
  }

  // Very slow: any task over maxSecondsPerTask
  const verySlowTasks = tasks.filter((t) => t.timeSec > cfg.maxSecondsPerTask);
  if (verySlowTasks.length > 0) {
    flags.push({
      severity: 'info',
      code: 'VERY_SLOW_TASKS',
      message: `${verySlowTasks.length} task(s) took over ${cfg.maxSecondsPerTask / 60} minutes.`,
    });
  }

  // Score: reasonable time range gets full marks.
  // Deduct for suspiciously fast or extremely slow.
  let rawScore = 100;

  // Deduct for suspiciously fast tasks (might indicate cheating)
  if (suspiciouslyFast.length > 0) {
    const fastPenalty = Math.min(50, suspiciouslyFast.length * 10);
    rawScore -= fastPenalty;
  }

  // Deduct mildly for very slow tasks (indicates struggle but still effort)
  if (verySlowTasks.length > 0) {
    const slowPenalty = Math.min(20, verySlowTasks.length * 5);
    rawScore -= slowPenalty;
  }

  // Bonus: if avg time is in the "sweet spot" (10-120 sec), full marks
  // Below 5s avg = heavy penalty (likely cheating)
  if (avgTime < 5) {
    rawScore = Math.min(rawScore, 20);
    flags.push({
      severity: 'critical',
      code: 'AVG_TIME_TOO_LOW',
      message: `Average time per task is ${avgTime.toFixed(1)}s. This is unrealistically fast.`,
    });
  }

  return {
    name: 'Time Performance',
    description: 'Reasonable task completion times (not too fast, not excessively slow)',
    weight,
    rawScore: Math.min(100, Math.max(0, rawScore)),
    weightedScore: round2(Math.min(100, Math.max(0, rawScore)) * weight),
    rationale: `Avg time: ${avgTime.toFixed(1)}s. ${suspiciouslyFast.length} fast, ${verySlowTasks.length} slow tasks.`,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toLetterGrade(score: number): string {
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 67) return 'D+';
  if (score >= 63) return 'D';
  if (score >= 60) return 'D-';
  return 'F';
}

function buildSummary(
  totalScore: number,
  criteria: CriterionResult[],
  flags: GradingFlag[]
): string {
  const grade = toLetterGrade(totalScore);
  const best = criteria.reduce((a, b) => (a.rawScore > b.rawScore ? a : b));
  const worst = criteria.reduce((a, b) => (a.rawScore < b.rawScore ? a : b));
  const criticalFlags = flags.filter((f) => f.severity === 'critical');

  let summary = `Score: ${totalScore}/100 (${grade}).`;
  summary += ` Strongest area: ${best.name} (${best.rawScore}/100).`;
  summary += ` Area for growth: ${worst.name} (${worst.rawScore}/100).`;

  if (criticalFlags.length > 0) {
    summary += ` REVIEW NEEDED: ${criticalFlags.map((f) => f.message).join(' ')}`;
  }

  return summary;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
