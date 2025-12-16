/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  // By default, Docusaurus generates a sidebar from the docs folder structure
  tutorialSidebar: [
    "intro",
    {
      type: "category",
      label: "User Guide",
      link: {
        type: "generated-index",
        title: "User Guide",
        description: "Guides for daily users of the MHU Helpline system",
      },
      items: [
        "user-guide/getting-started",
        "user-guide/call-handling",
        // Add more user guide documents as they are created
      ],
    },
    {
      type: "category",
      label: "Administrator Guide",
      link: {
        type: "generated-index",
        title: "Administrator Guide",
        description:
          "Setup, configuration, and management guides for administrators",
      },
      items: [
        "admin-guide/system-overview",
        "admin-guide/queue-configuration",
        "admin-guide/ivr-design",
        // Add more admin guide documents as they are created
      ],
    },
    {
      type: "category",
      label: "Technical Reference",
      link: {
        type: "generated-index",
        title: "Technical Reference",
        description: "Technical information for developers and IT staff",
      },
      items: [
        "technical-reference/softphone-architecture",
        "technical-reference/api-integration",
        // Add more technical reference documents as they are created
      ],
    },
    {
      type: "category",
      label: "Troubleshooting",
      link: {
        type: "generated-index",
        title: "Troubleshooting",
        description: "Solutions to common issues with the MHU Helpline system",
      },
      items: [
        "troubleshooting/common-issues",
        // Add more troubleshooting documents as they are created
      ],
    },
    {
      type: "category",
      label: "Documentation Setup",
      items: [
        "upload-documentation/setup",
        "upload-documentation/create-content",
        "upload-documentation/customize-site",
        "upload-documentation/local-development",
        "upload-documentation/deployment",
      ],
    },
    // Keep these if you want to maintain the tutorial content
    {
      type: "category",
      label: "Tutorial Basics",
      items: [
        "tutorial-basics/create-a-page",
        "tutorial-basics/create-a-document",
        "tutorial-basics/create-a-blog-post",
        "tutorial-basics/markdown-features",
        "tutorial-basics/deploy-your-site",
        "tutorial-basics/congratulations",
      ],
    },
    {
      type: "category",
      label: "Tutorial Extras",
      items: [
        "tutorial-extras/manage-docs-versions",
        "tutorial-extras/translate-your-site",
      ],
    },
  ],
};

module.exports = sidebars;
