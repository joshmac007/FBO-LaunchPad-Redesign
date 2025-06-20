// Custom commands for User Management testing

// Login command
Cypress.Commands.add('login', (email = Cypress.env('adminEmail'), password = Cypress.env('adminPassword')) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/login`,
    body: {
      email: email,
      password: password
    }
  }).then((response) => {
    window.localStorage.setItem('authToken', response.body.access_token)
    window.localStorage.setItem('userRole', response.body.user.role)
  })
})

// Visit admin page with authentication
Cypress.Commands.add('visitAdminUsersPage', () => {
  cy.login()
  cy.visit('/admin/users')
})

// Create user via UI
Cypress.Commands.add('createUserViaUI', (userData) => {
  cy.get('button:contains("Add User")').click()
  
  cy.get('input[name="name"]').type(userData.name)
  cy.get('input[name="email"]').type(userData.email)
  cy.get('input[name="password"]').type(userData.password)
  
  if (userData.role) {
    cy.get('select[name="role"]').select(userData.role)
  }
  
  if (userData.status) {
    cy.get('select[name="status"]').select(userData.status)
  }
  
  cy.get('button:contains("Create User")').click()
})

// Edit user via UI
Cypress.Commands.add('editUserViaUI', (userId, updateData) => {
  cy.get(`[data-user-id="${userId}"] button:contains("Edit")`)
    .or(`.user-row:contains("${userId}") button`)
    .click()
  
  if (updateData.name) {
    cy.get('input[name="name"]').clear().type(updateData.name)
  }
  
  if (updateData.email) {
    cy.get('input[name="email"]').clear().type(updateData.email)
  }
  
  if (updateData.role) {
    cy.get('select[name="role"]').select(updateData.role)
  }
  
  if (updateData.status) {
    cy.get('select[name="status"]').select(updateData.status)
  }
  
  cy.get('button:contains("Save Changes")').click()
})

// Wait for API requests to complete
Cypress.Commands.add('waitForUserLoad', () => {
  cy.get('[data-testid="users-loading"]', { timeout: 10000 }).should('not.exist')
  cy.get('td:contains("Loading users...")', { timeout: 10000 }).should('not.exist')
})

Cypress.Commands.add('waitForRoleLoad', () => {
  cy.get('button:contains("Add User")').should('not.be.disabled')
  cy.get('select:contains("Loading roles...")').should('not.exist')
})

// Check for toast messages
Cypress.Commands.add('checkToast', (message, type = 'success') => {
  cy.get('.toast')
    .or(`[data-testid="${type}-message"]`)
    .should('contain', message)
    .and('be.visible')
})

// Setup API intercepts for consistent testing
Cypress.Commands.add('setupAPIIntercepts', () => {
  // Default successful responses
  cy.intercept('GET', '**/api/admin/roles/', { fixture: 'roles.json' }).as('getRoles')
  cy.intercept('GET', '**/api/admin/users/', { fixture: 'users.json' }).as('getUsers')
  
  // Success responses for CRUD operations
  cy.intercept('POST', '**/api/admin/users/', {
    statusCode: 201,
    body: { message: 'User created successfully', user: { id: 999 } }
  }).as('createUser')
  
  cy.intercept('PATCH', '**/api/admin/users/*', {
    statusCode: 200,
    body: { message: 'User updated successfully' }
  }).as('updateUser')
  
  cy.intercept('DELETE', '**/api/admin/users/*', {
    statusCode: 200,
    body: { message: 'User deleted successfully' }
  }).as('deleteUser')
})

// Verify dynamic role functionality
Cypress.Commands.add('verifyDynamicRoles', () => {
  cy.get('button:contains("Add User")').click()
  
  // Check that roles dropdown is populated from API
  cy.get('select[name="role"] option').should('have.length.greaterThan', 1)
  
  // Verify it contains expected roles from fixture
  cy.get('select[name="role"]').should('contain', 'Admin')
  cy.get('select[name="role"]').should('contain', 'CSR')
  cy.get('select[name="role"]').should('contain', 'Manager')
  
  cy.get('button:contains("Cancel")').click()
})

// Verify admin endpoint usage
Cypress.Commands.add('verifyAdminEndpointUsage', () => {
  // This will be called when editing a user to verify the admin endpoint is used
  cy.intercept('GET', '**/api/admin/users/*', {
    body: {
      user: { id: 1, name: 'Test User', email: 'test@example.com', roles: ['Admin'] }
    }
  }).as('getAdminUserDetail')
  
  // Click edit on first user
  cy.get('button[aria-label="User actions"]').first().click()
  cy.get('button:contains("Edit")').click()
  
  // Verify the admin endpoint was called
  cy.wait('@getAdminUserDetail')
  
  // Verify edit dialog opens with data
  cy.get('input[name="name"]').should('have.value', 'Test User')
}) 