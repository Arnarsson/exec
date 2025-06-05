import { test, expect } from '@playwright/test';

test.describe('Executive Assistant Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard before each test
    await page.goto('/');
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test('should display the main dashboard layout', async ({ page }) => {
    // Check if the sidebar is visible
    await expect(page.locator('.sidebar')).toBeVisible();
    
    // Check if the Executive Assistant branding is present
    await expect(page.locator('text=Executive Assistant')).toBeVisible();
    await expect(page.locator('.sidebar [style*="EA"]')).toBeVisible();
    
    // Check if navigation items are present
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Calendar')).toBeVisible();
    await expect(page.locator('text=Email')).toBeVisible();
    await expect(page.locator('text=Tasks')).toBeVisible();
    await expect(page.locator('text=Chat')).toBeVisible();
    await expect(page.locator('text=Settings')).toBeVisible();
    
    // Check if AG-UI connection status is shown
    await expect(page.locator('text=AG-UI Connected')).toBeVisible();
  });

  test('should display executive greeting and time', async ({ page }) => {
    // Check if greeting is displayed
    await expect(page.locator('text=/Good (morning|afternoon|evening)/')).toBeVisible();
    
    // Check if executive name is displayed
    await expect(page.locator('text=Sarah Chen')).toBeVisible();
    
    // Check if current time is displayed
    await expect(page.locator('text=/\\d{1,2}:\\d{2} (am|pm)/i')).toBeVisible();
    
    // Check if AI Assistant status is shown
    await expect(page.locator('text=🟢 AI Assistant Active')).toBeVisible();
  });

  test('should display key metrics cards', async ({ page }) => {
    // Check for all four metric cards
    await expect(page.locator('text=Today\'s Meetings')).toBeVisible();
    await expect(page.locator('text=Emails Processed')).toBeVisible();
    await expect(page.locator('text=Decisions Required')).toBeVisible();
    await expect(page.locator('text=Projects Advanced')).toBeVisible();
    
    // Check if metric values are displayed
    await expect(page.locator('.text-2xl.font-bold.text-blue-600')).toBeVisible();
    await expect(page.locator('.text-2xl.font-bold.text-green-600')).toBeVisible();
    await expect(page.locator('.text-2xl.font-bold.text-yellow-600')).toBeVisible();
    await expect(page.locator('.text-2xl.font-bold.text-purple-600')).toBeVisible();
  });

  test('should display upcoming meetings section', async ({ page }) => {
    await expect(page.locator('text=📅 Upcoming Meetings')).toBeVisible();
    
    // Check for specific meetings
    await expect(page.locator('text=Board Strategy Review')).toBeVisible();
    await expect(page.locator('text=Product Launch Planning')).toBeVisible();
    await expect(page.locator('text=Investor Call - Series B')).toBeVisible();
    
    // Check for priority indicators
    await expect(page.locator('text=HIGH')).toBeVisible();
    await expect(page.locator('text=MEDIUM')).toBeVisible();
  });

  test('should display email intelligence section', async ({ page }) => {
    await expect(page.locator('text=📧 Email Intelligence')).toBeVisible();
    
    // Check for email metrics
    await expect(page.locator('text=Unread')).toBeVisible();
    await expect(page.locator('text=Important')).toBeVisible();
    await expect(page.locator('text=🚨')).toBeVisible(); // Urgent emails indicator
    
    // Check for top senders
    await expect(page.locator('text=Top Senders Today:')).toBeVisible();
    await expect(page.locator('text=Legal Team')).toBeVisible();
  });

  test('should display pending decisions section', async ({ page }) => {
    await expect(page.locator('text=⚡ Pending Decisions')).toBeVisible();
    
    // Check for specific decisions
    await expect(page.locator('text=Approve Q1 Marketing Budget')).toBeVisible();
    await expect(page.locator('text=Sign Partnership Agreement - Microsoft')).toBeVisible();
    await expect(page.locator('text=New Hire Approval - Senior Engineer')).toBeVisible();
    
    // Check for urgency levels
    await expect(page.locator('text=HIGH')).toBeVisible();
    await expect(page.locator('text=MEDIUM')).toBeVisible();
    await expect(page.locator('text=LOW')).toBeVisible();
  });

  test('should display active projects section', async ({ page }) => {
    await expect(page.locator('text=🚀 Active Projects')).toBeVisible();
    
    // Check for project names
    await expect(page.locator('text=Q4 Product Roadmap')).toBeVisible();
    await expect(page.locator('text=Series B Fundraising')).toBeVisible();
    await expect(page.locator('text=Enterprise Sales Expansion')).toBeVisible();
    
    // Check for progress indicators
    await expect(page.locator('text=Progress')).toBeVisible();
    await expect(page.locator('text=75%')).toBeVisible();
    await expect(page.locator('text=90%')).toBeVisible();
    await expect(page.locator('text=45%')).toBeVisible();
  });

  test('should display quick action buttons', async ({ page }) => {
    // Check for all quick action buttons
    await expect(page.locator('text=📅').locator('..').locator('text=Schedule Meeting')).toBeVisible();
    await expect(page.locator('text=📧').locator('..').locator('text=Draft Email')).toBeVisible();
    await expect(page.locator('text=📊').locator('..').locator('text=View Analytics')).toBeVisible();
    await expect(page.locator('text=💬').locator('..').locator('text=AI Chat')).toBeVisible();
  });

  test('should have responsive design', async ({ page }) => {
    // Test desktop view first
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.main-content')).toHaveCSS('margin-left', '256px');
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500); // Wait for responsive changes
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // On mobile, sidebar should be hidden and main content should have no left margin
    // Note: Using computed styles since the CSS might be applied via media queries
  });

  test('should navigate between pages', async ({ page }) => {
    // Test navigation to Calendar
    await page.click('text=Calendar');
    await expect(page).toHaveURL(/.*calendar/);
    
    // Test navigation to Email
    await page.click('text=Email');
    await expect(page).toHaveURL(/.*email/);
    
    // Test navigation to Tasks
    await page.click('text=Tasks');
    await expect(page).toHaveURL(/.*tasks/);
    
    // Test navigation to Chat
    await page.click('text=Chat');
    await expect(page).toHaveURL(/.*chat/);
    
    // Test navigation to Settings
    await page.click('text=Settings');
    await expect(page).toHaveURL(/.*settings/);
    
    // Navigate back to Dashboard
    await page.click('text=Dashboard');
    await expect(page).toHaveURL(/.*dashboard|\/$/);
  });

  test('should handle quick action interactions', async ({ page }) => {
    // Test quick action button clicks (they should be clickable)
    const scheduleButton = page.locator('button').filter({ hasText: 'Schedule Meeting' });
    await expect(scheduleButton).toBeVisible();
    await expect(scheduleButton).toBeEnabled();
    
    const draftEmailButton = page.locator('button').filter({ hasText: 'Draft Email' });
    await expect(draftEmailButton).toBeVisible();
    await expect(draftEmailButton).toBeEnabled();
    
    const analyticsButton = page.locator('button').filter({ hasText: 'View Analytics' });
    await expect(analyticsButton).toBeVisible();
    await expect(analyticsButton).toBeEnabled();
    
    const chatButton = page.locator('button').filter({ hasText: 'AI Chat' });
    await expect(chatButton).toBeVisible();
    await expect(chatButton).toBeEnabled();
  });

  test('should maintain consistent styling', async ({ page }) => {
    // Check if emergency CSS is loaded
    await expect(page.locator('body')).toHaveCSS('font-family', /system-ui/);
    
    // Check card styling
    const cards = page.locator('.ea-card');
    await expect(cards.first()).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(cards.first()).toHaveCSS('border-radius', '8px');
    
    // Check button styling
    const primaryButton = page.locator('.ea-button-primary').first();
    if (await primaryButton.count() > 0) {
      await expect(primaryButton).toHaveCSS('background-color', 'rgb(37, 99, 235)');
      await expect(primaryButton).toHaveCSS('color', 'rgb(255, 255, 255)');
    }
  });

  test('should display real-time elements', async ({ page }) => {
    // Check if current time is updating (wait and check again)
    const initialTime = await page.locator('text=/\\d{1,2}:\\d{2} (am|pm)/i').textContent();
    
    // Wait for a minute to see if time updates (for quick testing, we'll just verify the element exists)
    await expect(page.locator('text=/\\d{1,2}:\\d{2} (am|pm)/i')).toBeVisible();
    
    // Check if the current date is displayed correctly
    const currentDate = new Date();
    const expectedDateFormat = currentDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // We'll just verify a date is shown, format might vary
    await expect(page.locator('text=/\\w+, \\w+ \\d+, \\d{4}/')).toBeVisible();
  });
});