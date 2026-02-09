/**
 * Deterministic test fixtures for SQL Time Study.
 *
 * Creates a StudySession that simulates a student who starts slow and
 * improves following a power law learning curve:
 *
 *   T_n = 120 * n^(-0.322)   →  ~80% learning rate
 *
 * This gives us known, verifiable outputs for:
 * - Learning curve regression (exponent, R², etc.)
 * - Round summaries
 * - Difficulty scores
 * - Grading rubric
 *
 * Some noise is added to make the data realistic, but the noise is
 * deterministic (seeded) so tests remain stable.
 */

import type { StudySession, TaskAttempt, StudentInfo } from '@/types';

// ---------------------------------------------------------------------------
// Seeded PRNG (same as the app's seed.ts uses)
// ---------------------------------------------------------------------------

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ---------------------------------------------------------------------------
// Reference SQL queries for each task (simplified for test purposes)
// ---------------------------------------------------------------------------

const REFERENCE_QUERIES: Record<string, string> = {
  '1.1': "SELECT * FROM patients WHERE last_name = 'Martinez';",
  '1.2': "SELECT * FROM patients WHERE unit = 'Cardiac B' AND discharge_date IS NULL;",
  '1.3': "SELECT * FROM medications WHERE patient_id = 247 AND scheduled_time >= date('now', '-7 days') ORDER BY scheduled_time;",
  '2.1': 'SELECT e.*, p.name as provider_name FROM encounters e JOIN providers p ON e.provider_id = p.provider_id WHERE e.patient_id = 247;',
  '2.2': 'SELECT m.*, n.name as nurse_name FROM medications m JOIN nurses n ON m.administering_nurse_id = n.nurse_id WHERE m.patient_id = 247;',
  '2.3': 'SELECT d.*, e.encounter_date FROM diagnoses d JOIN encounters e ON d.encounter_id = e.encounter_id WHERE e.patient_id = 247;',
  '3.1': 'SELECT AVG(delay_minutes) as avg_delay FROM medications;',
  '3.2': 'SELECT COUNT(*) as count FROM medications WHERE delay_minutes > 30;',
  '3.3': 'SELECT p.unit, AVG(m.delay_minutes) as avg_delay FROM medications m JOIN patients p ON m.patient_id = p.patient_id GROUP BY p.unit;',
  '3.4': 'SELECT ROUND(100.0 * SUM(CASE WHEN delay_minutes > 15 THEN 1 ELSE 0 END) / COUNT(*), 2) as pct_delayed FROM medications;',
  '4.1': "SELECT n.shift, AVG(m.delay_minutes) as avg_delay FROM medications m JOIN nurses n ON m.administering_nurse_id = n.nurse_id JOIN patients p ON m.patient_id = p.patient_id WHERE p.unit = 'Cardiac B' GROUP BY n.shift;",
  '4.2': 'SELECT n.name, AVG(m.delay_minutes) as avg_delay FROM medications m JOIN nurses n ON m.administering_nurse_id = n.nurse_id GROUP BY n.nurse_id, n.name ORDER BY avg_delay DESC LIMIT 10;',
  '4.3': 'SELECT n.years_experience, AVG(m.delay_minutes) as avg_delay FROM medications m JOIN nurses n ON m.administering_nurse_id = n.nurse_id GROUP BY n.years_experience ORDER BY n.years_experience;',
  '4.4': "SELECT strftime('%H', scheduled_time) as hour, AVG(delay_minutes) as avg_delay FROM medications GROUP BY strftime('%H', scheduled_time) ORDER BY hour;",
  '5.1': 'SELECT n.name, AVG(m.delay_minutes) as avg_delay FROM medications m JOIN nurses n ON m.administering_nurse_id = n.nurse_id GROUP BY n.nurse_id, n.name HAVING AVG(m.delay_minutes) > (SELECT AVG(delay_minutes) FROM medications);',
  '5.2': "SELECT p.unit, SUM(m.delay_minutes) as total_delayed_minutes FROM medications m JOIN patients p ON m.patient_id = p.patient_id WHERE m.delay_minutes > 15 GROUP BY p.unit ORDER BY total_delayed_minutes DESC;",
  '5.3': "SELECT p.unit, COUNT(*) as total_meds, SUM(CASE WHEN m.delay_minutes > 15 THEN 1 ELSE 0 END) as delayed_count, ROUND(100.0 * SUM(CASE WHEN m.delay_minutes > 15 THEN 1 ELSE 0 END) / COUNT(*), 2) as delay_rate FROM medications m JOIN patients p ON m.patient_id = p.patient_id GROUP BY p.unit;",
  '5.4': "SELECT ROUND((SELECT COUNT(*) FROM medications m JOIN patients p ON m.patient_id = p.patient_id WHERE p.unit = 'Cardiac B') * ((SELECT AVG(m.delay_minutes) FROM medications m JOIN patients p ON m.patient_id = p.patient_id WHERE p.unit = 'Cardiac B') - (SELECT AVG(delay_minutes) FROM medications))) as potential_minutes_saved;",
};

