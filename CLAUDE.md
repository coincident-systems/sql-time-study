# CLAUDE.md - SQL Time Study Lab

## Project Overview

A web app for EIND 313 (Work Design & Analysis) where students complete SQL queries against a fake hospital EMR database, get silently timed, and export their performance data for learning curve regression analysis in Minitab.

**Narrative**: "Bozeman Deaconess Hospital Medication Delay Investigation" - students act as IE consultants investigating medication administration delays.

## Tech Stack

- **Next.js 14** (App Router)
- **sql.js** - SQLite in browser via WASM
- **Monaco Editor** - VS Code's editor component
- **Tailwind CSS v4** + **shadcn/ui**
- **Storybook 10** - Component development
- **Vitest** - Unit + integration testing
- **pnpm** - Package manager

## Design System

MSU (Montana State University) branded:
- MSU Blue: `#162960` (primary)
- MSU Gold: `#f4b425` (accent, ring/focus)
- MSU Gold Light: `#fada92` (highlights)
- Success: `#16a34a`
- Danger: `#dc2626`

Dark mode uses lightened blue (`#6b8fd4`) for readability; gold stays as-is.

## Directory Structure

```
sql-time-study/
├── src/
│   ├── app/                  # Next.js app router pages
│   │   ├── page.tsx          # Landing (intake form)
│   │   ├── investigate/      # Main task screen
│   │   └── complete/         # Completion/export
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   └── ...               # App-specific components
│   ├── data/
│   │   ├── schema.ts         # EMR table definitions
│   │   ├── seed.ts           # Fake patient data generation
│   │   └── tasks.ts          # Query definitions (CMS-ready structure)
│   ├── lib/
│   │   ├── database.ts       # sql.js wrapper
│   │   ├── resultComparison.ts
│   │   └── dataLogger.ts
│   ├── context/
│   │   └── StudyContext.tsx
│   └── types/
│       └── index.ts
├── public/
│   └── sql-wasm.wasm         # sql.js WASM binary
├── .storybook/
└── ...
```

## Commands

```bash
pnpm dev          # Start dev server at http://localhost:3000
pnpm storybook    # Start Storybook at http://localhost:6006
pnpm test         # Run vitest (unit tests)
pnpm test:ui      # Run vitest with UI
pnpm build        # Production build
```

## Data Architecture (CMS-Ready)

All content is structured as data for future Strapi integration:

### Tasks (`src/data/tasks.ts`)
```typescript
interface Task {
  id: string;              // e.g., "1.1", "2.3"
  round: number;
  queryNum: number;
  prompt: string;          // The question for students
  expectedQuery: string;   // Reference query for generating expected results
  preserveOrder: boolean;  // Whether ORDER BY matters for comparison
  hints?: string[];        // Optional hints
}
```

### Rounds (`src/data/rounds.ts`)
```typescript
interface Round {
  id: number;
  title: string;           // e.g., "The Patient"
  contextBefore: string;   // Narrative before round starts
  contextAfter?: string;   // Narrative after round completes
}
```

### Schema Reference (`src/data/schema.ts`)
```typescript
interface TableSchema {
  name: string;
  columns: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
}
```

## Database Schema

7 EMR tables (~500 patients):
- `patients` - patient demographics, unit, room
- `encounters` - visits with provider, department
- `diagnoses` - ICD-10 codes linked to encounters
- `medications` - scheduled/administered times, delay_minutes (key investigation target)
- `labs` - test results with reference ranges
- `providers` - physicians with specialty
- `nurses` - nurses with unit, shift, experience

**Key patterns baked into seed data:**
- Cardiac Unit B has worse delays
- Night shift has worse delays
- Inverse correlation between nurse experience and delays

## Learning Curve Analysis

Students will analyze their exported CSV in Minitab:
- Power law: `T_n = T_1 * n^b` where b is learning exponent
- Linearized: `log(T) = log(T_1) + b*log(n)`
- Learning rate = `2^b` (e.g., b=-0.234 → 85% learning rate)

CSV fields:
- student_id, sql_expertise (0-3)
- round, query_num, task_id, query_sequence
- attempt_num, time_sec, total_attempts
- submitted_query, completed_at

## Related Projects

- **DesignTools** (`~/Workspace/msu/designtools/app`) - Same stack, same course
  - Has learning curve module that students use for theory
  - Potential for shared component library
- **Merc** (`~/Workspace/coincident/merc`) - Design token source

## Analytics (PostHog)

PostHog integration for instructor visibility into student progress.

### Setup
1. Copy `.env.local.example` to `.env.local`
2. Add your PostHog project API key
3. Analytics only activate when `NEXT_PUBLIC_POSTHOG_KEY` is set

### Events Tracked

| Event | When | Key Properties |
|-------|------|----------------|
| `study_started` | Student enters their ID | student_id, sql_expertise |
| `study_completed` | All 18 queries complete | total_time_sec, total_attempts, avg_time_per_query |
| `round_started` | First query in round begins | round, round_title, queries_in_round |
| `round_completed` | Last query in round solved | round_time_sec, attempts_in_round |
| `query_attempt` | Every submit (correct or not) | task_id, attempt_num, time_since_task_start, is_correct |
| `query_success` | Query solved correctly | time_to_solve_sec, total_attempts, final_query |
| `query_hint_viewed` | Student clicks "Show hints" | time_before_hint_sec, attempt_num |
| `query_run` | Student runs query without submit | has_results, result_count, has_error |
| `csv_downloaded` | Student exports their data | queries_completed, total_time_sec |
| `theme_changed` | Dark/light mode toggle | theme |
| `error` | Database init or query errors | error_type, error_message |

### Query Analysis Properties
Each query event includes:
- `query_length` - SQL character count
- `has_join` - Uses JOIN clause
- `has_group_by` - Uses GROUP BY
- `has_subquery` - Contains nested SELECT
- `has_order_by` - Uses ORDER BY

### PostHog Dashboard Ideas
- **Learning Curve**: Plot avg time_to_solve_sec by query_sequence
- **Struggle Points**: Queries with highest avg attempts
- **Hint Effectiveness**: Compare attempts before/after hint viewing
- **SQL Expertise Correlation**: Group by sql_expertise (0-3)

### Files
- `src/lib/analytics/types.ts` - Event type definitions
- `src/lib/analytics/provider.tsx` - PostHog initialization
- `src/lib/analytics/hooks.ts` - React hooks for tracking

## Session Notes

### January 5, 2025
- Initial scaffolding with Next.js, pnpm, shadcn/ui, Storybook, Vitest
- Applied Merc design tokens
- Components should be designed for future extraction to shared library
- Added PostHog analytics with comprehensive event tracking
- Added dark mode toggle with localStorage persistence
