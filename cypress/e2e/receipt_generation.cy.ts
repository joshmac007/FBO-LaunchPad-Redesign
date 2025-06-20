/// <reference types="cypress" />

describe('Receipt Generation', () => {
  let testFuelOrder: any

  beforeEach(() => {
    // Login as CSR user
    cy.loginAs('csr')
    
    // Wait for redirect to dashboard
    cy.url().should('include', '/csr/dashboard')
    cy.contains('CSR Dashboard').should('be.visible')
    
    // Create a test fuel order in 'Completed' status for each test
    cy.createTestFuelOrder('Completed').then((fuelOrder: any) => {
      testFuelOrder = fuelOrder
    })
  })

  it('should complete the full receipt generation workflow', () => {
    // 1. Navigate to the "Completed" FuelOrder's detail page
    cy.visit(`/csr/fuel-orders/${testFuelOrder.id}`)
    
    // 2. Find and click the "Create Receipt" button
    cy.get('[data-cy="create-receipt-btn"]').should('be.visible').click()
    
    // 3. Assert that the URL changes to the new receipt workspace
    cy.url().should('match', /\/csr\/receipts\/\d+/)
    
    // 4. Verify that pre-filled data (Tail Number, Fuel Type) is visible
    cy.get('[data-cy="receipt-tail-number"]').should('have.value', 'N123AB')
    cy.get('[data-cy="receipt-fuel-type"]').should('have.value', 'Jet A')
    
    // 5. Interact with the CustomerSelector to assign a real customer to the receipt
    cy.get('[data-cy="customer-selector"]').click()
    cy.get('[data-cy="customer-search"]').type('Test Customer')
    cy.get('[data-cy="customer-option"]').first().click()
    
    // 6. Find the "Additional Services" section, select "GPU Service" from a dropdown, and add it
    cy.get('[data-cy="additional-services-dropdown"]').select('GPU Service')
    cy.get('[data-cy="add-service-btn"]').click()
    
    // 7. Click the "Calculate Fees" button
    cy.get('[data-cy="calculate-fees-btn"]').should('be.visible').click()
    
    // 8. Assert that a loading indicator appears
    cy.get('[data-cy="calculating-fees-spinner"]').should('be.visible')
    
    // 9. After the API response, assert that the itemized list contains expected rows
    cy.get('[data-cy="calculating-fees-spinner"]').should('not.exist')
    cy.get('[data-cy="line-item-fuel"]').should('be.visible')
    cy.get('[data-cy="line-item-ramp-fee"]').should('be.visible')
    cy.get('[data-cy="line-item-gpu-service"]').should('be.visible')
    
    // 10. Assert that the "Grand Total" has been updated to a non-zero value
    cy.get('[data-cy="grand-total"]').should('not.contain', '$0.00')
    
    // 11. Click the "Generate Receipt" button
    cy.get('[data-cy="generate-receipt-btn"]').should('be.enabled').click()
    
    // 12. Assert that the receipt status changes to 'GENERATED' on the UI and that the form becomes read-only
    cy.get('[data-cy="receipt-status"]').should('contain', 'GENERATED')
    cy.get('[data-cy="customer-selector"]').should('be.disabled')
    
    // 13. Assert that the "Mark as Paid" button is now visible and enabled
    cy.get('[data-cy="mark-as-paid-btn"]').should('be.visible').and('be.enabled')
  })
  
  it('should handle errors gracefully during fee calculation', () => {
    // Setup for error scenario
    cy.intercept('POST', '**/api/receipts/*/calculate-fees', {
      statusCode: 500,
      body: { error: 'Fee calculation failed' }
    }).as('calculateFeesError')
    
    cy.visit(`/csr/fuel-orders/${testFuelOrder.id}`)
    cy.get('[data-cy="create-receipt-btn"]').click()
    
    // Try to calculate fees
    cy.get('[data-cy="calculate-fees-btn"]').click()
    cy.wait('@calculateFeesError')
    
    // Assert error message is displayed
    cy.get('[data-cy="error-message"]').should('be.visible').and('contain', 'Fee calculation failed')
  })
  
  it('should auto-save draft changes', () => {
    cy.visit(`/csr/fuel-orders/${testFuelOrder.id}`)
    cy.get('[data-cy="create-receipt-btn"]').click()
    
    // Make a change to notes field
    cy.get('[data-cy="receipt-notes"]').type('Test notes for auto-save')
    cy.get('[data-cy="receipt-notes"]').blur()
    
    // Verify auto-save occurred (could check for a save indicator or API call)
    cy.get('[data-cy="auto-save-indicator"]').should('be.visible')
  })
}) 