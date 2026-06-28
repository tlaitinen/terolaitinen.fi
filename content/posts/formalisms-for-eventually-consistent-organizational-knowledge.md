---
title: "Formalisms for Eventually Consistent Organizational Knowledge"
slug: "formalisms-for-eventually-consistent-organizational-knowledge"
date: "2026-06-28"
tags:
  - ai-agents
  - formal-methods
  - requirements-engineering
  - knowledge-management
summary: >-
  Heterogeneous organizational sources of truth can be projected into versioned
  formal models, bridged through local ontologies, grounded into bounded
  domains, and checked asynchronously by multiple definitive solvers. The goal
  is not global proof of consistency. The operational target is zero detected
  inconsistencies under the active extraction and checking regime.
---

## Formal Setup

A source of truth is any artifact an organization treats as authoritative for
some part of its behavior, structure, policy, design, or intent. It may be code,
a schema, a migration, a design file, a Google Doc, a Figma frame, a Jira issue,
a Confluence page, a policy document, an architecture decision record, a
workflow definition, a generated SDK that is treated as canonical by consumers,
or a third-party system exposed through an agentic interface.

Runtime observations are out of scope unless the artifact is itself an authored
source specification. Probabilistic systems are also out of scope here: they can
rank suspicion or schedule work, but they do not provide the definitive checker
results considered in this post.

Let a versioned organizational snapshot be:

$$
S = \{a_1, \ldots, a_n\}
$$

where each $a_i$ is an authoritative artifact or an authoritative representation
of an external system.

A fragment is the smallest useful region of a source artifact: a Markdown
section, an API path, a type definition, a function, a UI component, a design
token group, a policy clause, an issue field, a state-machine transition, or a
schema path. The fragment boundary is pragmatic. It exists so that formal models
can stay small enough to check.

For each artifact $a_i$, an extraction process selects fragments:

$$
F(a_i) = \{f_{i1}, \ldots, f_{ik}\}
$$

A derived model is a formal projection of a fragment or group of fragments. It
is not the source of truth. It is versioned, provenance-linked, disposable, and
recomputable. It may be a Datalog fact set, an SMT formula, an Alloy model, an
OWL ontology, a finite automaton, a type signature, a temporal formula, or a
proof obligation.

Write the extracted model for a fragment as:

$$
E(f) = m_f
$$

The extraction agent is assumed to iterate on each fragment until the local
derived model is internally consistent. The interesting question is therefore
not whether a single fragment was parsed perfectly. The question is whether many
locally consistent projections can be satisfied together.

Let $B$ be the current set of derived bridge assumptions between local domain
ontologies, grounded constants, entity identifiers, and checker-specific
projections. A selected checker $c$ over fragments $G$ has a checker-specific
acceptance predicate:

$$
\operatorname{ok}_c\left(B, \{E(f) \mid f \in G\}\right)
$$

For SAT, SMT, Alloy, OWL consistency checks, and similar solvers,
$\operatorname{ok}_c$ may be satisfiability of the combined projection. For
model checking it may be property satisfaction over a transition system. For
Datalog or SQL it may be absence of derived violation rows. For proof systems it
may be successful discharge of selected proof obligations under an accepted
fragment or supplied proof.

An inconsistency is the definitive failure of that checker-specific condition:

$$
\neg \operatorname{ok}_c\left(B, \{E(f) \mid f \in G\}\right)
$$

This is always relative to the extracted models, selected bridges, solver
semantics, and finite bounds. The system maintains zero detected
inconsistencies, not zero inconsistencies.

The checker result vocabulary should stay small:

$$
\operatorname{result}(c) \in
\{\textsf{clean},\textsf{inconsistent},\textsf{uncovered}\}
$$

$\textsf{clean}$ means the selected checker completed and found no inconsistency.
$\textsf{inconsistent}$ means the selected checker completed and found a conflict.
$\textsf{uncovered}$ means the checker was not scheduled, timed out, exceeded memory, hit
an unsupported fragment, or required a model outside budget.

$\textsf{uncovered}$ is not evidence of consistency. It is a coverage gap.

Ambiguity is not an inconsistency if at least one admissible interpretation
satisfies all claims. Incompleteness is not an inconsistency if it merely leaves
the solution space underconstrained. A stale claim is not inherently
inconsistent; it becomes inconsistent only when another rule says it must still
track a newer artifact. An unsupported claim is a foundational assumption until
some other source contradicts it or policy forbids unsupported claims of that
class. An authority conflict exists when two sources claim overlapping authority
and impose incompatible constraints, or when the authority policy itself has no
consistent interpretation. An intentional exception is not an inconsistency if
it is represented as a guarded partial function, exception case, or scoped
override.

## Complexity Notation

The catalog uses standard complexity notation:

$$
\mathrm{AC^0} \subseteq \mathrm{NC} \subseteq \mathrm{P}
\subseteq \mathrm{NP} \subseteq \mathrm{PSPACE}
\subseteq \mathrm{EXPTIME}
$$

For fixed rule sets, schemas, or formulas, data complexity asks how runtime
scales with source-derived facts. Combined complexity treats both the data and
the formal specification as input. Model-checking complexity usually treats the
transition system and formula as inputs. Memory complexity is stated
operationally because practical solvers are often limited by retained indexes,
learned clauses, explored states, proof terms, or materialized closures before
they hit a clean theoretical boundary.

## Eventual Checking

This system is too heavy to be a normal CI gate. It is asynchronous and
eventually consistent. It allocates extraction, grounding, slicing, and checker
budgets according to fragment criticality, source type, graph connectivity, past
checker performance, and available compute. It should not pretend to check more
than it can check.

When a checker returns $\textsf{inconsistent}$, an agent proposes a changeset to the
origin system through whatever review interface exists for that source. If the
source lives in Git, that may be a pull request. If the source lives in Figma,
Google Docs, Jira, Confluence, or a policy system, the mechanism is an
agent-authored proposed edit for human review. The repair target is the source
of truth, not the derived model.

Derived bridge mappings can still cause a source revision proposal. A bridge is
not authoritative, but a bridge can expose that two authoritative sources cannot
be jointly interpreted under the current domain vocabulary. In that case the
proposed changeset may say: revise one source, revise the other source, or allow
the bridge to be regenerated from corrected sources.

## Semantic Bridge

The shared bridge is the part that lets heterogeneous formal models talk to each
other without forcing the whole organization into one logic.

Useful bridge ingredients:

- stable entity identifiers for concepts such as users, products, API
  endpoints, roles, permissions, screens, events, alerts, data classes, and
  workflow states
- provenance links from every derived term back to source fragments
- local ontologies per domain rather than one global ontology
- typed relation vocabulary for relations such as `implements`, `mentions`,
  `requires`, `supersedes`, `generates`, `mirrors`, `owns`, `constrains`,
  `exposes`, `stores`, `transmits`, and `renders`
- bridge assertions between local ontologies
- finite representative facts for grounded checking
- checker-specific projections compiled from the bridge

The bridge is partially formalized organizational knowledge. It is not a single
source of truth. It is a continuously revised set of local maps that make
cross-domain checking cheaper than repeatedly rediscovering vocabulary from
scratch.

## Grounding

