import { test, expect } from '@playwright/test';

test.describe('Investigation Page', () => {
  test.beforeEach(async ({ page }) => {
    // Start a session first
    await page.goto('/');
    await page.getByLabel('Student ID').fill('a12b345');
    await page.getByText('0 - Never written SQL').click();
    await page.getByRole('button', { name: 'Begin Investigation' }).click();
    await expect(page).toHaveURL('/investigate');
  });

  test('displays the investigation interface', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Bozeman Deaconess Hospital Investigation/ })).toBeVisible();
    await expect(page.getByText('Query 1.1')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run Query' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit Answer' })).toBeVisible();
  });

  test('shows round narrative on first query', async ({ page }) => {
    await expect(page.getByText(/Welcome to Bozeman Deaconess Hospital/)).toBeVisible();
    await page.getByRole('button', { name: /Got it/ }).click();
    await expect(page.getByText(/Welcome to Bozeman Deaconess Hospital/)).not.toBeVisible();
  });

  test('displays schema reference', async ({ page }) => {
    // Wait for the schema sidebar to load
    await expect(page.getByText('Schema Reference')).toBeVisible({ timeout: 10000 });
    // Table names appear in expandable sections
    await expect(page.locator('text=patients').first()).toBeVisible();
    await expect(page.locator('text=medications').first()).toBeVisible();
  });

  test.skip('can type in the SQL editor', async ({ page }) => {
    // Skipped: Monaco controlled component doesn't respond to Playwright keyboard.type()
    // TODO: Use page.evaluate() to call Monaco's setValue() directly
  });

  test('shows hints when clicked', async ({ page }) => {
    await page.getByRole('button', { name: /Got it/ }).click();

    // Click show hints
    const hintsButton = page.getByRole('button', { name: /Show hints/i });
    await hintsButton.click();
    await expect(page.getByRole('button', { name: /Hide hints/i })).toBeVisible();
  });

  test('shows progress indicator', async ({ page }) => {
    await expect(page.getByText(/1 of 18/)).toBeVisible();
  });

  test('Run Query button is disabled when editor is empty', async ({ page }) => {
    await page.getByRole('button', { name: /Got it/ }).click();
    // Should be disabled initially with empty editor
    await expect(page.getByRole('button', { name: 'Run Query' })).toBeDisabled();
  });
});
