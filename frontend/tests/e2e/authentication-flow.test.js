describe('Authentication Flow and Permission Loading Tests', () => {
  
  it('should not make unauthorized API calls on page load', () => {
    // Clear any existing authentication
    cy.clearLocalStorage()
    cy.clearCookies()
    
    // Set up network interception to catch 401 errors
    cy.intercept('GET', '/api/auth/me/permissions', { statusCode: 401 }).as('unauthorizedCall')
    
    // Visit home page without being logged in
    cy.visit('/')
    
    // Wait a moment for any potential API calls
    cy.wait(2000)
    
    // The 401 error should NOT occur after our fix
    cy.get('@unauthorizedCall.all').should('have.length', 0)
    
    // Page should load successfully
    cy.get('body').should('be.visible')
  })

  it('should handle unauthenticated state gracefully', () => {
    // Clear authentication
    cy.clearLocalStorage()
    cy.clearCookies()
    
    // Visit the app
    cy.visit('/')
    
    // Should not show any 401 error messages in console
    cy.window().then((win) => {
      // Check that no user data exists
      const userData = win.localStorage.getItem('fboUser')
      expect(userData).to.be.null
    })
    
    // Should redirect to login or show login interface
    cy.url().then((url) => {
      if (url.includes('/login')) {
        cy.get('body').should('contain', 'Login')
      } else {
        // If not redirected, should show public interface without errors
        cy.get('body').should('be.visible')
      }
    })
  })

  it('should successfully load permissions after login for each user type', () => {
    const userTypes = ['admin', 'csr', 'fueler', 'member']
    
    userTypes.forEach((userType) => {
      // Clear state
      cy.clearLocalStorage()
      cy.clearCookies()
      
      // Login as user type
      cy.loginAs(userType)
      
      // Verify permissions loaded successfully
      cy.getCurrentUser().then((user) => {
        expect(user).to.not.be.null
        expect(user).to.have.property('access_token')
        expect(user.access_token).to.be.a('string')
        expect(user.access_token.length).to.be.greaterThan(0)
        
        // Permissions should be loaded
        expect(user).to.have.property('permissions')
        expect(user.permissions).to.be.an('array')
      })
      
      // Logout
      cy.logout()
    })
  })

  it('should make successful permission API calls only when authenticated', () => {
    // Set up interception to monitor permission calls
    cy.intercept('GET', '/api/auth/me/permissions').as('permissionCall')
    
    // Start unauthenticated
    cy.clearLocalStorage()
    cy.clearCookies()
    cy.visit('/')
    cy.wait(1000)
    
    // Should not have made permission call
    cy.get('@permissionCall.all').should('have.length', 0)
    
    // Login as admin
    cy.loginAs('admin')
    
    // Now should have made successful permission call
    cy.wait('@permissionCall').then((interception) => {
      expect(interception.response.statusCode).to.equal(200)
      expect(interception.response.body).to.have.property('permissions')
    })
  })

  it('should handle token expiration gracefully', () => {
    // Login first
    cy.loginAs('admin')
    
    // Manually corrupt the token to simulate expiration
    cy.window().then((win) => {
      const userData = JSON.parse(win.localStorage.getItem('fboUser'))
      userData.access_token = 'expired_token_12345'
      win.localStorage.setItem('fboUser', JSON.stringify(userData))
    })
    
    // Set up interception for 401 response
    cy.intercept('GET', '/api/auth/me/permissions', { statusCode: 401 }).as('expiredTokenCall')
    
    // Try to access a protected page
    cy.visit('/admin/dashboard')
    
    // Should handle the 401 gracefully (redirect to login or show error)
    cy.url({ timeout: 10000 }).should('satisfy', (url) => 
      url.includes('/login') || url.includes('/error') || url.includes('/unauthorized')
    )
  })

  it('should maintain permission state across page navigation', () => {
    // Login as CSR
    cy.loginAs('csr')
    
    // Navigate between pages
    cy.visit('/csr/dashboard')
    cy.getCurrentUser().then((user1) => {
      expect(user1.permissions).to.be.an('array')
      const permissions1 = [...user1.permissions]
      
      // Navigate to another page
      cy.visit('/csr/fuel-orders')
      cy.getCurrentUser().then((user2) => {
        // Permissions should be maintained
        expect(user2.permissions).to.deep.equal(permissions1)
      })
    })
  })

  it('should clear permissions on logout', () => {
    // Login as admin
    cy.loginAs('admin')
    
    // Verify permissions are loaded
    cy.getCurrentUser().then((user) => {
      expect(user.permissions).to.be.an('array')
      expect(user.permissions.length).to.be.greaterThan(0)
    })
    
    // Logout
    cy.logout()
    
    // Verify permissions are cleared
    cy.window().then((win) => {
      const userData = win.localStorage.getItem('fboUser')
      expect(userData).to.be.null
    })
  })

  it('should handle network errors gracefully', () => {
    // Login first
    cy.loginAs('admin')
    
    // Simulate network error for permission call
    cy.intercept('GET', '/api/auth/me/permissions', { forceNetworkError: true }).as('networkError')
    
    // Force a permission refresh by clearing cached permissions
    cy.window().then((win) => {
      const userData = JSON.parse(win.localStorage.getItem('fboUser'))
      delete userData.permissions
      delete userData.permissions_loaded_at
      win.localStorage.setItem('fboUser', JSON.stringify(userData))
    })
    
    // Visit a page that would trigger permission loading
    cy.visit('/admin/dashboard')
    
    // Should handle the network error gracefully
    cy.get('body').should('be.visible')
    // Page should still load even if permissions fail to refresh
  })

  it('should refresh expired permissions automatically', () => {
    // Login as CSR
    cy.loginAs('csr')
    
    // Manually set permissions as very old
    cy.window().then((win) => {
      const userData = JSON.parse(win.localStorage.getItem('fboUser'))
      userData.permissions_loaded_at = new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 minutes ago
      win.localStorage.setItem('fboUser', JSON.stringify(userData))
    })
    
    // Set up interception to monitor refresh call
    cy.intercept('GET', '/api/auth/me/permissions').as('permissionRefresh')
    
    // Visit a page
    cy.visit('/csr/dashboard')
    
    // Should have automatically refreshed permissions
    cy.wait('@permissionRefresh').then((interception) => {
      expect(interception.response.statusCode).to.equal(200)
    })
  })

  it('should validate user role permissions match expected patterns', () => {
    const roleTests = [
      {
        role: 'admin',
        shouldHave: ['manage_users', 'access_admin_dashboard'],
        shouldNotHave: []
      },
      {
        role: 'csr', 
        shouldHave: ['create_order', 'view_all_orders'],
        shouldNotHave: ['manage_users']
      },
      {
        role: 'fueler',
        shouldHave: ['perform_fueling_task', 'update_order_status'],
        shouldNotHave: ['create_order', 'manage_users']
      },
      {
        role: 'member',
        shouldHave: [],
        shouldNotHave: ['create_order', 'perform_fueling_task', 'manage_users']
      }
    ]
    
    roleTests.forEach(({ role, shouldHave, shouldNotHave }) => {
      cy.clearLocalStorage()
      cy.loginAs(role)
      
      cy.getCurrentUser().then((user) => {
        const permissions = user.permissions || []
        
        // Check required permissions (if any)
        if (shouldHave.length > 0) {
          const hasAnyRequired = shouldHave.some(perm => permissions.includes(perm))
          expect(hasAnyRequired, `${role} should have at least one of: ${shouldHave.join(', ')}`).to.be.true
        }
        
        // Check forbidden permissions
        shouldNotHave.forEach(perm => {
          expect(permissions, `${role} should not have ${perm}`).to.not.include(perm)
        })
      })
      
      cy.logout()
    })
  })
}) 