Quantifiers are where many attractive formalizations become unusable. One
pragmatic response is semi-permanent grounding: maintain finite representative
constants that stand for important classes of cases.

Examples:

```text
AdminUser
AnonymousUser
EUCustomer
ResetToken
PrimaryButton
InvoiceCreatedEvent
PasswordResetEndpoint
BillingRunbook
HighRiskMigration
```

Instead of asking a solver about every possible user, token, workflow, or UI
state, the system checks a selected finite scope. This turns some quantified
questions into finite SAT, SMT, Alloy, Datalog, or model-checking problems.

Grounding trades coverage for decidability and cost control. It can miss
counterexamples outside the chosen representatives. It can also make errors
stable if the representative set is stale. The benefit is that it avoids
quantifier-heavy models when the operational need is to find actionable
inconsistencies under a budget.

In notation, grounding replaces a broad domain $D$ with a selected finite scope:

$$
D_R = \{d_1,\ldots,d_k\} \subset D
$$

The checker then asks a bounded question over $D_R$, not the unbounded question
over every possible object the organization might ever discuss.

## Tier 1: Core Workhorses

### Relational Constraints And SQL

| Aspect | Details |
| --- | --- |
| Models | Finite facts extracted from artifacts: source fragments, entities, links, schemas, owners, generated-from relations, declared dependencies, policy bindings, and version associations. |
| Detects | Missing required rows, duplicate canonical entities, broken references, violated keys, inconsistent source-to-target mappings, invalid generated-artifact relationships, and unsupported authority claims expressible as relational integrity violations. |
| Decision problem | Query answering, constraint violation, view maintenance, and dependency satisfaction over finite relations. |
| Complexity | For fixed first-order relational queries, data complexity is in $\mathrm{AC^0}$. Combined complexity for conjunctive query evaluation is $\mathrm{NP}$-complete. SQL with recursion, aggregation, arithmetic, user functions, or nonstandard semantics depends on the dialect and fragment. Functional dependency implication is polynomial. General embedded dependency implication with tuple-generating and equality-generating dependencies is undecidable. |
| Memory | Base relations plus indexes and materialized views. Worst-case join results can be polynomial of high degree in the input relation sizes and can dominate memory. |
| Incremental | Incremental view maintenance is natural. Small deltas are cheap when joins are selective and indexed. Worst-case delta propagation can be as expensive as recomputing a large view. |
| Use when | The extracted knowledge is tabular, provenance-heavy, and mostly finite. |
| Avoid when | The central problem is recursion, search, temporal behavior, arithmetic theory, or rich ontology reasoning. |
| Repair relevance | Good at producing precise missing-row or bad-row evidence. It rarely chooses the right source-level repair by itself. |

### Database Dependencies, Chase, And Schema Mappings

| Aspect | Details |
| --- | --- |
| Models | Database schemas, source-to-target mappings, ETL contracts, data exchange rules, normalization assumptions, generated warehouse tables, and mirrored third-party records. |
| Detects | Inconsistent mappings, impossible target instances, violated functional dependencies, violated inclusion dependencies, nonterminating or ambiguous data exchange assumptions, and schema evolution claims that cannot preserve required constraints. |
| Decision problem | Dependency implication, chase termination, query answering under constraints, and existence of target instances for source-to-target mappings. |
| Complexity | Functional dependency implication is polynomial. Inclusion dependency implication is $\mathrm{PSPACE}$-complete in general but simpler fragments are tractable. General dependency implication for embedded dependencies is undecidable. Chase termination is undecidable in general. Weak acyclicity and related syntactic restrictions recover termination. Query answering under tuple-generating dependencies ranges from first-order rewritable to EXPTIME or undecidable, depending on the class. |
| Memory | The chase may generate many labeled nulls and intermediate tuples. Memory can grow without bound when termination is not guaranteed. |
| Incremental | Possible for restricted mapping systems, but deletions and schema changes can invalidate large chased regions. |
| Use when | The inconsistency is about data shape, migration semantics, mirrors, analytics definitions, or source-to-target transformation contracts. |
| Avoid when | Mappings require arbitrary computation or unrestricted existential generation. |
| Repair relevance | Useful for pointing at the exact dependency or mapping that makes a source and target jointly impossible. |

### Datalog

| Aspect | Details |
| --- | --- |
| Models | Finite relational knowledge with recursion: dependency closure, ownership closure, reachability, generated-artifact lineage, source authority, policy inheritance, test coverage links, and bridge-derived facts. |
| Detects | Missing expected consequences, forbidden reachable states, contradictory classification, invalid transitive dependencies, cycles, stale generated artifacts, and violations of stratified integrity rules. |
| Decision problem | Query answering and integrity checking over finite extensional facts and recursive rules. |
| Complexity | For fixed Datalog programs, data complexity is $\mathrm{P}$. Combined complexity of Datalog evaluation is $\mathrm{EXPTIME}$-complete. Linear and guarded fragments can be cheaper. Stratified negation preserves a well-defined layer-by-layer semantics but can increase evaluation cost through materialized strata. |
| Memory | Materialized intensional relations. For fixed arity, relation sizes are polynomial in the active domain, but high arity and broad joins create large intermediate relations. |
| Incremental | Semi-naive evaluation avoids repeated derivations in batch mode. Incremental Datalog and differential dataflow can maintain derived facts under insertions and deletions. Small local deltas are often cheap; worst-case changes can still touch a large closure. |
| Use when | The model is finite, relational, recursive, provenance-heavy, and should be maintained continuously. |
| Avoid when | You need arithmetic theories, rich quantifiers, optimization, disjunction over large search spaces, or proof obligations over infinite domains. |
| Repair relevance | Good for locating the derived path from source facts to violation facts. Not good at semantic repair choice unless paired with authority and optimization logic. |

### Incremental Datalog And Incremental View Maintenance

| Aspect | Details |
| --- | --- |
| Models | The maintained substrate for continuously derived organizational knowledge: facts, closures, candidate groups, bridge projections, and cheap violations. |
| Detects | The same classes as Datalog, but as deltas between source snapshots: newly-introduced violations, resolved violations, newly-uncovered regions, and changed model neighborhoods. |
| Decision problem | Maintained query answering under fact insertions and deletions. |
| Complexity | Worst-case complexity is still governed by the underlying Datalog program. Incremental maintenance improves update cost when the affected derivation region is small. For recursive rules, deletions can be expensive because prior derivations may need support counting, rederivation, or differential maintenance. |
| Memory | Higher than batch recomputation because indexes, arrangements, support counts, or materialized relations are retained. |
| Incremental | This is the point of the formalism. It is the natural broad layer for asynchronous checking. |
| Use when | The system needs to keep a large derived knowledge base warm and update it after small source changes. |
| Avoid when | The derived closure is too large, rules generate accidental Cartesian products, or the useful check is really a bounded search problem better sent to SAT, SMT, Alloy, ASP, or a domain solver. |
| Repair relevance | Excellent for saying which violations appeared or disappeared after a proposed source revision. |

### Property Graph Constraints And Graph Queries

