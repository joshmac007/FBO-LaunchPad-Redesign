// Debug script to test the API and see what data is returned
const fetch = require('node-fetch');

async function debugAPI() {
  try {
    // Login first
    console.log('1. Logging in...');
    const loginResponse = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'fueler@fbolaunchpad.com',
        password: 'Fueler123!'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);
    
    if (!loginData.token) {
      console.error('No token received');
      return;
    }
    
    // Get fuel orders
    console.log('\n2. Fetching fuel orders...');
    const ordersResponse = await fetch('http://localhost:5001/api/fuel-orders', {
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const ordersData = await ordersResponse.json();
    console.log('Orders response status:', ordersResponse.status);
    console.log('Orders data:', JSON.stringify(ordersData, null, 2));
    
    // Analyze the data structure
    if (Array.isArray(ordersData)) {
      console.log(`\n3. Found ${ordersData.length} orders`);
      ordersData.forEach((order, index) => {
        console.log(`Order ${index + 1}:`, {
          id: order.id,
          status: order.status,
          assigned_to_id: order.assigned_to_id,
          assigned_lst_user_id: order.assigned_lst_user_id,
          tail_number: order.tail_number,
          aircraft_registration: order.aircraft_registration
        });
      });
      
      // Check which orders would appear in Available Orders
      const availableOrders = ordersData.filter(o => o.status === 'DISPATCHED' && !o.assigned_to_id);
      console.log(`\n4. Available orders (DISPATCHED & no assigned_to_id): ${availableOrders.length}`);
      availableOrders.forEach(order => {
        console.log(`  - Order ${order.id}: ${order.tail_number} (status: ${order.status})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugAPI(); 