---
sidebar_position: 2
---

# Creating Documentation Content

This guide explains how to create and organize content for the Mayday CRM documentation site.

## Documentation Structure

Docusaurus organizes content in a hierarchical structure:

```
docs/
├── intro.md                 # Main landing page
├── category-1/              # A category folder
│   ├── _category_.json      # Category metadata
│   ├── doc1.md              # A document in this category
│   └── doc2.md              # Another document
└── category-2/              # Another category
    ├── _category_.json
    └── doc3.md
```

## Creating Documents

### Step 1: Create Markdown Files

Documentation pages are written in Markdown. Create a new `.md` file in the appropriate directory:

```markdown
---
sidebar_position: 1
---

# Document Title

This is the introduction paragraph.

## Section Heading

Content goes here...

### Subsection

More detailed content...
```

The `sidebar_position` frontmatter controls the order of documents in the sidebar.

### Step 2: Add Metadata

Each document can include frontmatter (metadata at the top of the file):

```markdown
---
sidebar_position: 2
title: Custom Title
description: A brief description of this document
tags: [tag1, tag2]
---
```

### Step 3: Organize with Categories

To create a category:

1. Create a folder in the `docs` directory
2. Add a `_category_.json` file to define the category:

```json
{
  "label": "Category Name",
  "position": 2,
  "link": {
    "type": "generated-index",
    "description": "Category description goes here."
  }
}
```

## Adding Rich Content

### Images

To add images to your documentation:

1. Place image files in the `static/img` directory
2. Reference them in your markdown:

```markdown
![Alt text](/img/my-image.png)
```

### Code Blocks

Add code examples with syntax highlighting:

````markdown
```javascript
function example() {
  console.log("This is a code example");
}
```
````

### Admonitions

Create callouts for important information:

```markdown
:::tip My Tip
This is a useful tip for users.
:::

:::warning
Be careful about this!
:::

:::danger
Critical information goes here.
:::
```

## Next Steps

After creating your content:

- [Customize the site appearance](./03-customize-site.md)
- [Build and test locally](./04-local-development.md)
- [Deploy the documentation](./05-deployment.md)
