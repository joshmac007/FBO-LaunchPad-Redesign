describe('Admin User Access Tests', () => {
  beforeEach(() => {
    // Login as admin before each test
    cy.loginAs('admin')
    cy.waitForPermissions()
  })

  afterEach(() => {
    cy.logout()
  })

  it('should have access to all admin pages', () => {
    // Test admin dashboard access
    cy.checkPageAccess('/admin/dashboard', true)
    cy.get('h1').should('contain', 'Admin Dashboard')

    // Test user management
    cy.checkPageAccess('/admin/users', true)
    
    // Test customer management
    cy.checkPageAccess('/admin/customers', true)
    
    // Test aircraft management
    cy.checkPageAccess('/admin/aircraft', true)
    
    // Test fuel truck management
    cy.checkPageAccess('/admin/fuel-trucks', true)
    
    // Test LST management
    cy.checkPageAccess('/admin/lst-management', true)
    
    // Test permissions management
    cy.checkPageAccess('/admin/permissions', true)
  })

  it('should have access to all CSR functionality', () => {
    // CSR dashboard
    cy.checkPageAccess('/csr/dashboard', true)
    
    // Create new fuel orders
    cy.checkPageAccess('/csr/fuel-orders/new', true)
    
    // View all fuel orders
    cy.checkPageAccess('/csr/fuel-orders', true)
    
    // Export functionality
    cy.checkPageAccess('/csr/export', true)
    
    // Receipts
    cy.checkPageAccess('/csr/receipts', true)
  })

  it('should have access to all fueler functionality', () => {
    // Fueler dashboard
    cy.checkPageAccess('/fueler/dashboard', true)
    
    // Pending orders
    cy.checkPageAccess('/fueler/pending-orders', true)
    
    // In progress orders
    cy.checkPageAccess('/fueler/in-progress', true)
    
    // Completed orders
    cy.checkPageAccess('/fueler/completed', true)
  })

  it('should see admin navigation links', () => {
    cy.visit('/admin/dashboard')
    
    // Check for admin-specific navigation
    cy.checkNavLink('User Management', true)
    cy.checkNavLink('Customer Management', true)
    cy.checkNavLink('Aircraft Management', true)
    cy.checkNavLink('Fuel Trucks', true)
    cy.checkNavLink('LST Management', true)
    cy.checkNavLink('Permissions', true)
  })

  it('should be able to create and manage users', () => {
    cy.visit('/admin/users')
    
    // Should see create user button
    cy.checkButton('Add User', true)
    
    // Should see user list
    cy.get('[data-testid="user-list"]', { timeout: 10000 }).should('be.visible')
    
    // Should see actions dropdown button for users
    cy.get('tbody tr').first().within(() => {
      cy.get('button').should('exist')
    })
  })

  it('should be able to manage customers', () => {
    cy.visit('/admin/customers')
    
    // Should see create customer button
    cy.checkButton('Add Customer', true)
    
    // Should see customer list
    cy.get('[data-testid="customer-list"]', { timeout: 10000 }).should('be.visible')
  })

  it('should be able to manage aircraft', () => {
    cy.visit('/admin/aircraft')
    
    // Should see create aircraft button
    cy.checkButton('Add Aircraft', true)
    
    // Should see aircraft list
    cy.get('[data-testid="aircraft-list"]', { timeout: 10000 }).should('be.visible')
  })

  it('should be able to manage fuel trucks', () => {
    cy.visit('/admin/fuel-trucks')
    
    // Should see create fuel truck button
    cy.checkButton('Add Fuel Truck', true)
    
    // Should see fuel truck list
    cy.get('[data-testid="fuel-truck-list"]', { timeout: 10000 }).should('be.visible')
  })

  it('should have correct user permissions loaded', () => {
    cy.getCurrentUser().then((user) => {
      expect(user).to.have.property('permissions')
      expect(user.permissions).to.be.an('array')
      expect(user.permissions.length).to.be.greaterThan(0)
      
      // Admin should have admin-level permissions
      const adminPermissions = ['access_admin_dashboard', 'manage_users', 'manage_customers', 'manage_aircraft']
      const hasAdminPermissions = adminPermissions.some(perm => user.permissions.includes(perm))
      expect(hasAdminPermissions, `Admin should have at least one admin permission: ${adminPermissions.join(', ')}`).to.be.true
    })
  })

  it('should be able to export data', () => {
    cy.visit('/csr/export')
    
    // Should see export options
    cy.checkButton('Export Fuel Orders', true)
    cy.checkButton('Export Receipts', true)
    
    // Should be able to select date ranges
    cy.get('input[type="date"]').should('be.visible')
  })
}) 