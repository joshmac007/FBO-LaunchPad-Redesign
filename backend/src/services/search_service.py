from typing import List, Tuple
from sqlalchemy import or_, and_
from ..models.customer import Customer
from ..models.aircraft import Aircraft
from ..app import db

class SearchService:
    @staticmethod
    def search_customers(query: str, limit: int = 10) -> Tuple[List[Customer], str, int]:
        """
        Search customers by name or company name using case-insensitive ILIKE search.
        
        Args:
            query: Search term
            limit: Maximum number of results to return (default: 10)
            
        Returns:
            Tuple of (customers list, message, status_code)
        """
        try:
            # Create case-insensitive search pattern
            search_pattern = f"%{query.lower()}%"
            
            # Search in both name and company_name fields
            customers = Customer.query.filter(
                or_(
                    Customer.name.ilike(search_pattern),
                    Customer.company_name.ilike(search_pattern)
                )
            ).order_by(Customer.name.asc()).limit(limit).all()
            
            message = f"Found {len(customers)} customer(s) matching '{query}'"
            return customers, message, 200
            
        except Exception as e:
            return [], f"Error searching customers: {str(e)}", 500

    @staticmethod
    def search_aircraft_tails(query: str, limit: int = 10) -> Tuple[List[Aircraft], str, int]:
        """
        Search aircraft by tail number using case-insensitive ILIKE search.
        
        Args:
            query: Search term for tail number
            limit: Maximum number of results to return (default: 10)
            
        Returns:
            Tuple of (aircraft list, message, status_code)
        """
        try:
            # Create case-insensitive search pattern
            search_pattern = f"%{query.lower()}%"
            
            # Search in tail_number field
            aircraft = Aircraft.query.filter(
                Aircraft.tail_number.ilike(search_pattern)
            ).order_by(Aircraft.tail_number.asc()).limit(limit).all()
            
            message = f"Found {len(aircraft)} aircraft matching '{query}'"
            return aircraft, message, 200
            
        except Exception as e:
            return [], f"Error searching aircraft: {str(e)}", 500