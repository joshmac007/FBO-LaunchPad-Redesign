describe('Fueler Claim Race Condition', () => {
  let testOrderId: number;

  beforeEach(() => {
    // Create a test order that will be available for claiming
    cy.loginAs('admin');
    cy.createTestFuelOrder('DISPATCHED').then((order) => {
      testOrderId = order.id;
    });
  });

  it('should handle race condition when two fuelers claim the same order', () => {
    // This test simulates a race condition using multiple browser windows/tabs
    // Since Cypress runs in a single browser context, we'll simulate this
    // by rapidly firing multiple claim requests
    
    cy.loginAs('fueler');
    cy.visit('/fueler/dashboard');
    
    // Verify order is available
    cy.get(`[data-cy="order-card-${testOrderId}"]`, { timeout: 10000 }).should('be.visible');
    cy.get(`[data-cy="claim-order-button-${testOrderId}"]`).should('be.visible');
    
    // Get the auth token for making parallel requests
    cy.window().then((win) => {
      const userData = JSON.parse(win.localStorage.getItem('fboUser') || '{}');
      const token = userData.token || userData.access_token;
      
      // Make multiple rapid claim requests to simulate race condition
      const claimUrl = `http://localhost:5001/api/fuel-orders/${testOrderId}/status`;
      
      // First request (should succeed)
      cy.request({
        method: 'PATCH',
        url: claimUrl,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: {
          status: 'ACKNOWLEDGED'
        }
      }).then((response) => {
        expect(response.status).to.equal(200);
        cy.log('First claim request succeeded');
      });
      
      // Second request (should fail with 409 Conflict)
      cy.request({
        method: 'PATCH',
        url: claimUrl,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: {
          status: 'ACKNOWLEDGED'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.equal(409);
        cy.log('Second claim request correctly failed with 409 Conflict');
      });
    });
    
    // Refresh the page to see the updated state
    cy.reload();
    
    // Verify the order is now in the fueler's queue (claimed)
    cy.get('[data-cy="kanban-column-queue"]', { timeout: 10000 }).should('be.visible');
    cy.get(`[data-cy="order-card-${testOrderId}"]`).should('be.visible');
    
    // Verify it's no longer in available orders
    cy.get('[data-cy="kanban-column-available"]').should('not.contain', `[data-cy="order-card-${testOrderId}"]`);
  });

  it('should display conflict notification when claim fails', () => {
    // First, claim the order as admin/another user
    cy.window().then((win) => {
      const userData = JSON.parse(win.localStorage.getItem('fboUser') || '{}');
      const token = userData.token || userData.access_token;
      
      cy.request({
        method: 'PATCH',
        url: `http://localhost:5001/api/fuel-orders/${testOrderId}/status`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: {
          status: 'ACKNOWLEDGED'
        }
      });
    });
    
    // Now login as fueler and try to claim the already-claimed order
    cy.loginAs('fueler');
    cy.visit('/fueler/dashboard');
    
    // Try to click the claim button (it should handle the conflict gracefully)
    cy.get(`[data-cy="claim-order-button-${testOrderId}"]`, { timeout: 10000 }).should('be.visible');
    cy.get(`[data-cy="claim-order-button-${testOrderId}"]`).click();
    
    // The order should either:
    // 1. Show a conflict notification/toast, OR
    // 2. Be removed from available orders, OR
    // 3. Display an error state on the order card
    
    // Wait a moment for the UI to react
    cy.wait(2000);
    
    // Check for various possible UI responses to the conflict
    cy.get('body').then(($body) => {
      // Look for error notifications, toasts, or the order being removed
      const hasErrorNotification = $body.find('[data-cy*="error"], [data-cy*="conflict"], .toast, .alert').length > 0;
      const orderStillVisible = $body.find(`[data-cy="order-card-${testOrderId}"]`).length > 0;
      
      if (hasErrorNotification) {
        cy.log('Conflict notification displayed');
      } else if (!orderStillVisible) {
        cy.log('Order removed from available list due to conflict');
      } else {
        // Check if order shows error state
        cy.get(`[data-cy="order-card-${testOrderId}"]`).within(() => {
          // Look for error indicators like sync failed badge
          cy.get('[data-cy*="sync-failed"], [data-cy*="error"]').should('exist');
        });
      }
    });
  });

  it('should handle rapid successive claim attempts', () => {
    cy.loginAs('fueler');
    cy.visit('/fueler/dashboard');
    
    // Verify order is available
    cy.get(`[data-cy="order-card-${testOrderId}"]`, { timeout: 10000 }).should('be.visible');
    
    // Rapidly click the claim button multiple times
    cy.get(`[data-cy="claim-order-button-${testOrderId}"]`).click();
    cy.get(`[data-cy="claim-order-button-${testOrderId}"]`).click();
    cy.get(`[data-cy="claim-order-button-${testOrderId}"]`).click();
    
    // Wait for the requests to process
    cy.wait(3000);
    
    // The order should only be claimed once and appear in the queue
    cy.get('[data-cy="kanban-column-queue"]').should('contain', `[data-cy="order-card-${testOrderId}"]`);
    
    // There should only be one instance of the order card
    cy.get(`[data-cy="order-card-${testOrderId}"]`).should('have.length', 1);
  });

  it('should show loading state during claim attempt', () => {
    cy.loginAs('fueler');
    cy.visit('/fueler/dashboard');
    
    // Verify order is available
    cy.get(`[data-cy="order-card-${testOrderId}"]`, { timeout: 10000 }).should('be.visible');
    
    // Intercept the claim request to slow it down
    cy.intercept('PATCH', `**/api/fuel-orders/${testOrderId}/status`, {
      delay: 2000,
      statusCode: 200,
      body: { success: true }
    }).as('claimOrder');
    
    // Click claim button
    cy.get(`[data-cy="claim-order-button-${testOrderId}"]`).click();
    
    // Should show some kind of loading state
    // This could be a disabled button, loading spinner, or queued badge
    cy.get(`[data-cy="order-card-${testOrderId}"]`).within(() => {
      // Look for loading indicators
      cy.get('[data-cy*="queued"], [data-cy*="loading"], .animate-spin, [disabled]').should('exist');
    });
    
    // Wait for the request to complete
    cy.wait('@claimOrder');
    
    // Verify the order moves to queue
    cy.get('[data-cy="kanban-column-queue"]').should('contain', `[data-cy="order-card-${testOrderId}"]`);
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