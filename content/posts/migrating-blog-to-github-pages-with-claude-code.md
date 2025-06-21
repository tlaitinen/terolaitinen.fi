---
title: "Migrating Blog to GitHub Pages with Claude Code Pro"
slug: "migrating-blog-to-github-pages-with-claude-code"
date: "2025-06-11"
---

I migrated this website from self-hosted Ghost to GitHub Pages using Claude Code Pro. The process took a few hours.

## Background

Self-hosting Ghost meant dealing with security updates, server maintenance, and monthly hosting bills. GitHub Pages offers free hosting for public repositories with static sites. No security concerns, no costs.

I also prefer writing in Markdown over Ghost's editor.

## Claude Code Setup

Claude Code Pro currently uses the Sonnet 4.0 model. It's not the most capable model, but careful prompting makes it effective. The usage limit resets every 5 hours, avoiding expensive surprises due to token-based billing.

Claude Code handles task management well. It breaks work into subtasks and tracks progress. I had a feeling that it requires less meta-prompting compared to Cursor using Gemini 2.5 Pro 05-06 Preview, which I have used at work, but it's not a fair comparison because the work repo is massive. 

## Migration Process

I copied the Ghost folder from my server and gave Claude access. It queried the SQLite database directly to extract content.

Claude suggested Next.js with Tailwind CSS. I don't particularly like Tailwind and hadn't used it before, but I let Claude handle the implementation. The framework has extensive documentation and training data.

## Technical Issues

Typography required multiple prompting rounds. I added Playwright MCP for DOM snapshots, but Claude used screenshots instead. It couldn't compare them effectively. I ended up checking computed styles manually and copy-pasting CSS values.

Initial Markdown rendering showed raw text instead of formatted content. Bullet point styles disappeared. These required focused, incremental fixes.

## Workflow Observations

Smaller increments produced better results. Dark mode implementation worked immediately after a single prompt.

The 5-hour limit wasn't problematic for this small site. I hit it later when attempting a WordPress migration. For side projects, it's sufficient.

Working with Claude Code involves some friction. You'll find yourself typing "yes, continue as planned" and "yes, run this command" more than you'd like. Also, resuming stopped processes requires re-establishing context. There's probably a way to streamline this between sessions, but I haven't investigated yet. 

## Summary


The site's faster and more secure as a static site, costs nothing to host, and I can modify it easily. System-theme detection works by default.

For personal sites, Claude Code Pro + GitHub Pages can be a convenient way to optimize for control, performance, and free hosting. 

Claude Code with Sonnet 4.0 seems to perform well when you:

- Break tasks into focused increments
- Provide specific examples rather than vague comparisons

It struggles when you:

- Ask for broad visual comparisons
- Expect it to perfectly replicate complex layouts without guidance
