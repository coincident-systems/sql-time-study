import yaml from 'js-yaml';
import type { TaskAttempt, StudySession, StudentInfo } from '@/types';
import { analyzeSession } from './analysis';
import { gradeSession } from './grading';
import type { AnalysisResult } from './analysis';
import type { GradingResult } from './grading';

// ---------------------------------------------------------------------------
// Export format type
// ---------------------------------------------------------------------------

export type ExportFormat = 'csv' | 'json' | 'yaml';

// ---------------------------------------------------------------------------
// Structured export payload (used by JSON and YAML)
// ---------------------------------------------------------------------------

export interface ExportPayload {
  metadata: {
    schemaVersion: string;
    exportFormat: string;
    exportedAt: string;
    appVersion: string;
    description: string;
  };
  student: {
    studentId: string;
    sqlExpertise: number;
    expertiseLabel: string;
  };
  observations: ExportObservation[];
  analysis: AnalysisResult;
  grading: GradingResult;
  /** R / Python usage hints embedded in the export */
  usageHints: {
    r: string;
    python: string;
  };
}

export interface ExportObservation {
  student_id: string;
  sql_expertise: number;
  round: number;
  query_num: number;
  task_id: string;
  query_sequence: number;
  time_sec: number;
  total_attempts: number;
  submitted_query: string;
  completed_at: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'sql-time-study-session';
const SCHEMA_VERSION = '2.0.0';
const APP_VERSION = '1.1.0';

const EXPERTISE_LABELS: Record<number, string> = {
  0: 'No experience',
  1: 'Basic (SELECT/WHERE)',
  2: 'Intermediate (JOINs, GROUP BY)',
  3: 'Advanced (subqueries, CTEs)',
};

// ---------------------------------------------------------------------------
// Session CRUD (unchanged)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Prepare final observations (shared across all formats)
// ---------------------------------------------------------------------------

export function prepareFinalObservations(session: StudySession): ExportObservation[] {
  if (!session.studentInfo || session.attempts.length === 0) {
    return [];
  }

  // Get only the successful (correct) attempts, keeping the last one per task
  const successfulAttempts = new Map<string, TaskAttempt>();
  for (const attempt of session.attempts) {
    if (attempt.isCorrect) {
      successfulAttempts.set(attempt.taskId, attempt);
    }
  }

  // Count total attempts per task
  const attemptCounts = new Map<string, number>();
  for (const attempt of session.attempts) {
    const current = attemptCounts.get(attempt.taskId) || 0;
    attemptCounts.set(attempt.taskId, current + 1);
  }

  // Build final observations with updated attempt counts
  const observations = Array.from(successfulAttempts.values()).map((a) => ({
    student_id: a.studentId,
    sql_expertise: a.sqlExpertise,
    round: a.round,
    query_num: a.queryNum,
    task_id: a.taskId,
    query_sequence: a.querySequence,
    time_sec: parseFloat(a.timeSec.toFixed(2)),
    total_attempts: attemptCounts.get(a.taskId) || 1,
    submitted_query: a.submittedQuery,
    completed_at: a.completedAt,
  }));

  // Sort by query sequence
  observations.sort((a, b) => a.query_sequence - b.query_sequence);

  return observations;
}

// ---------------------------------------------------------------------------
// Build structured export payload
// ---------------------------------------------------------------------------

export function buildExportPayload(session: StudySession, format: ExportFormat): ExportPayload {
  const observations = prepareFinalObservations(session);
  const analysis = analyzeSession(session);
  const grading = gradeSession(analysis);

  return {
    metadata: {
      schemaVersion: SCHEMA_VERSION,
      exportFormat: format,
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      description: 'SQL Time Study Lab — EIND 313 Work Design & Analysis',
    },
    student: {
      studentId: session.studentInfo?.studentId || 'unknown',
      sqlExpertise: session.studentInfo?.sqlExpertise ?? 0,
      expertiseLabel: EXPERTISE_LABELS[session.studentInfo?.sqlExpertise ?? 0] || 'Unknown',
    },
    observations,
    analysis,
    grading,
    usageHints: {
      r: [
        '# R: Load and analyze',
        'library(jsonlite)',
        'data <- fromJSON("sql-time-study-STUDENT-DATE.json")',
        'obs <- as.data.frame(data$observations)',
        'fit <- lm(log(time_sec) ~ log(query_sequence) + sql_expertise + round, data=obs)',
        'summary(fit)  # learning exponent = coef on log(query_sequence)',
      ].join('\n'),
      python: [
        '# Python: Load and analyze',
        'import json, pandas as pd, numpy as np',
        'from scipy import stats',
        'with open("sql-time-study-STUDENT-DATE.json") as f:',
        '    data = json.load(f)',
        'df = pd.DataFrame(data["observations"])',
        'slope, intercept, r, p, se = stats.linregress(np.log(df.query_sequence), np.log(df.time_sec))',
        'print(f"Learning exponent: {slope:.3f}, Rate: {2**slope:.1%}, R²: {r**2:.3f}")',
      ].join('\n'),
    },
  };
}

// ---------------------------------------------------------------------------
// CSV Export (updated: now includes submitted_query)
// ---------------------------------------------------------------------------

/**
 * Export session data as CSV string.
 * Now includes submitted_query column.
 */
export function exportToCsv(session: StudySession): string {
  const observations = prepareFinalObservations(session);
  if (observations.length === 0) return '';

  const headers = [
    'student_id',
    'sql_expertise',
    'round',
    'query_num',
    'task_id',
    'query_sequence',
    'time_sec',
    'total_attempts',
    'submitted_query',
    'completed_at',
  ];

  const rows = observations.map((o) => [
    o.student_id,
    o.sql_expertise,
    o.round,
    o.query_num,
    o.task_id,
    o.query_sequence,
    o.time_sec.toFixed(2),
    o.total_attempts,
    csvEscape(o.submitted_query),
    o.completed_at,
  ]);

  return [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');
}

/** Escape a value for CSV. Wraps in quotes if it contains commas, quotes, or newlines. */
function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ---------------------------------------------------------------------------
// JSON Export
// ---------------------------------------------------------------------------

/**
 * Export session data as formatted JSON string with full analysis and grading.
 */
export function exportToJson(session: StudySession): string {
  const payload = buildExportPayload(session, 'json');
  return JSON.stringify(payload, null, 2);
}

// ---------------------------------------------------------------------------
// YAML Export
// ---------------------------------------------------------------------------

/**
 * Export session data as YAML string with full analysis and grading.
 */
export function exportToYaml(session: StudySession): string {
  const payload = buildExportPayload(session, 'yaml');
  return yaml.dump(payload, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  });
}

// ---------------------------------------------------------------------------
// Unified download function
// ---------------------------------------------------------------------------

const MIME_TYPES: Record<ExportFormat, string> = {
  csv: 'text/csv;charset=utf-8;',
  json: 'application/json;charset=utf-8;',
  yaml: 'text/yaml;charset=utf-8;',
};

const EXTENSIONS: Record<ExportFormat, string> = {
  csv: 'csv',
  json: 'json',
  yaml: 'yaml',
};

/**
 * Export and trigger browser download in the specified format.
 */
export function downloadFile(session: StudySession, format: ExportFormat): void {
  let content: string;
  switch (format) {
    case 'csv':
      content = exportToCsv(session);
      break;
    case 'json':
      content = exportToJson(session);
      break;
    case 'yaml':
      content = exportToYaml(session);
      break;
  }

  if (!content) return;

  const blob = new Blob([content], { type: MIME_TYPES[format] });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const studentId = session.studentInfo?.studentId || 'unknown';
  const date = new Date().toISOString().split('T')[0];

  link.setAttribute('href', url);
  link.setAttribute('download', `sql-time-study-${studentId}-${date}.${EXTENSIONS[format]}`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Legacy function: Trigger CSV download in browser.
 * @deprecated Use downloadFile(session, 'csv') instead.
 */
export function downloadCsv(session: StudySession): void {
  downloadFile(session, 'csv');
}

// ---------------------------------------------------------------------------
// Session Stats (unchanged)
// ---------------------------------------------------------------------------

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
