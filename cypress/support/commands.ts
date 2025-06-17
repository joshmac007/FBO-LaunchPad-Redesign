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
 * Login as a specific user type using API call directly (more reliable than form)
 * @param {string} userType - 'admin', 'csr', 'fueler', or 'member'
 */
Cypress.Commands.add('loginAs', (userType: 'admin' | 'csr' | 'fueler' | 'member') => {
  const credentials: Record<string, { email: string; password: string }> = {
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

  // Login via API call (more reliable than form interaction)
  cy.request({
    method: 'POST',
    url: 'http://localhost:5001/api/auth/login',
    body: {
      email: user.email,
      password: user.password
    }
  }).then((response) => {
    // Store user data in localStorage in the same format as the frontend
    const enhancedUser = {
      ...response.body.user,
      access_token: response.body.token,
      isLoggedIn: true,
      permissions: [], // Will be loaded separately  
      effective_permissions: {},
      permission_summary: {
        total_permissions: 0,
        by_source: { direct: [], groups: [], roles: [] },
        by_category: {},
        resource_specific: []
      }
    }
    
    cy.window().then((win) => {
      win.localStorage.setItem('fboUser', JSON.stringify(enhancedUser))
    })
  })
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
    cy.url({ timeout: 10000 }).then((url: string) => {
      expect(url).to.satisfy((url: string) => {
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

/**
 * Create a test fuel order via API
 * @param {string} status - Desired status of the fuel order (default: 'Completed')
 */
Cypress.Commands.add('createTestFuelOrder', (status = 'Completed') => {
  // Get the auth token from localStorage
  return cy.window().then((win) => {
    const userData = win.localStorage.getItem('fboUser')
    if (!userData) {
      throw new Error('No user data found. Make sure to login first.')
    }
    
    const user = JSON.parse(userData)
    const token = user.token || user.access_token
    
    if (!token) {
      throw new Error('No auth token found in user data.')
    }

    return cy.request({
      method: 'POST',
      url: 'http://localhost:5001/api/fuel-orders',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: {
        tail_number: 'N123AB',
        fuel_type: 'Jet A',
        requested_amount: 100.0,
        assigned_lst_user_id: 1,
        assigned_truck_id: 1,
        location_on_ramp: 'A1',
        csr_notes: 'Test fuel order for E2E testing'
      }
    }).then((response) => {
      const fuelOrder = response.body.fuel_order
      
      // If we need to update the status to 'Completed', make another request
      if (status === 'Completed' && fuelOrder.status !== 'Completed') {
        return cy.request({
          method: 'PUT',
          url: `http://localhost:5001/api/fuel-orders/${fuelOrder.id}/submit-data`,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: {
            fuel_delivered: 95.0,
            start_meter_reading: 1000.0,
            end_meter_reading: 1095.0,
            lst_notes: 'Test completion'
          }
        }).then(() => {
          return { ...fuelOrder, status: 'Completed' }
        })
      }
      
      return fuelOrder
    })
  })
})

/**
 * Create a test receipt from a fuel order via API
 * @param {number} fuelOrderId - ID of the fuel order to create receipt from
 */
Cypress.Commands.add('createTestReceipt', (fuelOrderId) => {
  return cy.window().then((win) => {
    const userData = win.localStorage.getItem('fboUser')
    if (!userData) {
      throw new Error('No user data found. Make sure to login first.')
    }
    
    const user = JSON.parse(userData)
    const token = user.token || user.access_token
    
    if (!token) {
      throw new Error('No auth token found in user data.')
    }

    return cy.request({
      method: 'POST',
      url: 'http://localhost:5001/api/fbo/1/receipts/draft',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: {
        fuel_order_id: fuelOrderId
      }
    }).then((response) => {
      return response.body.receipt
    })
  })
})

/**
 * Get the current auth token from localStorage
 */
Cypress.Commands.add('getAuthToken', () => {
  return cy.window().then((win) => {
    const userData = win.localStorage.getItem('fboUser')
    if (!userData) {
      return null
    }
    
    const user = JSON.parse(userData)
    return user.token || user.access_token || null
  })
})

/**
 * Create fee category via API
 * @param {string} name - Name of the fee category
 * @param {number} fboId - FBO location ID (defaults to 1)
 */
Cypress.Commands.add('createFeeCategory', (name, fboId = 1) => {
  return cy.getAuthToken().then((token) => {
    if (!token) {
      throw new Error('No auth token found. Make sure to login first.')
    }

    return cy.request({
      method: 'POST',
      url: `http://localhost:5001/api/admin/fbo/${fboId}/fee-categories`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: { name }
    }).then((response) => {
      return response.body
    })
  })
})

/**
 * Create fee rule via API
 * @param {object} feeRuleData - Fee rule configuration
 */
Cypress.Commands.add('createFeeRule', (feeRuleData) => {
  const fboId = feeRuleData.fbo_location_id || 1
  
  return cy.getAuthToken().then((token) => {
    if (!token) {
      throw new Error('No auth token found. Make sure to login first.')
    }

    return cy.request({
      method: 'POST',
      url: `http://localhost:5001/api/admin/fbo/${fboId}/fee-rules`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: feeRuleData
    }).then((response) => {
      return response.body
    })
  })
})

/**
 * Update aircraft type waiver minimum via API
 * @param {number} aircraftTypeId - Aircraft type ID
 * @param {number} waivMinGallons - Minimum gallons for waiver
 * @param {number} fboId - FBO location ID (defaults to 1)
 */
Cypress.Commands.add('updateAircraftWaiverMinimum', (aircraftTypeId, waivMinGallons, fboId = 1) => {
  return cy.getAuthToken().then((token) => {
    if (!token) {
      throw new Error('No auth token found. Make sure to login first.')
    }

    return cy.request({
      method: 'PUT',
      url: `http://localhost:5001/api/admin/fbo/${fboId}/aircraft-types/${aircraftTypeId}/fuel-waiver`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: {
        base_min_fuel_gallons_for_waiver: waivMinGallons.toString()
      }
    }).then((response) => {
      return response.body
    })
  })
})

/**
 * Create aircraft type to fee category mapping via API
 * @param {number} aircraftTypeId - Aircraft type ID
 * @param {number} feeCategoryId - Fee category ID
 * @param {number} fboId - FBO location ID (defaults to 1)
 */
Cypress.Commands.add('createAircraftMapping', (aircraftTypeId, feeCategoryId, fboId = 1) => {
  return cy.getAuthToken().then((token) => {
    if (!token) {
      throw new Error('No auth token found. Make sure to login first.')
    }

    return cy.request({
      method: 'POST',
      url: `http://localhost:5001/api/admin/fbo/${fboId}/aircraft-mappings`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: {
        aircraft_type_id: aircraftTypeId,
        fee_category_id: feeCategoryId
      }
    }).then((response) => {
      return response.body
    })
  })
})

/**
 * Get aircraft types via API
 * @param {number} fboId - FBO location ID (defaults to 1)
 */
Cypress.Commands.add('getAircraftTypes', (fboId = 1) => {
  return cy.getAuthToken().then((token) => {
    if (!token) {
      throw new Error('No auth token found. Make sure to login first.')
    }

    return cy.request({
      method: 'GET',
      url: `http://localhost:5001/api/admin/fbo/${fboId}/aircraft-types`,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).then((response) => {
      return response.body
    })
  })
})

/**
 * Create a test fuel order with specific characteristics
 * @param {object} fuelOrderData - Fuel order configuration
 */
Cypress.Commands.add('createSpecificFuelOrder', (fuelOrderData) => {
  return cy.getAuthToken().then((token) => {
    if (!token) {
      throw new Error('No auth token found. Make sure to login first.')
    }

    // First create the fuel order
    return cy.request({
      method: 'POST',
      url: 'http://localhost:5001/api/fuel-orders',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: {
        tail_number: fuelOrderData.tail_number || 'N123TEST',
        fuel_type: fuelOrderData.fuel_type || 'Jet A',
        requested_amount: fuelOrderData.requested_amount || 200.0,
        assigned_lst_user_id: fuelOrderData.assigned_lst_user_id || 1,
        assigned_truck_id: fuelOrderData.assigned_truck_id || 1,
        location_on_ramp: fuelOrderData.location_on_ramp || 'A1',
        csr_notes: fuelOrderData.csr_notes || 'E2E test fuel order',
        aircraft_type: fuelOrderData.aircraft_type || 'Citation CJ3'
      }
    }).then((response) => {
      const fuelOrder = response.body.fuel_order
      
      // If we need to complete the order, submit data
      if (fuelOrderData.status === 'Completed') {
        return cy.request({
          method: 'PUT',
          url: `http://localhost:5001/api/fuel-orders/${fuelOrder.id}/submit-data`,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: {
            fuel_delivered: fuelOrderData.fuel_delivered || fuelOrderData.requested_amount || 200.0,
            start_meter_reading: 1000.0,
            end_meter_reading: 1000.0 + (fuelOrderData.fuel_delivered || fuelOrderData.requested_amount || 200.0),
            lst_notes: 'E2E test completion'
          }
        }).then(() => {
          return { ...fuelOrder, status: 'Completed', fuel_delivered: fuelOrderData.fuel_delivered || fuelOrderData.requested_amount || 200.0 }
        })
      }
      
      return fuelOrder
    })
  })
})

/**
 * Toggle waiver on a receipt line item via API
 * @param {number} receiptId - Receipt ID
 * @param {number} lineItemId - Line item ID
 * @param {number} fboId - FBO location ID (defaults to 1)
 */
Cypress.Commands.add('toggleLineItemWaiver', (receiptId, lineItemId, fboId = 1) => {
  return cy.getAuthToken().then((token) => {
    if (!token) {
      throw new Error('No auth token found. Make sure to login first.')
    }

    return cy.request({
      method: 'POST',
      url: `http://localhost:5001/api/fbo/${fboId}/receipts/${receiptId}/line-items/${lineItemId}/toggle-waiver`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }).then((response) => {
      return response.body
    })
  })
})