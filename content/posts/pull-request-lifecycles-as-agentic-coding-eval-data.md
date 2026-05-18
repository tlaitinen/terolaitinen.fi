---
title: "Pull Request Lifecycles as Agentic Coding Eval Data"
slug: "pull-request-lifecycles-as-agentic-coding-eval-data"
date: "2026-05-18"
tags:
  - ai-agents
  - automation
  - evaluation
summary: >-
  Agent-authored pull requests already contain much of the signal needed to
  improve agentic coding workflows: the prompt, opened diff, quality gates,
  review comments, revisions, merged state, model configuration, and token
  spend. The useful loop is to mine that lifecycle after merge, propose minimal
  guidance-surface or quality-gate improvements, retry the clarified task, and
  measure whether the extra token spend improves post-convergence one-shot
  success and value-per-token.
---

![Pull rqeuest lifecycle loop](/images/2026/05/pr-lifecycle-loop.svg)

Pull request review is where agentic coding systems encounter ambiguity and accumulated inconsistency in an existing software organization. The task prompt may be incomplete, but the repository may also contain outdated documentation, conflicting requirements, redundant implementations, and code that no longer matches the current guidelines. The review discussion contains product intent, local engineering preferences, hidden conventions, quality-gate gaps, and corrections to assumptions that were not written down before the agent started working.

Human reviewers may notice that a comment should become durable guidance, or that a repeated review finding should become an automated gate. The current pull request may still remain the urgent work. Turning that observation into a guidance-surface or quality-gate improvement is a separate strategic task, and its benefit accrues mostly to future contributors.

That does not make the signal unavailable. It means the signal is contextual, scattered, and not immediately actionable. The useful system is one that mines pull request lifecycles after merge and turns repeated correction patterns into reviewable improvement PRs.

