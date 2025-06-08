// Admin Fee Configuration E2E Tests
describe('Admin Fee Configuration Management', () => {
  beforeEach(() => {
    // Login as admin user
    cy.visit('/admin/login')
    cy.get('[data-testid="email-input"]').type('admin@example.com')
    cy.get('[data-testid="password-input"]').type('password123')
    cy.get('[data-testid="login-button"]').click()
    
    // Wait for login to complete
    cy.url().should('include', '/admin')
    
    // Mock API responses for faster testing
    cy.intercept('GET', '/api/admin/fbo/1/fee-categories', {
      fixture: 'fee-categories.json'
    }).as('getFeeCategories')
    
    cy.intercept('GET', '/api/admin/fbo/1/fee-rules', {
      fixture: 'fee-rules.json'
    }).as('getFeeRules')
    
    cy.intercept('GET', '/api/admin/fbo/1/waiver-tiers', {
      fixture: 'waiver-tiers.json'
    }).as('getWaiverTiers')
  })

  describe('Fee Categories Management', () => {
    beforeEach(() => {
      cy.visit('/admin/fbo-config/fee-categories')
      cy.wait('@getFeeCategories')
    })

    it('should display list of fee categories', () => {
      cy.get('[data-testid="fee-category-list"]').should('be.visible')
      cy.get('[data-testid="category-item"]').should('have.length.at.least', 1)
      
      // Check that categories are displayed with correct information
      cy.get('[data-testid="category-item"]').first().within(() => {
        cy.get('[data-testid="category-name"]').should('contain.text', 'Light Jet')
        cy.get('[data-testid="edit-button"]').should('be.visible')
        cy.get('[data-testid="delete-button"]').should('be.visible')
      })
    })

    it('should create a new fee category', () => {
      // Mock the create API call
      cy.intercept('POST', '/api/admin/fbo/1/fee-categories', {
        statusCode: 201,
        body: {
          id: 4,
          name: 'Test Category',
          fbo_location_id: 1
        }
      }).as('createFeeCategory')

      // Click add new category button
      cy.get('[data-testid="add-category-button"]').click()
      
      // Fill out the form
      cy.get('[data-testid="category-form-dialog"]').should('be.visible')
      cy.get('[data-testid="category-name-input"]').type('Test Category')
      
      // Submit the form
      cy.get('[data-testid="save-category-button"]').click()
      
      // Verify API call was made
      cy.wait('@createFeeCategory').then((interception) => {
        expect(interception.request.body).to.deep.include({
          name: 'Test Category'
        })
      })
      
      // Verify success message
      cy.get('[data-testid="success-toast"]').should('contain.text', 'Category created successfully')
      
      // Verify dialog closes
      cy.get('[data-testid="category-form-dialog"]').should('not.exist')
    })

    it('should edit an existing fee category', () => {
      // Mock the update API call
      cy.intercept('PUT', '/api/admin/fbo/1/fee-categories/1', {
        statusCode: 200,
        body: {
          id: 1,
          name: 'Updated Light Jet',
          fbo_location_id: 1
        }
      }).as('updateFeeCategory')

      // Click edit button on first category
      cy.get('[data-testid="category-item"]').first().within(() => {
        cy.get('[data-testid="edit-button"]').click()
      })
      
      // Verify form is pre-filled
      cy.get('[data-testid="category-form-dialog"]').should('be.visible')
      cy.get('[data-testid="category-name-input"]').should('have.value', 'Light Jet')
      
      // Update the name
      cy.get('[data-testid="category-name-input"]').clear().type('Updated Light Jet')
      
      // Submit the form
      cy.get('[data-testid="save-category-button"]').click()
      
      // Verify API call was made
      cy.wait('@updateFeeCategory')
      
      // Verify success message
      cy.get('[data-testid="success-toast"]').should('contain.text', 'Category updated successfully')
    })

    it('should delete a fee category', () => {
      // Mock the delete API call
      cy.intercept('DELETE', '/api/admin/fbo/1/fee-categories/1', {
        statusCode: 204
      }).as('deleteFeeCategory')

      // Click delete button on first category
      cy.get('[data-testid="category-item"]').first().within(() => {
        cy.get('[data-testid="delete-button"]').click()
      })
      
      // Confirm deletion
      cy.get('[data-testid="confirm-delete-dialog"]').should('be.visible')
      cy.get('[data-testid="confirm-delete-button"]').click()
      
      // Verify API call was made
      cy.wait('@deleteFeeCategory')
      
      // Verify success message
      cy.get('[data-testid="success-toast"]').should('contain.text', 'Category deleted successfully')
    })

    it('should handle validation errors', () => {
      // Click add new category button
      cy.get('[data-testid="add-category-button"]').click()
      
      // Try to submit without filling required fields
      cy.get('[data-testid="save-category-button"]').click()
      
      // Verify validation error is shown
      cy.get('[data-testid="name-error"]').should('contain.text', 'Name is required')
      
      // Verify form doesn't close
      cy.get('[data-testid="category-form-dialog"]').should('be.visible')
    })

    it('should handle server errors', () => {
      // Mock server error response
      cy.intercept('POST', '/api/admin/fbo/1/fee-categories', {
        statusCode: 409,
        body: {
          error: 'Category name already exists'
        }
      }).as('createFeeCategoryError')

      // Fill out form
      cy.get('[data-testid="add-category-button"]').click()
      cy.get('[data-testid="category-name-input"]').type('Duplicate Category')
      cy.get('[data-testid="save-category-button"]').click()
      
      // Verify error handling
      cy.wait('@createFeeCategoryError')
      cy.get('[data-testid="error-toast"]').should('contain.text', 'Category name already exists')
    })
  })

  describe('Fee Rules Management', () => {
    beforeEach(() => {
      cy.visit('/admin/fbo-config/fee-rules')
      cy.wait('@getFeeRules')
      cy.wait('@getFeeCategories')
    })

    it('should display list of fee rules with category information', () => {
      cy.get('[data-testid="fee-rule-list"]').should('be.visible')
      cy.get('[data-testid="rule-item"]').should('have.length.at.least', 1)
      
      // Check that rules are displayed with correct information
      cy.get('[data-testid="rule-item"]').first().within(() => {
        cy.get('[data-testid="rule-name"]').should('contain.text', 'Ramp Fee')
        cy.get('[data-testid="rule-code"]').should('contain.text', 'RAMP')
        cy.get('[data-testid="rule-amount"]').should('contain.text', '$50.00')
        cy.get('[data-testid="rule-category"]').should('contain.text', 'Light Jet')
        cy.get('[data-testid="edit-button"]').should('be.visible')
        cy.get('[data-testid="delete-button"]').should('be.visible')
      })
    })

    it('should create a new fee rule with all fields', () => {
      // Mock the create API call
      cy.intercept('POST', '/api/admin/fbo/1/fee-rules', {
        statusCode: 201,
        body: {
          id: 5,
          fee_name: 'GPU Service',
          fee_code: 'GPU',
          applies_to_fee_category_id: 1,
          amount: 25.00,
          is_taxable: true,
          is_potentially_waivable_by_fuel_uplift: false,
          calculation_basis: 'FIXED_PRICE',
          waiver_strategy: 'NONE',
          fbo_location_id: 1
        }
      }).as('createFeeRule')

      // Click add new rule button
      cy.get('[data-testid="add-rule-button"]').click()
      
      // Fill out the comprehensive form
      cy.get('[data-testid="rule-form-dialog"]').should('be.visible')
      cy.get('[data-testid="fee-name-input"]').type('GPU Service')
      cy.get('[data-testid="fee-code-input"]').type('GPU')
      cy.get('[data-testid="fee-category-select"]').select('Light Jet')
      cy.get('[data-testid="amount-input"]').type('25.00')
      
      // Test checkbox interactions
      cy.get('[data-testid="is-taxable-checkbox"]').should('be.checked')
      cy.get('[data-testid="is-waivable-checkbox"]').should('not.be.checked')
      
      // Test select dropdowns
      cy.get('[data-testid="calculation-basis-select"]').select('FIXED_PRICE')
      cy.get('[data-testid="waiver-strategy-select"]').select('NONE')
      
      // Submit the form
      cy.get('[data-testid="save-rule-button"]').click()
      
      // Verify API call was made with correct data
      cy.wait('@createFeeRule').then((interception) => {
        expect(interception.request.body).to.deep.include({
          fee_name: 'GPU Service',
          fee_code: 'GPU',
          amount: 25.00,
          is_taxable: true,
          is_potentially_waivable_by_fuel_uplift: false
        })
      })
      
      // Verify success message
      cy.get('[data-testid="success-toast"]').should('contain.text', 'Fee rule created successfully')
    })

    it('should create fee rule with CAA overrides', () => {
      // Mock the create API call
      cy.intercept('POST', '/api/admin/fbo/1/fee-rules', {
        statusCode: 201,
        body: {
          id: 6,
          fee_name: 'Ramp Fee with CAA',
          fee_code: 'RAMP_CAA',
          has_caa_override: true,
          caa_override_amount: 40.00
        }
      }).as('createFeeRuleWithCAA')

      cy.get('[data-testid="add-rule-button"]').click()
      
      // Fill basic fields
      cy.get('[data-testid="fee-name-input"]').type('Ramp Fee with CAA')
      cy.get('[data-testid="fee-code-input"]').type('RAMP_CAA')
      cy.get('[data-testid="fee-category-select"]').select('Light Jet')
      cy.get('[data-testid="amount-input"]').type('50.00')
      
      // Enable CAA override
      cy.get('[data-testid="has-caa-override-checkbox"]').check()
      
      // Verify CAA fields appear
      cy.get('[data-testid="caa-override-amount-input"]').should('be.visible')
      cy.get('[data-testid="caa-waiver-strategy-select"]').should('be.visible')
      
      // Fill CAA override fields
      cy.get('[data-testid="caa-override-amount-input"]').type('40.00')
      cy.get('[data-testid="caa-waiver-strategy-select"]').select('AS_STANDARD')
      
      cy.get('[data-testid="save-rule-button"]').click()
      
      cy.wait('@createFeeRuleWithCAA')
      cy.get('[data-testid="success-toast"]').should('contain.text', 'Fee rule created successfully')
    })

    it('should validate fee rule form fields', () => {
      cy.get('[data-testid="add-rule-button"]').click()
      
      // Try to submit without required fields
      cy.get('[data-testid="save-rule-button"]').click()
      
      // Verify validation errors
      cy.get('[data-testid="fee-name-error"]').should('contain.text', 'Fee name is required')
      cy.get('[data-testid="fee-code-error"]').should('contain.text', 'Fee code is required')
      cy.get('[data-testid="fee-category-error"]').should('contain.text', 'Fee category is required')
      cy.get('[data-testid="amount-error"]').should('contain.text', 'Valid amount is required')
    })

    it('should show/hide waiver multiplier based on strategy', () => {
      cy.get('[data-testid="add-rule-button"]').click()
      
      // Initially NONE strategy - multiplier should not be visible
      cy.get('[data-testid="waiver-strategy-select"]').should('have.value', 'NONE')
      cy.get('[data-testid="simple-waiver-multiplier-input"]').should('not.exist')
      
      // Change to SIMPLE_MULTIPLIER - multiplier should appear
      cy.get('[data-testid="waiver-strategy-select"]').select('SIMPLE_MULTIPLIER')
      cy.get('[data-testid="simple-waiver-multiplier-input"]').should('be.visible')
      
      // Change back to NONE - multiplier should disappear
      cy.get('[data-testid="waiver-strategy-select"]').select('NONE')
      cy.get('[data-testid="simple-waiver-multiplier-input"]').should('not.exist')
    })
  })

  describe('Aircraft Type to Fee Category Mapping', () => {
    beforeEach(() => {
      cy.visit('/admin/fbo-config/mappings')
      cy.wait('@getFeeCategories')
    })

    it('should upload CSV file for aircraft mappings', () => {
      // Mock the CSV upload API
      cy.intercept('POST', '/api/admin/fbo/1/aircraft-mappings/upload', {
        statusCode: 200,
        body: {
          message: 'Mappings uploaded successfully',
          created: 5,
          updated: 2
        }
      }).as('uploadMappings')

      // Create a test CSV file
      const csvContent = `AircraftModel,AircraftManufacturer,FeeCategoryName
Citation CJ3,Cessna,Light Jet
King Air 350,Beechcraft,Turboprop
Gulfstream G550,Gulfstream,Heavy Jet`

      // Upload the file
      cy.get('[data-testid="csv-upload-input"]').selectFile({
        contents: csvContent,
        fileName: 'aircraft-mappings.csv',
        mimeType: 'text/csv'
      })
      
      cy.get('[data-testid="upload-button"]').click()
      
      // Verify API call
      cy.wait('@uploadMappings')
      
      // Verify success message with counts
      cy.get('[data-testid="success-toast"]').should('contain.text', 'Mappings uploaded successfully')
      cy.get('[data-testid="upload-summary"]').should('contain.text', '5 created, 2 updated')
    })

    it('should handle CSV upload errors', () => {
      // Mock error response
      cy.intercept('POST', '/api/admin/fbo/1/aircraft-mappings/upload', {
        statusCode: 400,
        body: {
          error: 'Invalid CSV format',
          details: 'Row 3: Unknown fee category "Invalid Category"'
        }
      }).as('uploadMappingsError')

      const invalidCSV = `AircraftModel,FeeCategoryName
Citation CJ3,Light Jet
Unknown Aircraft,Invalid Category`

      cy.get('[data-testid="csv-upload-input"]').selectFile({
        contents: invalidCSV,
        fileName: 'invalid-mappings.csv',
        mimeType: 'text/csv'
      })
      
      cy.get('[data-testid="upload-button"]').click()
      
      cy.wait('@uploadMappingsError')
      cy.get('[data-testid="error-toast"]').should('contain.text', 'Invalid CSV format')
      cy.get('[data-testid="error-details"]').should('contain.text', 'Row 3: Unknown fee category')
    })
  })

  describe('Waiver Tiers Management', () => {
    beforeEach(() => {
      cy.visit('/admin/fbo-config/waiver-tiers')
      cy.wait('@getWaiverTiers')
    })

    it('should display and manage waiver tiers', () => {
      cy.get('[data-testid="waiver-tier-list"]').should('be.visible')
      cy.get('[data-testid="tier-item"]').should('have.length.at.least', 1)
      
      // Check tier information display
      cy.get('[data-testid="tier-item"]').first().within(() => {
        cy.get('[data-testid="tier-name"]').should('contain.text', 'Standard Waiver')
        cy.get('[data-testid="tier-multiplier"]').should('contain.text', '1.5x')
        cy.get('[data-testid="tier-priority"]').should('contain.text', 'Priority: 1')
        cy.get('[data-testid="edit-button"]').should('be.visible')
      })
    })

    it('should create waiver tier with fee code selection', () => {
      cy.intercept('POST', '/api/admin/fbo/1/waiver-tiers', {
        statusCode: 201,
        body: {
          id: 3,
          name: 'High Volume Waiver',
          fuel_uplift_multiplier: 3.0,
          fees_waived_codes: ['RAMP', 'OVERNIGHT'],
          tier_priority: 2,
          is_caa_specific_tier: false
        }
      }).as('createWaiverTier')

      cy.get('[data-testid="add-tier-button"]').click()
      
      cy.get('[data-testid="tier-name-input"]').type('High Volume Waiver')
      cy.get('[data-testid="fuel-multiplier-input"]').type('3.0')
      cy.get('[data-testid="tier-priority-input"]').type('2')
      
      // Select fee codes to waive
      cy.get('[data-testid="fee-codes-select"]').click()
      cy.get('[data-testid="fee-code-option-RAMP"]').click()
      cy.get('[data-testid="fee-code-option-OVERNIGHT"]').click()
      
      cy.get('[data-testid="save-tier-button"]').click()
      
      cy.wait('@createWaiverTier')
      cy.get('[data-testid="success-toast"]').should('contain.text', 'Waiver tier created successfully')
    })
  })

  describe('Navigation and Integration', () => {
    it('should navigate between different fee config sections', () => {
      // Start at fee categories
      cy.visit('/admin/fbo-config/fee-categories')
      cy.get('[data-testid="page-title"]').should('contain.text', 'Fee Categories')
      
      // Navigate to fee rules
      cy.get('[data-testid="nav-fee-rules"]').click()
      cy.url().should('include', '/fee-rules')
      cy.get('[data-testid="page-title"]').should('contain.text', 'Fee Rules')
      
      // Navigate to mappings
      cy.get('[data-testid="nav-mappings"]').click()
      cy.url().should('include', '/mappings')
      cy.get('[data-testid="page-title"]').should('contain.text', 'Aircraft Mappings')
      
      // Navigate to waiver tiers
      cy.get('[data-testid="nav-waiver-tiers"]').click()
      cy.url().should('include', '/waiver-tiers')
      cy.get('[data-testid="page-title"]').should('contain.text', 'Waiver Tiers')
    })

    it('should maintain data consistency across sections', () => {
      // Create a fee category
      cy.visit('/admin/fbo-config/fee-categories')
      cy.intercept('POST', '/api/admin/fbo/1/fee-categories', {
        statusCode: 201,
        body: { id: 5, name: 'Test Category', fbo_location_id: 1 }
      }).as('createCategory')
      
      cy.get('[data-testid="add-category-button"]').click()
      cy.get('[data-testid="category-name-input"]').type('Test Category')
      cy.get('[data-testid="save-category-button"]').click()
      cy.wait('@createCategory')
      
      // Navigate to fee rules and verify the new category is available
      cy.get('[data-testid="nav-fee-rules"]').click()
      cy.get('[data-testid="add-rule-button"]').click()
      cy.get('[data-testid="fee-category-select"]').should('contain', 'Test Category')
    })

    it('should handle permission-based access', () => {
      // Mock permission check
      cy.intercept('GET', '/api/auth/me/permissions', {
        body: ['view_admin_panel', 'manage_fbo_fee_schedules']
      }).as('getPermissions')

      cy.visit('/admin/fbo-config/fee-categories')
      cy.wait('@getPermissions')
      
      // Should have access to all configuration sections
      cy.get('[data-testid="fee-config-nav"]').should('be.visible')
      cy.get('[data-testid="add-category-button"]').should('be.visible')
    })
  })
})

