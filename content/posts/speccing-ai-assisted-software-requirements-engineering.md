---
title: "Speccing AI-assisted Software Requirements Engineering"
slug: "speccing-ai-assisted-software-requirements-engineering"
date: "2025-03-13"
---

Answering questions on how a product with many software components should work can be challenging. The software may have been written by countless developers over a long period of time, and many may no longer be available for consultation. In principle, maintaining a formal and complete specification separate from the implementation would help in understanding the product’s intended behavior. In practice, such rigor requires an engineering budget and expertise that may be available only when developing safety- or security-critical systems. Additionally, studying a formal specification for a complex system to verify if the implementation conforms to it or to propose a modification can be time-consuming and error-prone.

For less critical systems, partially specified and incremental specifications that remain unmaintained may currently be a cost-effective way to develop software in large organizations. Regression test suites, both manual and automated, serve as the de facto specification for correct behavior.

Used judiciously, large language models could play a part in accelerating product development velocity while keeping unwanted undefined behavior at bay. This article briefly covers some situations where product development might benefit from a lightweight AI-assisted requirements engineering process and speculates on how some aspects of the tooling could be implemented.

## Accumulative and Partial Requirements Engineering in a Growing Organization

At some point in an organization’s growth, the complexity of a software-based product exceeds the capacity of a single individual to understand how it all works. Maintaining accessible documentation with an increasing level of abstraction may help postpone the moment, but it inevitably must happen at some point. Knowledge becomes distributed, and problem-solving requires effective collaboration between experts.

As the number of employees grows, team and group boundaries emerge. It becomes increasingly challenging not only to understand what the organization has built so far but also what it is in the process of building and what it is planning to create. Teams may plan features that can partially clash or at least combine in a way that results in a weird user experience. Even a single team roadmap may overwhelm its members' mental faculties, leaving none to consider other teams’ ambitions.

When a new project starts, a number of documents of various types may chart the landscape ahead. These are typically points in time, meaning that there is no commitment to revisit and revise them according to the latest developments. They remain as signposts, helping align the relevant stakeholders just enough so that the team can build the right deliverables.

Requirements may change even before the software is launched and almost surely after. The development process may continue, fueled by additional documents that track modifications in requirements.

Until recently, maintaining an up-to-date and complete specification of an application has been prohibitively expensive for organizations developing non-critical software. Large language models may unlock the development of a tool that changes the situation.

## Detecting and Merging Conflicts in Specifications

Writing a coherent document that specifies an aspect of a software system’s functionality is a doable task. With every document, keeping the whole consistent gets harder until the latest document specifies something that conflicts with a previously written text. At this point, it could be helpful to have an automated system that points out how the requirements being added are not compatible with the existing ones.

Moreover, such a system could analyze the relevant pieces of documentation and suggest a way to reconcile the conflict. Either the original document or the new document must be updated, or they get merged into a new document. The revised documents could be versioned and automatically cross-referenced, resulting in an evolving directed graph of documents with a subset encoding the unambiguous and conflict-free specification for the software.

## Querying a Requirement Document Graph

An evolving set of requirement documents can be thought of as a directed graph where each edge is associated with one of the following concepts:

-   merges into,
-   splits into, and
-   is superseded by.

Nodes without outgoing edges constitute the active specification. No specification is completely unambiguous in the sense that there would be exactly one correct implementation, but it can be self-consistent, encoding a meaningful equivalence class of correct implementations.

Oftentimes, stakeholders are unsure or unaligned about the correct behavior of a product. In such cases, a self-consistent set of documents can lend itself to bringing certainty and agreement about an implementation’s correctness. However, contrasting an implementation’s observable behavior against a set of documents can be a laborious and error-prone task. It would thus be feasible only with a suitable system capable of answering questions like:

-   When X happens, the implementation does Y. Is this correct?
-   Why does the implementation do Y when X happens?
-   What should the implementation do when X happens?
-   When did behavior X change and why?

In an optimal situation, the system would quickly give a minimal reply, linking to the relevant source document as references or stating that the requirements do not specify anything about the query.

## Large Language Model as Conflict Detection and Merging Tool

In the general case, detecting if a set of requirement documents is consistent is likely intractable. For example, we could require that a system must implement two differently specified Turing machines. In that case, the requirements are consistent only if the Turing machines are equivalent, and Turing machine equivalence is undecidable.

We must thus settle for approximate and eventual consistency with any algorithm attempting to decide whether an evolving set of documents is self-consistent. A large language model can give an answer to whether two (or more) documents are consistent as long as they fit in the model’s context window, and the error rate may be acceptable for practical purposes. Document authors can also use simple and unambiguous statements to improve conflict detection accuracy.

When the algorithm supposedly detects a conflict, irrespective of whether it is a false positive or not, it must be reconciled. The system may suggest a way to resolve the conflicts by merging the conflicting documents or by altering one of them. If a document exceeds some complexity metric, the system may suggest to split it. At this point, a human author should tweak the suggestion as needed and confirm the modification.

A naive all-pairs testing algorithm can detect a subset of all pairwise conflicts, but conflicts requiring more than two documents would need a more elaborate approach, either by testing sets of documents or by deriving summaries of original documents and then testing the summaries for conflicts. Combining two documents into a summary is a lossy process, so the error rate for conflict detection may grow. However, it is not straightforward to decide which two documents to combine. A set of requirements documents has an exponential number of subsets. One way would be to iteratively build a tree of summary documents, increasing the number of documents by a logarithmic factor, but the highest-level summaries may no longer function for conflict detection.

The system could attempt to translate human-readable specifications into formal notation and use theorem provers or satisfiability checkers as an additional conflict detection capability.

## Connecting Specification with Implementation

With an assumably consistent set of documents, the system may correlate a specification with its corresponding implementation’s source code and other assets. Even bidirectional linking can be helpful for various stakeholders working on the specification or the implementation. If the system’s capabilities permit, it can also try to detect inconsistencies between the specification and the implementation. Ultimately, the system may be able to produce an implementation from scratch or synthesize changes to an existing implementation.

## Conclusions

Much effort goes into understanding how a software system works, whether it works correctly, or why it works the way it does. Impressive progress in large language models and their multimodal cousins hints that rigorous requirements engineering may become feasible even in the context of developing non-critical software products.

Soon, a modern expert system, capable of understanding both the requirements of a product and its corresponding implementation, may be available to help designers, product managers, and engineers develop applications that behave as intended. The development process may be streamlined as the expert system captures and propagates tacit knowledge among a large group of stakeholders.

Given the breakneck speed of progress in artificial intelligence, this writing may not age well regarding the uninformed speculation on how an AI-assisted lightweight requirements-engineering tool could be implemented. However, the direction feels clear, and there may be low-hanging fruit for hungry start-ups to collect in this problem space.