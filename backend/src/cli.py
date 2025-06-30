import click
from flask.cli import with_appcontext
from .extensions import db
# from .seeds import seed_data

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
    # seed_data()
    click.echo("Database seeding process finished.")

@click.group()
def migrate_cli():
    """Database migration commands."""
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

@migrate_cli.command('standardize-permissions')
@click.option('--dry-run', is_flag=True, help='Show what would be changed without making actual changes')
@with_appcontext
def standardize_permissions(dry_run):
    """Standardize permission names from UPPERCASE_SNAKE_CASE to snake_case.
    
    This is a safety migration for existing databases that may have permission names
    in the old UPPERCASE_SNAKE_CASE format. For new databases, seeds.py handles this correctly.
    """
    from .migration_scripts.standardize_permission_names import run_migration
    
    click.echo("🚀 Starting permission name standardization migration...")
    if dry_run:
        click.echo("🔍 DRY RUN MODE - No changes will be made")
    click.echo("=" * 50)
    
    success = run_migration(dry_run=dry_run)
    
    if success:
        click.echo("✅ Permission name standardization completed successfully!")
        if not dry_run:
            click.echo("🔄 Next step: Run 'flask create-permission-groups run' to refresh permission groups")
    else:
        click.echo("❌ Permission name standardization failed!")
        
    return success

@click.group()
def permission_groups_cli():
    """Permission groups management commands."""
    pass

@permission_groups_cli.command('run')
@with_appcontext
def run_permission_groups():
    """Create permission groups and assign them to roles.
    
    This command should be run AFTER 'flask seed run' to create permission groups
    and establish role-to-group assignments using snake_case permission names.
    """
    from .migration_scripts.permission_groups_schema import run_migration
    
    click.echo("🚀 Starting permission groups creation...")
    click.echo("📝 This uses snake_case permissions from seeds.py")
    click.echo("=" * 50)
    
    success = run_migration()
    
    if success:
        click.echo("=" * 50)
        click.echo("✅ Permission groups creation completed successfully!")
        click.echo("🎉 Database now includes:")
        click.echo("   • Hierarchical permission groups")
        click.echo("   • Role-group assignments")
        click.echo("   • Permission inheritance")
    else:
        click.echo("=" * 50)
        click.echo("❌ Permission groups creation failed!")
        click.echo("Check the logs above for details.")

@permission_groups_cli.command('verify')
@with_appcontext
def verify_permission_groups():
    """Verify the permission groups setup."""
    from .migration_scripts.permission_groups_schema import verify_permission_groups_setup
    
    click.echo("🔍 Verifying permission groups setup...")
    success = verify_permission_groups_setup()
    
    if success:
        click.echo("✅ Permission groups verification completed!")
    else:
        click.echo("❌ Permission groups verification failed!")

def init_app(app):
    """Register CLI commands."""
    app.cli.add_command(create_admin)
    app.cli.add_command(seed_cli, name='seed')
    app.cli.add_command(migrate_cli, name='migrate')
    app.cli.add_command(permission_groups_cli, name='create-permission-groups') 