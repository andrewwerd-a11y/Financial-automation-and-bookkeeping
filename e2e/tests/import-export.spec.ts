import { expect, test } from '@playwright/test';
import { navigateTo, seedWorkspaceAndBusiness, waitForPageLoad } from './helpers';

test.describe('CSV import and export workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test('import a CSV file and verify transactions are created', async ({ page }) => {
    await seedWorkspaceAndBusiness(page, 'Import Corp', 'Import Business');

    await navigateTo(page, 'Imports');
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'transactions.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Date,Vendor,Amount,Description\n2026-04-01,GitHub,10.00,Monthly subscription\n2026-04-02,USPS,5.50,Shipping label')
    });
    await page.getByRole('button', { name: 'Upload CSV' }).click();
    await expect(page.getByText(/Imported 2 rows, skipped 0/)).toBeVisible();

    await navigateTo(page, 'Transactions');
    await expect(page.getByRole('cell', { name: 'GitHub' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'USPS' })).toBeVisible();
  });

  test('export transactions to CSV and show the completed job row', async ({ page }) => {
    await seedWorkspaceAndBusiness(page, 'Export Corp', 'Export Business');

    await navigateTo(page, 'Transactions');
    await page.locator('input[type="date"]').fill('2026-04-15');
    await page.getByPlaceholder('Vendor').fill('Export Test Vendor');
    await page.getByPlaceholder('Amount').fill('42');
    await page.getByRole('button', { name: 'Create Manual Transaction' }).click();

    await navigateTo(page, 'Exports');
    await page.getByRole('button', { name: 'Export Transactions CSV' }).click();
    await expect(page.getByText(/Created export job/)).toBeVisible();
    await expect(page.getByRole('cell', { name: 'transactions' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'completed' })).toBeVisible();
  });

  test('create an import template and verify it appears in the table', async ({ page }) => {
    await navigateTo(page, 'Import Templates');
    await page.getByPlaceholder('Template name').fill('My Bank CSV');
    await page.getByPlaceholder('Date column').fill('Transaction Date');
    await page.getByPlaceholder('Vendor column').fill('Merchant');
    await page.getByPlaceholder('Amount column').fill('Debit');
    await page.getByRole('button', { name: 'Save Template' }).click();

    await expect(page.getByRole('cell', { name: 'My Bank CSV' })).toBeVisible();
  });

  test('ingestion jobs page shows the completed import job after upload', async ({ page }) => {
    await seedWorkspaceAndBusiness(page, 'Job Corp', 'Job Business');

    await navigateTo(page, 'Imports');
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'quick.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Date,Vendor,Amount\n2026-04-01,Test,10')
    });
    await page.getByRole('button', { name: 'Upload CSV' }).click();
    await expect(page.getByText(/Imported 1 rows, skipped 0/)).toBeVisible();

    await navigateTo(page, 'Ingestion Jobs');
    await expect(page.getByRole('cell', { name: 'csv_import' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'completed' }).first()).toBeVisible();
  });
});
