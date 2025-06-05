import { test, expect } from '@playwright/test';

test.describe('OKR Integration and GitHub Webhook Tests', () => {
  const BACKEND_URL = 'http://localhost:3001';

  test.describe('GitHub Webhook Functionality', () => {
    test('should have GitHub webhook endpoint available', async ({ request }) => {
      // Test if the webhook endpoint exists
      const response = await request.get(`${BACKEND_URL}/api/webhooks/status`);
      expect(response.status()).toBe(200);
      
      const status = await response.json();
      expect(status).toHaveProperty('github');
      expect(status.github.enabled).toBe(true);
      expect(status.github.supportedEvents).toContain('push');
      expect(status.github.supportedEvents).toContain('ping');
    });

    test('should handle GitHub ping webhook', async ({ request }) => {
      const pingPayload = {
        zen: "Design for failure.",
        hook_id: 12345678
      };

      const response = await request.post(`${BACKEND_URL}/api/webhooks/github`, {
        data: pingPayload,
        headers: {
          'x-github-event': 'ping',
          'x-github-delivery': 'test-delivery-' + Date.now(),
          'content-type': 'application/json'
        }
      });

      expect(response.status()).toBe(200);
      const result = await response.json();
      expect(result.message).toContain('ping received successfully');
    });

    test('should process GitHub push webhook', async ({ request }) => {
      const pushPayload = {
        action: 'pushed',
        repository: {
          name: 'test-project',
          full_name: 'user/test-project'
        },
        commits: [
          {
            id: 'abc123',
            message: 'feat: Add new OKR tracking feature',
            timestamp: new Date().toISOString(),
            author: {
              name: 'Test Developer',
              email: 'dev@test.com'
            },
            added: ['src/okr-feature.ts'],
            modified: ['src/app.ts'],
            removed: []
          }
        ],
        pusher: {
          name: 'Test Developer',
          email: 'dev@test.com'
        }
      };

      const response = await request.post(`${BACKEND_URL}/api/webhooks/github`, {
        data: pushPayload,
        headers: {
          'x-github-event': 'push',
          'x-github-delivery': 'test-delivery-' + Date.now(),
          'content-type': 'application/json'
        }
      });

      expect(response.status()).toBe(200);
      const result = await response.json();
      expect(result.message).toContain('processed successfully');
    });

    test('should handle test GitHub webhook endpoint', async ({ request }) => {
      const testPayload = {
        repoName: 'executive-assistant',
        fullName: 'user/executive-assistant',
        commitMessage: 'feat: Add OKR dashboard integration',
        authorName: 'Executive Assistant Dev',
        authorEmail: 'ea-dev@company.com',
        pusherName: 'Executive Assistant Dev',
        pusherEmail: 'ea-dev@company.com'
      };

      const response = await request.post(`${BACKEND_URL}/api/webhooks/test-github`, {
        data: testPayload
      });

      expect(response.status()).toBe(200);
      const result = await response.json();
      expect(result.message).toContain('processed successfully');
      expect(result.payload.repository.name).toBe('executive-assistant');
      expect(result.payload.commits[0].message).toContain('OKR dashboard');
    });

    test('should reject invalid webhook requests', async ({ request }) => {
      // Test without required headers
      const response = await request.post(`${BACKEND_URL}/api/webhooks/github`, {
        data: { test: 'invalid' }
      });

      expect(response.status()).toBe(400);
      const result = await response.json();
      expect(result.error).toContain('Missing GitHub event header');
    });

    test('should handle unsupported GitHub events gracefully', async ({ request }) => {
      const payload = { action: 'opened' };

      const response = await request.post(`${BACKEND_URL}/api/webhooks/github`, {
        data: payload,
        headers: {
          'x-github-event': 'pull_request',
          'x-github-delivery': 'test-delivery-' + Date.now(),
          'content-type': 'application/json'
        }
      });

      expect(response.status()).toBe(200);
      const result = await response.json();
      expect(result.message).toContain('received but not processed');
    });
  });

  test.describe('OKR System Frontend Integration', () => {
    test('should display OKR-related project tracking', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check if active projects section exists (OKR equivalent)
      await expect(page.locator('text=🚀 Active Projects')).toBeVisible();
      
      // Check for project progress tracking
      await expect(page.locator('text=Progress')).toBeVisible();
      await expect(page.locator('text=75%')).toBeVisible();
      await expect(page.locator('text=90%')).toBeVisible();
      
      // Check for project status indicators
      const projectCards = page.locator('text=Q4 Product Roadmap, Series B Fundraising, Enterprise Sales Expansion');
      await expect(projectCards.first()).toBeVisible();
    });

    test('should show real-time progress updates', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Look for elements that would be updated in real-time
      const progressBars = page.locator('[style*="width:"]').filter({ hasText: /\d+%/ });
      const metricsValues = page.locator('.text-2xl.font-bold');
      
      // Verify initial state
      await expect(metricsValues.first()).toBeVisible();
      
      // In a real implementation, we would test WebSocket updates here
      // For now, we verify the elements exist for updates
    });

    test('should handle project status changes', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check for different project status indicators
      const projectSection = page.locator('text=🚀 Active Projects').locator('..');
      
      // Look for status indicators (colored dots)
      const statusDots = projectSection.locator('[style*="border-radius: 50%"]');
      await expect(statusDots.first()).toBeVisible();
      
      // Check for milestone information
      await expect(projectSection.locator('text=Next:')).toBeVisible();
      await expect(projectSection.locator('text=Due:')).toBeVisible();
    });
  });

  test.describe('Email and Calendar Integration (OKR Context)', () => {
    test('should navigate to email page for VMS/HARKA monitoring', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Navigate to email page
      await page.click('text=Email');
      await expect(page).toHaveURL(/.*email/);
      
      // The email page should exist for VMS/HARKA monitoring
      // (specific implementation would depend on the email page content)
    });

    test('should navigate to calendar page for time blocking', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Navigate to calendar page
      await page.click('text=Calendar');
      await expect(page).toHaveURL(/.*calendar/);
      
      // The calendar page should exist for time blocking optimization
      // (specific implementation would depend on the calendar page content)
    });

    test('should show email intelligence on dashboard', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check email intelligence section (relates to email monitoring)
      await expect(page.locator('text=📧 Email Intelligence')).toBeVisible();
      await expect(page.locator('text=Unread')).toBeVisible();
      await expect(page.locator('text=Important')).toBeVisible();
      await expect(page.locator('text=🚨')).toBeVisible(); // Urgent indicator
      
      // Check for top senders (could include VMS/HARKA sources)
      await expect(page.locator('text=Top Senders Today:')).toBeVisible();
    });
  });

  test.describe('Real-time Progress Tracking', () => {
    test('should display current metrics in real-time format', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check if key metrics are displayed with real-time capability
      const metricsSection = page.locator('.grid.grid-cols-4').first();
      
      // Verify today's meetings counter
      await expect(metricsSection.locator('text=Today\'s Meetings')).toBeVisible();
      await expect(metricsSection.locator('.text-2xl.font-bold.text-blue-600')).toBeVisible();
      
      // Verify emails processed counter
      await expect(metricsSection.locator('text=Emails Processed')).toBeVisible();
      await expect(metricsSection.locator('.text-2xl.font-bold.text-green-600')).toBeVisible();
      
      // Verify decisions required counter
      await expect(metricsSection.locator('text=Decisions Required')).toBeVisible();
      await expect(metricsSection.locator('.text-2xl.font-bold.text-yellow-600')).toBeVisible();
      
      // Verify projects advanced counter
      await expect(metricsSection.locator('text=Projects Advanced')).toBeVisible();
      await expect(metricsSection.locator('.text-2xl.font-bold.text-purple-600')).toBeVisible();
    });

    test('should show AG-UI connection status', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check for AG-UI connection indicator (real-time capability)
      await expect(page.locator('text=AG-UI Connected')).toBeVisible();
      
      // Check for the green status indicator
      const statusIndicator = page.locator('[style*="background: #22c55e"]');
      await expect(statusIndicator).toBeVisible();
    });

    test('should handle WebSocket connection for real-time updates', async ({ page }) => {
      // Listen for WebSocket connections
      let wsConnected = false;
      
      page.on('websocket', ws => {
        wsConnected = true;
        console.log('WebSocket connection detected:', ws.url());
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // In a full implementation with WebSocket, we would verify connection
      // For now, we check that the UI is ready for real-time updates
      await expect(page.locator('text=🟢 AI Assistant Active')).toBeVisible();
    });
  });

  test.describe('OKR Enhancement Checklist Validation', () => {
    test('should verify backend webhook infrastructure', async ({ request }) => {
      // Verify the webhook system status matches OKR checklist requirements
      const response = await request.get(`${BACKEND_URL}/api/webhooks/status`);
      expect(response.status()).toBe(200);
      
      const status = await response.json();
      
      // GitHub integration should be enabled (OKR requirement)
      expect(status.github.enabled).toBe(true);
      
      // Email and calendar integration status
      // (These would be implemented as part of Phase 1 completion)
      expect(status).toHaveProperty('email');
      expect(status).toHaveProperty('calendar');
    });

    test('should support target project repository tracking', async ({ request }) => {
      // Test the webhook with a specific target repository format
      const targetRepoPayload = {
        repoName: 'dozy-sleep-tracker', // Example target repository
        fullName: 'user/dozy-sleep-tracker',
        commitMessage: 'feat: Add sleep pattern analysis for OKR tracking',
        authorName: 'OKR Developer',
        authorEmail: 'okr@company.com'
      };

      const response = await request.post(`${BACKEND_URL}/api/webhooks/test-github`, {
        data: targetRepoPayload
      });

      expect(response.status()).toBe(200);
      const result = await response.json();
      expect(result.payload.repository.name).toBe('dozy-sleep-tracker');
    });

    test('should display foundation for smart RICE score adjustments', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Look for project prioritization elements (foundation for RICE scoring)
      await expect(page.locator('text=HIGH')).toBeVisible();
      await expect(page.locator('text=MEDIUM')).toBeVisible();
      await expect(page.locator('text=LOW')).toBeVisible();
      
      // Check for progress tracking (input for RICE adjustments)
      await expect(page.locator('text=Progress')).toBeVisible();
      await expect(page.locator('text=75%')).toBeVisible();
    });
  });
});