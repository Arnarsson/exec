import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Wait for dynamic content to load
    await page.waitForTimeout(2000);
  });

  test('dashboard full page screenshot', async ({ page }) => {
    // Take a full page screenshot for visual regression
    await expect(page).toHaveScreenshot('dashboard-full-page.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('sidebar navigation screenshot', async ({ page }) => {
    // Focus on sidebar for detailed testing
    await expect(page.locator('.sidebar')).toHaveScreenshot('sidebar-navigation.png');
  });

  test('executive header section screenshot', async ({ page }) => {
    // Test the executive header with gradient background
    const headerSection = page.locator('div[style*="linear-gradient"]').first();
    await expect(headerSection).toHaveScreenshot('executive-header.png');
  });

  test('key metrics cards screenshot', async ({ page }) => {
    // Test the metrics grid layout
    const metricsGrid = page.locator('.grid.grid-cols-4').first();
    await expect(metricsGrid).toHaveScreenshot('key-metrics-cards.png');
  });

  test('main dashboard grid screenshot', async ({ page }) => {
    // Test the main 3-column grid layout
    const mainGrid = page.locator('.grid.grid-cols-3').first();
    await expect(mainGrid).toHaveScreenshot('main-dashboard-grid.png');
  });

  test('upcoming meetings section screenshot', async ({ page }) => {
    // Test meetings section specifically
    const meetingsCard = page.locator('text=📅 Upcoming Meetings').locator('..');
    await expect(meetingsCard).toHaveScreenshot('upcoming-meetings.png');
  });

  test('email intelligence section screenshot', async ({ page }) => {
    // Test email section
    const emailCard = page.locator('text=📧 Email Intelligence').locator('..');
    await expect(emailCard).toHaveScreenshot('email-intelligence.png');
  });

  test('pending decisions section screenshot', async ({ page }) => {
    // Test decisions section
    const decisionsCard = page.locator('text=⚡ Pending Decisions').locator('..');
    await expect(decisionsCard).toHaveScreenshot('pending-decisions.png');
  });

  test('active projects section screenshot', async ({ page }) => {
    // Test projects section with progress bars
    const projectsCard = page.locator('text=🚀 Active Projects').locator('..');
    await expect(projectsCard).toHaveScreenshot('active-projects.png');
  });

  test('quick actions buttons screenshot', async ({ page }) => {
    // Test the bottom action buttons
    const quickActions = page.locator('.grid.grid-cols-4').last();
    await expect(quickActions).toHaveScreenshot('quick-actions.png');
  });

  test('mobile responsive layout screenshot', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000); // Wait for responsive changes
    
    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('tablet responsive layout screenshot', async ({ page }) => {
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('dashboard-tablet.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('dark theme compatibility', async ({ page }) => {
    // Test if the UI works with dark system theme
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('dashboard-dark-theme.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('high contrast mode', async ({ page }) => {
    // Test accessibility with forced colors
    await page.emulateMedia({ forcedColors: 'active' });
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('dashboard-high-contrast.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('navigation pages visual consistency', async ({ page }) => {
    const pages = ['calendar', 'email', 'tasks', 'chat', 'settings'];
    
    for (const pageName of pages) {
      // Navigate to each page
      await page.click(`text=${pageName.charAt(0).toUpperCase() + pageName.slice(1)}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Take screenshot of each page
      await expect(page).toHaveScreenshot(`${pageName}-page.png`, {
        fullPage: true,
        animations: 'disabled'
      });
    }
  });

  test('error states visual testing', async ({ page }) => {
    // Test what happens when backend is not available
    // This would normally show error states
    await page.route('**/api/**', route => route.abort());
    
    await page.reload();
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot('dashboard-error-state.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('loading states visual testing', async ({ page }) => {
    // Test loading states by slowing down network
    await page.route('**/api/**', route => {
      setTimeout(() => route.continue(), 2000);
    });
    
    await page.reload();
    await page.waitForTimeout(1000); // Capture during loading
    
    await expect(page).toHaveScreenshot('dashboard-loading-state.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('interactive states screenshots', async ({ page }) => {
    // Test hover states on buttons
    const scheduleButton = page.locator('button').filter({ hasText: 'Schedule Meeting' });
    await scheduleButton.hover();
    await expect(scheduleButton).toHaveScreenshot('button-hover-state.png');
    
    // Test active navigation item
    const dashboardNav = page.locator('.nav-item.active');
    await expect(dashboardNav).toHaveScreenshot('nav-active-state.png');
  });

  test('component isolation screenshots', async ({ page }) => {
    // Test individual components in isolation
    
    // Meeting card
    const meetingCard = page.locator('text=Board Strategy Review').locator('../..');
    await expect(meetingCard).toHaveScreenshot('meeting-card-component.png');
    
    // Decision card
    const decisionCard = page.locator('text=Approve Q1 Marketing Budget').locator('../..');
    await expect(decisionCard).toHaveScreenshot('decision-card-component.png');
    
    // Project card
    const projectCard = page.locator('text=Q4 Product Roadmap').locator('../..');
    await expect(projectCard).toHaveScreenshot('project-card-component.png');
  });

  test('print layout screenshot', async ({ page }) => {
    // Test how the page looks when printed
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('dashboard-print-layout.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });
});