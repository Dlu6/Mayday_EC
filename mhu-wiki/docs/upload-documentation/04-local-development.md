---
sidebar_position: 4
---

# Local Development and Testing

This guide explains how to build and test your Mayday CRM documentation site locally before deployment.

## Starting the Development Server

Docusaurus includes a development server with hot-reloading, making it easy to preview your changes in real-time.

### Start the Server

```bash
cd mayday-wiki
npm start
```

This command:

1. Starts a local development server
2. Opens a browser window at `http://localhost:3000/docs/`
3. Automatically reloads when you make changes to the content

### Development Server Options

You can customize the development server with various options:

```bash
# Use a specific port
npm start -- --port 8080

# Host on a specific IP (useful for testing on other devices)
npm start -- --host 0.0.0.0

# Disable opening a browser window
npm start -- --no-open
```

## Building for Production

To create a production build of your documentation site:

```bash
npm run build
```

This command generates static content in the `build` directory that can be served by any static content hosting service.

### Testing the Production Build

To test the production build locally:

```bash
npm run serve
```

This starts a local server with your production build, typically at `http://localhost:3000/docs/`.

## Common Issues and Troubleshooting

### Broken Links

If you encounter broken links during the build process, you have several options:

1. Fix the broken links by updating the references
2. Configure Docusaurus to warn about broken links instead of failing:

```javascript
// docusaurus.config.js
const config = {
  // ... other config
  onBrokenLinks: "warn", // 'throw' | 'warn' | 'ignore'
  // ... other config
};
```

### Missing Dependencies

If you encounter errors related to missing dependencies:

```bash
npm install
```

### JavaScript Heap Out of Memory

For large documentation sites, you might encounter memory issues:

```bash
# Increase Node.js memory limit
export NODE_OPTIONS=--max_old_space_size=4096
npm run build
```

## Version Control

It's a good practice to use version control for your documentation:

```bash
# Initialize Git (if not already done)
git init

# Add files to Git
git add .

# Commit changes
git commit -m "Update documentation"

# Push to remote repository
git push origin main
```

## Next Steps

After successfully testing your documentation locally:

- [Deploy the documentation](./05-deployment.md)