| Aspect | Details |
| --- | --- |
| Models | The organizational relation graph: artifacts, fragments, people, ownership, dependencies, generated-from edges, semantic links, cross-references, package boundaries, issue links, and bridge edges. |
| Detects | Broken graph invariants, forbidden cycles, missing paths, unexpected fan-in or fan-out, invalid ownership paths, orphaned concepts, inconsistent dependency directions, and contradictions exposed by graph neighborhoods. |
| Decision problem | Reachability, path queries, pattern matching, graph constraint validation, and subgraph matching. |
| Complexity | Reachability is NL-complete and linear-time in practice on explicit graphs. Fixed graph patterns are usually polynomial in data. General subgraph isomorphism is $\mathrm{NP}$-complete. Conjunctive graph query evaluation has $\mathrm{NP}$-complete combined complexity. Regular path queries are usually tractable for fixed queries; richer path languages can raise complexity. |
| Memory | Adjacency indexes, label indexes, path caches, and sometimes transitive closure. Materialized closure can require O(n^2) space. |
| Incremental | Simple edge and node updates are cheap. Maintaining reachability, shortest paths, or pattern matches under deletions is harder and can be expensive in dense graphs. |
| Use when | The primary structure is connectivity and the checker must select relevant fragments before deeper formal analysis. |
| Avoid when | The conflict depends on numeric constraints, quantifier alternation, program semantics, or temporal behavior. |
| Repair relevance | Good at identifying the neighborhood that should be included in a proposed resolution. Weak at deciding the resolution itself. |

### RDF And RDFS

| Aspect | Details |
| --- | --- |
| Models | Triples, classes, subclass relations, subproperties, domain and range declarations, labels, identifiers, and lightweight semantic vocabulary. |
| Detects | RDFS mostly derives consequences rather than contradictions. With datatype entailment and recognized datatypes, it can expose ill-typed literal cases; more often it exposes mismatches indirectly when downstream constraints expect the entailed type closure. It is better viewed as a bridge normalization layer than a strong inconsistency detector. |
| Decision problem | Entailment and query answering under RDFS semantics. |
| Complexity | RDFS entailment is decidable and polynomial-time in the size of the graph. Fixed SPARQL basic graph patterns have tractable data complexity, while combined complexity of graph pattern evaluation is $\mathrm{NP}$-complete. Full SPARQL features raise complexity depending on operators such as OPTIONAL, UNION, property paths, and negation. |
| Memory | Triple store indexes and optional materialized closure. RDFS saturation can add many inferred triples but is usually manageable for controlled vocabularies. |
| Incremental | Incremental materialization is practical. Deletions require truth maintenance when inferred triples have multiple supports. |
| Use when | The organization needs shared identifiers, taxonomy, and simple semantic normalization across many source types. |
| Avoid when | You need closed-world validation, cardinality constraints, disjointness, rich class expressions, or strong contradiction detection. |
| Repair relevance | Useful for finding vocabulary mismatches and missing bridge declarations. |

### OWL And Description Logics

| Aspect | Details |
| --- | --- |
| Models | Domain ontologies: classes, properties, disjointness, equivalence, restrictions, cardinality, property chains, inverse properties, and individual assertions. |
| Detects | Unsatisfiable classes, inconsistent individuals, impossible classifications, incompatible domain/range assumptions, cardinality contradictions, and bridge assertions that make local domain ontologies jointly impossible. |
| Decision problem | Ontology consistency, class satisfiability, subsumption, instance checking, and query answering. |
| Complexity | OWL 2 EL has polynomial-time classification and core consistency reasoning. OWL 2 QL is designed for first-order rewritable query answering with very low data complexity, often described as $\mathrm{AC^0}$ for data under fixed queries. OWL 2 RL is rule-oriented and supports polynomial materialization. Some query-answering tasks, especially conjunctive query answering, have higher combined complexity than these data-complexity summaries suggest. OWL 2 DL, based on SROIQ, has $\mathrm{N2EXPTIME}$-complete satisfiability and consistency reasoning. OWL Full is undecidable. |
| Memory | Completion rules, tableau structures, dependency sets, or materialized inferences. Expressive OWL DL reasoning can consume large memory due to branching and generated individuals. |
| Incremental | Practical for restricted profiles and materialized triple stores. Harder for expressive DLs where a small axiom change can invalidate a large classification. |
| Use when | The conflict is conceptual: what kind of thing something is, whether categories are disjoint, whether a relationship can hold, or whether local ontologies can be bridged. |
| Avoid when | The problem is closed-world validation, procedural workflow, arithmetic, optimization, or large bounded search. |
| Repair relevance | Reasoners can often return unsatisfiable classes or explanation sets, which are good evidence for source revisions. |

### SHACL And ShEx

| Aspect | Details |
| --- | --- |
| Models | Closed-world graph shapes over RDF-like data: required properties, cardinalities, datatypes, allowed value classes, node shapes, property shapes, and local graph validation rules. |
| Detects | Missing required fields, illegal property combinations, wrong datatypes, cardinality violations, invalid cross-links, and graph records that do not match their declared shape. |
| Decision problem | Shape validation of a data graph against a shape schema. |
| Complexity | For fixed nonrecursive core shapes, data complexity is typically polynomial and often near-linear in practical validators. Full SHACL with recursion, negation, disjunction, SPARQL constraints, or advanced features has fragment-dependent complexity and can reach NP-hard or worse behavior. ShEx validation has tractable fragments, while expressive schemas with recursion and disjunction can raise combined complexity. |
| Memory | Graph indexes, validation state, recursion stacks, and violation reports. |
| Incremental | Natural for localized graph changes if dependency neighborhoods are tracked. Recursive shapes and global constraints weaken locality. |
| Use when | The organization needs closed-world validation of extracted graph records rather than open-world ontology reasoning. |
| Avoid when | The main need is deriving new conceptual facts, solving constraints, or proving temporal behavior. |
| Repair relevance | Excellent at producing source-fragment-level validation errors. |

### SAT

| Aspect | Details |
| --- | --- |
| Models | Finite Boolean claims: feature combinations, policy flags, mutually exclusive choices, build options, compatibility matrices, finite authority choices, and bounded bridge assumptions. |
| Detects | Unsatisfiable Boolean combinations and mutually incompatible extracted claims. |
| Decision problem | Satisfiability or unsatisfiability of a propositional formula. |
| Complexity | SAT is $\mathrm{NP}$-complete. UNSAT is $\mathrm{coNP}$-complete as a decision problem, although modern solvers can emit checkable proof traces. Practical CDCL solvers are often far better than worst-case complexity suggests on structured instances. |
| Memory | Clauses, watched literals, assignments, implication graph, learned clauses, and restart state. Learned clauses can dominate memory. |
| Incremental | Incremental SAT with assumptions is mature. Adding clauses is easy. Removing clauses is usually handled with activation literals or solver rebuilding. |
| Use when | The extracted model is finite and mostly propositional. |
| Avoid when | Arithmetic, arrays, quantifiers, graph reachability, or temporal behavior are central. |
| Repair relevance | UNSAT cores are useful evidence. They identify a conflicting subset of claims, not necessarily the best source to revise. |

### SMT

