describe('Fuel Order Status Update Debug', () => {
  beforeEach(() => {
    // Login as CSR user
    cy.visit('/login')
    cy.get('[data-cy="email"]').should('be.visible').type('csr@fbolaunchpad.com')
    cy.get('[data-cy="password"]').should('be.visible').type('CSR123!')
    cy.get('[data-cy="login-submit"]').should('be.visible').click()
    
    // Wait for redirect with longer timeout
    cy.url({ timeout: 15000 }).should('include', '/csr/dashboard')
    cy.contains('CSR Dashboard', { timeout: 15000 }).should('be.visible')
  })

  it('should be able to access fuel order detail page and see edit button', () => {
    // Navigate to a fuel order detail page with Dispatched status
    cy.visit('/csr/fuel-orders/6')
    
    // Wait for page to load and check for basic elements
    cy.contains('Fuel Order #6', { timeout: 15000 }).should('be.visible')
    
    // Check if the page has loaded completely
    cy.get('[data-cy="order-status-badge"]', { timeout: 10000 }).should('be.visible')
    
    // Wait for permissions to load - check for any button first
    cy.get('button', { timeout: 15000 }).should('exist')
    
    // Now check for the edit status button
    cy.get('[data-cy="edit-status-btn"]', { timeout: 10000 }).should('be.visible')
  })

  it('should show user permissions and check button visibility for completed order', () => {
    cy.visit('/csr/fuel-orders/3')
    
    // Wait for page to load
    cy.contains('Fuel Order #3', { timeout: 15000 }).should('be.visible')
    
    // Check localStorage for user data
    cy.window().then((win) => {
      const userData = win.localStorage.getItem('fboUser')
      cy.log('User data:', userData)
      
      if (userData) {
        const user = JSON.parse(userData)
        cy.log('User permissions:', user.permissions)
      }
    })
    
    // Wait a bit more for permissions to load
    cy.wait(3000)
    
    // Check if any buttons are visible
    cy.get('button').then(($buttons) => {
      cy.log(`Found ${$buttons.length} buttons on the page`)
      $buttons.each((index, button) => {
        cy.log(`Button ${index}: ${button.textContent}`)
      })
    })
    
    // Check specifically for buttons with data-cy attributes
    cy.get('[data-cy]').then(($elements) => {
      cy.log(`Found ${$elements.length} elements with data-cy attributes`)
      $elements.each((index, element) => {
        const dataCy = element.getAttribute('data-cy')
        cy.log(`Element ${index}: data-cy="${dataCy}", tag="${element.tagName}", text="${element.textContent}"`)
      })
    })
    
    // Try to find the edit status button
    cy.get('[data-cy="edit-status-btn"]', { timeout: 5000 }).should('be.visible')
  })
}) 