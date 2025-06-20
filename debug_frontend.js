// Frontend debugging script - simulates what the useRealtimeOrders hook is doing
const fetch = require('node-fetch');

async function debugFrontendFlow() {
  console.log('=== Frontend Debug Flow ===\n');
  
  try {
    // Step 1: Login (same as frontend would do)
    console.log('1. Logging in as fueler...');
    const loginResponse = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'fueler@fbolaunchpad.com',
        password: 'Fueler123!'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login status:', loginResponse.status);
    console.log('Login response:', loginData);
    
    if (!loginData.token) {
      console.error('❌ No token received');
      return;
    }
    
    console.log('✅ Login successful\n');
    
    // Step 2: Fetch fuel orders (same as useRealtimeOrders initial load)
    console.log('2. Fetching fuel orders (useRealtimeOrders initial load)...');
    const ordersResponse = await fetch('http://localhost:5001/api/fuel-orders', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    console.log('Orders API status:', ordersResponse.status);
    console.log('Orders API headers:', Object.fromEntries(ordersResponse.headers.entries()));
    
    if (!ordersResponse.ok) {
      const errorText = await ordersResponse.text();
      console.error('❌ Orders API failed');
      console.error('Status:', ordersResponse.status, ordersResponse.statusText);
      console.error('Error body:', errorText);
      return;
    }
    
    const ordersData = await ordersResponse.json();
    console.log('✅ Orders API successful');
    console.log('Orders data structure:', {
      type: typeof ordersData,
      keys: Object.keys(ordersData),
      hasOrders: Array.isArray(ordersData.orders),
      ordersCount: ordersData.orders ? ordersData.orders.length : 'N/A'
    });
    
    if (ordersData.orders && ordersData.orders.length > 0) {
      console.log('\nFirst order sample:');
      console.log(JSON.stringify(ordersData.orders[0], null, 2));
      
      // Step 3: Check order categorization (simulate reducer INITIAL_LOAD with corrected status values)
      console.log('\n3. Analyzing order categorization (CORRECTED STATUS VALUES)...');
      const userId = 3; // fueler user ID
      
      // Use corrected status values that match backend
      const availableOrders = ordersData.orders.filter(o => 
        o.status === 'Dispatched' && !o.assigned_to_id
      );
      const myQueue = ordersData.orders.filter(o => 
        ['Acknowledged'].includes(o.status) && o.assigned_to_id === userId
      );
      const inProgress = ordersData.orders.filter(o => 
        ['En Route', 'Fueling'].includes(o.status) && o.assigned_to_id === userId
      );
      const completedToday = ordersData.orders.filter(o => 
        o.status === 'Completed' && o.assigned_to_id === userId
      );
      
      console.log('Available Orders:', availableOrders.length, availableOrders.map(o => ({ id: o.id, status: o.status, assigned_to_id: o.assigned_to_id })));
      console.log('My Queue:', myQueue.length, myQueue.map(o => ({ id: o.id, status: o.status, assigned_to_id: o.assigned_to_id })));
      console.log('In Progress:', inProgress.length, inProgress.map(o => ({ id: o.id, status: o.status, assigned_to_id: o.assigned_to_id })));
      console.log('Completed Today:', completedToday.length, completedToday.map(o => ({ id: o.id, status: o.status, assigned_to_id: o.assigned_to_id })));
      
      if (availableOrders.length === 0) {
        console.log('\n⚠️  Still no available orders found!');
        console.log('Expected: status = "Dispatched" + assigned_to_id = null');
        console.log('Check database order statuses and assignments.');
      } else {
        console.log('\n✅ Available orders found! Should show in frontend.');
        console.log('Orders that should appear in "Available Orders" column:');
        availableOrders.forEach(order => {
          console.log(`  - Order ${order.id}: ${order.aircraft_registration} (${order.gallons_requested} gal ${order.fuel_type})`);
        });
      }
    } else {
      console.log('❌ No orders returned from API');
    }
    
  } catch (error) {
    console.error('❌ Debug flow failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugFrontendFlow(); 