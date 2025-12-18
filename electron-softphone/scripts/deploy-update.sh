#!/bin/bash
# Deploy Electron Softphone Update to Server
# This script builds the app and uploads update files to the on-prem server
#
# Usage:
#   ./deploy-update.sh           # Full build and deploy
#   ./deploy-update.sh --upload  # Upload only (skip build)
#
# Prerequisites:
#   - SSH key configured at ~/.ssh/id_ed25519
#   - Access to on-prem server (192.168.1.14)

set -e

# Configuration - On-Prem Server
SERVER_USER="medhi"
SERVER_HOST="192.168.1.14"
SSH_KEY="$HOME/.ssh/id_ed25519"
REMOTE_PATH="/var/www/html/downloads"
SUDO_PASSWORD="Pasword@1759"
VERSION=$(node -p "require('../package.json').version")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo -e "${GREEN}Deploying Mayday Softphone v${VERSION}${NC}"
echo "========================================="
echo "Server: ${SERVER_HOST}"
echo ""

# Check if upload-only mode
UPLOAD_ONLY=false
if [ "$1" == "--upload" ]; then
    UPLOAD_ONLY=true
    echo -e "${YELLOW}Upload-only mode - skipping build${NC}"
fi

# Step 1: Build the Vite app (unless upload-only)
if [ "$UPLOAD_ONLY" = false ]; then
    echo ""
    echo "[1/5] Building React app..."
    npm run build

    # Step 2: Build Electron installer
    echo ""
    echo "[2/5] Building Electron installer..."
    npm run electron:build:win
fi

# Step 3: Create downloads directory on server if it doesn't exist
echo ""
echo "[3/5] Preparing server..."
ssh -i "$SSH_KEY" "${SERVER_USER}@${SERVER_HOST}" \
    "echo '${SUDO_PASSWORD}' | sudo -S mkdir -p ${REMOTE_PATH} && sudo chown -R www-data:www-data ${REMOTE_PATH} && sudo chmod 755 ${REMOTE_PATH}"

# Step 4: Delete old versions from server
echo ""
echo "[4/5] Cleaning old versions..."
ssh -i "$SSH_KEY" "${SERVER_USER}@${SERVER_HOST}" \
    "echo '${SUDO_PASSWORD}' | sudo -S rm -f ${REMOTE_PATH}/*.exe ${REMOTE_PATH}/*.yml ${REMOTE_PATH}/*.blockmap 2>/dev/null || true"

# Step 5: Upload files
echo ""
echo "[5/5] Uploading files to server..."
RELEASE_DIR="release/${VERSION}"

# Check if release directory exists
if [ ! -d "$RELEASE_DIR" ]; then
    echo -e "${RED}Error: Release directory not found: ${RELEASE_DIR}${NC}"
    echo "Please build the app first or check the version number."
    exit 1
fi

# Upload installer
echo "  - Uploading installer..."
scp -i "$SSH_KEY" "${RELEASE_DIR}"/*.exe "${SERVER_USER}@${SERVER_HOST}:/tmp/"
ssh -i "$SSH_KEY" "${SERVER_USER}@${SERVER_HOST}" \
    "echo '${SUDO_PASSWORD}' | sudo -S mv /tmp/*.exe ${REMOTE_PATH}/"

# Upload latest.yml
echo "  - Uploading latest.yml..."
scp -i "$SSH_KEY" "${RELEASE_DIR}/latest.yml" "${SERVER_USER}@${SERVER_HOST}:/tmp/"
ssh -i "$SSH_KEY" "${SERVER_USER}@${SERVER_HOST}" \
    "echo '${SUDO_PASSWORD}' | sudo -S mv /tmp/latest.yml ${REMOTE_PATH}/"

# Upload blockmap if exists (for delta updates)
if ls "${RELEASE_DIR}"/*.blockmap 1> /dev/null 2>&1; then
    echo "  - Uploading blockmap..."
    scp -i "$SSH_KEY" "${RELEASE_DIR}"/*.blockmap "${SERVER_USER}@${SERVER_HOST}:/tmp/"
    ssh -i "$SSH_KEY" "${SERVER_USER}@${SERVER_HOST}" \
        "echo '${SUDO_PASSWORD}' | sudo -S mv /tmp/*.blockmap ${REMOTE_PATH}/"
fi

# Set proper permissions
ssh -i "$SSH_KEY" "${SERVER_USER}@${SERVER_HOST}" \
    "echo '${SUDO_PASSWORD}' | sudo -S chown -R www-data:www-data ${REMOTE_PATH} && sudo chmod 644 ${REMOTE_PATH}/*"

echo ""
echo "========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "========================================="
echo ""
echo "Update files uploaded to: https://${SERVER_HOST}/downloads/"
echo "Version: ${VERSION}"
echo ""

# Verify deployment
echo "Verifying deployment..."
VERIFY=$(ssh -i "$SSH_KEY" "${SERVER_USER}@${SERVER_HOST}" "cat ${REMOTE_PATH}/latest.yml 2>/dev/null | head -5")
if [ -n "$VERIFY" ]; then
    echo -e "${GREEN}✓ latest.yml verified:${NC}"
    echo "$VERIFY"
else
    echo -e "${RED}✗ Warning: Could not verify latest.yml${NC}"
fi

echo ""
echo "Users will now receive update notifications."
echo ""
echo "Quick commands:"
echo "  - Check server files: ssh -i ~/.ssh/id_ed25519 medhi@192.168.1.14 'ls -la /var/www/html/downloads/'"
echo "  - View latest.yml:    curl -s https://192.168.1.14/downloads/latest.yml"
