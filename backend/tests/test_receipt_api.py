import pytest
import json
from datetime import datetime
from decimal import Decimal

from src.models.customer import Customer
from src.models.aircraft import Aircraft
from src.models.fuel_order import FuelOrder, FuelOrderStatus
from src.models.receipt import Receipt, ReceiptStatus
from src.models.audit_log import AuditLog
from src.models.user import User
from src.extensions import db


class TestReceiptVoidAPI:
    """Test class for receipt void functionality."""
    
    def get_csr_headers(self, auth_headers):
        return auth_headers.get('customer', {})
    
    @pytest.fixture(scope='function')
    def test_receipt_setup(self, app, db, test_csr_user):
        """Create test receipt for void testing."""
        with app.app_context():
            # Clean up existing data
            db.session.query(AuditLog).delete()
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
            
            # Create test receipt
            receipt = Receipt(
                fbo_location_id=1,
                fuel_order_id=fuel_order.id,
                customer_id=customer.id,
                status=ReceiptStatus.GENERATED,
                receipt_number="TEST-001",
                generated_at=datetime.utcnow(),
                created_by_user_id=test_csr_user.id,
                updated_by_user_id=test_csr_user.id
            )
            db.session.add(receipt)
            db.session.commit()
            
            return {
                'receipt_id': receipt.id,
                'customer_id': customer.id,
                'user_id': test_csr_user.id,
                'fbo_id': 1
            }

    def test_void_generated_receipt_success(self, client, auth_headers, test_receipt_setup, test_csr_user):
        """Test Case 4: Successfully void a GENERATED receipt."""
        headers = self.get_csr_headers(auth_headers)
        
        payload = {
            "reason": "Customer request for refund"
        }
        
        response = client.post(
            f'/api/fbo/{test_receipt_setup["fbo_id"]}/receipts/{test_receipt_setup["receipt_id"]}/void',
            headers=headers,
            data=json.dumps(payload),
            content_type='application/json'
        )
        
        assert response.status_code == 200
        
        # Verify the response
        response_data = response.get_json()
        assert "voided successfully" in response_data['message']
        
        # Verify database was updated
        receipt = Receipt.query.get(test_receipt_setup['receipt_id'])
        assert receipt.status == ReceiptStatus.VOID
        
        # Verify audit log was created
        audit_log = AuditLog.query.filter_by(
            entity_type='Receipt',
            entity_id=test_receipt_setup['receipt_id'],
            action='VOID_RECEIPT'
        ).first()
        
        assert audit_log is not None
        assert audit_log.user_id == test_csr_user.id
        assert audit_log.details['previous_status'] == 'GENERATED'
        assert audit_log.details['new_status'] == 'VOID'
        assert audit_log.details['reason'] == 'Customer request for refund'

    def test_void_paid_receipt_success(self, client, auth_headers, test_receipt_setup, test_csr_user):
        """Test voiding a PAID receipt succeeds."""
        headers = self.get_csr_headers(auth_headers)
        
        # Update receipt to PAID status
        receipt = Receipt.query.get(test_receipt_setup['receipt_id'])
        receipt.status = ReceiptStatus.PAID
        receipt.paid_at = datetime.utcnow()
        db.session.commit()
        
        payload = {
            "reason": "Accounting error"
        }
        
        response = client.post(
            f'/api/fbo/{test_receipt_setup["fbo_id"]}/receipts/{test_receipt_setup["receipt_id"]}/void',
            headers=headers,
            data=json.dumps(payload),
            content_type='application/json'
        )
        
        assert response.status_code == 200
        
        # Verify database was updated
        receipt = Receipt.query.get(test_receipt_setup['receipt_id'])
        assert receipt.status == ReceiptStatus.VOID

    def test_void_draft_receipt_fails(self, client, auth_headers, test_receipt_setup):
        """Test voiding a DRAFT receipt fails."""
        headers = self.get_csr_headers(auth_headers)
        
        # Update receipt to DRAFT status
        receipt = Receipt.query.get(test_receipt_setup['receipt_id'])
        receipt.status = ReceiptStatus.DRAFT
        receipt.generated_at = None
        db.session.commit()
        
        payload = {
            "reason": "Test void"
        }
        
        response = client.post(
            f'/api/fbo/{test_receipt_setup["fbo_id"]}/receipts/{test_receipt_setup["receipt_id"]}/void',
            headers=headers,
            data=json.dumps(payload),
            content_type='application/json'
        )
        
        assert response.status_code == 400
        response_data = response.get_json()
        assert "Cannot void receipt with status DRAFT" in response_data['error']

    def test_void_nonexistent_receipt_fails(self, client, auth_headers, test_receipt_setup):
        """Test voiding a non-existent receipt returns 404."""
        headers = self.get_csr_headers(auth_headers)
        
        payload = {
            "reason": "Test void"
        }
        
        response = client.post(
            f'/api/fbo/{test_receipt_setup["fbo_id"]}/receipts/99999/void',
            headers=headers,
            data=json.dumps(payload),
            content_type='application/json'
        )
        
        assert response.status_code == 404
        response_data = response.get_json()
        assert "not found" in response_data['error'].lower()

    def test_void_without_permission_fails(self, client, auth_headers, test_receipt_setup):
        """Test voiding receipt without void_receipt permission fails."""
        # Use a header that doesn't have void_receipt permission (if available)
        # For now, this test would need to be implemented based on available test users
        pass 