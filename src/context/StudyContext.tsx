'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { StudySession, StudentInfo, QueryResult } from '@/types';
import { rounds } from '@/data/rounds';
import { tasks, getTasksForRound, getTotalTaskCount } from '@/data/tasks';
import { initDatabase, executeQuery } from '@/lib/database';
import { checkQueryResult } from '@/lib/resultComparison';
import {
  getSession,
  saveSession,
  startSession,
  logAttempt,
  advanceSession,
  clearSession,
  downloadFile,
  getSessionStats,
} from '@/lib/dataLogger';
import type { ExportFormat } from '@/lib/dataLogger';
import {
  useStudyTracking,
  useRoundTracking,
  useQueryTracking,
  useUITracking,
  useErrorTracking,
} from '@/lib/analytics';

interface StudyContextType {
  // Session state
  session: StudySession;
  isLoading: boolean;
  isDbReady: boolean;

  // Current task info
  currentTask: (typeof tasks)[0] | null;
  currentRound: (typeof rounds)[0] | null;

  // Actions
  startStudy: (studentInfo: StudentInfo) => void;
  runQuery: (sql: string) => Promise<QueryResult>;
  submitAnswer: (sql: string) => Promise<{ isCorrect: boolean; message: string }>;
  resetStudy: () => void;
  /** Exit sandbox: restores previous session if one was active, otherwise resets. */
  exitSandbox: () => void;
  downloadData: (format?: ExportFormat) => void;
  trackHintViewed: () => void;
  /** Jump to any task by ID (sandbox mode — no advancement, no completion). */
  skipTo: (taskId: string) => void;

  // Stats
  stats: ReturnType<typeof getSessionStats>;
}

const StudyContext = createContext<StudyContextType | null>(null);

