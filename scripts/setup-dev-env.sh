#!/bin/bash

# Mayday CRM Development Environment Setup Script
# This script sets up the development environment for the Mayday CRM project

set -e

echo "🚀 Setting up Mayday CRM Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check Node.js version
print_status "Checking Node.js version..."
NODE_VERSION=$(node --version)
if [[ $NODE_VERSION != v18* ]]; then
    print_warning "Node.js 18.x is recommended. Current version: $NODE_VERSION"
else
    print_success "Node.js version: $NODE_VERSION"
fi

# Install dependencies
print_status "Installing root dependencies..."
npm install

# Install client dependencies
print_status "Installing client dependencies..."
cd client && npm install && cd ..

# Install server dependencies
print_status "Installing server dependencies..."
cd server && npm install && cd ..

# Create environment files if they don't exist
print_status "Setting up environment configuration..."

if [ ! -f ".env" ]; then
    print_status "Creating .env file..."
    cat > .env << EOF
# Development Environment Configuration
NODE_ENV=development
PORT=8004

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mayday_crm
DB_USER=root
DB_PASSWORD=

# Asterisk Configuration
AMI_HOST=localhost
AMI_PORT=5038
ASTERISK_AMI_USERNAME=admin
AMI_PASSWORD=admin

# ARI Configuration
ARI_HOST=localhost
ARI_PORT=8088
ARI_USERNAME=asterisk
ARI_PASSWORD=asterisk

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Logging
LOG_LEVEL=debug
LOG_FILE=logs/app.log

# CORS
CORS_ORIGIN=http://localhost:3000

# Session
SESSION_SECRET=your-session-secret-change-in-production
EOF
    print_success ".env file created"
else
    print_status ".env file already exists"
fi

# Create logs directory
print_status "Creating logs directory..."
mkdir -p logs

# Create development configuration
print_status "Setting up development configuration..."
if [ ! -f "config/development.js" ]; then
    mkdir -p config
    cat > config/development.js << EOF
module.exports = {
    // Development-specific configuration
    development: true,
    debug: true,
    hotReload: true,
    
    // Database
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        name: process.env.DB_NAME || 'mayday_crm',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        dialect: 'mysql',
        logging: console.log,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    },
    
    // Asterisk
    asterisk: {
        ami: {
            host: process.env.AMI_HOST || 'localhost',
            port: process.env.AMI_PORT || 5038,
            username: process.env.ASTERISK_AMI_USERNAME || 'admin',
            password: process.env.AMI_PASSWORD || 'admin',
            reconnect: true,
            maxReconnectAttempts: 10,
            reconnectDelay: 5000
        },
        ari: {
            host: process.env.ARI_HOST || 'localhost',
            port: process.env.ARI_PORT || 8088,
            username: process.env.ARI_USERNAME || 'asterisk',
            password: process.env.ARI_PASSWORD || 'asterisk'
        }
    },
    
    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'debug',
        file: process.env.LOG_FILE || 'logs/app.log',
        console: true
    }
};
EOF
    print_success "Development configuration created"
fi

# Create VM connection script
print_status "Setting up VM connection script..."
cat > scripts/connect-vm.sh << 'EOF'
#!/bin/bash

# Script to connect to the Asterisk VM
# Usage: ./scripts/connect-vm.sh

VM_KEY="MHU_Debian_Mumb.pem"
VM_HOST="admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com"

echo "🔗 Connecting to Mayday CRM VM..."

# Check if key file exists
if [ ! -f "$VM_KEY" ]; then
    echo "❌ Key file $VM_KEY not found!"
    echo "Please ensure the key file is in the project root directory"
    exit 1
fi

# Set proper permissions for the key file
chmod 600 "$VM_KEY"

# Connect to VM
echo "🚀 Connecting to $VM_HOST..."
ssh -i "$VM_KEY" "$VM_HOST"
EOF

chmod +x scripts/connect-vm.sh

# Create development start script
print_status "Setting up development start script..."
cat > scripts/dev-start.sh << 'EOF'
#!/bin/bash

# Development start script for Mayday CRM
# This script starts both the server and client in development mode

echo "🚀 Starting Mayday CRM in development mode..."

# Start the server
echo "📡 Starting server..."
cd server && npm run dev &

# Wait a moment for server to start
sleep 3

# Start the client
echo "🖥️  Starting client..."
cd ../client && npm start &

