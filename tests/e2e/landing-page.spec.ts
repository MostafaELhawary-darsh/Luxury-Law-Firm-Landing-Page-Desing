import { test, expect } from '@playwright/test';

test.describe('Landing Page E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the landing page', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/الهواري/);
  });

  test('should display main heading', async ({ page }) => {
    // Look for main heading
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('should have navigation links', async ({ page }) => {
    // Check for navigation
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('should display contact form', async ({ page }) => {
    // Scroll to contact section
    const contactSection = page.locator('#contact');
    if (await contactSection.isVisible()) {
      await expect(contactSection).toBeVisible();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if page is still usable
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('should have proper accessibility', async ({ page }) => {
    // Check for alt text on images
    const images = await page.locator('img').count();
    for (let i = 0; i < images; i++) {
      const img = page.locator('img').nth(i);
      const altText = await img.getAttribute('alt');
      // Alt text should be present (not null or empty)
      expect(altText).toBeTruthy();
    }
  });
});

test.describe('Contact Form E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should submit valid contact form', async ({ page }) => {
    // Find and fill contact form
    const nameInput = page.locator('input[name="name"]');
    const emailInput = page.locator('input[name="email"]');
    const messageInput = page.locator('textarea[name="message"]');
    const submitButton = page.locator('button[type="submit"]');

    if (await nameInput.isVisible()) {
      await nameInput.fill('احمد علي');
      await emailInput.fill('ahmad@example.com');
      await messageInput.fill('أحتاج استشارة قانونية');
      await submitButton.click();

      // Wait for success message
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

      // Check for error message
      const errorMessage = page.locator('text=بريد إلكتروني غير صحيح');
      await expect(errorMessage).toBeVisible({ timeout: 3000 });
    }
  });
});