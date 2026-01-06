import type { TaskAttempt, StudySession, StudentInfo } from '@/types';

const STORAGE_KEY = 'sql-time-study-session';

/**
 * Initialize or retrieve study session from localStorage.
 */
export function getSession(): StudySession {
  if (typeof window === 'undefined') {
    return createEmptySession();
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as StudySession;
    } catch {
      return createEmptySession();
    }
  }
  return createEmptySession();
}

/**
 * Create an empty session.
 */
function createEmptySession(): StudySession {
  return {
    studentInfo: null,
    currentRound: 1,
    currentQuery: 1,
    attempts: [],
    taskStartTime: null,
    isComplete: false,
  };
}

/**
 * Save session to localStorage.
 */
export function saveSession(session: StudySession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

/**
 * Start a new session with student info.
 */
export function startSession(studentInfo: StudentInfo): StudySession {
  const session: StudySession = {
    studentInfo,
    currentRound: 1,
    currentQuery: 1,
    attempts: [],
    taskStartTime: Date.now(),
    isComplete: false,
  };
  saveSession(session);
  return session;
}

/**
 * Log a completed task attempt.
 */
export function logAttempt(
  session: StudySession,
  taskId: string,
  querySequence: number,
  submittedQuery: string,
  timeSec: number,
  attemptNum: number,
  isCorrect: boolean
): StudySession {
  if (!session.studentInfo) return session;

  const [roundStr, queryStr] = taskId.split('.');
  const round = parseInt(roundStr, 10);
  const queryNum = parseInt(queryStr, 10);

  const attempt: TaskAttempt = {
    studentId: session.studentInfo.studentId,
    sqlExpertise: session.studentInfo.sqlExpertise,
    round,
    queryNum,
    taskId,
    querySequence,
    attemptNum,
    timeSec,
    totalAttempts: attemptNum, // Will be updated on final completion
    submittedQuery,
    completedAt: new Date().toISOString(),
    isCorrect,
  };

  const updatedSession = {
    ...session,
    attempts: [...session.attempts, attempt],
  };

  saveSession(updatedSession);
  return updatedSession;
}

/**
 * Update session position (after completing a task).
 */
export function advanceSession(
  session: StudySession,
  nextRound: number,
  nextQuery: number,
  isComplete: boolean = false
): StudySession {
  const updatedSession = {
    ...session,
    currentRound: nextRound,
    currentQuery: nextQuery,
    taskStartTime: isComplete ? null : Date.now(),
    isComplete,
  };
  saveSession(updatedSession);
  return updatedSession;
}

/**
 * Clear session (for testing/reset).
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Export session data as CSV string.
 */
export function exportToCsv(session: StudySession): string {
  if (!session.studentInfo || session.attempts.length === 0) {
    return '';
  }

  // Get only the successful (correct) attempts, keeping the last one per task
  const successfulAttempts = new Map<string, TaskAttempt>();
  for (const attempt of session.attempts) {
    if (attempt.isCorrect) {
      successfulAttempts.set(attempt.taskId, attempt);
    }
  }

  // Count total attempts per task for the total_attempts field
  const attemptCounts = new Map<string, number>();
  for (const attempt of session.attempts) {
    const current = attemptCounts.get(attempt.taskId) || 0;
    attemptCounts.set(attempt.taskId, current + 1);
  }

  // Update total_attempts in successful attempts
  const finalAttempts = Array.from(successfulAttempts.values()).map((attempt) => ({
    ...attempt,
    totalAttempts: attemptCounts.get(attempt.taskId) || 1,
  }));

  // Sort by query sequence
  finalAttempts.sort((a, b) => a.querySequence - b.querySequence);

  // CSV headers
  const headers = [
    'student_id',
    'sql_expertise',
    'round',
    'query_num',
    'task_id',
    'query_sequence',
    'time_sec',
    'total_attempts',
    'completed_at',
  ];

  // CSV rows
  const rows = finalAttempts.map((a) => [
    a.studentId,
    a.sqlExpertise,
    a.round,
    a.queryNum,
    a.taskId,
    a.querySequence,
    a.timeSec.toFixed(2),
    a.totalAttempts,
    a.completedAt,
  ]);

  // Combine
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Trigger CSV download in browser.
 */
export function downloadCsv(session: StudySession): void {
  const csv = exportToCsv(session);
  if (!csv) return;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const studentId = session.studentInfo?.studentId || 'unknown';
  const date = new Date().toISOString().split('T')[0];

  link.setAttribute('href', url);
  link.setAttribute('download', `sql-time-study-${studentId}-${date}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get summary statistics for display.
 */
export function getSessionStats(session: StudySession) {
  const successfulAttempts = session.attempts.filter((a) => a.isCorrect);
  const uniqueTasks = new Set(successfulAttempts.map((a) => a.taskId));

  const totalTime = successfulAttempts.reduce((sum, a) => sum + a.timeSec, 0);
  const avgTime = uniqueTasks.size > 0 ? totalTime / uniqueTasks.size : 0;

  // Count total attempts (including failed)
  const attemptCounts = new Map<string, number>();
  for (const attempt of session.attempts) {
    const current = attemptCounts.get(attempt.taskId) || 0;
    attemptCounts.set(attempt.taskId, current + 1);
  }

  const avgAttempts =
    uniqueTasks.size > 0
      ? Array.from(attemptCounts.values()).reduce((a, b) => a + b, 0) / attemptCounts.size
      : 0;

  return {
    completedTasks: uniqueTasks.size,
    totalTime,
    avgTime,
    avgAttempts,
    totalAttempts: session.attempts.length,
  };
}
