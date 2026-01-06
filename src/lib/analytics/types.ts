/**
 * Analytics Event Types
 *
 * Comprehensive event schema for PostHog tracking.
 * Designed for instructor visibility and learning curve research.
 */

// ============================================================================
// Base Properties (included in all events)
// ============================================================================

export interface BaseEventProperties {
  // Session identification
  student_id: string;
  sql_expertise: number; // 0-3
  session_id: string; // Unique per browser session

  // Context
  timestamp: string; // ISO 8601
  page: string; // Current page/route
}

// ============================================================================
// Study Lifecycle Events
// ============================================================================

export interface StudyStartedEvent extends BaseEventProperties {
  event: 'study_started';
}

export interface StudyCompletedEvent extends BaseEventProperties {
  event: 'study_completed';
  total_time_sec: number;
  total_queries_completed: number;
  total_attempts: number;
  avg_time_per_query_sec: number;
  avg_attempts_per_query: number;
}

export interface StudyAbandonedEvent extends BaseEventProperties {
  event: 'study_abandoned';
  last_round: number;
  last_query: number;
  queries_completed: number;
  time_spent_sec: number;
}

// ============================================================================
// Round Events
// ============================================================================

export interface RoundStartedEvent extends BaseEventProperties {
  event: 'round_started';
  round: number;
  round_title: string;
  queries_in_round: number;
  queries_completed_so_far: number;
}

export interface RoundCompletedEvent extends BaseEventProperties {
  event: 'round_completed';
  round: number;
  round_title: string;
  round_time_sec: number;
  queries_in_round: number;
  attempts_in_round: number;
}

// ============================================================================
// Query Events (Core tracking for learning curve analysis)
// ============================================================================

export interface QueryAttemptEvent extends BaseEventProperties {
  event: 'query_attempt';

  // Task identification
  task_id: string; // e.g., "1.1", "3.2"
  round: number;
  query_num: number;
  query_sequence: number; // 1-18 overall position

  // Attempt details
  attempt_num: number; // Which attempt at this specific task
  time_since_task_start_sec: number;
  submitted_query: string;

  // Result
  is_correct: boolean;
  error_message?: string; // If SQL error

  // Query characteristics (for analysis)
  query_length: number; // Character count
  has_join: boolean;
  has_group_by: boolean;
  has_subquery: boolean;
  has_order_by: boolean;
}

export interface QuerySuccessEvent extends BaseEventProperties {
  event: 'query_success';

  // Task identification
  task_id: string;
  round: number;
  query_num: number;
  query_sequence: number;

  // Performance metrics
  time_to_solve_sec: number;
  total_attempts: number;
  final_query: string;

  // Derived metrics for learning curve
  cumulative_queries_completed: number;
  cumulative_time_sec: number;
}

export interface QueryHintViewedEvent extends BaseEventProperties {
  event: 'query_hint_viewed';
  task_id: string;
  round: number;
  query_num: number;
  attempt_num: number;
  time_before_hint_sec: number;
}

// ============================================================================
// UI Interaction Events
// ============================================================================

export interface SchemaViewedEvent extends BaseEventProperties {
  event: 'schema_viewed';
  table_name?: string; // If expanded a specific table
  task_id: string;
}

export interface QueryRunEvent extends BaseEventProperties {
  event: 'query_run';
  task_id: string;
  query: string;
  has_results: boolean;
  result_count?: number;
  has_error: boolean;
  error_message?: string;
}

export interface CsvDownloadedEvent extends BaseEventProperties {
  event: 'csv_downloaded';
  queries_completed: number;
  total_time_sec: number;
}

export interface ThemeChangedEvent extends BaseEventProperties {
  event: 'theme_changed';
  theme: 'light' | 'dark';
}

// ============================================================================
// Error Events
// ============================================================================

export interface ErrorEvent extends BaseEventProperties {
  event: 'error';
  error_type: 'database_init' | 'query_execution' | 'state_load' | 'unknown';
  error_message: string;
  context?: string;
}

// ============================================================================
// Union Type for All Events
// ============================================================================

export type AnalyticsEvent =
  | StudyStartedEvent
  | StudyCompletedEvent
  | StudyAbandonedEvent
  | RoundStartedEvent
  | RoundCompletedEvent
  | QueryAttemptEvent
  | QuerySuccessEvent
  | QueryHintViewedEvent
  | SchemaViewedEvent
  | QueryRunEvent
  | CsvDownloadedEvent
  | ThemeChangedEvent
  | ErrorEvent;

// ============================================================================
// User Properties (set once per user, updated on identify)
// ============================================================================

export interface UserProperties {
  student_id: string;
  sql_expertise: number;
  first_seen: string;
  last_seen: string;
  studies_started: number;
  studies_completed: number;
  total_queries_attempted: number;
  total_queries_completed: number;
}
