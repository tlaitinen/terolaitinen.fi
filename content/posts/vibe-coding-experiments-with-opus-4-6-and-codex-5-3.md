---
title: "Vibe Coding Experiments with Opus 4.6 and Codex 5.3"
slug: "vibe-coding-experiments-with-opus-4-6-and-codex-5-3.md"
date: "2026-02-24"
---

I've used coding agents extensively at work, but until recently I hadn't tried building anything usable from scratch with them outside work. Opus 4.6 and GPT-5.3-Codex have both been impressive, so I thought I'd see how they perform on greenfield projects. At work, code reviews are mandatory. Personal experiments have leaner quality standards.

This post covers the deployment setup and three vibe-coded apps:

- A GitHub Actions workflow for server initialization and application deployment to the cheapest Hetzner cloud instance.
- An attempt to turn my earlier post on AI-assisted software requirements engineering into an application.
- A web app for tracking my boys' virtual piggy bank — weekly allowances and errand rewards.
- A voice-chat web application and task runner for sharing the vibe-coding setup with non-technical family members.

## Shared Multi-Project Rust Binary on Hetzner Cloud

I'm mindful of recurring costs and have a soft spot for efficient resource use, so I wanted a setup where I could deploy many vibe-coded apps without worrying about capacity. Hetzner's shared cost-optimized plan offers incredible value. The CX23 includes 2 vCPUs, 4 GB of RAM, 40 GB of SSD, an IPv4 address, and 20 TB of traffic for €3.49 per month excluding VAT and backups.

For maximum efficiency, I packed the backend of all projects into a single Rust binary behind an Nginx reverse proxy on Debian 13. Brief disruptions when restarting the backend aren't a concern, so the setup involves no containers. Rust gives me good performance, memory safety, and a strong type system that may prevent agents from generating faulty code. Compile times are the main concern — I configured `sccache` to speed up builds and skip backend compilation entirely when sources are unmodified. And maybe I'll learn a bit more about Rust when I read the generated sources.

I initially set up certbot for HTTPS but switched to Cloudflare's free plan to get CDN, DDoS protection, and a hidden origin IP. None of this matters much for hobby projects; I wanted to try Cloudflare and learn the basics.

A manually dispatched, idempotent server-provisioning GitHub Actions workflow installs dependencies, configures the reverse proxy, and applies minimal hardening. I don't plan to run anything critical or privacy-sensitive on the box, but I'd rather not share it with bad actors. If the server gets hacked or an agent vibe-nukes the data, I can restore from Hetzner's backups.

### Opus vs Codex

I started with Opus 4.6 on the Claude Pro plan, hit the weekly rate limit surprisingly quickly, and pivoted to Codex CLI on the xhigh setting. Both are excellent. Latency varies. Opus is generally better for interactive use because it aggressively parallelizes. Codex seems to offer better value — or there's an impressive promotion running. At work I'm diligent about planning; here I've indulged in vague, short prompts, more iterations, adding requirements one at a time, then asking the agent to refactor and run a security review.

### Containing the Blast Radius

I have no illusions about the pile of vibes being full of holes, even after a few rounds of agent-conducted security refactoring, so I use a separate GitHub account to contain the blast radius and the server has no access to other systems. The deployment repository holds the root user's SSH key, Google OAuth credentials shared across all apps, and a shared secret used by the chat application's task-processor client. That's the perimeter.

## Vibing the AI-Assisted Requirements-Engineering Tool

I handed the agent a link to the requirements-engineering post and a few accompanying words, partly to see how an unconstrained agent behaves. I was impressed by how much worked out of the box — Google login, GitHub syncing. In the spirit of the post, I encouraged the agent to set up AGENTS.md files following the latest best practices and to track each project's requirements in REQUIREMENTS.md. I asked it to modularize and refactor the code a few times and nudged it toward a static Next.js build for the client.

