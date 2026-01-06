'use client';

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAnalytics } from './provider';
import type {
  StudyStartedEvent,
  StudyCompletedEvent,
  RoundStartedEvent,
  RoundCompletedEvent,
  QueryAttemptEvent,
  QuerySuccessEvent,
  QueryHintViewedEvent,
  QueryRunEvent,
  CsvDownloadedEvent,
  ThemeChangedEvent,
  ErrorEvent,
} from './types';

// ============================================================================
// Helper: Analyze SQL Query
// ============================================================================

function analyzeQuery(sql: string) {
  const normalized = sql.toLowerCase();
  return {
    query_length: sql.length,
    has_join: /\bjoin\b/.test(normalized),
    has_group_by: /\bgroup\s+by\b/.test(normalized),
    has_subquery: /\(\s*select\b/.test(normalized),
    has_order_by: /\border\s+by\b/.test(normalized),
  };
}

// ============================================================================
// Study Tracking Hook
// ============================================================================

interface BaseContext {
  studentId: string;
  sqlExpertise: number;
}

export function useStudyTracking() {
  const { track, identify, reset, getSessionId } = useAnalytics();
  const pathname = usePathname();

  const getBaseProperties = useCallback(
    (ctx: BaseContext) => ({
      student_id: ctx.studentId,
      sql_expertise: ctx.sqlExpertise,
      session_id: getSessionId(),
      timestamp: new Date().toISOString(),
      page: pathname,
    }),
    [getSessionId, pathname]
  );

  // Study started
  const trackStudyStarted = useCallback(
    (ctx: BaseContext) => {
      identify(ctx.studentId, {
        student_id: ctx.studentId,
        sql_expertise: ctx.sqlExpertise,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        studies_started: 1,
        studies_completed: 0,
        total_queries_attempted: 0,
        total_queries_completed: 0,
      });

      track<StudyStartedEvent>('study_started', getBaseProperties(ctx));
    },
    [identify, track, getBaseProperties]
  );

  // Study completed
  const trackStudyCompleted = useCallback(
    (
      ctx: BaseContext,
      stats: {
        totalTimeSec: number;
        totalQueriesCompleted: number;
        totalAttempts: number;
        avgTimePerQuerySec: number;
        avgAttemptsPerQuery: number;
      }
    ) => {
      track<StudyCompletedEvent>('study_completed', {
        ...getBaseProperties(ctx),
        total_time_sec: stats.totalTimeSec,
        total_queries_completed: stats.totalQueriesCompleted,
        total_attempts: stats.totalAttempts,
        avg_time_per_query_sec: stats.avgTimePerQuerySec,
        avg_attempts_per_query: stats.avgAttemptsPerQuery,
      });
    },
    [track, getBaseProperties]
  );

  // Study reset
  const trackStudyReset = useCallback(() => {
    reset();
  }, [reset]);

  return {
    trackStudyStarted,
    trackStudyCompleted,
    trackStudyReset,
  };
}

// ============================================================================
// Round Tracking Hook
// ============================================================================

export function useRoundTracking() {
  const { track, getSessionId } = useAnalytics();
  const pathname = usePathname();

  const getBaseProperties = useCallback(
    (ctx: BaseContext) => ({
      student_id: ctx.studentId,
      sql_expertise: ctx.sqlExpertise,
      session_id: getSessionId(),
      timestamp: new Date().toISOString(),
      page: pathname,
    }),
    [getSessionId, pathname]
  );

  // Round started
  const trackRoundStarted = useCallback(
    (
      ctx: BaseContext,
      round: {
        round: number;
        roundTitle: string;
        queriesInRound: number;
        queriesCompletedSoFar: number;
      }
    ) => {
      track<RoundStartedEvent>('round_started', {
        ...getBaseProperties(ctx),
        round: round.round,
        round_title: round.roundTitle,
        queries_in_round: round.queriesInRound,
        queries_completed_so_far: round.queriesCompletedSoFar,
      });
    },
    [track, getBaseProperties]
  );

  // Round completed
  const trackRoundCompleted = useCallback(
    (
      ctx: BaseContext,
      round: {
        round: number;
        roundTitle: string;
        roundTimeSec: number;
        queriesInRound: number;
        attemptsInRound: number;
      }
    ) => {
      track<RoundCompletedEvent>('round_completed', {
        ...getBaseProperties(ctx),
        round: round.round,
        round_title: round.roundTitle,
        round_time_sec: round.roundTimeSec,
        queries_in_round: round.queriesInRound,
        attempts_in_round: round.attemptsInRound,
      });
    },
    [track, getBaseProperties]
  );

  return {
    trackRoundStarted,
    trackRoundCompleted,
  };
}

// ============================================================================
// Query Tracking Hook (Core for learning curve analysis)
// ============================================================================

export function useQueryTracking() {
  const { track, getSessionId } = useAnalytics();
  const pathname = usePathname();

  const getBaseProperties = useCallback(
    (ctx: BaseContext) => ({
      student_id: ctx.studentId,
      sql_expertise: ctx.sqlExpertise,
      session_id: getSessionId(),
      timestamp: new Date().toISOString(),
      page: pathname,
    }),
    [getSessionId, pathname]
  );

  // Query attempt (every submit, whether correct or not)
  const trackQueryAttempt = useCallback(
    (
      ctx: BaseContext,
      attempt: {
        taskId: string;
        round: number;
        queryNum: number;
        querySequence: number;
        attemptNum: number;
        timeSinceTaskStartSec: number;
        submittedQuery: string;
        isCorrect: boolean;
        errorMessage?: string;
      }
    ) => {
      const queryAnalysis = analyzeQuery(attempt.submittedQuery);

      track<QueryAttemptEvent>('query_attempt', {
        ...getBaseProperties(ctx),
        task_id: attempt.taskId,
        round: attempt.round,
        query_num: attempt.queryNum,
        query_sequence: attempt.querySequence,
        attempt_num: attempt.attemptNum,
        time_since_task_start_sec: attempt.timeSinceTaskStartSec,
        submitted_query: attempt.submittedQuery,
        is_correct: attempt.isCorrect,
        error_message: attempt.errorMessage,
        ...queryAnalysis,
      });
    },
    [track, getBaseProperties]
  );

  // Query success (when finally solved)
  const trackQuerySuccess = useCallback(
    (
      ctx: BaseContext,
      success: {
        taskId: string;
        round: number;
        queryNum: number;
        querySequence: number;
        timeToSolveSec: number;
        totalAttempts: number;
        finalQuery: string;
        cumulativeQueriesCompleted: number;
        cumulativeTimeSec: number;
      }
    ) => {
      track<QuerySuccessEvent>('query_success', {
        ...getBaseProperties(ctx),
        task_id: success.taskId,
        round: success.round,
        query_num: success.queryNum,
        query_sequence: success.querySequence,
        time_to_solve_sec: success.timeToSolveSec,
        total_attempts: success.totalAttempts,
        final_query: success.finalQuery,
        cumulative_queries_completed: success.cumulativeQueriesCompleted,
        cumulative_time_sec: success.cumulativeTimeSec,
      });
    },
    [track, getBaseProperties]
  );

  // Hint viewed
  const trackHintViewed = useCallback(
    (
      ctx: BaseContext,
      hint: {
        taskId: string;
        round: number;
        queryNum: number;
        attemptNum: number;
        timeBeforeHintSec: number;
      }
    ) => {
      track<QueryHintViewedEvent>('query_hint_viewed', {
        ...getBaseProperties(ctx),
        task_id: hint.taskId,
        round: hint.round,
        query_num: hint.queryNum,
        attempt_num: hint.attemptNum,
        time_before_hint_sec: hint.timeBeforeHintSec,
      });
    },
    [track, getBaseProperties]
  );

  // Query run (without submit, just running to see results)
  const trackQueryRun = useCallback(
    (
      ctx: BaseContext,
      run: {
        taskId: string;
        query: string;
        hasResults: boolean;
        resultCount?: number;
        hasError: boolean;
        errorMessage?: string;
      }
    ) => {
      track<QueryRunEvent>('query_run', {
        ...getBaseProperties(ctx),
        task_id: run.taskId,
        query: run.query,
        has_results: run.hasResults,
        result_count: run.resultCount,
        has_error: run.hasError,
        error_message: run.errorMessage,
      });
    },
    [track, getBaseProperties]
  );

  return {
    trackQueryAttempt,
    trackQuerySuccess,
    trackHintViewed,
    trackQueryRun,
  };
}

// ============================================================================
// UI Tracking Hook
// ============================================================================

export function useUITracking() {
  const { track, getSessionId } = useAnalytics();
  const pathname = usePathname();

  const getBaseProperties = useCallback(
    (ctx: BaseContext) => ({
      student_id: ctx.studentId,
      sql_expertise: ctx.sqlExpertise,
      session_id: getSessionId(),
      timestamp: new Date().toISOString(),
      page: pathname,
    }),
    [getSessionId, pathname]
  );

  // CSV downloaded
  const trackCsvDownloaded = useCallback(
    (
      ctx: BaseContext,
      data: {
        queriesCompleted: number;
        totalTimeSec: number;
      }
    ) => {
      track<CsvDownloadedEvent>('csv_downloaded', {
        ...getBaseProperties(ctx),
        queries_completed: data.queriesCompleted,
        total_time_sec: data.totalTimeSec,
      });
    },
    [track, getBaseProperties]
  );

  // Theme changed
  const trackThemeChanged = useCallback(
    (ctx: BaseContext, theme: 'light' | 'dark') => {
      track<ThemeChangedEvent>('theme_changed', {
        ...getBaseProperties(ctx),
        theme,
      });
    },
    [track, getBaseProperties]
  );

  return {
    trackCsvDownloaded,
    trackThemeChanged,
  };
}

// ============================================================================
// Error Tracking Hook
// ============================================================================

export function useErrorTracking() {
  const { track, getSessionId } = useAnalytics();
  const pathname = usePathname();

  const trackError = useCallback(
    (
      ctx: Partial<BaseContext>,
      error: {
        errorType: 'database_init' | 'query_execution' | 'state_load' | 'unknown';
        errorMessage: string;
        context?: string;
      }
    ) => {
      track<ErrorEvent>('error', {
        student_id: ctx.studentId || 'anonymous',
        sql_expertise: ctx.sqlExpertise || 0,
        session_id: getSessionId(),
        timestamp: new Date().toISOString(),
        page: pathname,
        error_type: error.errorType,
        error_message: error.errorMessage,
        context: error.context,
      });
    },
    [track, getSessionId, pathname]
  );

  return { trackError };
}
