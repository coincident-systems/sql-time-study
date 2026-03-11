# SQL Time Study Lab

[![Playwright Tests](https://github.com/coincident-systems/sql-time-study/actions/workflows/playwright.yml/badge.svg)](https://github.com/coincident-systems/sql-time-study/actions/workflows/playwright.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A browser-based SQL lab for **EIND 313: Work Design & Analysis** at Montana State University. Students complete 18 SQL queries against a simulated hospital EMR database, get silently timed, and export their performance data for learning curve regression analysis.

Everything runs client-side — SQLite via WebAssembly, no backend required.

**Live:** [sql-time-study.vercel.app](https://sql-time-study.vercel.app)

## The Investigation

Students play the role of an Industrial Engineering consultant investigating medication administration delays at **Bozeman Deaconess Hospital**. Five rounds of progressively challenging queries:

| Round | Title | SQL Concepts |
|-|-|-|
| 1 | The Patient | SELECT, WHERE, IS NULL |
| 2 | The History | Single JOINs |
| 3 | The Pattern | COUNT, AVG, GROUP BY, CASE WHEN |
| 4 | The Root Cause | Multi-table JOINs, ORDER BY, LIMIT |
| 5 | The Recommendation | Subqueries, HAVING, complex aggregation |

## Quick Start

```bash
pnpm install
pnpm dev
# Open http://localhost:3000
```

## Features

### For Students
- Monaco Editor (VS Code) with SQL syntax highlighting
- Run queries to preview results before submitting
- Hints available per task
- Silent timing — no visible timer to create anxiety
- Multi-format data export (CSV, JSON, YAML) on completion

### For Instructors
- **Auto-grading rubric** — weighted 0-100 score across 5 criteria (completion, learning curve, efficiency, improvement trend, time performance)
- **Learning curve analysis** — OLS regression on power law model, per-round summaries, difficulty scoring
- **Sandbox mode** — `?skipTo=3.2` jumps to any task for demos or debugging, preserves active student sessions
- **Answer key** — generated artifact with all 18 expected queries and rubric reference
- **PostHog analytics** (optional) — real-time visibility into student progress

### Sandbox Mode

Append `?skipTo=<taskId>` to any URL to enter sandbox mode:

```
https://sql-time-study.vercel.app/investigate?skipTo=3.2
```

- Drops you on the target task with no session setup required
- Correct answers stay on the same task (no advancement)
- Task picker dropdown to jump between all 18 queries
- If a student session was active, it's stashed and restored on exit
- Progress bar and task counter hidden — no fake metrics

Console helpers also available: `__skipTo("3.2")`, `__tasks()`, `__reset()`.

## Data Export

Students export on the completion screen. Three formats:

| Format | Use Case | Contents |
|-|-|-|
| CSV | Minitab, Excel, R | Flat observation rows |
| JSON | Python, R (jsonlite) | Observations + analysis + grading + code snippets |
| YAML | Python (pyyaml), R (yaml) | Same as JSON in YAML format |

### CSV Fields

`student_name`, `sql_expertise`, `round`, `query_num`, `task_id`, `query_sequence`, `time_sec`, `total_attempts`, `submitted_query`, `completed_at`

### Learning Curve Model

The expected relationship follows the power law:

```
T_n = T_1 * n^b        (where b is the learning exponent)
log(T) = log(T_1) + b * log(n)     (linearized for regression)
Learning rate = 2^b     (e.g., b = -0.234 → 85% learning rate)
```

## Auto-Grading Rubric

| Criterion | Weight | What It Measures |
|-|-|-|
| Completion | 20% | Tasks finished out of 18 |
| Learning Curve | 25% | Negative exponent with decent R² |
| Efficiency | 20% | First-try success rate, avg attempts |
| Improvement Trend | 15% | Last-3 avg time vs first-3 avg time |
| Time Performance | 20% | Reasonable pace (not suspiciously fast) |

Produces a 0-100 score, letter grade, per-criterion breakdown, and anomaly flags for instructor review.

## Database Schema

7 EMR tables, ~500 patients, seeded with discoverable patterns:

| Table | Key Columns |
|-|-|
| `patients` | patient_id, last_name, unit, admission_date, discharge_date |
| `encounters` | encounter_id, patient_id, provider_id, encounter_date |
| `diagnoses` | diagnosis_id, encounter_id, icd10_code |
| `medications` | med_id, patient_id, scheduled_time, administered_time, **delay_minutes** |
| `labs` | lab_id, patient_id, test_name, result_value, abnormal_flag |
| `providers` | provider_id, name, specialty, shift |
| `nurses` | nurse_id, name, unit, shift, years_experience |

**Built-in patterns** (what students discover):
- Cardiac Unit B has significantly worse medication delays
- Night shift has worse delays than Day/Evening
- Nurse experience inversely correlates with delays

## Tech Stack

- **Next.js** (App Router) + **React**
- **sql.js** — SQLite compiled to WebAssembly
- **Monaco Editor** — VS Code's editor for SQL input
- **Tailwind CSS v4** + **shadcn/ui**
- **Vitest** — 85 unit tests (analysis, grading, export, fixtures)
- **Playwright** — E2E tests (flow, landing, marathon, investigate, sandbox)
- **PostHog** — Optional analytics

## Scripts

| Command | Description |
|-|-|
| `pnpm dev` | Dev server at localhost:3000 |
| `pnpm build` | Production build |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | E2E tests (Playwright) |
| `pnpm storybook` | Component library at localhost:6006 |
| `pnpm lint` | ESLint |

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing / intake form
│   ├── investigate/          # Main SQL task interface
│   └── complete/             # Results & multi-format export
├── components/
│   ├── ui/                   # shadcn/ui primitives
│   ├── SqlEditor.tsx         # Monaco wrapper
│   ├── ResultsTable.tsx      # Query output display
│   └── SchemaReference.tsx   # Sidebar schema browser
├── data/
│   ├── tasks.ts              # 18 SQL query definitions
│   ├── rounds.ts             # Investigation narrative
│   ├── schema.ts             # EMR table definitions
│   └── seed.ts               # Deterministic data generation
├── lib/
│   ├── database.ts           # sql.js initialization
│   ├── resultComparison.ts   # Answer checking (values-only, alias-tolerant)
│   ├── dataLogger.ts         # Session storage + CSV/JSON/YAML export
│   ├── analysis.ts           # OLS regression, round summaries, difficulty scoring
│   ├── grading.ts            # Auto-grading rubric engine
│   └── analytics/            # PostHog integration
├── context/
│   └── StudyContext.tsx       # App state, sandbox mode, skip-to helpers
└── types/
    └── index.ts              # TypeScript interfaces
```

## Development

### Adding Queries

Edit `src/data/tasks.ts`:

```typescript
{
  id: '1.3',
  round: 1,
  queryNum: 3,
  prompt: 'Find all patients in Cardiac Unit B',
  expectedQuery: `SELECT * FROM patients WHERE unit = 'Cardiac B'`,
  preserveOrder: false,
  hints: ['Use the WHERE clause', 'Check the unit column'],
}
```

Answers are checked by **comparing result sets**, not SQL syntax. Column names are ignored — only row data matters. Numeric values are normalized to 1 decimal place so `ROUND()` usage doesn't cause false negatives.

### Generating Artifacts

```bash
pnpm vitest --project unit --run -- src/lib/__tests__/generate-artifacts.test.ts
```

Writes to `artifacts/` (gitignored):
- `answer-key.json` — all 18 expected queries, perfect-submission grading, rubric reference
- `sample-clean.csv/json/yaml` — example exports
- `console-*.js` — browser console snippets to set app to any state

### Analytics Setup (Optional)

```bash
cp .env.local.example .env.local
# Add NEXT_PUBLIC_POSTHOG_KEY
```

Events tracked: `study_started`, `study_completed`, `query_attempt`, `query_success`, `query_hint_viewed`, `round_started`, `round_completed`, `csv_downloaded`.

## Deployment

Deployed on [Vercel](https://vercel.com). Push to `main` triggers automatic deployment.

The app is fully client-side after initial load — no server, no database, no API keys required.

## License

[MIT](./LICENSE) — Coincident Systems
