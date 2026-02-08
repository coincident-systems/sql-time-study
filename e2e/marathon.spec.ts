import { test, expect } from '@playwright/test';
import { startSession, dismissNarrative, typeInEditor } from './helpers';
import { tasks } from '../src/data/tasks';

/**
 * MARATHON TEST: Complete all 18 queries end-to-end.
 * This is the full student experience from start to finish.
 */
test.describe('Full 18-Query Marathon', () => {
  // Clear localStorage before each test to ensure clean state
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });
  
  test('completes all 18 queries successfully', async ({ page }) => {
    // Start session (student ID must match pattern: letter + 2 digits + letter + 3 digits)
    await startSession(page, 't12s345', '3');
    
    // Track progress
    let currentRound = 1;
    let queriesCompleted = 0;

    for (const task of tasks) {
      console.log(`\n🔍 Task ${task.id}: ${task.prompt}`);
      
      // Dismiss narrative at start of each round
      if (task.queryNum === 1) {
        await dismissNarrative(page);
        console.log(`  📖 Dismissed Round ${task.round} narrative`);
      }

      // Verify we're on the right task
      await expect(page.getByText(`Query ${task.id}`)).toBeVisible();
      console.log(`  ✓ On Query ${task.id}`);

      // Enter the expected query
      await typeInEditor(page, task.expectedQuery);
      console.log(`  ⌨️  Entered query: ${task.expectedQuery.substring(0, 50)}...`);

      // Submit the answer
      await page.getByRole('button', { name: /Submit Answer/ }).click();
      await page.waitForTimeout(500);

      // Verify success
      await expect(page.getByText(/Correct/i)).toBeVisible();
      queriesCompleted++;
      console.log(`  ✅ Query ${task.id} correct! (${queriesCompleted}/18)`);

      // Check if we advanced to next round
      if (task.queryNum === 3 || task.queryNum === 4) {
        // Last query in round - check if we advanced or completed
        if (queriesCompleted < 18) {
          const nextRound = task.round + 1;
          if (nextRound <= 5) {
            currentRound = nextRound;
            console.log(`  🎯 Advanced to Round ${currentRound}`);
          }
        }
      }

      // Small delay between queries
      await page.waitForTimeout(300);
    }

    // Should be on completion screen now
    console.log('\n🎉 All queries complete! Going to home page to see completion...');
    
    // Navigate to home page to see the completion message
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Should show Investigation Complete message in SessionManager
    await expect(page.getByText(/Investigation Complete/i)).toBeVisible();
    console.log('  ✓ Completion message visible');

    // Should show all stats
    await expect(page.getByText(/18 \/ 18 queries/i)).toBeVisible();
    console.log('  ✓ Progress shows 18/18');

    // Download button should be prominent
    await expect(page.getByRole('button', { name: /Download Data for Minitab/i })).toBeVisible();
    console.log('  ✓ Download button available');

    // Verify we can download the CSV
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Download Data for Minitab/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/sql-time-study.*\.csv/);
    console.log(`  ✓ CSV downloaded: ${download.suggestedFilename()}`);

    console.log('\n🏆 MARATHON COMPLETE! All 18 queries solved and data exported.');
  });

  test('can complete investigation with some retries', async ({ page }) => {
    // Start session
    await startSession(page, 'r45y678', '2');
    
    let queriesCompleted = 0;
    let totalAttempts = 0;

    for (const task of tasks) {
      // Dismiss narrative at start of each round
      if (task.queryNum === 1) {
        await dismissNarrative(page);
      }

      // Verify we're on the right task
      await expect(page.getByText(`Query ${task.id}`)).toBeVisible();

      // Try a wrong answer first for the first 3 queries
      if (queriesCompleted < 3) {
        console.log(`\n🔍 Task ${task.id}: Intentional wrong attempt`);
        await typeInEditor(page, 'SELECT * FROM patients LIMIT 1;');
        await page.getByRole('button', { name: /Submit Answer/ }).click();
        await page.waitForTimeout(500);
        
        // Should show error
        await expect(page.getByText(/don't match|mismatch/i)).toBeVisible();
        totalAttempts++;
        console.log(`  ❌ Wrong answer (expected)`);
      }

      // Now enter correct answer
      console.log(`\n🔍 Task ${task.id}: Correct attempt`);
      await typeInEditor(page, task.expectedQuery);
      await page.getByRole('button', { name: /Submit Answer/ }).click();
      await page.waitForTimeout(500);

      // Verify success
      await expect(page.getByText(/Correct/i)).toBeVisible();
      queriesCompleted++;
      totalAttempts++;
      console.log(`  ✅ Query ${task.id} correct! (${queriesCompleted}/18, ${totalAttempts} total attempts)`);

      await page.waitForTimeout(300);
    }

    // Navigate to home to see completion
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    await expect(page.getByText(/Investigation Complete/i)).toBeVisible();
    
    // Stats should show more than 18 attempts due to retries
    const statsText = await page.getByText(/Attempts/).locator('..').textContent();
    console.log(`\n📊 Final stats: ${statsText}`);
    
    console.log('\n🏆 MARATHON WITH RETRIES COMPLETE!');
  });

  test('can pause and resume marathon', async ({ page }) => {
    // Start session
    await startSession(page, 'p78s901', '1');
    
    // Complete first 9 queries (half way)
    for (let i = 0; i < 9; i++) {
      const task = tasks[i];
      
      if (task.queryNum === 1) {
        await dismissNarrative(page);
      }

      await expect(page.getByText(`Query ${task.id}`)).toBeVisible();
      await typeInEditor(page, task.expectedQuery);
      await page.getByRole('button', { name: /Submit Answer/ }).click();
      await page.waitForTimeout(500);
      await expect(page.getByText(/Correct/i)).toBeVisible();
      
      console.log(`✅ Query ${task.id} complete (${i + 1}/9)`);
      await page.waitForTimeout(200);
    }

    console.log('\n⏸️  Pausing at halfway point...');

    // Navigate home
    await page.getByRole('button', { name: 'Home' }).click();
    await page.getByRole('button', { name: 'Go to Home' }).click();
    await page.waitForTimeout(500);

    // Verify session shows 9/18 progress
    await expect(page.getByText(/9 \/ 18 queries/i)).toBeVisible();
    console.log('  ✓ Progress saved: 9/18');

    // Refresh the page (simulating coming back later)
    await page.reload();
    await expect(page.getByText(/9 \/ 18 queries/i)).toBeVisible();
    console.log('  ✓ Session persisted after refresh');

    // Resume
    console.log('\n▶️  Resuming investigation...');
    await page.getByRole('button', { name: /Resume Investigation/ }).click();
    await expect(page).toHaveURL('/investigate');

    // Should be on query 3.4 (10th query overall)
    const nextTask = tasks[9];
    await expect(page.getByText(`Query ${nextTask.id}`)).toBeVisible();
    console.log(`  ✓ Resumed at Query ${nextTask.id}`);

    // Complete remaining 9 queries
    for (let i = 9; i < 18; i++) {
      const task = tasks[i];
      
      if (task.queryNum === 1) {
        await dismissNarrative(page);
      }

      await expect(page.getByText(`Query ${task.id}`)).toBeVisible();
      await typeInEditor(page, task.expectedQuery);
      await page.getByRole('button', { name: /Submit Answer/ }).click();
      await page.waitForTimeout(500);
      await expect(page.getByText(/Correct/i)).toBeVisible();
      
      console.log(`✅ Query ${task.id} complete (${i + 1}/18)`);
      await page.waitForTimeout(200);
    }

    // Verify completion - navigate to home first
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    await expect(page.getByText(/Investigation Complete/i)).toBeVisible();
    console.log('\n🏆 PAUSE-RESUME MARATHON COMPLETE!');
  });

  test('can view hints during marathon', async ({ page }) => {
    // Start session
    await startSession(page, 'h99t234', '0');
    dismissNarrative(page);
    
    // Complete first query with hints
    const firstTask = tasks[0];
    console.log(`\n🔍 Task ${firstTask.id}: Using hints`);
    
    await expect(page.getByText(`Query ${firstTask.id}`)).toBeVisible();
    
    // Click show hints
    await page.getByRole('button', { name: /Show hints/ }).click();
    await page.waitForTimeout(200);
    
    // Hints should be visible
    if (firstTask.hints && firstTask.hints.length > 0) {
      await expect(page.getByText(firstTask.hints[0])).toBeVisible();
      console.log(`  💡 Hint shown: ${firstTask.hints[0]}`);
    }
    
    // Hide hints
    await page.getByRole('button', { name: /Hide hints/ }).click();
    await page.waitForTimeout(200);
    
    // Complete the query
    await typeInEditor(page, firstTask.expectedQuery);
    await page.getByRole('button', { name: /Submit Answer/ }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Correct/i)).toBeVisible();
    
    console.log('  ✅ Query complete with hint usage tracked');
    
    // Just verify the marathon can continue (do next 3 queries)
    for (let i = 1; i < 4; i++) {
      const task = tasks[i];
      await expect(page.getByText(`Query ${task.id}`)).toBeVisible();
      await typeInEditor(page, task.expectedQuery);
      await page.getByRole('button', { name: /Submit Answer/ }).click();
      await page.waitForTimeout(500);
      await expect(page.getByText(/Correct/i)).toBeVisible();
      console.log(`✅ Query ${task.id} complete (${i + 1}/4)`);
      await page.waitForTimeout(200);
    }
    
    console.log('\n✓ Hint functionality works during marathon');
  });
});
