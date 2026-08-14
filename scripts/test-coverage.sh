#!/bin/bash

# Test Coverage Script
# Generates comprehensive test reports

echo "🧪 Starting comprehensive test suite..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create test results directory
mkdir -p test-results
mkdir -p coverage

# Run Unit Tests
echo "📝 Running Unit Tests..."
npm run test -- --run --coverage

# Run E2E Tests
echo "🎭 Running E2E Tests..."
npm run test:e2e

# Generate Coverage Report
echo "📊 Generating Coverage Report..."
echo ""
echo "✅ Test suite complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📁 Test Reports:"
echo "   - Unit Tests: coverage/index.html"
echo "   - E2E Tests: playwright-report/index.html"
echo "   - Coverage: coverage/index.html"
echo ""
echo "💡 Tips:"
echo "   - npm run test:ui       → View tests with UI"
echo "   - npm run test:e2e:ui   → View E2E with UI"
echo "   - npm run test:coverage → View coverage report"
