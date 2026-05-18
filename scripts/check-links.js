#!/usr/bin/env node
/**
 * Link checker for the static export.
 * Scans all HTML files in ./out for broken internal links.
 * 
 * Usage:
 *   node scripts/check-links.js
 * 
 * Exit codes:
 *   0 = all links valid
 *   1 = broken links found
 */

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(process.cwd(), 'out');

// Collect all valid internal paths from the out directory
const validPaths = new Set(['/']);

function collectPaths(dir, prefix = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === '_next') {
        // _next directory is served as-is
        validPaths.add(`/${relativePath}`);
        collectPaths(fullPath, relativePath);
        continue;
      }
      collectPaths(fullPath, relativePath);
      // Directory without index.html is not a valid path by itself
    } else if (entry.isFile()) {
      const urlPath = prefix ? `/${prefix}/${entry.name}` : `/${entry.name}`;
      validPaths.add(urlPath);

      if (entry.name.endsWith('.html')) {
        // Also add the .html-less variant for HTML files
        if (entry.name === 'index.html') {
          const dirPath = prefix ? `/${prefix}` : '/';
          validPaths.add(dirPath);
        } else {
          const slug = entry.name.replace(/\.html$/, '');
          validPaths.add(`/${prefix ? prefix + '/' : ''}${slug}`);
        }
      }
    }
  }
}

try {
  collectPaths(OUT_DIR);
} catch (err) {
  console.error(`Failed to read ${OUT_DIR}: ${err.message}`);
  process.exit(1);
}

const brokenLinks = [];
const checkedLinks = new Set();

function checkFile(filePath, pagePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const linkRegex = /href="([^"]+)"/g;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];

    // Skip already checked
    if (checkedLinks.has(`${pagePath}::${href}`)) continue;
    checkedLinks.add(`${pagePath}::${href}`);

    // Skip external, anchors, mailto, tel, javascript
    if (
      href.startsWith('http') ||
      href.startsWith('#') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('javascript:') ||
      href.startsWith('data:')
    ) {
      continue;
    }

    // Resolve relative to absolute path
    let resolved = href;
    if (resolved.startsWith('./')) {
      const dir = path.dirname(pagePath);
      resolved = path.posix.join(dir, resolved.slice(2));
    } else if (resolved.startsWith('../')) {
      const dir = path.dirname(pagePath);
      resolved = path.posix.normalize(path.posix.join(dir, resolved));
    }

    // Ensure leading slash
    if (!resolved.startsWith('/')) {
      resolved = '/' + resolved;
    }

    // Remove trailing slash for comparison (matching our trailingSlash: true setup)
    const normalized = resolved.replace(/\/$/, '') || '/';

    if (!validPaths.has(normalized) && !validPaths.has(resolved)) {
      brokenLinks.push({ page: pagePath, href, resolved });
    }
  }
}

function walkAndCheck(dir, prefix = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name === '_next') continue;
      walkAndCheck(path.join(dir, entry.name), prefix ? `${prefix}/${entry.name}` : entry.name);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      const pagePath = prefix ? `/${prefix}/${entry.name}` : `/${entry.name}`;
      checkFile(path.join(dir, entry.name), pagePath);
    }
  }
}

walkAndCheck(OUT_DIR);

if (brokenLinks.length === 0) {
  console.log(`✓ All internal links valid (${checkedLinks.size} links checked)`);
  process.exit(0);
} else {
  console.error(`✗ Found ${brokenLinks.length} broken internal link(s):\n`);
  for (const link of brokenLinks) {
    console.error(`  Page: ${link.page}`);
    console.error(`  Href: ${link.href}`);
    console.error(`  Resolved: ${link.resolved}`);
    console.error('');
  }
  process.exit(1);
}
