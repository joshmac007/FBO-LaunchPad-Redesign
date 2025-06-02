import click
from flask.cli import with_appcontext
from .extensions import db
from .seeds import seed_data

@click.command('create-admin')
@with_appcontext
def create_admin():
    """Create an admin user."""
    from .models.user import User
    from .models.role import Role
    
    # Check if admin already exists
    if User.query.filter_by(email='admin@fbolaunchpad.com').first():
        click.echo("Admin user already exists!")
        return
    
    # Get admin role
    admin_role = Role.query.filter_by(name='System Administrator').first()
    if not admin_role:
        click.echo("Error: System Administrator role not found!")
        return
    
    # Create new admin user
    admin = User(
        email='admin@fbolaunchpad.com',
        username='admin',
        name='Admin',
        is_active=True
    )
    admin.set_password('Admin123!')
    admin.roles = [admin_role]
    
    # Save to database
    db.session.add(admin)
    db.session.commit()
    click.echo("Admin user created successfully!")

@click.group()
def seed_cli():
    """Database seeding commands."""
    pass

@seed_cli.command('run')
@with_appcontext
def run_seed():
    """Populates the database with initial permissions, roles, and admin user."""
    seed_data()
    click.echo("Database seeding process finished.")

@click.group()
def migrate_cli():
    """Permission system migration commands."""
    pass

@migrate_cli.command('run')
@with_appcontext
def run_migration():
    """Run the permission system migration from roles to permissions."""
    from .migration_scripts.permission_migration import run_migration
    
    click.echo("Starting permission system migration...")
    result = run_migration()
    
    if result['success']:
        click.echo("✅ Migration completed successfully!")
        report = result.get('validation_results', {})
        click.echo(f"📊 Migration Summary:")
        click.echo(f"   - Users with permission groups: {report.get('users_with_groups', 0)}")
        click.echo(f"   - Users without permission groups: {report.get('users_without_groups', 0)}")
        click.echo(f"   - Permission groups created: {report.get('permission_groups_created', 0)}")
        click.echo(f"   - Enhanced permissions created: {report.get('enhanced_permissions_created', 0)}")
        
        if report.get('validation_errors'):
            click.echo("⚠️  Validation warnings:")
            for error in report['validation_errors']:
                click.echo(f"   - {error}")
    else:
        click.echo(f"❌ Migration failed: {result.get('error', 'Unknown error')}")

@migrate_cli.command('validate')
@with_appcontext
def validate_migration():
    """Validate the current state of the permission system migration."""
    from .migration_scripts.permission_migration import PermissionMigration
    
    migration = PermissionMigration()
    results = migration.validate_migration()
    
    click.echo("📊 Migration Validation Results:")
    click.echo(f"   - Users with permission groups: {results['users_with_groups']}")
    click.echo(f"   - Users without permission groups: {results['users_without_groups']}")
    click.echo(f"   - Permission groups created: {results['permission_groups_created']}")
    click.echo(f"   - Enhanced permissions created: {results['enhanced_permissions_created']}")
    
    if results['validation_errors']:
        click.echo("⚠️  Validation errors:")
        for error in results['validation_errors']:
            click.echo(f"   - {error}")
    else:
        click.echo("✅ No validation errors found!")

def init_app(app):
    """Register CLI commands."""
    app.cli.add_command(create_admin)
    app.cli.add_command(seed_cli, name='seed')
    app.cli.add_command(migrate_cli, name='migrate') 