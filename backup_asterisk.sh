        #!/bin/bash
        # backingup_asterisk.sh

        # Colors for output
        RED='\033[0;31m'
        GREEN='\033[0;32m'
        YELLOW='\033[1;33m'
        NC='\033[0m' # No Color

        # Define variables
        BACKUP_DIR="/backup/asterisk"
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        BACKUP_ID=$(openssl rand -hex 4)
        BACKUP_NAME="asterisk_${TIMESTAMP}_${BACKUP_ID}"

        # MySQL credentials - you might want to store these securely
        MYSQL_USER="root"
        MYSQL_PASS="Pasword@256"  # Consider using .my.cnf instead

        # Additional system configurations to backup
        EXTRA_CONFIGS=(
            "/etc/odbc.ini"
            "/etc/odbcinst.ini"
            "/etc/asterisk/pjsip.conf"
            "/etc/asterisk/sorcery.conf"
            "/etc/asterisk/extconfig.conf"
            "/etc/asterisk/manager.conf"
        )

        # Create a special directory for these critical configs
        mkdir -p "${BACKUP_DIR}/critical_configs"

        # Backup these files with special handling
        for config in "${EXTRA_CONFIGS[@]}"; do
            if [ -f "$config" ]; then
                # Preserve directory structure
                dest="${BACKUP_DIR}/critical_configs${config}"
                mkdir -p "$(dirname "$dest")"
                cp -p "$config" "$dest"
                echo "Backed up critical config: $config"
                
                # Add to manifest with full content
                echo "=== Content of $config ===" >> "${BACKUP_DIR}/critical_configs_content.txt"
                cat "$config" >> "${BACKUP_DIR}/critical_configs_content.txt"
                echo -e "\n\n" >> "${BACKUP_DIR}/critical_configs_content.txt"
            else
                echo "Warning: Critical config not found: $config"
            fi
        done
        # Create required directories
        mkdir -p "${BACKUP_DIR}"/{configs,databases,logs,manifests}

        # Start logging
        exec 1> >(tee "${BACKUP_DIR}/logs/backup_${TIMESTAMP}.log")
        exec 2>&1

        echo -e "${GREEN}Starting Asterisk backup at $(date)${NC}"
        echo "Backup ID: ${BACKUP_ID}"

        # Function to check if a command succeeded
        check_status() {
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ $1 successful${NC}"
            else
                echo -e "${RED}✗ $1 failed${NC}"
                exit 1
            fi
        }

        # Check if Asterisk is running
        if ! asterisk -rx 'core show version' &>/dev/null; then
            echo -e "${RED}Error: Asterisk is not running${NC}"
            exit 1
        fi

        # Backup Asterisk configuration files
        echo -e "${YELLOW}Backing up Asterisk configuration files...${NC}"
        tar czf "${BACKUP_DIR}/configs/${BACKUP_NAME}_configs.tar.gz" \
            --exclude='*.bak' \
            --exclude='*.old' \
            --exclude='*.log' \
            -C / \
            etc/asterisk \
            var/lib/asterisk \
            var/spool/asterisk \
            usr/lib/asterisk
        check_status "Configuration backup"

        # Backup databases
        echo -e "${YELLOW}Backing up Asterisk databases...${NC}"

        # Check if database exists before backing up
        if mysql -u$MYSQL_USER -p$MYSQL_PASS -e "use asterisk" 2>/dev/null; then
            mysqldump -u$MYSQL_USER -p$MYSQL_PASS --single-transaction \
                asterisk > "${BACKUP_DIR}/databases/${BACKUP_NAME}_asterisk.sql"
            check_status "Asterisk database backup"
        else
            echo -e "${YELLOW}Warning: 'asterisk' database not found${NC}"
        fi

        # Create detailed manifest
        MANIFEST_FILE="${BACKUP_DIR}/manifests/${BACKUP_NAME}_manifest.txt"
        echo "Asterisk Backup Manifest - ${TIMESTAMP}" > "$MANIFEST_FILE"
        echo "Backup ID: ${BACKUP_ID}" >> "$MANIFEST_FILE"
        echo "----------------------------------------" >> "$MANIFEST_FILE"

        # Save Asterisk version and status information
        echo -e "${YELLOW}Creating system snapshot...${NC}"
        {
            echo "Asterisk Version:"
            asterisk -rx 'core show version'
            echo -e "\nPJSIP Endpoints:"
            asterisk -rx 'pjsip show endpoints'
            echo -e "\nPJSIP Registrations:"
            asterisk -rx 'pjsip show registrations'
            echo -e "\nActive Channels:"
            asterisk -rx 'core show channels'
        } >> "$MANIFEST_FILE"
        check_status "System snapshot"

        # Create backup verification
        echo -e "${YELLOW}Verifying backup...${NC}"
        if [ -f "${BACKUP_DIR}/configs/${BACKUP_NAME}_configs.tar.gz" ]; then
            echo "Configuration backup size: $(du -h "${BACKUP_DIR}/configs/${BACKUP_NAME}_configs.tar.gz" | cut -f1)"
            if [ -f "${BACKUP_DIR}/databases/${BACKUP_NAME}_asterisk.sql" ]; then
                echo "Database backup size: $(du -h "${BACKUP_DIR}/databases/${BACKUP_NAME}_asterisk.sql" | cut -f1)"
            fi
            echo -e "${GREEN}Backup completed successfully at $(date)${NC}"
        else
            echo -e "${RED}Backup verification failed${NC}"
            exit 1
        fi

        # Create backup register entry
        echo "${TIMESTAMP}|${BACKUP_ID}|$(date)|$(whoami)" >> "${BACKUP_DIR}/backup_register.txt"

        # Cleanup old backups (keep last 5)
        echo -e "${YELLOW}Cleaning up old backups...${NC}"
        find "${BACKUP_DIR}/configs" -name "asterisk_*_configs.tar.gz" | sort -r | tail -n +6 | xargs -r rm
        find "${BACKUP_DIR}/databases" -name "asterisk_*_asterisk.sql" | sort -r | tail -n +6 | xargs -r rm
        find "${BACKUP_DIR}/manifests" -name "asterisk_*_manifest.txt" | sort -r | tail -n +6 | xargs -r rm
        find "${BACKUP_DIR}/logs" -name "backup_*.log" | sort -r | tail -n +6 | xargs -r rm

        echo -e "${GREEN}Backup process completed${NC}"
        echo "Backup ID: ${BACKUP_ID}"
        echo "Location: ${BACKUP_DIR}"