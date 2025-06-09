/// <reference types="cypress" />

describe('Debug API Calls', () => {
  it('should debug authentication and API calls step by step', () => {
    // Step 1: Visit a page first to establish window context
    cy.visit('/');
    
    // Step 2: Login directly via API (most reliable)
    cy.request({
      method: 'POST',
      url: 'http://localhost:5001/api/auth/login',
      body: {
        email: 'fueler@fbolaunchpad.com',
        password: 'Fueler123!'
      }
    }).then((response) => {
      cy.log('Login API Response:', response.body);
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('token');
      expect(response.body).to.have.property('user');
      
      // Store user data in localStorage in the same format as the frontend
      const enhancedUser = {
        ...response.body.user,
        access_token: response.body.token,
        isLoggedIn: true,
        permissions: [],
        effective_permissions: {},
        permission_summary: {
          total_permissions: 0,
          by_source: { direct: [], groups: [], roles: [] },
          by_category: {},
          resource_specific: []
        }
      };
      
      cy.window().then((win) => {
        win.localStorage.setItem('fboUser', JSON.stringify(enhancedUser));
        cy.log('Stored user data:', enhancedUser);
        
        // Verify the data was stored
        const stored = win.localStorage.getItem('fboUser');
        cy.log('Verified stored data:', stored);
        expect(stored).to.not.be.null;
      });
    });
    
    // Step 3: Wait a moment for localStorage to be properly set
    cy.wait(1000);
    
    // Step 4: Visit the dashboard
    cy.visit('/fueler/dashboard');
    
    // Step 5: Wait for dashboard to load
    cy.url().should('include', '/fueler/dashboard');
    
    // Step 6: Check if we have user data in localStorage
    cy.window().then((win) => {
      const userData = win.localStorage.getItem('fboUser');
      cy.log('User data from localStorage:', userData);
      expect(userData).to.not.be.null;
      
      if (userData) {
        const user = JSON.parse(userData);
        cy.log('Parsed user:', user);
        expect(user).to.have.property('access_token');
        expect(user.access_token).to.be.a('string');
        expect(user.access_token.length).to.be.greaterThan(0);
      }
    });
    
    // Step 7: Make a direct API call to test the endpoint
    cy.window().then((win) => {
      const userData = win.localStorage.getItem('fboUser');
      let token = null;
      if (userData) {
        const user = JSON.parse(userData);
        token = user.access_token;
      }
      
      cy.request({
        method: 'GET',
        url: 'http://localhost:5001/api/fuel-orders',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }).then((response) => {
        cy.log('API Response:', response);
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('orders');
        expect(response.body.orders).to.be.an('array');
        
        // Log the number of orders and their statuses
        cy.log(`Found ${response.body.orders.length} orders`);
        response.body.orders.forEach((order: any) => {
          cy.log(`Order ${order.id}: status=${order.status}, assigned_to_id=${order.assigned_to_id}`);
        });
        
        // Check for available orders
        const availableOrders = response.body.orders.filter((o: any) => 
          o.status === 'Dispatched' && !o.assigned_to_id
        );
        cy.log(`Available orders: ${availableOrders.length}`);
        
        expect(availableOrders.length).to.be.greaterThan(0);
      });
    });
    
    // Step 8: Check if order cards are actually in the DOM
    cy.get('body').then(($body) => {
      // Log the entire DOM structure for debugging
      cy.log('Page HTML:', $body.html().substring(0, 2000));
    });
    
    // Step 9: Look for kanban columns
    cy.get('[data-cy="kanban-column-available"]').should('be.visible');
    
    // Step 10: Wait a bit and check for order cards
    cy.wait(5000); // Give time for API call to complete
    
    // Step 11: Check WebSocket connection status
    cy.window().then((win) => {
      // Monitor WebSocket connections
      cy.log('Checking WebSocket connections...');
      
      // Add event listeners to capture WebSocket events
      const originalWebSocket = win.WebSocket;
      let wsInstance: WebSocket | null = null;
      
      // Override WebSocket constructor to capture connection attempts
      win.WebSocket = class extends originalWebSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
          super(url, protocols);
          wsInstance = this;
          cy.log(`WebSocket connection attempt to: ${url}`);
          
          this.addEventListener('open', () => {
            cy.log('WebSocket connection opened successfully');
          });
          
          this.addEventListener('close', (event) => {
            cy.log(`WebSocket connection closed: code=${event.code}, reason=${event.reason}`);
          });
          
          this.addEventListener('error', (event) => {
            cy.log('WebSocket connection error:', event);
          });
          
          this.addEventListener('message', (event) => {
            cy.log('WebSocket message received:', event.data);
          });
        }
      };
      
      // Restore original WebSocket after test
      cy.wrap(null).then(() => {
        setTimeout(() => {
          win.WebSocket = originalWebSocket;
        }, 10000);
      });
    });
    
    // Step 12: Wait for WebSocket connection and check console errors
    cy.wait(3000);
    
    // Step 13: Check browser console for errors
    cy.window().then((win) => {
      // Check if there are any console errors
      const errors: string[] = [];
      const originalConsoleError = win.console.error;
      
      win.console.error = (...args: any[]) => {
        const errorMessage = args.join(' ');
        errors.push(errorMessage);
        cy.log('Console Error:', errorMessage);
        originalConsoleError.apply(win.console, args);
      };
      
      setTimeout(() => {
        win.console.error = originalConsoleError;
        if (errors.length > 0) {
          cy.log(`Found ${errors.length} console errors`);
          errors.forEach(error => cy.log('Error:', error));
        } else {
          cy.log('No console errors detected');
        }
      }, 2000);
    });
    
    // Step 14: Check connection status indicator if it exists
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="connection-status"]').length > 0) {
        cy.get('[data-cy="connection-status"]').then(($status) => {
          cy.log('Connection status element found:', $status.text());
        });
      } else {
        cy.log('No connection status indicator found');
      }
    });
    
    // Step 15: Check if any order cards exist
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy^="order-card-"]').length > 0) {
        cy.log('Order cards found in DOM');
        cy.get('[data-cy^="order-card-"]').should('have.length.greaterThan', 0);
      } else {
        cy.log('No order cards found in DOM');
        // Check for loading states or error messages
        if ($body.find('[data-testid="loading"]').length > 0) {
          cy.log('Loading state detected');
        }
        if ($body.find('[data-testid="error"]').length > 0) {
          cy.log('Error state detected');
        }
      }
    });
  });
}); 