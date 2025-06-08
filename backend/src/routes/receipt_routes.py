"""
Receipt Routes

Flask API routes for receipt lifecycle management. Provides endpoints for CSRs to
manage receipts from draft creation through final payment marking.
"""

from flask import Blueprint, request, jsonify, current_app, g
from marshmallow import ValidationError
from datetime import datetime
from typing import Dict, Any

from ..models.receipt import Receipt
from ..models.receipt_line_item import ReceiptLineItem
from ..services.receipt_service import ReceiptService
from ..schemas.receipt_schemas import (
    create_draft_receipt_schema,
    update_draft_receipt_schema,
    receipt_list_query_schema,
    receipt_schema,
    receipt_detail_response_schema,
    create_draft_receipt_response_schema,
    update_draft_receipt_response_schema,
    calculate_fees_response_schema,
    generate_receipt_response_schema,
    mark_paid_response_schema,
    receipt_list_response_schema,
    error_response_schema
)
from ..utils.enhanced_auth_decorators_v2 import require_permission_v2


# Create blueprint
receipt_bp = Blueprint('receipts', __name__)

# Initialize service
receipt_service = ReceiptService()


@receipt_bp.errorhandler(ValidationError)
def handle_validation_error(e):
    """Handle marshmallow validation errors."""
    return jsonify({
        'error': 'Validation failed',
        'details': e.messages,
        'timestamp': datetime.utcnow().isoformat()
    }), 400


@receipt_bp.errorhandler(ValueError)
def handle_value_error(e):
    """Handle business logic value errors."""
    return jsonify({
        'error': str(e),
        'timestamp': datetime.utcnow().isoformat()
    }), 400


@receipt_bp.errorhandler(Exception)
def handle_general_error(e):
    """Handle unexpected errors."""
    current_app.logger.error(f"Unexpected error in receipt routes: {str(e)}")
    return jsonify({
        'error': 'Internal server error',
        'timestamp': datetime.utcnow().isoformat()
    }), 500


@receipt_bp.route('/api/fbo/<int:fbo_id>/receipts/draft', methods=['POST'])
@require_permission_v2('create_receipt')
def create_draft_receipt(fbo_id):
    """
    Create a new draft receipt from a completed fuel order.
    
    Body:
        fuel_order_id (int): ID of the completed fuel order
        
    Returns:
        201: Draft receipt created successfully
        400: Validation error or invalid fuel order
        404: Fuel order not found
        409: Fuel order already has a receipt
    """
    print(f"--- ROUTE: Entered create_draft_receipt. g.current_user is: {getattr(g, 'current_user', 'NOT SET')}", flush=True)
    try:
        data = create_draft_receipt_schema.load(request.get_json() or {})
        user_id = g.current_user.id
        
        receipt = receipt_service.create_draft_from_fuel_order(
            fuel_order_id=data['fuel_order_id'],
            fbo_location_id=fbo_id,
            user_id=user_id
        )
        
        response_data = {
            "message": "Draft receipt created successfully.",
            "receipt": receipt.to_dict()
        }
        return jsonify(response_data), 201

    except ValidationError as e:
        return jsonify({"error": "Invalid request data", "details": e.messages}), 400
    except ValueError as e:
        error_msg = str(e)
        if 'not found' in error_msg.lower():
            return jsonify({'error': error_msg}), 404
        elif 'already has a receipt' in error_msg.lower():
            return jsonify({'error': error_msg}), 409
        elif 'data integrity error' in error_msg.lower():
            return jsonify({'error': error_msg}), 400
        else:
            return jsonify({'error': error_msg}), 400
    except Exception as e:
        # --- THIS IS THE TEMPORARY DEBUGGING BLOCK ---
        # Log the full exception details to the console
        import traceback
        traceback.print_exc() 
        
        return jsonify({
            "error": "An unexpected server error occurred during draft creation.",
            "details": f"Error Type: {type(e).__name__}, Message: {str(e)}"
        }), 500
        # --- END DEBUGGING BLOCK ---