The agent chose SQLite for storage. Given my preference for efficient resource use, it's perfect: a single Rust binary writing to one SQLite file keeps the SSD busy without wasting CPU cycles. The subsequent projects inherited the same storage.

As for the post's original idea — a requirements-engineering tool — I quickly realized that yet another clumsy web app for editing requirements isn't useful. Agents do the work now anyway. What might actually help is a service that monitors one or more git repositories and offers something like "eventual consistency": it detects conflicting files and opens PRs to reconcile them. The guarantee would apply to everything analyzable — Figma designs, documentation, image assets, audio and video, source code, and configuration.

## Family Ledger: a Virtual Piggy Bank for My Boys

I'd been using a free website and companion iOS app to track my boys' weekly allowances, spending, and errand rewards. The UX wasn't ideal. The service was sometimes unavailable and I worried my data would vanish. The iOS app logged me out constantly. Topping up accounts took too many taps.

Emboldened by the first from-scratch vibe experiment, I decided to build a replacement I'd actually enjoy using. Requirements:

- Google login.
- One page showing both boys' balances with inline controls to modify them.
- Configurable one-tap quick-add errands.
- Parent and child views. The child sees only their balance.
- Configurable weekly allowance.
- A transaction ledger showing the five most recent entries by default.
- Less-frequent controls — account linking, quick-add config — hidden in settings.

After a few prompts, it went live. The first implementation linked parent and child accounts via invite codes; I asked the agent to match on Google account emails instead and drop invite codes entirely. Locale handling confused the agent even when I flagged it, so I cut the corner and told it to accept both dot and comma as decimal separators.

## Voice Chat: a Family-Friendly Vibe-Coding Platform

What's more fun than vibe coding? Vibe coding with your family. I wanted to share the vibes I'd recently discovered, and it struck me that speaking requirements rather than typing them would be genuinely useful. An app idea strikes while jogging? Get it out. Stuck somewhere with just a phone and an itch to vibe? Same. So I started building a vibe-coding platform for the family on top of the existing setup. I ended up with:

- A web app where users submit tasks by voice or text.
- Tasks enter a shared queue; a singleton client processes them one by one and pushes commits to the repository.
- A user-specific system prompt attached to all Codex sessions for that user.
- A memory file per user that can be edited in the web app. Previous chats are aggregated into it; the client updates it and persists it to the server.
- UI, voice input, and voice output available in English and Finnish.
- Whisper for speech-to-text, Piper for audio summaries.
- Retry for rate-limited or failed tasks.
- Admin controls: grant access to specific Google accounts, modify system prompts, view chat logs.

I didn't want to expose my agent credentials on the server, and I wanted the large multilingual Whisper model, so I had the agent build a Docker container where Codex runs with `--sandbox danger-full-access` and `--ask-for-approval never` — both essential for unsupervised task processing. The large Whisper model needs roughly 10 GB of memory (so the agent claimed), which is another reason to run tasks on my MacBook M1 with 16 GB. The container hopefully prevents host escalation, but it's genuinely insecure: network access is unrestricted. Even with tighter sandboxing, the agent could launch missiles through GHA using the root SSH key stored in repo secrets. I trust my family not to cause trouble intentionally.

## Conclusions

The latest generation of agents seems to have crossed a meaningful threshold. The cost of producing correctly functioning software has plummeted. A year ago, I was wondering — along with many others — where we were on the curve and whether progress had stagnated. [Something big may actually be happening](https://www.linkedin.com/pulse/something-big-happening-matt-shumer-so5he/). I'm fortunate to have a front-row seat and to apply this in my day job. Calling it *AI evolution* isn't much of a stretch anymore: current agents are participating in building the next generation of agents.

Capabilities have improved at staggering speed, and the AI giants have every incentive to talk up how this will transform society — sooner rather than later. The potential for job disruption looks real, and not only for programmers. This from-scratch vibe-coding experiment was fun, but more than anything it sharpened my sense of the magnitude of what's coming.
