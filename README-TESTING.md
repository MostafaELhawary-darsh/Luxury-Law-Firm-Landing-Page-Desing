# 🧪 Testing Guide for Luxury Law Firm Landing Page

## 📋 Table of Contents
- [Overview](#overview)
- [Unit Tests](#unit-tests)
- [Integration Tests](#integration-tests)
- [E2E Tests](#e2e-tests)
- [Coverage Report](#coverage-report)
- [Running Tests](#running-tests)

## Overview

Our testing strategy includes three tiers:

1. **Unit Tests** - Test individual components and utilities
2. **Integration Tests** - Test component interactions and database operations
3. **E2E Tests** - Test complete user workflows

## Unit Tests

### Location
`tests/unit/`

### Key Test Files
- `components/Header.test.tsx` - Header component rendering and navigation
- `utils/validation.test.ts` - Form validation utilities

### Running Unit Tests

```bash
# Run all unit tests
npm run test

# Run with watch mode
npm run test -- --watch

# Run with UI
npm run test:ui

# Run specific test file
npm run test -- tests/unit/components/Header.test.tsx
```

## Integration Tests

### Location
`tests/integration/`

### Key Test Files
- `supabase.integration.test.ts` - Database operations and API calls

### Coverage
- ✅ Contact form submission
- ✅ Consultation booking
- ✅ Error handling

### Running Integration Tests

```bash
# Run all tests (includes integration)
npm run test

# Run with coverage
npm run test:coverage
```

## E2E Tests

### Location
`tests/e2e/`

### Test Scenarios

#### Landing Page Tests (`landing-page.spec.ts`)
- ✅ Page loads correctly
- ✅ Main heading displays
- ✅ Navigation is visible
- ✅ Mobile responsiveness
- ✅ Accessibility compliance
- ✅ Form submission
- ✅ Validation error handling

#### Navigation Tests (`navigation.spec.ts`)
- ✅ Navigate to services section
- ✅ Navigate to team section
- ✅ Navigate to contact section
- ✅ Smooth scrolling

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (interactive mode)
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug

# Run specific test
npm run test:e2e -- landing-page.spec.ts

# Run headed (see browser)
npm run test:e2e -- --headed
```

## Coverage Report

### Viewing Coverage

```bash
# Generate and open coverage report
npm run test:coverage

# HTML report
open coverage/index.html
```

### Coverage Targets
- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 75%
- **Statements**: 80%

## Running All Tests

```bash
# Run complete test suite
npm run test:all

# This runs:
# 1. Unit tests with coverage
# 2. E2E tests
# 3. Generates coverage report
```

## Test Structure

```
tests/
├── unit/
│   ├── components/
│   │   └── Header.test.tsx
│   └── utils/
│       └── validation.test.ts
├── integration/
│   └── supabase.integration.test.ts
└── e2e/
    ├── landing-page.spec.ts
    ├── navigation.spec.ts
    └── contact-form.spec.ts
```

## Best Practices

### Unit Tests
- ✅ Test one thing per test
- ✅ Use descriptive test names
- ✅ Keep tests isolated
- ✅ Mock external dependencies

### E2E Tests
- ✅ Test complete user flows
- ✅ Use realistic data
- ✅ Handle delays and animations
- ✅ Test across browsers

### Coverage
- ✅ Aim for high coverage (80%+)
- ✅ Focus on critical paths
- ✅ Document why coverage gaps exist

## Debugging Tests

### Unit Tests
```bash
# Debug with Node inspector
node --inspect-brk node_modules/vitest/vitest.mjs

# View test UI
npm run test:ui
```

### E2E Tests
```bash
# Step through test
npm run test:e2e:debug

# View browser
npm run test:e2e -- --headed

# Generate trace
NPX_PLAYWRIGHT_TRACE=on npm run test:e2e
```

## CI/CD Integration

Tests are configured to run in CI environments:

```bash
# In CI, tests run with:
# - Retries: 2 (for flaky tests)
# - Workers: 1 (single process)
# - Reporter: HTML + JSON + JUnit
```

## Troubleshooting

### Tests timing out
- Increase timeout in config
- Check for missing `await` statements
- Verify dev server is running for E2E tests

### E2E tests fail locally but pass in CI
- Different viewport sizes
- Network speed differences
- Browser version differences

### Coverage gaps
- Focus on critical paths first
- Consider complexity vs. coverage ratio
- Document intentional gaps

## Resources

- [Vitest Documentation](https://vitest.dev)
- [Playwright Documentation](https://playwright.dev)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://testingjavascript.com)

## Contributing

When adding new features:
1. Write tests first (TDD)
2. Implement feature
3. Ensure all tests pass
4. Maintain 80%+ coverage
5. Document test scenarios

---

**Last Updated**: August 2024
**Maintained By**: Development Team
