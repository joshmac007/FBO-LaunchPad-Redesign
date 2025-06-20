describe('Fuel Order Page Test', () => {
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

  it('should load fuel order page and show order details', () => {
    // Navigate to the fuel order page
    cy.visit('/csr/fuel-orders/2')
    
    // Wait for page to load
    cy.contains('Fuel Order #2', { timeout: 10000 }).should('be.visible')
    
    // Check if order details are visible
    cy.contains('N123AB').should('be.visible') // Tail number
    cy.contains('Jet A').should('be.visible')  // Fuel type
    cy.contains('100').should('be.visible')    // Quantity
    
    // Check order status
    cy.contains('Completed').should('be.visible')
  })
  
  it('should show Create Receipt button for completed order', () => {
    cy.visit('/csr/fuel-orders/2')
    
    // Wait for page to load
    cy.contains('Fuel Order #2', { timeout: 10000 }).should('be.visible')
    
    // Look for the Create Receipt button
    cy.get('[data-cy="create-receipt-btn"]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-cy="create-receipt-btn"]').should('contain', 'Create Receipt')
  })
  
  it('should navigate to receipt workspace when Create Receipt is clicked', () => {
    cy.visit('/csr/fuel-orders/2')
    
    // Wait for page to load
    cy.contains('Fuel Order #2', { timeout: 10000 }).should('be.visible')
    
    // Click Create Receipt button
    cy.get('[data-cy="create-receipt-btn"]', { timeout: 10000 }).should('be.visible').click()
    
    // Should navigate to receipt workspace
    cy.url({ timeout: 10000 }).should('match', /\/csr\/receipts\/\d+/)
  })
}) 