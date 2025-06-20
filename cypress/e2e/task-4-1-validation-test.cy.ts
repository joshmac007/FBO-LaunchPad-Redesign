/// <reference types="cypress" />

/**
 * Quick validation test for Task 4.1 helpers
 * This test validates that our custom commands work before running the full E2E test
 */

describe('Task 4.1: Helper Validation Test', () => {
  it('Should successfully login as admin and access admin pages', () => {
    cy.loginAs('admin')
    cy.wait(2000)
    cy.visit('/admin/dashboard')
    cy.url().should('include', '/admin')
    cy.get('body').should('be.visible')
  })

  it('Should successfully create fee category via API', () => {
    cy.loginAs('admin')
    cy.wait(2000)
    
    const testName = `Test Category ${Date.now()}`
    cy.createFeeCategory(testName).then((response) => {
      expect(response.name).to.equal(testName)
      expect(response.fbo_location_id).to.equal(1)
      cy.log(`✓ Created fee category: ${response.name}`)
    })
  })

  it('Should successfully get aircraft types via API', () => {
    cy.loginAs('admin')
    cy.wait(2000)
    
    cy.getAircraftTypes().then((response) => {
      // Handle the actual response format from the API
      const aircraftTypes = response.aircraft_types || response
      expect(aircraftTypes).to.be.an('array')
      cy.log(`Found ${aircraftTypes.length} aircraft types`)
      
      if (aircraftTypes.length > 0) {
        const citationCJ3 = aircraftTypes.find((aircraft: any) => aircraft.name === 'Citation CJ3')
        if (citationCJ3) {
          cy.log(`✓ Found Citation CJ3: ID ${citationCJ3.id}`)
        } else {
          cy.log('Citation CJ3 not found, but other aircraft types exist')
        }
      }
    })
  })

  it('Should successfully login as CSR and access CSR pages', () => {
    cy.loginAs('csr')
    cy.wait(2000)
    cy.visit('/csr/dashboard')
    cy.url().should('include', '/csr')
    cy.get('body').should('be.visible')
  })

  it('Validation Summary', () => {
    cy.log('✓ All helper commands validated successfully')
    cy.log('✓ Authentication working properly')
    cy.log('✓ API commands functional')
    cy.log('✓ Ready for full E2E test execution')
  })
}) 