// ---------------------------------------------------------------------------
// Task structure: round -> [query numbers]
// ---------------------------------------------------------------------------

const TASK_STRUCTURE: { round: number; queries: number[] }[] = [
  { round: 1, queries: [1, 2, 3] },
  { round: 2, queries: [1, 2, 3] },
  { round: 3, queries: [1, 2, 3, 4] },
  { round: 4, queries: [1, 2, 3, 4] },
  { round: 5, queries: [1, 2, 3, 4] },
];

// ---------------------------------------------------------------------------
// Build the fixture session
// ---------------------------------------------------------------------------

/**
 * Create a complete study session with realistic, deterministic timing data.
 *
 * The base learning curve follows T_n = T1 * n^b with:
 * - T1 = 120 seconds (first task time)
 * - b = -0.322 (80% learning rate)
 * - Gaussian noise with sigma = 5 seconds (seeded)
 *
 * All 18 tasks are completed on the first try (no retries).
 */
export function createCleanSession(): StudySession {
  const rng = seededRandom(42);

  const studentInfo: StudentInfo = {
    studentId: 't42x999',
    sqlExpertise: 2,
  };

  const T1 = 120; // seconds for first task
  const b = -0.322; // learning exponent
  const noiseSigma = 5; // seconds

  const attempts: TaskAttempt[] = [];
  let querySequence = 0;
  const baseTime = new Date('2026-02-01T10:00:00Z').getTime();
  let cumulativeMs = 0;

  for (const { round, queries } of TASK_STRUCTURE) {
    for (const queryNum of queries) {
      querySequence++;
      const taskId = `${round}.${queryNum}`;

      // Power law time with seeded Gaussian noise
      const idealTime = T1 * Math.pow(querySequence, b);
      const noise = gaussianNoise(rng) * noiseSigma;
      const timeSec = Math.max(5, idealTime + noise); // floor at 5 seconds

      cumulativeMs += timeSec * 1000;

      attempts.push({
        studentId: studentInfo.studentId,
        sqlExpertise: studentInfo.sqlExpertise,
        round,
        queryNum,
        taskId,
        querySequence,
        attemptNum: 1,
        timeSec: parseFloat(timeSec.toFixed(2)),
        totalAttempts: 1,
        submittedQuery: REFERENCE_QUERIES[taskId] || `SELECT * FROM table_${querySequence};`,
        completedAt: new Date(baseTime + cumulativeMs).toISOString(),
        isCorrect: true,
      });
    }
  }

  return {
    studentInfo,
    currentRound: 5,
    currentQuery: 4,
    attempts,
    taskStartTime: null,
    isComplete: true,
  };
}

/**
 * Create a session with retries on some tasks.
 * Tasks 1.1, 2.1, 3.1, 4.1, and 5.1 each get 1-2 wrong attempts before succeeding.
 */
