---
sidebar_position: 3
---

# Customizing the Site Appearance

This guide explains how to customize the appearance and branding of your Mayday CRM documentation site.

## Theme Customization

Docusaurus allows you to customize the look and feel of your site through various configuration options and CSS.

### Changing Colors and Branding

Edit the `docusaurus.config.js` file to customize the theme colors:

```javascript
// docusaurus.config.js
const config = {
  // ... other config
  themeConfig: {
    colorMode: {
      defaultMode: "light",
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "Mayday Wiki",
      logo: {
        alt: "Mayday Logo",
        src: "img/logo.svg",
      },
      // ... other navbar config
    },
    // ... other theme config
  },
};
```

### Custom CSS

To add custom CSS:

1. Create a file at `src/css/custom.css`
2. Add your custom styles:

```css
/* src/css/custom.css */
:root {
  --ifm-color-primary: #2e8555;
  --ifm-color-primary-dark: #29784c;
  /* ... other color variables */
}

/* Custom styles */
.hero__title {
  font-size: 3rem;
}
```

## Customizing the Navbar

The navigation bar can be customized in the `docusaurus.config.js` file:

```javascript
// docusaurus.config.js
const config = {
  // ... other config
  themeConfig: {
    navbar: {
      title: "MHU Wiki",
      logo: {
        alt: "Mayday Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "tutorialSidebar",
          position: "left",
          label: "Documentation",
        },
        { to: "/blog", label: "Blog", position: "left" },
        {
          href: "https://github.com/your-organization/Mayday-CRM-Scracth",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    // ... other theme config
  },
};
```

## Customizing the Footer

The footer can be customized similarly:

```javascript
// docusaurus.config.js
const config = {
  // ... other config
  themeConfig: {
    // ... other theme config
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Getting Started",
              to: "/docs/intro",
            },
            // ... other links
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "Support",
              href: "https://mhuhelpline.com/support",
            },
            // ... other links
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Mayday CRM. Built with Docusaurus.`,
    },
  },
};
```

## Customizing the Sidebar

The sidebar is configured in the `sidebars.js` file:

```javascript
// sidebars.js
const sidebars = {
  tutorialSidebar: [
    "intro",
    {
      type: "category",
      label: "Documentation Setup",
      items: [
        "upload-documentation/01-setup",
        "upload-documentation/02-create-content",
        "upload-documentation/03-customize-site",
        "upload-documentation/04-local-development",
        "upload-documentation/05-deployment",
      ],
    },
    // ... other categories
  ],
};

module.exports = sidebars;
```

## Adding Custom Pages

To add custom pages beyond documentation:

1. Create a React component in the `src/pages` directory:

```jsx
// src/pages/my-custom-page.js
import React from "react";
import Layout from "@theme/Layout";

export default function MyCustomPage() {
  return (
    <Layout title="My Custom Page">
      <div className="container margin-top--lg">
        <h1>Custom Page Content</h1>
        <p>This is a custom page with React components.</p>
      </div>
    </Layout>
  );
}
```

2. The page will be available at `/my-custom-page`

## Next Steps

After customizing your site:

- [Build and test locally](./04-local-development.md)
- [Deploy the documentation](./05-deployment.md)
