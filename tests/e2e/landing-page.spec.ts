import { test, expect } from '@playwright/test';

test.describe('Landing Page E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the landing page', async ({ page }) => {
    await expect(page).toHaveTitle(/الهواري/);
  });

  test('should display main heading', async ({ page }) => {
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('should have navigation links', async ({ page }) => {
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('should have proper accessibility', async ({ page }) => {
    const images = await page.locator('img').count();
    for (let i = 0; i < images; i++) {
      const img = page.locator('img').nth(i);
      const altText = await img.getAttribute('alt');
      expect(altText).toBeTruthy();
    }
  });
});

test.describe('Contact Form E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should submit valid contact form', async ({ page }) => {
    const nameInput = page.locator('input[name="name"]');
    const emailInput = page.locator('input[name="email"]');
    const messageInput = page.locator('textarea[name="message"]');
    const submitButton = page.locator('button[type="submit"]');

    if (await nameInput.isVisible()) {
      await nameInput.fill('احمد علي');
      await emailInput.fill('ahmad@example.com');
      await messageInput.fill('احتاج استشارة قانونية');
      await submitButton.click();

      const successMessage = page.locator('text=تم الإرسال');
      await expect(successMessage).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show validation errors for invalid input', async ({ page }) => {
    const emailInput = page.locator('input[name="email"]');
    const submitButton = page.locator('button[type="submit"]');

    if (await emailInput.isVisible()) {
      await emailInput.fill('invalid-email');
      await submitButton.click();

      const errorMessage = page.locator('text=بريد إلكتروني غير صحيح');
      await expect(errorMessage).toBeVisible({ timeout: 3000 });
    }
  });
});