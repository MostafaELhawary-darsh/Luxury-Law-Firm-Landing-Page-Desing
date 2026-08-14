import { test, expect } from '@playwright/test';

test.describe('Navigation E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to services section', async ({ page }) => {
    const servicesLink = page.locator('a[href="#services"]');
    if (await servicesLink.isVisible()) {
      await servicesLink.click();
      const servicesSection = page.locator('#services');
      await expect(servicesSection).toBeInViewport();
    }
  });

  test('should navigate to team section', async ({ page }) => {
    const teamLink = page.locator('a[href="#team"]');
    if (await teamLink.isVisible()) {
      await teamLink.click();
      const teamSection = page.locator('#team');
      await expect(teamSection).toBeInViewport();
    }
  });

  test('should navigate to contact section', async ({ page }) => {
    const contactLink = page.locator('a[href="#contact"]');
    if (await contactLink.isVisible()) {
      await contactLink.click();
      const contactSection = page.locator('#contact');
      await expect(contactSection).toBeInViewport();
    }
  });

  test('should handle smooth scrolling', async ({ page }) => {
    const initialScroll = await page.evaluate(() => window.scrollY);
    
    const link = page.locator('a[href*="#"]').first();
    if (await link.isVisible()) {
      await link.click();
      await page.waitForTimeout(500);
      
      const finalScroll = await page.evaluate(() => window.scrollY);
      expect(finalScroll).not.toBe(initialScroll);
    }
  });
});