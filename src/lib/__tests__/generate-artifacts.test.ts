/**
 * Generate sample export artifacts and console fixtures.
 * Run with: pnpm vitest --project unit --run -- src/lib/__tests__/generate-artifacts.test.ts
 */
import { describe, it } from 'vitest';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { exportToCsv, exportToJson, exportToYaml, buildExportPayload } from '../dataLogger';
import { analyzeSession } from '../analysis';
import { gradeSession } from '../grading';
import { tasks } from '@/data/tasks';
import {
  createCleanSession,
  createRetrySession,
  createPartialSession,
  createEmptySession,
} from './fixtures';

const ARTIFACTS_DIR = join(__dirname, '..', '..', '..', 'artifacts');

describe('generate artifacts', () => {
  it('writes all sample exports to artifacts/', () => {
    mkdirSync(ARTIFACTS_DIR, { recursive: true });

    const clean = createCleanSession();
    const retry = createRetrySession();

    // Clean session exports
    writeFileSync(join(ARTIFACTS_DIR, 'sample-clean.csv'), exportToCsv(clean));
    writeFileSync(join(ARTIFACTS_DIR, 'sample-clean.json'), exportToJson(clean));
    writeFileSync(join(ARTIFACTS_DIR, 'sample-clean.yaml'), exportToYaml(clean));

    // Retry session exports
    writeFileSync(join(ARTIFACTS_DIR, 'sample-retry.csv'), exportToCsv(retry));
    writeFileSync(join(ARTIFACTS_DIR, 'sample-retry.json'), exportToJson(retry));
    writeFileSync(join(ARTIFACTS_DIR, 'sample-retry.yaml'), exportToYaml(retry));

    console.log(`\nExport artifacts written to: ${ARTIFACTS_DIR}`);
  });

  it('writes console fixture snippets to artifacts/', () => {
    mkdirSync(ARTIFACTS_DIR, { recursive: true });

    const STORAGE_KEY = 'sql-time-study-session';

    const fixtures = [
      {
        name: 'completed-clean',
        description: 'Completed session — 18/18 tasks, all first-try, strong learning curve (A grade)',
        session: createCleanSession(),
        navigateTo: '/complete',
      },
      {
        name: 'completed-retry',
        description: 'Completed session — 18/18 tasks, with retries on round openers (A grade, lower efficiency)',
        session: createRetrySession(),
        navigateTo: '/complete',
      },
      {
        name: 'in-progress-halfway',
        description: 'Mid-session — 9/18 tasks completed (rounds 1-2 done, round 3 partially done)',
        session: createPartialSession(),
        navigateTo: '/',
      },
      {
        name: 'fresh-start',
        description: 'Brand new session — intake form filled, no queries attempted yet',
        session: {
          ...createEmptySession(),
          taskStartTime: Date.now(),
        },
        navigateTo: '/',
      },
    ];

    // Build a single all-in-one fixture file
    const snippets: string[] = [
      '// ============================================================================',
      '// SQL Time Study — Console Fixtures',
      '// ============================================================================',
      '//',
      '// Paste any of these into your browser console at http://localhost:3000',
      '// to jump the app to a specific state. Each snippet sets localStorage',
      '// and reloads the page.',
      '//',
      `// Generated: ${new Date().toISOString()}`,
      '// Regenerate: pnpm vitest --project unit --run -- src/lib/__tests__/generate-artifacts.test.ts',
      '// ============================================================================',
      '',
      '',
    ];

    for (const fixture of fixtures) {
      const json = JSON.stringify(fixture.session);

      // The one-liner for pasting
      const oneLiner = `localStorage.setItem('${STORAGE_KEY}', '${json.replace(/'/g, "\\'")}'); window.location.href = '${fixture.navigateTo}';`;

      snippets.push(
        `// --- ${fixture.name} ---`,
        `// ${fixture.description}`,
        `// Navigate to: ${fixture.navigateTo}`,
        '',
        oneLiner,
        '',
        '',
      );

      // Also write individual files for easy copy-paste
      writeFileSync(
        join(ARTIFACTS_DIR, `console-${fixture.name}.js`),
        [
          `// ${fixture.description}`,
          `// Paste this into your browser console at http://localhost:3000`,
          '',
          oneLiner,
          '',
        ].join('\n')
      );
    }

    // Also write a "clear everything" snippet
    const clearSnippet = `localStorage.removeItem('${STORAGE_KEY}'); window.location.href = '/';`;
    snippets.push(
      '// --- clear ---',
      '// Remove all session data and return to intake form',
      '',
      clearSnippet,
      '',
    );
    writeFileSync(
      join(ARTIFACTS_DIR, 'console-clear.js'),
      [
        '// Remove all session data and return to intake form',
        '// Paste this into your browser console at http://localhost:3000',
        '',
        clearSnippet,
        '',
      ].join('\n')
    );

    // Write the combined file
    writeFileSync(join(ARTIFACTS_DIR, 'console-fixtures.js'), snippets.join('\n'));

    console.log('\nConsole fixtures written to:');
    console.log('  artifacts/console-fixtures.js        (all-in-one)');
    console.log('  artifacts/console-completed-clean.js  (paste to see completion screen)');
    console.log('  artifacts/console-completed-retry.js  (completion with retries)');
    console.log('  artifacts/console-in-progress-halfway.js');
    console.log('  artifacts/console-fresh-start.js');
    console.log('  artifacts/console-clear.js');
  });

  it('writes answer key for instructor reference', () => {
    mkdirSync(ARTIFACTS_DIR, { recursive: true });

    const clean = createCleanSession();
    const payload = buildExportPayload(clean, 'json');
    const analysis = analyzeSession(clean);
    const grading = gradeSession(analysis);

    // Build the answer key with expected queries, grading rubric, and scoring
    const answerKey = {
      _description: [
        'SQL Time Study Lab — Instructor Answer Key',
        'This file contains the expected SQL queries for all 18 tasks,',
        'the auto-grading rubric output for a "perfect" submission,',
        'and the learning curve analysis for reference.',
        '',
        'Generated from the deterministic clean-session fixture.',
        'Student times follow T_n = 120 * n^(-0.322) with seeded noise.',
      ],
      _generated: new Date().toISOString(),

      // Expected queries per task
      expectedQueries: tasks.map((t) => ({
        taskId: t.id,
        round: t.round,
        queryNum: t.queryNum,
        prompt: t.prompt,
        expectedQuery: t.expectedQuery,
        preserveOrder: t.preserveOrder,
        hints: t.hints || [],
      })),

      // What a perfect submission looks like
      perfectSubmission: {
        description: 'All 18 tasks completed first-try with a strong negative learning exponent',
        student: payload.student,
        grading: {
          totalScore: grading.totalScore,
          letterGrade: grading.letterGrade,
          summary: grading.summary,
          criteria: grading.criteria.map((c) => ({
            name: c.name,
            weight: c.weight,
            rawScore: c.rawScore,
            weightedScore: c.weightedScore,
            rationale: c.rationale,
          })),
          flags: grading.flags,
        },
        analysis: {
          learningCurve: analysis.learningCurve
            ? {
                exponent: analysis.learningCurve.exponent,
                learningRate: analysis.learningCurve.learningRate,
                rSquared: analysis.learningCurve.rSquared,
                predictedFirstTaskTime: analysis.learningCurve.predictedFirstTaskTime,
                n: analysis.learningCurve.n,
              }
            : null,
          overallStats: analysis.overallStats,
          roundSummaries: analysis.roundSummaries.map((r) => ({
            round: r.round,
            tasksCompleted: r.tasksCompleted,
            avgTimeSec: parseFloat(r.avgTimeSec.toFixed(2)),
            firstTrySuccessRate: r.firstTrySuccessRate,
          })),
        },
      },

      // Grading thresholds for instructor reference
      rubricReference: {
        criteria: [
          { name: 'Completion', weight: '20%', description: '18/18 tasks = 100 pts' },
          { name: 'Learning Curve', weight: '25%', description: 'Negative exponent with decent R². Exponent <= -0.15 and R² >= 0.3 earns top marks' },
          { name: 'Efficiency', weight: '20%', description: 'First-try success rate and low avg attempts. 100% first-try = 100 pts' },
          { name: 'Improvement Trend', weight: '15%', description: 'Last-3-avg < first-3-avg time. Bigger improvement = higher score' },
          { name: 'Time Performance', weight: '20%', description: 'Reasonable pace (not suspiciously fast). Median 15-120s is ideal' },
        ],
        letterGrades: {
          'A': '>= 90',
          'B': '>= 80',
          'C': '>= 70',
          'D': '>= 60',
          'F': '< 60',
        },
        anomalyFlags: [
          'SUSPICIOUSLY_FAST: Any task < 3 seconds',
          'NO_LEARNING_CURVE: Positive exponent (student got slower)',
          'INCOMPLETE: Fewer than 18 tasks',
          'EXCESSIVE_RETRIES: Average > 5 attempts per task',
        ],
      },
    };

    writeFileSync(
      join(ARTIFACTS_DIR, 'answer-key.json'),
      JSON.stringify(answerKey, null, 2)
    );

    console.log(`\nAnswer key written to: ${join(ARTIFACTS_DIR, 'answer-key.json')}`);
  });
});