| Aspect | Details |
| --- | --- |
| Models | Finite formulas over background theories: arithmetic, equality with uninterpreted functions, bit-vectors, arrays, strings, datatypes, records, and combinations of these theories. |
| Detects | Numeric contradictions, impossible schema bounds, incompatible timeout or retention policies, mismatched enum encodings, impossible authorization conditions, invalid generated code contracts, and finite code-level obligations. |
| Decision problem | Satisfiability modulo theories. |
| Complexity | Quantifier-free linear real arithmetic is decidable in polynomial time. Quantifier-free linear integer arithmetic is $\mathrm{NP}$-complete. Quantifier-free bit-vector satisfiability is $\mathrm{NP}$-complete for fixed finite encodings. Pure quantifier-free equality with uninterpreted functions is decidable in polynomial time by congruence closure, while many combined quantifier-free theories are $\mathrm{NP}$-complete or harder depending on the theories. Arrays with extensionality are decidable in common quantifier-free fragments. Nonlinear integer arithmetic is undecidable. Quantifiers over otherwise decidable theories often make automation incomplete or much more expensive. |
| Memory | Theory solver state, SAT abstraction, lemmas, e-graphs, arithmetic tableaux, bit-blasted clauses, and model objects. |
| Incremental | Push/pop and assumption-based incremental solving are mature, but quantified lemmas and theory combinations can reduce predictability. |
| Use when | The model needs theories richer than Boolean structure but can stay mostly quantifier-free or finitely grounded. |
| Avoid when | The natural formulation needs unrestricted quantification, nonlinear integer arithmetic, or very large arrays/strings without tight bounds. |
| Repair relevance | UNSAT cores and models are useful. Optimization requires OMT rather than plain SMT. |

### Alloy And Finite Model Finding

| Aspect | Details |
| --- | --- |
| Models | Bounded relational structures: objects, relations, multiplicities, scopes, ownership, containment, generated-from links, permissions, workflow states, and small structural designs. |
| Detects | No instance within a scope, counterexamples to invariants, impossible cardinality constraints, inconsistent relational designs, and unintended instances that satisfy the stated constraints. |
| Decision problem | Bounded satisfiability and bounded model finding, typically reduced to SAT by Kodkod-style relational encodings. |
| Complexity | Within a finite scope, satisfiability is $\mathrm{NP}$-complete in the size of the bounded relational encoding. Alloy does not decide the unbounded problem unless the user stays in a decidable fragment or supplies a complete finite scope. |
| Memory | Boolean encodings of relations, symmetry-breaking constraints, and SAT solver state. Relation arity and scope size dominate. |
| Incremental | Possible by reusing scopes and solver state, but typical workflows rebuild the bounded instance. |
| Use when | The agent needs a compact structural sanity check over a small, bounded slice of organizational knowledge. |
| Avoid when | The inconsistency depends on unbounded domains, heavy arithmetic, or large production-sized instances. |
| Repair relevance | Counterexamples and UNSAT cores are strong review artifacts. |

### Temporal Logic And Model Checking

| Aspect | Details |
| --- | --- |
| Models | State machines and temporal properties extracted from workflows, release processes, approval policies, product state transitions, lifecycle rules, protocols, and multi-step source-of-truth requirements. |
| Detects | Unreachable required states, forbidden paths, deadlocks, liveness failures, safety violations, inconsistent ordering requirements, and workflows that cannot satisfy all temporal claims. |
| Decision problem | Model checking or satisfiability for temporal formulas over transition systems. |
| Complexity | LTL satisfiability is $\mathrm{PSPACE}$-complete. Explicit-state LTL model checking is linear in the transition system and exponential in the formula through automata construction. CTL model checking is $O((\lvert S\rvert + \lvert R\rvert)\cdot \lvert \varphi\rvert)$, while CTL satisfiability is $\mathrm{EXPTIME}$-complete. CTL* satisfiability is $2\mathrm{EXPTIME}$-complete. The practical limit is usually state explosion. |
| Memory | Explicit state sets, visited-state hashes, product automata, counterexample traces, and sometimes symbolic BDD or SAT/SMT encodings. |
| Incremental | Limited. Small spec changes can require rechecking the product system. Some symbolic and compositional approaches reuse work, but this is not as routine as incremental Datalog or SMT. |
| Use when | The inconsistency is about order, eventuality, reachability, or protocol behavior in authored sources of truth. |
| Avoid when | The model has no meaningful transition structure or the state space cannot be bounded. |
| Repair relevance | Counterexample traces are often the most understandable evidence for humans. |

### TLA+

| Aspect | Details |
| --- | --- |
| Models | State-based specifications of concurrent or distributed workflows, cross-system coordination, release sequencing, migration protocols, locking, approval processes, and consistency maintenance algorithms. |
| Detects | Invariant violations, deadlocks, impossible progress requirements, race conditions, invalid interleavings, and contradictions between safety and liveness assumptions. |
| Decision problem | Finite-state model checking with TLC, symbolic/bounded checking with tools such as Apalache, or proof obligations in the TLA+ proof system. |
| Complexity | The underlying logics are expressive enough that full validity is not a practical decision procedure for arbitrary specs. TLC finite-state checking is bounded by explicit state exploration and is exponential in the number of state variables and their domains in the worst case. Bounded symbolic checking reduces selected obligations to SMT-style problems. |
| Memory | State sets, fingerprints, action exploration queues, counterexample traces, and symbolic encodings. |
| Incremental | Not naturally incremental at large scale. Reuse comes from modular specs, smaller scopes, and stable grounded domains. |
| Use when | Critical cross-artifact behavior is essentially concurrent, temporal, or workflow-like. |
| Avoid when | The problem is static classification, schema conformance, or cheap large-scale fact maintenance. |
| Repair relevance | Strong for explaining protocol-level inconsistency through traces. |

### Type Systems

| Aspect | Details |
| --- | --- |
| Models | Type signatures, API contracts, data models, component interfaces, permission types, effect annotations, nullability, ownership, and domain-specific typed vocabularies extracted from code and specs. |
| Detects | Interface mismatch, illegal composition, invalid data flow between typed domains, contradictory nullability claims, mismatched generated clients, and policy violations expressible as type errors. |
| Decision problem | Type checking or type inference in a selected type system. |
| Complexity | Simply typed lambda calculus type checking is polynomial. Hindley-Milner inference is practically near-linear for ordinary programs, although pathological cases can be exponential. Subtyping, higher-rank polymorphism, type families, dependent types, and effect systems vary widely. General dependent type checking can be undecidable unless the language restricts computation. |
| Memory | Type environments, constraints, unification state, inferred types, and sometimes elaboration artifacts. |
| Incremental | Mature in compilers and language servers. Dependency tracking makes local edits cheap when interface boundaries are stable. |
| Use when | The inconsistency is an interface or classification problem that can be captured by types. |
| Avoid when | The relevant conflict is temporal, numeric, ontological, or policy-driven in a way the type system does not encode. |
| Repair relevance | Type errors are precise but often local symptoms of a broader source-of-truth conflict. |

### Refinement Types

