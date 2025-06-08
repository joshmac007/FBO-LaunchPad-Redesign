describe('Simple Authentication Test', () => {
  it('should perform basic login flow', () => {
    // Visit login page
    cy.visit('/login')
    
    // Wait for page to load and check if login form exists
    cy.get('body').should('contain', 'Login')
    
    // Check what login form elements are actually available
    cy.get('input[type="email"], input[name="email"], [data-cy="email"], [data-testid="email-input"]')
      .first()
      .should('be.visible')
      .type('csr@fbolaunchpad.com')
    
    cy.get('input[type="password"], input[name="password"], [data-cy="password"], [data-testid="password-input"]')
      .first()
      .should('be.visible')
      .type('CSR123!')
    
    // Find and click submit button
    cy.get('button[type="submit"], [data-cy="login-submit"], [data-testid="login-button"]')
      .first()
      .should('be.visible')
      .click()
    
    // Wait for redirect or error
    cy.url({ timeout: 10000 }).then((url) => {
      cy.log('Current URL after login attempt:', url)
      
      // Check if we successfully redirected away from login
      if (url.includes('/csr/dashboard') || url.includes('/dashboard')) {
        cy.log('Login successful - redirected to dashboard')
      } else if (url.includes('/login')) {
        cy.log('Still on login page - checking for error messages')
        cy.get('body').then(($body) => {
          cy.log('Page content:', $body.text())
        })
      } else {
        cy.log('Redirected to unexpected page:', url)
      }
    })
  })
  
  it('should test using custom login command', () => {
    // Test the custom login command with more debug info
    cy.loginAs('csr')
    
    // Log the current URL for debugging
    cy.url().then((url) => {
      cy.log('Current URL after login:', url)
    })
    
    // Check for any error messages on the page
    cy.get('body').then(($body) => {
      if ($body.text().includes('error') || $body.text().includes('Error')) {
        cy.log('Error found on page:', $body.text())
      }
    })
    
    // Verify we're logged in by checking URL and localStorage
    cy.url().should('not.include', '/login')
    cy.window().its('localStorage').invoke('getItem', 'fboUser').should('exist')
  })
}) 