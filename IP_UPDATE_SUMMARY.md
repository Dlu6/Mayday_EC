# IP Address Update Summary

## Updated from: `43.205.91.97` → `65.1.149.92`

### Files Updated (20 files, 39 instances)

#### Core Configuration Files

- **server/server.js** - CORS origins and WebSocket URLs
- **ecosystem.config.cjs** - PM2 environment variables
- **mcp-server-config.json** - MCP server database connections
- **Note.md** - Environment configuration

#### Database & Scripts

- **scripts/db-monitor.js** - Database connection host
- **scripts/db-manager.sh** - Database host configuration

#### Electron App Configuration

- **electron-softphone/vite.config.js** - Development proxy target
- **electron-softphone/src/config/config.js** - SIP WebSocket URLs
- **electron-softphone/src/config/sipConfig.js** - SIP registrar and WebSocket servers

#### Documentation Files

- **README.md** - API endpoint examples
- **PROJECT_SETUP.md** - Database configuration and API examples
- **DATABASE_TRACKING_SUMMARY.md** - Database host references
- **DEVELOPMENT_STATUS.md** - API endpoint examples
- **electron-softphone/CALL_TRANSFER_DOCUMENTATION.md** - SIP URI examples

#### Configuration Templates

- **example.nginx.conf** - Nginx server name
- **Note To Self** - Nginx configuration and environment variables
- **lastworking asteriks configs 21 Nov 24** - Asterisk external addresses

#### API Testing Collections

- **Asterisk_AMI_Postman_Collection.json** - Asterisk host variable
- **Postman_AMI_HTTP_Collection.json** - VM base URL variable

#### Server Code

- **server/controllers/usersController.js** - Commented WebSocket URL

### What This Update Affects

1. **Database Connections** - All database connections now point to the new VM IP
2. **API Endpoints** - All API calls and health checks use the new IP
3. **WebSocket Connections** - SIP and Socket.IO connections updated
4. **Development Configuration** - Vite proxy and development URLs updated
5. **Documentation** - All examples and references updated
6. **Testing Collections** - Postman collections updated for new IP

### Next Steps

1. **Update VM Configuration** - Ensure the new VM has the same services running:

   - Asterisk on ports 8088/8089
   - Node.js server on port 8004
   - MySQL on port 3306
   - Nginx configuration updated

2. **Update DNS/Domain** - If using domain names, ensure they point to the new IP

3. **Test Connections** - Verify all services are accessible:

   ```bash
   curl -X GET "http://65.1.149.92:8004/api/enhanced-transfers/health"
   curl -X GET "http://65.1.149.92:8004/api/ami/users/status"
   ```

4. **Rebuild Applications** - Rebuild Electron app and client if needed

### Verification Commands

```bash
# Check if old IP is completely removed
grep -r "43.205.91.97" . --exclude-dir=node_modules

# Check new IP is properly set
grep -r "65.1.149.92" . --exclude-dir=node_modules | wc -l
```

All references to the old IP address have been successfully updated to the new VM IP address.
