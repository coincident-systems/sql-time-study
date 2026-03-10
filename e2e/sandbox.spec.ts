import { test, expect } from '@playwright/test';
import { startSession, dismissNarrative, typeInEditor } from './helpers';

test.describe('Sandbox Mode (?skipTo=)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('skipTo query param lands on correct task', async ({ page }) => {
    await page.goto('/investigate?skipTo=3.2');
    await page.waitForLoadState('domcontentloaded');

    // Should be on task 3.2
    await expect(page.getByText('Query 3.2')).toBeVisible({ timeout: 10000 });
  });

  test('shows sandbox banner', async ({ page }) => {
    await page.goto('/investigate?skipTo=2.1');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('Sandbox Mode')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('progress is not tracked')).toBeVisible();
  });

  test('does not show round narrative in sandbox', async ({ page }) => {
    // Task 2.1 is the first task in round 2 — would normally show narrative
    await page.goto('/investigate?skipTo=2.1');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('Query 2.1')).toBeVisible({ timeout: 10000 });
    // Narrative "Got it" button should NOT be visible
    await expect(page.getByRole('button', { name: /Got it/ })).not.toBeVisible();
  });

  test('does not show progress bar in sandbox', async ({ page }) => {
    await page.goto('/investigate?skipTo=1.1');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('Sandbox Mode')).toBeVisible({ timeout: 10000 });
    // The "X of 18" progress text should not appear
    await expect(page.getByText(/of 18/)).not.toBeVisible();
  });

  test('stays on same task after correct answer', async ({ page }) => {
    await page.goto('/investigate?skipTo=1.1');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('Query 1.1')).toBeVisible({ timeout: 10000 });

    // Submit the correct answer
    await typeInEditor(page, "SELECT * FROM patients WHERE last_name = 'Martinez';");
    await page.getByRole('button', { name: /Submit Answer/ }).click();
    await page.waitForTimeout(500);

    // Should show success
    await expect(page.getByText(/Correct/i)).toBeVisible();

    // Should still be on task 1.1 (not advanced to 1.2)
    await expect(page.getByText('Query 1.1')).toBeVisible();
  });

  test('task picker switches to a different task', async ({ page }) => {
    await page.goto('/investigate?skipTo=1.1');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('Query 1.1')).toBeVisible({ timeout: 10000 });

    // Use the task picker select to jump to 4.2
    const select = page.locator('select');
    await select.selectOption('4.2');
    await page.waitForTimeout(500);

    // Should now be on task 4.2
    await expect(page.getByText('Query 4.2')).toBeVisible();
  });

  test('exit sandbox returns to home with clean state when no prior session', async ({ page }) => {
    await page.goto('/investigate?skipTo=3.1');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('Sandbox Mode')).toBeVisible({ timeout: 10000 });

    // Click Exit Sandbox
    await page.getByRole('button', { name: 'Exit Sandbox' }).click();
    await page.waitForTimeout(500);

    // Should be on home page with intake form (no prior session to restore)
    await expect(page).toHaveURL('/');
    await expect(page.getByLabel('Name')).toBeVisible();
  });

  test('exit sandbox restores active session', async ({ page }) => {
    // Start a real session first
    await startSession(page, 'Jane Doe', '2');

    // Complete the first query so we have real progress
    await dismissNarrative(page);
    await typeInEditor(page, "SELECT * FROM patients WHERE last_name = 'Martinez';");
    await page.getByRole('button', { name: /Submit Answer/ }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Correct/i)).toBeVisible();

    // Now enter sandbox via ?skipTo=
    await page.goto('/investigate?skipTo=4.1');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText('Sandbox Mode')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Query 4.1')).toBeVisible();

    // Exit sandbox
    await page.getByRole('button', { name: 'Exit Sandbox' }).click();
    await page.waitForTimeout(500);

    // Should be back on home page with the original session restored
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Jane Doe')).toBeVisible();
    await expect(page.getByText(/1 \/ 18 queries/i)).toBeVisible();
  });

  test('skipTo from home page redirects to investigate', async ({ page }) => {
    await page.goto('/?skipTo=5.1');
    await page.waitForLoadState('domcontentloaded');

    // Should redirect to /investigate
    await expect(page).toHaveURL('/investigate', { timeout: 10000 });
    await expect(page.getByText('Query 5.1')).toBeVisible();
    await expect(page.getByText('Sandbox Mode')).toBeVisible();
  });

  test('sandbox blocks /complete route', async ({ page }) => {
    await page.goto('/investigate?skipTo=1.1');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText('Sandbox Mode')).toBeVisible({ timeout: 10000 });

    // Try navigating to /complete
    await page.goto('/complete');
    await page.waitForLoadState('domcontentloaded');

    // Should show the sandbox guard, not completion screen
    await expect(page.getByText('Sandbox Mode')).toBeVisible();
    await expect(page.getByText(/not available in sandbox/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back to Sandbox' })).toBeVisible();
  });
});