export function StudyProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StudySession>({
    studentInfo: null,
    currentRound: 1,
    currentQuery: 1,
    attempts: [],
    taskStartTime: null,
    isComplete: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isDbReady, setIsDbReady] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  // Track cumulative time for analytics
  const cumulativeTimeRef = useRef(0);
  const roundStartTimeRef = useRef<number | null>(null);

  // Analytics hooks
  const { trackStudyStarted, trackStudyCompleted, trackStudyReset } = useStudyTracking();
  const { trackRoundStarted, trackRoundCompleted } = useRoundTracking();
  const { trackQueryAttempt, trackQuerySuccess, trackHintViewed: trackHint, trackQueryRun } = useQueryTracking();
  const { trackCsvDownloaded } = useUITracking();
  const { trackError } = useErrorTracking();

  // Initialize database and load session on mount
  useEffect(() => {
    const init = async () => {
      try {
        // Load saved session
        const savedSession = getSession();
        setSession(savedSession);

        // Initialize database
        await initDatabase();
        setIsDbReady(true);
      } catch (error) {
        console.error('Failed to initialize:', error);
        trackError({}, {
          errorType: 'database_init',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [trackError]);

  // Reset attempt count when task changes
  useEffect(() => {
    setAttemptCount(0);
  }, [session.currentRound, session.currentQuery]);

  // Track round start when round changes
  useEffect(() => {
    if (session.studentInfo && session.currentQuery === 1 && !session.isComplete) {
      const round = rounds.find((r) => r.id === session.currentRound);
      if (round) {
        roundStartTimeRef.current = Date.now();
        const stats = getSessionStats(session);
        trackRoundStarted(
          { studentName: session.studentInfo.studentName, sqlExpertise: session.studentInfo.sqlExpertise },
          {
            round: round.id,
            roundTitle: round.title,
            queriesInRound: getTasksForRound(round.id).length,
            queriesCompletedSoFar: stats.completedTasks,
          }
        );
      }
    }
  }, [session.currentRound, session.studentInfo, session.currentQuery, session.isComplete, trackRoundStarted, session]);

  // Get current task and round
  const currentRound = rounds.find((r) => r.id === session.currentRound) || null;
  const tasksInRound = getTasksForRound(session.currentRound);
  const currentTask = tasksInRound[session.currentQuery - 1] || null;

  // Calculate query sequence number
  const querySequence = tasks.findIndex((t) => t.id === currentTask?.id) + 1;

  // Analytics context helper
  const getAnalyticsContext = useCallback(() => {
    if (!session.studentInfo) return null;
    return {
      studentName: session.studentInfo.studentName,
      sqlExpertise: session.studentInfo.sqlExpertise,
    };
  }, [session.studentInfo]);

  // Start a new study session
  const startStudy = useCallback((studentInfo: StudentInfo) => {
    const newSession = startSession(studentInfo);
    setSession(newSession);
    setAttemptCount(0);
    cumulativeTimeRef.current = 0;
    roundStartTimeRef.current = Date.now();

    // Track study start
    trackStudyStarted({
      studentName: studentInfo.studentName,
      sqlExpertise: studentInfo.sqlExpertise,
    });
  }, [trackStudyStarted]);

  // Run a query (without checking correctness)
  const runQuery = useCallback(async (sql: string): Promise<QueryResult> => {
    if (!isDbReady) {
      return { columns: [], values: [], error: 'Database not ready' };
    }

    const result = await executeQuery(sql);

    // Track query run
    const ctx = getAnalyticsContext();
    if (ctx && currentTask) {
      trackQueryRun(ctx, {
        taskId: currentTask.id,
        query: sql,
        hasResults: result.values.length > 0,
        resultCount: result.values.length,
        hasError: !!result.error,
        errorMessage: result.error,
      });
    }

    return result;
  }, [isDbReady, getAnalyticsContext, currentTask, trackQueryRun]);

  // Submit an answer and check correctness
  const submitAnswer = useCallback(
    async (sql: string): Promise<{ isCorrect: boolean; message: string }> => {
      if (!currentTask || !session.studentInfo || !session.taskStartTime) {
        return { isCorrect: false, message: 'Session not initialized' };
      }

      const ctx = {
        studentName: session.studentInfo.studentName,
        sqlExpertise: session.studentInfo.sqlExpertise,
      };

      // Increment attempt count
      const newAttemptCount = attemptCount + 1;
      setAttemptCount(newAttemptCount);

      // Calculate time spent
      const timeSec = (Date.now() - session.taskStartTime) / 1000;

      // Check correctness
      const result = await checkQueryResult(
        sql,
        currentTask.expectedQuery,
        currentTask.preserveOrder
      );

      // Track attempt
      trackQueryAttempt(ctx, {
        taskId: currentTask.id,
        round: currentTask.round,
        queryNum: currentTask.queryNum,
        querySequence,
        attemptNum: newAttemptCount,
        timeSinceTaskStartSec: timeSec,
        submittedQuery: sql,
        isCorrect: result.isMatch,
        errorMessage: result.studentResult.error,
      });

      // Log the attempt locally
      let updatedSession = logAttempt(
        session,
        currentTask.id,
        querySequence,
        sql,
        timeSec,
        newAttemptCount,
        result.isMatch
      );

      // If correct, handle advancement
      if (result.isMatch) {
        cumulativeTimeRef.current += timeSec;

        // Track query success
        trackQuerySuccess(ctx, {
          taskId: currentTask.id,
          round: currentTask.round,
          queryNum: currentTask.queryNum,
          querySequence,
          timeToSolveSec: timeSec,
          totalAttempts: newAttemptCount,
          finalQuery: sql,
          cumulativeQueriesCompleted: querySequence,
          cumulativeTimeSec: cumulativeTimeRef.current,
        });

        // In sandbox mode: stay on the same task, just reset the timer
        if (session.sandboxMode) {
          updatedSession = {
            ...updatedSession,
            taskStartTime: Date.now(),
            sandboxMode: true,
          };
        } else {
          const totalTasks = getTotalTaskCount();
          const completedCount = querySequence;

          // Check if round completed
          const nextQueryInRound = session.currentQuery + 1;
          const tasksInCurrentRound = getTasksForRound(session.currentRound);

          if (nextQueryInRound > tasksInCurrentRound.length && roundStartTimeRef.current) {
            // Round completed - track it
            const roundTimeSec = (Date.now() - roundStartTimeRef.current) / 1000;
            const roundAttempts = session.attempts.filter(
              (a) => a.round === session.currentRound
            ).length + 1;

            trackRoundCompleted(ctx, {
              round: session.currentRound,
              roundTitle: currentRound?.title || '',
              roundTimeSec,
              queriesInRound: tasksInCurrentRound.length,
              attemptsInRound: roundAttempts,
            });
          }

          if (completedCount >= totalTasks) {
            // Study complete!
            updatedSession = advanceSession(
              updatedSession,
              session.currentRound,
              session.currentQuery,
              true
            );

            // Track study completion
            const finalStats = getSessionStats(updatedSession);
            trackStudyCompleted(ctx, {
              totalTimeSec: finalStats.totalTime,
              totalQueriesCompleted: finalStats.completedTasks,
              totalAttempts: finalStats.totalAttempts,
              avgTimePerQuerySec: finalStats.avgTime,
              avgAttemptsPerQuery: finalStats.avgAttempts,
            });
          } else {
            // Move to next task
            if (nextQueryInRound <= tasksInCurrentRound.length) {
              // Next query in same round
              updatedSession = advanceSession(updatedSession, session.currentRound, nextQueryInRound);
            } else {
              // Move to next round
              updatedSession = advanceSession(updatedSession, session.currentRound + 1, 1);
            }
          }
        }
      }

      setSession(updatedSession);
      saveSession(updatedSession);

      return {
        isCorrect: result.isMatch,
        message: result.message || (result.isMatch ? 'Correct!' : 'Not quite right'),
      };
    },
    [currentTask, session, querySequence, attemptCount, currentRound, trackQueryAttempt, trackQuerySuccess, trackRoundCompleted, trackStudyCompleted]
  );

  // Track hint viewed
  const trackHintViewed = useCallback(() => {
    const ctx = getAnalyticsContext();
    if (ctx && currentTask && session.taskStartTime) {
      const timeSec = (Date.now() - session.taskStartTime) / 1000;
      trackHint(ctx, {
        taskId: currentTask.id,
        round: currentTask.round,
        queryNum: currentTask.queryNum,
        attemptNum: attemptCount + 1,
        timeBeforeHintSec: timeSec,
      });
    }
  }, [getAnalyticsContext, currentTask, session.taskStartTime, attemptCount, trackHint]);

  // Reset the study (clears everything including stash)
  const resetStudy = useCallback(() => {
    clearSession();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sql-time-study-session-stash');
    }
    setSession({
      studentInfo: null,
      currentRound: 1,
      currentQuery: 1,
      attempts: [],
      taskStartTime: null,
      isComplete: false,
    });
    setAttemptCount(0);
    cumulativeTimeRef.current = 0;
    roundStartTimeRef.current = null;

    // Reset analytics
    trackStudyReset();
  }, [trackStudyReset]);

  // Exit sandbox: restore stashed session if one exists, otherwise reset
  const exitSandbox = useCallback(() => {
    const STORAGE_KEY = 'sql-time-study-session';
    const STASH_KEY = 'sql-time-study-session-stash';
    const stashed = typeof window !== 'undefined' ? localStorage.getItem(STASH_KEY) : null;

    if (stashed) {
      try {
        const restored = JSON.parse(stashed) as StudySession;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
        localStorage.removeItem(STASH_KEY);
        setSession(restored);
        return;
      } catch {
        // Corrupted stash — fall through to reset
      }
    }

    // No stash to restore — full reset
    resetStudy();
  }, [resetStudy]);

  // Download data in specified format
  const downloadData = useCallback((format: ExportFormat = 'csv') => {
    downloadFile(session, format);

    // Track download
    const ctx = getAnalyticsContext();
    if (ctx) {
      const stats = getSessionStats(session);
      trackCsvDownloaded(ctx, {
        queriesCompleted: stats.completedTasks,
        totalTimeSec: stats.totalTime,
      });
    }
  }, [session, getAnalyticsContext, trackCsvDownloaded]);

  // ---------------------------------------------------------------------------
  // Skip-to helpers: ?skipTo=3.2 query param + console functions
  // ---------------------------------------------------------------------------

  const skipToTask = useCallback((taskId: string) => {
    const STORAGE_KEY = 'sql-time-study-session';
    const STASH_KEY = 'sql-time-study-session-stash';
    const targetIdx = tasks.findIndex((t) => t.id === taskId);
    if (targetIdx === -1) {
      console.error(`Unknown task "${taskId}". Valid: ${tasks.map((t) => t.id).join(', ')}`);
      return;
    }

    const target = tasks[targetIdx];
    const info = session.studentInfo ?? { studentName: 'Sandbox User', sqlExpertise: 2 as const };

    // Stash the real session (if one exists and isn't already sandbox)
    if (!session.sandboxMode && session.studentInfo) {
      localStorage.setItem(STASH_KEY, JSON.stringify(session));
    }

    const patched: StudySession = {
      studentInfo: info,
      currentRound: target.round,
      currentQuery: target.queryNum,
      attempts: [],
      taskStartTime: Date.now(),
      isComplete: false,
      sandboxMode: true,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(patched));
    setSession(patched);
  }, [session]);

  // Handle ?skipTo= query parameter on any page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const skipTo = params.get('skipTo');
    if (!skipTo) return;

    // Strip the param so it doesn't re-trigger on state changes
    const url = new URL(window.location.href);
    url.searchParams.delete('skipTo');
    window.history.replaceState({}, '', url.pathname + url.search);

    skipToTask(skipTo);

    // Navigate to /investigate if not already there
    if (window.location.pathname !== '/investigate') {
      window.location.href = '/investigate';
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount

  // Console helpers
  useEffect(() => {
    const STORAGE_KEY = 'sql-time-study-session';

    (window as unknown as Record<string, unknown>).__skipTo = (taskId: string) => {
      skipToTask(taskId);
      window.location.href = '/investigate';
    };

    (window as unknown as Record<string, unknown>).__reset = () => {
      localStorage.removeItem(STORAGE_KEY);
      window.location.href = '/';
    };

    (window as unknown as Record<string, unknown>).__tasks = () => {
      const current = currentTask?.id || '(none)';
      console.table(tasks.map((t) => ({
        id: t.id,
        round: t.round,
        prompt: t.prompt.substring(0, 60) + (t.prompt.length > 60 ? '...' : ''),
        current: t.id === current ? '<--' : '',
      })));
    };

    if (process.env.NODE_ENV === 'development') {
      console.log(
        '%c[SQL Time Study Dev Tools]%c\n' +
        '  __skipTo("3.2")  — jump to any task\n' +
        '  __reset()        — clear session\n' +
        '  __tasks()        — list all tasks\n' +
        '  ?skipTo=3.2      — query param (any page)',
        'color: #f4b425; font-weight: bold',
        'color: inherit'
      );
    }
  }, [skipToTask, currentTask]);

  // Calculate stats
  const stats = getSessionStats(session);

  return (
    <StudyContext.Provider
      value={{
        session,
        isLoading,
        isDbReady,
        currentTask,
        currentRound,
        startStudy,
        runQuery,
        submitAnswer,
        resetStudy,
        exitSandbox,
        downloadData,
        trackHintViewed,
        skipTo: skipToTask,
        stats,
      }}
    >
      {children}
    </StudyContext.Provider>
  );
}

export function useStudy() {
  const context = useContext(StudyContext);
  if (!context) {
    throw new Error('useStudy must be used within a StudyProvider');
  }
  return context;
}
