#!/usr/bin/env node
/**
 * Validates canonical URL output for the static export.
 *
 * The site is deployed to GitHub Pages. Directory index files avoid exposing
 * duplicate /page.html URLs for indexable pages.
 */

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(process.cwd(), 'out');
const SITE_ORIGIN = 'https://terolaitinen.fi';

const errors = [];
const htmlFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      htmlFiles.push(fullPath);
    }
  }
}

function expectedCanonicalFor(filePath) {
  const relativePath = path.relative(OUT_DIR, filePath).split(path.sep).join('/');

  if (relativePath === 'index.html') {
    return `${SITE_ORIGIN}/`;
  }

  if (!relativePath.endsWith('/index.html')) {
    return null;
  }

  return `${SITE_ORIGIN}/${relativePath.replace(/\/index\.html$/, '/')}`;
}

try {
  walk(OUT_DIR);
} catch (err) {
  console.error(`Failed to read ${OUT_DIR}: ${err.message}`);
  process.exit(1);
}

for (const filePath of htmlFiles.sort()) {
  const relativePath = path.relative(OUT_DIR, filePath).split(path.sep).join('/');

  if (relativePath === '404.html' || relativePath === '404/index.html') {
    continue;
  }

  if (path.basename(filePath) !== 'index.html') {
    errors.push(`${relativePath}: indexable pages must be emitted as directory index files`);
    continue;
  }

  const html = fs.readFileSync(filePath, 'utf8');
  const canonicalMatches = [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)];

  if (canonicalMatches.length !== 1) {
    errors.push(`${relativePath}: expected exactly one canonical link, found ${canonicalMatches.length}`);
    continue;
  }

  const canonical = canonicalMatches[0][1];
  const expectedCanonical = expectedCanonicalFor(filePath);

  if (canonical !== expectedCanonical) {
    errors.push(`${relativePath}: canonical ${canonical} does not match ${expectedCanonical}`);
  }
}

if (errors.length > 0) {
  console.error(`Canonical URL validation failed (${errors.length} issue(s)):\n`);
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log(`Canonical URLs valid (${htmlFiles.length} HTML files checked)`);
