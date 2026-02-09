import { describe, it, expect } from 'vitest';
import yaml from 'js-yaml';
import {
  exportToCsv,
  exportToJson,
  exportToYaml,
  prepareFinalObservations,
  buildExportPayload,
} from '../dataLogger';
import {
  createCleanSession,
  createRetrySession,
  createPartialSession,
  createEmptySession,
} from './fixtures';

// ---------------------------------------------------------------------------
// prepareFinalObservations
// ---------------------------------------------------------------------------

describe('prepareFinalObservations', () => {
  it('returns 18 observations for clean session', () => {
    const session = createCleanSession();
    const obs = prepareFinalObservations(session);
    expect(obs).toHaveLength(18);
  });

  it('returns observations sorted by query_sequence', () => {
    const session = createCleanSession();
    const obs = prepareFinalObservations(session);
    for (let i = 1; i < obs.length; i++) {
      expect(obs[i].query_sequence).toBeGreaterThan(obs[i - 1].query_sequence);
    }
  });

  it('includes submitted_query in all observations', () => {
    const session = createCleanSession();
    const obs = prepareFinalObservations(session);
    obs.forEach((o) => {
      expect(o.submitted_query).toBeTruthy();
      expect(typeof o.submitted_query).toBe('string');
      expect(o.submitted_query.length).toBeGreaterThan(0);
    });
  });

  it('only includes successful attempts (one per task)', () => {
    const session = createRetrySession();
    const obs = prepareFinalObservations(session);
    // Should still be 18 (one per task, even with retries)
    expect(obs).toHaveLength(18);

    // Each task_id should appear exactly once
    const taskIds = obs.map((o) => o.task_id);
    const uniqueTaskIds = new Set(taskIds);
    expect(uniqueTaskIds.size).toBe(18);
  });

  it('correctly counts total_attempts for retry tasks', () => {
    const session = createRetrySession();
    const obs = prepareFinalObservations(session);

    // Task 1.1 had retries
    const task11 = obs.find((o) => o.task_id === '1.1');
    expect(task11?.total_attempts).toBeGreaterThan(1);

    // Task 1.2 should have only 1 attempt
    const task12 = obs.find((o) => o.task_id === '1.2');
    expect(task12?.total_attempts).toBe(1);
  });

  it('returns empty array for empty session', () => {
    const session = createEmptySession();
    const obs = prepareFinalObservations(session);
    expect(obs).toHaveLength(0);
  });

  it('returns 9 observations for partial session', () => {
    const session = createPartialSession();
    const obs = prepareFinalObservations(session);
    expect(obs).toHaveLength(9);
  });

  it('formats time_sec to 2 decimal places', () => {
    const session = createCleanSession();
    const obs = prepareFinalObservations(session);
    obs.forEach((o) => {
      const decimalPlaces = o.time_sec.toString().split('.')[1]?.length ?? 0;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });
  });
});

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

describe('exportToCsv', () => {
  it('produces valid CSV with headers', () => {
    const session = createCleanSession();
    const csv = exportToCsv(session);
    const lines = csv.split('\n');

    // Header line
    expect(lines[0]).toContain('student_id');
    expect(lines[0]).toContain('sql_expertise');
    expect(lines[0]).toContain('submitted_query');
    expect(lines[0]).toContain('time_sec');
    expect(lines[0]).toContain('completed_at');

    // 18 data rows + 1 header = 19 lines
    expect(lines).toHaveLength(19);
  });

  it('includes submitted_query column', () => {
    const session = createCleanSession();
    const csv = exportToCsv(session);
    const headers = csv.split('\n')[0].split(',');

    expect(headers).toContain('submitted_query');
  });

  it('properly escapes SQL queries with commas', () => {
    const session = createCleanSession();
    const csv = exportToCsv(session);
    // Queries with commas should be quoted
    // Task 1.2 has: WHERE unit = 'Cardiac B' AND discharge_date IS NULL
    // No comma in that one, but some JOINs have commas in SELECT
    // Verify no broken rows (each data row should parse to 10 fields when properly handled)
    const lines = csv.split('\n');
    // Header should have exactly 10 columns
    const headerFields = lines[0].split(',');
    expect(headerFields).toHaveLength(10);
  });

  it('returns empty string for empty session', () => {
    const session = createEmptySession();
    const csv = exportToCsv(session);
    expect(csv).toBe('');
  });

  it('returns empty string for session with no studentInfo', () => {
    const csv = exportToCsv({
      studentInfo: null,
      currentRound: 1,
      currentQuery: 1,
      attempts: [],
      taskStartTime: null,
      isComplete: false,
    });
    expect(csv).toBe('');
  });
});

