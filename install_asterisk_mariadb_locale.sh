        #TO RUN THIS SCRIPT
        #nano install_asterisk_mariadb_locale.sh
        #chmod +x install_asterisk_mariadb_locale.sh
        #sudo bash ./install_asterisk_mariadb_locale.sh
        #USING EC2 INSTANCE

        #!/bin/bash

        # Exit on error
        set -e

        # Start logging
        exec 1> >(tee "install_log.txt")
        exec 2>&1

        # Color codes for output
        RED='\033[0;31m'
        GREEN='\033[0;32m'
        YELLOW='\033[1;33m'
        NC='\033[0m' # No Color

        # Version variables
        ASTERISK_VERSION="18.20.0"
        ASTERISK_OFFICIAL_URL="https://downloads.asterisk.org/pub/telephony/asterisk/releases/asterisk-${ASTERISK_VERSION}.tar.gz"
        ASTERISK_MIRROR_URL="https://www.asterisk.org/downloads/asterisk/releases/asterisk-${ASTERISK_VERSION}.tar.gz"

        # Function to print section headers
        print_section() {
        echo -e "\n${YELLOW}=== $1 ===${NC}"
        }

        # Function to print success messages
        print_success() {
        echo -e "${GREEN}✓ $1${NC}"
        }

        # Function to print error messages
        print_error() {
        echo -e "${RED}✗ $1${NC}"
        exit 1
        }

        # Function to handle errors
        handle_error() {
            print_error "Error occurred in script at line: ${1}, exit status: ${2}"
        }

        # Enable error handling
        trap 'handle_error ${LINENO} $?' ERR

        print_section "Starting Installation at $(date)"
        print_success "Installation script initialized"

        #Part II - Install Locale
        # Locale Configuration
        print_section "Starting Locale Configuration"

        # Install required locale packages
        print_section "Installing Locale Requirements"
        sudo apt-get update
        sudo apt-get install -y \
            locales \
            locales-all
        print_success "Installed locale packages"

        # Generate required locales
        print_section "Generating Locales"
        sudo locale-gen en_US.UTF-8
        sudo locale-gen en_GB.UTF-8
        print_success "Generated en_US.UTF-8 and en_GB.UTF-8 locales"

        # Set system-wide locale preferences
        print_section "Configuring System Locales"
        sudo update-locale \
            LANG=en_US.UTF-8 \
            LANGUAGE=en_US:en \
            LC_ALL=en_US.UTF-8
        print_success "Updated system locale settings"

        # Update environment variables for current session
        print_section "Updating Current Session"
        export LANG=en_US.UTF-8
        export LANGUAGE=en_US:en
        export LC_ALL=en_US.UTF-8
        print_success "Updated current session environment variables"

        # Create or update locale configuration file
        print_section "Updating Locale Configuration"
        sudo tee /etc/default/locale > /dev/null << EOF
        LANG=en_US.UTF-8
        LANGUAGE=en_US:en
        LC_ALL=en_US.UTF-8
        EOF
        print_success "Created locale configuration file"

        # Verify the changes
        print_section "Verifying Locale Settings"
        echo "Current locale settings:"
        locale
        print_success "Locale configuration complete"

        # Final locale check
        if locale -a | grep -q 'en_US.utf8'; then
            print_success "en_US.UTF-8 locale is properly installed and configured"
        else
            print_error "Failed to configure en_US.UTF-8 locale"
        fi

        print_section "MariaDB and ODBC Installation"

        # Detect system architecture and set appropriate paths
        ARCH=$(dpkg --print-architecture)
        print_success "Detected system architecture: ${ARCH}"

        # Set library path based on architecture
        if [ "${ARCH}" = "arm64" ]; then
            LIB_PATH="/usr/lib/aarch64-linux-gnu"
        else
            LIB_PATH="/usr/lib/x86_64-linux-gnu"
        fi
        print_success "Using library path: ${LIB_PATH}"

        # Remove existing ODBC packages
        print_section "Cleaning Previous Installation"
        sudo apt-get remove -y \
            unixodbc \
            unixodbc-dev \
            odbc-mariadb \
            || true
        print_success "Removed existing packages"

        # Install dependencies
        print_section "Installing Dependencies"
        sudo apt-get update
        sudo apt-get install -y \
            wget \
            curl \
            unixodbc \
            unixodbc-dev \
            libmariadb3 \
            mariadb-client \
            mariadb-server \
            libmariadb-dev \
            odbc-mariadb
        print_success "Installed all required packages"

        # Create directories
        print_section "Setting Up Directory Structure"
        sudo mkdir -p "${LIB_PATH}/odbc"
        print_success "Created ODBC directories"

        # Configure MariaDB
        print_section "Configuring MariaDB"
        sudo systemctl start mariadb || print_error "Failed to start MariaDB"
        sudo systemctl enable mariadb || print_error "Failed to enable MariaDB"

        # Configure MariaDB to listen on all interfaces
        sudo mkdir -p /etc/mysql/mariadb.conf.d
        sudo tee /etc/mysql/mariadb.conf.d/50-server.cnf > /dev/null << EOF
        [mysqld]
        bind-address = 0.0.0.0
        port = 3306
        EOF

        #Create Asterisk Database
        print_section "Setting up MariaDB for Asterisk"

        # Create database and user
        sudo mysql -e "CREATE DATABASE IF NOT EXISTS asterisk DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;"
        sudo mysql -e "CREATE USER IF NOT EXISTS 'mayday_user'@'localhost' IDENTIFIED BY 'Pasword@256';"
        sudo mysql -e "CREATE USER IF NOT EXISTS 'mayday_user'@'%' IDENTIFIED BY 'Pasword@256';"
        sudo mysql -e "GRANT ALL PRIVILEGES ON asterisk.* TO 'mayday_user'@'localhost';"
        sudo mysql -e "GRANT ALL PRIVILEGES ON asterisk.* TO 'mayday_user'@'%';"
        sudo mysql -e "FLUSH PRIVILEGES;"

        # Verify database creation
        if mysql -e "USE asterisk;" 2>/dev/null; then
            print_success "Asterisk database created successfully"
        else
            print_error "Failed to create asterisk database"
        fi

        # Verify user creation and permissions
        if mysql -u mayday_user -p'Pasword@256' -e "USE asterisk;" 2>/dev/null; then
            print_success "Database user verified successfully"
        else
            print_error "Failed to verify database user"
        fi
        # Restart MariaDB
        sudo systemctl restart mariadb || print_error "Failed to restart MariaDB"
        print_success "Configured and restarted MariaDB"

        # Verify MariaDB ODBC installation
        print_section "Verifying MariaDB ODBC Installation"
        if dpkg -l | grep -q odbc-mariadb; then
            print_success "MariaDB ODBC package installed"
        else
            print_error "MariaDB ODBC package not found"
        fi

        # Locate driver
        MAODBC_PATH="${LIB_PATH}/odbc/libmaodbc.so"
        if [ -f "${MAODBC_PATH}" ]; then
            print_success "Found ODBC driver at: ${MAODBC_PATH}"
        else
            print_error "ODBC driver not found at: ${MAODBC_PATH}"
        fi

        # Set permissions
        print_section "Configuring Permissions"
        sudo chmod 755 "${MAODBC_PATH}"
        print_success "Set driver permissions to 755"

        # Configure ODBC
        print_section "Configuring ODBC"
        sudo tee /etc/odbcinst.ini > /dev/null << EOF
        [MariaDB]
        Description = MariaDB driver
        Driver = ${MAODBC_PATH}
        Setup = ${MAODBC_PATH}
        FileUsage = 1
        Threading = 2
        EOF
        print_success "Created odbcinst.ini configuration"

        sudo tee /etc/odbc.ini > /dev/null << EOF
        [asterisk-connector]
        Description = MariaDB connection to asterisk database
        Driver = MariaDB
        Database = asterisk
        Server = localhost
        Port = 3306
        User = mayday_user
        Password = Pasword@256
        Option = 3
        Charset = utf8
        EOF
        print_success "Created odbc.ini configuration"

        #Part III - Asterisk Installation
        # Clean up any existing Asterisk installation
        print_section "Cleaning Existing Asterisk Installation"
        sudo systemctl stop asterisk 2>/dev/null || true
        sudo apt-get purge -y asterisk* 2>/dev/null || true
        sudo rm -rf \
            /usr/lib/asterisk \
            /etc/asterisk \
            /var/lib/asterisk \
            /var/spool/asterisk \
            /var/log/asterisk \
            /var/run/asterisk \
            2>/dev/null || true
        print_success "Cleaned up existing Asterisk installation"

        # Install Asterisk dependencies
        print_section "Installing Asterisk Dependencies"
        sudo apt-get install -y \
            build-essential \
            git \
            libedit-dev \
            uuid-dev \
            libjansson-dev \
            libxml2-dev \
            sqlite3 \
            libsqlite3-dev \
            pkg-config \
            libssl-dev \
            libnewt-dev \
            libncurses5-dev \
            subversion \
            libspeex-dev \
            libcurl4-openssl-dev \
            libogg-dev \
            libvorbis-dev \
            autoconf \
            automake \
            libtool \
            libical-dev \
            libspandsp-dev \
            libresample1-dev \
            libc-client2007e-dev \
            libgmime-3.0-dev \
            libtool-bin \
            default-mysql-client \
            default-mysql-server \
            default-libmysqlclient-dev \
            autoconf \
            automake \
            libtool \
            libtool-bin \
            m4 \
            libsrtp2-dev \
            libgsm1-dev \
            python3-dev \
            autoconf-archive \
            libltdl-dev \
            autotools-dev \
        print_success "Installed Asterisk dependencies"

        # Download and install Asterisk
        print_section "Downloading Asterisk"
        cd /usr/src
        git clone -b 20 https://github.com/asterisk/asterisk.git
        cd asterisk
        print_success "Downloaded Asterisk successfully"

        print_section "Configuring Asterisk Build"
        ./configure --with-jansson-bundled --with-pjproject-bundled --with-ssl --with-srtp
        print_success "Configured Asterisk build"

        # Create menuselect configuration
        print_section "Configuring Menuselect Options"
        cat << 'END' > menuselect.configfile
        MENUSELECT_ADDONS=
        MENUSELECT_APPS=
        MENUSELECT_BRIDGES=
        MENUSELECT_CDR=
        MENUSELECT_CEL=
        MENUSELECT_CHANNELS=
        MENUSELECT_CODECS=
        MENUSELECT_FORMATS=
        MENUSELECT_FUNCS=
        MENUSELECT_PBX=
        MENUSELECT_RES=
        MENUSELECT_TESTS=
        MENUSELECT_CFLAGS=
        MENUSELECT_OPTS_app_voicemail=
        MENUSELECT_UTILS=
        MENUSELECT_AGIS=
        MENUSELECT_CORE_SOUNDS=CORE-SOUNDS-EN-GSM
        MENUSELECT_MOH=MOH-OPSOUND-WAV
        MENUSELECT_EXTRA_SOUNDS=
        MENUSELECT_BUILD_DEPS=
        END

        # Enable all required modules
        make menuselect/m# Enable all required modules
        make menuselect/menuselect menuselect-tree menuselect.makeopts
        ./menuselect/menuselect --enable chan_pjsip \
        --enable res_pjsip \
        --enable res_pjsip_session \
        --enable res_pjsip_sdp_rtp \
        --enable res_sorcery_astdb \
        --enable res_sorcery_config \
        --enable res_sorcery_memory \
        --enable res_sorcery_realtime \
        --enable res_pjsip_transport_websocket \
        --enable res_http_websocket \
        --enable res_ari \
        --enable res_ari_applications \
        --enable res_ari_asterisk \
        --enable res_ari_bridges \
        --enable res_ari_channels \
        --enable res_ari_endpoints \
        --enable res_ari_events \
        --enable res_ari_recordings \
        --enable res_ari_sounds \
        --enable res_odbc \
        menuselect.makeopts

        print_success "Created menuselect configuration and enabled required modules"

        # Create Asterisk user first
        print_section "Creating Asterisk User"
        sudo useradd -r asterisk || true
        print_success "Created Asterisk user"
        # Add CDR MySQL configuration
        print_section "Configuring CDR MySQL"

        # Ensure asterisk config directory exists with proper ownership
        sudo mkdir -p /etc/asterisk
        sudo chown -R asterisk:asterisk /etc/asterisk
        sudo chmod -R 755 /etc/asterisk

        # Create cdr_mysql.conf
        sudo tee /etc/asterisk/cdr_mysql.conf > /dev/null << EOF
        [global]
        hostname=localhost
        dbname=asterisk
        table=cdr
        password=Pasword@256
        user=mayday_user
        userfield=1
        EOF
        print_success "Created cdr_mysql.conf"

        # Create CDR table
        print_section "Creating CDR Table"
        sudo mysql -u root asterisk << EOF
        CREATE TABLE IF NOT EXISTS cdr (
            calldate datetime NOT NULL default '0000-00-00 00:00:00',
            clid varchar(80) NOT NULL default '',
            src varchar(80) NOT NULL default '',
            dst varchar(80) NOT NULL default '',
            dcontext varchar(80) NOT NULL default '',
            channel varchar(80) NOT NULL default '',
            dstchannel varchar(80) NOT NULL default '',
            lastapp varchar(80) NOT NULL default '',
            lastdata varchar(80) NOT NULL default '',
            duration int(11) NOT NULL default '0',
            billsec int(11) NOT NULL default '0',
            disposition varchar(45) NOT NULL default '',
            amaflags int(11) NOT NULL default '0',
            accountcode varchar(20) NOT NULL default '',
            uniqueid varchar(32) NOT NULL default '',
            userfield varchar(255) NOT NULL default '',
            sequence int(11) NOT NULL AUTO_INCREMENT,
            PRIMARY KEY (sequence)
        ) ENGINE=InnoDB;
        EOF
        print_success "Created CDR table in MySQL"

        # Build and install Asterisk
        print_section "Building Asterisk"
        sudo make -j$(nproc)
        sudo make install
        sudo make samples
        sudo make config
        sudo ldconfig
        print_success "Built and installed Asterisk"

        # Create Asterisk user and set permissions
        print_section "Setting Up Asterisk User and Permissions"
        sudo useradd -r asterisk || true
        sudo chown -R asterisk:asterisk /var/lib/asterisk
        sudo chown -R asterisk:asterisk /var/log/asterisk
        sudo chown -R asterisk:asterisk /var/run/asterisk
        sudo chown -R asterisk:asterisk /var/spool/asterisk
        sudo chown -R asterisk:asterisk /usr/lib/asterisk
        sudo chmod -R 750 /var/lib/asterisk
        sudo chmod -R 750 /var/log/asterisk
        sudo chmod -R 750 /var/run/asterisk
        sudo chmod -R 750 /var/spool/asterisk
        print_success "Set up user and permissions"

        # Configure Asterisk
        print_section "Configuring Asterisk"

        # Configure modules.conf
        [modules]
        autoload=yes

        ; Core realtime and sorcery (load first)
        preload => res_odbc.so
        preload => res_config_odbc.so
        preload => res_sorcery.so
        preload => res_sorcery_config.so
        preload => res_sorcery_realtime.so

        ; ARI Stack
        preload => http.so
        preload => res_http_websocket.so
        preload => res_stasis.so
        preload => res_ari.so
        preload => res_ari_model.so
        preload => res_ari_applications.so
        preload => res_ari_asterisk.so
        preload => res_ari_bridges.so
        preload => res_ari_channels.so
        preload => res_ari_endpoints.so
        preload => res_ari_events.so
        preload => res_ari_recordings.so
        preload => res_ari_sounds.so

        ; PJSIP Stack
        preload => res_pjproject.so
        preload => res_pjsip.so
        preload => res_pjsip_session.so
        preload => chan_pjsip.so
        preload => res_pjsip_transport_websocket.so

        ; Explicitly disable unnecessary modules
        noload = chan_alsa.so
        noload = res_hep.so
        noload = res_hep_pjsip.so
        noload = res_hep_rtcp.so
        noload = app_voicemail_imap.so
        noload = app_voicemail_odbc.so
        EOF
        print_success "Configured modules.conf"

        # Configure res_odbc.conf
        sudo tee /etc/asterisk/res_odbc.conf > /dev/null << EOF
        [general]
        pooling = no
        shared_connections = yes
        limit = 0
        pre-connect = yes

        [asterisk-connector]
        enabled = yes
        dsn = asterisk-connector
        username = mayday_user
        password = Pasword@256
        pre-connect = yes
        pooling = no
        limit = 0
        idlecheck = 3600
        EOF
        print_success "Configured res_odbc.conf"

        # Configure HTTP for ARI
        sudo tee /etc/asterisk/http.conf > /dev/null << EOF
        [general]
        enabled = yes
        bindaddr = 0.0.0.0
        bindport = 8088
        prefix = ari
        enablestatic = yes
        cors_enable = yes
        cors_allow_origin = *
        EOF
        print_success "Configured http.conf"

        # Configure ARI
        sudo tee /etc/asterisk/ari.conf > /dev/null << EOF
        [general]
        enabled = yes
        pretty = yes
        allowed_origins = *

        [asterisk]
        type = user
        password = asterisk
        password_format = plain
        EOF
        print_success "Configured ari.conf"

        # Configure basic extensions
        sudo tee /etc/asterisk/extensions.conf > /dev/null << EOF
        [general]
        static=yes
        writeprotect=no
        clearglobalvars=no

        [globals]

        [from-internal]
        exten => _X.,1,NoOp(Dialed extension \${EXTEN})
        same => n,Dial(PJSIP/\${EXTEN})
        same => n,Hangup()
        EOF
        print_success "Configured extensions.conf"

        # Configure PJSIP
        sudo tee /etc/asterisk/pjsip.conf > /dev/null << EOF
        [global]
        type=global
        user_agent=Asterisk PBX

        [transport-udp]
        type=transport
        protocol=udp
        bind=0.0.0.0:5060

        [1000]
        type=endpoint
        context=from-internal
        disallow=all
        allow=ulaw
        allow=alaw
        auth=1000-auth
        aors=1000-aor

        [1000-auth]
        type=auth
        auth_type=userpass
        password=welcome123
        username=1000

        [1000-aor]
        type=aor
        max_contacts=1
        EOF
        print_success "Configured pjsip.conf"

        # Create systemd service
        print_section "Creating Systemd Service"
        sudo tee /etc/systemd/system/asterisk.service > /dev/null << EOF
        [Unit]
        Description=Asterisk PBX
        After=network.target mariadb.service

        [Service]
        Type=forking
        ExecStart=/usr/sbin/asterisk -g
        ExecStop=/usr/sbin/asterisk -rx 'core stop now'
        ExecReload=/usr/sbin/asterisk -rx 'core reload'
        Restart=always
        RestartSec=10
        User=asterisk
        Group=asterisk

        [Install]
        WantedBy=multi-user.target
        EOF
        print_success "Created systemd service file"

        # Reload systemd and start services
        print_section "Starting Services"
        sudo systemctl daemon-reload
        sudo systemctl enable asterisk
        sudo systemctl start asterisk
        print_success "Started Asterisk service"

        #Part IV - Testing and Verification
        # Final Verification
        print_section "Final Verification Phase"

        # Verify MariaDB
        print_section "Verifying MariaDB"
        if systemctl is-active --quiet mariadb; then
            print_success "MariaDB service is running"
            # Test database creation
            if mysql -u root -e "USE asterisk;" 2>/dev/null; then
                print_success "Asterisk database exists and is accessible"
            else
                print_error "Cannot access asterisk database"
            fi
        else
            print_error "MariaDB service is not running"
        fi

        # Verify ODBC
        print_section "Verifying ODBC Configuration"
        echo "Driver Manager Configuration:"
        odbcinst -j
        echo -e "\nInstalled Drivers:"
        odbcinst -q -d

        # Test ODBC Connection
        print_section "Testing ODBC Connection"
        if echo "quit" | isql -v asterisk-connector mayday_user Pasword@256; then
            print_success "ODBC connection test successful"
        else
            print_error "ODBC connection test failed"
        fi

        # Verify Asterisk
        print_section "Verifying Asterisk Installation"

        # Check Asterisk service
        if systemctl is-active --quiet asterisk; then
            print_success "Asterisk service is running"
        else
            print_error "Asterisk service is not running"
        fi

        # Wait for control socket to be ready (up to 30 seconds)
        print_section "Waiting for Asterisk control socket"
        for i in {1..30}; do
            if [ -S "/var/run/asterisk/asterisk.ctl" ]; then
                print_success "Asterisk control socket is ready"
                break
            fi
            echo "Waiting for socket... ($i/30)"
            sleep 1
            if [ $i -eq 30 ]; then
                print_error "Timeout waiting for Asterisk control socket"
            fi
        done

        # Change to asterisk directory and check version
        cd /var/lib/asterisk
        ASTERISK_RUNNING_VERSION=$(sudo -u asterisk asterisk -V)
        print_success "Installed Asterisk version: ${ASTERISK_RUNNING_VERSION}"

        # Test Asterisk CLI with proper directory context
        print_section "Testing Asterisk CLI"
        if cd /var/lib/asterisk && sudo -u asterisk asterisk -rx "core show version" > /dev/null; then
            print_success "Asterisk CLI is responsive"
        else
            # If failed, try restarting Asterisk and wait again
            print_section "Attempting to restart Asterisk"
            sudo systemctl restart asterisk
            sleep 5
            if cd /var/lib/asterisk && sudo -u asterisk asterisk -rx "core show version" > /dev/null; then
                print_success "Asterisk CLI is now responsive after restart"
            else
                print_error "Asterisk CLI is not responding"
            fi
        fi

        # Verify ARI configuration
        print_section "Verifying ARI Configuration"
        if curl -s -u asterisk:asterisk http://localhost:8088/ari/api-docs/resources.json > /dev/null; then
            print_success "ARI is accessible"
        else
            print_warning "ARI endpoint not responding - may need manual verification"
        fi

        # Check required modules
        print_section "Verifying Required Modules"
        REQUIRED_MODULES=("res_http_websocket" "res_ari" "res_ari_applications" "res_odbc" "cdr_mysql")
        for module in "${REQUIRED_MODULES[@]}"; do
            if cd /var/lib/asterisk && sudo -u asterisk asterisk -rx "module show like ${module}" | grep -q "Running"; then
                print_success "Module $module is loaded"
            else
                print_error "Required module $module is not loaded"
            fi
        done

        # Check PJSIP configuration
        print_section "Verifying PJSIP Configuration"
        if cd /var/lib/asterisk && sudo -u asterisk asterisk -rx "pjsip show endpoints" | grep -q "1000"; then
            print_success "PJSIP endpoint 1000 is configured"
        else
            print_error "PJSIP endpoint 1000 is not configured"
        fi

        # Installation Summary
        print_section "Installation Summary"
        echo "Locale Configuration:"
        echo "✓ System locale: $(locale | grep LANG=)"
        echo "✓ Character encoding: $(locale | grep LC_CTYPE=)"

        echo -e "\nMariaDB Configuration:"
        echo "✓ Service: Running on port 3306"
        echo "✓ Database: asterisk"
        echo "✓ User: mayday_user"

        echo -e "\nODBC Configuration:"
        echo "✓ Driver: MariaDB"
        echo "✓ DSN: asterisk-connector"
        echo "✓ Connection test: Successful"

        echo -e "\nAsterisk Configuration:"
        echo "✓ Version: ${ASTERISK_RUNNING_VERSION}"
        echo "✓ Service: Running"
        echo "✓ ARI: Enabled on port 8088"
        echo "✓ PJSIP: Configured with test extension 1000"

        echo -e "\nAccess Information:"
        echo "Default SIP Extension: 1000"
        echo "SIP Password: welcome123"
        echo "ARI Username: asterisk"
        echo "ARI Password: asterisk"
        echo "ARI URL: http://localhost:8088/ari"
        echo "Database User: mayday_user"
        echo "Database Password: Pasword@256"

        print_section "Post-Installation Notes"
        echo "1. To access Asterisk CLI: sudo asterisk -rvvv"
        echo "2. To test SIP registration: Use extension 1000 with password welcome123"
        echo "3. To access ARI: http://your-server-ip:8088/ari"
        echo "4. To connect to database: mysql -u mayday_user -p asterisk"
        echo "5. Check installation log: cat install_log.txt"

        print_section "Installation Complete at $(date)"
        echo "If you encounter any issues, please check the installation log"
        echo "or run the specific verification steps mentioned above."

        # Save important information to a file
        print_section "Saving Configuration Summary"
        {
            echo "Installation Summary ($(date))"
            echo "================================"
            echo "Server Information:"
            echo "- Hostname: $(hostname)"
            echo "- IP Address: $(hostname -I | awk '{print $1}')"
            echo "- Architecture: $(uname -m)"
            echo "- OS: $(lsb_release -ds)"
            echo ""
            echo "Asterisk Information:"
            echo "- Version: ${ASTERISK_RUNNING_VERSION}"
            echo "- SIP Extension: 1000"
            echo "- SIP Password: welcome123"
            echo ""
            echo "Database Information:"
            echo "- User: mayday_user"
            echo "- Password: Pasword@256"
            echo "- Database: asterisk"
            echo ""
            echo "ARI Information:"
            echo "- Username: asterisk"
            echo "- Password: asterisk"
            echo "- URL: http://$(hostname -I | awk '{print $1}'):8088/ari"
        } | sudo tee /root/asterisk_install_summary.txt

        print_success "Installation summary saved to /root/asterisk_install_summary.txt"
        print_success "Installation process completed successfully!"
