---
sidebar_position: 1
---

# Setting Up the Documentation Site

This guide walks you through the initial setup of the MHU CRM documentation site using the same server that has the call center software.

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (version 18.0 or higher)
- npm (usually comes with Node.js)
- Git (for version control)

## Initial Setup

### Step 1: Clone the Repository

If you're starting from scratch, clone the Mayday CRM repository:

```bash
git clone https://github.com/your-organization/Mayday-CRM-Scracth.git
cd Mayday-CRM-Scracth
```

### Step 2: Initialize Docusaurus

If the `mayday-wiki` folder doesn't exist yet, create it using the Docusaurus CLI:

```bash
npx create-docusaurus@latest mayday-wiki classic
cd mayday-wiki
```

This command creates a new Docusaurus site with the classic template, which includes:

- Documentation pages
- Blog
- Custom pages
- CSS and component customization

### Step 3: Install Dependencies

If the `mayday-wiki` folder already exists, navigate to it and install dependencies:

```bash
cd mayday-wiki
npm install
```

### Step 4: Configure the Site

Edit the `docusaurus.config.js` file to customize your site settings:

```javascript
// docusaurus.config.js
const config = {
  title: "Mayday Wiki",
  tagline: "Comprehensive documentation for the Mayday CRM",
  url: "https://mhuhelpline.com",
  baseUrl: "/docs/",
  // ... other configuration options
};
```

Key configuration options:

- `title`: The name of your documentation site
- `tagline`: A brief description
- `url`: https://mhuhelpline.com/docs/
- `baseUrl`: https://mhuhelpline.com

## Next Steps

After completing the initial setup, you can:

- [Create your first documentation page](./02-create-content.md)
- [Customize the site appearance](./03-customize-site.md)
- [Build and test locally](./04-local-development.md)
