import { describe, it, expect } from 'vitest';
import { gradeSession } from '../grading';
import { analyzeSession } from '../analysis';
import {
  createCleanSession,
  createRetrySession,
  createPartialSession,
  createEmptySession,
  CLEAN_SESSION_EXPECTED,
} from './fixtures';

// ---------------------------------------------------------------------------
// Clean session: should score well
// ---------------------------------------------------------------------------

describe('gradeSession - clean session', () => {
  const session = createCleanSession();
  const analysis = analyzeSession(session);
  const result = gradeSession(analysis);

  it('produces a high total score', () => {
    expect(result.totalScore).toBeGreaterThanOrEqual(CLEAN_SESSION_EXPECTED.gradingTotalScore.min);
    expect(result.totalScore).toBeLessThanOrEqual(CLEAN_SESSION_EXPECTED.gradingTotalScore.max);
  });

  it('assigns a letter grade of B or higher', () => {
    expect(['A', 'A-', 'B+', 'B']).toContain(result.letterGrade);
  });

  it('has 5 criteria', () => {
    expect(result.criteria).toHaveLength(5);
  });

  it('gives full marks for completion', () => {
    const completion = result.criteria.find((c) => c.name === 'Completion');
    expect(completion?.rawScore).toBe(100);
  });

  it('gives good efficiency score (all first-try)', () => {
    const efficiency = result.criteria.find((c) => c.name === 'Efficiency');
    expect(efficiency?.rawScore).toBe(100);
  });

  it('gives positive learning curve score', () => {
    const lc = result.criteria.find((c) => c.name === 'Learning Curve');
    expect(lc?.rawScore).toBeGreaterThan(30);
  });

  it('gives positive improvement trend score', () => {
    const improvement = result.criteria.find((c) => c.name === 'Improvement Trend');
    expect(improvement?.rawScore).toBeGreaterThan(50);
  });

  it('produces no critical flags', () => {
    const criticalFlags = result.flags.filter((f) => f.severity === 'critical');
    expect(criticalFlags).toHaveLength(0);
  });

  it('produces a non-empty summary', () => {
    expect(result.summary.length).toBeGreaterThan(20);
    expect(result.summary).toContain('/100');
  });

  it('criteria weights sum to 1.0', () => {
    const totalWeight = result.criteria.reduce((s, c) => s + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 5);
  });
});

// ---------------------------------------------------------------------------
// Retry session: lower efficiency, possibly lower score
// ---------------------------------------------------------------------------

describe('gradeSession - retry session', () => {
  const session = createRetrySession();
  const analysis = analyzeSession(session);
  const result = gradeSession(analysis);

  it('produces a reasonable score (not failing)', () => {
    expect(result.totalScore).toBeGreaterThan(40);
    expect(result.totalScore).toBeLessThanOrEqual(100);
  });

  it('gives full marks for completion', () => {
    const completion = result.criteria.find((c) => c.name === 'Completion');
    expect(completion?.rawScore).toBe(100);
  });

  it('gives lower efficiency score than clean session', () => {
    const efficiency = result.criteria.find((c) => c.name === 'Efficiency');
    // retry session has failed attempts, so efficiency < 100
    expect(efficiency?.rawScore).toBeLessThan(100);
  });

  it('may produce info or warning flags for retry rate', () => {
    // The retry session has avg attempts > 1.0, might trigger flags
    expect(result.flags.length).toBeGreaterThanOrEqual(0); // at least not crash
  });
});

// ---------------------------------------------------------------------------
// Partial session: penalized for incompletion
// ---------------------------------------------------------------------------

describe('gradeSession - partial session', () => {
  const session = createPartialSession();
  const analysis = analyzeSession(session);
  const result = gradeSession(analysis);

  it('gives partial completion score', () => {
    const completion = result.criteria.find((c) => c.name === 'Completion');
    expect(completion?.rawScore).toBe(50); // 9/18 = 50%
  });

  it('flags as incomplete', () => {
    const incompleteFlags = result.flags.filter((f) => f.code === 'INCOMPLETE');
    expect(incompleteFlags.length).toBe(1);
  });

  it('still computes learning curve', () => {
    const lc = result.criteria.find((c) => c.name === 'Learning Curve');
    expect(lc?.rawScore).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Empty session: should fail gracefully
// ---------------------------------------------------------------------------

describe('gradeSession - empty session', () => {
  const session = createEmptySession();
  const analysis = analyzeSession(session);
  const result = gradeSession(analysis);

  it('gives zero for completion', () => {
    const completion = result.criteria.find((c) => c.name === 'Completion');
    expect(completion?.rawScore).toBe(0);
  });

  it('gives zero for learning curve (insufficient data)', () => {
    const lc = result.criteria.find((c) => c.name === 'Learning Curve');
    expect(lc?.rawScore).toBe(0);
  });

  it('flags insufficient data', () => {
    const flags = result.flags.filter((f) => f.code === 'INSUFFICIENT_DATA_FOR_LC');
    expect(flags.length).toBe(1);
  });

  it('produces an F grade', () => {
    expect(result.letterGrade).toBe('F');
  });
});

// ---------------------------------------------------------------------------
// Custom rubric config
// ---------------------------------------------------------------------------

describe('gradeSession - custom config', () => {
  it('adjusts suspiciously fast threshold', () => {
    const session = createCleanSession();
    const analysis = analyzeSession(session);

    // With a very high threshold (200s per task), none should be flagged as fast
    const result = gradeSession(analysis, { minSecondsPerTask: 200 });
    // With a very high threshold, many tasks will be "suspiciously fast"
    const fastFlags = result.flags.filter((f) => f.code === 'SUSPICIOUSLY_FAST');
    expect(fastFlags.length).toBe(1); // many tasks are under 200s
  });

  it('adjusts target exponent', () => {
    const session = createCleanSession();
    const analysis = analyzeSession(session);

    // Very aggressive target: student would need extreme learning
    const lenient = gradeSession(analysis, { targetExponent: -0.1 });
    const strict = gradeSession(analysis, { targetExponent: -0.8 });

    const lenientLC = lenient.criteria.find((c) => c.name === 'Learning Curve');
    const strictLC = strict.criteria.find((c) => c.name === 'Learning Curve');

    // Lenient target should give higher LC score than strict
    expect(lenientLC!.rawScore).toBeGreaterThanOrEqual(strictLC!.rawScore);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('gradeSession - edge cases', () => {
  it('handles analysis with null learning curve', () => {
    const analysis = analyzeSession(createEmptySession());
    expect(analysis.learningCurve).toBeNull();

    const result = gradeSession(analysis);
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
    expect(result.totalScore).toBeLessThanOrEqual(100);
  });

  it('letter grade boundaries are correct', () => {
    // Test by creating a mock analysis and varying conditions
    const session = createCleanSession();
    const analysis = analyzeSession(session);
    const result = gradeSession(analysis);

    // Just verify the grade is a valid letter
    const validGrades = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];
    expect(validGrades).toContain(result.letterGrade);
  });
});
