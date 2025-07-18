from .auth_schemas import (
    RegisterRequestSchema, UserResponseSchema, RegisterResponseSchema,
    LoginRequestSchema, LoginSuccessResponseSchema,
    UserPermissionsResponseSchema
)

from .fuel_order_schemas import (
    FuelOrderCreateRequestSchema, FuelOrderStatusUpdateRequestSchema,
    FuelOrderCompleteRequestSchema, FuelOrderResponseSchema,
    FuelOrderBriefResponseSchema, FuelOrderCreateResponseSchema,
    FuelOrderUpdateResponseSchema, PaginationSchema, FuelOrderListResponseSchema,
    OrderStatusCountsSchema, OrderStatusCountsResponseSchema
) # Ensure all schemas are imported

from .fuel_truck_schemas import (
    FuelTruckSchema, FuelTruckListResponseSchema,
    FuelTruckCreateRequestSchema, FuelTruckUpdateRequestSchema,
    FuelTruckCreateResponseSchema
)

from .aircraft_schemas import (
    AircraftCreateSchema as AircraftCreateRequestSchema,
    AircraftUpdateSchema as AircraftUpdateRequestSchema,
    AircraftResponseSchema,
    AircraftListSchema as AircraftListResponseSchema
)

from .customer_schemas import (
    CustomerCreateSchema as CustomerCreateRequestSchema,
    CustomerUpdateSchema as CustomerUpdateRequestSchema,
    CustomerResponseSchema,
    CustomerListSchema as CustomerListResponseSchema
)

from .admin_schemas import (
    AdminAircraftSchema, AdminAircraftListResponseSchema,
    AdminCustomerSchema, AdminCustomerListResponseSchema
)

from .role_schemas import (
    RoleSchema, RoleListResponseSchema,
    RoleCreateRequestSchema, RoleUpdateRequestSchema,
    RoleAssignPermissionRequestSchema
)

from .permission_schemas import PermissionSchema

from .user_schemas import (
    UserCreateRequestSchema,
    UserUpdateRequestSchema,
    UserDetailSchema,
    UserListResponseSchema,
    ErrorResponseSchema
)

from marshmallow import Schema, fields, validate

__all__ = [
    'RegisterRequestSchema', 'UserResponseSchema', 'RegisterResponseSchema',
    'LoginRequestSchema', 'LoginSuccessResponseSchema',
    'UserPermissionsResponseSchema',
    'FuelOrderCreateRequestSchema', 'FuelOrderStatusUpdateRequestSchema',
    'FuelOrderCompleteRequestSchema', 'FuelOrderResponseSchema',
    'FuelOrderBriefResponseSchema', 'FuelOrderCreateResponseSchema',
    'FuelOrderUpdateResponseSchema', 'PaginationSchema', 'FuelOrderListResponseSchema',
    'FuelTruckSchema', 'FuelTruckListResponseSchema',
    'FuelTruckCreateRequestSchema', 'FuelTruckUpdateRequestSchema',
    'FuelTruckCreateResponseSchema',
    'AircraftCreateRequestSchema', 'AircraftUpdateRequestSchema',
    'AircraftResponseSchema', 'AircraftListResponseSchema',
    'CustomerCreateRequestSchema', 'CustomerUpdateRequestSchema',
    'CustomerResponseSchema', 'CustomerListResponseSchema',
    'UserCreateRequestSchema',
    'UserUpdateRequestSchema',
    'UserDetailSchema',
    'UserListResponseSchema',
    'ErrorResponseSchema',
    'OrderStatusCountsSchema', 'OrderStatusCountsResponseSchema',
    'AdminAircraftSchema', 'AdminAircraftListResponseSchema',
    'AdminCustomerSchema', 'AdminCustomerListResponseSchema',
    'RoleSchema', 'RoleListResponseSchema',
    'RoleCreateRequestSchema', 'RoleUpdateRequestSchema',
    'RoleAssignPermissionRequestSchema',
    'PermissionSchema'
] # Ensure schemas are exported