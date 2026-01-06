import { test, expect } from '@playwright/test';
import { startSession, dismissNarrative } from './helpers';

// Note: Tests that require typing in Monaco editor are skipped for now.
// Monaco's controlled component doesn't respond to Playwright keyboard.type().
// TODO: Implement via page.evaluate() to call Monaco's setValue() directly.

test.describe('Full Study Flow', () => {
  test.skip('completes first query successfully', async ({ page }) => {
    // Skipped: requires Monaco input
  });

  test.skip('shows error for incorrect query', async ({ page }) => {
    // Skipped: requires Monaco input
  });

  test('redirects to landing if no session', async ({ page }) => {
    await page.goto('/investigate');
    await expect(page).toHaveURL('/');
  });

  test('redirects to landing if accessing complete without finishing', async ({ page }) => {
    await startSession(page);
    await page.goto('/complete');
    await expect(page).toHaveURL('/investigate');
  });

  test('persists session across page refresh', async ({ page }) => {
    await startSession(page, 'a12b345', '2 - Used in a class or project');
    await page.reload();
    await expect(page).toHaveURL('/investigate');
    await expect(page.getByText('a12b345')).toBeVisible();
  });

  test.skip('can run a query without submitting', async ({ page }) => {
    // Skipped: requires Monaco input
  });
});
