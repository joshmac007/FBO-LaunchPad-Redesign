// Custom Cypress commands for authentication and user management

/**
 * Login as a specific user type
 * @param {string} userType - 'admin', 'csr', 'fueler', or 'member'
 */
Cypress.Commands.add('loginAs', (userType) => {
  const credentials = {
    admin: {
      email: Cypress.env('adminEmail'),
      password: Cypress.env('adminPassword')
    },
    csr: {
      email: Cypress.env('csrEmail'),
      password: Cypress.env('csrPassword')
    },
    fueler: {
      email: Cypress.env('fuelerEmail'),
      password: Cypress.env('fuelerPassword')
    },
    member: {
      email: Cypress.env('memberEmail'),
      password: Cypress.env('memberPassword')
    }
  }

  const user = credentials[userType]
  if (!user) {
    throw new Error(`Unknown user type: ${userType}. Valid types: admin, csr, fueler, member`)
  }

  cy.visit('/login')
  
  // Wait for login form to be visible
  cy.get('input[type="email"]', { timeout: 10000 }).should('be.visible')
  
  // Fill in credentials
  cy.get('input[type="email"]').clear().type(user.email)
  cy.get('input[type="password"]').clear().type(user.password)
  
  // Submit form
  cy.get('button[type="submit"]').click()
  
  // Wait for successful login (redirect away from login page)
  cy.url({ timeout: 15000 }).should('not.include', '/login')
  
  // Verify user data is stored in localStorage
  cy.window().its('localStorage').invoke('getItem', 'fboUser').should('exist')
})

/**
 * Logout the current user
 */
Cypress.Commands.add('logout', () => {
  // Clear localStorage
  cy.window().its('localStorage').invoke('clear')
  
  // Visit login page to ensure we're logged out
  cy.visit('/login')
  cy.url().should('include', '/login')
})

/**
 * Check if user can access a specific page
 * @param {string} path - The path to test
 * @param {boolean} shouldHaveAccess - Whether user should have access
 */
Cypress.Commands.add('checkPageAccess', (path, shouldHaveAccess = true) => {
  cy.visit(path)
  
  if (shouldHaveAccess) {
    // Should not redirect to login page
    cy.url({ timeout: 10000 }).should('not.include', '/login')
    // Should not show access denied messages
    cy.get('body').should('not.contain', 'Access denied')
    cy.get('body').should('not.contain', 'Insufficient permissions')
    cy.get('body').should('not.contain', '403')
  } else {
    // Should either redirect to login or show access denied
    cy.url({ timeout: 10000 }).then((url) => {
      if (url.includes('/login')) {
        // Redirected to login page
        cy.url().should('include', '/login')
      } else {
        // Should show access denied message on the page
        cy.get('body').should('contain.oneOf', [
          'Access denied',
          'Insufficient permissions',
          'You do not have permission',
          '403'
        ])
      }
    })
  }
})

/**
 * Check if a navigation link is visible and clickable
 * @param {string} linkText - Text content of the link
 * @param {boolean} shouldBeVisible - Whether link should be visible
 */
Cypress.Commands.add('checkNavLink', (linkText, shouldBeVisible = true) => {
  if (shouldBeVisible) {
    cy.contains('a', linkText, { timeout: 5000 }).should('be.visible')
  } else {
    cy.get('body').should('not.contain', linkText)
  }
})

/**
 * Check if a button is visible and enabled
 * @param {string} buttonText - Text content of the button
 * @param {boolean} shouldBeVisible - Whether button should be visible
 */
Cypress.Commands.add('checkButton', (buttonText, shouldBeVisible = true) => {
  if (shouldBeVisible) {
    cy.contains('button', buttonText, { timeout: 5000 }).should('be.visible').and('not.be.disabled')
  } else {
    cy.get('body').then(($body) => {
      if ($body.text().includes(buttonText)) {
        cy.contains('button', buttonText).should('be.disabled')
      }
    })
  }
})

/**
 * Wait for permissions to load
 */
Cypress.Commands.add('waitForPermissions', () => {
  // Wait for the permission context to load
  cy.window().its('localStorage').invoke('getItem', 'fboUser').then((userData) => {
    if (userData) {
      const user = JSON.parse(userData)
      // Wait until permissions are loaded
      cy.wrap(user).should('have.property', 'permissions')
    }
  })
  
  // Wait a moment for UI to update based on permissions
  cy.wait(1000)
})

/**
 * Get current user from localStorage
 */
Cypress.Commands.add('getCurrentUser', () => {
  return cy.window().its('localStorage').invoke('getItem', 'fboUser').then((userData) => {
    return userData ? JSON.parse(userData) : null
  })
}) 