| Aspect | Details |
| --- | --- |
| Models | Types enriched with logical predicates: numeric ranges, nonempty strings, authorization preconditions, data classification labels, array bounds, state indices, and simple API invariants. |
| Detects | Code/spec mismatches where ordinary types are too weak, such as "retentionDays <= 30", "this endpoint requires Admin", or "PII cannot flow into this sink". |
| Decision problem | Type checking with generated verification conditions, usually discharged by SMT or a specialized decidable logic. |
| Complexity | The practical complexity is that of the refinement logic. Quantifier-free linear arithmetic fragments can be decidable and automatable. Rich refinements, higher-order refinements, arbitrary measures, or unrestricted quantifiers can make checking undecidable or dependent on incomplete automation. |
| Memory | Type environments, generated constraints, SMT solver state, and summaries for functions or modules. |
| Incremental | Good when module summaries are stable and verification conditions are local. Poor when refinements propagate through many dependent interfaces. |
| Use when | Critical source claims can be attached to types and checked close to code or API boundaries. |
| Avoid when | The model requires broad graph reasoning, temporal behavior, or open-ended business semantics. |
| Repair relevance | Useful for turning source claims into executable proof obligations. |

### Abstract Interpretation

| Aspect | Details |
| --- | --- |
| Models | Sound approximations of program behavior: possible values, taint, nullness, resource states, control-flow reachability, data classifications, and effects. |
| Detects | Implementation-level contradictions against extracted invariants, such as possible PII flow to a forbidden sink, possible null dereference despite a spec claim, impossible state assumptions, or unreachable code required by a document. |
| Decision problem | Fixpoint computation over an abstract domain. |
| Complexity | For finite-height lattices without widening, fixpoint iteration terminates and is bounded by lattice height times transfer cost over the control-flow graph. Widening ensures convergence for infinite-height domains but loses precision. Relational, path-sensitive, context-sensitive, or heap-sensitive domains can be exponential or worse in practice. |
| Memory | Abstract states per program point, summaries, widening history, and relation domain data structures. |
| Incremental | Possible with dependency tracking and summary reuse. Hard when a change affects global aliasing, call graph structure, or widely used summaries. |
| Use when | The source-of-truth conflict depends on what code may do, not merely what it declares. |
| Avoid when | False positives from overapproximation would overwhelm the source-revision loop. |
| Repair relevance | Good at producing conservative evidence. Often needs another checker or human review to distinguish real inconsistency from abstraction imprecision. |

### Proof Assistants And Critical Cores

| Aspect | Details |
| --- | --- |
| Models | Small critical kernels: access-control semantics, policy calculi, migration invariants, checker correctness, bridge translation soundness, safety-critical state machines, and trusted libraries. |
| Detects | Failure to prove required theorems, inconsistent axioms when paired with model finders, invalid proof obligations, and gaps in machine-checkable arguments. |
| Decision problem | Proof checking is decidable for the trusted kernel of systems such as Lean, Coq, Isabelle/HOL, ACL2, and Agda-like systems. Proof search is generally undecidable or incomplete except for restricted tactics, decision procedures, or automation fragments. |
| Complexity | Proof checking is usually polynomial, often near-linear, in the size of the explicit proof object plus normalization cost. Normalization can be expensive for dependently typed terms. Finding the proof is the hard part and cannot be reduced to one useful complexity class for arbitrary goals. |
| Memory | Proof terms, elaboration state, kernel environments, rewrite databases, automation state, and generated obligations. |
| Incremental | Good at file/module granularity when dependencies are explicit. Expensive when changing a foundational definition invalidates many proofs. |
| Use when | The formal object is small enough and important enough that proof-level assurance is worth the cost. |
| Avoid when | The artifact is broad, informal, rapidly changing, or primarily a candidate for cheap detection rather than durable proof. |
| Repair relevance | Strongest for critical cores. Agents can propose proof repairs, but proof engineering remains the most demanding tier. |

## Tier 2: Specialized But Viable

### CSP

| Aspect | Details |
| --- | --- |
| Models | Finite variables with domains and constraints: configuration spaces, product options, package compatibility, staffing rules, rollout matrices, and design variant combinations. |
| Detects | No assignment satisfies all constraints, or a required option combination is impossible. |
| Decision problem | Constraint satisfaction. |
| Complexity | General finite-domain CSP is $\mathrm{NP}$-complete. Fixed tractable templates, bounded treewidth constraint graphs, and specialized global constraints can be polynomial. |
| Memory | Domains, constraint graphs, propagation queues, nogoods, and search state. |
| Incremental | Constraint solvers can reuse learned nogoods and domains, but source-level deletions often require rebuilding. |
| Use when | The model is naturally finite-domain and not primarily Boolean, temporal, or relational-recursive. |
| Avoid when | The real problem requires theories better handled by SMT or recursion better handled by Datalog. |
| Repair relevance | Can expose minimal conflicting constraint sets; optimization variants help more. |

### MaxSAT And OMT

| Aspect | Details |
| --- | --- |
| Models | Hard constraints plus weighted soft assumptions: authority preferences, repair costs, default source priorities, compatibility preferences, and minimal change objectives. |
| Detects | Whether all hard constraints are satisfiable, and which soft assumptions must be relaxed to restore satisfiability. |
| Decision problem | Optimization over SAT or SMT constraints. |
| Complexity | MaxSAT is NP-hard and contains SAT as a special case. OMT inherits the complexity of the underlying SMT theories plus optimization search. Weighted partial variants can be substantially harder in practice than plain satisfiability. |
| Memory | Underlying SAT/SMT state plus optimization bounds, cores, relaxations, and candidate models. |
| Incremental | Useful with stable hard constraints and changing weights or assumptions, but optimization search may not reuse as cleanly as satisfiability checks. |
| Use when | The checker should not only find a conflict but also rank possible assumption changes. |
| Avoid when | The post-check repair policy is intentionally out of scope or the model is too large for repeated optimization. |
| Repair relevance | High. This is one of the most natural formal tools for repair suggestion, though repair is not the main focus here. |

### QBF

| Aspect | Details |
| --- | --- |
| Models | Finite Boolean claims with quantifier alternation: "for every environment there exists a configuration", "for every user class there exists an approved path", or "there exists a policy such that all selected cases satisfy it". |
| Detects | Conflicts that require alternating choices rather than one flat assignment. |
| Decision problem | Quantified Boolean formula truth. |
| Complexity | QBF is $\mathrm{PSPACE}$-complete. Fixed alternation fragments correspond to levels of the polynomial hierarchy. |
| Memory | Prenex formula encodings, learned clauses/cubes, dependency schemes, and search state. |
| Incremental | Less routine than SAT. Some solvers support assumptions and incremental workflows, but quantifier structure makes reuse harder. |
| Use when | Quantifier alternation is the actual essence of the source claim and the domain can be Boolean-grounded. |
| Avoid when | The alternation can be avoided by grounding, slicing, or using SAT/SMT. |
| Repair relevance | Can produce counter-strategies, which are useful but harder to explain than SAT cores. |

### Answer Set Programming

