describe('Aircraft Selection Focused Debug', () => {
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

    // Mock all required APIs to ensure page loads properly
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

  it('should reproduce the aircraft selection validation error', () => {
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

    // Visit the page
    cy.visit('/csr/fuel-orders/new')
    
    // Wait for page to load completely
    cy.get('form', { timeout: 15000 }).should('be.visible')
    cy.contains('Create New Fuel Order').should('be.visible')
    
    // Step 1: Look up aircraft
    cy.get('input[placeholder*="Enter tail number"]').type('N12345')
    cy.get('button').contains('Lookup').click()
    
    // Wait for aircraft lookup to complete
    cy.wait('@aircraftFound')
    
    // Step 2: Verify aircraft selection UI appears
    cy.contains('Aircraft Selected').should('be.visible')
    cy.contains('Selected').should('be.visible')
    
    // Step 3: Verify debug state shows aircraft is selected
    cy.contains('Selected Aircraft: N12345 (ID: 1)').should('be.visible')
    cy.contains('Form Aircraft ID: 1').should('be.visible')
    
    // Step 4: Fill in required quantity
    cy.get('input[name="quantity"]').type('500')
    
    // Step 5: Verify validation ready state
    cy.contains('Validation Ready: YES').should('be.visible')
    
    // Step 6: Capture console logs before form submission
    cy.window().then((win) => {
      // Add a listener to capture console logs
      const logs = []
      const originalLog = win.console.log
      const originalError = win.console.error
      
      win.console.log = (...args) => {
        logs.push({ type: 'log', args })
        originalLog.apply(win.console, args)
      }
      
      win.console.error = (...args) => {
        logs.push({ type: 'error', args })
        originalError.apply(win.console, args)
      }
      
      // Store logs on window for later access
      win.testLogs = logs
    })
    
    // Step 7: Try to submit the form
    cy.get('button').contains('Create Fuel Order').click()
    
    // Step 8: Check for validation error and capture logs
    cy.wait(2000)
    cy.window().then((win) => {
      const logs = win.testLogs || []
      console.log('Captured console logs:', logs)
      
      // Look for the form submission debug logs
      const formSubmissionLogs = logs.filter(log => 
        log.args.some(arg => typeof arg === 'string' && arg.includes('FORM SUBMISSION DEBUG'))
      )
      
      if (formSubmissionLogs.length > 0) {
        console.log('Form submission debug logs found:', formSubmissionLogs)
      } else {
        console.log('No form submission debug logs found')
      }
      
      // Look for validation failed logs
      const validationFailedLogs = logs.filter(log => 
        log.args.some(arg => typeof arg === 'string' && arg.includes('VALIDATION FAILED'))
      )
      
      if (validationFailedLogs.length > 0) {
        console.log('Validation failed logs found:', validationFailedLogs)
      }
    })
    
    // Step 9: Check if error message appears in UI
    cy.get('body').then(($body) => {
      if ($body.find(':contains("Please select an aircraft")').length > 0) {
        cy.log('BUG CONFIRMED: Aircraft selection validation failed despite UI showing aircraft selected')
        cy.screenshot('aircraft-selection-bug-confirmed')
        
        // Log the current debug state when error occurs
        cy.contains('Debug: Current State').should('be.visible')
        cy.get('[class*="blue-50"]').within(() => {
          cy.get('div').each(($div) => {
            cy.log('Debug state: ' + $div.text())
          })
        })
      } else {
        cy.log('SUCCESS: No aircraft selection error found')
      }
    })
  })

  it('should test if the issue is related to React state timing', () => {
    // Mock aircraft lookup
    cy.intercept('GET', '/api/aircraft/N99999', {
      statusCode: 200,
      body: {
        message: 'Aircraft found successfully',
        aircraft: {
          id: 2,
          tail_number: 'N99999',
          aircraft_type: 'Gulfstream G650',
          fuel_type: 'Jet A',
          status: 'active',
          type: 'Gulfstream G650',
          model: 'G650',
          owner: 'Test Owner 2',
          homeBase: 'KJFK',
          mtow: 45000,
          fuelCapacity: 4000,
          preferredFuelType: 'Jet A',
          lastFaaSyncAt: '2024-01-01T00:00:00Z',
          tailNumber: 'N99999'
        }
      }
    }).as('aircraftFound2')

    cy.visit('/csr/fuel-orders/new')
    
    // Wait for page to load
    cy.get('form', { timeout: 15000 }).should('be.visible')
    
    // Look up aircraft
    cy.get('input[placeholder*="Enter tail number"]').type('N99999')
    cy.get('button').contains('Lookup').click()
    cy.wait('@aircraftFound2')
    
    // Wait for aircraft selection to complete
    cy.contains('Aircraft Selected').should('be.visible')
    
    // Add a longer delay to ensure React state has updated
    cy.wait(1000)
    
    // Fill quantity
    cy.get('input[name="quantity"]').type('750')
    
    // Add another delay before submission
    cy.wait(500)
    
    // Try to submit
    cy.get('button').contains('Create Fuel Order').click()
    
    // Check result
    cy.wait(2000)
    cy.get('body').then(($body) => {
      if ($body.find(':contains("Please select an aircraft")').length > 0) {
        cy.log('BUG PERSISTS: Even with delays, aircraft selection validation failed')
        cy.screenshot('aircraft-selection-timing-issue')
      } else {
        cy.log('SUCCESS: Delays resolved the issue')
      }
    })
  })
}) 