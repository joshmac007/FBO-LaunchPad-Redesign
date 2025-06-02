describe('Manual Debug - Direct Testing', () => {
  it('should test aircraft selection logic directly', () => {
    // Visit a simple page first to set up the environment
    cy.visit('http://localhost:3000')
    
    // Set up authentication in localStorage
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
    
    // Now visit the fuel order page
    cy.visit('http://localhost:3000/csr/fuel-orders/new')
    
    // Wait for any content to appear
    cy.get('body').should('be.visible')
    
    // Log what we see
    cy.get('body').then(($body) => {
      console.log('Page content:', $body.text())
      
      // Check if we're stuck in loading
      if ($body.text().includes('Loading...')) {
        cy.log('Page is stuck in loading state')
        
        // Wait a bit more and check again
        cy.wait(5000)
        cy.get('body').then(($body2) => {
          console.log('After 5 seconds:', $body2.text())
          
          if ($body2.text().includes('Loading...')) {
            cy.log('Still loading - there is a client-side rendering issue')
          }
        })
      }
    })
  })

  it('should test the actual issue by manually triggering the form submission', () => {
    // Mock all required APIs
    cy.intercept('GET', '/api/users/lsts', {
      statusCode: 200,
      body: {
        message: 'LSTs retrieved successfully',
        users: [{ id: 1, name: 'John Doe', email: 'john@example.com' }]
      }
    }).as('getLSTs')

    cy.intercept('GET', '/api/fuel-trucks', {
      statusCode: 200,
      body: {
        message: 'Fuel trucks retrieved successfully',
        fuel_trucks: [{ id: 1, truck_number: 'FT001', capacity: 5000, is_active: true }]
      }
    }).as('getFuelTrucks')

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

    // Set up authentication
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

    // Visit the page
    cy.visit('http://localhost:3000/csr/fuel-orders/new')
    
    // Wait for the page to load or timeout
    cy.get('body', { timeout: 15000 }).should('be.visible')
    
    // Check if we can find any form elements
    cy.get('body').then(($body) => {
      if ($body.find('form').length > 0) {
        cy.log('Form found - page loaded successfully')
        
        // Try the aircraft lookup workflow
        cy.get('input[placeholder*="tail number"]').type('N12345')
        cy.get('button').contains('Lookup').click()
        cy.wait('@aircraftFound')
        
        // Fill quantity
        cy.get('input[name="quantity"]').type('500')
        
        // Try to submit
        cy.get('button').contains('Create Fuel Order').click()
        
        // Check for error
        cy.wait(2000)
        cy.get('body').then(($body) => {
          if ($body.text().includes('Please select an aircraft')) {
            cy.log('FOUND THE BUG: Aircraft selection validation failed')
            cy.screenshot('bug-confirmed')
          } else {
            cy.log('No aircraft selection error found')
          }
        })
      } else {
        cy.log('No form found - page did not load properly')
        cy.screenshot('page-load-failed')
      }
    })
  })
}) 