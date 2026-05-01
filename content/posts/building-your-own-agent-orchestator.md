---
title: "Building Your Own Agent Orchestrator"
slug: "building-your-own-agent-orchestrator"
date: "2026-05-01"
---

I finally set aside some time to experiment with agent orchestrators. It turns out that building one tuned to your workflow is straightforward. The agent drafts its own orchestration skill, you run it, flag what falls short, and it iterates. The result fits your repositories, build system, and other constraints including budget. You may start from scratch or fork an existing orchestrator.

My setup: Opus 4.7 as orchestrator, Codex GPT 5.5 as worker. Opus 4.7 wrote the skill and keeps revising it. Codex seems to have better bang-per-buck on actual implementation. The orchestrator churns less tokens, so its cost does not matter much.

![Orchestrator Skill Interaction Loops](/images/2026/05/orchestrator_worker_architecture.svg)

## **Orchestrator and Worker Split**

The orchestrator plans, decomposes work into specs, spawns workers, watches progress, forwards messages, handles failures, and talks to me. However, the orchestrator should not block for long when spawning tasks, so it offloads much of the specification work to workers. If workers need to ask, they do so using the bidirectional file-based communication channel. Workers do exploration, implementation, building, testing, and committing inside isolated worktrees. The orchestrator never edits source or grep-walks the tree, so it stays cheap to run for hours; workers stay focused because the spec is a narrow contract. 

The split is fairly arbitrary. I have better MCP / plugin configuration available in Claude, so I keep it for human interaction. However, it is expensive, so I offload the grunt work to Codex, which is also slower, so it’s suitable for long-running autonomous task work. Smaller MCP config for workers also reduces the blast radius for runaway agent situations.  

## **State in Files**

Everything that matters lives in a state directory under the repository, one directory per task: status, spec, communication channels, checkpoint, result, log. On restart the orchestrator reconstructs its world by reading the filesystem rather than recalling, making the system recoverable.

## **Checkpointed Worker Execution**

Workers run noninteractively, so each invocation starts fresh. The worker writes a checkpoint every few meaningful steps summarizing position and next step. On respawn — after a crash, budget exhaustion, or a refined spec — the next invocation reads the checkpoint and skips completed work. Worker context windows stay bounded on long multi-stage tasks: most recent slice plus a small recap, not the entire history. Iteration after failure is cheap, which matters because the worker is the part you run repeatedly.

## **Orchestrator Context Discipline**

The orchestrator has its own context budget. Read small files only — status, checkpoint, outbox tail — and leave large ones on disk. I can compact aggressively when a phase is finished. This drives token cost directly when running for hours, and is the easiest place for an orchestrator to get expensive without you noticing.

## **Build and Test Serialization**

Builds and tests are heavy on CPU, memory, and disk. Running them concurrently across adjacent worktrees overwhelms the machine — swapping, OOMs, thrashed disks, flaky tests from contention. A single lock file under the state directory serializes any operation touching shared build resources. Workers acquire before, release after; the orchestrator clears stale locks whose holding process is dead. Parallelism stays high where work is light; the heavy stage gets a clean queue.

## **Keeping Pull Requests Conflict-Free and Green**

Tasks end when the change is merged, not when the worker exits. The orchestrator treats open pull requests as long-lived monitoring tasks with their own status vocabulary. On startup, every open pull request gets a watching worker assigned: rebasing as the base branch moves, keeping checks green, escalating design conflicts. Mechanical conflicts get a fresh worker with resolution guidance. CI failures become repair tasks with failure context attached. The gap between "code written" and "code merged" collapses into the same loop.

## **Self-improving Agentic Loop**

The skill maintains a dual-layered feedback loop to ensure continuous improvement. The first layer relies on manual intervention: when the orchestrator makes a mistake, I provide a direct correction, which the system then uses to update its own rules and scripts. This keeps the core logic aligned with user expectations and evolving project needs.

The second layer is autonomous and requires no human input. When a task fails or requires multiple attempts, the orchestrator conducts a retrospective analysis. It compares the failed instructions with the successful outcome to identify the root cause of the initial failure. The resulting lesson is recorded and automatically applied to all future tasks. This process ensures that the quality of instructions improves over time, preventing the same errors from recurring and allowing the human operator to focus on high-level coordination rather than repetitive troubleshooting.

## **Security Boundaries**

Workers run in YOLO mode — approvals bypassed, sandbox disabled — because noninteractive execution requires it. The host is protected only by the devcontainer boundary: workers can do whatever they want inside the container, but cannot touch the host. Real boundary, not complete. Workers retain network access by necessity: code host, package registries, model providers. That network surface is where prompt injection is possible. Any reachable content can in principle steer a YOLO-mode agent within container limits. 

## **Conclusions**

The specific architecture matters less than the meta-point. What’s important is setting aside some time to climb Yegge's AI ladder to unlock strategic productivity gains. Tools and processes are evolving faster than at any point in this profession's history. Maybe they’ll converge and the rate of progress will plateau, so frantically chasing the ideal workflow du jour is not optimal when you need to deliver something. However, regularly reevaluating habits and processes will likely pay off in the long run.