@receipt_bp.route('/api/fbo/<int:fbo_id>/receipts/<int:receipt_id>/draft', methods=['PUT'])
@require_permission_v2('update_receipt')
def update_draft_receipt(fbo_id, receipt_id):
    """
    Update a draft receipt's editable fields.
    
    Body:
        customer_id (int, optional): New customer ID
        additional_services (list, optional): List of additional services
        
    Returns:
        200: Receipt updated successfully
        400: Validation error or receipt not in draft status
        403: Receipt cannot be updated (not draft)
        404: Receipt not found
    """
    try:
        # Validate request data
        data = update_draft_receipt_schema.load(request.get_json() or {})
        
        # Get current user ID from auth context
        user_id = g.current_user.id
        
        # Update draft receipt
        receipt = receipt_service.update_draft(
            receipt_id=receipt_id,
            fbo_location_id=fbo_id,
            update_data=data,
            user_id=user_id
        )
        
        # Serialize response
        response_data = {
            'receipt': receipt.to_dict(),
            'message': 'Draft receipt updated successfully'
        }
        
        return jsonify(response_data), 200
        
    except ValueError as e:
        error_msg = str(e)
        if 'not found' in error_msg.lower():
            return jsonify({'error': error_msg}), 404
        elif 'cannot update' in error_msg.lower() or 'not a draft' in error_msg.lower():
            return jsonify({'error': error_msg}), 403
        else:
            return jsonify({'error': error_msg}), 400


@receipt_bp.route('/api/fbo/<int:fbo_id>/receipts/<int:receipt_id>/calculate-fees', methods=['POST'])
@require_permission_v2('calculate_receipt_fees')
def calculate_receipt_fees(fbo_id, receipt_id):
    """
    Calculate fees and update a draft receipt with line items and totals.
    
    Returns:
        200: Fees calculated successfully
        400: Validation error or receipt not in draft status
        403: Receipt cannot have fees calculated
        404: Receipt not found
    """
    try:
        # Get additional services from request (optional)
        request_data = request.get_json() or {}
        additional_services = request_data.get('additional_services', [])
        
        # Calculate fees and update receipt
        receipt = receipt_service.calculate_and_update_draft(
            receipt_id=receipt_id,
            fbo_location_id=fbo_id,
            additional_services=additional_services
        )
        
        # Fetch receipt with line items for response
        receipt_with_line_items = receipt_service.get_receipt_by_id(receipt_id, fbo_id)
        receipt_dict = receipt_with_line_items.to_dict()
        receipt_dict['line_items'] = [item.to_dict() for item in receipt_with_line_items.line_items]
        
        # Serialize response
        response_data = {
            'receipt': receipt_dict,
            'message': 'Fees calculated successfully'
        }
        
        return jsonify(response_data), 200
        
    except ValueError as e:
        error_msg = str(e)
        if 'not found' in error_msg.lower():
            return jsonify({'error': error_msg}), 404
        elif 'cannot calculate' in error_msg.lower() or 'not a draft' in error_msg.lower():
            return jsonify({'error': error_msg}), 403
        else:
            return jsonify({'error': error_msg}), 400


@receipt_bp.route('/api/fbo/<int:fbo_id>/receipts/<int:receipt_id>/generate', methods=['POST'])
@require_permission_v2('generate_receipt')
def generate_receipt(fbo_id, receipt_id):
    """
    Generate (finalize) a receipt, assigning a receipt number and changing status.
    
    Returns:
        200: Receipt generated successfully
        400: Validation error or receipt has uncalculated fees
        403: Receipt cannot be generated
        404: Receipt not found
    """
    try:
        # Generate the receipt
        receipt = receipt_service.generate_receipt(
            receipt_id=receipt_id,
            fbo_location_id=fbo_id
        )
        
        # Serialize response
        response_data = {
            'receipt': receipt.to_dict(),
            'message': f'Receipt {receipt.receipt_number} generated successfully'
        }
        
        return jsonify(response_data), 200
        
    except ValueError as e:
        error_msg = str(e)
        if 'not found' in error_msg.lower():
            return jsonify({'error': error_msg}), 404
        elif 'cannot generate' in error_msg.lower() or 'uncalculated fees' in error_msg.lower():
            return jsonify({'error': error_msg}), 400
        else:
            return jsonify({'error': error_msg}), 400


