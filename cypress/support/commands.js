// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// Custom Cypress commands for authentication and user management

/**
 * Login as a specific user type
 * @param {string} userType - 'admin', 'csr', 'fueler', or 'member'
 */
Cypress.Commands.add('loginAs', (userType) => {
  const credentials = {
    admin: {
      email: 'admin@fbolaunchpad.com',
      password: 'Admin123!'
    },
    csr: {
      email: 'csr@fbolaunchpad.com',
      password: 'CSR123!'
    },
    fueler: {
      email: 'fueler@fbolaunchpad.com', 
      password: 'Fueler123!'
    },
    member: {
      email: 'member@fbolaunchpad.com',
      password: 'Member123!'
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
 * Logout current user
 */
Cypress.Commands.add('logout', () => {
  cy.window().then((win) => {
    win.localStorage.removeItem('fboUser')
  })
  cy.visit('/login')
})

/**
 * Wait for permissions to load
 */
Cypress.Commands.add('waitForPermissions', () => {
  // Wait for permissions to be loaded - this might vary based on implementation
  cy.wait(2000) // Simple wait, could be improved with better detection
})

/**
 * Check if page access works correctly
 * @param {string} path - URL path to check
 * @param {boolean} shouldHaveAccess - Whether user should have access
 */
Cypress.Commands.add('checkPageAccess', (path, shouldHaveAccess) => {
  cy.visit(path)
  
  if (shouldHaveAccess) {
    // Should not be redirected to login or access denied
    cy.url({ timeout: 10000 }).should('not.include', '/login')
    cy.get('body').should('not.contain', 'Access denied')
    cy.get('body').should('not.contain', 'Unauthorized')
  } else {
    // Should be redirected to login or show access denied
    cy.url({ timeout: 10000 }).then((url) => {
      expect(url).to.satisfy((url) => {
        return url.includes('/login') || 
               url.includes('/unauthorized') ||
               url.includes('/access-denied')
      })
    })
  }
})

/**
 * Check if navigation link exists
 * @param {string} linkText - Text of the navigation link
 * @param {boolean} shouldExist - Whether link should exist
 */
Cypress.Commands.add('checkNavLink', (linkText, shouldExist) => {
  if (shouldExist) {
    cy.contains('nav a, nav button', linkText, { timeout: 5000 }).should('be.visible')
  } else {
    cy.get('nav').should('not.contain', linkText)
  }
})

/**
 * Check if button exists
 * @param {string} buttonText - Text of the button
 * @param {boolean} shouldExist - Whether button should exist
 */
Cypress.Commands.add('checkButton', (buttonText, shouldExist) => {
  if (shouldExist) {
    cy.contains('button', buttonText).should('exist')
  } else {
    cy.get('body').should('not.contain', buttonText)
  }
})

/**
 * Get current user data from localStorage
 */
Cypress.Commands.add('getCurrentUser', () => {
  return cy.window().then((win) => {
    const userData = win.localStorage.getItem('fboUser')
    return userData ? JSON.parse(userData) : null
  })
})