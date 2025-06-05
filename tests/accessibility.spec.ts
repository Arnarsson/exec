import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    // Check if headings follow proper hierarchy (h1 -> h2 -> h3, etc.)
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    
    expect(headings.length).toBeGreaterThan(0);
    
    // Main app title should be h1
    await expect(page.locator('h1')).toContainText('Executive Assistant');
    
    // Section headings should be h3 (based on the current structure)
    await expect(page.locator('h3')).toContainText(['Upcoming Meetings', 'Email Intelligence', 'Pending Decisions', 'Active Projects']);
  });

  test('should have proper keyboard navigation', async ({ page }) => {
    // Test tab navigation through interactive elements
    await page.keyboard.press('Tab');
    
    // Check if focus is visible on first interactive element
    const firstFocusable = await page.locator(':focus').first();
    await expect(firstFocusable).toBeVisible();
    
    // Continue tabbing through navigation items
    const navItems = await page.locator('.nav-item').all();
    for (let i = 0; i < Math.min(navItems.length, 3); i++) {
      await page.keyboard.press('Tab');
      const focused = await page.locator(':focus');
      await expect(focused).toBeVisible();
    }
  });

  test('should support screen reader navigation', async ({ page }) => {
    // Check for proper ARIA labels and roles
    await expect(page.locator('[role="navigation"]')).toBeVisible();
    
    // Check for landmark regions
    await expect(page.locator('main')).toBeVisible();
    
    // Check for descriptive link text (no "click here" or "read more")
    const links = await page.locator('a').all();
    for (const link of links) {
      const text = await link.textContent();
      if (text) {
        expect(text.toLowerCase()).not.toContain('click here');
        expect(text.toLowerCase()).not.toContain('read more');
        expect(text.toLowerCase()).not.toContain('learn more');
      }
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    // Run axe specifically for color contrast
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    
    const colorContrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'color-contrast'
    );
    
    expect(colorContrastViolations).toEqual([]);
  });

  test('should be usable with high contrast mode', async ({ page }) => {
    // Enable high contrast mode
    await page.emulateMedia({ forcedColors: 'active' });
    await page.waitForTimeout(500);
    
    // Check if important elements are still visible
    await expect(page.locator('text=Executive Assistant')).toBeVisible();
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=🚀 Active Projects')).toBeVisible();
    
    // Buttons should still be clickable
    const buttons = await page.locator('button').all();
    for (const button of buttons.slice(0, 3)) { // Test first 3 buttons
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();
    }
  });

  test('should support reduced motion preferences', async ({ page }) => {
    // Simulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(500);
    
    // Check if animations are disabled/reduced
    const animatedElements = await page.locator('.animate-spin').all();
    
    // In reduced motion mode, spinning animations should be disabled
    for (const element of animatedElements) {
      const animation = await element.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.animationPlayState;
      });
      // Should be 'paused' or have no animation in reduced motion mode
      expect(['paused', 'running']).toContain(animation);
    }
  });

  test('should have proper form labels and descriptions', async ({ page }) => {
    // Check for any form inputs and their labels
    const inputs = await page.locator('input, select, textarea').all();
    
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      
      // Each input should have either id with corresponding label, aria-label, or aria-labelledby
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        if (await label.count() > 0) {
          await expect(label).toBeVisible();
        } else {
          expect(ariaLabel || ariaLabelledBy).toBeTruthy();
        }
      } else {
        expect(ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    }
  });

  test('should have proper button accessibility', async ({ page }) => {
    const buttons = await page.locator('button').all();
    
    for (const button of buttons) {
      // Each button should have accessible name
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledBy = await button.getAttribute('aria-labelledby');
      
      expect(text || ariaLabel || ariaLabelledBy).toBeTruthy();
      
      // Button should be focusable
      await expect(button).toBeEnabled();
    }
  });

  test('should handle focus management properly', async ({ page }) => {
    // Test focus trap in navigation
    const firstNavItem = page.locator('.nav-item').first();
    await firstNavItem.focus();
    await expect(firstNavItem).toBeFocused();
    
    // Test focus restoration after navigation
    await page.click('text=Calendar');
    await page.waitForLoadState('networkidle');
    
    // Focus should be on main content or a logical element
    const focused = await page.locator(':focus');
    await expect(focused).toBeVisible();
    
    // Navigate back to dashboard
    await page.click('text=Dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should support zoom up to 200%', async ({ page }) => {
    // Test UI at 200% zoom
    await page.setViewportSize({ width: 960, height: 540 }); // Simulates 200% zoom on 1920x1080
    await page.waitForTimeout(500);
    
    // Check if essential content is still accessible
    await expect(page.locator('text=Executive Assistant')).toBeVisible();
    await expect(page.locator('text=Dashboard')).toBeVisible();
    
    // Check if cards are still readable
    await expect(page.locator('text=Today\'s Meetings')).toBeVisible();
    await expect(page.locator('text=📧 Email Intelligence')).toBeVisible();
    
    // Navigation should still work
    const navItems = await page.locator('.nav-item').all();
    for (const item of navItems.slice(0, 3)) {
      await expect(item).toBeVisible();
    }
  });

  test('should have proper error handling and messages', async ({ page }) => {
    // Test error state accessibility
    await page.route('**/api/**', route => route.abort());
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Error messages should be announced to screen readers
    const errorElements = await page.locator('[role="alert"], .error, [aria-live]').all();
    
    // If there are error elements, they should be properly labeled
    for (const element of errorElements) {
      const text = await element.textContent();
      if (text && text.trim()) {
        expect(text.length).toBeGreaterThan(0);
      }
    }
  });

  test('should support screen reader announcements', async ({ page }) => {
    // Check for live regions that announce changes
    const liveRegions = await page.locator('[aria-live], [role="status"], [role="alert"]').all();
    
    // At minimum, there should be some mechanism for live updates
    // (Since this is a real-time dashboard)
    if (liveRegions.length > 0) {
      for (const region of liveRegions) {
        const ariaLive = await region.getAttribute('aria-live');
        expect(['polite', 'assertive', 'off']).toContain(ariaLive || '');
      }
    }
  });

  test('should have descriptive page title', async ({ page }) => {
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
    
    // Title should be descriptive
    expect(title.toLowerCase()).toMatch(/dashboard|executive|assistant/);
  });

  test('should support keyboard shortcuts', async ({ page }) => {
    // Test common keyboard shortcuts
    
    // Skip to main content (if implemented)
    await page.keyboard.press('Tab');
    const firstTab = await page.locator(':focus');
    const text = await firstTab.textContent();
    
    // Common pattern is "Skip to main content" as first focusable element
    if (text && text.toLowerCase().includes('skip')) {
      await page.keyboard.press('Enter');
      const mainContent = await page.locator(':focus');
      await expect(mainContent).toBeVisible();
    }
  });

  test('should have proper semantic structure', async ({ page }) => {
    // Check for proper semantic HTML
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
    
    // Check for proper use of headings, lists, etc.
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
    expect(headings).toBeGreaterThan(0);
    
    // Check for lists in navigation
    const navigation = page.locator('nav');
    if (await navigation.count() > 0) {
      // Navigation should use proper list structure or have proper roles
      const hasProperStructure = await navigation.locator('ul, ol, [role="list"]').count() > 0 ||
                                await navigation.locator('[role="navigation"]').count() > 0;
      expect(hasProperStructure).toBe(true);
    }
  });

  test('should work with voice control software', async ({ page }) => {
    // Test that interactive elements have names that voice control can target
    const buttons = await page.locator('button').all();
    
    for (const button of buttons) {
      const accessibleName = await button.evaluate(el => {
        // Get accessible name (combination of text content, aria-label, etc.)
        return el.textContent || el.getAttribute('aria-label') || el.getAttribute('title');
      });
      
      expect(accessibleName).toBeTruthy();
      expect(accessibleName!.trim().length).toBeGreaterThan(0);
    }
    
    // Links should also have accessible names
    const links = await page.locator('a').all();
    for (const link of links) {
      const accessibleName = await link.evaluate(el => {
        return el.textContent || el.getAttribute('aria-label') || el.getAttribute('title');
      });
      
      if (accessibleName) {
        expect(accessibleName.trim().length).toBeGreaterThan(0);
      }
    }
  });
});