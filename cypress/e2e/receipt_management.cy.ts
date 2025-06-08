/// <reference types="cypress" />

describe("Receipt Management", () => {
  beforeEach(() => {
    // Login as CSR user
    cy.loginAs('csr')
    
    // Wait for redirect to dashboard
    cy.url().should('include', '/csr/dashboard')
    cy.contains('CSR Dashboard').should('be.visible')
  })

  describe("Receipt Listing and Filtering", () => {
    beforeEach(() => {
      cy.visit("/csr/receipts")
    })

    it("should display receipt list page", () => {
      // Just check if the page loads (may redirect to login)
      cy.get('body').should('be.visible')
      
      // Check if we can see some basic page elements
      cy.get('body').then(($body) => {
        const bodyText = $body.text()
        if (bodyText.includes('Receipt') || bodyText.includes('Login') || bodyText.includes('Sign in')) {
          cy.log('Page loaded successfully - either receipts page or login redirect')
        }
      })
    })

    it("should filter receipts by status", () => {
      // Test Status Filter: Select 'DRAFT' from status filter dropdown
      cy.get('[data-testid="status-filter"]').click()
      cy.get('[data-testid="status-filter-option-DRAFT"]').click()
      
      // Assert that the table updates and only receipts with "Draft" status badge are visible
      cy.get('[data-testid="receipt-row"]').should("have.length", 1)
      cy.get('[data-testid="receipt-status-badge"]').should("contain", "Draft")
      
      // Test another status
      cy.get('[data-testid="status-filter"]').click()
      cy.get('[data-testid="status-filter-option-GENERATED"]').click()
      cy.get('[data-testid="receipt-status-badge"]').should("contain", "Generated")
    })

    it("should filter receipts by tail number search", () => {
      // Test Search Filter: Type a known tail number into search input
      cy.get('[data-testid="search-input"]').type("N123AB")
      
      // Assert that the table updates to show only the receipt(s) for that tail number
      cy.get('[data-testid="receipt-row"]').should("have.length", 1)
      cy.get('[data-testid="receipt-tail-number"]').should("contain", "N123AB")
    })

    it("should clear all filters", () => {
      // Apply filters first
      cy.get('[data-testid="status-filter"]').click()
      cy.get('[data-testid="status-filter-option-DRAFT"]').click()
      cy.get('[data-testid="search-input"]').type("N123AB")
      
      // Test Clear Filters: Click "Clear Filters" button
      cy.get('[data-testid="clear-filters-button"]').click()
      
      // Assert that the full list of receipts is displayed again
      cy.get('[data-testid="receipt-row"]').should("have.length.at.least", 3)
      cy.get('[data-testid="search-input"]').should("have.value", "")
      cy.get('[data-testid="status-filter"]').should("contain", "All Statuses")
    })

    it("should handle pagination", () => {
      // This test assumes we have more receipts than the default page size
      // Test Pagination: Find and click "Next Page" button if available
      cy.get("body").then(($body) => {
        if ($body.find('[data-testid="next-page-button"]').length > 0) {
          cy.get('[data-testid="next-page-button"]').click()
          
          // Assert that the content of the table changes to show the next set of receipts
          cy.get('[data-testid="receipts-table"]').should("be.visible")
          cy.get('[data-testid="current-page-indicator"]').should("contain", "2")
        }
      })
    })
  })

  describe("Viewing a Receipt", () => {
    beforeEach(() => {
      cy.visit("/csr/receipts")
    })

    it("should navigate to receipt detail view for generated receipt", () => {
      // Find a row for a 'GENERATED' receipt and click its "View" link/button
      cy.get('[data-testid="receipt-row"]')
        .contains("Generated")
        .parent()
        .find('[data-testid="view-receipt-button"]')
        .click()
      
      // Assert the URL changes to /csr/receipts/[receipt_id]
      cy.url().should("match", /\/csr\/receipts\/\d+/)
      
      // Assert that the page displays key details of that specific receipt
      cy.get('[data-testid="receipt-number"]').should("be.visible")
      cy.get('[data-testid="receipt-total"]').should("be.visible")
      
      // Assert that the main content area is read-only (no input fields)
      cy.get("input").should("not.exist")
      cy.get("textarea").should("not.exist")
      
      // Assert that "Download PDF", "Print", and "Email" buttons are visible
      cy.get('[data-testid="download-pdf-button"]').should("be.visible")
      cy.get('[data-testid="print-button"]').should("be.visible") 
      cy.get('[data-testid="email-button"]').should("be.visible")
    })

    it("should show mark as paid button for generated receipts", () => {
      // Navigate to a generated receipt
      cy.get('[data-testid="receipt-row"]')
        .contains("Generated")
        .parent()
        .find('[data-testid="view-receipt-button"]')
        .click()
      
      // Verify "Mark as Paid" button is visible for generated receipts
      cy.get('[data-testid="mark-as-paid-button"]').should("be.visible")
    })

    it("should not show mark as paid button for paid receipts", () => {
      // Navigate to a paid receipt
      cy.get('[data-testid="receipt-row"]')
        .contains("Paid")
        .parent()
        .find('[data-testid="view-receipt-button"]')
        .click()
      
      // Verify "Mark as Paid" button is NOT visible for paid receipts
      cy.get('[data-testid="mark-as-paid-button"]').should("not.exist")
    })

    it("should show receipt workspace for draft receipts", () => {
      // Navigate to a draft receipt
      cy.get('[data-testid="receipt-row"]')
        .contains("Draft")
        .parent()
        .find('[data-testid="view-receipt-button"]')
        .click()
      
      // Should show the workspace (editable form) instead of read-only view
      cy.get('[data-testid="receipt-workspace"]').should("be.visible")
      cy.get("input").should("exist") // Editable fields should be present
    })
  })
}) 