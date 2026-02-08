# SQL Time Study Lab

![Playwright Tests](https://github.com/coincident-systems/sql-time-study/actions/workflows/playwright.yml/badge.svg)

A web application for **EIND 313: Work Design & Analysis** where students complete SQL queries against a simulated hospital EMR database, get silently timed, and export their performance data for learning curve regression analysis in Minitab.

## The Investigation

Students play the role of an Industrial Engineering consultant investigating medication administration delays at **Bozeman Deaconess Hospital**. Through 5 rounds of progressively challenging SQL queries, they:

1. **The Patient** - Locate a specific patient (John Martinez) using basic SELECT/WHERE
2. **The History** - Pull medical records using single JOINs
3. **The Pattern** - Aggregate hospital-wide data to find trends
4. **The Root Cause** - Use multi-table JOINs to identify contributing factors
5. **The Recommendation** - Calculate impact with subqueries and CTEs

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open http://localhost:3000
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server at http://localhost:3000 |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm storybook` | Component library at http://localhost:6006 |
| `pnpm test` | Run tests with Vitest |
| `pnpm test:ui` | Run tests with Vitest UI |
| `pnpm lint` | Run ESLint |

## Testing

### E2E Tests (Playwright)

Comprehensive end-to-end tests covering the full student experience:

```bash
# Run all E2E tests
pnpm exec playwright test

# Run specific test suite
pnpm exec playwright test e2e/marathon.spec.ts

# Run tests in headed mode (see browser)
pnpm exec playwright test --headed

# Debug specific test
pnpm exec playwright test --debug
```

**Test Coverage:**
- ✅ 7 flow tests (guards, persistence, correctness)
- ✅ 4 marathon tests (full 18-query journeys with retries, pause/resume)
- ✅ 7 landing page tests (validation, formatting)
- ✅ 6 investigation page tests (UI elements, hints, progress)

**Total: 24 tests passing** (~2 minutes runtime)

### Known Limitations

Monaco Editor testing uses `page.evaluate()` to call the Monaco API directly since keyboard events don't work with controlled components:

```typescript
// ❌ This doesn't work
await page.keyboard.type('SELECT * FROM patients');

// ✅ This works
await page.evaluate((sql) => {
  const editors = window.monaco?.editor?.getEditors?.();
  if (editors && editors.length > 0) {
    editors[0].getModel()?.setValue(sql);
  }
}, sql);
```

See `e2e/helpers.ts` for the implementation.

## Tech Stack

- **Next.js 14** - App Router, React Server Components
- **sql.js** - SQLite compiled to WebAssembly (runs entirely in browser)
- **Monaco Editor** - VS Code's editor component for SQL editing
- **Tailwind CSS v4** + **shadcn/ui** - Styling and components
- **Storybook 10** - Component development and documentation
- **Vitest** - Unit and integration testing
- **PostHog** - Analytics for instructor visibility (optional)

## Project Structure

```
src/
├── app/                    # Next.js pages
│   ├── page.tsx           # Landing/intake form
│   ├── investigate/       # Main SQL task interface
│   └── complete/          # Results & CSV export
├── components/            # React components
│   ├── ui/               # shadcn/ui primitives
│   ├── SqlEditor.tsx     # Monaco wrapper
│   ├── ResultsTable.tsx  # Query output display
│   └── SchemaReference.tsx
├── data/
│   ├── schema.ts         # EMR table definitions
│   ├── seed.ts           # Fake patient data generator
│   ├── rounds.ts         # Investigation narrative
│   └── tasks.ts          # 18 SQL query definitions
├── lib/
│   ├── database.ts       # sql.js initialization
│   ├── resultComparison.ts # Answer checking logic
│   ├── dataLogger.ts     # localStorage + CSV export
│   └── analytics/        # PostHog integration
└── context/
    └── StudyContext.tsx  # App state management
```

## Database Schema

The simulated EMR contains 7 tables with ~500 patients:

| Table | Description |
|-------|-------------|
| `patients` | Demographics, unit, room assignment |
| `encounters` | Hospital visits with provider, department |
| `diagnoses` | ICD-10 codes linked to encounters |
| `medications` | Scheduled vs administered times, **delay_minutes** |
| `labs` | Test results with reference ranges |
| `providers` | Physicians with specialty |
| `nurses` | Unit assignment, shift, years of experience |

### Built-in Patterns

The seed data contains discoverable patterns for the investigation:

- **Cardiac Unit B** has significantly worse medication delays
- **Night shift** has worse delays than Day/Evening
- **Nurse experience** inversely correlates with delays

## Analytics (Optional)

PostHog integration provides instructor visibility into student progress.

### Setup

```bash
cp .env.local.example .env.local
# Add your PostHog project key
```

### Events Tracked

- `study_started` / `study_completed` - Session lifecycle
- `query_attempt` / `query_success` - Every submission with timing
- `query_hint_viewed` - When students need help
- `round_started` / `round_completed` - Progress through investigation
- `csv_downloaded` - Data export

## Learning Curve Analysis

Students export their performance data as CSV for Minitab analysis:

| Field | Description |
|-------|-------------|
| `student_id` | Anonymized identifier |
| `sql_expertise` | Self-reported level (0-3) |
| `query_sequence` | 1-18 (cumulative task number) |
| `time_sec` | Time to solve |
| `attempt_num` | Attempts for this query |

The expected relationship follows the power law:

```
T_n = T_1 * n^b
```

Where `b` is the learning exponent. Students linearize this as:

```
log(T) = log(T_1) + b * log(n)
```

And calculate learning rate as `2^b` (e.g., b = -0.234 means 85% learning rate).

## Development

### Adding New Queries

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

### Modifying the Schema

1. Update `src/data/schema.ts` (table definitions)
2. Update `src/data/seed.ts` (data generation)
3. The database rebuilds on page load

## Deployment

### Vercel (Recommended)

```bash
vercel
```

The app runs entirely client-side after initial load - no server-side database needed.

### Static Export

```bash
pnpm build
# Deploy the .next folder
```

## License

MIT