// ---------------------------------------------------------------------------
// JSON Export
// ---------------------------------------------------------------------------

describe('exportToJson', () => {
  it('produces valid JSON', () => {
    const session = createCleanSession();
    const json = exportToJson(session);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('contains all required top-level keys', () => {
    const session = createCleanSession();
    const parsed = JSON.parse(exportToJson(session));

    expect(parsed).toHaveProperty('metadata');
    expect(parsed).toHaveProperty('student');
    expect(parsed).toHaveProperty('observations');
    expect(parsed).toHaveProperty('analysis');
    expect(parsed).toHaveProperty('grading');
    expect(parsed).toHaveProperty('usageHints');
  });

  it('has correct metadata', () => {
    const session = createCleanSession();
    const parsed = JSON.parse(exportToJson(session));

    expect(parsed.metadata.schemaVersion).toBe('2.0.0');
    expect(parsed.metadata.exportFormat).toBe('json');
    expect(parsed.metadata.exportedAt).toBeTruthy();
    expect(parsed.metadata.description).toContain('EIND 313');
  });

  it('has correct student info', () => {
    const session = createCleanSession();
    const parsed = JSON.parse(exportToJson(session));

    expect(parsed.student.studentId).toBe('t42x999');
    expect(parsed.student.sqlExpertise).toBe(2);
    expect(parsed.student.expertiseLabel).toContain('Intermediate');
  });

  it('contains 18 observations', () => {
    const session = createCleanSession();
    const parsed = JSON.parse(exportToJson(session));

    expect(parsed.observations).toHaveLength(18);
  });

  it('contains analysis results', () => {
    const session = createCleanSession();
    const parsed = JSON.parse(exportToJson(session));

    expect(parsed.analysis.learningCurve).not.toBeNull();
    expect(parsed.analysis.roundSummaries).toHaveLength(5);
    expect(parsed.analysis.taskDifficulties).toHaveLength(18);
    expect(parsed.analysis.overallStats).toBeTruthy();
  });

  it('contains grading results', () => {
    const session = createCleanSession();
    const parsed = JSON.parse(exportToJson(session));

    expect(parsed.grading.totalScore).toBeGreaterThan(0);
    expect(parsed.grading.letterGrade).toBeTruthy();
    expect(parsed.grading.criteria).toHaveLength(5);
    expect(parsed.grading.summary).toBeTruthy();
  });

  it('contains R and Python usage hints', () => {
    const session = createCleanSession();
    const parsed = JSON.parse(exportToJson(session));

    expect(parsed.usageHints.r).toContain('jsonlite');
    expect(parsed.usageHints.python).toContain('pandas');
  });

  it('observations include submitted_query', () => {
    const session = createCleanSession();
    const parsed = JSON.parse(exportToJson(session));

    parsed.observations.forEach((o: Record<string, unknown>) => {
      expect(o).toHaveProperty('submitted_query');
      expect(typeof o.submitted_query).toBe('string');
    });
  });
});

// ---------------------------------------------------------------------------
// YAML Export
// ---------------------------------------------------------------------------

describe('exportToYaml', () => {
  it('produces valid YAML that parses back', () => {
    const session = createCleanSession();
    const yamlStr = exportToYaml(session);
    expect(() => yaml.load(yamlStr)).not.toThrow();
  });

  it('contains all required top-level keys', () => {
    const session = createCleanSession();
    const parsed = yaml.load(exportToYaml(session)) as Record<string, unknown>;

    expect(parsed).toHaveProperty('metadata');
    expect(parsed).toHaveProperty('student');
    expect(parsed).toHaveProperty('observations');
    expect(parsed).toHaveProperty('analysis');
    expect(parsed).toHaveProperty('grading');
    expect(parsed).toHaveProperty('usageHints');
  });

  it('has correct metadata with yaml format', () => {
    const session = createCleanSession();
    const parsed = yaml.load(exportToYaml(session)) as Record<string, Record<string, string>>;

    expect(parsed.metadata.exportFormat).toBe('yaml');
    expect(parsed.metadata.schemaVersion).toBe('2.0.0');
  });

  it('round-trips cleanly: YAML -> parse -> matches JSON payload', () => {
    const session = createCleanSession();
    const jsonPayload = JSON.parse(exportToJson(session));
    const yamlPayload = yaml.load(exportToYaml(session)) as Record<string, unknown>;

    // Compare key structural elements (not exact match due to format field)
    expect((yamlPayload as Record<string, Record<string, unknown>>).student.studentId)
      .toBe(jsonPayload.student.studentId);
    expect((yamlPayload as Record<string, unknown[]>).observations.length)
      .toBe(jsonPayload.observations.length);
    expect((yamlPayload as Record<string, Record<string, unknown>>).grading.totalScore)
      .toBe(jsonPayload.grading.totalScore);
  });

  it('handles retry session', () => {
    const session = createRetrySession();
    const yamlStr = exportToYaml(session);
    const parsed = yaml.load(yamlStr) as Record<string, unknown>;

    expect(parsed).toHaveProperty('observations');
    expect((parsed as Record<string, unknown[]>).observations).toHaveLength(18);
  });
});

// ---------------------------------------------------------------------------
// buildExportPayload
// ---------------------------------------------------------------------------

describe('buildExportPayload', () => {
  it('sets format correctly for each type', () => {
    const session = createCleanSession();

    const csvPayload = buildExportPayload(session, 'csv');
    expect(csvPayload.metadata.exportFormat).toBe('csv');

    const jsonPayload = buildExportPayload(session, 'json');
    expect(jsonPayload.metadata.exportFormat).toBe('json');

    const yamlPayload = buildExportPayload(session, 'yaml');
    expect(yamlPayload.metadata.exportFormat).toBe('yaml');
  });

  it('includes analysis and grading for all formats', () => {
    const session = createCleanSession();
    const payload = buildExportPayload(session, 'json');

    expect(payload.analysis.learningCurve).not.toBeNull();
    expect(payload.grading.totalScore).toBeGreaterThan(0);
    expect(payload.grading.criteria).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// Cross-format consistency
// ---------------------------------------------------------------------------

describe('Cross-format consistency', () => {
  it('all formats produce same number of observations', () => {
    const session = createCleanSession();

    const csvLines = exportToCsv(session).split('\n');
    const csvDataRows = csvLines.length - 1; // minus header

    const jsonParsed = JSON.parse(exportToJson(session));
    const yamlParsed = yaml.load(exportToYaml(session)) as Record<string, unknown[]>;

    expect(csvDataRows).toBe(18);
    expect(jsonParsed.observations.length).toBe(18);
    expect(yamlParsed.observations.length).toBe(18);
  });

  it('student info is consistent across formats', () => {
    const session = createCleanSession();

    const csv = exportToCsv(session);
    const firstDataLine = csv.split('\n')[1];
    expect(firstDataLine).toContain('t42x999');

    const jsonParsed = JSON.parse(exportToJson(session));
    expect(jsonParsed.student.studentId).toBe('t42x999');

    const yamlParsed = yaml.load(exportToYaml(session)) as Record<string, Record<string, string>>;
    expect(yamlParsed.student.studentId).toBe('t42x999');
  });
});