[NotebookLM Explainer Video in YouTube](https://youtu.be/R83CBdabFDc?si=oY-efEYciKftRa9b)

## PR Lifecycle as the Eval Case

The unit of analysis is not an individual review comment. A comment is only a candidate signal.

The useful object is the pull request lifecycle: the initial prompt or task description, the opened diff, the model and orchestration configuration used to generate it, the automated checks, the agentic review passes, the human review comments, the revisions, and the merged state.

The merged state matters because it anchors the analysis. A review comment that led to an accepted delta is different from a comment that was later shown to be based on a misunderstanding. A comment that caused a scope clarification is different from a comment that identified an implementation defect. A comment that was wrong may still be valuable. In that case, it is a signal about PR intent communication or reviewer false positives rather than guidance for future implementation.

For improving the guidance surface and quality gates, the system should analyze full PR lifecycles. For measuring whether the improvement loop is useful, it should additionally analyze retries of the same clarified task and aggregate trends across many lifecycles.

## One-Shot Success

The metric needs a precise starting point.

One-shot success should mean that after the PR scope is clear and the automated quality gates have converged, the PR merges without human-requested code changes.

The scope may be clear in the initial prompt. It may also become clear only after a reviewer corrects or narrows the task. That distinction matters. If the original prompt was ambiguous, a human-requested scope clarification should not be counted as the same kind of failure as a missing test, broken convention, or unsafe migration.

Quality gate convergence includes ordinary CI and agentic reviewers. Tests, type checks, lint, builds, policy checks, and automated agentic review loops should have reached the point where they no longer request material changes. Measuring one-shot success before that point mostly measures whether the automated gates were allowed to do their job.

To reduce that ambiguity at the source, prompt validation can make the signal cleaner. The agent can prepare a draft PR or task record that contains the intended PR prompt, and a human can approve or edit it before implementation starts. That is not a hard requirement. If the prompt was not validated, the lifecycle analysis needs to separate scope convergence from implementation-quality correction.

## PR Metadata

An agent-authored PR should preserve enough metadata to become an evaluation case after merge.

The minimum useful metadata includes:

- The prompt or task description used to generate the PR, including any later scope revisions.
- The model configuration: models used, roles, passes, orchestration strategy, and relevant settings.
- Token counts and spend by role or pass.
- The opened diff and the final merged diff.
- The quality gates run before human review, including agentic reviewers.
- Human and automated review comments.
- The mapping from comments to accepted revisions where such a mapping can be inferred.
- The success classification under the post-convergence one-shot definition.
- Candidate guidance-surface or quality-gate changes suggested by the lifecycle analysis.

The model configuration is not just provenance. It is part of the economics. If the generative step uses one model to plan, another to implement, another to review, and another to summarize, the organization should be able to compare that team configuration against alternatives. The question is not only whether a PR eventually merged. The question is which configuration produced useful work at an acceptable token cost.

This metadata should live where the organization can actually query it. A PR description can carry a human-readable version, possibly inside collapsed details. A separate store may hold structured event data, token accounting, and lifecycle links. The storage choice is secondary. The important property is that the merged PR remains analyzable.

## Mining the Lifecycle

The analysis should work backward from the accepted outcome.

Start with the opened diff and the final merged diff. Identify the material deltas. Then inspect the review discussion, automated gate output, and revision history to explain those deltas. Some changes will trace cleanly to a review comment. Others will come from failing tests, agentic reviewer findings, author self-correction, or late scope clarification.

The output should not be "every review comment becomes guidance." That would encode noise. The output should be a minimal proposed change to the guidance surface, the quality gates, or the PR intent-signaling machinery.

The guidance surface is broad. It may include `AGENTS.md`, developer docs, examples, checklists, code comments, templates, rubrics, architecture notes, or organization-specific context. The quality gate may include deterministic checks, review rubrics, agentic reviewer prompts, policy checks, generated-file checks, migration checks, or any automated process trusted to catch a class of defects before human review.

Misguided comments are useful in a different way. If a reviewer misunderstood the intent, the PR description, inline comments, or task summary may have failed to communicate the scope. If an agentic reviewer repeatedly requests changes that do not contribute to the accepted merged state, that is a false-positive signal for the reviewer. If humans repeatedly catch issues after agentic reviewers converge, that is a false-negative signal.

The improvement PR should be small. It might add one repository convention to the guidance surface. It might strengthen one agentic review rubric. It might add one deterministic check. It might revise the PR template so intent is easier to audit. The point is not to write a large process document after every merge. The point is to make the smallest durable change that would have plausibly prevented the expensive correction.

Humans should approve these improvement PRs before they land. The system can mine, propose, retry, and measure automatically. Changing repository guidance or quality gates still changes how future contributors are judged, so it deserves review.

## Retry as Evaluation

After a candidate guidance or gate change exists, the same clarified PR task can be attempted again.

The retry should start from the clarified scope, not from an ambiguous initial state unless ambiguity handling is the thing being tested. It should use the modified guidance surface, modified gates, or both. The result is compared with the accepted goal state.

The comparison should be semantic. A retry does not need to reproduce the merged diff byte for byte. It should satisfy the same behavior, tests, review rubric, and accepted intent. Human or agentic assessment may be needed when behavior is not fully captured by deterministic checks.

Each retry creates several measurements:

- How far the attempt was from the accepted goal state.
- Which accepted corrections were avoided.
- Which new mistakes appeared.
- How much the attempt cost.
- Which model/team configuration was used.

The loop can stop when the attempt reaches post-convergence one-shot success, when the token or cost budget is exhausted, or when improvement plateaus.

This makes the guidance change testable. A proposed edit to `AGENTS.md` is not justified because it sounds wise. It is justified if it reduces semantic distance from the accepted goal state, improves post-convergence one-shot success across tasks, or improves value-per-token under fair accounting.

## Economics of the Outer Loop

The self-improvement loop spends tokens too.

Mining PR history, classifying comments, reconstructing deltas, proposing guidance changes, running retries, and evaluating semantic distance all consume budget. That budget must be weighed against the improvement it buys. A loop that produces elegant guidance PRs nobody merges is not working. A loop that increases one-shot success by a negligible amount at high cost is not working either.

The first-class metrics should be:

- Post-convergence one-shot success rate.
- Value-per-token.
- False-positive and false-negative rates of agentic reviewers.

Supporting metrics still matter:

- The merge rate of guidance-surface and quality-gate improvement PRs tells whether the proposals are useful to humans.
- Token spend by model role tells which parts of the generative team add value.
- Time-to-merge and avoided human review comments can help estimate operational benefit.

These supporting metrics should not replace the primary metrics.

Value-per-token is the central economic metric because the system can improve success by spending more tokens almost anywhere. It can add more planning passes, more reviewers, more retries, more summarizers, more rubric checks, or more expensive models. Some of that spend may be worthwhile. Some of it will only move work from humans to an expensive automated loop. The outer loop should make that tradeoff visible.

## Limits

This process does not remove ambiguity from software work. It only makes some ambiguity observable after the fact.

It can overfit to a single PR. It can encode stale conventions. It can make guidance too long. It can optimize for reviewer preference noise. Agentic reviewers can reinforce each other's bad assumptions. Scope drift can contaminate the success metric. Retry loops can become expensive enough that the cure costs more than the review friction.

These risks are reasons to keep the artifacts small, the accounting explicit, and the approval path human-reviewed. The loop should produce minimal improvement PRs, measure their acceptance and impact, and reduce its own budget when the return is weak.

The practical target is narrow: agentic coding systems should optimize for post-convergence one-shot success and value-per-token. "Can the agent eventually get the PR merged?" is too weak. The more useful question is whether the organization can convert PR lifecycle feedback into durable guidance and better gates cheaply enough that future agent-authored PRs need fewer human-requested changes after the automated process has done its work.
