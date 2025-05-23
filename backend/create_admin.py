from src.models.user import User, UserRole
from src.extensions import db
from src.app import create_app

def create_admin_user():
    app = create_app()
    with app.app_context():
        # Check if admin already exists
        if User.query.filter_by(email='admin@fbolaunchpad.com').first():
            print("Admin user already exists!")
            return
        
        # Create new admin user
        admin = User(
            email='admin@fbolaunchpad.com',
            username='admin',
            role=UserRole.ADMIN,
            is_active=True
        )
        admin.set_password('Admin123!')
        
        # Save to database
        db.session.add(admin)
        db.session.commit()
        print("Admin user created successfully!")

if __name__ == '__main__':
    create_admin_user() 