@receipt_bp.route('/api/fbo/<int:fbo_id>/receipts/<int:receipt_id>/mark-paid', methods=['POST'])
@require_permission_v2('mark_receipt_paid')
def mark_receipt_paid(fbo_id, receipt_id):
    """
    Mark a generated receipt as paid.
    
    Returns:
        200: Receipt marked as paid successfully
        400: Receipt cannot be marked as paid
        404: Receipt not found
    """
    try:
        receipt = receipt_service.mark_as_paid(
            receipt_id=receipt_id,
            fbo_location_id=fbo_id
        )
        
        response_data = {
            'receipt': receipt.to_dict(),
            'message': f'Receipt {receipt.receipt_number} marked as paid successfully'
        }
        
        return jsonify(response_data), 200
        
    except ValueError as e:
        error_msg = str(e)
        if 'not found' in error_msg.lower():
            return jsonify({'error': error_msg}), 404
        else:
            return jsonify({'error': error_msg}), 400


@receipt_bp.route('/api/fbo/<int:fbo_id>/receipts/<int:receipt_id>/void', methods=['POST'])
@require_permission_v2('void_receipt')
def void_receipt(fbo_id, receipt_id):
    """
    Void a generated or paid receipt.
    
    Body (optional):
        reason (str): Reason for voiding the receipt
        
    Returns:
        200: Receipt voided successfully
        400: Receipt cannot be voided
        404: Receipt not found
    """
    try:
        # Get optional reason from request body
        request_data = request.get_json() or {}
        reason = request_data.get('reason', '')
        
        # Get current user ID from auth context
        user_id = g.current_user.id
        
        # Void the receipt
        receipt = receipt_service.void_receipt(
            receipt_id=receipt_id,
            user_id=user_id,
            reason=reason
        )
        
        response_data = {
            'receipt': receipt.to_dict(),
            'message': f'Receipt {receipt.receipt_number} voided successfully'
        }
        
        return jsonify(response_data), 200
        
    except ValueError as e:
        error_msg = str(e)
        if 'not found' in error_msg.lower():
            return jsonify({'error': error_msg}), 404
        else:
            return jsonify({'error': error_msg}), 400


@receipt_bp.route('/api/fbo/<int:fbo_id>/receipts', methods=['GET'])
@require_permission_v2('view_receipts')
def list_receipts(fbo_id):
    """
    Get a paginated list of receipts for the FBO with optional filtering.
    
    Query Parameters:
        status (str, optional): Filter by receipt status
        customer_id (int, optional): Filter by customer ID
        date_from (datetime, optional): Filter by creation date from
        date_to (datetime, optional): Filter by creation date to
        page (int, optional): Page number (default: 1)
        per_page (int, optional): Items per page (default: 50, max: 100)
        
    Returns:
        200: List of receipts with pagination info
        400: Validation error in query parameters
    """
    try:
        # Validate query parameters
        query_params = receipt_list_query_schema.load(request.args.to_dict())
        
        # Extract filters and pagination
        filters = {k: v for k, v in query_params.items() if k not in ['page', 'per_page']}
        page = query_params.get('page', 1)
        per_page = query_params.get('per_page', 50)
        
        # Get receipts from service
        result = receipt_service.get_receipts(
            fbo_location_id=fbo_id,
            filters=filters,
            page=page,
            per_page=per_page
        )
        
        return jsonify(result), 200
        
    except ValidationError as e:
        return jsonify({
            'error': 'Invalid query parameters',
            'details': e.messages
        }), 400


@receipt_bp.route('/api/fbo/<int:fbo_id>/receipts/<int:receipt_id>', methods=['GET'])
@require_permission_v2('view_receipts')
def get_receipt_by_id(fbo_id, receipt_id):
    """
    Get a specific receipt by ID with line items.
    
    Returns:
        200: Receipt details with line items
        404: Receipt not found
    """
    try:
        # Get receipt with line items
        receipt = receipt_service.get_receipt_by_id(receipt_id, fbo_id)
        
        if not receipt:
            return jsonify({'error': f'Receipt {receipt_id} not found'}), 404
        
        # Serialize receipt with line items
        receipt_dict = receipt.to_dict()
        receipt_dict['line_items'] = [item.to_dict() for item in receipt.line_items]
        
        response_data = {
            'receipt': receipt_dict
        }
        
        return jsonify(response_data), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching receipt {receipt_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


# Health check endpoint for receipts
@receipt_bp.route('/api/fbo/<int:fbo_id>/receipts/health', methods=['GET'])
def receipt_health_check(fbo_id):
    """Health check endpoint for receipt service."""
    return jsonify({
        'status': 'healthy',
        'service': 'receipt_lifecycle',
        'fbo_id': fbo_id,
        'timestamp': datetime.utcnow().isoformat()
    }), 200 