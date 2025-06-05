#!/bin/bash

# Executive Assistant UI/UX Testing Script
# This script runs comprehensive Playwright tests for the Executive Assistant dashboard

echo "🚀 Executive Assistant - Playwright Vision Testing"
echo "=================================================="

# Check if dependencies are installed
if ! command -v npx &> /dev/null; then
    echo "❌ npm/npx not found. Please install Node.js first."
    exit 1
fi

# Install dependencies if needed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules/@playwright" ]; then
    echo "Installing Playwright dependencies..."
    npm install --save-dev @playwright/test @axe-core/playwright @types/node
fi

# Install browsers if needed
echo "🌐 Checking Playwright browsers..."
npx playwright install chromium --with-deps

echo ""
echo "🧪 Available Test Suites:"
echo "1. Dashboard Functionality Tests"
echo "2. Visual Regression Tests"
echo "3. OKR Integration Tests"
echo "4. Accessibility Tests"
echo "5. All Tests (Comprehensive)"

read -p "Select test suite (1-5): " choice

case $choice in
    1)
        echo "Running Dashboard Functionality Tests..."
        npx playwright test tests/dashboard.spec.ts --reporter=list
        ;;
    2)
        echo "Running Visual Regression Tests..."
        npx playwright test tests/visual-regression.spec.ts --reporter=list
        ;;
    3)
        echo "Running OKR Integration Tests..."
        npx playwright test tests/okr-integration.spec.ts --reporter=list
        ;;
    4)
        echo "Running Accessibility Tests..."
        npx playwright test tests/accessibility.spec.ts --reporter=list
        ;;
    5)
        echo "Running All Tests..."
        npx playwright test --reporter=html
        echo ""
        echo "📊 Opening HTML report..."
        npx playwright show-report
        ;;
    *)
        echo "Invalid choice. Running basic dashboard tests..."
        npx playwright test tests/dashboard.spec.ts --reporter=list
        ;;
esac

echo ""
echo "✅ Testing complete!"
echo "📋 For detailed reports, run: npx playwright show-report"
echo "🔍 For debugging, run: npx playwright test --debug"