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
  downloadData: (format?: ExportFormat) => void;
  trackHintViewed: () => void;

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
          { studentId: session.studentInfo.studentId, sqlExpertise: session.studentInfo.sqlExpertise },
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
      studentId: session.studentInfo.studentId,
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
      studentId: studentInfo.studentId,
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
        studentId: session.studentInfo.studentId,
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

      // If correct, advance to next task
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

  // Reset the study
  const resetStudy = useCallback(() => {
    clearSession();
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
        downloadData,
        trackHintViewed,
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
