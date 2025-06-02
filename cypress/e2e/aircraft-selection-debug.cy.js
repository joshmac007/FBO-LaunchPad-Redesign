describe('Aircraft Selection Debug - Comprehensive State Inspection', () => {
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

    // Mock API responses
    cy.intercept('GET', '/api/users/lsts', {
      statusCode: 200,
      body: {
        message: 'LSTs retrieved successfully',
        users: [
          { id: 1, name: 'John Doe', email: 'john@example.com' }
        ]
      }
    }).as('getLSTs')

    cy.intercept('GET', '/api/fuel-trucks', {
      statusCode: 200,
      body: {
        message: 'Fuel trucks retrieved successfully',
        fuel_trucks: [
          { id: 1, truck_number: 'FT001', capacity: 5000, is_active: true }
        ]
      }
    }).as('getFuelTrucks')
  })

  it('should debug aircraft selection state throughout the entire workflow', () => {
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

    cy.visit('/csr/fuel-orders/new')
    
    // Wait for page to load
    cy.contains('Create New Fuel Order').should('be.visible')
    
    // Add debug logging to the window object
    cy.window().then((win) => {
      win.debugAircraftState = () => {
        // Access React component state through the DOM
        const form = win.document.querySelector('form')
        if (form && form._reactInternalFiber) {
          const fiber = form._reactInternalFiber
          let component = fiber
          while (component && !component.stateNode?.selectedAircraft) {
            component = component.return
          }
          if (component && component.stateNode) {
            console.log('React Component State:', {
              selectedAircraft: component.stateNode.selectedAircraft,
              formData: component.stateNode.formData
            })
            return {
              selectedAircraft: component.stateNode.selectedAircraft,
              formData: component.stateNode.formData
            }
          }
        }
        return { error: 'Could not access React state' }
      }
    })
    
    // Step 1: Look up aircraft
    cy.get('input[placeholder*="Enter tail number"]').type('N12345')
    cy.get('button').contains('Lookup').click()
    
    // Wait for aircraft lookup
    cy.wait('@aircraftFound')
    
    // Step 2: Verify aircraft selection UI appears
    cy.contains('Aircraft Selected').should('be.visible')
    cy.contains('Selected').should('be.visible')
    
    // Step 3: Check if fuel capacity info appears (indicates selectedAircraft is set)
    cy.get('input[name="quantity"]').type('500')
    cy.contains('Max capacity: 1000 gallons').should('be.visible')
    
    // Step 4: Add detailed state inspection before form submission
    cy.window().then((win) => {
      // Try to access React DevTools or component state
      const reactRoot = win.document.querySelector('#__next')
      if (reactRoot) {
        // Look for React Fiber
        const fiberKey = Object.keys(reactRoot).find(key => key.startsWith('__reactInternalInstance') || key.startsWith('_reactInternalFiber'))
        if (fiberKey) {
          console.log('Found React Fiber key:', fiberKey)
        }
      }
      
      // Log all form elements and their values
      const formElements = win.document.querySelectorAll('form input, form select, form textarea')
      console.log('Form elements:', Array.from(formElements).map(el => ({
        name: el.name,
        value: el.value,
        type: el.type
      })))
    })
    
    // Step 5: Try to trigger form submission and capture the exact error
    cy.get('button').contains('Create Fuel Order').click()
    
    // Step 6: Check if error appears
    cy.get('body').then(($body) => {
      if ($body.find('[class*="red"]:contains("Please select an aircraft")').length > 0) {
        cy.log('ERROR FOUND: Aircraft selection validation failed')
        
        // Take screenshot for debugging
        cy.screenshot('aircraft-selection-error-state')
        
        // Log current page state
        cy.window().then((win) => {
          console.log('Page state when error occurred:', {
            url: win.location.href,
            localStorage: win.localStorage.getItem('fboUser'),
            formData: win.document.querySelector('form')?.elements
          })
        })
      } else {
        cy.log('SUCCESS: No aircraft selection error found')
      }
    })
  })

  it('should test aircraft creation workflow and state persistence', () => {
    // Mock aircraft not found
    cy.intercept('GET', '/api/aircraft/N99999', {
      statusCode: 404,
      body: { error: 'Aircraft not found' }
    }).as('aircraftNotFound')

    // Mock aircraft creation
    cy.intercept('POST', '/api/aircraft/quick-create', {
      statusCode: 201,
      body: {
        message: 'Aircraft created successfully',
        aircraft: {
          id: 2,
          tail_number: 'N99999',
          aircraft_type: 'Citation CJ3',
          fuel_type: 'Jet A',
          status: 'active',
          type: 'Citation CJ3',
          model: 'CJ3',
          owner: 'New Owner',
          homeBase: 'KORD',
          mtow: 13500,
          fuelCapacity: 1000,
          preferredFuelType: 'Jet A',
          lastFaaSyncAt: '2024-01-01T00:00:00Z',
          tailNumber: 'N99999'
        }
      }
    }).as('createAircraft')

    cy.visit('/csr/fuel-orders/new')
    
    // Wait for page to load
    cy.contains('Create New Fuel Order').should('be.visible')
    
    // Step 1: Look up non-existent aircraft
    cy.get('input[placeholder*="Enter tail number"]').type('N99999')
    cy.get('button').contains('Lookup').click()
    
    // Wait for aircraft not found
    cy.wait('@aircraftNotFound')
    cy.contains('Aircraft Not Found').should('be.visible')
    
    // Step 2: Create new aircraft
    cy.get('button').contains('Create New Aircraft').click()
    
    // Fill in aircraft creation form
    cy.get('input[id="create-tail-number"]').should('have.value', 'N99999')
    
    // Select aircraft type
    cy.get('[role="combobox"]').first().click()
    cy.contains('Citation CJ3').click()
    
    // Select fuel type  
    cy.get('[role="combobox"]').last().click()
    cy.contains('Jet A').click()

    // Submit aircraft creation
    cy.get('button').contains('Create Aircraft').click()

    // Wait for aircraft creation
    cy.wait('@createAircraft')
    
    // Step 3: Verify aircraft is selected after creation
    cy.contains('Aircraft Selected').should('be.visible')
    cy.contains('Selected').should('be.visible')
    
    // Step 4: Fill in quantity and check fuel capacity appears
    cy.get('input[name="quantity"]').type('750')
    cy.contains('Max capacity: 1000 gallons').should('be.visible')
    
    // Step 5: Try form submission
    cy.get('button').contains('Create Fuel Order').click()
    
    // Step 6: Verify no aircraft selection error
    cy.get('body').then(($body) => {
      if ($body.find('[class*="red"]:contains("Please select an aircraft")').length > 0) {
        cy.log('ERROR: Aircraft selection failed after creation')
        cy.screenshot('aircraft-creation-selection-error')
      } else {
        cy.log('SUCCESS: Aircraft creation and selection working')
      }
    })
  })

  it('should inspect React component state directly', () => {
    // Mock successful aircraft lookup
    cy.intercept('GET', '/api/aircraft/N54321', {
      statusCode: 200,
      body: {
        message: 'Aircraft found successfully',
        aircraft: {
          id: 3,
          tail_number: 'N54321',
          aircraft_type: 'Gulfstream G650',
          fuel_type: 'Jet A',
          status: 'active',
          type: 'Gulfstream G650',
          model: 'G650',
          owner: 'Test Owner 3',
          homeBase: 'KJFK',
          mtow: 45000,
          fuelCapacity: 4000,
          preferredFuelType: 'Jet A',
          lastFaaSyncAt: '2024-01-01T00:00:00Z',
          tailNumber: 'N54321'
        }
      }
    }).as('aircraftFound3')

    cy.visit('/csr/fuel-orders/new')
    
    // Wait for page to load
    cy.contains('Create New Fuel Order').should('be.visible')
    
    // Look up aircraft
    cy.get('input[placeholder*="Enter tail number"]').type('N54321')
    cy.get('button').contains('Lookup').click()
    
    // Wait for aircraft lookup
    cy.wait('@aircraftFound3')
    
    // Verify aircraft selection UI
    cy.contains('Aircraft Selected').should('be.visible')
    
    // Add comprehensive state inspection
    cy.window().then((win) => {
      // Method 1: Try to access React DevTools
      if (win.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        console.log('React DevTools available')
        const reactDevTools = win.__REACT_DEVTOOLS_GLOBAL_HOOK__
        if (reactDevTools.renderers && reactDevTools.renderers.size > 0) {
          console.log('React renderers found:', reactDevTools.renderers.size)
        }
      }
      
      // Method 2: Search for React Fiber in DOM elements
      const searchForReactState = (element) => {
        const keys = Object.keys(element)
        const reactKey = keys.find(key => 
          key.startsWith('__reactInternalInstance') || 
          key.startsWith('_reactInternalFiber') ||
          key.startsWith('__reactFiber')
        )
        return reactKey ? element[reactKey] : null
      }
      
      // Check form element
      const form = win.document.querySelector('form')
      if (form) {
        const reactFiber = searchForReactState(form)
        if (reactFiber) {
          console.log('Found React Fiber on form element')
          
          // Walk up the fiber tree to find component with state
          let current = reactFiber
          let attempts = 0
          while (current && attempts < 20) {
            if (current.stateNode && typeof current.stateNode === 'object') {
              console.log('Found state node:', current.stateNode)
              if (current.stateNode.selectedAircraft !== undefined) {
                console.log('Found selectedAircraft state:', current.stateNode.selectedAircraft)
                break
              }
            }
            current = current.return
            attempts++
          }
        }
      }
      
      // Method 3: Check all elements for React properties
      const allElements = win.document.querySelectorAll('*')
      let foundReactState = false
      for (let i = 0; i < Math.min(allElements.length, 50); i++) {
        const element = allElements[i]
        const reactFiber = searchForReactState(element)
        if (reactFiber && reactFiber.stateNode && reactFiber.stateNode.selectedAircraft !== undefined) {
          console.log('Found selectedAircraft in element:', element.tagName, reactFiber.stateNode.selectedAircraft)
          foundReactState = true
          break
        }
      }
      
      if (!foundReactState) {
        console.log('Could not find React state - trying alternative methods')
        
        // Method 4: Check for global React state (if exposed)
        if (win.React) {
          console.log('React is available globally')
        }
        
        // Method 5: Look for Next.js specific patterns
        if (win.__NEXT_DATA__) {
          console.log('Next.js data available:', win.__NEXT_DATA__)
        }
      }
    })
    
    // Fill in quantity
    cy.get('input[name="quantity"]').type('1000')
    
    // Before submitting, add a custom event listener to capture form data
    cy.window().then((win) => {
      const form = win.document.querySelector('form')
      if (form) {
        form.addEventListener('submit', (e) => {
          console.log('Form submit event triggered')
          console.log('Form data at submit:', new FormData(form))
          
          // Try to access component state one more time
          const reactFiber = Object.keys(form).find(key => key.startsWith('__react'))
          if (reactFiber) {
            console.log('React fiber at submit:', form[reactFiber])
          }
        })
      }
    })
    
    // Try to submit
    cy.get('button').contains('Create Fuel Order').click()
    
    // Check result
    cy.wait(1000) // Give time for any async operations
    cy.get('body').then(($body) => {
      if ($body.find('[class*="red"]:contains("Please select an aircraft")').length > 0) {
        cy.log('CRITICAL: Aircraft selection validation failed despite UI showing aircraft selected')
        cy.screenshot('react-state-inspection-error')
      } else {
        cy.log('SUCCESS: Form submission worked correctly')
      }
    })
  })
}) 