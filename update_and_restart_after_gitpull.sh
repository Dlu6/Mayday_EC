#!/bin/bash

# Log file for deployment
DEPLOY_LOG="/var/log/mayday-deployment.log"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$DEPLOY_LOG"
}

# Function to check if a service is running
check_service() {
    if pm2 list | grep -q "$1"; then
        return 0
    else
        return 1
    fi
}

# Function to handle errors
handle_error() {
    log_message "ERROR: $1"
    
    if [ ! -z "$BACKUP_DIR" ]; then
        log_message "Attempting rollback..."
        if rollback_from_backup "$BACKUP_DIR"; then
            log_message "Rollback completed successfully"
        else
            log_message "CRITICAL: Rollback failed. Manual intervention required"
        fi
    fi
    
    exit 1
}

# Store initial service status
INITIAL_SERVICE_STATUS="stopped"
if check_service "mayday"; then
    INITIAL_SERVICE_STATUS="running"
fi

# Start deployment
log_message "Starting system update"

# Backup current state
log_message "Creating backup of current state"
BACKUP_DIR="/home/admin/mayday-backup-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r /home/admin/Mayday-CRM-Scracth/* "$BACKUP_DIR/" || handle_error "Failed to create backup"

# Navigate to project directory
cd /home/admin/Mayday-CRM-Scracth || handle_error "Failed to navigate to project directory"

# Configure git if token and repo are provided
if [ ! -z "$GH_TOKEN" ] && [ ! -z "$GH_REPO" ]; then
    log_message "Configuring git credentials"
    git remote set-url origin "https://${GH_TOKEN}@${GH_REPO#https://}"
fi

# Stash any local changes
log_message "Stashing local changes"
git stash || handle_error "Failed to stash local changes"

# Reset any local changes
log_message "Resetting local changes"
git reset --hard HEAD || handle_error "Failed to reset local changes"
git clean -f -d || handle_error "Failed to clean working directory"

# Pull latest changes
log_message "Pulling latest changes from git"
git pull origin main --no-rebase || handle_error "Failed to pull latest changes"

# Install server dependencies
log_message "Installing server dependencies"
npm install || handle_error "Server dependencies installation failed"

# Install and build client
log_message "Installing and building client"
cd client || handle_error "Failed to navigate to client directory"
npm install || handle_error "Client dependencies installation failed"
npm run build || handle_error "Client build failed"

# Return to project root
cd ..

# Stop the current service
log_message "Stopping current service"
pm2 stop mayday || true

# Install any new dependencies
log_message "Installing new dependencies"
npm install || handle_error "Failed to install new dependencies"

# Restart the application using PM2
log_message "Restarting application with PM2"
pm2 restart mayday || handle_error "Failed to restart application"

# Verify service is running
if ! check_service "mayday"; then
    handle_error "Service failed to start"
fi

log_message "System update completed successfully"
exit 0

# Add these functions at the top after the existing functions
rollback_from_backup() {
    local BACKUP_DIR="$1"
    log_message "Rolling back from backup: $BACKUP_DIR"
    
    # Stop the current service
    pm2 stop mayday || true
    
    # Restore from backup
    rm -rf /home/admin/Mayday-CRM-Scracth/*
    cp -r "$BACKUP_DIR"/* /home/admin/Mayday-CRM-Scracth/
    
    # Restart the service
    pm2 restart mayday
    
    if check_service "mayday"; then
        log_message "Rollback successful"
        return 0
    else
        log_message "ERROR: Rollback failed to restart service"
        return 1
    fi
}

verify_services() {
    log_message "Verifying critical services..."
    
    # Check PM2
    if ! check_service "mayday"; then
        return 1
    fi
    
    # Check MySQL if configured
    if [ ! -z "$DB_HOST" ]; then
        mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" > /dev/null 2>&1 || return 1
    fi
    
    # Check Redis if enabled
    if [ "$REDIS_ENABLED" = "true" ]; then
        redis-cli -h "$REDIS_HOST" ping > /dev/null 2>&1 || return 1
    fi
    
    return 0
}

