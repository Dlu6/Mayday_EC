#!/bin/bash
# Deploy Electron Softphone Update to Server
# This script builds the app and uploads update files to the server

set -e

# Configuration
SERVER_USER="admin"
SERVER_HOST="ec2-65-1-149-92.ap-south-1.compute.amazonaws.com"
SSH_KEY="../../MHU_Debian_Mumb.pem"
REMOTE_PATH="/var/www/html/downloads"
VERSION=$(node -p "require('../package.json').version")

echo "========================================="
echo "Deploying MHU Appbar v${VERSION}"
echo "========================================="

# Step 1: Build the Vite app
echo ""
echo "[1/4] Building React app..."
npm run build

# Step 2: Build Electron installer
echo ""
echo "[2/4] Building Electron installer..."
npm run electron:build:win

# Step 3: Create downloads directory on server if it doesn't exist
echo ""
echo "[3/4] Preparing server..."
ssh -i "$SSH_KEY" "${SERVER_USER}@${SERVER_HOST}" "sudo mkdir -p ${REMOTE_PATH} && sudo chown -R ${SERVER_USER}:${SERVER_USER} ${REMOTE_PATH}"

# Step 4: Upload files
echo ""
echo "[4/4] Uploading files to server..."
RELEASE_DIR="release/${VERSION}"

# Upload installer
echo "  - Uploading installer..."
scp -i "$SSH_KEY" "${RELEASE_DIR}"/*.exe "${SERVER_USER}@${SERVER_HOST}:${REMOTE_PATH}/"

# Upload latest.yml
echo "  - Uploading latest.yml..."
scp -i "$SSH_KEY" "${RELEASE_DIR}/latest.yml" "${SERVER_USER}@${SERVER_HOST}:${REMOTE_PATH}/"

# Upload blockmap if exists (for delta updates)
if [ -f "${RELEASE_DIR}"/*.blockmap ]; then
    echo "  - Uploading blockmap..."
    scp -i "$SSH_KEY" "${RELEASE_DIR}"/*.blockmap "${SERVER_USER}@${SERVER_HOST}:${REMOTE_PATH}/"
fi

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Update files uploaded to: https://mhuhelpline.com/downloads/"
echo "Version: ${VERSION}"
echo ""
echo "Users will now receive update notifications."
