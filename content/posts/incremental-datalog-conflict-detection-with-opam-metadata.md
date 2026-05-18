---
title: Incremental Datalog Conflict Detection with OPAM Metadata
slug: incremental-datalog-conflict-detection-with-opam-metadata
date: '2026-05-09'
tags:
  - requirements-engineering
  - formal-methods
  - performance
summary: >-
  Conflict detection for requirements needs a formal substrate that can update
  after small repository changes without rechecking the whole repository. This
  post proposes a restricted Datalog model, uses OPAM package metadata as a
  concrete benchmark, and reports a FlowLog run where incremental commits took
  0.89 ms at p50 while batch recomputation took 783.6 ms at p50 over the same
  30-commit window.
---
## From Requirements to a Testable Benchmark

I previously wrote about [AI-assisted software requirements engineering](https://terolaitinen.fi/speccing-ai-assisted-software-requirements-engineering/), [requirements repositories built from scattered project artifacts](https://terolaitinen.fi/requirements-engineering-with-cursor-from-google-docs-slack-convos-jira-confluence-and-submodules-into-cross-linked-markdown/), and [agent-assisted inconsistency resolution for monorepos](https://terolaitinen.fi/agent-assisted-inconsistency-resolution-for-monorepos/). Those posts describe the problem at a high level. This post narrows the question to one testable mechanism: can a restricted formal model be updated incrementally when a versioned knowledge base changes?

The goal is not to prove that a repository is consistent. That problem becomes intractable or undecidable as soon as the claims can encode arbitrary program behavior. The goal is smaller: maintain a finite set of derived conflict facts cheaply enough that the checker can run after ordinary repository updates.

The working hypothesis is that a Datalog-like rule layer can be useful if its expressiveness is controlled. The rule language should express joins, reachability, finite classification, and integrity constraints. It should avoid open-ended quantification, unrestricted function symbols, and rules that generate large Cartesian products by accident.

The experiment needs a real knowledge base before it needs natural language. Natural-language requirements would make the first prototype depend on claim extraction quality. Package metadata is a better first target because the artifacts already contain explicit constraints, conflicts, versions, alternatives, and filters.

I will use the public [opam-repository](https://github.com/ocaml/opam-repository) as the initial dataset. It is a Git repository, so commits provide natural deltas. Its package metadata is structured, but not trivial. The [opam manual](https://opam.ocaml.org/doc/Manual.html) defines fields such as `depends`, `depopts`, `conflicts`, `conflict-class`, and `available`. These fields are close enough to requirements to test conflict detection, but concrete enough to avoid debating prose interpretation in the first experiment.

## Why OPAM Is a Useful Proxy

An opam package version is a small specification. It states when the package is available, what it depends on, what it cannot coexist with, and which optional packages affect it. A package universe is a set of these specifications. A repository commit is a snapshot of that universe.

This is not the same as product requirements. A product requirement can talk about user intent, operational policy, or business behavior. Package metadata talks about installability. The similarity is structural: both domains contain independently authored artifacts whose constraints may interact in non-obvious ways.

The useful property is locality. Most commits in a package repository change a small number of package files. If every check recomputes the whole constraint closure from scratch, the formal model does not scale as a continuous repository service. If the update cost usually follows the affected neighborhood, then the approach may be useful for larger semantic-maintenance systems.

The benchmark should therefore measure update behavior, not just final runtime. Full recomputation time is a baseline. Incremental update time is the result of interest. Memory is equally important because incremental engines keep indexes, arrangements, or materialized relations in memory to avoid recomputation.

## Scope of the Formal Model

The first model should not attempt to reimplement the opam solver. Full package installability involves alternatives, version choices, installed state, external packages, requested actions, and optimization policy. That is a search problem. Datalog is better used here for necessary conflict detection and maintained derived facts.

The model should answer questions such as:

- Does a dependency clause have no available satisfying candidate under an environment?
- Does a package version depend on alternatives that all conflict with the package itself?
- Do two dependency clauses force incompatible choices?
- Do conflict classes make a selected group of package versions mutually incompatible?
- Which derived conflict facts are added or removed by a commit?

Those questions are weaker than installability. That is intentional. A weak check that is cheap, precise, and continuously maintained is more useful than a complete check that cannot run often enough.

The first finite universe should be explicit:

- package names
- package versions
- selected operating systems
- selected architectures
- selected OCaml compiler versions
- normalized dependency clauses
- normalized conflict clauses
- normalized availability filters

Version comparison and filter evaluation should be handled before Datalog when possible. The parser can emit finite facts such as `satisfies_constraint(env, candidate, constraint)` instead of asking Datalog to interpret the full opam formula language. That keeps the logic layer relational.

## Fact Model

The extractor should turn package files into typed facts. The exact schema can change during implementation, but the first version can look like this:

```prolog
env(E).
package(P, V).
active(E, P, V).

dep_clause(P, V, C).
dep_alt(C, DepName, ConstraintId).
candidate(E, C, Q, QV).

conflict_decl(P, V, TargetName, ConstraintId).
conflicts(E, P, V, Q, QV).

conflict_class(P, V, Class).
same_conflict_class(P, V, Q, QV, Class).
```

`active(E, P, V)` means that package version `P.V` is available in environment `E`. `dep_clause(P, V, C)` identifies one dependency clause. `dep_alt(C, DepName, ConstraintId)` identifies one alternative inside that clause. `candidate(E, C, Q, QV)` means that package version `Q.QV` satisfies one alternative of clause `C` in environment `E`.

This schema treats dependency alternatives as data. It also separates parsing from reasoning. If the parser misinterprets opam syntax, the Datalog layer may be fast but wrong. That risk should be measured separately with parser tests against opam tooling.

## Rule Model

The first rules should derive violations only when the conclusion is structurally justified.

```prolog
satisfied_clause(E, P, V, C) :-
  active(E, P, V),
  dep_clause(P, V, C),
  candidate(E, C, Q, QV).

missing_dependency(E, P, V, C) :-
  active(E, P, V),
  dep_clause(P, V, C),
  not satisfied_clause(E, P, V, C).
```

This rule uses stratified negation. The positive relation `satisfied_clause` is computed first. The negative check then identifies clauses with no satisfying candidate.

A stronger local conflict rule can test whether every available candidate for a dependency clause conflicts with the package requiring it:

```prolog
non_conflicting_candidate(E, P, V, C) :-
  active(E, P, V),
  candidate(E, C, Q, QV),
  not conflicts(E, P, V, Q, QV),
  not conflicts(E, Q, QV, P, V).

self_blocked_dependency(E, P, V, C) :-
  active(E, P, V),
  dep_clause(P, V, C),
  candidate(E, C, Q, QV),
  not non_conflicting_candidate(E, P, V, C).
```

This says less than a solver would say. It does not choose a full installation set. It only says that a dependency clause has candidates, but all known candidates are locally incompatible with the package that needs them.

Two dependency clauses can be checked in the same conservative style:

```prolog
compatible_candidate_pair(E, C1, C2) :-
  candidate(E, C1, P, V),
  candidate(E, C2, Q, QV),
  not conflicts(E, P, V, Q, QV),
  not conflicts(E, Q, QV, P, V).

blocked_dependency_pair(E, P, V, C1, C2) :-
  dep_clause(P, V, C1),
  dep_clause(P, V, C2),
  C1 < C2,
  candidate(E, C1, A, AV),
  candidate(E, C2, B, BV),
  not compatible_candidate_pair(E, C1, C2).
```

This rule is useful only if guarded carefully. The `candidate` relations bind the variables before the negative check. The `C1 < C2` guard prevents symmetric duplication. The rule may still be expensive for clauses with many alternatives, so candidate fanout must be measured.

The output relation should normalize findings:

```prolog
violation(E, P, V, "missing_dependency", C) :-
  missing_dependency(E, P, V, C).

violation(E, P, V, "self_blocked_dependency", C) :-
  self_blocked_dependency(E, P, V, C).

violation(E, P, V, "blocked_dependency_pair", C1, C2) :-
  blocked_dependency_pair(E, P, V, C1, C2).
```

The checker should store provenance for every violation. A useful report needs the package file, dependency clause, candidate set, conflict declaration, and commit hash. Without provenance, the formal result is hard to review.

## Incremental Checking

The input stream is the sequence of repository commits. For each commit, the extractor computes added and removed facts relative to the previous commit. The incremental engine receives that fact delta and updates derived relations.

The key measurement is not whether every update is small. Some updates should be large. A package rename, a compiler version change, or a widely used package update can affect many candidates. The useful question is whether ordinary small commits stay cheap, and whether large updates are visible as large affected neighborhoods rather than unexplained global recomputation.

The engine should record:

- added input facts
- removed input facts
- added derived facts
- removed derived facts
- added violation facts
- removed violation facts
- update time
- peak resident memory
- retained memory after the update
- relation sizes after the update

The important ratios are:

```text
derived amplification = abs(delta derived facts) / abs(delta input facts)
violation amplification = abs(delta violation facts) / abs(delta input facts)
time speedup = full recomputation time / incremental update time
memory amplification = retained engine memory / serialized input fact size
```

These ratios matter because absolute numbers are machine-dependent. The post can still report hardware and wall-clock time, but the ratios should make the result easier to interpret.

## Engine Choice

The experiment should keep the source language separate from the execution engine. Datalog is the authoring and review surface. The engine can lower the rules to relational algebra, incremental dataflow, or another maintained-view representation.

This separation matters because a model-generated relational query is hard to trust as the stable artifact. A small rule language can be typechecked, normalized, linted, and compiled. The compiler can own join order, provenance columns, indexes, and rule restrictions.

For the first prototype, a practical engine should satisfy three constraints:

- It supports insertions and deletions, not only append-only facts.
- It exposes enough metrics to measure update cost and memory.
- It can run the same rules in full recomputation mode and incremental mode, or can be paired with a batch baseline.

If no single engine gives all three, the experiment should still compare one incremental implementation against a simple batch implementation. The batch implementation does not need to be fast. It only needs to be correct enough to validate the incremental output on sampled commits.

## Experimental Run

I ran the first real-engine version with [FlowLog](https://www.flowlog-rs.com/), using `flowlog-compiler-v0.3.0`. FlowLog compiles Souffle-style Datalog into Timely/Differential Dataflow executables. I used its `datalog-batch` mode for full recomputation and its `datalog-inc` mode for incremental replay.

The Python harness only extracts OPAM metadata, assigns stable integer IDs, writes finite EDB facts, and drives FlowLog. It does not evaluate the Datalog rules. FlowLog evaluates the same rules in two modes:

- full recomputation from all parsed package files
- incremental replay from inserted and deleted fact deltas

Each incremental `Violation` snapshot was checked against FlowLog batch output for the same commit. If the violation relation differed, the run failed.

### Dataset

Input repository:

```text
repository: https://github.com/ocaml/opam-repository
clone: shallow clone with 80 commits
commit window: 30 first-parent commits
first commit: 0d8fa4e2785b, 2026-04-28, release-dmarc-v0.0.2
last commit: 9ed793693353, 2026-05-05, release-ppx_deriving_jsonschema-0.0.7
package versions at last commit: 18,897
package names at last commit: 4,493
input facts at last commit: 1,863,019
violations at last commit: 1,711
selected environments: one abstract environment
engine: FlowLog datalog-batch and datalog-inc, 1 worker
```

The fact model contains `DepClause`, `Candidate`, and `Conflict` input relations. Candidate facts are pre-grounded from package versions and dependency constraints. Conflict facts are derived by the extractor from OPAM `conflicts` fields and local conflict-class checks for candidate pairs. The Datalog program derives `SatisfiedClause`, `MissingDependency`, `NonConflictingClause`, `SelfBlockedDependency`, and `Violation`.

The run ignores `available` and `depexts` filters. Version formulas are approximated by quoted version atoms such as `{>= "1.0"}`. This is enough to exercise grounding, candidate derivation, local conflict checks, and incremental invalidation. It is not enough to reproduce OPAM solver behavior.

### Workloads

Executed workloads:

```text
W1: full recomputation for each of the 30 commits
W2: incremental replay over the same commit sequence
```

Synthetic updates and environment matrix expansion are left for a later run. The first run only measures real repository deltas.

### Metrics

The harness records:

```text
commit
changed opam files
input facts
input fact delta
violations
violation delta
FlowLog batch wall time ms
FlowLog incremental commit ms
FlowLog batch max RSS MB
FlowLog incremental max RSS MB
```

The raw outputs are in `experiments/opam-flowlog/opam-flowlog-results.csv` and `experiments/opam-flowlog/opam-flowlog-results.json`. The scripts, FlowLog programs, compact results, and generated charts are available as [a reproducibility bundle](/downloads/opam-flowlog-experiment-2026-05-09.tar.gz).

### Results

![FlowLog batch and incremental runtime over the 30-commit OPAM replay window.](/images/2026/05/opam-flowlog-runtime.svg)

![FlowLog incremental commit runtime for updates after the initial load.](/images/2026/05/opam-flowlog-incremental-runtime.svg)

![Inserted plus removed FlowLog input facts for each update.](/images/2026/05/opam-flowlog-delta-size.svg)

Summary over the 29 updates after the initial snapshot:

<table class="measurement-table">
  <thead>
    <tr>
      <th>Metric</th>
      <th>Result</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>changed OPAM files, p50</td><td>1</td></tr>
    <tr><td>changed OPAM files, p90</td><td>3</td></tr>
    <tr><td>input fact delta, p50</td><td>109</td></tr>
    <tr><td>input fact delta, p90</td><td>381</td></tr>
    <tr><td>input fact delta, max</td><td>2,115</td></tr>
    <tr><td>FlowLog batch recomputation, p50</td><td>783.6 ms</td></tr>
    <tr><td>FlowLog batch recomputation, p90</td><td>803.8 ms</td></tr>
    <tr><td>FlowLog incremental commit, p50</td><td>0.89 ms</td></tr>
    <tr><td>FlowLog incremental commit, p90</td><td>1.74 ms</td></tr>
    <tr><td>FlowLog incremental commit, max</td><td>8.33 ms</td></tr>
    <tr><td>speedup, p50</td><td>895.5x</td></tr>
    <tr><td>speedup, p90</td><td>1,423.1x</td></tr>
    <tr><td>FlowLog batch max RSS, max</td><td>152.1 MB</td></tr>
    <tr><td>FlowLog incremental replay max RSS</td><td>504.0 MB</td></tr>
  </tbody>
</table>

The largest incremental update happened when commit `dd592986d47d` added `packages/lwt/lwt.6.1.2/opam`. That single OPAM file changed 2,115 input facts and took 8.33 ms inside FlowLog's incremental commit. FlowLog batch recomputation for the same commit took 775.9 ms.

The next-largest incremental commit time was 2.90 ms after commit `94c943996066`, which changed 381 input facts and added one violation. Batch recomputation for that commit took 772.2 ms.

The violation count was almost stable in this window. It moved from 1,710 to 1,711 after the first update and then stayed flat. That is not surprising: recent OPAM commits usually add or adjust package versions without creating obvious local dependency conflicts under this simplified model.

The result supports the limited claim this run can support: for this restricted Datalog model, real OPAM metadata updates can be maintained by a production incremental Datalog/dataflow engine far more cheaply than recomputing the same violation relation from scratch. It does not show that the model is semantically complete.

### Threats to Validity

The extractor does not fully implement OPAM semantics. That can create false findings that measure parser incompleteness rather than rule usefulness. The next mitigation is to compare normalized facts and selected findings against OPAM tooling.

The environment matrix is currently one abstract environment. A package can be valid on one operating system and invalid on another. A later run should evaluate at least Linux, macOS, and Windows-like environments, plus selected OCaml compiler versions.

The Datalog checks are not complete installability checks. That limitation is deliberate, but it means the benchmark measures maintained local conflict detection rather than package solving.

The measured incremental commit time is FlowLog's commit execution time. The total incremental replay wall time was 2.60 seconds, including command processing and file loading. The harness does not include OPAM parsing and fact extraction in the FlowLog commit timing.

FlowLog's incremental run used more memory than individual batch runs. In this run, the incremental replay reached 504.0 MB RSS, while the largest batch run reached 152.1 MB RSS. That is an expected tradeoff: incremental maintenance keeps state and arrangements that batch recomputation can discard.

The package repository may be easier than natural-language requirements. That is acceptable for the first experiment. The point is to test incremental formal maintenance before adding claim extraction noise.

## What Would Count as Success

The experiment succeeds if it answers three questions.

First, does the formal model stay small enough to keep in memory for the chosen repository slice? If memory grows faster than the input and derived relations justify, the approach is not ready for continuous use.

Second, do most real commits update faster incrementally than by full recomputation? If ordinary commits still trigger global recomputation, the rule design is too broad or the engine is the wrong substrate.

Third, are the emitted conflict facts reviewable? A conflict without provenance is just another opaque warning. A useful finding should identify the package version, source clause, candidate facts, conflicting facts, and commit.

The experiment can fail usefully. If candidate grounding dominates runtime, the rule language needs stronger guards. If memory dominates, the engine needs fewer retained indexes or a smaller derived closure. If findings are noisy, the formal model is checking the wrong properties.

## Why This Matters for Requirements

The OPAM benchmark is not the final target. It is a controlled test for a mechanism that may later apply to requirements repositories.

In a requirements repository, artifacts would contribute claims instead of package facts. A Markdown section might contribute a behavior claim. An OpenAPI schema might contribute an endpoint claim. A test might contribute an executable expectation. A runbook might contribute an operational claim.

The same incremental structure can still apply:

```text
artifact delta -> fact delta -> derived claim delta -> violation delta
```

The hard part is not only extracting claims. The hard part is designing a formal layer that remains useful without becoming computationally explosive. OPAM metadata gives a way to test that layer before adding natural language.

If the OPAM experiment shows that a restricted Datalog model can maintain useful conflict facts with predictable update cost, the next step is a mixed software repository. That repository should include Markdown requirements, API schemas, generated clients, tests, and code metadata. The Datalog layer should remain boring. The extraction layer can become more ambitious only after the maintained model has earned the right to exist.