export function createRetrySession(): StudySession {
  const rng = seededRandom(99);

  const studentInfo: StudentInfo = {
    studentId: 'r99z123',
    sqlExpertise: 1,
  };

  const T1 = 150;
  const b = -0.25;
  const noiseSigma = 8;

  const attempts: TaskAttempt[] = [];
  let querySequence = 0;
  const baseTime = new Date('2026-02-01T14:00:00Z').getTime();
  let cumulativeMs = 0;

  for (const { round, queries } of TASK_STRUCTURE) {
    for (const queryNum of queries) {
      querySequence++;
      const taskId = `${round}.${queryNum}`;

      const idealTime = T1 * Math.pow(querySequence, b);
      const noise = gaussianNoise(rng) * noiseSigma;
      const timeSec = Math.max(5, idealTime + noise);

      // Add wrong attempts for first query of each round
      if (queryNum === 1) {
        const wrongAttempts = round <= 3 ? 2 : 1;
        for (let w = 0; w < wrongAttempts; w++) {
          const wrongTime = 10 + rng() * 20;
          cumulativeMs += wrongTime * 1000;
          attempts.push({
            studentId: studentInfo.studentId,
            sqlExpertise: studentInfo.sqlExpertise,
            round,
            queryNum,
            taskId,
            querySequence,
            attemptNum: w + 1,
            timeSec: parseFloat(wrongTime.toFixed(2)),
            totalAttempts: wrongAttempts + 1,
            submittedQuery: 'SELECT * FROM patients LIMIT 1;',
            completedAt: new Date(baseTime + cumulativeMs).toISOString(),
            isCorrect: false,
          });
        }
      }

      // Correct attempt
      cumulativeMs += timeSec * 1000;
      const attemptNum = queryNum === 1 ? (round <= 3 ? 3 : 2) : 1;
      attempts.push({
        studentId: studentInfo.studentId,
        sqlExpertise: studentInfo.sqlExpertise,
        round,
        queryNum,
        taskId,
        querySequence,
        attemptNum,
        timeSec: parseFloat(timeSec.toFixed(2)),
        totalAttempts: queryNum === 1 ? attemptNum : 1,
        submittedQuery: REFERENCE_QUERIES[taskId] || `SELECT * FROM table_${querySequence};`,
        completedAt: new Date(baseTime + cumulativeMs).toISOString(),
        isCorrect: true,
      });
    }
  }

  return {
    studentInfo,
    currentRound: 5,
    currentQuery: 4,
    attempts,
    taskStartTime: null,
    isComplete: true,
  };
}

/**
 * Create a partial session (only 9/18 tasks completed).
 */
export function createPartialSession(): StudySession {
  const clean = createCleanSession();
  // Keep only first 9 attempts (rounds 1-3, first query of round 3)
  const partialAttempts = clean.attempts.slice(0, 9);

  return {
    studentInfo: clean.studentInfo,
    currentRound: 3,
    currentQuery: 4, // would be next task
    attempts: partialAttempts,
    taskStartTime: Date.now(),
    isComplete: false,
  };
}

/**
 * Create an empty session (no attempts).
 */
export function createEmptySession(): StudySession {
  return {
    studentInfo: { studentId: 'e00a000', sqlExpertise: 0 },
    currentRound: 1,
    currentQuery: 1,
    attempts: [],
    taskStartTime: Date.now(),
    isComplete: false,
  };
}

// ---------------------------------------------------------------------------
// Box-Muller transform for Gaussian noise
// ---------------------------------------------------------------------------

function gaussianNoise(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ---------------------------------------------------------------------------
// Expected values for the clean session (pre-computed for test assertions)
// ---------------------------------------------------------------------------

/**
 * Pre-computed expected values for the clean session fixture.
 * These are approximate due to seeded noise, but stable across runs.
 * Tests should use tolerance margins (e.g., +/- 0.05 for exponent).
 */
export const CLEAN_SESSION_EXPECTED = {
  /** The learning exponent should be approximately -0.322 (target was -0.322 with noise) */
  learningExponent: { min: -0.5, max: -0.15 },
  /** Learning rate should be around 80% (2^-0.322 = 0.80) */
  learningRate: { min: 0.65, max: 0.95 },
  /** R² should be decent (>0.3) given low noise */
  rSquared: { min: 0.3, max: 1.0 },
  /** All 18 tasks completed */
  completedTasks: 18,
  /** 18 total attempts (no retries) */
  totalAttempts: 18,
  /** First-try success rate = 1.0 */
  firstTrySuccessRate: 1.0,
  /** Improvement ratio should be < 1 (student got faster) */
  improvementRatio: { min: 0.2, max: 0.8 },
  /** Grading: should score well (>70) given good learning curve and all first-try */
  gradingTotalScore: { min: 70, max: 100 },
};

export const RETRY_SESSION_EXPECTED = {
  learningExponent: { min: -0.5, max: -0.05 },
  completedTasks: 18,
  /** 18 correct + 8 wrong = 26 total attempts */
  totalAttempts: { min: 25, max: 30 },
  /** First-try success rate < 1.0 due to retries on first query of each round */
  firstTrySuccessRate: { min: 0.5, max: 0.85 },
};
