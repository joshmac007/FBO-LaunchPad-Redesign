describe('Fueler Happy Path Workflow', () => {
  let testOrderId: number;

  beforeEach(() => {
    // Login as fueler
    cy.loginAs('fueler');
    
    // Wait for permissions to load
    cy.waitForPermissions();
    
    // Visit the fueler dashboard
    cy.visit('/fueler/dashboard');
    
    // Wait for initial data load
    cy.get('[data-cy="kanban-column-available"]', { timeout: 10000 }).should('be.visible');
  });

  it('should complete a full order lifecycle from claim to completion', () => {
    // Step 1: Use existing dispatched order (check if order 1 exists in available orders)
    cy.get('[data-cy="kanban-column-available"]').should('be.visible');
    
    // Find the first available order card
    cy.get('[data-cy="kanban-column-available"] [data-cy^="order-card-"]').first().then(($card) => {
      // Extract order ID from the data-cy attribute
      const orderCardAttr = $card.attr('data-cy');
      if (orderCardAttr) {
        testOrderId = parseInt(orderCardAttr.replace('order-card-', ''));
      }
      
      // Step 2: Verify order appears in Available Orders column
      cy.get(`[data-cy="order-card-${testOrderId}"]`, { timeout: 10000 }).should('be.visible');
      
      // Step 3: Claim the order
      cy.get(`[data-cy="claim-order-button-${testOrderId}"]`).click();
      
      // Step 4: Verify order moves to My Queue column
      cy.get('[data-cy="kanban-column-myQueue"]').should('be.visible');
      cy.get(`[data-cy="order-card-${testOrderId}"]`).should('be.visible');
      cy.get('[data-cy="kanban-column-available"]').should('not.contain', `[data-cy="order-card-${testOrderId}"]`);
      
      // Step 5: Mark as En Route
      cy.get(`[data-cy="en-route-button-${testOrderId}"]`).click();
      
      // Step 6: Verify order moves to In Progress column
      cy.get('[data-cy="kanban-column-inProgress"]').should('be.visible');
      cy.get(`[data-cy="order-card-${testOrderId}"]`).should('be.visible');
      cy.get('[data-cy="kanban-column-myQueue"]').should('not.contain', `[data-cy="order-card-${testOrderId}"]`);
      
      // Step 7: Start Fueling
      cy.get(`[data-cy="start-fueling-button-${testOrderId}"]`).click();
      
      // Verify order stays in progress but status updates
      cy.get('[data-cy="kanban-column-inProgress"]').should('contain', `[data-cy="order-card-${testOrderId}"]`);
      
      // Step 8: Complete the order
      cy.get(`[data-cy="complete-order-button-${testOrderId}"]`).click();
      
      // Step 9: Fill out completion dialog
      cy.get('[data-cy="complete-order-dialog"]', { timeout: 5000 }).should('be.visible');
      
      // Enter start meter reading
      cy.get('[data-cy="start-meter-input"]').clear().type('1000.5');
      
      // Enter end meter reading
      cy.get('[data-cy="end-meter-input"]').clear().type('1050.8');
      
      // Step 10: Verify gallons calculation appears in real-time
      cy.get('[data-cy="calculated-gallons"]').should('contain', '50.3');
      
      // Add completion notes
      cy.get('[data-cy="completion-notes-input"]').type('Test completion - all systems normal');
      
      // Submit completion
      cy.get('[data-cy="submit-completion-button"]').click();
      
      // Step 11: Verify order moves to Completed Today column
      cy.get('[data-cy="complete-order-dialog"]', { timeout: 5000 }).should('not.exist');
      cy.get('[data-cy="kanban-column-completed"]').should('be.visible');
      cy.get(`[data-cy="order-card-${testOrderId}"]`).should('be.visible');
      cy.get('[data-cy="kanban-column-inProgress"]').should('not.contain', `[data-cy="order-card-${testOrderId}"]`);
      
      // Step 12: Verify receipt link is available
      cy.get(`[data-cy="view-receipt-button-${testOrderId}"]`).should('be.visible');
      
      // Step 13: Test receipt navigation
      cy.get(`[data-cy="view-receipt-button-${testOrderId}"]`).click();
      cy.url().should('include', `/fueler/receipts/${testOrderId}`);
      
      // Navigate back to dashboard
      cy.visit('/fueler/dashboard');
      
      // Step 14: Verify order is still in completed column
      cy.get('[data-cy="kanban-column-completed"]').should('contain', `[data-cy="order-card-${testOrderId}"]`);
    });
  });

  it('should handle pull-to-refresh on available orders', () => {
    // Test the pull-to-refresh functionality
    cy.get('[data-cy="kanban-column-available"]').should('be.visible');
    
    // Click refresh button on available orders column
    cy.get('[data-cy="refresh-column-available"]').click();
    
    // Should show loading state briefly
    cy.get('[data-cy="kanban-column-available"]').should('be.visible');
    
    // Verify orders reload (wait for potential new data)
    cy.wait(2000);
    cy.get('[data-cy="kanban-column-available"]').should('be.visible');
  });

  it('should display order details correctly in cards', () => {
    // Use the first available order card to test details display
    cy.get('[data-cy="kanban-column-available"]').should('be.visible');
    
    // Find the first available order card and verify it displays essential information
    cy.get('[data-cy="kanban-column-available"] [data-cy^="order-card-"]').first().within(() => {
      // Should display tail number (we know from DB it should contain N123AB)
      cy.root().should('contain', 'N123AB');
      
      // Should display some numeric content (requested amount or location)
      cy.get('*').should('contain.text', /\d+/);
    });
  });

  it('should toggle high contrast mode correctly', () => {
    // Test high contrast mode toggle
    cy.get('[data-cy="toggle-high-contrast"]').should('be.visible');
    
    // Toggle to high contrast
    cy.get('[data-cy="toggle-high-contrast"]').click();
    
    // Verify high contrast is applied
    cy.get('html').should('have.class', 'high-contrast');
    cy.get('[data-cy="toggle-high-contrast"]').should('contain', 'Normal');
    
    // Toggle back to normal
    cy.get('[data-cy="toggle-high-contrast"]').click();
    
    // Verify normal mode is restored
    cy.get('html').should('not.have.class', 'high-contrast');
    cy.get('[data-cy="toggle-high-contrast"]').should('contain', 'High Contrast');
  });

  afterEach(() => {
    // Clean up test order if it was created
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