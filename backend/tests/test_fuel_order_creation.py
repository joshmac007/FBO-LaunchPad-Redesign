import pytest
import json
from decimal import Decimal
from src.models import FuelOrder, FuelOrderStatus # For potential deeper assertions

def test_create_fuel_order_endpoint(client, db_session, auth_headers, test_aircraft, test_fuel_truck, test_lst_user, test_csr_user):
    """
    Test the POST /api/fuel-orders endpoint for successful order creation.

    This test specifically targets the endpoint that has been causing 404/CORS/redirect
    issues. It uses a valid payload and authentication for a user expected
    to have 'CREATE_ORDER' permission (CSR).

    Expected Behavior Stages:
    1. CURRENT STATE (Decorators commented out): Should fail, likely with 500
       Internal Server Error in the backend logs (due to missing g.current_user
       if the routing/CORS issue is fixed) or potentially still a client-side
       network error if the OPTIONS preflight issue persists.
    2. AFTER FIX (Decorators restored, routing fixed): Should pass with 201 Created.
    """
    # Arrange: Get CSR auth headers and required IDs
    # Ensure the key matches how roles are mapped in auth_headers fixture (conftest.py)
    # Common patterns: 'csr', 'customer service representative', 'customer'
    csr_headers = auth_headers.get('customer') # Adjust key if needed based on conftest.py
    if not csr_headers:
         # Try another common key if the first failed
         csr_headers = auth_headers.get('csr')
         if not csr_headers:
              pytest.fail("CSR auth headers not found in fixture. Check role key in conftest.py auth_headers.")

    # Ensure dependent fixtures exist
    assert test_lst_user is not None, "LST user fixture failed"
    assert test_fuel_truck is not None, "Fuel truck fixture failed"
    assert test_aircraft is not None, "Aircraft fixture failed"

    lst_user_id = test_lst_user.id
    truck_id = test_fuel_truck.id
    tail_number = test_aircraft.tail_number

    # Construct a valid payload matching FuelOrderCreateRequestSchema
    payload = {
        "tail_number": tail_number,
        "fuel_type": "Jet A",
        "assigned_lst_user_id": lst_user_id,
        "assigned_truck_id": truck_id,
        "location_on_ramp": "Hangar 1",
        "requested_amount": 150.75,  # Use float, not string
        "additive_requested": False,
        "csr_notes": "Pytest direct endpoint test"
        # customer_id is optional
    }

    # Act: Send the POST request to the specific endpoint
    # Using the path *with* trailing slash, as expected by the blueprint registration
    endpoint_url = '/api/fuel-orders/'
    response = client.post(endpoint_url, headers=csr_headers, json=payload)

    # --- Debugging Output ---
    print(f"\n--- Test: test_create_fuel_order_endpoint ---")
    print(f"Request URL: POST {endpoint_url}")
    print(f"Request Payload: {json.dumps(payload)}")
    print(f"Response Status Code: {response.status_code}")
    response_text = response.data.decode()
    try:
        # Try to parse as JSON for cleaner logging
        print(f"Response JSON: {json.loads(response_text)}")
    except json.JSONDecodeError:
        print(f"Response Text: {response_text}")
    print(f"--- End Test ---")
    # --- End Debugging Output ---


    # Assert: Check for successful creation (201)
    # This assertion will likely fail until the root cause is fixed AND decorators restored.
    assert response.status_code == 201, f"Expected status code 201, but got {response.status_code}."

    # Optional: Assert response content upon success
    if response.status_code == 201:
        data = response.get_json()
        assert data is not None, "Response data should be valid JSON on 201 success"
        assert data.get("message") == "Fuel order created successfully"
        assert "fuel_order" in data
        assert data["fuel_order"]["tail_number"] == tail_number
        assert data["fuel_order"]["assigned_lst_user_id"] == lst_user_id
        assert data["fuel_order"]["status"] == FuelOrderStatus.DISPATCHED.value # Check initial status