| Aspect | Details |
| --- | --- |
| Models | Defaults, exceptions, closed-world assumptions, choices, nonmonotonic rules, and finite combinatorial structures. |
| Detects | No stable model exists, multiple incompatible stable models exist under a desired uniqueness rule, or a required conclusion fails under all stable models. |
| Decision problem | Stable model existence, brave reasoning, and cautious reasoning. |
| Complexity | For normal propositional ASP, stable model existence is $\mathrm{NP}$-complete. Brave reasoning is $\mathrm{NP}$-complete and cautious reasoning is $\mathrm{coNP}$-complete. Disjunctive ASP raises complexity to the second level of the polynomial hierarchy: $\Sigma_2^P$ for existence/brave reasoning and $\Pi_2^P$ for cautious reasoning. |
| Memory | Grounded program size often dominates. The grounding phase can blow up before solving begins. |
| Incremental | Incremental ASP exists but is less broadly used than incremental Datalog or SMT. Grounding remains the main scaling risk. |
| Use when | The source model contains defaults and exceptions that are too awkward for monotonic Datalog but still finite. |
| Avoid when | The grounding is large, the intended semantics is open-world, or ordinary Datalog plus explicit exception facts suffices. |
| Repair relevance | Useful for enumerating possible repairs or exception sets, but can overfocus the post on repair rather than detection. |

### Prolog And Logic Programming

| Aspect | Details |
| --- | --- |
| Models | Rules, recursive relations, unification-heavy domain models, executable specifications, and search procedures over symbolic terms. |
| Detects | Failed derivations, contradictory procedural assumptions when encoded explicitly, and impossible symbolic proof searches. |
| Decision problem | Goal satisfaction under the operational semantics of the logic program. |
| Complexity | Full Prolog with function symbols and unrestricted recursion is Turing-complete, so termination is undecidable. Datalog-like finite fragments recover decidable and often polynomial data complexity. |
| Memory | Stacks, choice points, substitutions, tables if tabling is enabled, and potentially unbounded term growth. |
| Incremental | Not the default strength. Tabled logic programming can cache subgoals, but source deltas require careful invalidation. |
| Use when | The model is a compact executable symbolic specification and termination can be controlled. |
| Avoid when | You need predictable large-scale maintenance or strong worst-case guarantees. |
| Repair relevance | Useful for prototyping extractors and domain rules before compiling restricted fragments into Datalog or another substrate. |

### Constraint Handling Rules

| Aspect | Details |
| --- | --- |
| Models | Rule-based constraint simplification and propagation, often embedded in a host logic language. |
| Detects | Inconsistent constraint stores when rules reduce claims to `false` or a failed state. |
| Decision problem | Depends on the CHR program. Termination and confluence are central meta properties. |
| Complexity | General CHR programs are Turing-complete. Restricted terminating and confluent programs can implement decidable constraint theories with the complexity of the encoded solver. |
| Memory | Constraint store, rule indexes, propagation histories, and host-language state. |
| Incremental | Natural at the constraint-store level, but global deletions and nonconfluent programs complicate maintenance. |
| Use when | A domain-specific constraint solver is best expressed as rewrite and propagation rules. |
| Avoid when | The organization needs a stable, easily audited declarative rule surface. |
| Repair relevance | Good for specialized domains, less good as the general organization-wide layer. |

### First-Order Automated Theorem Proving

| Aspect | Details |
| --- | --- |
| Models | First-order axioms over extracted concepts, functions, relations, policies, and bridge assumptions. |
| Detects | Unsatisfiable axiom sets or established entailment failures in a selected decidable fragment, bounded model finder, or countermodel-producing tool. Unfinished proof search in full first-order logic is an `uncovered` result, not a definitive inconsistency. |
| Decision problem | First-order satisfiability and validity. |
| Complexity | Validity in full first-order logic is recursively enumerable but undecidable. If a theorem is valid, a complete prover may eventually find a proof. If it is not valid, the prover may run forever unless a complementary model-finding or decidable-fragment procedure applies. Decidable fragments such as monadic first-order logic, guarded fragments, or finite-variable fragments have their own complexity bounds, often ranging from $\mathrm{NEXPTIME}$ to $2\mathrm{EXPTIME}$. |
| Memory | Clauses, term indexes, unification state, generated lemmas, saturation sets, and proof objects. |
| Incremental | Possible in saturation systems but not as routine or predictable as relational incremental maintenance. |
| Use when | The model naturally needs first-order quantification and the fragment can be kept small or restricted. |
| Avoid when | The same problem can be grounded to SAT/SMT/Alloy or expressed in Datalog. |
| Repair relevance | Proofs and unsatisfiable cores can be excellent, but search unpredictability limits broad use. |

### Finite Automata And Regular Languages

| Aspect | Details |
| --- | --- |
| Models | Allowed strings, path patterns, naming conventions, version formats, event sequences, protocol traces, and simple workflow languages. |
| Detects | Empty language intersections, invalid strings, forbidden sequence patterns, and incompatible regular specifications. |
| Decision problem | Membership, emptiness, inclusion, equivalence, and intersection emptiness for regular languages. |
| Complexity | Membership is linear in input length for deterministic automata. Emptiness is linear in automaton size. DFA equivalence is polynomial. NFA inclusion and equivalence are $\mathrm{PSPACE}$-complete. Regex features outside regular languages, such as backreferences, change the problem. |
| Memory | Automata states and transitions. Determinization can cause exponential blowup. |
| Incremental | Good for small changing pattern sets. Less useful when patterns are regenerated from many sources. |
| Use when | The source-of-truth claim is fundamentally lexical, path-like, or sequence-like without rich state. |
| Avoid when | The needed model is relational, numeric, temporal with branching state, or semantic. |
| Repair relevance | Can identify exact pattern conflicts, such as two naming policies with empty intersection. |

### Promela And SPIN

| Aspect | Details |
| --- | --- |
| Models | Communicating processes, channels, protocol behavior, interleavings, and concurrency-heavy workflow definitions. |
| Detects | Deadlocks, assertion failures, unreachable states, invalid message orderings, and LTL property violations. |
| Decision problem | Explicit-state model checking of Promela models and LTL properties. |
| Complexity | Bounded by state-space exploration; worst-case state explosion is exponential in concurrent process state and data domains. LTL checking adds automata product cost. |
| Memory | Visited-state storage, hash compaction structures, stacks, and counterexample traces. |
| Incremental | Not the primary use case. Model reduction and slicing matter more. |
| Use when | The extracted sources describe communicating workflows or protocols. |
| Avoid when | The system is mostly static facts or conceptual ontology. |
| Repair relevance | Counterexample traces are useful proposed-change evidence. |

### Timed Automata And UPPAAL-Style Checking

| Aspect | Details |
| --- | --- |
| Models | Finite control with clocks: deadlines, timeouts, retry windows, token expiry, approval delays, lease protocols, and time-bound workflows. |
| Detects | Incompatible timing constraints, unreachable deadlines, possible deadline violations, and deadlocks under clock constraints. |
| Decision problem | Reachability and temporal property checking for timed automata. |
| Complexity | Reachability for timed automata is $\mathrm{PSPACE}$-complete. Practical tools use zones and difference-bound matrices to avoid enumerating all clock valuations. |
| Memory | Symbolic zones, DBMs, explored symbolic states, and traces. |
| Incremental | Limited. Small timing changes can alter many zones. |
| Use when | The conflict is inherently about time, not just ordering. |
| Avoid when | Discrete temporal logic or SMT arithmetic over bounded steps suffices. |
| Repair relevance | Good for showing which timing assumptions cannot coexist. |

### Petri Nets

