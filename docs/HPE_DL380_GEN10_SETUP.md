# Mayday EC Installation Guide: HPE ProLiant DL380 Gen10

This guide describes how to install the Mayday EC Asterisk system on an HPE ProLiant DL380 Gen10 server, either from a backup image or as a fresh installation.

---

## Table of Contents
1. [Server Specifications](#server-specifications)
2. [iLO 5 Remote Installation](#ilo-5-remote-installation)
3. [Folder Structure Reference](#folder-structure-reference)
4. [Option A: Restore from Backup Image](#option-a-restore-from-backup-image)
5. [Option B: Fresh Installation](#option-b-fresh-installation)
6. [HPE-Specific Considerations](#hpe-specific-considerations)
7. [Verification Checklist](#verification-checklist)
8. [Quick Reference Commands](#quick-reference-commands)

---

## Server Specifications

| Component | HPE DL380 Gen10 |
|-----------|-----------------|
| **CPU** | Intel Xeon Scalable (1st/2nd Gen) |
| **RAM** | DDR4, up to 3TB |
| **Storage** | SAS/SATA/NVMe via Smart Array |
| **Network** | Embedded 4x1GbE or optional 10GbE/25GbE |
| **Management** | iLO 5 (Remote Console, Power Management) |

---

## iLO 5 Remote Installation

Use HPE iLO 5 to install the OS remotely without physical access to the server.

### Current iLO Access
| Setting | Value |
|---------|-------|
| **iLO IP Address** | `192.168.1.13` |
| **Web Interface** | `https://192.168.1.13` |
| **Default Username** | `Administrator` |
| **Default Password** | (Check iLO tag on server or set during initial setup) |

### Step-by-Step: Remote OS Installation via iLO

1.  **Access iLO Web Interface**
    - Open browser: `https://192.168.1.13`
    - Accept the SSL certificate warning
    - Login with iLO credentials

2.  **Mount the ISO (Virtual Media)**
    - Navigate to: **Remote Console → Launch**
    - In the HTML5 console, click: **Virtual Drives → Image File CD-ROM/DVD**
    - Browse and select: `debian-12-amd64-netinst.iso` (or your backup Live USB ISO)
    - Click **Mount**

3.  **Set Boot Order**
    - In iLO, go to: **System Information → Boot Order**
    - Or during POST, press **F11** for Boot Menu
    - Select the mounted virtual CD/DVD

4.  **Power Control**
    - Go to: **Power & Thermal → Power**
    - Click **Reset** or **Cold Boot** to restart the server
    - The server will boot from the mounted ISO

5.  **Install via Remote Console**
    - Use the HTML5 Remote Console to interact with the installer
    - Complete the Debian installation as described in [Option B](#option-b-fresh-installation)

6.  **Unmount ISO After Installation**
    - In Remote Console: **Virtual Drives → Unmount**

### iLO Recommended Settings

| Setting | Recommendation |
|---------|----------------|
| **Network** | Static IP on management VLAN |
| **Alerts** | Configure email for hardware failures |
| **User Accounts** | Create separate admin account, disable default if possible |
| **Remote Console** | Enable HTML5 Integrated Console |
| **Virtual Media** | Enable for ISO mounting |

---

## Folder Structure Reference

This is the exact folder structure on the current production server (`192.168.1.14`). Replicate this on the new HPE DL380.

### Directory Layout

```
/
├── home/
│   └── medhi/                          # Main user home directory
│       └── Mayday_EC/                  # ← Clone repository here
│           ├── server/                 # Backend Node.js server
│           │   └── server.js           # Main entry point
│           ├── client/                 # React frontend
│           │   ├── src/
│           │   ├── public/
│           │   └── dist/               # Built frontend (after npm run build)
│           ├── .env                    # Environment variables (create from .env.example)
│           ├── package.json
│           └── mcp-server-config.json  # MCP configuration reference
│
├── root/
│   └── .nvm/                           # NVM installation (Node Version Manager)
│       └── versions/
│           └── node/
│               └── v18.20.8/           # Node.js 18 LTS
│
├── etc/
│   ├── nginx/
│   │   ├── nginx.conf                  # Main Nginx config
│   │   ├── sites-available/
│   │   │   └── mayday                  # Mayday reverse proxy config
│   │   └── sites-enabled/
│   │       └── mayday → ../sites-available/mayday  # Symlink
│   │
│   ├── asterisk/                       # Asterisk configuration
│   │   ├── pjsip.conf                  # SIP endpoints
│   │   ├── extensions.conf             # Dialplan
│   │   ├── manager.conf                # AMI configuration
│   │   ├── ari.conf                    # ARI configuration
│   │   └── ... (other .conf files)
│   │
│   └── network/
│       └── interfaces                  # Network interface configuration
│
├── var/
│   └── lib/
│       └── mysql/                      # MariaDB data directory
│           └── asterisk/               # Asterisk database
│
└── usr/
    └── src/                            # Source code (Asterisk compiled here)
        └── asterisk-20.x/
```

### Key Paths Summary

| Component | Path |
|-----------|------|
| **Mayday EC Application** | `/home/medhi/Mayday_EC` |
| **Node.js (via NVM)** | `/root/.nvm/versions/node/v18.20.8/bin/node` |
| **PM2** | `/root/.nvm/versions/node/v18.20.8/bin/pm2` |
| **Nginx Config** | `/etc/nginx/sites-available/mayday` |
| **Asterisk Config** | `/etc/asterisk/` |
| **Database** | MariaDB, database name: `asterisk` |
| **Database User** | `mayday_user` |

### Credentials Reference

| Service | User | Notes |
|---------|------|-------|
| **SSH** | `medhi` | SSH key or password auth |
| **Sudo Password** | `Pasword@1759` | For medhi user |
| **Root Password** | `Lotuskm@1759` | Direct root (not used for SSH) |
| **MySQL** | `mayday_user` | App database user |
| **MySQL Root** | `root` | Admin access |

> **⚠️ IMPORTANT**: Change these passwords on the new server after installation!

---

## Option A: Restore from Backup Image

Use this method if you have a `dd` + `gzip` backup from the original server.

### Prerequisites
- Bootable Linux USB (Debian 12 Live or Ubuntu 22.04 Live recommended)
- USB drive containing the `.img.gz` backup file
- Target disk (NVMe or SAS) installed in the DL380

### Steps

1.  **Boot into Linux Live USB via iLO**
    - Mount the Live ISO via iLO Virtual Media (see [iLO section](#ilo-5-remote-installation))
    - Boot the server from the virtual CD

2.  **Mount the Backup USB**
    ```bash
    # Identify the backup USB (look for the correct size)
    lsblk
    
    # Mount it
    sudo mkdir /mnt/backup
    sudo mount /dev/sdX1 /mnt/backup   # Replace sdX1 with actual device
    ```

3.  **Identify the Target Disk**
    ```bash
    lsblk
    # Example: /dev/nvme0n1 or /dev/sda
    ```

4.  **Restore the Image**
    ```bash
    # DANGER: This will ERASE the target disk!
    sudo gunzip -c /mnt/backup/mayday_backup_YYYY-MM-DD.img.gz | sudo dd of=/dev/nvme0n1 bs=64K status=progress
    ```

5.  **Reboot**
    ```bash
    sudo reboot
    ```
    Unmount the virtual ISO in iLO and let the server boot from the restored disk.

6.  **Post-Restore Configuration**
    - **Update Network Config**: The interface names will likely differ.
      ```bash
      ip link show   # Identify new interface names (e.g., eno1, eno2)
      sudo nano /etc/network/interfaces   # Update interface names
      ```
    - **Regenerate SSH Keys** (required for cloned servers):
      ```bash
      sudo rm /etc/ssh/ssh_host_*
      sudo dpkg-reconfigure openssh-server
      ```
    - **Update Hostname**:
      ```bash
      sudo hostnamectl set-hostname new-server-name
      ```
    - **Update Database IPs** (if server IP changed):
      ```bash
      mysql -u root -p asterisk
      # Update any hardcoded IP references
      ```

---

## Option B: Fresh Installation

Use this method for a clean Debian 12 + Asterisk installation.

### 1. Install Debian 12 (Bookworm) via iLO

1.  Download: [Debian 12 NetInstall ISO](https://www.debian.org/distrib/netinst)
2.  Mount ISO via iLO Virtual Media (see [iLO section](#ilo-5-remote-installation))
3.  Boot and install with these settings:
    - **Partitioning**: Use entire disk (Guided - use entire disk with LVM is fine)
    - **Software Selection**: SSH server, standard system utilities (no desktop)
    - **Root Password**: Set a strong password
    - **User Account**: Create `medhi` user

### 2. Post-Install System Setup

```bash
# Login as root or use sudo

# Update system
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget git sudo net-tools vim htop

# Add medhi to sudo group
usermod -aG sudo medhi
```

### 3. Install Node.js (via NVM)

```bash
# As root
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
npm install -g pm2
```

### 4. Install Asterisk

```bash
# Install dependencies
apt install -y build-essential libncurses5-dev libjansson-dev libxml2-dev \
    libsqlite3-dev uuid-dev libssl-dev libedit-dev

# Download and compile Asterisk 20 LTS
cd /usr/src
wget https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-20-current.tar.gz
tar xzf asterisk-20-current.tar.gz
cd asterisk-20.*

# Configure and install
contrib/scripts/install_prereq install
./configure
make menuselect   # Enable PJSIP, Realtime, etc.
make -j$(nproc)
make install
make samples
make config
ldconfig
```

### 5. Install MariaDB

```bash
apt install -y mariadb-server
mysql_secure_installation

# Create database and user
mysql -u root -p <<EOF
CREATE DATABASE asterisk;
CREATE USER 'mayday_user'@'%' IDENTIFIED BY 'YOUR_PASSWORD';
GRANT ALL PRIVILEGES ON asterisk.* TO 'mayday_user'@'%';
FLUSH PRIVILEGES;
EOF
```

### 6. Clone and Configure Mayday EC

```bash
# Clone to the correct location
cd /home/medhi
git clone https://github.com/Dlu6/Mayday_EC.git
cd Mayday_EC
git checkout development

# Install dependencies
npm install
cd client && npm install && npm run build && cd ..

# Configure environment
cp .env.example .env
nano .env   # Set DB credentials, AMI/ARI settings
```

### 7. Configure PM2

```bash
pm2 start server/server.js --name mayday
pm2 save
pm2 startup   # Follow instructions to enable on boot
```

### 8. Install and Configure Nginx

```bash
apt install -y nginx

# Create Mayday config
cat > /etc/nginx/sites-available/mayday <<EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:8004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable the site
ln -s /etc/nginx/sites-available/mayday /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
```

---

## HPE-Specific Considerations

### iLO 5 Configuration
- **IP Address**: `192.168.1.13` (current setup)
- Enable **Virtual Media** for remote ISO mounting
- Configure **Email Alerts** for hardware failures
- Use **HTML5 Integrated Remote Console** for installation

### Smart Array Controller
- If using hardware RAID, configure via **SSA (Smart Storage Administrator)** during boot (F10)
- For software RAID or direct disk access, set controller to **HBA Mode**

### Network Interface Naming
HPE servers often use predictable names like:
- `eno1`, `eno2` for embedded NICs
- `ens1f0`, `ens1f1` for add-on cards

Check with `ip link show` after installation.

### Firmware Updates
Use **HPE Service Pack for ProLiant (SPP)** to update:
- iLO firmware
- BIOS
- Smart Array firmware
- NIC firmware

---

## Verification Checklist

- [ ] iLO accessible at `https://192.168.1.13`
- [ ] Server boots and Debian 12 loads
- [ ] Network connectivity verified (`ping 8.8.8.8`)
- [ ] SSH access works (`ssh medhi@<server-ip>`)
- [ ] Asterisk running (`asterisk -rx "core show version"`)
- [ ] MariaDB accessible (`mysql -u mayday_user -p asterisk`)
- [ ] Mayday EC accessible via browser (`http://<server-ip>`)
- [ ] PM2 shows `mayday` as online (`pm2 status`)

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| Check Asterisk status | `asterisk -rx "core show channels"` |
| Restart Mayday | `pm2 restart mayday` |
| View logs | `pm2 logs mayday --lines 100` |
| Check MySQL | `systemctl status mariadb` |
| Check Nginx | `systemctl status nginx` |
| Check Network | `ip addr show` |
| PM2 with NVM (as root) | `export NVM_DIR=/root/.nvm && source /root/.nvm/nvm.sh && pm2 status` |

---

*Last Updated: 2026-01-13*
