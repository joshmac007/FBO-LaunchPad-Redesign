import pytest
import json
from decimal import Decimal
from datetime import datetime

from src.models.customer import Customer
from src.models.aircraft import Aircraft
from src.models.fuel_order import FuelOrder, FuelOrderStatus
from src.models.fuel_truck import FuelTruck
from src.models.audit_log import AuditLog
from src.models.user import User
from src.models.receipt import Receipt, ReceiptStatus
from src.extensions import db


class TestManualStatusUpdateAPI:
    """Test class for manual status update functionality with auditing."""
    
    def get_csr_headers(self, auth_headers):
        return auth_headers.get('customer', {})
    
    def get_admin_headers(self, auth_headers):
        return auth_headers.get('administrator', {})
    
    def get_lst_headers(self, auth_headers):
        return auth_headers.get('line', {})

    @pytest.fixture(scope='function')
    def test_fuel_order(self, app, db, test_csr_user, test_lst_user):
        """Create a test fuel order for status update testing."""
        with app.app_context():
            # Clean up any existing data
            db.session.query(AuditLog).delete()
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
            
            # Create test fuel order
            fuel_order = FuelOrder(
                tail_number=aircraft.tail_number,
                customer_id=customer.id,
                fuel_type="100LL",
                requested_amount=Decimal('50.00'),
                assigned_lst_user_id=test_lst_user.id,
                assigned_truck_id=fuel_truck.id,
                location_on_ramp="A1",
                status=FuelOrderStatus.DISPATCHED,
                csr_notes="Initial order"
            )
            db.session.add(fuel_order)
            db.session.commit()
            
            # Store the ID and truck ID before the object becomes detached
            fuel_order_id = fuel_order.id
            truck_id = fuel_order.assigned_truck_id
            
            # Return a simple object with the needed attributes
            class TestFuelOrderData:
                def __init__(self, id, assigned_truck_id):
                    self.id = id
                    self.assigned_truck_id = assigned_truck_id
            
            return TestFuelOrderData(fuel_order_id, truck_id)

    def test_csr_can_update_status_to_completed_with_meter_readings(self, client, auth_headers, test_fuel_order, test_csr_user):
        """Test CSR can update fuel order status to COMPLETED with meter readings."""
        headers = self.get_csr_headers(auth_headers)
        
        payload = {
            "status": "COMPLETED",
            "start_meter_reading": 1000.0,
            "end_meter_reading": 1150.5
        }
        
        response = client.patch(
            f'/api/fuel-orders/{test_fuel_order.id}/status',
            headers=headers,
            data=json.dumps(payload),
            content_type='application/json'
        )
        
        assert response.status_code == 200
        
        # Verify the response contains updated order
        response_data = response.get_json()
        assert response_data['fuel_order']['status'] == 'Completed'
        
        # Verify database was updated
        updated_order = FuelOrder.query.get(test_fuel_order.id)
        assert updated_order.status == FuelOrderStatus.COMPLETED
        assert updated_order.start_meter_reading == Decimal('1000.0')
        assert updated_order.end_meter_reading == Decimal('1150.5')
        assert updated_order.completion_timestamp is not None
        
        # Verify audit log was created
        audit_log = AuditLog.query.filter_by(
            entity_type='FuelOrder',
            entity_id=test_fuel_order.id,
            action='MANUAL_STATUS_UPDATE'
        ).first()
        
        assert audit_log is not None
        assert audit_log.user_id == test_csr_user.id
        assert audit_log.details['previous_status'] == 'Dispatched'
        assert audit_log.details['new_status'] == 'Completed'

    def test_csr_can_update_status_to_cancelled(self, client, auth_headers, test_fuel_order, test_csr_user):
        """Test CSR can update fuel order status to CANCELLED with reason."""
        headers = self.get_csr_headers(auth_headers)
        
        payload = {
            "status": "CANCELLED", 
            "reason": "Customer request"
        }
        
        response = client.patch(
            f'/api/fuel-orders/{test_fuel_order.id}/status',
            headers=headers,
            data=json.dumps(payload),
            content_type='application/json'
        )
        
        assert response.status_code == 200
        
        # Verify the response
        response_data = response.get_json()
        assert response_data['fuel_order']['status'] == 'Cancelled'
        
        # Verify database was updated
        updated_order = FuelOrder.query.get(test_fuel_order.id)
        assert updated_order.status == FuelOrderStatus.CANCELLED
        
        # Verify audit log was created with reason
        audit_log = AuditLog.query.filter_by(
            entity_type='FuelOrder',
            entity_id=test_fuel_order.id,
            action='MANUAL_STATUS_UPDATE'
        ).first()
        
        assert audit_log is not None
        assert audit_log.user_id == test_csr_user.id
        assert audit_log.details['previous_status'] == 'Dispatched'
        assert audit_log.details['new_status'] == 'Cancelled'
        assert audit_log.details['reason'] == 'Customer request'

    def test_user_without_permission_cannot_update_status(self, client, auth_headers, test_fuel_order):
        """Test user without edit_fuel_order permission cannot update status."""
        # Use LST headers (LST should not have edit_fuel_order permission by default)
        headers = self.get_lst_headers(auth_headers)
        
        payload = {
            "status": "COMPLETED",
            "assigned_truck_id": test_fuel_order.assigned_truck_id
        }
        
        response = client.patch(
            f'/api/fuel-orders/{test_fuel_order.id}/status',
            headers=headers,
            data=json.dumps(payload),
            content_type='application/json'
        )
        
        assert response.status_code == 403

    def test_update_with_invalid_status_string_fails(self, client, auth_headers, test_fuel_order):
        """Test update with invalid status string fails."""
        headers = self.get_csr_headers(auth_headers)
        
        payload = {
            "status": "INVALID_STATUS",
            "assigned_truck_id": test_fuel_order.assigned_truck_id
        }
        
        response = client.patch(
            f'/api/fuel-orders/{test_fuel_order.id}/status',
            headers=headers,
            data=json.dumps(payload),
            content_type='application/json'
        )
        
        assert response.status_code == 400

    def test_update_to_completed_without_meter_readings_fails(self, client, auth_headers, test_fuel_order):
        """Test update to COMPLETED status without meter readings fails."""
        headers = self.get_csr_headers(auth_headers)
        
        payload = {
            "status": "COMPLETED",
            "assigned_truck_id": test_fuel_order.assigned_truck_id
            # Missing start_meter_reading and end_meter_reading
        }
        
        response = client.patch(
            f'/api/fuel-orders/{test_fuel_order.id}/status',
            headers=headers,
            data=json.dumps(payload),
            content_type='application/json'
        )
        
        # This should fail since COMPLETED status requires meter readings
        # Note: The current implementation might not have this validation yet
        # This test documents the expected behavior once we implement the service layer
        assert response.status_code == 400

    def test_get_fuel_order_statuses_returns_valid_list(self, client, auth_headers):
        """Test GET /api/fuel-orders/statuses returns valid status list."""
        headers = self.get_csr_headers(auth_headers)
        
        response = client.get(
            '/api/fuel-orders/statuses',
            headers=headers
        )
        
        assert response.status_code == 200
        
        response_data = response.get_json()
        assert isinstance(response_data, list)
        
        # Verify all FuelOrderStatus values are present
        expected_statuses = [status.value for status in FuelOrderStatus]
        for status in expected_statuses:
            assert status in response_data

    def test_update_nonexistent_fuel_order_returns_404(self, client, auth_headers):
        """Test updating a non-existent fuel order returns 404."""
        headers = self.get_csr_headers(auth_headers)
        
        payload = {
            "status": "COMPLETED"
        }
        
        response = client.patch(
            '/api/fuel-orders/99999/status',
            headers=headers,
            data=json.dumps(payload),
            content_type='application/json'
        )
        
        assert response.status_code == 404

    def test_multiple_status_updates_create_multiple_audit_logs(self, client, auth_headers, test_fuel_order, test_csr_user):
        """Test multiple status updates create separate audit log entries."""
        headers = self.get_csr_headers(auth_headers)
        
        # First update: DISPATCHED -> ACKNOWLEDGED
        payload1 = {
            "status": "ACKNOWLEDGED",
            "assigned_truck_id": test_fuel_order.assigned_truck_id
        }
        
        response1 = client.patch(
            f'/api/fuel-orders/{test_fuel_order.id}/status',
            headers=headers,
            data=json.dumps(payload1),
            content_type='application/json'
        )
        assert response1.status_code == 200
        
        # Second update: ACKNOWLEDGED -> EN_ROUTE
        payload2 = {
            "status": "EN_ROUTE",
            "assigned_truck_id": test_fuel_order.assigned_truck_id
        }
        
        response2 = client.patch(
            f'/api/fuel-orders/{test_fuel_order.id}/status',
            headers=headers,
            data=json.dumps(payload2),
            content_type='application/json'
        )
        assert response2.status_code == 200
        
        # Verify two audit log entries were created
        audit_logs = AuditLog.query.filter_by(
            entity_type='FuelOrder',
            entity_id=test_fuel_order.id,
            action='MANUAL_STATUS_UPDATE'
        ).order_by(AuditLog.timestamp).all()
        
        assert len(audit_logs) == 2
        
        # Verify first audit log
        assert audit_logs[0].details['previous_status'] == 'Dispatched'
        assert audit_logs[0].details['new_status'] == 'Acknowledged'
        
        # Verify second audit log  
        assert audit_logs[1].details['previous_status'] == 'Acknowledged'
        assert audit_logs[1].details['new_status'] == 'En Route'

