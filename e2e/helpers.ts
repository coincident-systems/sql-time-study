import { Page, expect } from '@playwright/test';

/**
 * Type SQL into the Monaco editor.
 * Uses Monaco's API via page.evaluate() since keyboard events don't work with controlled components.
 */
export async function typeInEditor(page: Page, sql: string) {
  const editorContainer = page.locator('.monaco-editor');
  await editorContainer.waitFor({ state: 'visible' });

  // Use Monaco's API to set the value and trigger the onChange handler
  await page.evaluate((sqlText) => {
    // Monaco stores editors in a global registry
    // @ts-ignore - accessing Monaco global
    const editors = window.monaco?.editor?.getEditors?.();
    if (editors && editors.length > 0) {
      const editor = editors[0]; // Assume first editor is our SQL editor
      
      // Set the value which should trigger the onDidChangeModelContent listener
      const model = editor.getModel();
      if (model) {
        // Replace the entire content
        model.setValue(sqlText);
      }
    }
  }, sql);

  // Wait for React state to update
  await page.waitForTimeout(300);
}

/**
 * Start a study session by filling in the intake form.
 */
export async function startSession(page: Page, studentId = 'a12b345', expertiseLevel: '0' | '1' | '2' | '3' = '0') {
  await page.goto('/');
  
  // Wait for the page to load
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for the intake form to be visible
  const studentIdInput = page.getByLabel('Student ID');
  await expect(studentIdInput).toBeVisible({ timeout: 5000 });
  
  // Click the input first to focus it, then fill it
  await studentIdInput.click();
  await studentIdInput.fill(studentId);
  
  // Click the radio button directly using a more specific selector
  const expertiseLabels = {
    '0': 'Never written SQL',
    '1': 'Done a tutorial',
    '2': 'Used in a class or project',
    '3': 'Use it regularly',
  };
  
  await page.getByLabel(new RegExp(`${expertiseLevel} - ${expertiseLabels[expertiseLevel]}`)).click();
  
  // Click the form submit button to create the session
  // There's only one "Begin Investigation" button visible at this point (in the form)
  await page.getByRole('button', { name: 'Begin Investigation' }).first().click();
  
  // Wait for the session manager card to appear with "Session In Progress" title
  await expect(page.getByText('Session In Progress')).toBeVisible({ timeout: 10000 });
  
  // Now there should be a second "Begin Investigation" button (with a Play icon) to navigate
  // Use .last() to get the SessionManager button, not the form button
  await page.waitForTimeout(500); // Brief wait for React state to fully update
  
  const continueButton = page.getByRole('button', { name: /Begin Investigation|Resume Investigation/ }).last();
  await continueButton.click();
  
  // Wait for navigation to investigate page
  await expect(page).toHaveURL('/investigate', { timeout: 5000 });
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
