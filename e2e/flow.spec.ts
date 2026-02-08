import { test, expect } from '@playwright/test';
import { startSession, dismissNarrative, typeInEditor } from './helpers';

test.describe('Full Study Flow', () => {
  test('shows guard message if navigating to investigate without session', async ({ page }) => {
    await page.goto('/investigate');
    await expect(page.getByText('No Active Session')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to Home' })).toBeVisible();
  });

  test('shows guard message if navigating to complete without finishing', async ({ page }) => {
    await startSession(page);
    await page.goto('/complete');
    await expect(page.getByText('Investigation Not Complete')).toBeVisible();
  });

  test('persists session across page refresh', async ({ page }) => {
    await startSession(page, 'a12b345', '2');
    await page.reload();
    await expect(page.getByText('a12b345')).toBeVisible();
    await expect(page.getByText('SQL Level: 2')).toBeVisible();
  });

  test('completes first query successfully', async ({ page }) => {
    await startSession(page);
    await dismissNarrative(page);

    // Query 1.1: Find all patients with last name "Martinez"
    await typeInEditor(page, `SELECT * FROM patients WHERE last_name = 'Martinez';`);
    
    await page.getByRole('button', { name: /Run Query/ }).click();
    await page.waitForTimeout(500);

    // Should show results
    await expect(page.getByText(/rows/i)).toBeVisible();

    // Submit the answer
    await page.getByRole('button', { name: /Submit Answer/ }).click();
    await page.waitForTimeout(500);

    // Should show success feedback
    await expect(page.getByText(/Correct/i)).toBeVisible();
  });

  test('shows error for incorrect query', async ({ page }) => {
    await startSession(page);
    await dismissNarrative(page);

    // Intentionally wrong query
    await typeInEditor(page, `SELECT * FROM patients WHERE first_name = 'Wrong';`);
    
    await page.getByRole('button', { name: /Submit Answer/ }).click();
    await page.waitForTimeout(500);

    // Should show error feedback
    await expect(page.getByText(/don't match|mismatch/i)).toBeVisible();
  });

  test('can run a query without submitting', async ({ page }) => {
    await startSession(page);
    await dismissNarrative(page);

    await typeInEditor(page, `SELECT * FROM patients LIMIT 5;`);
    
    await page.getByRole('button', { name: /Run Query/ }).click();
    await page.waitForTimeout(500);

    // Should show results without advancing
    await expect(page.getByText(/rows/i)).toBeVisible();
    
    // Task should still be 1.1
    await expect(page.getByText('Query 1.1')).toBeVisible();
  });

  test('can navigate home from quiz with dialog', async ({ page }) => {
    await startSession(page);
    await dismissNarrative(page);

    await page.getByRole('button', { name: 'Home' }).click();
    
    // Dialog should appear
    await expect(page.getByText('Return to Home?')).toBeVisible();
    await expect(page.getByText(/progress has been automatically saved/i)).toBeVisible();

    await page.getByRole('button', { name: 'Go to Home' }).click();
    
    // Should navigate to home
    await page.waitForTimeout(500);
    await expect(page.getByText('Session In Progress')).toBeVisible();
  });
});
