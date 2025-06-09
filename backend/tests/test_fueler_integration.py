import pytest
import json
import threading
import time
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

from src.models.customer import Customer
from src.models.aircraft import Aircraft
from src.models.fuel_order import FuelOrder, FuelOrderStatus
from src.models.fuel_truck import FuelTruck
from src.models.user import User
from src.extensions import db


class TestFuelerIntegration:
    """Critical integration tests for the fueler system as specified in tasks.md"""
    
    def get_csr_headers(self, auth_headers):
        return auth_headers.get('customer', {})
    
    def get_lst_headers(self, auth_headers):
        return auth_headers.get('line', {})

    @pytest.fixture(scope='function')
    def test_fuel_order_for_claiming(self, app, db, test_csr_user, test_lst_user):
        """Create a test fuel order available for claiming."""
        with app.app_context():
            # Clean up any existing data
            db.session.query(FuelOrder).delete()
            db.session.query(Aircraft).delete()
            db.session.query(Customer).delete()
            db.session.query(FuelTruck).delete()
            db.session.commit()
            
            # Create test customer
            customer = Customer(
                name="Test Customer",
                email="test@example.com",
                phone="555-1234",
                is_placeholder=False
            )
            db.session.add(customer)
            
            # Create test aircraft
            aircraft = Aircraft(
                tail_number="N12345",
                aircraft_type="Cessna 172",
                fuel_type="100LL"
            )
            db.session.add(aircraft)
            
            # Create test fuel truck
            fuel_truck = FuelTruck(
                truck_number="T001",
                fuel_type="100LL",
                capacity=Decimal('1000.00'),
                current_meter_reading=Decimal('500.00'),
                is_active=True
            )
            db.session.add(fuel_truck)
            db.session.commit()
            
            # Create test fuel order in DISPATCHED status (available for claiming)
            fuel_order = FuelOrder(
                tail_number=aircraft.tail_number,
                customer_id=customer.id,
                fuel_type="100LL",
                requested_amount=Decimal('50.00'),
                assigned_truck_id=fuel_truck.id,
                location_on_ramp="A1",
                status=FuelOrderStatus.DISPATCHED,
                csr_notes="Test order for claiming"
            )
            db.session.add(fuel_order)
            db.session.commit()
            
            return fuel_order.id, fuel_truck.id

    @pytest.fixture(scope='function') 
    def test_in_progress_order(self, app, db, test_csr_user, test_lst_user):
        """Create a test fuel order in progress with an assigned fueler."""
        with app.app_context():
            # Clean up any existing data
            db.session.query(FuelOrder).delete()
            db.session.query(Aircraft).delete()
            db.session.query(Customer).delete()
            db.session.query(FuelTruck).delete()
            db.session.commit()
            
            # Create test customer
            customer = Customer(
                name="Test Customer",
                email="test@example.com", 
                phone="555-1234",
                is_placeholder=False
            )
            db.session.add(customer)
            
            # Create test aircraft
            aircraft = Aircraft(
                tail_number="N12345",
                aircraft_type="Cessna 172",
                fuel_type="100LL"
            )
            db.session.add(aircraft)
            
            # Create test fuel truck
            fuel_truck = FuelTruck(
                truck_number="T001",
                fuel_type="100LL",
                capacity=Decimal('1000.00'),
                current_meter_reading=Decimal('500.00'),
                is_active=True
            )
            db.session.add(fuel_truck)
            db.session.commit()
            
            # Create test fuel order in FUELING status (in progress)
            fuel_order = FuelOrder(
                tail_number=aircraft.tail_number,
                customer_id=customer.id,
                fuel_type="100LL",
                requested_amount=Decimal('50.00'),
                assigned_lst_user_id=test_lst_user.id,
                assigned_truck_id=fuel_truck.id,
                location_on_ramp="A1", 
                status=FuelOrderStatus.FUELING,
                start_meter_reading=Decimal('500.00'),
                csr_notes="Test order in progress"
            )
            db.session.add(fuel_order)
            db.session.commit()
            
            return fuel_order.id, fuel_truck.id

    def test_atomic_order_claiming_race_condition(self, client, auth_headers, test_fuel_order_for_claiming, test_lst_user):
        """
        Test Point: Atomic Order Claiming (Race Condition)
        Goal: Verify that two users cannot claim the same order.
        Test: First claim succeeds, second claim fails due to order already being assigned.
        Assert: First request receives 200 OK, second request receives 409 Conflict.
        """
        order_id, truck_id = test_fuel_order_for_claiming
        headers = self.get_lst_headers(auth_headers)
        
        # First claim attempt should succeed
        response1 = client.post(
            f'/api/fuel-orders/{order_id}/claim',
            headers=headers,
            content_type='application/json'
        )
        
        # Second claim attempt should fail (order already claimed)
        response2 = client.post(
            f'/api/fuel-orders/{order_id}/claim',
            headers=headers,
            content_type='application/json'
        )
        
        # Verify results: first should succeed (200), second should fail (409)
        assert response1.status_code == 200, f"First claim should succeed with 200 OK, got {response1.status_code}"
        assert response2.status_code == 409, f"Second claim should fail with 409 Conflict, got {response2.status_code}"
        
        # Verify response messages
        response1_data = response1.get_json()
        response2_data = response2.get_json()
        
        assert response1_data.get('message') == "Order claimed successfully"
        assert "already been claimed" in response2_data.get('error', '')

    def test_order_completion_truck_state_update_atomicity(self, client, auth_headers, test_in_progress_order, test_lst_user):
        """
        Test Point: Order Completion & Truck State Update (Atomicity)
        Goal: Verify that completing an order correctly updates the order and the fuel truck's meter in a single atomic transaction.
        Test: Call PUT /submit-data-atomic.
        Assert (FuelOrder): The order's status, gallons_dispensed, and meter readings are correct.
        Assert (FuelTruck): The truck's current_meter_reading is updated to the end_meter_reading.
        """
        order_id, truck_id = test_in_progress_order
        headers = self.get_lst_headers(auth_headers)
        
        start_meter = Decimal('500.00')
        end_meter = Decimal('560.50')
        expected_gallons = end_meter - start_meter
        
        completion_data = {
            "start_meter_reading": float(start_meter),
            "end_meter_reading": float(end_meter),
            "gallons_dispensed": float(expected_gallons),
            "completion_notes": "Test completion"
        }
        
        response = client.put(
            f'/api/fuel-orders/{order_id}/submit-data-atomic',
            headers=headers,
            data=json.dumps(completion_data),
            content_type='application/json'
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.get_json()}"
        
        # Verify FuelOrder was updated correctly
        fuel_order = FuelOrder.query.get(order_id)
        assert fuel_order is not None, "Fuel order should exist"
        assert fuel_order.status == FuelOrderStatus.COMPLETED, "Order status should be COMPLETED"
        assert fuel_order.gallons_dispensed == expected_gallons, f"Expected gallons {expected_gallons}, got {fuel_order.gallons_dispensed}"
        assert fuel_order.end_meter_reading == end_meter, f"Expected end meter {end_meter}, got {fuel_order.end_meter_reading}"
        assert fuel_order.completion_timestamp is not None, "Completion timestamp should be set"
        
        # Verify FuelTruck meter reading was updated atomically
        fuel_truck = FuelTruck.query.get(truck_id)
        assert fuel_truck is not None, "Fuel truck should exist"
        assert fuel_truck.current_meter_reading == end_meter, f"Expected truck meter {end_meter}, got {fuel_truck.current_meter_reading}"

    def test_csr_update_state_machine_data_integrity(self, client, auth_headers, test_in_progress_order, test_csr_user, test_lst_user):
        """
        Test Point: CSR Update State Machine (Data Integrity)
        Goal: Verify that an in-progress order cannot be modified by a fueler while a CSR change is pending.
        Test: Simulate the full workflow:
        1. Claim an order as a fueler.
        2. As a CSR, send a PATCH to /csr-update. Assert change_version is incremented.
        3. As the fueler, attempt to update the order's status. Assert this request fails with 409 Conflict.
        4. As the fueler, POST to /acknowledge-change with the correct change_version.
        5. Re-attempt the status update. Assert it now succeeds.
        """
        order_id, truck_id = test_in_progress_order
        csr_headers = self.get_csr_headers(auth_headers)
        lst_headers = self.get_lst_headers(auth_headers)
        
        # Get initial change_version
        initial_order = FuelOrder.query.get(order_id)
        initial_version = initial_order.change_version
        
        # Step 2: CSR updates the order
        csr_update_data = {
            "requested_amount": 75.0,
            "csr_notes": "Updated fuel amount per customer request"
        }
        
        response = client.patch(
            f'/api/fuel-orders/{order_id}/csr-update',
            headers=csr_headers,
            data=json.dumps(csr_update_data),
            content_type='application/json'
        )
        
        assert response.status_code == 200, f"CSR update failed: {response.get_json()}"
        
        # Verify change_version was incremented
        updated_order = FuelOrder.query.get(order_id)
        assert updated_order.change_version == initial_version + 1, "Change version should be incremented after CSR update"
        new_version = updated_order.change_version
        
        # Step 3: Fueler attempts to complete order without acknowledging CSR changes (should fail)
        completion_data = {
            "start_meter_reading": 500.0,
            "end_meter_reading": 575.0,
            "gallons_dispensed": 75.0,
            "completion_notes": "Attempting completion without acknowledging changes"
        }
        
        response = client.put(
            f'/api/fuel-orders/{order_id}/submit-data-atomic',
            headers=lst_headers,
            data=json.dumps(completion_data),
            content_type='application/json'
        )
        
        assert response.status_code == 409, f"Expected 409 Conflict, got {response.status_code}"
        response_data = response.get_json()
        assert "acknowledge" in response_data.get('error', '').lower(), "Error should mention need to acknowledge changes"
        
        # Step 4: Fueler acknowledges CSR changes
        acknowledge_data = {
            "change_version": new_version
        }
        
        response = client.post(
            f'/api/fuel-orders/{order_id}/acknowledge-change',
            headers=lst_headers,
            data=json.dumps(acknowledge_data),
            content_type='application/json'
        )
        
        assert response.status_code == 200, f"Acknowledge changes failed: {response.get_json()}"
        
        # Step 5: Re-attempt the completion (should now succeed)
        response = client.put(
            f'/api/fuel-orders/{order_id}/submit-data-atomic',
            headers=lst_headers,
            data=json.dumps(completion_data),
            content_type='application/json'
        )
        
        assert response.status_code == 200, f"Order completion should succeed after acknowledgment: {response.get_json()}"
        
        # Verify order was completed successfully
        final_order = FuelOrder.query.get(order_id)
        assert final_order.status == FuelOrderStatus.COMPLETED, "Order should be completed"

    def test_server_side_validation_invalid_meter_readings(self, client, auth_headers, test_in_progress_order):
        """
        Test Point: Server-Side Validation
        Goal: Verify the API rejects invalid data.
        Test: Send a request to PUT /submit-data-atomic where end_meter_reading < start_meter_reading.
        Assert: The API returns a 400 Bad Request.
        """
        order_id, truck_id = test_in_progress_order
        headers = self.get_lst_headers(auth_headers)
        
        # Get the current start meter reading
        fuel_order = FuelOrder.query.get(order_id)
        start_meter = fuel_order.start_meter_reading
        
        # Send invalid data: end_meter_reading < start_meter_reading
        invalid_completion_data = {
            "end_meter_reading": float(start_meter) - 10.0,  # Invalid: less than start
            "gallons_dispensed": 50.0,
            "completion_notes": "Invalid completion attempt"
        }
        
        response = client.put(
            f'/api/fuel-orders/{order_id}/submit-data-atomic',
            headers=headers,
            data=json.dumps(invalid_completion_data),
            content_type='application/json'
        )
        
        assert response.status_code == 400, f"Expected 400 Bad Request, got {response.status_code}"
        
        response_data = response.get_json()
        assert 'error' in response_data, "Response should contain error message"
        
        # Verify the error message mentions meter reading validation
        error_message = response_data['error'].lower()
        assert any(term in error_message for term in ['meter', 'reading', 'invalid', 'greater']), \
            f"Error should mention meter reading validation: {response_data['error']}"
        
        # Verify order status was not changed
        fuel_order = FuelOrder.query.get(order_id)
        assert fuel_order.status == FuelOrderStatus.FUELING, "Order status should remain unchanged after validation failure"

    def test_server_side_validation_missing_required_fields(self, client, auth_headers, test_in_progress_order):
        """
        Additional validation test: Verify API rejects completion data missing required fields.
        """
        order_id, truck_id = test_in_progress_order
        headers = self.get_lst_headers(auth_headers)
        
        # Send incomplete data: missing end_meter_reading
        incomplete_data = {
            "gallons_dispensed": 50.0,
            "completion_notes": "Incomplete data test"
            # Missing end_meter_reading
        }
        
        response = client.put(
            f'/api/fuel-orders/{order_id}/submit-data-atomic',
            headers=headers,
            data=json.dumps(incomplete_data),
            content_type='application/json'
        )
        
        assert response.status_code == 400, f"Expected 400 Bad Request for missing fields, got {response.status_code}"
        
        response_data = response.get_json()
        assert 'error' in response_data, "Response should contain error message for missing fields"

    def test_concurrent_claim_attempts_with_thread_pool(self, client, auth_headers, test_fuel_order_for_claiming):
        """
        Enhanced race condition test using ThreadPoolExecutor for more controlled concurrent execution.
        """
        order_id, truck_id = test_fuel_order_for_claiming
        headers = self.get_lst_headers(auth_headers)
        
        def attempt_claim():
            """Thread function to attempt claiming the order"""
            try:
                response = client.post(
                    f'/api/fuel-orders/{order_id}/claim',
                    headers=headers,
                    content_type='application/json'
                )
                return {
                    'status_code': response.status_code,
                    'response_data': response.get_json() if response.status_code != 500 else None,
                    'timestamp': time.time()
                }
            except Exception as e:
                return {
                    'status_code': 500,
                    'error': str(e),
                    'timestamp': time.time()
                }
        
        # Use ThreadPoolExecutor for more controlled concurrent execution
        with ThreadPoolExecutor(max_workers=5) as executor:
            # Submit 5 concurrent claim attempts
            futures = [executor.submit(attempt_claim) for _ in range(5)]
            
            # Collect all results
            results = [future.result() for future in futures]
        
        # Analyze results
        success_count = sum(1 for r in results if r['status_code'] == 200)
        conflict_count = sum(1 for r in results if r['status_code'] == 409)
        
        assert len(results) == 5, "Should have exactly 5 results"
        assert success_count == 1, f"Exactly one claim should succeed, got {success_count}"
        assert conflict_count >= 1, f"At least one claim should be rejected as conflict, got {conflict_count}"
        
        # Verify the order was actually claimed by checking the database
        claimed_order = FuelOrder.query.get(order_id)
        assert claimed_order.assigned_lst_user_id is not None, "Order should have an assigned fueler"
        assert claimed_order.status in [FuelOrderStatus.DISPATCHED, FuelOrderStatus.ACKNOWLEDGED, FuelOrderStatus.EN_ROUTE], "Order should be in claimed status" 