# Wait for both processes
wait
EOF

chmod +x scripts/dev-start.sh

# Create database setup script
print_status "Setting up database setup script..."
cat > scripts/setup-database.sh << 'EOF'
#!/bin/bash

# Database setup script for Mayday CRM
# This script sets up the MySQL database and runs migrations

echo "🗄️  Setting up Mayday CRM database..."

# Check if MySQL is running
if ! pgrep -x "mysqld" > /dev/null; then
    echo "❌ MySQL is not running. Please start MySQL first."
    exit 1
fi

# Create database if it doesn't exist
echo "📊 Creating database..."
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS mayday_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Run migrations
echo "🔄 Running database migrations..."
cd server && npx sequelize-cli db:migrate

# Run seeders (optional)
echo "🌱 Running database seeders..."
npx sequelize-cli db:seed:all

echo "✅ Database setup complete!"
EOF

chmod +x scripts/setup-database.sh

# Update package.json scripts
print_status "Updating package.json scripts..."
if ! grep -q "dev:setup" package.json; then
    # Add new scripts to package.json
    sed -i '' 's/"scripts": {/"scripts": {\n    "dev:setup": "bash scripts\/setup-dev-env.sh",\n    "dev:start": "bash scripts\/dev-start.sh",\n    "dev:vm": "bash scripts\/connect-vm.sh",\n    "dev:db": "bash scripts\/setup-database.sh",/' package.json
    print_success "Package.json scripts updated"
fi

# Create .gitignore entries if they don't exist
print_status "Setting up .gitignore..."
if [ ! -f ".gitignore" ]; then
    cat > .gitignore << EOF
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# Build outputs
build/
dist/

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# VM keys (keep local only)
*.pem
*.key

# Temporary files
tmp/
temp/
EOF
    print_success ".gitignore file created"
fi

# Create development documentation
print_status "Creating development documentation..."
cat > DEVELOPMENT.md << 'EOF'
# Mayday CRM Development Guide

## Quick Start

1. **Setup Environment**
   ```bash
   npm run dev:setup
   ```

2. **Setup Database**
   ```bash
   npm run dev:db
   ```

3. **Start Development Server**
   ```bash
   npm run dev:start
   ```

4. **Connect to VM (for Asterisk testing)**
   ```bash
   npm run dev:vm
   ```

## Development Workflow

### Local Development
- Server runs on port 8004
- Client runs on port 3000
- Hot reload enabled for both
- Database migrations run automatically

### VM Development
- Connect to VM for Asterisk testing
- Use MCP server for remote development
- Test AMI/ARI functionality
- Debug call transfer features

### Key Features to Implement

#### Call Transfer System
1. **Blind Transfer** - Immediate transfer
2. **Managed Transfer** - Transfer with consultation
3. **Queue Transfer** - Transfer to specific queues
4. **Extension Transfer** - Transfer to extensions
5. **External Transfer** - Transfer to external numbers

#### AMI Integration
- Real-time call monitoring
- Channel management
- Call control operations
- Event handling

#### SIP.js Softphone
- Call management
- Transfer interface
- Status monitoring
- Audio handling

## Environment Variables

Key environment variables for development:
- `AMI_HOST`, `AMI_PORT` - Asterisk AMI connection
- `ARI_HOST`, `ARI_PORT` - Asterisk ARI connection
- `DB_HOST`, `DB_NAME` - Database connection
- `JWT_SECRET` - Authentication secret

## Troubleshooting

### Common Issues
1. **AMI Connection Failed** - Check Asterisk service and credentials
2. **Database Connection Error** - Verify MySQL is running
3. **Port Already in Use** - Check for conflicting services
4. **Permission Denied** - Check file permissions

### Debug Mode
- Enable debug logging in .env
- Use debug endpoints for testing
- Check server logs in logs/ directory
- Monitor AMI events in real-time

## Next Steps
1. Implement call transfer functionality
2. Set up Context7 for AMI documentation
3. Configure MCP server for VM access
4. Test AMI integration thoroughly
EOF

print_success "Development documentation created"

print_success "🎉 Development environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Run 'npm run dev:setup' to complete setup"
echo "2. Run 'npm run dev:db' to setup database"
echo "3. Run 'npm run dev:start' to start development"
echo "4. Run 'npm run dev:vm' to connect to VM"
echo ""
echo "For more information, see DEVELOPMENT.md"