// Error boundary and loading state tests
describe('Admin Fee Configuration Error Handling', () => {
  beforeEach(() => {
    cy.visit('/admin/login')
    cy.get('[data-testid="email-input"]').type('admin@example.com')
    cy.get('[data-testid="password-input"]').type('password123')
    cy.get('[data-testid="login-button"]').click()
  })

  it('should handle network errors gracefully', () => {
    // Mock network failure
    cy.intercept('GET', '/api/admin/fbo/1/fee-categories', {
      forceNetworkError: true
    }).as('networkError')

    cy.visit('/admin/fbo-config/fee-categories')
    
    cy.get('[data-testid="error-message"]').should('contain.text', 'Failed to load fee categories')
    cy.get('[data-testid="retry-button"]').should('be.visible')
  })

  it('should show loading states', () => {
    // Mock slow response
    cy.intercept('GET', '/api/admin/fbo/1/fee-categories', {
      delay: 2000,
      body: []
    }).as('slowResponse')

    cy.visit('/admin/fbo-config/fee-categories')
    
    cy.get('[data-testid="loading-spinner"]').should('be.visible')
    cy.get('[data-testid="loading-text"]').should('contain.text', 'Loading fee categories...')
    
    cy.wait('@slowResponse')
    cy.get('[data-testid="loading-spinner"]').should('not.exist')
  })
}) 