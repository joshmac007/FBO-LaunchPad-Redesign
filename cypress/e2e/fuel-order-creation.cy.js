describe('Fuel Order Creation', () => {
  beforeEach(() => {
    // Handle uncaught exceptions to prevent test failures from hydration issues
    cy.on('uncaught:exception', (err, runnable) => {
      // Ignore hydration errors and font loading errors
      if (err.message.includes('Hydration failed') || 
          err.message.includes('font') || 
          err.message.includes('stylesheet')) {
        return false
      }
      // Let other errors fail the test
      return true
    })

    // Mock the authentication
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

    // Mock API responses
    cy.intercept('GET', '/api/users/lsts', {
      statusCode: 200,
      body: {
        message: 'LSTs retrieved successfully',
        users: [
          { id: 1, name: 'John Doe', email: 'john@example.com' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
        ]
      }
    }).as('getLSTs')

    cy.intercept('GET', '/api/fuel-trucks', {
      statusCode: 200,
      body: {
        message: 'Fuel trucks retrieved successfully',
        fuel_trucks: [
          { id: 1, truck_number: 'FT001', capacity: 5000, is_active: true },
          { id: 2, truck_number: 'FT002', capacity: 3000, is_active: true }
        ]
      }
    }).as('getFuelTrucks')

    cy.intercept('GET', '/api/customers', {
      statusCode: 200,
      body: {
        message: 'Customers retrieved successfully',
        customers: [
          { id: 1, name: 'Test Customer', email: 'customer@test.com', phone: '123-456-7890' },
          { id: 2, name: 'Another Customer', email: 'another@test.com', phone: '098-765-4321' }
        ]
      }
    }).as('getCustomers')
  })

  it('should successfully create a fuel order with aircraft lookup', () => {
    // Mock aircraft lookup - not found initially
    cy.intercept('GET', '/api/aircraft/N12345', {
      statusCode: 404,
      body: { error: 'Aircraft not found' }
    }).as('aircraftNotFound')

    // Mock aircraft creation
    cy.intercept('POST', '/api/aircraft/quick-create', {
      statusCode: 201,
      body: {
        message: 'Aircraft created successfully',
        aircraft: {
          id: 1,
          tail_number: 'N12345',
          aircraft_type: 'Citation CJ3',
          fuel_type: 'Jet A',
          status: 'active'
        }
      }
    }).as('createAircraft')

    // Mock fuel order creation
    cy.intercept('POST', '/api/fuel-orders', {
      statusCode: 201,
      body: {
        message: 'Fuel order created successfully',
        fuel_order: {
          id: 1,
          aircraft_id: 1,
          customer_id: 1,
          quantity: 500,
          status: 'pending'
        }
      }
    }).as('createFuelOrder')

    // Visit the fuel order creation page
    cy.visit('/csr/fuel-orders/new')

    // Wait for page to load
    cy.contains('Create New Fuel Order').should('be.visible')

    // Test aircraft lookup
    cy.get('input[placeholder*="Enter tail number"]').type('N12345')
    cy.get('button').contains('Lookup').click()

    // Wait for aircraft not found message
    cy.wait('@aircraftNotFound')
    cy.contains('Aircraft Not Found').should('be.visible')

    // Click create new aircraft
    cy.get('button').contains('Create New Aircraft').click()

    // Fill in aircraft creation form
    cy.get('input[id="create-tail-number"]').should('have.value', 'N12345')
    
    // Select aircraft type
    cy.get('[role="combobox"]').first().click()
    cy.contains('Citation CJ3').click()
    
    // Select fuel type  
    cy.get('[role="combobox"]').last().click()
    cy.contains('Jet A').click()

    // Submit aircraft creation
    cy.get('button').contains('Create Aircraft').click()

    // Wait for aircraft creation and verify selection
    cy.wait('@createAircraft')
    cy.contains('Aircraft Selected').should('be.visible')
    cy.contains('Debug - Selected Aircraft').should('be.visible')

    // Test customer selection
    cy.get('button[role="combobox"]').contains('Search customers').click()
    cy.wait('@getCustomers')
    cy.contains('Test Customer').click()

    // Fill in fuel order details
    cy.get('input[name="quantity"]').type('500')
    cy.get('select').contains('Normal').click()
    cy.get('input[name="location_on_ramp"]').type('Hangar 5')
    cy.get('textarea[name="csr_notes"]').type('Test fuel order')

    // Submit the fuel order
    cy.get('button').contains('Create Fuel Order').click()

    // Verify fuel order creation
    cy.wait('@createFuelOrder')
    cy.url().should('include', '/csr/fuel-orders/1')
  })

  it('should handle existing aircraft lookup', () => {
    // Mock successful aircraft lookup
    cy.intercept('GET', '/api/aircraft/N67890', {
      statusCode: 200,
      body: {
        message: 'Aircraft found successfully',
        aircraft: {
          id: 2,
          tail_number: 'N67890',
          aircraft_type: 'Gulfstream G650',
          fuel_type: 'Jet A',
          status: 'active'
        }
      }
    }).as('aircraftFound')

    // Mock fuel order creation
    cy.intercept('POST', '/api/fuel-orders', {
      statusCode: 201,
      body: {
        message: 'Fuel order created successfully',
        fuel_order: {
          id: 2,
          aircraft_id: 2,
          quantity: 1000,
          status: 'pending'
        }
      }
    }).as('createFuelOrder')

    cy.visit('/csr/fuel-orders/new')

    // Test aircraft lookup with existing aircraft
    cy.get('input[placeholder*="Enter tail number"]').type('N67890')
    cy.get('button').contains('Lookup').click()

    // Wait for aircraft found and verify selection
    cy.wait('@aircraftFound')
    cy.contains('Aircraft Selected').should('be.visible')
    cy.contains('Debug - Selected Aircraft: N67890').should('be.visible')

    // Fill in required fields
    cy.get('input[name="quantity"]').type('1000')

    // Submit without customer (should work since customer is optional)
    cy.get('button').contains('Create Fuel Order').click()

    // Verify fuel order creation
    cy.wait('@createFuelOrder')
    cy.url().should('include', '/csr/fuel-orders/2')
  })

  it('should show validation error when no aircraft is selected', () => {
    cy.visit('/csr/fuel-orders/new')

    // Try to submit without selecting aircraft
    cy.get('input[name="quantity"]').type('500')
    cy.get('button').contains('Create Fuel Order').click()

    // Should show validation error
    cy.contains('Please select an aircraft').should('be.visible')
  })

  it('should handle API errors gracefully', () => {
    // Mock aircraft lookup error
    cy.intercept('GET', '/api/aircraft/ERROR', {
      statusCode: 500,
      body: { error: 'Internal server error' }
    }).as('aircraftError')

    cy.visit('/csr/fuel-orders/new')

    // Test aircraft lookup with error
    cy.get('input[placeholder*="Enter tail number"]').type('ERROR')
    cy.get('button').contains('Lookup').click()

    // Wait for error and verify error message
    cy.wait('@aircraftError')
    cy.contains('Failed to find aircraft').should('be.visible')
  })
}) 