// Import commands.js using ES2015 syntax:
import './commands'
import './auth-commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Set up global error handling for uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  // for common React development warnings/errors
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false
  }
  if (err.message.includes('Non-serializable values were found')) {
    return false  
  }
  if (err.message.includes('Authentication required')) {
    return false // Don't fail tests for auth errors we're specifically testing
  }
  return false
})

// Set up command defaults
beforeEach(() => {
  // Clear any existing auth tokens before each test
  cy.clearLocalStorage()
  cy.clearCookies()
}) 