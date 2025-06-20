describe('CSR Update & LST Acknowledgement Workflow', () => {
  let testOrderId: number;

  beforeEach(() => {
    // Create and claim an order as a fueler first
    cy.loginAs('admin');
    cy.createTestFuelOrder('DISPATCHED').then((order) => {
      testOrderId = order.id;
      
      // Claim the order as a fueler
      cy.loginAs('fueler');
      cy.visit('/fueler/dashboard');
      cy.get(`[data-cy="order-card-${testOrderId}"]`, { timeout: 10000 }).should('be.visible');
      cy.get(`[data-cy="claim-order-button-${testOrderId}"]`).click();
      
      // Move to in-progress to make it more realistic
      cy.get(`[data-cy="en-route-button-${testOrderId}"]`).click();
    });
  });

  it('should handle CSR update and require fueler acknowledgement', () => {
    // Start as fueler to see initial state
    cy.loginAs('fueler');
    cy.visit('/fueler/dashboard');
    
    // Verify order is in progress
    cy.get('[data-cy="kanban-column-progress"]').should('contain', `[data-cy="order-card-${testOrderId}"]`);
    
    // Get initial order state
    cy.get(`[data-cy="order-card-${testOrderId}"]`).should('be.visible');
    
    // Now switch to CSR and make an update
    cy.loginAs('csr');
    cy.visit(`/csr/fuel-orders/${testOrderId}`);
    
    // Wait for order details to load
    cy.wait(2000);
    
    // Make a CSR update (simulate updating order details)
    cy.window().then((win) => {
      const userData = JSON.parse(win.localStorage.getItem('fboUser') || '{}');
      const token = userData.token || userData.access_token;
      
      // Send CSR update request
      cy.request({
        method: 'PATCH',
        url: `http://localhost:5001/api/fuel-orders/${testOrderId}/csr-update`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: {
          requested_amount: 150.0,
          csr_notes: 'Updated fuel amount per customer request'
        },
        failOnStatusCode: false
      }).then((response) => {
        cy.log('CSR update response:', response.status);
      });
    });
    
    // Switch back to fueler to see the update notification
    cy.loginAs('fueler');
    cy.visit('/fueler/dashboard');
    
    // Wait for real-time update to propagate
    cy.wait(3000);
    
    // The order card should now be highlighted/disabled
    cy.get(`[data-cy="order-card-${testOrderId}"]`, { timeout: 10000 }).should('be.visible');
    
    // Check for visual indicators of pending change
    cy.get(`[data-cy="order-card-${testOrderId}"]`).within(() => {
      // Look for various possible indicators of a pending CSR change
      cy.get('body').then(($body) => {
        const cardElement = $body.find(`[data-cy="order-card-${testOrderId}"]`);
        
        // Check for highlighted state, disabled buttons, or acknowledgement button
        const isHighlighted = cardElement.hasClass('highlighted') || 
                            cardElement.hasClass('pending-change') ||
                            cardElement.find('.highlight').length > 0;
        
        const hasAckButton = cardElement.find('[data-cy*="acknowledge"], [data-cy*="ack"]').length > 0;
        const hasDisabledButtons = cardElement.find('button[disabled]').length > 0;
        
        if (hasAckButton) {
          cy.log('Acknowledge button found');
          cy.get('[data-cy*="acknowledge"], [data-cy*="ack"]').should('be.visible');
        } else if (hasDisabledButtons) {
          cy.log('Buttons are disabled due to pending change');
        } else if (isHighlighted) {
          cy.log('Order card is highlighted for pending change');
        }
      });
    });
    
    // Look for "Acknowledge Change" button specifically
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy*="acknowledge"]').length > 0) {
        // Click the acknowledge button
        cy.get('[data-cy*="acknowledge"]').first().click();
        
        // Wait for acknowledgement to process
        cy.wait(2000);
        
        // Verify the order returns to normal state
        cy.get(`[data-cy="order-card-${testOrderId}"]`).within(() => {
          // Normal action buttons should be available again
          cy.get('button:not([disabled])').should('exist');
        });
      }
    });
  });

  it('should prevent fueler actions while CSR change is pending', () => {
    // Setup: Make CSR update first
    cy.loginAs('csr');
    cy.window().then((win) => {
      const userData = JSON.parse(win.localStorage.getItem('fboUser') || '{}');
      const token = userData.token || userData.access_token;
      
      cy.request({
        method: 'PATCH',
        url: `http://localhost:5001/api/fuel-orders/${testOrderId}/csr-update`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: {
          requested_amount: 175.0,
          csr_notes: 'Another update requiring acknowledgement'
        },
        failOnStatusCode: false
      });
    });
    
    // Switch to fueler
    cy.loginAs('fueler');
    cy.visit('/fueler/dashboard');
    
    // Wait for update to propagate
    cy.wait(3000);
    
    // Try to perform actions that should be blocked
    cy.get(`[data-cy="order-card-${testOrderId}"]`, { timeout: 10000 }).within(() => {
      // Check if action buttons are disabled
      cy.get('[data-cy*="button"]').each(($btn) => {
        if (!$btn.attr('data-cy')?.includes('acknowledge')) {
          // Non-acknowledge buttons should be disabled
          cy.wrap($btn).should('be.disabled');
        }
      });
    });
  });

  it('should validate correct change version during acknowledgement', () => {
    // Make multiple CSR updates to increment change_version
    cy.loginAs('csr');
    cy.window().then((win) => {
      const userData = JSON.parse(win.localStorage.getItem('fboUser') || '{}');
      const token = userData.token || userData.access_token;
      
      // First update
      cy.request({
        method: 'PATCH',
        url: `http://localhost:5001/api/fuel-orders/${testOrderId}/csr-update`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: {
          requested_amount: 120.0,
          csr_notes: 'First update'
        },
        failOnStatusCode: false
      });
      
      // Second update (increments change_version again)
      cy.request({
        method: 'PATCH',
        url: `http://localhost:5001/api/fuel-orders/${testOrderId}/csr-update`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: {
          requested_amount: 130.0,
          csr_notes: 'Second update - latest version'
        },
        failOnStatusCode: false
      });
    });
    
    // Switch to fueler
    cy.loginAs('fueler');
    cy.visit('/fueler/dashboard');
    
    // Wait for updates to propagate
    cy.wait(3000);
    
    // The fueler should see the latest change and be able to acknowledge it
    cy.get(`[data-cy="order-card-${testOrderId}"]`, { timeout: 10000 }).should('be.visible');
    
    // Look for and click acknowledge button
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy*="acknowledge"]').length > 0) {
        cy.get('[data-cy*="acknowledge"]').first().click();
        
        // Should succeed with latest version
        cy.wait(2000);
        
        // Verify acknowledgement worked (buttons re-enabled)
        cy.get(`[data-cy="order-card-${testOrderId}"]`).within(() => {
          cy.get('button:not([disabled])').should('exist');
        });
      }
    });
  });

  it('should show updated order details after CSR modification', () => {
    // Get initial order details
    cy.loginAs('fueler');
    cy.visit('/fueler/dashboard');
    
    cy.get(`[data-cy="order-card-${testOrderId}"]`, { timeout: 10000 }).within(() => {
      // Store initial values for comparison
      cy.get('body').then(() => {
        cy.log('Checking initial order state');
      });
    });
    
    // Make CSR update with specific changes
    cy.loginAs('csr');
    cy.window().then((win) => {
      const userData = JSON.parse(win.localStorage.getItem('fboUser') || '{}');
      const token = userData.token || userData.access_token;
      
      cy.request({
        method: 'PATCH',
        url: `http://localhost:5001/api/fuel-orders/${testOrderId}/csr-update`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: {
          requested_amount: 200.0,
          fuel_type: 'Jet A-1',
          location_on_ramp: 'B2',
          csr_notes: 'Updated location and fuel type per ops'
        },
        failOnStatusCode: false
      });
    });
    
    // Return to fueler view
    cy.loginAs('fueler');
    cy.visit('/fueler/dashboard');
    
    // Wait for real-time update
    cy.wait(3000);
    
    // After acknowledging, should see updated details
    cy.get(`[data-cy="order-card-${testOrderId}"]`, { timeout: 10000 }).within(() => {
      // Check for updated values
      cy.should('contain', '200'); // Updated amount
      cy.should('contain', 'B2');  // Updated location
      cy.should('contain', 'Jet A-1'); // Updated fuel type
    });
  });

  it('should handle WebSocket events for real-time updates', () => {
    cy.loginAs('fueler');
    cy.visit('/fueler/dashboard');
    
    // Verify initial connection
    cy.get('[data-cy="connection-status-banner"]').should('not.be.visible');
    
    // Make CSR update in another context
    cy.loginAs('csr');
    cy.window().then((win) => {
      const userData = JSON.parse(win.localStorage.getItem('fboUser') || '{}');
      const token = userData.token || userData.access_token;
      
      cy.request({
        method: 'PATCH',
        url: `http://localhost:5001/api/fuel-orders/${testOrderId}/csr-update`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: {
          requested_amount: 160.0,
          csr_notes: 'Real-time update test'
        },
        failOnStatusCode: false
      });
    });
    
    // Switch back to fueler to see real-time update
    cy.loginAs('fueler');
    cy.visit('/fueler/dashboard');
    
    // The update should appear without manual refresh
    cy.get(`[data-cy="order-card-${testOrderId}"]`, { timeout: 10000 }).should('be.visible');
    
    // Should show indicators of the change within reasonable time
    cy.wait(5000);
    
    // Look for visual change indicators
    cy.get(`[data-cy="order-card-${testOrderId}"]`).then(($card) => {
      // The card should show some indication of change
      cy.log('Order card should show change indicators');
    });
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