class TestFuelOrderReceiptLinking:
    """Test class for receipt linking and order locking functionality."""
    
    def get_admin_headers(self, auth_headers):
        return auth_headers.get('administrator', {})
    
    @pytest.fixture(scope='function')
    def test_data_setup(self, app, db, test_csr_user):
        """Create test data for receipt linking tests."""
        with app.app_context():
            # Clean up existing data
            db.session.query(Receipt).delete()
            db.session.query(FuelOrder).delete()
            db.session.query(Aircraft).delete()
            db.session.query(Customer).delete()
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
            db.session.commit()
            
            # Create test fuel order
            fuel_order = FuelOrder(
                tail_number=aircraft.tail_number,
                customer_id=customer.id,
                fuel_type="100LL",
                requested_amount=Decimal('50.00'),
                status=FuelOrderStatus.COMPLETED,
                completion_timestamp=datetime.utcnow()
            )
            db.session.add(fuel_order)
            db.session.commit()
            
            return {
                'fuel_order_id': fuel_order.id,
                'customer_id': customer.id,
                'user_id': test_csr_user.id
            }

    def test_order_with_active_receipt_shows_receipt_id_and_locked(self, client, auth_headers, test_data_setup):
        """Test Case 1: Order with active receipt shows receipt_id and is_locked=true."""
        headers = self.get_admin_headers(auth_headers)
    
        # Create a GENERATED receipt for the fuel order
        receipt = Receipt(
            fbo_location_id=1,
            fuel_order_id=test_data_setup['fuel_order_id'],
            customer_id=test_data_setup['customer_id'],
            status=ReceiptStatus.GENERATED,
            generated_at=datetime.utcnow(),
            created_by_user_id=test_data_setup['user_id'],
            updated_by_user_id=test_data_setup['user_id']
        )
        db.session.add(receipt)
        db.session.commit()
        
        # Fetch the fuel order via API
        response = client.get(
            f'/api/fuel-orders/{test_data_setup["fuel_order_id"]}',
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}. Response: {response.json}"
        data = response.json['fuel_order']
        assert data['receipt_id'] == receipt.id
        assert data['is_locked'] is True

    def test_order_with_voided_receipt_shows_no_receipt_id_and_unlocked(self, client, auth_headers, test_data_setup):
        """Test Case 2: Order with voided receipt shows receipt_id=null and is_locked=false."""
        headers = self.get_admin_headers(auth_headers)
    
        # Create a VOID receipt for the fuel order
        receipt = Receipt(
            fbo_location_id=1,
            fuel_order_id=test_data_setup['fuel_order_id'],
            customer_id=test_data_setup['customer_id'],
            status=ReceiptStatus.VOID,
            created_by_user_id=test_data_setup['user_id'],
            updated_by_user_id=test_data_setup['user_id']
        )
        db.session.add(receipt)
        db.session.commit()
        
        # Fetch the fuel order via API
        response = client.get(
            f'/api/fuel-orders/{test_data_setup["fuel_order_id"]}',
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}. Response: {response.json}"
        data = response.json['fuel_order']
        assert data['receipt_id'] is None
        assert data['is_locked'] is False

    def test_modify_locked_order_fails(self, client, auth_headers, test_data_setup):
        """Test Case 3: Modify Locked Order Fails."""
        headers = self.get_admin_headers(auth_headers)

        # Create a GENERATED receipt for the fuel order
        receipt = Receipt(
            fbo_location_id=1,
            fuel_order_id=test_data_setup['fuel_order_id'],
            customer_id=test_data_setup['customer_id'],
            status=ReceiptStatus.GENERATED,
            generated_at=datetime.utcnow(),
            created_by_user_id=test_data_setup['user_id'],
            updated_by_user_id=test_data_setup['user_id']
        )
        db.session.add(receipt)
        db.session.commit()
        
        # Attempt to PATCH the status of the locked order
        payload = {
            "status": "REVIEWED"
        }
        
        response = client.patch(
            f'/api/fuel-orders/{test_data_setup["fuel_order_id"]}/status',
            headers=headers,
            data=json.dumps(payload),
            content_type='application/json'
        )
        
        # Assert the response is 400 Bad Request
        assert response.status_code == 400
        response_data = response.get_json()
        assert "active receipt" in response_data['error'].lower() 