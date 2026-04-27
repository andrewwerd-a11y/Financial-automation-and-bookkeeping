import { expect, test } from '@playwright/test';
import { navigateTo, seedWorkspaceAndBusiness, waitForPageLoad } from './helpers';

test.describe('Transaction lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test('create workspace and business, create transaction, and verify dashboard reflects the flow', async ({ page }) => {
    await seedWorkspaceAndBusiness(page, 'Test Corp', 'Main Business');

    await navigateTo(page, 'Transactions');
    await page.locator('input[type="date"]').fill('2026-04-15');
    await page.getByPlaceholder('Vendor').fill('GitHub');
    await page.getByPlaceholder('Amount').fill('10');
    await page.getByRole('button', { name: 'Create Manual Transaction' }).click();

    await expect(page.getByRole('cell', { name: 'GitHub' })).toBeVisible();
    await page.getByRole('button', { name: 'Open' }).first().click();
    await expect(page.getByText('Transaction Detail')).toBeVisible();
    await expect(page.getByText(/Vendor:/)).toBeVisible();

    await navigateTo(page, 'Dashboard');
    await expect(page.locator('.stats')).toContainText('Transactions:');
  });

  test('upload a document and link it to a transaction from the transaction detail panel', async ({ page }) => {
    await seedWorkspaceAndBusiness(page, 'Upload Corp', 'Upload Business');

    await navigateTo(page, 'Transactions');
    await page.locator('input[type="date"]').fill('2026-04-15');
    await page.getByPlaceholder('Vendor').fill('Office Depot');
    await page.getByPlaceholder('Amount').fill('55');
    await page.getByRole('button', { name: 'Create Manual Transaction' }).click();
    await expect(page.getByRole('cell', { name: 'Office Depot' })).toBeVisible();

    await navigateTo(page, 'Documents');
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'receipt.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 mock receipt')
    });
    await page.getByRole('button', { name: 'Upload Document' }).click();
    await expect(page.getByText('Document uploaded.')).toBeVisible();

    await navigateTo(page, 'Transactions');
    await page.getByRole('button', { name: 'Open' }).first().click();
    await page.locator('select').nth(0).selectOption({ label: 'receipt.pdf' });
    await page.getByRole('button', { name: 'Link Document' }).click();
    await expect(page.getByText('receipt.pdf (linked)')).toBeVisible();
  });

  test('review queue shows needs_review transactions and approve removes them from the queue', async ({ page }) => {
    await seedWorkspaceAndBusiness(page, 'Review Corp', 'Review Business');

    await navigateTo(page, 'Transactions');
    await page.locator('input[type="date"]').fill('2026-04-15');
    await page.getByPlaceholder('Vendor').fill('Meals Restaurant');
    await page.getByPlaceholder('Amount').fill('30');
    await page.getByRole('button', { name: 'Create Manual Transaction' }).click();

    await navigateTo(page, 'Review Queue');
    const mealRow = page.locator('tbody tr').filter({ has: page.getByRole('cell', { name: 'Meals Restaurant' }) }).first();
    await expect(mealRow).toBeVisible();
    await mealRow.getByRole('button', { name: 'Approve' }).click();
    await expect(mealRow).toContainText('approved');
  });

  test('policy creation and backfill shows a completion message', async ({ page }) => {
    await seedWorkspaceAndBusiness(page, 'Policy Corp', 'Policy Business');

    await navigateTo(page, 'Transactions');
    await page.locator('input[type="date"]').fill('2026-04-15');
    await page.getByPlaceholder('Vendor').fill('Big Vendor');
    await page.getByPlaceholder('Amount').fill('200');
    await page.getByRole('button', { name: 'Create Manual Transaction' }).click();

    await navigateTo(page, 'Policy Rules');
    await page.getByPlaceholder('Threshold').fill('100');
    await page.getByRole('button', { name: 'Create Rule' }).click();
    await page.getByRole('button', { name: 'Backfill Existing Transactions' }).click();
    await expect(page.getByText(/Backfilled/)).toBeVisible();
  });
});
