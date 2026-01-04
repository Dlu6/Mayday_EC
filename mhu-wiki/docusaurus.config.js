// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import { themes as prismThemes } from "prism-react-renderer";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Mayday Helpline Documentation",
  tagline:
    "Comprehensive documentation for the Mayday Helpline CRM and Call Center System",
  favicon: "img/favicon.ico",

  // Set the production url of your site here
  // Configure this to your server IP/domain
  url: "http://192.168.1.14",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/docs/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "Mayday", // Usually your GitHub org/user name.
  projectName: "mayday-wiki", // Usually your repo name.

  onBrokenLinks: "warn",
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: "./sidebars.js",
          // Remove the edit URL or update it to your actual repository
          editUrl: undefined,
        },
        blog: {
          showReadingTime: true,
          authorsMapPath: "authors.yml",
          feedOptions: {
            type: ["rss", "atom"],
            xslt: true,
          },
          // Remove the edit URL or update it to your actual repository
          editUrl: undefined,
          // Useful options to enforce blogging best practices
          onInlineTags: "warn",
          onInlineAuthors: "warn",
          onUntruncatedBlogPosts: "warn",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: "img/mhu_logo.jpg",
      navbar: {
        title: "Mayday Helpline Documentation",
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
          { to: "/blog", label: "Updates", position: "left" },
          {
            href: "http://192.168.1.14",
            label: "Main Site",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Documentation",
            items: [
              {
                label: "Getting Started",
                to: "/docs/docs/intro",
              },
              {
                label: "User Guide",
                to: "/docs/docs/intro",
              },
              {
                label: "Administrator Guide",
                href: "http://192.168.1.14",
              },
            ],
          },
          {
            title: "Support",
            items: [
              {
                label: "Contact Support",
                href: "mailto:medhi.matovu@gmail.com",
              },
              {
                label: "Report an Issue",
                href: "mailto:medhi.matovu@gmail.com?subject=Issue%20Report",
              },
              {
                label: "Feature Request",
                href: "mailto:medhi.matovu@gmail.com?subject=Feature%20Request",
              },
            ],
          },
          {
            title: "More",
            items: [
              {
                label: "Release Notes",
                href: "https://github.com/Dlu6",
              },
              {
                label: "Main Application",
                href: "http://192.168.1.14",
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Mayday Helpline. All rights reserved.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ["bash", "nginx", "json"],
      },
      // Add these features for better user experience
      colorMode: {
        defaultMode: "light",
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: true,
        },
      },
      // Improve search experience
      algolia: undefined, // Remove this if you're not using Algolia search
    }),
};

export default config;
