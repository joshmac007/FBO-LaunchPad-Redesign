describe('Fuel Order Management', () => {
  beforeEach(() => {
    // Login as CSR user
    cy.visit('/login')
    cy.get('[data-cy="email"]').should('be.visible').type('csr@fbolaunchpad.com')
    cy.get('[data-cy="password"]').should('be.visible').type('CSR123!')
    cy.get('[data-cy="login-submit"]').should('be.visible').click()
    
    // Wait for redirect with longer timeout
    cy.url({ timeout: 10000 }).should('include', '/csr/dashboard')
    cy.contains('CSR Dashboard', { timeout: 10000 }).should('be.visible')
  })

  describe('Manual Status Update', () => {
    it('allows a CSR to manually change a fuel order status to COMPLETED with meter readings', () => {
      // Navigate to a fuel order detail page
      cy.visit('/csr/fuel-orders/3')
      
      // Wait for page to load
      cy.contains('Fuel Order #3', { timeout: 10000 }).should('be.visible')
      
      // Click the "Edit Status" button
      cy.get('[data-cy="edit-status-btn"]', { timeout: 10000 }).should('be.visible').click()
      
      // Assert the "Update Order Status" dialog is visible
      cy.get('[data-cy="status-update-dialog"]').should('be.visible')
      cy.contains('Update Order Status').should('be.visible')
      
      // Select 'Completed' option from the status dropdown
      cy.get('[data-cy="status-select"]').click()
      cy.get('[data-cy="status-option-COMPLETED"]').click()
      
      // Assert that input fields for "Start Meter" and "End Meter" are now visible
      cy.get('[data-cy="start-meter-input"]').should('be.visible')
      cy.get('[data-cy="end-meter-input"]').should('be.visible')
      
      // Type meter readings
      cy.get('[data-cy="start-meter-input"]').type('1000')
      cy.get('[data-cy="end-meter-input"]').type('1150')
      
      // Click the "Save Status" button
      cy.get('[data-cy="save-status-btn"]').click()
      
      // Assert the dialog closes and a success toast appears
      cy.get('[data-cy="status-update-dialog"]').should('not.exist')
      cy.contains('Status updated successfully', { timeout: 10000 }).should('be.visible')
      
      // Assert the status badge on the page now shows "Completed"
      cy.get('[data-cy="order-status-badge"]').should('contain', 'Completed')
    })

    it('allows a CSR to manually change a fuel order status to CANCELLED with reason', () => {
      // Navigate to a fuel order detail page
      cy.visit('/csr/fuel-orders/3')
      
      // Wait for page to load
      cy.contains('Fuel Order #3', { timeout: 10000 }).should('be.visible')
      
      // Click the "Edit Status" button
      cy.get('[data-cy="edit-status-btn"]', { timeout: 10000 }).should('be.visible').click()
      
      // Assert the "Update Order Status" dialog is visible
      cy.get('[data-cy="status-update-dialog"]').should('be.visible')
      
      // Select 'Cancelled' option from the status dropdown
      cy.get('[data-cy="status-select"]').click()
      cy.get('[data-cy="status-option-CANCELLED"]').click()
      
      // Add a reason for cancellation
      cy.get('[data-cy="reason-textarea"]').type('Customer request - flight cancelled')
      
      // Click the "Save Status" button
      cy.get('[data-cy="save-status-btn"]').click()
      
      // Assert the dialog closes and a success toast appears
      cy.get('[data-cy="status-update-dialog"]').should('not.exist')
      cy.contains('Status updated successfully', { timeout: 10000 }).should('be.visible')
      
      // Assert the status badge on the page now shows "Cancelled"
      cy.get('[data-cy="order-status-badge"]').should('contain', 'Cancelled')
    })

    it('shows validation error when trying to complete order without meter readings', () => {
      // Navigate to a fuel order detail page
      cy.visit('/csr/fuel-orders/3')
      
      // Wait for page to load
      cy.contains('Fuel Order #3', { timeout: 10000 }).should('be.visible')
      
      // Click the "Edit Status" button
      cy.get('[data-cy="edit-status-btn"]', { timeout: 10000 }).should('be.visible').click()
      
      // Select 'Completed' option from the status dropdown
      cy.get('[data-cy="status-select"]').click()
      cy.get('[data-cy="status-option-COMPLETED"]').click()
      
      // Try to save without entering meter readings
      cy.get('[data-cy="save-status-btn"]').click()
      
      // Assert validation error appears
      cy.contains('Start meter reading and end meter reading are required', { timeout: 5000 }).should('be.visible')
      
      // Dialog should remain open
      cy.get('[data-cy="status-update-dialog"]').should('be.visible')
    })

    it('shows validation error when end meter reading is not greater than start meter reading', () => {
      // Navigate to a fuel order detail page
      cy.visit('/csr/fuel-orders/1')
      
      // Wait for page to load
      cy.contains('Fuel Order #1', { timeout: 10000 }).should('be.visible')
      
      // Click the "Edit Status" button
      cy.get('[data-cy="edit-status-btn"]', { timeout: 10000 }).should('be.visible').click()
      
      // Select 'Completed' option from the status dropdown
      cy.get('[data-cy="status-select"]').click()
      cy.get('[data-cy="status-option-COMPLETED"]').click()
      
      // Enter invalid meter readings (end <= start)
      cy.get('[data-cy="start-meter-input"]').type('1150')
      cy.get('[data-cy="end-meter-input"]').type('1000')
      
      // Try to save
      cy.get('[data-cy="save-status-btn"]').click()
      
      // Assert validation error appears
      cy.contains('End meter reading must be greater than start meter reading', { timeout: 5000 }).should('be.visible')
      
      // Dialog should remain open
      cy.get('[data-cy="status-update-dialog"]').should('be.visible')
    })

    it('allows cancelling the status update dialog', () => {
      // Navigate to a fuel order detail page
      cy.visit('/csr/fuel-orders/1')
      
      // Wait for page to load
      cy.contains('Fuel Order #1', { timeout: 10000 }).should('be.visible')
      
      // Store the original status
      cy.get('[data-cy="order-status-badge"]').invoke('text').as('originalStatus')
      
      // Click the "Edit Status" button
      cy.get('[data-cy="edit-status-btn"]', { timeout: 10000 }).should('be.visible').click()
      
      // Assert the dialog is visible
      cy.get('[data-cy="status-update-dialog"]').should('be.visible')
      
      // Select a different status
      cy.get('[data-cy="status-select"]').click()
      cy.get('[data-cy="status-option-CANCELLED"]').click()
      
      // Click cancel button
      cy.get('[data-cy="cancel-status-btn"]').click()
      
      // Assert the dialog closes
      cy.get('[data-cy="status-update-dialog"]').should('not.exist')
      
      // Assert the status remains unchanged
      cy.get('@originalStatus').then((originalStatus) => {
        cy.get('[data-cy="order-status-badge"]').should('contain', originalStatus)
      })
    })
  })
}) 