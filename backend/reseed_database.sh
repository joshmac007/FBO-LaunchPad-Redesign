#!/bin/bash

# FBO LaunchPad Database Reseeding Script
# This script provides convenient commands to manage database seeding

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

print_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start          Start the application (will auto-seed if database is empty)"
    echo "  reseed         Force reseed the database (clears all data and reseeds)"
    echo "  fresh          Stop containers, remove volumes, and start fresh"
    echo "  verify         Verify permission groups setup"
    echo "  fix-perms      Fix permission groups if missing"
    echo "  status         Show status of containers and database"
    echo "  logs           Show application logs"
    echo "  stop           Stop all containers"
    echo ""
    echo "Default accounts that will be created:"
    echo "  Admin:  admin@fbolaunchpad.com / Admin123!"
    echo "  CSR:    csr@fbolaunchpad.com / CSR123!"
    echo "  Fueler: fueler@fbolaunchpad.com / Fueler123!"
    echo "  Member: member@fbolaunchpad.com / Member123!"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: Docker is not installed or not in PATH${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo -e "${RED}Error: Docker Compose is not installed${NC}"
        exit 1
    fi
}

get_compose_cmd() {
    if command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    else
        echo "docker compose"
    fi
}

verify_permission_groups() {
    echo -e "${GREEN}Verifying permission groups setup...${NC}"
    $(get_compose_cmd) exec backend flask create-permission-groups verify
}

fix_permission_groups() {
    echo -e "${YELLOW}Fixing permission groups setup...${NC}"
    echo -e "${GREEN}Creating permission groups and role assignments...${NC}"
    $(get_compose_cmd) exec backend flask create-permission-groups run
    echo -e "${GREEN}Permission groups setup complete!${NC}"
}

start_application() {
    echo -e "${GREEN}Starting FBO LaunchPad application...${NC}"
    $(get_compose_cmd) up -d
    echo -e "${GREEN}Application started! Database will be auto-seeded if empty.${NC}"
    echo -e "${YELLOW}Waiting for application to initialize...${NC}"
    sleep 10
    
    # Verify permission groups were created
    echo -e "${YELLOW}Verifying permission groups setup...${NC}"
    if ! $(get_compose_cmd) exec backend flask create-permission-groups verify > /dev/null 2>&1; then
        echo -e "${YELLOW}Permission groups may not be set up correctly. Running fix...${NC}"
        fix_permission_groups
    else
        echo -e "${GREEN}Permission groups verified successfully!${NC}"
    fi
    
    echo -e "${YELLOW}Checking application logs...${NC}"
    $(get_compose_cmd) logs backend | tail -20
}

force_reseed() {
    echo -e "${YELLOW}Force reseeding database...${NC}"
    echo -e "${RED}WARNING: This will delete ALL existing data!${NC}"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}Reseeding database...${NC}"
        $(get_compose_cmd) exec backend flask seed run
        echo -e "${GREEN}Creating permission groups and role assignments...${NC}"
        $(get_compose_cmd) exec backend flask create-permission-groups run
        echo -e "${GREEN}Verifying permission groups setup...${NC}"
        $(get_compose_cmd) exec backend flask create-permission-groups verify
        echo -e "${GREEN}Database reseeded successfully with permission groups!${NC}"
    else
        echo -e "${YELLOW}Operation cancelled.${NC}"
    fi
}

fresh_start() {
    echo -e "${YELLOW}Starting fresh (will remove all data and volumes)...${NC}"
    echo -e "${RED}WARNING: This will delete ALL data including the database!${NC}"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}Stopping containers...${NC}"
        $(get_compose_cmd) down -v
        echo -e "${GREEN}Starting fresh...${NC}"
        $(get_compose_cmd) up -d
        echo -e "${GREEN}Fresh start complete! Database will be seeded automatically.${NC}"
        echo -e "${YELLOW}Waiting for application to initialize...${NC}"
        sleep 15
        
        # Verify permission groups were created
        echo -e "${YELLOW}Verifying permission groups setup...${NC}"
        if ! $(get_compose_cmd) exec backend flask create-permission-groups verify > /dev/null 2>&1; then
            echo -e "${YELLOW}Permission groups may not be set up correctly. Running fix...${NC}"
            fix_permission_groups
        else
            echo -e "${GREEN}Permission groups verified successfully!${NC}"
        fi
        
        echo -e "${YELLOW}Checking application logs...${NC}"
        $(get_compose_cmd) logs backend | tail -20
    else
        echo -e "${YELLOW}Operation cancelled.${NC}"
    fi
}

show_status() {
    echo -e "${GREEN}Container Status:${NC}"
    $(get_compose_cmd) ps
    echo ""
    echo -e "${GREEN}Database Connection Test:${NC}"
    $(get_compose_cmd) exec backend python -c "
from src.app import create_app
from src.extensions import db
from src.models.user import User
from src.models.permission_group import PermissionGroup

try:
    app = create_app()
    with app.app_context():
        user_count = User.query.count()
        group_count = PermissionGroup.query.count()
        print(f'Database connection: OK')
        print(f'Total users in database: {user_count}')
        print(f'Total permission groups: {group_count}')
        
        if user_count > 0:
            users = User.query.all()
            print('Existing users:')
            for user in users:
                roles = ', '.join([role.name for role in user.roles])
                print(f'  - {user.email} ({roles})')
        
        if group_count == 0:
            print('⚠️  WARNING: No permission groups found! Users may not have proper permissions.')
            print('   Run: ./reseed_database.sh fix-perms')
        else:
            print(f'✅ Permission groups are set up correctly.')
            
except Exception as e:
    print(f'Database connection: FAILED - {e}')
" 2>/dev/null || echo -e "${RED}Cannot connect to database or backend not running${NC}"
}

show_logs() {
    echo -e "${GREEN}Application Logs:${NC}"
    $(get_compose_cmd) logs -f backend
}

stop_containers() {
    echo -e "${GREEN}Stopping containers...${NC}"
    $(get_compose_cmd) down
    echo -e "${GREEN}Containers stopped.${NC}"
}

# Main script logic
check_docker

case "${1:-start}" in
    start)
        start_application
        ;;
    reseed)
        force_reseed
        ;;
    fresh)
        fresh_start
        ;;
    verify)
        verify_permission_groups
        ;;
    fix-perms)
        fix_permission_groups
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    stop)
        stop_containers
        ;;
    help|--help|-h)
        print_usage
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        print_usage
        exit 1
        ;;
esac 