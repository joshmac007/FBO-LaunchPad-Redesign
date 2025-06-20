from src.extensions import db
from sqlalchemy import Integer, ForeignKey

# role_permissions table has been removed - using permission groups system instead

user_roles = db.Table('user_roles',
    db.Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    db.Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True)
)
