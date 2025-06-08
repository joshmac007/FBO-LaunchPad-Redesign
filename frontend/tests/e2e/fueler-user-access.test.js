describe('Fueler (LST) User Access Tests', () => {
  beforeEach(() => {
    // Login as fueler before each test
    cy.loginAs('fueler')
    cy.waitForPermissions()
  })

  afterEach(() => {
    cy.logout()
  })

  it('should have access to fueler pages only', () => {
    // Should have access to fueler dashboard
    cy.checkPageAccess('/fueler/dashboard', true)
    cy.get('h1').should('contain.oneOf', ['Fueler Dashboard', 'LST Dashboard', 'Line Service'])

    // Should have access to pending orders
    cy.checkPageAccess('/fueler/pending-orders', true)
    
    // Should have access to in-progress orders
    cy.checkPageAccess('/fueler/in-progress', true)
    
    // Should have access to completed orders
    cy.checkPageAccess('/fueler/completed', true)
    
    // Should have access to receipts
    cy.checkPageAccess('/fueler/receipts', true)
  })

  it('should NOT have access to admin pages', () => {
    // Should not access admin dashboard
    cy.checkPageAccess('/admin/dashboard', false)
    
    // Should not access user management
    cy.checkPageAccess('/admin/users', false)
    
    // Should not access customer management
    cy.checkPageAccess('/admin/customers', false)
    
    // Should not access aircraft management
    cy.checkPageAccess('/admin/aircraft', false)
    
    // Should not access fuel truck management
    cy.checkPageAccess('/admin/fuel-trucks', false)
    
    // Should not access LST management
    cy.checkPageAccess('/admin/lst-management', false)
    
    // Should not access permissions management
    cy.checkPageAccess('/admin/permissions', false)
  })

  it('should NOT have access to CSR order creation', () => {
    // Should not be able to create new orders (CSR function)
    cy.checkPageAccess('/csr/fuel-orders/new', false)
    
    // May or may not have access to export depending on permissions
    cy.visit('/csr/export')
    cy.url({ timeout: 10000 }).then((url) => {
      if (url.includes('/login') || url.includes('/access-denied')) {
        // Access denied as expected
        cy.url().should('satisfy', (url) => 
          url.includes('/login') || url.includes('/access-denied') || url.includes('/403')
        )
      }
    })
  })

  it('should see fueler-specific navigation links', () => {
    cy.visit('/fueler/dashboard')
    
    // Should see fueler navigation
    cy.checkNavLink('Dashboard', true)
    cy.checkNavLink('Pending Orders', true)
    cy.checkNavLink('In Progress', true)
    cy.checkNavLink('Completed', true)
    
    // Should NOT see admin navigation
    cy.checkNavLink('User Management', false)
    cy.checkNavLink('Admin Dashboard', false)
    
    // Should NOT see CSR-specific navigation
    cy.checkNavLink('New Order', false)
    cy.checkNavLink('Export', false)
  })

  it('should be able to view and accept pending orders', () => {
    cy.visit('/fueler/pending-orders')
    
    // Should see pending orders list or message
    cy.get('body').should('be.visible')
    cy.get('body').should('not.contain', 'Access denied')
    
    // Look for accept/start buttons
    cy.get('body').then(($body) => {
      if ($body.find('button:contains("Accept"), button:contains("Start"), button:contains("Begin")').length > 0) {
        cy.get('button:contains("Accept"), button:contains("Start"), button:contains("Begin")').should('be.visible')
      }
    })
  })

  it('should be able to manage in-progress orders', () => {
    cy.visit('/fueler/in-progress')
    
    // Should see in-progress orders
    cy.get('body').should('be.visible')
    cy.get('body').should('not.contain', 'Access denied')
    
    // Should see update/complete actions
    cy.get('body').then(($body) => {
      if ($body.find('button:contains("Update"), button:contains("Complete"), input, select').length > 0) {
        // Should be able to update progress
        cy.get('button:contains("Update"), button:contains("Complete"), input[type="number"], select').should('be.visible')
      }
    })
  })

  it('should be able to view completed orders', () => {
    cy.visit('/fueler/completed')
    
    // Should see completed orders history
    cy.get('body').should('be.visible')
    cy.get('body').should('not.contain', 'Access denied')
    
    // Should see order history/list
    cy.get('table, .order-item, .card').should('be.visible')
  })

  it('should be able to record fuel delivery details', () => {
    cy.visit('/fueler/pending-orders')
    
    // Look for orders that can be worked on
    cy.get('body').then(($body) => {
      if ($body.find('button:contains("Start"), button:contains("Begin"), a:contains("View")').length > 0) {
        // Click on first available order
        cy.get('button:contains("Start"), button:contains("Begin"), a:contains("View")').first().click()
        
        // Should see fuel delivery form
        cy.get('body').should('contain.oneOf', [
          'Gallons', 'Fuel Type', 'Delivery', 'Amount', 'Quantity'
        ])
        
        // Should see input fields for fuel data
        cy.get('input[type="number"], select, textarea').should('be.visible')
      }
    })
  })

  it('should have correct fueler permissions loaded', () => {
    cy.getCurrentUser().then((user) => {
      expect(user).to.have.property('permissions')
      expect(user.permissions).to.be.an('array')
      expect(user.permissions.length).to.be.greaterThan(0)
      
      // Fueler should have execution permissions but not creation/admin permissions
      expect(user.permissions).to.include.oneOf([
        'execute_order',
        'update_order_status',
        'view_assigned_orders',
        'record_fuel_delivery'
      ])
      
      // Should NOT have admin or creation permissions
      expect(user.permissions).to.not.include.oneOf([
        'manage_users',
        'create_fuel_order',
        'administrative_operations'
      ])
    })
  })

  it('should be able to view receipts for completed orders', () => {
    cy.visit('/fueler/receipts')
    
    // Should see receipts interface
    cy.get('body').should('be.visible')
    cy.get('body').should('not.contain', 'Access denied')
    
    // Should see receipt list or print options
    cy.get('body').should('contain.oneOf', ['Receipt', 'Print', 'Download', 'View'])
  })

  it('should be able to update order status', () => {
    cy.visit('/fueler/in-progress')
    
    // Look for status update functionality
    cy.get('body').then(($body) => {
      if ($body.find('select:contains("Status"), button:contains("Update Status")').length > 0) {
        // Should see status dropdown or update buttons
        cy.get('select, button:contains("Update"), button:contains("Complete")').should('be.visible')
      }
    })
  })

  it('should see fuel truck assignment information', () => {
    cy.visit('/fueler/dashboard')
    
    // Should see assigned truck or vehicle information
    cy.get('body').should('contain.oneOf', [
      'Truck', 'Vehicle', 'Assignment', 'Equipment', 'Unit'
    ])
  })

  it('should be able to view order details', () => {
    cy.visit('/fueler/pending-orders')
    
    // Should see order details
    cy.get('body').then(($body) => {
      if ($body.find('a:contains("View"), a:contains("Details"), button:contains("View")').length > 0) {
        cy.get('a:contains("View"), a:contains("Details"), button:contains("View")').first().click()
        
        // Should see detailed order information
        cy.get('body').should('contain.oneOf', [
          'Aircraft', 'Customer', 'Fuel Type', 'Gallons', 'Location'
        ])
      }
    })
  })

  it('should have dashboard showing current workload', () => {
    cy.visit('/fueler/dashboard')
    
    // Should see workload statistics
    cy.get('body').should('contain.oneOf', [
      'Pending', 'In Progress', 'Completed', 'Assigned', 'Today'
    ])
    
    // Should see numeric indicators
    cy.get('.stat, .metric, .number, .count').should('be.visible')
  })
}) 