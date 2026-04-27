import { expect, test } from '@playwright/test';
import { navigateTo, waitForPageLoad } from './helpers';

test.describe('Workspace and settings management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test('create a workspace, create a user, and add the user as a member', async ({ page }) => {
    await navigateTo(page, 'Workspace');

    await page.getByPlaceholder('Workspace name').fill('Acme Corp');
    await page.getByPlaceholder('Workspace slug').fill('acme-corp');
    await page.getByRole('button', { name: 'Create Workspace' }).click();
    await expect(page.getByRole('cell', { name: 'Acme Corp' })).toBeVisible();

    await page.getByPlaceholder('Display name').fill('Jane Operator');
    await page.getByPlaceholder('Email').fill('jane@acme.com');
    await page.getByRole('button', { name: 'Create User' }).click();

    const selectWorkspace = page.getByRole('button', { name: 'Select' }).first();
    if (await selectWorkspace.isVisible()) {
      await selectWorkspace.click();
    }

    await page.getByRole('combobox').nth(0).selectOption({ label: 'Jane Operator' });
    await page.getByRole('button', { name: 'Add Member' }).click();
    await expect(page.getByText('Jane Operator (admin)')).toBeVisible();
  });

  test('create and edit a workspace setting', async ({ page }) => {
    await navigateTo(page, 'Workspace');
    await page.getByPlaceholder('Workspace name').fill('Settings Corp');
    await page.getByPlaceholder('Workspace slug').fill('settings-corp');
    await page.getByRole('button', { name: 'Create Workspace' }).click();

    const selectWorkspace = page.getByRole('button', { name: 'Select' }).first();
    if (await selectWorkspace.isVisible()) {
      await selectWorkspace.click();
    }

    await navigateTo(page, 'Settings');
    await page.getByPlaceholder('Setting key').fill('fiscal_year_start');
    await page.getByPlaceholder('JSON value or plain text').fill('"January"');
    await page.getByRole('button', { name: 'Create Setting' }).click();
    await expect(page.getByRole('cell', { name: 'fiscal_year_start' })).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).click();
    await page.locator('textarea').nth(1).fill('"February"');
    await page.getByRole('button', { name: 'Save Setting' }).click();
    await expect(page.getByText('Setting updated.')).toBeVisible();
  });

  test('settings page shows backend health and DB status', async ({ page }) => {
    await navigateTo(page, 'Settings');
    await expect(page.getByText(/Backend health:/)).toBeVisible();
    await expect(page.getByText(/"dbOk": true/)).toBeVisible();
  });
});
