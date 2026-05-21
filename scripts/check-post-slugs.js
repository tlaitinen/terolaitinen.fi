#!/usr/bin/env node
/**
 * Verifies that Markdown post filenames and frontmatter slugs stay aligned.
 *
 * The static app currently derives public post URLs from filenames. A mismatched
 * frontmatter slug is easy to miss during review and can lead to publishing a
 * misspelled canonical URL.
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const POSTS_DIR = path.join(process.cwd(), 'content/posts');
const errors = [];

for (const fileName of fs.readdirSync(POSTS_DIR).sort()) {
  if (!fileName.endsWith('.md')) {
    continue;
  }

  const filePath = path.join(POSTS_DIR, fileName);
  const expectedSlug = fileName.replace(/\.md$/, '');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data } = matter(fileContents);

  if (typeof data.slug !== 'string') {
    errors.push(`${fileName}: expected frontmatter slug to be a string`);
    continue;
  }

  if (data.slug !== expectedSlug) {
    errors.push(`${fileName}: frontmatter slug "${data.slug}" must match filename slug "${expectedSlug}"`);
  }
}

if (errors.length > 0) {
  console.error(`Post slug validation failed (${errors.length} issue(s)):\n`);
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log('Post slugs valid');
