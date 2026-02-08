# CI Testing Guide

## Overview

The SQL Time Study Lab uses GitHub Actions to automatically run Playwright tests on every push and pull request. This ensures code quality and prevents regressions.

## Quick Commands

```bash
# Run tests exactly as CI does
CI=true pnpm exec playwright test --project=chromium

# Run specific test file in CI mode
CI=true pnpm exec playwright test e2e/marathon.spec.ts

# Run with HTML report
CI=true pnpm exec playwright test --reporter=html

# Debug a specific test in CI mode
CI=true pnpm exec playwright test --debug "completes all 18"
```

## CI Configuration Summary

### Environment
- **OS:** Ubuntu (latest)
- **Node:** v20
- **Package Manager:** pnpm v8
- **Browser:** Chromium (installed with system dependencies)

### Test Settings (Automatic in CI)
- **Retries:** 2 (vs 0 locally)
- **Workers:** 1 (vs unlimited locally)
- **Server:** Production build (vs dev server locally)
- **Reporter:** Multiple (HTML + GitHub + List)

### Artifacts
- **Test Report:** 30-day retention
- **Traces (on failure):** 7-day retention
- **Screenshots (on failure):** Included in traces

## Common Issues & Solutions

### 1. Tests Pass Locally, Fail in CI

**Possible causes:**
- Timing issues (CI is slower)
- Different server (dev vs production)
- Environment variables missing

**Debug steps:**
```bash
# 1. Run with CI=true flag locally
CI=true pnpm exec playwright test

# 2. Test against production build
pnpm build
pnpm start
# In another terminal:
pnpm exec playwright test

# 3. Download CI artifacts and inspect traces
# (from GitHub Actions run page)
```

### 2. Flaky Tests

**Symptoms:**
- Tests pass sometimes, fail other times
- Different results on retry

**Solutions:**
```typescript
// Add explicit waits
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500); // Last resort

// Use better selectors
await page.getByRole('button', { name: 'Submit' }); // Good
await page.locator('button').first(); // Bad (fragile)

// Increase timeouts for specific assertions
await expect(page.getByText('Loaded')).toBeVisible({ timeout: 10000 });
```

**Configure retries:**
```typescript
// playwright.config.ts
retries: process.env.CI ? 2 : 0,
```

### 3. Timeout Errors

**Error:** `Test timeout of 30000ms exceeded`

**Solutions:**
1. Increase test timeout in config:
```typescript
// playwright.config.ts
timeout: 60000, // 60 seconds
```

2. Or per-test:
```typescript
test('long test', async ({ page }) => {
  test.setTimeout(120000); // 2 minutes
  // ...
});
```

3. Or increase webServer timeout:
```typescript
// playwright.config.ts
webServer: {
  timeout: 180000, // 3 minutes for server to start
}
```

### 4. Browser Installation Fails

**Error:** `Executable doesn't exist at /home/runner/...`

**Solution:** Update GitHub workflow:
```yaml
- name: Install Playwright browsers
  run: pnpm exec playwright install --with-deps chromium
```

The `--with-deps` flag installs system dependencies needed by browsers.

### 5. Out of Memory

**Error:** `FATAL ERROR: Reached heap limit`

**Solution:** Add Node options to workflow:
```yaml
- name: Run Playwright tests
  run: pnpm exec playwright test --project=chromium
  env:
    CI: true
    NODE_OPTIONS: "--max-old-space-size=4096"
```

## Optimization Tips

### Speed Up CI Runs

1. **Cache pnpm store** (already configured):
```yaml
- uses: actions/cache@v4
  with:
    path: ${{ env.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
```

2. **Install only Chromium** (vs all browsers):
```bash
pnpm exec playwright install chromium
```

3. **Use `--workers=1` in CI** (already configured):
```typescript
workers: process.env.CI ? 1 : undefined,
```

4. **Skip Storybook build** if not needed:
```yaml
- name: Build application
  run: pnpm build
  # Don't run pnpm build-storybook
```

### Parallel Test Jobs

If test suite grows beyond 5 minutes, split into jobs:

```yaml
jobs:
  test:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      # ...
      - name: Run Playwright tests
        run: pnpm exec playwright test --shard=${{ matrix.shard }}/4
```

## Monitoring

### Check Status Badge

Add to README for at-a-glance status:

```markdown
![Playwright Tests](https://github.com/YOUR_USERNAME/sql-time-study/actions/workflows/playwright.yml/badge.svg)
```

### GitHub Notifications

Configure in GitHub Settings → Notifications:
- Email on failed workflows
- Slack/Discord webhook for team alerts

### View Trends

Go to Actions → Playwright Tests → Click "..." → View insights

Shows:
- Success rate over time
- Average duration
- Flaky test detection

## Local Testing Best Practices

### Before Committing

```bash
# 1. Run all tests
pnpm exec playwright test

# 2. Run in CI mode to catch issues early
CI=true pnpm exec playwright test --project=chromium

# 3. Check if production build works
pnpm build
pnpm start
pnpm exec playwright test

# 4. Lint code
pnpm lint
```

### Creating New Tests

1. **Write test locally** with `--headed` mode:
```bash
pnpm exec playwright test --headed
```

2. **Test in CI mode** before pushing:
```bash
CI=true pnpm exec playwright test your-test.spec.ts
```

3. **Generate test code** (optional):
```bash
pnpm exec playwright codegen http://localhost:3000
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Our Playwright Config](../playwright.config.ts)
- [Our GitHub Workflow](../.github/workflows/playwright.yml)
- [Test Helpers](../e2e/helpers.ts)

## Getting Help

If tests fail in CI:

1. **Check the logs** in GitHub Actions
2. **Download artifacts** (HTML report + traces)
3. **Reproduce locally** with `CI=true`
4. **Open issue** with:
   - Test name
   - Error message
   - Link to failed run
   - Screenshots/traces (from artifacts)
