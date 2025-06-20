# FBO LaunchPad Database Setup Guide

This guide explains how to set up and seed the FBO LaunchPad database with default users and permissions.

## Quick Start

The easiest way to start the application with a seeded database is to use the provided script:

```bash
cd backend
./reseed_database.sh start
```

This will automatically:
1. Start the PostgreSQL database
2. Run database migrations
3. Seed the database with default users and permissions (if empty)
4. Start the Flask application

## Default Users

The following default users are automatically created when seeding the database:

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| **System Administrator** | admin@fbolaunchpad.com | Admin123! | Full system access |
| **Customer Service Representative** | csr@fbolaunchpad.com | CSR123! | Order management, customer management |
| **Line Service Technician (Fueler)** | fueler@fbolaunchpad.com | Fueler123! | Assigned orders, status updates |
| **Member** | member@fbolaunchpad.com | Member123! | Limited view access |

## Database Management Commands

### Using the Convenience Script

The `reseed_database.sh` script provides several commands:

```bash
# Start application (auto-seeds if database is empty)
./reseed_database.sh start

# Force reseed database (WARNING: deletes all data)
./reseed_database.sh reseed

# Fresh start (removes volumes and starts clean)
./reseed_database.sh fresh

# Check status and current users
./reseed_database.sh status

# View application logs
./reseed_database.sh logs

# Stop containers
./reseed_database.sh stop

# Show help
./reseed_database.sh help
```

### Manual Docker Commands

If you prefer to run commands manually:

```bash
# Start the application
docker-compose up -d

# Run database migrations
docker-compose exec backend flask db upgrade

# Seed the database
docker-compose exec backend flask seed run

# Check database status
docker-compose exec backend python -c "
from src.app import create_app
from src.models.user import User
app = create_app()
with app.app_context():
    print(f'Users: {User.query.count()}')
"
```

## Role Permissions

### System Administrator
- All permissions (full system access)

### Customer Service Representative
- Create orders
- View all orders
- Review orders
- Export orders to CSV
- View order statistics
- Edit fuel orders
- View users, trucks, aircraft, customers
- Manage aircraft and customers
- View permissions

### Line Service Technician (Fueler)
- Create orders
- View assigned orders
- Update own order status
- Complete own orders
- View order statistics

### Member
- View order statistics
- View customers
- View aircraft

## Database Structure

The application uses a role-based permission system with the following key tables:

- `users` - User accounts
- `roles` - Available roles
- `permissions` - Available permissions
- `user_roles` - User-role assignments
- `role_permissions` - Role-permission assignments

## Troubleshooting

### Database Connection Issues

1. Ensure PostgreSQL container is running:
   ```bash
   docker-compose ps
   ```

2. Check database logs:
   ```bash
   docker-compose logs db
   ```

### Seeding Issues

1. Check if users already exist:
   ```bash
   ./reseed_database.sh status
   ```

2. Force reseed if needed:
   ```bash
   ./reseed_database.sh reseed
   ```

### Fresh Installation

If you want to start completely fresh:

```bash
# Stop and remove everything
docker-compose down -v

# Start fresh (will auto-seed)
./reseed_database.sh fresh
```

## Environment Variables

The following environment variables control database connection:

- `POSTGRES_USER=fbo_user`
- `POSTGRES_PASSWORD=fbo_password`
- `POSTGRES_DB=fbo_launchpad_dev`
- `DATABASE_URL` (constructed automatically)

## Security Notes

- **Change default passwords** in production environments
- The seed script only creates users if they don't already exist
- All passwords are properly hashed using PBKDF2-SHA256
- Default users are marked as active but can be deactivated through the admin interface

## Development Workflow

For development, the typical workflow is:

1. Start the application: `./reseed_database.sh start`
2. Make changes to models or seeds
3. Create new migration: `docker-compose exec backend flask db migrate -m "description"`
4. Apply migration: `docker-compose exec backend flask db upgrade`
5. If needed, reseed: `./reseed_database.sh reseed` 