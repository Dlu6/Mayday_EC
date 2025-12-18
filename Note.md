####################

# Restart the application

PM2_HOME=/home/admin/.pm2 pm2 restart mayday

#To check the logs of the application real-time
PM2_HOME=/home/admin/.pm2 pm2 logs mayday

#To clear the logs of the application
echo "" > /var/log/nginx/error.log

#To check the Tree structure of the project
tree -I 'node_modules|build' -L 3

###################

# CORRECT DEPLOYMENT PROCESS

# 1. After pushing changes to git repo, connect to server:

ssh -i "/path/to/key.pem" admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com

# 2. Navigate to project directory:

cd /home/admin/Mayday-CRM-Scracth

# 3. Pull latest changes from git:

git pull

# 4. Deploy the application:

npm run deploy

# 5. Restart PM2 with mayday user:

sudo -u mayday pm2 restart mayday

# 6. Check status:

sudo -u mayday pm2 status

#To check the status of the application
pm2 status

A recap on starting your application with PM2:

1. **First Time Setup / Clean Start**:

```bash
# Switch to admin user if you're root
sudo su - admin

# Navigate to project directory
cd /home/admin/Mayday-CRM-Scracth

# Kill any existing PM2 processes
pm2 kill

# Start application using ecosystem file
pm2 start ecosystem.config.cjs

# Save process list so it restarts after server reboot
pm2 save
```

2. **Check Status and Logs**:

```bash
# View running processes
pm2 list

# View logs in real-time
pm2 logs mayday

# View last 100 lines of logs
pm2 logs mayday --lines 100
```

3. **Common PM2 Commands**:

```bash
# Restart application
pm2 restart mayday

# Stop application
pm2 stop mayday

# Delete application from PM2
pm2 delete mayday

# Show detailed information
pm2 show mayday

# Monitor CPU/Memory
pm2 monit
```

###################################### 4. ecosystem.config.cjs file:

module.exports = {
apps: [
{
name: "mayday",
script: "server/server.js",
exec_mode: "fork",
instances: 1,
watch: true,
cwd: "/home/admin/Mayday-CRM-Scracth",
env: {
NODE_ENV: "production",
PORT: 8004,
PUBLIC_IP: "65.1.149.92",
ASTERISK_CONFIG_PATH: "/etc/asterisk",
PM2_HOME: "/home/admin/.pm2",
SOCKET_PORT: 8004,
CORS_ORIGIN: "http://192.168.1.14,http://localhost:8004",
SESSION_SECRET: "Lotuskm@1759mayday_secure_session_secret",
AGI_PORT: 4574,
ASTERISK_SPOOL_DIR: "/var/spool/asterisk",
ASTERISK_LOG_DIR: "/var/log/asterisk",
ASTERISK_RUN_DIR: "/var/run/asterisk"
},
kill_timeout: 10000,
wait_ready: true,
listen_timeout: 15000,
max_memory_restart: '1G',
error_file: "/home/admin/.pm2/logs/mayday-error.log",
out_file: "/home/admin/.pm2/logs/mayday-out.log",
merge_logs: true
},
],
};

5. **CORRECT DEPLOYMENT PROCESS**:

```bash
# 1. After pushing changes to git repo, connect to server:
ssh -i "/path/to/key.pem" admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com

# 2. Navigate to project directory:
cd /home/admin/Mayday-CRM-Scracth

# 3. Pull latest changes from git:
git pull

# 4. Deploy the application:
npm run deploy

# 5. Restart PM2 with mayday user:
sudo -u mayday pm2 restart mayday

# 6. Check status:
sudo -u mayday pm2 status
```

**Note**: The old `./deploy.sh` script method is outdated. Use the above process instead.

5. **Log File Locations**:

```bash
# Output logs
cat /home/admin/.pm2/logs/mayday-out-0.log

# Error logs
cat /home/admin/.pm2/logs/mayday-error-0.log
```

6. **_Other useful commands_**:

````bash

1. **Monitor application health**:
```bash
# Check process status
pm2 list

# Monitor CPU/Memory usage
pm2 monit

# Check detailed metrics
pm2 show mayday
````

2. **Log monitoring**:

```bash
# Watch logs in real-time
pm2 logs mayday --follow

# Check for errors
pm2 logs mayday --err --lines 100
```

3. **Quick troubleshooting**:

```bash
# Restart if needed
pm2 restart mayday

# Check if ports are bound correctly
sudo lsof -i :8004
sudo lsof -i :4574
```

PM2_HOME=/home/admin/.pm2 pm2 status mayday

4. To restart the application:

```bash
# Stop all instances
PM2_HOME=/home/admin/.pm2 pm2 delete all

# Start fresh
PM2_HOME=/home/admin/.pm2 pm2 start ecosystem.config.cjs

# Save the process list
PM2_HOME=/home/admin/.pm2 pm2 save

# Restart the application
PM2_HOME=/home/admin/.pm2 pm2 restart mayday

# Check the status of the application
PM2_HOME=/home/admin/.pm2 pm2 list

# Check if the port is bound
# Check if the port is bound
netstat -tulpn | grep 8004
```

#####################################################
MAYDAY-WIKI DOCUMENTATION
#####################################################

~ Created with npx create-docusaurus@latest mayday-wiki classic
~ cd mayday-wiki
~ npm run start # To start the development server
~ npm run build # To build the production site
~ npm run deploy # To deploy the production site
