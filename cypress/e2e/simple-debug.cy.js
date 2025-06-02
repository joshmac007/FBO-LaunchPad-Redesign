describe('Simple Debug Test', () => {
  beforeEach(() => {
    // Handle uncaught exceptions
    cy.on('uncaught:exception', (err, runnable) => {
      console.log('Uncaught exception:', err.message)
      if (err.message.includes('Hydration failed') || 
          err.message.includes('font') || 
          err.message.includes('stylesheet')) {
        return false
      }
      return true
    })

    // Mock authentication
    cy.window().then((win) => {
      win.localStorage.setItem('fboUser', JSON.stringify({
        id: 1,
        email: 'csr@fbolaunchpad.com',
        name: 'CSR User',
        roles: ['Customer Service Representative'],
        access_token: 'mock-jwt-token',
        isLoggedIn: true
      }))
    })
  })

  it('should load the fuel order creation page', () => {
    cy.visit('http://localhost:3000/csr/fuel-orders/new')
    
    // Wait longer and be more specific
    cy.get('body', { timeout: 10000 }).should('be.visible')
    
    // Check what's actually on the page
    cy.get('body').then(($body) => {
      console.log('Page body content:', $body.text())
      console.log('Page HTML:', $body.html())
    })
    
    // Try to find any text that might indicate the page loaded
    cy.contains('Fuel Order', { timeout: 10000 }).should('be.visible')
  })

  it('should show debug state when aircraft is selected', () => {
    // Mock successful aircraft lookup
    cy.intercept('GET', '/api/aircraft/N12345', {
      statusCode: 200,
      body: {
        message: 'Aircraft found successfully',
        aircraft: {
          id: 1,
          tail_number: 'N12345',
          aircraft_type: 'Citation CJ3',
          fuel_type: 'Jet A',
          status: 'active',
          type: 'Citation CJ3',
          model: 'CJ3',
          owner: 'Test Owner',
          homeBase: 'KORD',
          mtow: 13500,
          fuelCapacity: 1000,
          preferredFuelType: 'Jet A',
          lastFaaSyncAt: '2024-01-01T00:00:00Z',
          tailNumber: 'N12345'
        }
      }
    }).as('aircraftFound')

    cy.visit('http://localhost:3000/csr/fuel-orders/new')
    
    // Wait for page to load
    cy.contains('Fuel Order', { timeout: 10000 }).should('be.visible')
    
    // Look for debug state display
    cy.contains('Debug: Current State').should('be.visible')
    cy.contains('Selected Aircraft: None').should('be.visible')
    
    // Look up aircraft
    cy.get('input[placeholder*="tail number"]').type('N12345')
    cy.get('button').contains('Lookup').click()
    
    // Wait for aircraft lookup
    cy.wait('@aircraftFound')
    
    // Check debug state after aircraft selection
    cy.contains('Selected Aircraft: N12345 (ID: 1)').should('be.visible')
    cy.contains('Form Aircraft ID: 1').should('be.visible')
    
    // Fill in quantity
    cy.get('input[name="quantity"]').type('500')
    
    // Check validation ready state
    cy.contains('Validation Ready: YES').should('be.visible')
    
    // Try to submit and see what happens
    cy.get('button').contains('Create Fuel Order').click()
    
    // Check if error appears
    cy.wait(2000)
    cy.get('body').then(($body) => {
      if ($body.find(':contains("Please select an aircraft")').length > 0) {
        cy.log('ERROR: Aircraft selection validation failed despite debug showing aircraft selected')
        cy.screenshot('debug-state-mismatch')
      } else {
        cy.log('SUCCESS: No aircraft selection error')
      }
    })
  })
}) 