| Aspect | Details |
| --- | --- |
| Models | Distributed workflows, resources, approvals, tokens, queues, production steps, and process constraints. |
| Detects | Deadlocks, unreachable markings, resource conflicts, unbounded growth, and process claims that cannot be jointly realized. |
| Decision problem | Reachability, coverability, boundedness, liveness, and deadlock detection. |
| Complexity | Reachability for general Petri nets is decidable but has extremely high complexity; modern bounds are non-primitive-recursive. Coverability is $\mathrm{EXPSPACE}$-complete. Many practical subclasses are much cheaper. |
| Memory | State-space or symbolic coverability structures. Explicit reachability can explode quickly. |
| Incremental | Not usually the main advantage. Structural analysis and bounded subclasses are more important. |
| Use when | The source model is naturally about resources and concurrent process flow. |
| Avoid when | The same workflow can be captured by simpler finite-state or temporal models. |
| Repair relevance | Good for resource and deadlock explanations in process-heavy domains. |

### Process Calculi And Session Types

| Aspect | Details |
| --- | --- |
| Models | Communication protocols, service interactions, actor systems, API conversation types, and multiparty workflows. |
| Detects | Protocol mismatch, send/receive incompatibility, dead communication paths, linearity violations, and roles that cannot complete the expected conversation. |
| Decision problem | Type checking, compatibility, equivalence, or behavioral conformance depending on the calculus. |
| Complexity | Complexity is fragment-dependent. Many session type systems have decidable and practical type checking. Behavioral equivalence for process calculi can range from polynomial for finite-state bisimulation to undecidable for expressive mobile or higher-order calculi. |
| Memory | Protocol environments, state machines, role projections, and type derivations. |
| Incremental | Good when protocols are modular and local role projections are stable. |
| Use when | The inconsistency is about conversations between components rather than static schemas. |
| Avoid when | The artifact set does not describe communication structure explicitly. |
| Repair relevance | Can pinpoint the role or endpoint whose protocol projection conflicts. |

### Contracts

| Aspect | Details |
| --- | --- |
| Models | Preconditions, postconditions, invariants, interface assertions, source-level spec claims, and generated verification obligations. |
| Detects | Contradictory pre/postconditions, implementations that cannot satisfy their contracts, callers that cannot establish preconditions, and incompatible contract inheritance. |
| Decision problem | Contract consistency, verification condition discharge, or source-level contract validation depending on the tool. |
| Complexity | Contract checking ranges from syntactic interface validation to SMT-backed verification. Static contract verification inherits the complexity of the underlying program logic and theories. |
| Memory | Contract environments, verification conditions, summaries, and solver state. |
| Incremental | Good at module boundaries when contracts and summaries are stable. |
| Use when | Source claims attach naturally to functions, APIs, modules, or components. |
| Avoid when | The conflict is organizational or ontological rather than interface-local. |
| Repair relevance | Contracts provide concrete source-level obligations and failures. |

### Symbolic Execution

| Aspect | Details |
| --- | --- |
| Models | Program paths with symbolic inputs and path constraints. |
| Detects | Feasible paths that violate extracted claims, infeasible documented paths, contradictory branch assumptions, and concrete counterexamples for bounded program behavior. |
| Decision problem | Path feasibility and assertion violation, usually by SMT queries. |
| Complexity | Path explosion is exponential in branching depth. Individual path constraints inherit SMT complexity. Loops and recursion require bounds, summaries, or invariants. |
| Memory | Symbolic states, path constraints, solver queries, generated test cases, and state merges. |
| Incremental | Possible with path and solver-cache reuse, but changes near branching points can invalidate many paths. |
| Use when | The conflict needs concrete bounded execution evidence from code. |
| Avoid when | The code path space is too large or the source claim can be checked statically by cheaper analysis. |
| Repair relevance | Concrete counterexamples are highly reviewable. |

### Separation Logic

| Aspect | Details |
| --- | --- |
| Models | Heap ownership, aliasing, resource separation, permissions, lifetime, and local state mutation. |
| Detects | Memory/resource ownership contradictions, invalid aliasing assumptions, double free or use-after-free style claims, and impossible local heap invariants. |
| Decision problem | Entailment and verification condition checking in a separation logic fragment. |
| Complexity | Symbolic heaps with separating conjunction have $\mathrm{NP}$-complete satisfiability in common fragments. Richer fragments with inductive predicates, arithmetic, or higher-order features can be much harder or undecidable. Practical tools rely on restricted fragments and automation heuristics. |
| Memory | Heap abstractions, symbolic heaps, proof obligations, summaries, and solver state. |
| Incremental | Good for modular verification with stable summaries. Poor when ownership definitions shift globally. |
| Use when | Critical source claims concern resources, ownership, or heap mutation. |
| Avoid when | The artifact set is not about low-level state or resource ownership. |
| Repair relevance | Strong for localized critical implementation claims. |

### Program Model Checking

| Aspect | Details |
| --- | --- |
| Models | Finite abstractions of program control flow and state, often generated from code and checked against temporal or safety properties. |
| Detects | Assertion violations, unreachable required behavior, invalid state transitions, deadlocks, and finite counterexamples to extracted implementation claims. |
| Decision problem | Safety or temporal model checking over a program abstraction. |
| Complexity | Undecidable for arbitrary programs without bounds or abstractions. Bounded model checking reduces to SAT or SMT and inherits those complexities. Abstract model checking depends on abstraction size and refinement loops. |
| Memory | Program abstractions, SAT/SMT encodings, reached states, counterexample traces, and refinement state. |
| Incremental | Possible with summaries and cached abstractions, but not guaranteed. |
| Use when | The source claim must be checked against implementation behavior, not just interfaces. |
| Avoid when | The implementation cannot be bounded or abstracted without too much noise. |
| Repair relevance | Counterexamples can become direct source-revision evidence. |

### OCL

| Aspect | Details |
| --- | --- |
| Models | Object constraints over UML-like models: class invariants, preconditions, postconditions, associations, multiplicities, and derived properties. |
| Detects | Impossible object models, violated multiplicities, inconsistent invariants, and contract contradictions in model-driven artifacts. |
| Decision problem | Constraint satisfaction and validation over object models. |
| Complexity | OCL over finite bounded models can be translated to SAT/SMT or relational encodings and inherits those complexities. Full OCL with unbounded collections, recursion, or rich operations can become undecidable or tool-dependent. |
| Memory | Object model instances, constraint encodings, solver state, and model counterexamples. |
| Incremental | Good when object model deltas are localized and constraints are modular. |
| Use when | The source-of-truth artifacts are UML, domain models, or model-driven architecture documents. |
| Avoid when | The organization does not maintain object models as meaningful sources. |
| Repair relevance | Good for model-level counterexamples and violated invariants. |

### Z

| Aspect | Details |
| --- | --- |
| Models | Set-theoretic state schemas, operations, invariants, and pre/postconditions. |
| Detects | Inconsistent state schemas, operations that cannot preserve invariants, and requirements that have no state satisfying the specified predicates. |
| Decision problem | Type checking, proof obligations, schema consistency, and finite model finding depending on toolchain. |
| Complexity | Full Z uses expressive set theory and first-order logic, so general proof obligations are undecidable. Bounded analysis reduces selected obligations to SAT/SMT-style problems. Type checking is decidable and comparatively cheap. |
| Memory | Schema environments, proof obligations, finite encodings, and solver/prover state. |
| Incremental | Reasonable at schema/module boundaries, weak for broad foundational changes. |
| Use when | The source model is a mathematically structured state specification. |
| Avoid when | The desired result needs fully automatic broad checking over informal artifacts. |
| Repair relevance | Proof failures and finite counterexamples can identify inconsistent specification clauses. |

