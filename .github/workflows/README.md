# GitHub Actions Workflows

## Playwright Tests (`playwright.yml`)

Runs the E2E test suite on every push and pull request.

### What It Does

1. **Checkout** - Pulls the code
2. **Setup** - Installs Node.js 20, pnpm, and dependencies
3. **Cache** - Speeds up future runs by caching pnpm store
4. **Install Browsers** - Installs Chromium with system dependencies
5. **Build** - Creates production build (`pnpm build`)
6. **Test** - Runs all Playwright tests against production server
7. **Upload Artifacts** - Saves test reports and traces on failure

### Triggers

```yaml
on:
  push:
    branches: [main, master, develop]
  pull_request:
    branches: [main, master, develop]
```

### Configuration

- **Timeout:** 60 minutes (safety net for long test runs)
- **Runner:** Ubuntu latest
- **Browser:** Chromium only (for speed; webkit can be added if needed)
- **Retries:** 2 retries in CI (configured in `playwright.config.ts`)
- **Workers:** 1 worker in CI to avoid flakiness (configured in `playwright.config.ts`)

### Viewing Results

#### On Success
Check the "Actions" tab in GitHub to see:
- ✅ All tests passed
- 📊 Test summary
- ⏱️ Runtime duration

#### On Failure
GitHub automatically uploads:
- **HTML Report** - Full interactive test report (30-day retention)
- **Traces** - Playwright traces for debugging failures (7-day retention)

Download artifacts from the workflow run page.

### Local vs CI Differences

| Feature | Local | CI |
|---------|-------|-----|
| Server | `pnpm dev` | `pnpm start` (production) |
| Retries | 0 | 2 |
| Workers | Unlimited | 1 |
| Reporter | HTML only | HTML + GitHub + List |
| Browser reuse | Yes | No |

### Debugging Failed CI Tests

1. **Download the artifacts** from the GitHub Actions run
2. **Extract `playwright-report.zip`**
3. **Open `index.html`** in your browser
4. **View traces** - Click failed tests to see screenshots, network, console

Alternatively, run locally with CI settings:

```bash
CI=true pnpm exec playwright test --project=chromium
```

### Status Badge

Add to your README:

```markdown
![Playwright Tests](https://github.com/YOUR_USERNAME/sql-time-study/actions/workflows/playwright.yml/badge.svg)
```

Replace `YOUR_USERNAME` with your GitHub username or organization.

### Maintenance

**When to update:**
- Node.js version changes
- pnpm version changes
- Playwright version changes (use `pnpm exec playwright install` to update)
- Need to test additional browsers (add to `--project` flag)

**Performance tuning:**
- If tests are slow, check the `timeout-minutes` setting
- If flaky, adjust `retries` in `playwright.config.ts`
- Consider splitting tests into parallel jobs if runtime exceeds 10 minutes
