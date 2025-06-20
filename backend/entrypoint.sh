#!/bin/bash
set -e

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
while ! pg_isready -h db -p 5432 -U fbo_user; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 2
done

echo "PostgreSQL is ready - proceeding with database setup"

# Set Flask app environment
export FLASK_APP=src/app.py

# Run database migrations
echo "Running database migrations..."
flask db upgrade

# Check if this is a fresh database (no users exist) and seed if needed
echo "Checking if database needs seeding..."
python -c "
from src.app import create_app
from src.extensions import db
from src.models.user import User

app = create_app()
with app.app_context():
    user_count = User.query.count()
    if user_count == 0:
        print('Database is empty, seeding required.')
        exit(1)
    else:
        print(f'Database has {user_count} users, seeding not required.')
        exit(0)
" && echo "Database already seeded" || {
    echo "Seeding database with default data..."
    flask seed run
    echo "Creating permission groups and role assignments..."
    flask create-permission-groups run
    echo "Database initialization complete!"
}

echo "Database setup complete - starting application..."

# Execute the original command
exec "$@" 