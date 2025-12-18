---
sidebar_position: 5
---

# Deploying the Documentation Site

This guide explains how to deploy your Mayday CRM documentation site to production using Nginx.

## Building for Production

Before deployment, create a production build of your documentation:

```bash
cd /home/admin/Mayday-CRM-Scracth/mayday-wiki
npm run build
```

This generates static files in the `build` directory that are ready to be served.

## Configuring Nginx

To serve your documentation site alongside your main application, you'll need to configure Nginx.

### Step 1: Create or Update Nginx Configuration

vim /usr/local/nginx/conf/nginx.conf

Add a location block to your existing Nginx configuration file:
Configuration Example;

```nginx
worker_processes  1;

events {
    worker_connections  4096;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    sendfile        on;
    keepalive_timeout  65;

    server {
        listen 80;
        server_name your-server-ip-or-domain;

	# This Returns Redirect all HTTP traffic to HTTPS (Best practice)
    	return 301 https://$host$request_uri;

        location / {
            root   /home/admin/Mayday-CRM-Scracth/client/build;
            index  index.html;
	    try_files $uri /index.html;
        }

	 location /api {  # Proxy all API requests to Node.js backend
            proxy_pass http://127.0.0.1:8004;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "Upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto http;
        }

        location /ws {
	    # proxy_pass http://127.0.0.1:8004;
	    proxy_pass http://127.0.0.1:8088/ws;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "Upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto http;

            proxy_buffering off;
            proxy_cache off;
            proxy_read_timeout 86400s;
            proxy_send_timeout 86400s;
            proxy_connect_timeout 60s;
        }
	location /ari {
    	   proxy_pass http://127.0.0.1:8088/ari;
    	   proxy_http_version 1.1;
    	   proxy_set_header Host $host;
    	   proxy_set_header X-Real-IP $remote_addr;
    	   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    	   proxy_set_header X-Forwarded-Proto $scheme;
    	   proxy_buffering off;
	}

	# ADD THIS NEW LOCATION BLOCK to handle WSS traffic
	location /wss {
    	   proxy_pass https://127.0.0.1:8089/ws;
   	   proxy_http_version 1.1;
    	   proxy_set_header Upgrade $http_upgrade;
    	   proxy_set_header Connection "upgrade";
    	   proxy_set_header Host $host;
    	   proxy_set_header X-Real-IP $remote_addr;
    	   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    	   proxy_set_header X-Forwarded-Proto https;
    	   proxy_buffering off;
    	   proxy_read_timeout 86400s;
    	   proxy_ssl_verify off;

	   # Add these lines to help with debugging
    	   proxy_intercept_errors off;
	   error_log /usr/local/nginx/logs/wss_error.log debug;
    	   access_log /usr/local/nginx/logs/wss_access.log;
	}

        error_page 500 502 503 504 /50x.html;
        location = /50x.html {
            root html;
        }
    }

    server {
        listen 443 ssl;
        server_name your-server-ip-or-domain;

        ssl_certificate      /etc/asterisk/keys/asterisk.pem;
        ssl_certificate_key  /etc/asterisk/keys/asterisk.key;

        ssl_session_cache    shared:SSL:10m;
        ssl_session_timeout  10m;
        ssl_ciphers  HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers  on;
        ssl_protocols        TLSv1.2;

        location / {
	    root   /home/admin/Mayday-CRM-Scracth/client/build;
            index  index.html;
            try_files $uri /index.html;
        }

	location /api {  # Secure API proxy for HTTPS
            proxy_pass http://127.0.0.1:8004;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "Upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
        }

        location /ws {
	    # proxy_pass http://127.0.0.1:8004;
	    proxy_pass http://127.0.0.1:8088/ws;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "Upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;

            proxy_buffering off;
            proxy_cache off;
            proxy_read_timeout 86400s;
            proxy_send_timeout 86400s;
            proxy_connect_timeout 60s;
        }
	location /ari {
    	    proxy_pass http://127.0.0.1:8088/ari;
    	    proxy_http_version 1.1;
    	    proxy_set_header Host $host;
    	    proxy_set_header X-Real-IP $remote_addr;
    	    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    	    proxy_set_header X-Forwarded-Proto $scheme;
    	    proxy_buffering off;
	}


	location /socket.io/ {
    	   proxy_pass http://127.0.0.1:8004;
    	   proxy_http_version 1.1;
     	   proxy_set_header Upgrade $http_upgrade;
    	   proxy_set_header Connection "Upgrade";
    	   proxy_set_header Host $host;
    	  proxy_read_timeout 86400;
	}

	# NEW: Location for the Docusaurus documentation site
        location /docs/ {
            alias /home/admin/Mayday-CRM-Scracth/mhu-wiki/build/;
            index index.html;
            try_files $uri $uri/ /docs/index.html;
        }

        error_page 500 502 503 504 /50x.html;
        location = /50x.html {
            root html;
        }
    }
}
```

### Step 2: Test and Apply the Configuration

```bash
# Test the Nginx configuration
sudo nginx -t

# If the test passes, reload Nginx
sudo systemctl reload nginx
```

## Accessing Your Documentation

After deployment, your documentation will be available at:

```
http://your-server-ip/docs/
```

## Troubleshooting Deployment Issues

### 404 Errors

If you encounter 404 errors:

1. Check that the `baseUrl` in `docusaurus.config.js` matches your Nginx location path
2. Verify that the Nginx `alias` path points to the correct build directory
3. Ensure the `try_files` directive is correctly configured

### Permission Issues

If Nginx can't access your files:

```bash
# Check ownership and permissions
ls -la /home/admin/Mayday-CRM-Scracth/mayday-wiki/build/

# Update permissions if needed
sudo chown -R www-data:www-data /home/admin/Mayday-CRM-Scracth/mayday-wiki/build/
sudo chmod -R 755 /home/admin/Mayday-CRM-Scracth/mayday-wiki/build/
```

### HTTPS and SSL Issues

If you're using HTTPS (which you should):

1. Ensure your SSL certificates are valid and properly configured
2. Check that your Nginx server block is listening on port 443
3. Verify that all assets are served over HTTPS to avoid mixed content warnings

## Automating Deployment

For a more streamlined workflow, consider setting up automated deployment:

### Using a Simple Shell Script

Create a deployment script:

```bash
#!/bin/bash
# deploy-docs.sh

# Navigate to the documentation directory
cd /home/admin/Mayday-CRM-Scracth/mayday-wiki

# Pull latest changes from Git
git pull

# Install dependencies
npm install

# Build the documentation
npm run build

# Reload Nginx
sudo systemctl reload nginx

echo "Documentation deployed successfully!"
```

Make it executable:

```bash
chmod +x deploy-docs.sh
```

### Using GitHub Actions

For more advanced automation, consider setting up GitHub Actions to deploy your documentation whenever changes are pushed to your repository.

## Maintenance and Updates

### Regular Updates

To keep your documentation up-to-date:

1. Regularly review and update content
2. Update Docusaurus and dependencies:

```bash
npm update
```

### Monitoring

Monitor your documentation site for:

- Broken links
- Outdated information
- Performance issues

## Conclusion

You now have a fully deployed documentation site for Mayday CRM! This documentation will help users understand how to use the system effectively and serve as a valuable resource for your team.
