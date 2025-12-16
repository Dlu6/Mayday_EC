#!/bin/bash

# Mayday CRM Database Manager
# Manages both main CRM database and DataTool database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database configurations
MAIN_DB_HOST="65.1.149.92"
MAIN_DB_PORT="3306"
MAIN_DB_USER="mayday_user"
MAIN_DB_PASS="Pasword@256"
MAIN_DB_NAME="asterisk"

DATATOOL_DB_HOST="localhost"
DATATOOL_DB_PORT="3306"
DATATOOL_DB_USER="mayday_user"
DATATOOL_DB_PASS="Pasword@256"
DATATOOL_DB_NAME="mayday_crm_db"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Function to test database connection
test_connection() {
    local host=$1
    local port=$2
    local user=$3
    local pass=$4
    local db=$5
    local name=$6

    print_status "Testing connection to $name database ($host:$port)..."
    
    if mysql -h "$host" -P "$port" -u "$user" -p"$pass" "$db" -e "SELECT 1;" >/dev/null 2>&1; then
        print_status "$name database connection successful ✅"
        return 0
    else
        print_error "$name database connection failed ❌"
        return 1
    fi
}

# Function to show database status
show_status() {
    local host=$1
    local port=$2
    local user=$3
    local pass=$4
    local db=$5
    local name=$6

    print_header "$name Database Status"
    
    if test_connection "$host" "$port" "$user" "$pass" "$db" "$name"; then
        echo "Host: $host:$port"
        echo "Database: $db"
        echo "User: $user"
        
        # Get table count
        local table_count=$(mysql -h "$host" -P "$port" -u "$user" -p"$pass" "$db" -s -e "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$db';" 2>/dev/null || echo "0")
        echo "Tables: $table_count"
        
        # Get database size
        local db_size=$(mysql -h "$host" -P "$port" -u "$user" -p"$pass" "$db" -s -e "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'DB Size in MB' FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$db';" 2>/dev/null || echo "0")
        echo "Size: ${db_size}MB"
        
        echo ""
    fi
}

# Function to show table information
show_tables() {
    local host=$1
    local port=$2
    local user=$3
    local pass=$4
    local db=$5
    local name=$6

    print_header "$name Database Tables"
    
    if test_connection "$host" "$port" "$user" "$pass" "$db" "$name"; then
        mysql -h "$host" -P "$port" -u "$user" -p"$pass" "$db" -e "
            SELECT 
                TABLE_NAME,
                TABLE_ROWS,
                ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS 'Size (MB)',
                CREATE_TIME,
                UPDATE_TIME
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = '$db'
            ORDER BY TABLE_NAME;
        " 2>/dev/null || print_warning "Could not retrieve table information"
        echo ""
    fi
}

# Function to start database monitor
start_monitor() {
    print_status "Starting database monitor..."
    
    if [ -f "scripts/db-monitor.js" ]; then
        cd "$(dirname "$0")/.."
        node scripts/db-monitor.js
    else
        print_error "Database monitor script not found"
        exit 1
    fi
}

# Function to backup database
backup_database() {
    local host=$1
    local port=$2
    local user=$3
    local pass=$4
    local db=$5
    local name=$6
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    
    print_status "Creating backup of $name database..."
    
    mkdir -p "$backup_dir"
    
    local backup_file="$backup_dir/${name}_backup.sql"
    
    if mysqldump -h "$host" -P "$port" -u "$user" -p"$pass" "$db" > "$backup_file" 2>/dev/null; then
        print_status "Backup created successfully: $backup_file"
        
        # Compress backup
        gzip "$backup_file"
        print_status "Backup compressed: ${backup_file}.gz"
    else
        print_error "Backup failed"
        rm -f "$backup_file"
        return 1
    fi
}

# Function to show help
show_help() {
    echo "Mayday CRM Database Manager"
    echo "=========================="
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  status      - Show status of both databases"
    echo "  test        - Test connections to both databases"
    echo "  tables      - Show table information for both databases"
    echo "  monitor     - Start database monitoring service"
    echo "  backup      - Create backups of both databases"
    echo "  main        - Connect to main CRM database"
    echo "  datatool    - Connect to DataTool database"
    echo "  help        - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 status"
    echo "  $0 test"
    echo "  $0 monitor"
    echo "  $0 main"
}

# Main script logic
case "${1:-help}" in
    "status")
        print_header "Database Status Overview"
        show_status "$MAIN_DB_HOST" "$MAIN_DB_PORT" "$MAIN_DB_USER" "$MAIN_DB_PASS" "$MAIN_DB_NAME" "Main CRM"
        show_status "$DATATOOL_DB_HOST" "$DATATOOL_DB_PORT" "$DATATOOL_DB_USER" "$DATATOOL_DB_PASS" "$DATATOOL_DB_NAME" "DataTool"
        ;;
    "test")
        print_header "Testing Database Connections"
        test_connection "$MAIN_DB_HOST" "$MAIN_DB_PORT" "$MAIN_DB_USER" "$MAIN_DB_PASS" "$MAIN_DB_NAME" "Main CRM"
        test_connection "$DATATOOL_DB_HOST" "$DATATOOL_DB_PORT" "$DATATOOL_DB_USER" "$DATATOOL_DB_PASS" "$DATATOOL_DB_NAME" "DataTool"
        ;;
    "tables")
        show_tables "$MAIN_DB_HOST" "$MAIN_DB_PORT" "$MAIN_DB_USER" "$MAIN_DB_PASS" "$MAIN_DB_NAME" "Main CRM"
        show_tables "$DATATOOL_DB_HOST" "$DATATOOL_DB_PORT" "$DATATOOL_DB_USER" "$DATATOOL_DB_PASS" "$DATATOOL_DB_NAME" "DataTool"
        ;;
    "monitor")
        start_monitor
        ;;
    "backup")
        print_header "Creating Database Backups"
        backup_database "$MAIN_DB_HOST" "$MAIN_DB_PORT" "$MAIN_DB_USER" "$MAIN_DB_PASS" "$MAIN_DB_NAME" "main_crm"
        backup_database "$DATATOOL_DB_HOST" "$DATATOOL_DB_PORT" "$DATATOOL_DB_USER" "$DATATOOL_DB_PASS" "$DATATOOL_DB_NAME" "datatool"
        ;;
    "main")
        print_status "Connecting to Main CRM database..."
        mysql -h "$MAIN_DB_HOST" -P "$MAIN_DB_PORT" -u "$MAIN_DB_USER" -p"$MAIN_DB_PASS" "$MAIN_DB_NAME"
        ;;
    "datatool")
        print_status "Connecting to DataTool database..."
        mysql -h "$DATATOOL_DB_HOST" -P "$DATATOOL_DB_PORT" -u "$DATATOOL_DB_USER" -p"$DATATOOL_DB_PASS" "$DATATOOL_DB_NAME"
        ;;
    "help"|*)
        show_help
        ;;
esac
