/**
 * End-to-end tests for sidebar functionality across all user roles
 * Tests responsive behavior, navigation, and role-based access control
 */

describe('Sidebar Integration Tests', () => {
  beforeEach(() => {
    // Mock successful login for different user types
    cy.window().then((win) => {
      win.localStorage.clear()
    })
  })

  describe('Admin Role Sidebar', () => {
    beforeEach(() => {
      // Set up admin user
      cy.window().then((win) => {
        win.localStorage.setItem('fboUser', JSON.stringify({
          isLoggedIn: true,
          name: 'Admin User',
          email: 'admin@test.com',
          roles: ['System Administrator'],
          permissions: ['access_admin_dashboard', 'manage_users', 'manage_roles']
        }))
      })
      cy.visit('/admin/dashboard')
    })

    it('displays admin navigation items', () => {
      // Check for admin-specific navigation
      cy.get('[data-sidebar="sidebar"]').within(() => {
        cy.contains('Admin Dashboard').should('be.visible')
        cy.contains('User Management').should('be.visible')
        cy.contains('Permissions').should('be.visible')
        cy.contains('Fuel Trucks').should('be.visible')
        
        // Should not show other role items
        cy.contains('CSR Dashboard').should('not.exist')
        cy.contains('Fueler Dashboard').should('not.exist')
      })
    })

    it('handles sidebar collapse/expand on desktop', () => {
      // Initial state - should be expanded
      cy.get('[data-sidebar="sidebar"]').should('be.visible')
      cy.contains('FBO LaunchPad').should('be.visible')
      
      // Click the rail to collapse
      cy.get('[data-sidebar="rail"]').click()
      
      // Should be collapsed - logo text hidden but icon visible
      cy.contains('FBO LaunchPad').should('not.be.visible')
      
      // Click rail again to expand
      cy.get('[data-sidebar="rail"]').click()
      
      // Should be expanded again
      cy.contains('FBO LaunchPad').should('be.visible')
    })

    it('navigates correctly between admin pages', () => {
      cy.get('[data-sidebar="sidebar"]').within(() => {
        cy.contains('User Management').click()
      })
      cy.url().should('include', '/admin/users')
      
      cy.get('[data-sidebar="sidebar"]').within(() => {
        cy.contains('Admin Dashboard').click()
      })
      cy.url().should('include', '/admin/dashboard')
    })

    it('shows tooltips when collapsed', () => {
      // Collapse sidebar
      cy.get('[data-sidebar="rail"]').click()
      
      // Hover over a navigation item should show tooltip
      cy.get('[data-sidebar="menu-button"]').first().trigger('mouseover')
      cy.get('[role="tooltip"]').should('be.visible')
    })

    it('displays user info and logout functionality', () => {
      cy.get('[data-sidebar="footer"]').within(() => {
        cy.contains('Admin User').should('be.visible')
        cy.contains('Admin').should('be.visible')
        
        // Click user dropdown
        cy.get('[data-sidebar="menu-button"]').click()
      })
      
      // Should show dropdown with logout
      cy.contains('Log out').should('be.visible').click()
      
      // Should redirect to login
      cy.url().should('include', '/login')
    })

    it('theme toggle works correctly', () => {
      // Find and click theme toggle
      cy.get('[data-sidebar="sidebar"]').within(() => {
        cy.contains('Dark Mode').click()
      })
      
      // Should switch to light mode text
      cy.contains('Light Mode').should('be.visible')
      
      // Click again to switch back
      cy.contains('Light Mode').click()
      cy.contains('Dark Mode').should('be.visible')
    })
  })

  describe('CSR Role Sidebar', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('fboUser', JSON.stringify({
          isLoggedIn: true,
          name: 'CSR User',
          email: 'csr@test.com',
          roles: ['Customer Service Representative'],
          permissions: ['access_csr_dashboard', 'view_all_orders', 'create_fuel_order']
        }))
      })
      cy.visit('/csr/dashboard')
    })

    it('displays CSR navigation items', () => {
      cy.get('[data-sidebar="sidebar"]').within(() => {
        cy.contains('CSR Dashboard').should('be.visible')
        cy.contains('Fuel Orders').should('be.visible')
        cy.contains('Receipts').should('be.visible')
        cy.contains('Export Data').should('be.visible')
        
        // Should not show admin items
        cy.contains('User Management').should('not.exist')
        cy.contains('Permissions').should('not.exist')
      })
    })

    it('navigates between CSR pages correctly', () => {
      cy.get('[data-sidebar="sidebar"]').within(() => {
        cy.contains('Fuel Orders').click()
      })
      cy.url().should('include', '/csr/fuel-orders')
      
      cy.get('[data-sidebar="sidebar"]').within(() => {
        cy.contains('Receipts').click()
      })
      cy.url().should('include', '/csr/receipts')
    })
  })

  describe('Fueler Role Sidebar', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('fboUser', JSON.stringify({
          isLoggedIn: true,
          name: 'Fueler User',
          email: 'fueler@test.com',
          roles: ['Line Service Technician'],
          permissions: ['access_fueler_dashboard']
        }))
      })
      cy.visit('/fueler/dashboard')
    })

    it('displays fueler navigation items', () => {
      cy.get('[data-sidebar="sidebar"]').within(() => {
        cy.contains('Fueler Dashboard').should('be.visible')
        cy.contains('Completed Orders').should('be.visible')
        
        // Should not show other role items
        cy.contains('Admin Dashboard').should('not.exist')
        cy.contains('CSR Dashboard').should('not.exist')
        cy.contains('User Management').should('not.exist')
      })
    })
  })

  describe('Member Role Sidebar', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('fboUser', JSON.stringify({
          isLoggedIn: true,
          name: 'Member User',
          email: 'member@test.com',
          roles: ['Member'],
          permissions: []
        }))
      })
      cy.visit('/member/dashboard')
    })

    it('displays member navigation items', () => {
      cy.get('[data-sidebar="sidebar"]').within(() => {
        cy.contains('Member Dashboard').should('be.visible')
        
        // Should not show other role items
        cy.contains('Admin Dashboard').should('not.exist')
        cy.contains('CSR Dashboard').should('not.exist')
        cy.contains('Fueler Dashboard').should('not.exist')
      })
    })
  })

  describe('Responsive Behavior', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('fboUser', JSON.stringify({
          isLoggedIn: true,
          name: 'Test User',
          email: 'test@test.com',
          roles: ['System Administrator'],
          permissions: ['access_admin_dashboard']
        }))
      })
      cy.visit('/admin/dashboard')
    })

    it('shows mobile sidebar sheet on small screens', () => {
      // Set mobile viewport
      cy.viewport(375, 667)
      
      // Sidebar should be hidden initially on mobile
      cy.get('[data-sidebar="sidebar"][data-mobile="true"]').should('not.be.visible')
      
      // Trigger mobile menu (would typically be a hamburger button)
      cy.get('[data-sidebar="trigger"]').click()
      
      // Should show as sheet overlay
      cy.get('[data-sidebar="sidebar"][data-mobile="true"]').should('be.visible')
    })

    it('handles desktop sidebar correctly', () => {
      // Set desktop viewport
      cy.viewport(1280, 720)
      
      // Sidebar should be visible on desktop
      cy.get('[data-sidebar="sidebar"]').should('be.visible')
      cy.contains('FBO LaunchPad').should('be.visible')
      
      // Content should have proper margins
      cy.get('[data-sidebar="inset"]').should('be.visible')
    })
  })

  describe('Permission-Based Access Control', () => {
    it('redirects unauthorized users appropriately', () => {
      // Try to access admin without permissions
      cy.window().then((win) => {
        win.localStorage.setItem('fboUser', JSON.stringify({
          isLoggedIn: true,
          name: 'Basic User',
          email: 'basic@test.com',
          roles: ['Member'],
          permissions: []
        }))
      })
      
      cy.visit('/admin/dashboard')
      
      // Should show access denied page
      cy.contains('Admin Dashboard').should('be.visible')
      cy.contains('System Administrator dashboard').should('be.visible')
    })

    it('shows appropriate navigation based on permissions', () => {
      // User with limited admin permissions
      cy.window().then((win) => {
        win.localStorage.setItem('fboUser', JSON.stringify({
          isLoggedIn: true,
          name: 'Limited Admin',
          email: 'limited@test.com',
          roles: ['System Administrator'],
          permissions: ['access_admin_dashboard'] // Only dashboard access
        }))
      })
      
      cy.visit('/admin/dashboard')
      
      cy.get('[data-sidebar="sidebar"]').within(() => {
        // Should show items user has access to
        cy.contains('Admin Dashboard').should('be.visible')
        
        // Should not show items user lacks permission for
        cy.contains('User Management').should('not.exist')
        cy.contains('Permissions').should('not.exist')
      })
    })
  })

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('fboUser', JSON.stringify({
          isLoggedIn: true,
          name: 'Test User',
          email: 'test@test.com',
          roles: ['System Administrator'],
          permissions: ['access_admin_dashboard', 'manage_users']
        }))
      })
      cy.visit('/admin/dashboard')
    })

    it('supports keyboard shortcut for sidebar toggle', () => {
      // Press Cmd+B (or Ctrl+B) to toggle sidebar
      cy.get('body').type('{cmd+b}')
      
      // Sidebar should collapse
      cy.contains('FBO LaunchPad').should('not.be.visible')
      
      // Press again to expand
      cy.get('body').type('{cmd+b}')
      cy.contains('FBO LaunchPad').should('be.visible')
    })

    it('allows tab navigation through sidebar items', () => {
      cy.get('[data-sidebar="menu-button"]').first().focus()
      
      // Tab through menu items
      cy.focused().tab()
      cy.focused().should('contain', 'User Management')
      
      // Should be able to activate with Enter
      cy.focused().type('{enter}')
      cy.url().should('include', '/admin/users')
    })
  })

  describe('Error Handling', () => {
    it('handles invalid user data gracefully', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('fboUser', 'invalid-json')
      })
      
      cy.visit('/admin/dashboard')
      
      // Should redirect to login
      cy.url().should('include', '/login')
    })

    it('handles missing permissions data gracefully', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('fboUser', JSON.stringify({
          isLoggedIn: true,
          name: 'User Without Permissions',
          email: 'test@test.com'
          // Missing roles and permissions
        }))
      })
      
      cy.visit('/admin/dashboard')
      
      // Should still render sidebar without crashing
      cy.get('[data-sidebar="sidebar"]').should('be.visible')
      cy.contains('FBO LaunchPad').should('be.visible')
    })
  })
})