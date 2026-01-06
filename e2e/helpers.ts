import { Page, expect } from '@playwright/test';

/**
 * Type SQL into the Monaco editor.
 * Monaco is tricky - we need to click, then type character by character with delays.
 */
export async function typeInEditor(page: Page, sql: string) {
  const editorContainer = page.locator('.monaco-editor');
  await editorContainer.waitFor({ state: 'visible' });

  // Click to focus the editor
  await editorContainer.click();

  // Small delay to ensure focus
  await page.waitForTimeout(100);

  // Type with slight delays between characters for reliability
  await page.keyboard.type(sql, { delay: 10 });

  // Wait for the editor to update
  await page.waitForTimeout(100);
}

/**
 * Start a study session by filling in the intake form.
 */
export async function startSession(page: Page, studentId = 'a12b345', expertise = '0 - Never written SQL') {
  await page.goto('/');
  await page.getByLabel('Student ID').fill(studentId);
  await page.getByText(expertise).click();
  await page.getByRole('button', { name: 'Begin Investigation' }).click();
  await expect(page).toHaveURL('/investigate');
}

/**
 * Dismiss the round narrative modal.
 */
export async function dismissNarrative(page: Page) {
  const gotItButton = page.getByRole('button', { name: /Got it/ });
  if (await gotItButton.isVisible()) {
    await gotItButton.click();
  }
}
