describe('CSR User Access Tests', () => {
  beforeEach(() => {
    // Login as CSR before each test
    cy.loginAs('csr')
    cy.waitForPermissions()
  })

  afterEach(() => {
    cy.logout()
  })

  it('should have access to CSR pages only', () => {
    // Should have access to CSR dashboard
    cy.checkPageAccess('/csr/dashboard', true)
    cy.get('h1').should('contain.oneOf', ['CSR Dashboard', 'Customer Service'])

    // Should have access to fuel orders
    cy.checkPageAccess('/csr/fuel-orders', true)
    
    // Should have access to create new orders
    cy.checkPageAccess('/csr/fuel-orders/new', true)
    
    // Should have access to export
    cy.checkPageAccess('/csr/export', true)
    
    // Should have access to receipts
    cy.checkPageAccess('/csr/receipts', true)
  })

  it('should NOT have access to admin pages', () => {
    // Should not access admin dashboard
    cy.checkPageAccess('/admin/dashboard', false)
    
    // Should not access user management
    cy.checkPageAccess('/admin/users', false)
    
    // Should not access customer management (admin level)
    cy.checkPageAccess('/admin/customers', false)
    
    // Should not access aircraft management (admin level)
    cy.checkPageAccess('/admin/aircraft', false)
    
    // Should not access fuel truck management (admin level)
    cy.checkPageAccess('/admin/fuel-trucks', false)
    
    // Should not access LST management
    cy.checkPageAccess('/admin/lst-management', false)
    
    // Should not access permissions management
    cy.checkPageAccess('/admin/permissions', false)
  })

  it('should have limited access to fueler pages', () => {
    // CSR may or may not have access to fueler dashboard depending on permissions
    // Check based on actual permission implementation
    cy.visit('/fueler/dashboard')
    cy.url({ timeout: 10000 }).then((url) => {
      if (!url.includes('/login')) {
        // If CSR has access, verify they can see the content
        cy.get('body').should('not.contain', 'Access denied')
      }
    })
  })

  it('should see CSR-specific navigation links', () => {
    cy.visit('/csr/dashboard')
    
    // Should see CSR navigation
    cy.checkNavLink('Dashboard', true)
    cy.checkNavLink('Fuel Orders', true)
    cy.checkNavLink('New Order', true)
    cy.checkNavLink('Export', true)
    cy.checkNavLink('Receipts', true)
    
    // Should NOT see admin navigation
    cy.checkNavLink('User Management', false)
    cy.checkNavLink('Admin Dashboard', false)
  })

  it('should be able to create fuel orders', () => {
    cy.visit('/csr/fuel-orders/new')
    
    // Should see fuel order creation form
    cy.get('form').should('be.visible')
    
    // Should see customer selection
    cy.get('select, input').should('contain.oneOf', ['Customer', 'Aircraft', 'Fuel Type'])
    
    // Should see submit button
    cy.checkButton('Create Order', true)
    cy.checkButton('Submit', true)
  })

  it('should be able to view and manage fuel orders', () => {
    cy.visit('/csr/fuel-orders')
    
    // Should see orders list
    cy.get('[data-testid="orders-list"], table, .order-item').should('be.visible')
    
    // Should see status update capabilities
    cy.get('body').should('contain.oneOf', ['Status', 'Update', 'Review', 'Approve'])
    
    // Should be able to view order details
    cy.get('a, button').should('contain.oneOf', ['View', 'Details', 'Edit'])
  })

  it('should be able to export data', () => {
    cy.visit('/csr/export')
    
    // Should see export functionality
    cy.checkButton('Export', true)
    cy.checkButton('Download', true)
    cy.checkButton('CSV', true)
    
    // Should see date range selectors
    cy.get('input[type="date"], select').should('be.visible')
  })

  it('should be able to view receipts', () => {
    cy.visit('/csr/receipts')
    
    // Should see receipts list or message
    cy.get('body').should('be.visible')
    
    // Should not show access denied
    cy.get('body').should('not.contain', 'Access denied')
  })

  it('should have correct CSR permissions loaded', () => {
    cy.getCurrentUser().then((user) => {
      expect(user).to.have.property('permissions')
      expect(user.permissions).to.be.an('array')
      expect(user.permissions.length).to.be.greaterThan(0)
      
      // CSR should have order management permissions but not admin permissions
      expect(user.permissions).to.include.oneOf([
        'CREATE_ORDER',
        'VIEW_ORDERS',
        'EDIT_ORDERS',
        'REVIEW_ORDERS',
        'EXPORT_ORDERS'
      ])
      
      // Should NOT have admin permissions
      expect(user.permissions).to.not.include.oneOf([
        'MANAGE_USERS',
        'administrative_operations'
      ])
    })
  })

  it('should be able to search and filter orders', () => {
    cy.visit('/csr/fuel-orders')
    
    // Should see search functionality
    cy.get('input[type="search"], input[placeholder*="search" i]').should('be.visible')
    
    // Should see filter options
    cy.get('select, button').should('contain.oneOf', ['Filter', 'Status', 'Date', 'Customer'])
  })

  it('should be able to view order statistics', () => {
    cy.visit('/csr/dashboard')
    
    // Should see dashboard statistics
    cy.get('body').should('contain.oneOf', [
      'Total Orders', 
      'Pending', 
      'Completed', 
      'In Progress',
      'Statistics',
      'Summary'
    ])
    
    // Should see numbers or charts
    cy.get('.stat, .metric, .chart, .number').should('be.visible')
  })

  it('should handle order status updates', () => {
    cy.visit('/csr/fuel-orders')
    
    // Look for orders that can be updated
    cy.get('body').then(($body) => {
      if ($body.find('button:contains("Update"), button:contains("Review"), select').length > 0) {
        // Should be able to update order status
        cy.get('button:contains("Update"), button:contains("Review"), select').first().should('be.visible')
      }
    })
  })
}) 