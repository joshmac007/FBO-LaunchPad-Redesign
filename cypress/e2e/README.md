# Fueler System E2E Tests

This directory contains comprehensive end-to-end tests for the FBO Launchpad Fueler System v2.0, implementing real-time order management with WebSocket connectivity and offline resilience.

## Test Files

### 1. `fueler-happy-path.cy.ts`
**The "Happy Path" Fueling Workflow**

Tests the complete order lifecycle from claiming to completion:
- Order claiming and kanban movement
- Status transitions (Acknowledged → En Route → Fueling → Completed)
- Completion dialog with real-time gallons calculation
- Receipt generation and navigation
- Pull-to-refresh functionality
- High contrast mode toggle
- Order card information display

**Key Assertions:**
- Order cards move smoothly between columns
- Completion dialog calculates gallons correctly (end - start)
- Visual states update appropriately

### 2. `fueler-claim-race.cy.ts`
**The "Claim Race" Condition**

Tests race condition handling when multiple fuelers attempt to claim the same order:
- Atomic order claiming with 409 Conflict responses
- UI handling of claim conflicts
- Rapid successive claim attempts
- Loading states during claim operations
- Error notification display

**Key Assertions:**
- Only one fueler can successfully claim an order
- Conflict responses are handled gracefully
- UI provides appropriate feedback for failed claims

### 3. `fueler-csr-update-acknowledgement.cy.ts`
**CSR Update & LST Acknowledgement Workflow**

Tests the communication flow between CSRs and fuelers for order modifications:
- CSR-initiated order updates via `/csr-update` endpoint
- Real-time WebSocket event propagation
- Order card highlighting and button disabling
- Acknowledgement workflow with version validation
- Updated order details display
- Prevention of actions during pending changes

**Key Assertions:**
- Order cards are highlighted when CSR changes are pending
- Action buttons are disabled until acknowledgement
- "Acknowledge Change" button appears and functions correctly
- Order details update after acknowledgement

### 4. `fueler-network-interruption.cy.ts`
**Network Interruption & Queued Action Workflow**

Tests offline resilience and the queued actions model:
- Network disconnection simulation via `cy.intercept()`
- Optimistic UI updates with queued badges
- Connection status banner functionality
- Action queue management and sync
- Sync failure handling and retry mechanisms
- WebSocket disconnection/reconnection
- Action persistence across page refreshes

**Key Assertions:**
- Actions are queued when network is unavailable
- Optimistic updates occur immediately
- "Queued" badges appear during network issues
- Connection status banner shows accurate state
- Actions sync automatically when network returns
- Sync failures show retry options

## Test Data & Setup

### Prerequisites
- Backend running on `http://localhost:5001`
- Frontend running on `http://localhost:3000`
- Test users available:
  - `admin@fbolaunchpad.com` / `Admin123!`
  - `csr@fbolaunchpad.com` / `CSR123!`
  - `fueler@fbolaunchpad.com` / `Fueler123!`

### Test Utilities Used
- `cy.loginAs(userType)` - Custom command for user authentication
- `cy.createTestFuelOrder(status)` - Custom command for order creation
- `cy.intercept()` - Network request interception for simulation
- `data-cy` attributes for reliable element selection

## Running the Tests

### Individual Test Files
```bash
# Run specific test suite
npx cypress run --spec "cypress/e2e/fueler-happy-path.cy.ts"
npx cypress run --spec "cypress/e2e/fueler-claim-race.cy.ts"
npx cypress run --spec "cypress/e2e/fueler-csr-update-acknowledgement.cy.ts"
npx cypress run --spec "cypress/e2e/fueler-network-interruption.cy.ts"
```

### All Fueler Tests
```bash
# Run all fueler-related tests
npx cypress run --spec "cypress/e2e/fueler-*.cy.ts"
```

### Interactive Mode
```bash
# Open Cypress Test Runner for interactive debugging
npx cypress open
```

## Test Architecture

### Data-Cy Attributes
All tests rely on `data-cy` attributes for element selection:
- `kanban-column-{type}` - Kanban board columns
- `order-card-{id}` - Individual order cards
- `{action}-button-{id}` - Action buttons on cards
- `queued-badge-{id}` - Queued action indicators
- `sync-failed-badge-{id}` - Sync failure indicators
- `connection-status-banner` - Connection status display

### Network Simulation
Tests use `cy.intercept()` to simulate various network conditions:
- `forceNetworkError: true` - Complete network failure
- `statusCode: 409` - Race condition conflicts
- `statusCode: 400/500` - Server errors
- `delay: ms` - Network latency

### Real-Time Testing
Tests validate WebSocket functionality by:
- Making API changes in one user context
- Switching to another user context
- Verifying real-time updates appear
- Testing connection status indicators

## Debugging

### Common Issues
1. **Timing Issues**: Tests include appropriate `cy.wait()` calls for real-time updates
2. **Element Selection**: All selections use `data-cy` attributes with timeouts
3. **Network Simulation**: Tests restore network conditions in `afterEach` hooks
4. **Test Isolation**: Each test creates its own order and cleans up afterward

### Debugging Tips
- Use `cy.log()` to add debug information
- Check browser developer tools for WebSocket connections
- Verify backend API responses in Network tab
- Use `{ timeout: ms }` on selectors for slow operations

## Test Coverage Summary

✅ **Complete order lifecycle workflows**  
✅ **Race condition handling**  
✅ **Real-time communication (WebSockets)**  
✅ **Offline resilience and queued actions**  
✅ **Error handling and recovery**  
✅ **UI state management and feedback**  
✅ **Multi-user workflow coordination**

These tests provide comprehensive coverage of the Fueler System v2.0 requirements and ensure robust operation in real-world conditions including network instability and concurrent user actions. 