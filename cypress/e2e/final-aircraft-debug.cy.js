describe('Final Aircraft Selection Debug', () => {
  beforeEach(() => {
    // Handle uncaught exceptions
    cy.on('uncaught:exception', (err, runnable) => {
      if (err.message.includes('Hydration failed') || 
          err.message.includes('font') || 
          err.message.includes('stylesheet')) {
        return false
      }
      return true
    })

    // Set up authentication BEFORE visiting the page
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
  })

  it('should reproduce the aircraft selection validation bug', () => {
    // Mock aircraft lookup
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

    // Visit the page
    cy.visit('/csr/fuel-orders/new')
    
    // Wait for the page to load and APIs to be called
    cy.wait('@getLSTs')
    cy.wait('@getFuelTrucks')
    
    // Wait for form to be visible
    cy.get('form', { timeout: 10000 }).should('be.visible')
    cy.contains('Create New Fuel Order').should('be.visible')
    
    // Step 1: Look up aircraft
    cy.get('input[placeholder*="Enter tail number"]').type('N12345')
    cy.get('button').contains('Lookup').click()
    
    // Wait for aircraft lookup to complete
    cy.wait('@aircraftFound')
    
    // Step 2: Verify aircraft selection appears
    cy.contains('Aircraft Selected', { timeout: 5000 }).should('be.visible')
    
    // Step 3: Fill in quantity
    cy.get('input[name="quantity"]').type('500')
    
    // Step 4: Capture console logs and submit form
    cy.window().then((win) => {
      const logs = []
      const originalError = win.console.error
      
      win.console.error = (...args) => {
        logs.push(args)
        originalError.apply(win.console, args)
      }
      
      win.testLogs = logs
    })
    
    // Step 5: Submit form
    cy.get('button').contains('Create Fuel Order').click()
    
    // Step 6: Check for validation error
    cy.wait(3000)
    
    // Check if error appears in UI
    cy.get('body').then(($body) => {
      if ($body.find(':contains("Please select an aircraft")').length > 0) {
        cy.log('BUG CONFIRMED: Aircraft selection validation failed')
        cy.screenshot('aircraft-validation-bug')
        
        // Check console logs
        cy.window().then((win) => {
          const logs = win.testLogs || []
          console.log('Console error logs:', logs)
          
          const validationLogs = logs.filter(logArgs => 
            logArgs.some(arg => typeof arg === 'string' && arg.includes('VALIDATION FAILED'))
          )
          
          if (validationLogs.length > 0) {
            console.log('Found validation failure logs:', validationLogs)
          }
        })
      } else {
        cy.log('SUCCESS: No aircraft selection error found')
      }
    })
  })
}) 