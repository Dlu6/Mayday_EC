#!/bin/bash
# On-Prem Server Setup Script for Mayday EC
# Run this on the on-prem server (192.168.1.14) as user with sudo access

set -e

echo "=========================================="
echo "Mayday EC On-Prem Server Setup"
echo "=========================================="

# 1. Install Node.js 18.x
echo ""
echo "[1/5] Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# 2. Install PM2 globally
echo ""
echo "[2/5] Installing PM2..."
sudo npm install -g pm2

echo "PM2 version: $(pm2 --version)"

# 3. Install nginx
echo ""
echo "[3/5] Installing nginx..."
sudo apt-get update
sudo apt-get install -y nginx

echo "nginx version: $(nginx -v 2>&1)"

# 4. Clone the repository
echo ""
echo "[4/5] Cloning Mayday EC repository..."
cd /home/medhi

if [ -d "Mayday_EC" ]; then
    echo "Repository already exists, pulling latest changes..."
    cd Mayday_EC
    git pull origin development
else
    git clone https://github.com/Dlu6/Mayday_EC.git
    cd Mayday_EC
    git checkout development
fi

# 5. Install dependencies
echo ""
echo "[5/5] Installing Node.js dependencies..."
npm install
cd client && npm install && cd ..

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env and configure"
echo "2. Configure nginx (see nginx config below)"
echo "3. Start the application with PM2"
echo ""