### B And Event-B

| Aspect | Details |
| --- | --- |
| Models | Abstract machines, state variables, invariants, events, refinement steps, and proof obligations for state-based systems. |
| Detects | Invariant violations, invalid refinement, impossible events, inconsistent guards, and abstract/concrete model mismatch. |
| Decision problem | Proof obligation discharge and model checking over machines/events. |
| Complexity | The proof obligations live in expressive first-order/set-theoretic logics, so full automation is undecidable in general. Bounded model checking and constraint solving recover decidable finite checks. Refinement proof checking is tractable once proofs are supplied, but proof discovery is the hard part. |
| Memory | Machine state, proof obligations, generated lemmas, solver/prover state, and state-space exploration for model checking. |
| Incremental | Good when refinement layers are stable. Foundational invariant changes can invalidate many obligations. |
| Use when | The source of truth is a critical state-machine or refinement-heavy specification. |
| Avoid when | The organization wants lightweight broad inconsistency detection. |
| Repair relevance | Strong for critical formal specs, weaker as a general organizational substrate. |

### Maude And Rewriting Logic

| Aspect | Details |
| --- | --- |
| Models | Equational theories, rewrite rules, operational semantics, protocol states, concurrent systems, and executable specifications. |
| Detects | Reachability contradictions, invariant violations, nonconfluence where confluence is required, and mismatches between rewrite semantics and other source claims. |
| Decision problem | Rewriting, reachability, model checking, confluence checking, and termination analysis depending on the theory. |
| Complexity | General rewriting systems are Turing-complete; reachability and termination are undecidable in general. Many equational and rewrite-theory fragments are decidable or practically analyzable with bounds and tool support. |
| Memory | Term graphs, rewrite states, narrowing trees, search state, and model-checking state. |
| Incremental | Not the default strength. Modular theories can help isolate changes. |
| Use when | The organizational source describes operational semantics or rewrite-like transformations. |
| Avoid when | Simpler finite-state, SMT, or Datalog encodings are adequate. |
| Repair relevance | Useful for executable semantic counterexamples. |

### Deontic And Normative Logic

| Aspect | Details |
| --- | --- |
| Models | Obligations, permissions, prohibitions, exceptions, roles, compliance rules, process duties, and policy precedence. |
| Detects | Norm conflicts such as something being both obligatory and forbidden under the same conditions, impossible compliance obligations, and inconsistent permission structures. |
| Decision problem | Depends on the deontic logic. Many practical encodings are lowered to modal logic, description logic, Datalog, ASP, SAT, or SMT. |
| Complexity | Basic normal modal logics such as K have $\mathrm{PSPACE}$-complete satisfiability. Richer deontic logics with temporal, dynamic, contrary-to-duty, or first-order features vary widely and can become undecidable. Practical systems usually choose a restricted encoding. |
| Memory | Modal frames, rule sets, exception structures, grounding facts, and the target solver state. |
| Incremental | Practical when lowered into Datalog, ASP, or SMT with stable policy modules. |
| Use when | The source conflict is explicitly normative: must, may, must not, unless, and who has authority to permit exceptions. |
| Avoid when | The policy can be represented more simply as ordinary constraints. |
| Repair relevance | Good for explaining authority and compliance conflicts, but only if the chosen normative semantics is accepted by the organization. |

## Tier 3: Mentioned For Completeness

Default and defeasible logics are relevant when the organization has defaults,
exceptions, and priority rules. They can be definitive under a chosen semantics,
but ASP or explicit Datalog-with-exceptions is often the more practical checker
surface.

Paraconsistent logics allow reasoning to continue in the presence of
contradictions. They are useful for localization and triage, but they are not
central when the operational target is to revise sources until there are zero
detected inconsistencies.

Belief revision studies how a knowledge base should change after receiving
conflicting information. It is conceptually relevant to source repair, but this
post is about detection and checking rather than minimal revision theory.

Argumentation frameworks model competing claims and attacks between claims.
They can help explain authority disputes, but they are better treated as a
repair and explanation layer than as the main checker substrate.

Agda, ACL2, Lean, Coq, Isabelle/HOL, and related systems differ in foundations
and automation style. For this map, they occupy the proof-assistant tier:
valuable for small critical cores, too expensive for broad organizational
checking.

## Routing Without A Table

The agent should choose the weakest formalism that expresses the relevant
inconsistency class with acceptable precision.

Use relational constraints when the claim is finite, tabular, and provenance
heavy. Use incremental Datalog when the claim is recursive, graph-shaped, and
needs continuous maintenance. Use RDF/RDFS when the main work is vocabulary
normalization. Use OWL when local ontologies need open-world conceptual
reasoning. Use SHACL or ShEx when extracted graph records need closed-world
shape validation.

Use SAT when the problem is finite and Boolean. Use SMT when the same problem
needs arithmetic, equality, arrays, strings, bit-vectors, or datatypes. Use
Alloy when the issue is a small bounded relational design. Use CSP when finite
domains and constraint propagation are the natural model. Use QBF only when
alternating finite choices are essential.

Use temporal logic, TLA+, SPIN, timed automata, Petri nets, or session types
when the source claim is about behavior across steps. Use ordinary temporal
logic for state-machine properties, TLA+ for critical concurrent workflows,
SPIN for communicating processes, timed automata for clocks, Petri nets for
resource flow, and session types for protocol roles.

Use type systems, refinement types, contracts, abstract interpretation,
symbolic execution, separation logic, or program model checking when the
implementation itself is one of the source projections participating in the
joint check. The choice depends on whether the conflict is about interfaces,
logical refinements, pre/postconditions, possible behavior, concrete bounded
paths, heap/resource ownership, or temporal program behavior.

Use proof assistants only for critical cores whose definitions should become
durable formal assets. Use MaxSAT, OMT, and ASP when the system needs help
ranking repairs or reasoning with defaults and finite exceptions.

If a checker returns $\textsf{uncovered}$, the system can shrink the fragment group,
reduce the finite scope, ground more aggressively, weaken the formalism, split
the check across ontology boundaries, or defer the check. That scheduling
policy is separate from the semantics of the checker result.

## Closing Definition

Let $S$ be a versioned snapshot of organizational sources of truth. Let $R$ be
an active extraction and checking regime. Let $D_R(S)$ be the set of derived
models, bridge assertions, grounded facts, and checker projections selected by
that regime.

$$
D_R(S) =
\text{derived models, bridges, grounded facts, and projections selected by } R
$$

$$
I(S,R) =
\{c \mid c \text{ is a completed checker result over } D_R(S)
\land \operatorname{result}(c)=\textsf{inconsistent}\}
$$

$$
\operatorname{clean}_R(S) \iff I(S,R)=\varnothing
$$

This does not mean the organization is consistent. It means the active regime
has no completed definitive check that currently says otherwise. The engineering
problem is to make $R$ broader, sharper, cheaper, and more stable over time
without pretending that an uncovered region has been proved clean.
