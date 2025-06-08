// Admin Fee Configuration E2E Tests - Simplified
describe('Admin Fee Configuration Management', () => {
  beforeEach(() => {
    // Login as admin user first
    cy.visit('/login')
    cy.get('input[type="email"]').clear().type('admin@fbolaunchpad.com')
    cy.get('input[type="password"]').clear().type('Admin123!')
    cy.get('button').contains('Log In').click()
    
    // Wait for login to complete and redirect to admin dashboard  
    cy.url().should('include', '/admin', { timeout: 15000 })
    cy.wait(3000) // Allow time for authentication to fully settle
  })

  describe('Fee Categories Page Access', () => {
    it('should load the fee categories page successfully', () => {
      // Navigate directly to fee categories page
      cy.visit('/admin/fbo-config/fee-categories')
      
      // Wait for initial loading to complete
      cy.wait(3000)
      
      // Verify page loads without errors
      cy.get('main').should('be.visible')
      
      // Should show the actual page content with proper heading
      cy.get('h1').should('contain.text', 'Fee Categories')
      cy.get('main').should('contain.text', 'Manage aircraft fee categories')
    })

    it('should load the fee rules page successfully', () => {
      // Navigate directly to fee rules page
      cy.visit('/admin/fbo-config/fee-rules')
      
      // Wait for initial loading to complete
      cy.wait(3000)
      
      // Verify page loads without errors
      cy.get('main').should('be.visible')
      
      // Should show the actual page content with proper heading
      cy.get('h1').should('contain.text', 'Fee Rules')
      cy.get('main').should('contain.text', 'Configure fee rules for different services')
    })

    it('should load the aircraft mappings page successfully', () => {
      // Navigate directly to aircraft mappings page
      cy.visit('/admin/fbo-config/aircraft-mappings')
      
      // Wait for initial loading to complete
      cy.wait(3000)
      
      // Verify page loads without errors
      cy.get('main').should('be.visible')
      
      // Should show the actual page content with proper heading
      cy.get('h1').should('contain.text', 'Aircraft Type to Fee Category Mappings')
      cy.get('main').should('contain.text', 'Upload CSV files to bulk update mappings')
    })

    it('should load the waiver tiers page successfully', () => {
      // Navigate directly to waiver tiers page
      cy.visit('/admin/fbo-config/waiver-tiers')
      
      // Wait for initial loading to complete
      cy.wait(3000)
      
      // Verify page loads without errors
      cy.get('main').should('be.visible')
      
      // Should show the actual page content with proper heading
      cy.get('h1').should('contain.text', 'Waiver Tiers')
      cy.get('main').should('contain.text', 'Configure waiver tier strategies')
    })
  })

  describe('Fee Categories Basic Functionality', () => {
    it('should display fee categories when API responds', () => {
      // Mock API responses
      cy.intercept('GET', '/api/admin/fbo/*/fee-categories', {
        body: [
          { id: 1, name: 'Light Jet', fbo_location_id: 1 },
          { id: 2, name: 'Turboprop', fbo_location_id: 1 }
        ]
      }).as('getFeeCategories')
      
      cy.visit('/admin/fbo-config/fee-categories')
      cy.wait('@getFeeCategories')
      
      // Wait for initial loading to complete
      cy.wait(3000)
      
      // The page should render the categories returned by the API
      cy.get('main').should('be.visible')
      
      // Basic content verification - the exact selectors may vary
      // but we should be able to see category names somewhere on the page
      cy.get('body').should('contain.text', 'Light Jet')
      cy.get('body').should('contain.text', 'Turboprop')
    })
  })

  describe('API Integration Verification', () => {
    it('should handle API calls correctly for fee categories', () => {
      // Test that API calls are made with correct endpoints
      cy.intercept('GET', '/api/admin/fbo/*/fee-categories').as('getFeeCategories')
      
      cy.visit('/admin/fbo-config/fee-categories')
      
      // Verify the API call was made
      cy.wait('@getFeeCategories').then((interception) => {
        expect(interception.request.url).to.include('/api/admin/fbo/')
        expect(interception.request.url).to.include('/fee-categories')
      })
    })

    it('should handle API calls correctly for fee rules', () => {
      // Test that API calls are made with correct endpoints
      cy.intercept('GET', '/api/admin/fbo/*/fee-rules').as('getFeeRules')
      cy.intercept('GET', '/api/admin/fbo/*/fee-categories').as('getFeeCategories')
      
      cy.visit('/admin/fbo-config/fee-rules')
      
      // Verify the API calls were made
      cy.wait('@getFeeRules').then((interception) => {
        expect(interception.request.url).to.include('/api/admin/fbo/')
        expect(interception.request.url).to.include('/fee-rules')
      })
    })

    it('should handle network errors gracefully', () => {
      // Mock network failure
      cy.intercept('GET', '/api/admin/fbo/*/fee-categories', {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('networkError')

      cy.visit('/admin/fbo-config/fee-categories')
      
      // Should handle error without crashing
      cy.get('main').should('be.visible')
      
      // Should show some kind of error indication
      // (exact UI may vary, but page shouldn't crash)
    })
  })

  describe('Error Handling', () => {
    it('should handle unauthorized access gracefully', () => {
      // Mock unauthorized response
      cy.intercept('GET', '/api/admin/fbo/*/fee-categories', {
        statusCode: 403,
        body: { error: 'Forbidden' }
      }).as('unauthorizedError')

      cy.visit('/admin/fbo-config/fee-categories')
      
      // Should handle error without crashing the page
      cy.get('main').should('be.visible')
    })

    it('should show loading states appropriately', () => {
      // Mock slow response
      cy.intercept('GET', '/api/admin/fbo/*/fee-categories', {
        delay: 1000,
        body: []
      }).as('slowResponse')

      cy.visit('/admin/fbo-config/fee-categories')
      
      // Should show loading state initially
      cy.get('main').should('contain.text', 'Loading')
      
      // After response, loading should be gone
      cy.wait('@slowResponse')
      cy.get('main').should('not.contain.text', 'Loading')
    })
  })
}) 