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
    await expect(page.getByLabel('Student ID')).toBeVisible();
    await expect(page.getByText('SQL Experience Level')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Begin Investigation' })).toBeVisible();
  });

  test('validates empty student ID', async ({ page }) => {
    await page.getByRole('button', { name: 'Begin Investigation' }).click();
    await expect(page.getByText('Please enter your student ID')).toBeVisible();
  });

  test('validates student ID format', async ({ page }) => {
    await page.getByLabel('Student ID').fill('invalid');
    await page.getByRole('button', { name: 'Begin Investigation' }).click();
    await expect(page.getByText(/must be in format/)).toBeVisible();
  });

  test('validates missing SQL expertise', async ({ page }) => {
    await page.getByLabel('Student ID').fill('a12b345');
    await page.getByRole('button', { name: 'Begin Investigation' }).click();
    await expect(page.getByText('Please select your SQL experience level')).toBeVisible();
  });

  test('accepts valid student ID format', async ({ page }) => {
    await page.getByLabel('Student ID').fill('a12b345');
    // Select expertise level
    await page.getByText('0 - Never written SQL').click();
    await page.getByRole('button', { name: 'Begin Investigation' }).click();

    // Should navigate to investigate page
    await expect(page).toHaveURL('/investigate');
  });

  test('auto-lowercases student ID', async ({ page }) => {
    const input = page.getByLabel('Student ID');
    await input.fill('A12B345');
    await expect(input).toHaveValue('a12b345');
  });
});
