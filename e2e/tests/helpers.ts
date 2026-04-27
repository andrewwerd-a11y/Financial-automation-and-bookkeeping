import { expect, Page } from '@playwright/test';

export async function waitForPageLoad(page: Page) {
  await page.waitForFunction(() => {
    return !Array.from(document.querySelectorAll('p')).some((node) =>
      (node.textContent ?? '').includes('Loading')
    );
  }, { timeout: 5000 });
}

export async function navigateTo(page: Page, tabLabel: string) {
  await page.getByRole('button', { name: tabLabel, exact: true }).click();
  await waitForPageLoad(page);
}

export async function waitForSidebarSelection(page: Page, kind: 'Workspace' | 'Business') {
  await expect.poll(async () => {
    const text = await page.locator('.sidebar').getByText(new RegExp(`^${kind}:`)).textContent();
    return text ?? '';
  }).not.toContain('none selected');
}

export async function seedWorkspaceAndBusiness(page: Page, workspaceName: string, businessName: string) {
  await navigateTo(page, 'Workspace');
  await page.getByPlaceholder('Workspace name').fill(workspaceName);
  await page.getByPlaceholder('Workspace slug').fill(workspaceName.toLowerCase().replace(/\s+/g, '-'));
  await page.getByRole('button', { name: 'Create Workspace' }).click();
  await expect(page.getByRole('cell', { name: workspaceName })).toBeVisible();
  await waitForSidebarSelection(page, 'Workspace');

  const selectWorkspace = page.getByRole('button', { name: 'Select' }).first();
  if (await selectWorkspace.isVisible()) {
    await selectWorkspace.click();
    await waitForSidebarSelection(page, 'Workspace');
  }

  await navigateTo(page, 'Businesses');
  await page.getByPlaceholder('Business name').fill(businessName);
  await page.getByRole('button', { name: 'Create Business' }).click();
  await expect(page.getByRole('cell', { name: businessName })).toBeVisible();
  await waitForSidebarSelection(page, 'Business');

  const selectBusiness = page.getByRole('button', { name: 'Select' }).first();
  if (await selectBusiness.isVisible()) {
    await selectBusiness.click();
    await waitForSidebarSelection(page, 'Business');
  }
}
