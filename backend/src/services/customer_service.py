from typing import Tuple, List, Optional, Dict, Any
from ..models.customer import Customer
from ..app import db

class CustomerService:
    @staticmethod
    def create_customer(data: Dict[str, Any]) -> Tuple[Optional[Customer], str, int]:
        if 'name' not in data:
            return None, "Missing required field: name", 400
        if Customer.query.filter_by(name=data['name']).first():
            return None, "Customer with this name already exists", 409
        try:
            customer = Customer(
                name=data['name']
            )
            db.session.add(customer)
            db.session.commit()
            return customer, "Customer created successfully", 201
        except Exception as e:
            db.session.rollback()
            return None, f"Error creating customer: {str(e)}", 500

    @staticmethod
    def get_customer_by_id(customer_id: int) -> Tuple[Optional[Customer], str, int]:
        try:
            customer = Customer.query.get(customer_id)
            if not customer:
                return None, f"Customer with ID {customer_id} not found", 404
            return customer, "Customer retrieved successfully", 200
        except Exception as e:
            return None, f"Error retrieving customer: {str(e)}", 500

    @staticmethod
    def get_all_customers(filters: Optional[Dict[str, Any]] = None) -> Tuple[List[Customer], str, int]:
        query = Customer.query
        try:
            customers = query.order_by(Customer.name.asc()).all()
            return customers, "Customer list retrieved successfully", 200
        except Exception as e:
            return [], f"Error retrieving customers: {str(e)}", 500

    @staticmethod
    def update_customer(customer_id: int, update_data: Dict[str, Any]) -> Tuple[Optional[Customer], str, int]:
        try:
            customer = Customer.query.get(customer_id)
            if not customer:
                return None, f"Customer with ID {customer_id} not found", 404
            if 'name' in update_data:
                # Check for uniqueness
                existing = Customer.query.filter_by(name=update_data['name']).first()
                if existing and existing.id != customer_id:
                    return None, f"Customer name {update_data['name']} already exists", 400
                customer.name = update_data['name']
            db.session.commit()
            return customer, "Customer updated successfully", 200
        except Exception as e:
            db.session.rollback()
            return None, f"Error updating customer: {str(e)}", 500

    @staticmethod
    def delete_customer(customer_id: int) -> Tuple[bool, str, int]:
        try:
            customer = Customer.query.get(customer_id)
            if not customer:
                return False, f"Customer with ID {customer_id} not found", 404
            db.session.delete(customer)
            db.session.commit()
            return True, "Customer deleted successfully", 200
        except Exception as e:
            db.session.rollback()
            return False, f"Error deleting customer: {str(e)}", 500
