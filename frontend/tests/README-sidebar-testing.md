# Sidebar Testing Documentation

This document outlines the comprehensive testing strategy for the consolidated sidebar functionality in the FBO LaunchPad application.

## Testing Architecture

### 1. Unit Tests (`components/app-sidebar.test.tsx`)
Tests the isolated AppSidebar component functionality:
- **Rendering**: Logo, navigation items, user info, theme toggle
- **Role-based navigation**: Different nav items for admin/CSR/fueler/member
- **Responsive behavior**: Expanded vs collapsed states
- **Interactive elements**: Theme toggle, navigation clicks, logout
- **Permission filtering**: Shows/hides items based on user permissions
- **Error handling**: Graceful degradation with invalid data

### 2. Layout Integration Tests (`layouts/sidebar-layouts.test.tsx`)
Tests the layout components and their integration with the sidebar:
- **SidebarProvider integration**: Proper context setup
- **Permission enforcement**: Access control at layout level
- **Loading states**: Proper loading indicators
- **Access denied scenarios**: Unauthorized access handling
- **Authentication flows**: Login redirects

### 3. Permission Integration Tests (`integration/sidebar-permissions.test.tsx`)
Tests complex permission scenarios and cross-component integration:
- **Granular permissions**: Limited access scenarios
- **Multi-role users**: Users with multiple roles
- **Permission errors**: Malformed or missing permission data
- **Cross-role checks**: Admin accessing CSR features, etc.

### 4. End-to-End Tests (`e2e/sidebar-integration.cy.ts`)
Tests real browser interactions and full user workflows:
- **Full authentication flows**: Login → role detection → navigation
- **Responsive behavior**: Mobile sheet, desktop sidebar
- **Navigation workflows**: Click-through testing
- **Keyboard navigation**: Accessibility testing
- **Theme persistence**: Theme changes across sessions
- **Error scenarios**: Network failures, invalid sessions

### 5. Test Utilities (`utils/sidebar-test-helpers.ts`)
Shared testing utilities and helpers:
- **Mock data**: Pre-configured user objects for each role
- **Test wrappers**: SidebarProvider setup2
- **Assertion helpers**: Common expectations
- **Interaction helpers**: User event simulations

## Test Commands

```bash
# Run all sidebar tests
npm run test:sidebar

# Watch mode for development
npm run test:sidebar:watch

# Coverage report
npm run test:sidebar:coverage

# Run specific test suites
npm test -- app-sidebar.test.tsx
npm test -- sidebar-layouts.test.tsx
npm test -- sidebar-permissions.test.tsx

# E2E tests
npm run test:e2e:open  # Interactive mode
npm run test:e2e       # Headless mode

# Run all tests (unit + e2e)
npm run test:all
```

## Test Scenarios Coverage

### ✅ Role-Based Navigation
- [x] Admin sees admin navigation items
- [x] CSR sees CSR navigation items  
- [x] Fueler sees fueler navigation items
- [x] Member sees member navigation items
- [x] Users don't see unauthorized items

### ✅ Permission Granularity
- [x] Admin with limited permissions
- [x] CSR without order permissions
- [x] Fueler without dashboard access
- [x] Member with basic access

### ✅ Responsive Behavior
- [x] Desktop expand/collapse functionality
- [x] Mobile sheet overlay
- [x] Tooltip display when collapsed
- [x] Proper content margins and layout

### ✅ Interactive Elements
- [x] Theme toggle functionality
- [x] Navigation link clicks
- [x] User dropdown and logout
- [x] Keyboard navigation support

### ✅ Error Handling
- [x] Invalid user data
- [x] Missing permissions
- [x] Network failures
- [x] Malformed responses

### ✅ Authentication States
- [x] Logged in users
- [x] Unauthenticated users
- [x] Loading states
- [x] Session expiration

## Testing Best Practices

### 1. Test Isolation
- Each test is independent and can run in any order
- Mocks are reset between tests
- No shared state between test cases

### 2. Realistic Data
- Use realistic user data and permission structures
- Test with actual permission names from the backend
- Include edge cases and boundary conditions

### 3. Accessibility Testing
- Keyboard navigation works correctly
- Screen reader compatibility
- Focus management in mobile mode

### 4. Performance Considerations
- Tests run efficiently without unnecessary delays
- Proper cleanup to prevent memory leaks
- Optimal test suite execution time

### 5. Maintainability
- Clear test descriptions and organization
- Reusable test utilities and helpers
- Easy to update when requirements change

## Mock Data Structure

```typescript
// Example mock user for testing
const mockAdminUser = {
  user: {
    isLoggedIn: true,
    name: 'Admin User',
    email: 'admin@test.com',
    roles: ['System Administrator'],
  },
  loading: false,
  canAny: jest.fn().mockReturnValue(true),
  isAdmin: true,
  isCSR: false,
  isFueler: false,
  isMember: false,
}
```

## CI/CD Integration

These tests are designed to run in:
- ✅ Local development environment
- ✅ GitHub Actions CI pipeline
- ✅ Pre-commit hooks
- ✅ Pull request validation

## Debugging Failed Tests

### Common Issues and Solutions

1. **Permission Hook Errors**
   - Check mock setup in test
   - Verify permission data structure
   - Ensure proper hook mocking

2. **Responsive Test Failures**
   - Check viewport configuration
   - Verify CSS media queries
   - Test mobile detection logic

3. **Navigation Test Failures**
   - Verify role-based permissions
   - Check navigation item text matching
   - Ensure proper routing mocks

4. **E2E Test Instability**
   - Add proper wait conditions
   - Check for race conditions
   - Verify test data setup

## Future Test Enhancements

- [ ] Visual regression testing
- [ ] Performance benchmarking
- [ ] Cross-browser compatibility testing
- [ ] Accessibility compliance testing
- [ ] Load testing for permission checks