import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays the landing page with title', async ({ page }) => {
    await expect(page).toHaveTitle(/SQL Time Study Lab/);
    await expect(page.getByRole('heading', { name: /SQL Time Study Lab/ })).toBeVisible();
  });

  test('shows intake form', async ({ page }) => {
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByText('SQL Experience Level')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Begin Investigation' })).toBeVisible();
  });

  test('validates empty name', async ({ page }) => {
    await page.getByRole('button', { name: 'Begin Investigation' }).click();
    await expect(page.getByText('Please enter your name')).toBeVisible();
  });

  test('validates name format', async ({ page }) => {
    await page.getByLabel('Name').fill('X');
    await page.getByRole('button', { name: 'Begin Investigation' }).click();
    await expect(page.getByText(/must be 2-50 characters/)).toBeVisible();
  });

  test('validates missing SQL expertise', async ({ page }) => {
    await page.getByLabel('Name').fill('John Martinez');
    await page.getByRole('button', { name: 'Begin Investigation' }).click();
    await expect(page.getByText('Please select your SQL experience level')).toBeVisible();
  });

  test('accepts valid name', async ({ page }) => {
    const studentNameInput = page.getByLabel('Name');
    await studentNameInput.click();
    await studentNameInput.fill('John Martinez');
    
    // Select expertise level
    await page.getByText('0 - Never written SQL').click();
    
    // Click form submit button
    await page.getByRole('button', { name: 'Begin Investigation' }).first().click();

    // Should show the session manager
    await expect(page.getByText('Session In Progress')).toBeVisible({ timeout: 10000 });
    
    // Now click the "Begin Investigation" button in SessionManager to navigate
    await page.getByRole('button', { name: /Begin Investigation|Resume Investigation/ }).last().click();
    
    // Should navigate to investigate page
    await expect(page).toHaveURL('/investigate');
  });

  test('preserves name casing', async ({ page }) => {
    const input = page.getByLabel('Name');
    await input.fill("Mary O'Brien");
    await expect(input).toHaveValue("Mary O'Brien");
  });
});
