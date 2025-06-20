describe('Network Interruption & Queued Action Workflow', () => {
  let testOrderId: number;

  beforeEach(() => {
    // Create and claim an order as a fueler
    cy.loginAs('admin');
    cy.createTestFuelOrder('DISPATCHED').then((order) => {
      testOrderId = order.id;
      
      // Claim the order as a fueler
      cy.loginAs('fueler');
      cy.visit('/fueler/dashboard');
      cy.get(`[data-cy="order-card-${testOrderId}"]`, { timeout: 10000 }).should('be.visible');
      cy.get(`[data-cy="claim-order-button-${testOrderId}"]`).click();
    });
  });

  it('should handle network interruption with queued actions', () => {
    cy.loginAs('fueler');
    cy.visit('/fueler/dashboard');
    
    // Verify order is in queue
    cy.get('[data-cy="kanban-column-queue"]').should('contain', `[data-cy="order-card-${testOrderId}"]`);
    
    // Step 1: Simulate network disconnection by intercepting API calls
    cy.intercept('PATCH', `**/api/fuel-orders/${testOrderId}/status`, {
      forceNetworkError: true
    }).as('blockedStatusUpdate');
    
    // Step 2: Perform an action that should be queued (En Route)
    cy.get(`[data-cy="en-route-button-${testOrderId}"]`).click();
    
    // Step 3: Verify optimistic update and queued state
    // The order should move to in-progress column optimistically
    cy.get('[data-cy="kanban-column-progress"]').should('contain', `[data-cy="order-card-${testOrderId}"]`);
    
    // Step 4: Verify "Queued" badge appears
    cy.get(`[data-cy="queued-badge-${testOrderId}"]`, { timeout: 5000 }).should('be.visible');
    
    // Step 5: Verify connection status banner shows reconnecting state
    cy.get('[data-cy="connection-status-banner"]', { timeout: 5000 }).should('be.visible');
    cy.get('[data-cy="connection-status-banner"]').should('contain', 'Reconnecting');
    cy.get('[data-cy="queued-actions-count"]').should('contain', '1');
    
    // Step 6: Simulate network returning by removing the intercept
    cy.intercept('PATCH', `**/api/fuel-orders/${testOrderId}/status`, {
      statusCode: 200,
      body: { success: true, status: 'EN_ROUTE' }
    }).as('successfulStatusUpdate');
    
    // Wait for automatic retry/reconnection
    cy.wait('@successfulStatusUpdate', { timeout: 10000 });
    
    // Step 7: Verify queued badge disappears
    cy.get(`[data-cy="queued-badge-${testOrderId}"]`).should('not.exist');
    
    // Step 8: Verify connection banner disappears
    cy.get('[data-cy="connection-status-banner"]').should('not.be.visible');
    
    // Step 9: Verify order remains in correct state
    cy.get('[data-cy="kanban-column-progress"]').should('contain', `[data-cy="order-card-${testOrderId}"]`);
  });

  it('should handle multiple queued actions during network outage', () => {
    cy.loginAs('fueler');
    cy.visit('/fueler/dashboard');
    
    // Block all API calls
    cy.intercept('PATCH', '**/api/fuel-orders/**', {
      forceNetworkError: true
    }).as('blockedAPICalls');
    
    // Perform multiple actions rapidly
    cy.get(`[data-cy="en-route-button-${testOrderId}"]`).click();
    
    // Wait for UI to update
    cy.wait(1000);
    
    // Try to start fueling (second action)
    cy.get(`[data-cy="start-fueling-button-${testOrderId}"]`).click();
    
    // Verify multiple actions are queued
    cy.get('[data-cy="connection-status-banner"]').should('be.visible');
    cy.get('[data-cy="queued-actions-count"]').should('contain', '2');
    
    // Both actions should show queued state
    cy.get(`[data-cy="queued-badge-${testOrderId}"]`).should('be.visible');
    
    // Restore network
    cy.intercept('PATCH', `**/api/fuel-orders/${testOrderId}/status`, {
      statusCode: 200,
      body: { success: true }
    }).as('restoredNetwork');
    
    // Wait for actions to sync
    cy.wait('@restoredNetwork');
    cy.wait(3000); // Allow time for multiple actions to process
    
    // Verify all actions processed
    cy.get('[data-cy="connection-status-banner"]').should('not.be.visible');
    cy.get(`[data-cy="queued-badge-${testOrderId}"]`).should('not.exist');
  });

  it('should show sync failed state for permanent failures', () => {
    cy.loginAs('fueler');
    cy.visit('/fueler/dashboard');
    
    // Simulate server rejection (4xx error)
    cy.intercept('PATCH', `**/api/fuel-orders/${testOrderId}/status`, {
      statusCode: 400,
      body: { error: 'Invalid status transition' }
    }).as('rejectedAction');
    
    // Perform action that will fail
    cy.get(`[data-cy="en-route-button-${testOrderId}"]`).click();
    
    // Wait for the failed request
    cy.wait('@rejectedAction');
    
    // Should show sync failed badge
    cy.get(`[data-cy="sync-failed-badge-${testOrderId}"]`, { timeout: 5000 }).should('be.visible');
    
    // Order should revert to original state
    cy.get('[data-cy="kanban-column-queue"]').should('contain', `[data-cy="order-card-${testOrderId}"]`);
    
    // Should show retry button
    cy.get(`[data-cy="retry-action-button-${testOrderId}"]`).should('be.visible');
  });

  it('should handle retry functionality after sync failure', () => {
    cy.loginAs('fueler');
    cy.visit('/fueler/dashboard');
    
    // First, cause a failure
    cy.intercept('PATCH', `**/api/fuel-orders/${testOrderId}/status`, {
      statusCode: 500,
      body: { error: 'Server error' }
    }).as('serverError');
    
    cy.get(`[data-cy="en-route-button-${testOrderId}"]`).click();
    cy.wait('@serverError');
    
    // Verify sync failed state
    cy.get(`[data-cy="sync-failed-badge-${testOrderId}"]`).should('be.visible');
    
    // Fix the network and retry
    cy.intercept('PATCH', `**/api/fuel-orders/${testOrderId}/status`, {
      statusCode: 200,
      body: { success: true, status: 'EN_ROUTE' }
    }).as('successfulRetry');
    
    // Click retry button
    cy.get(`[data-cy="retry-action-button-${testOrderId}"]`).click();
    
    cy.wait('@successfulRetry');
    
    // Verify success
    cy.get(`[data-cy="sync-failed-badge-${testOrderId}"]`).should('not.exist');
    cy.get('[data-cy="kanban-column-progress"]').should('contain', `[data-cy="order-card-${testOrderId}"]`);
  });

  it('should handle network interruption during order completion', () => {
    cy.loginAs('fueler');
    cy.visit('/fueler/dashboard');
    
    // Move order to fueling state first
    cy.get(`[data-cy="en-route-button-${testOrderId}"]`).click();
    cy.wait(2000);
    cy.get(`[data-cy="start-fueling-button-${testOrderId}"]`).click();
    cy.wait(2000);
    
    // Block completion API call
    cy.intercept('PUT', `**/api/fuel-orders/${testOrderId}/submit-data`, {
      forceNetworkError: true
    }).as('blockedCompletion');
    
    // Try to complete order
    cy.get(`[data-cy="complete-order-button-${testOrderId}"]`).click();
    
    // Fill completion dialog
    cy.get('[data-cy="complete-order-dialog"]').should('be.visible');
    cy.get('[data-cy="start-meter-input"]').type('1000');
    cy.get('[data-cy="end-meter-input"]').type('1075');
    cy.get('[data-cy="completion-notes-input"]').type('Test completion');
    
    // Submit (should fail and queue)
    cy.get('[data-cy="submit-completion-button"]').click();
    
    // Dialog should close but order should show queued state
    cy.get('[data-cy="complete-order-dialog"]').should('not.exist');
    cy.get(`[data-cy="queued-badge-${testOrderId}"]`).should('be.visible');
    cy.get('[data-cy="connection-status-banner"]').should('be.visible');
    
    // Restore network
    cy.intercept('PUT', `**/api/fuel-orders/${testOrderId}/submit-data`, {
      statusCode: 200,
      body: { success: true, status: 'COMPLETED' }
    }).as('successfulCompletion');
    
    cy.wait('@successfulCompletion');
    
    // Verify completion
    cy.get(`[data-cy="queued-badge-${testOrderId}"]`).should('not.exist');
    cy.get('[data-cy="kanban-column-completed"]').should('contain', `[data-cy="order-card-${testOrderId}"]`);
  });

  it('should handle WebSocket disconnection and reconnection', () => {
    cy.loginAs('fueler');
    cy.visit('/fueler/dashboard');
    
    // Initially should be connected
    cy.get('[data-cy="connection-status-banner"]').should('not.be.visible');
    
    // Simulate WebSocket disconnection by blocking socket.io requests
    cy.intercept('GET', '**/socket.io/**', {
      forceNetworkError: true
    }).as('blockedSocket');
    
    // The connection status should eventually show disconnected
    cy.get('[data-cy="connection-status-banner"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-cy="connection-status-banner"]').should('contain', 'Reconnecting');
    
    // Perform an action while disconnected
    cy.get(`[data-cy="en-route-button-${testOrderId}"]`).click();
    
    // Should show queued state
    cy.get(`[data-cy="queued-badge-${testOrderId}"]`).should('be.visible');
    cy.get('[data-cy="queued-actions-count"]').should('contain', '1');
    
    // Restore WebSocket connection
    cy.intercept('GET', '**/socket.io/**').as('restoredSocket');
    cy.intercept('PATCH', `**/api/fuel-orders/${testOrderId}/status`, {
      statusCode: 200,
      body: { success: true }
    }).as('syncedAction');
    
    // Wait for reconnection and sync
    cy.wait('@syncedAction');
    
    // Connection should be restored
    cy.get('[data-cy="connection-status-banner"]').should('not.be.visible');
    cy.get(`[data-cy="queued-badge-${testOrderId}"]`).should('not.exist');
  });

  it('should persist queued actions across page refresh', () => {
    cy.loginAs('fueler');
    cy.visit('/fueler/dashboard');
    
    // Block API calls
    cy.intercept('PATCH', `**/api/fuel-orders/${testOrderId}/status`, {
      forceNetworkError: true
    }).as('blockedAction');
    
    // Perform action that gets queued
    cy.get(`[data-cy="en-route-button-${testOrderId}"]`).click();
    
    // Verify queued state
    cy.get(`[data-cy="queued-badge-${testOrderId}"]`).should('be.visible');
    cy.get('[data-cy="queued-actions-count"]').should('contain', '1');
    
    // Refresh page
    cy.reload();
    
    // After reload, queued actions should still be there
    // (This depends on implementation - they might be stored in localStorage)
    cy.get('[data-cy="connection-status-banner"]', { timeout: 10000 }).should('be.visible');
    
    // Restore network and verify sync
    cy.intercept('PATCH', `**/api/fuel-orders/${testOrderId}/status`, {
      statusCode: 200,
      body: { success: true }
    }).as('restoredAfterRefresh');
    
    cy.wait('@restoredAfterRefresh', { timeout: 10000 });
    
    // Should eventually sync
    cy.get('[data-cy="connection-status-banner"]').should('not.be.visible');
  });

  afterEach(() => {
    // Clean up test order
    if (testOrderId) {
      cy.loginAs('admin');
      cy.request({
        method: 'DELETE',
        url: `http://localhost:5001/api/fuel-orders/${testOrderId}`,
        failOnStatusCode: false
      });
    }
  });
}); 