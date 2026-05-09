#!/usr/bin/env python3
"""Measure batch vs package-granular incremental checks on opam-repository.

The rule evaluator is intentionally small and dependency-free. It implements a
restricted Datalog-shaped model directly in Python so the benchmark can run on a
machine without OPAM, Souffle, or an incremental Datalog engine installed.
"""

from __future__ import annotations

import argparse
import csv
import gc
import json
import os
import re
import resource
import subprocess
import time
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Iterable


DATALOG_PROGRAM = r"""
active(E, P, V).
dep_clause(P, V, C).
dep_alt(C, DepName, ConstraintId).
candidate(E, C, Q, QV).
conflicts(E, P, V, Q, QV).

satisfied_clause(E, P, V, C) :-
  active(E, P, V),
  dep_clause(P, V, C),
  candidate(E, C, Q, QV).

missing_dependency(E, P, V, C) :-
  active(E, P, V),
  dep_clause(P, V, C),
  not satisfied_clause(E, P, V, C).

non_conflicting_candidate(E, P, V, C, Q, QV) :-
  candidate(E, C, Q, QV),
  not conflicts(E, P, V, Q, QV),
  not conflicts(E, Q, QV, P, V).

self_blocked_dependency(E, P, V, C) :-
  dep_clause(P, V, C),
  candidate(E, C, Q, QV),
  not non_conflicting_candidate(E, P, V, C, Q, QV).

violation(E, P, V, "missing_dependency", C) :-
  missing_dependency(E, P, V, C).

violation(E, P, V, "self_blocked_dependency", C) :-
  self_blocked_dependency(E, P, V, C).
"""


@dataclass(frozen=True)
class PackageKey:
    name: str
    version: str

    @property
    def label(self) -> str:
        return f"{self.name}.{self.version}"


@dataclass(frozen=True)
class PackageRef:
    name: str
    constraint: str = ""


@dataclass
class Package:
    key: PackageKey
    path: str
    depends: tuple[PackageRef, ...] = ()
    conflicts: tuple[PackageRef, ...] = ()
    conflict_classes: tuple[str, ...] = ()


@dataclass
class DerivedForPackage:
    dep_clauses: int = 0
    candidates: int = 0
    conflicts: int = 0
    satisfied_clauses: int = 0
    non_conflicting_candidates: int = 0
    violations: frozenset[tuple[str, str, str, str]] = field(default_factory=frozenset)


@dataclass
class Snapshot:
    packages: dict[PackageKey, Package]
    versions_by_name: dict[str, tuple[str, ...]]
    depends_by_target: dict[str, set[PackageKey]]
    conflicts_by_target: dict[str, set[PackageKey]]
    by_path: dict[str, PackageKey]
    candidate_cache: dict[tuple[str, str], tuple[PackageKey, ...]] = field(default_factory=dict)


@dataclass
class IncrementalState:
    packages: dict[PackageKey, Package]
    versions_by_name: dict[str, set[str]]
    depends_by_target: dict[str, set[PackageKey]]
    conflicts_by_target: dict[str, set[PackageKey]]
    by_path: dict[str, PackageKey]
    derived_by_package: dict[PackageKey, DerivedForPackage]
    totals: Counter
    violations: set[tuple[str, str, str, str]]
    candidate_cache: dict[tuple[str, str], tuple[PackageKey, ...]] = field(default_factory=dict)


FIELD_RE_TEMPLATE = r"(?m)^{field}\s*:"
VERSION_ATOM_RE = re.compile(r'(<=|>=|!=|=|<|>)\s*"([^"]+)"')
VERSION_TOKEN_RE = re.compile(r"\d+|[A-Za-z]+|~|\+|\.|-")


def run_git(repo: Path, *args: str) -> str:
    return subprocess.check_output(["git", "-C", str(repo), *args], text=True)


def checkout(repo: Path, commit: str) -> None:
    subprocess.check_call(
        ["git", "-C", str(repo), "checkout", "--quiet", commit],
        stdout=subprocess.DEVNULL,
    )


def latest_first_parent_commits(repo: Path, count: int) -> list[str]:
    out = run_git(repo, "rev-list", "--first-parent", "--max-count", str(count), "HEAD")
    commits = [line.strip() for line in out.splitlines() if line.strip()]
    commits.reverse()
    return commits


def changed_opam_paths(repo: Path, old: str, new: str) -> list[str]:
    out = run_git(repo, "diff", "--name-only", old, new, "--", "packages")
    return [
        line.strip()
        for line in out.splitlines()
        if line.strip().endswith("/opam") and line.strip().startswith("packages/")
    ]


def infer_key(path: str) -> PackageKey | None:
    parts = path.split("/")
    if len(parts) != 4 or parts[0] != "packages" or parts[3] != "opam":
        return None
    name = parts[1]
    dirname = parts[2]
    prefix = f"{name}."
    if dirname.startswith(prefix):
        version = dirname[len(prefix) :]
    else:
        pieces = dirname.split(".", 1)
        version = pieces[1] if len(pieces) == 2 else dirname
    return PackageKey(name=name, version=version)


def strip_comments(text: str) -> str:
    lines: list[str] = []
    for line in text.splitlines():
        in_string = False
        escaped = False
        output: list[str] = []
        i = 0
        while i < len(line):
            ch = line[i]
            if ch == '"' and not escaped:
                in_string = not in_string
            if ch == "#" and not in_string:
                break
            output.append(ch)
            escaped = ch == "\\" and not escaped
            if ch != "\\":
                escaped = False
            i += 1
        lines.append("".join(output))
    return "\n".join(lines)


def extract_balanced(text: str, start: int, open_ch: str, close_ch: str) -> tuple[str, int]:
    assert text[start] == open_ch
    depth = 0
    in_string = False
    escaped = False
    i = start
    while i < len(text):
        ch = text[i]
        if ch == '"' and not escaped:
            in_string = not in_string
        elif not in_string:
            if ch == open_ch:
                depth += 1
            elif ch == close_ch:
                depth -= 1
                if depth == 0:
                    return text[start + 1 : i], i + 1
        escaped = ch == "\\" and not escaped
        if ch != "\\":
            escaped = False
        i += 1
    return text[start + 1 :], len(text)


def extract_field_value(text: str, field: str) -> str:
    match = re.search(FIELD_RE_TEMPLATE.format(field=re.escape(field)), text)
    if not match:
        return ""
    i = match.end()
    while i < len(text) and text[i].isspace():
        i += 1
    if i >= len(text):
        return ""
    if text[i] == "[":
        inner, _ = extract_balanced(text, i, "[", "]")
        return f"[{inner}]"
    if text[i] == '"':
        value, end = read_quoted(text, i)
        return f'"{value}"'
    line_end = text.find("\n", i)
    if line_end == -1:
        line_end = len(text)
    return text[i:line_end].strip()


def read_quoted(text: str, start: int) -> tuple[str, int]:
    assert text[start] == '"'
    escaped = False
    output: list[str] = []
    i = start + 1
    while i < len(text):
        ch = text[i]
        if ch == '"' and not escaped:
            return "".join(output), i + 1
        if ch == "\\" and not escaped:
            escaped = True
        else:
            output.append(ch)
            escaped = False
        i += 1
    return "".join(output), len(text)


def parse_package_refs(field_value: str) -> tuple[PackageRef, ...]:
    if not field_value:
        return ()
    content = field_value.strip()
    if content.startswith("[") and content.endswith("]"):
        content = content[1:-1]
    refs: list[PackageRef] = []
    i = 0
    while i < len(content):
        ch = content[i]
        if ch.isspace() or ch in "[]":
            i += 1
            continue
        if ch != '"':
            i += 1
            continue
        name, i = read_quoted(content, i)
        while i < len(content) and content[i].isspace():
            i += 1
        constraint = ""
        if i < len(content) and content[i] == "{":
            constraint, i = extract_balanced(content, i, "{", "}")
        if name and not looks_like_version_literal(name):
            refs.append(PackageRef(name=name, constraint=constraint.strip()))
    return tuple(refs)


def parse_conflict_classes(field_value: str) -> tuple[str, ...]:
    if not field_value:
        return ()
    classes: list[str] = []
    i = 0
    while i < len(field_value):
        if field_value[i] != '"':
            i += 1
            continue
        value, i = read_quoted(field_value, i)
        if value:
            classes.append(value)
    return tuple(classes)


def looks_like_version_literal(value: str) -> bool:
    if not value:
        return False
    return bool(re.match(r"^v?\d+([.~+\-]\w+)*$", value))


def parse_opam_file(repo: Path, path: str) -> Package | None:
    key = infer_key(path)
    if key is None:
        return None
    file_path = repo / path
    if not file_path.exists():
        return None
    try:
        text = file_path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None
    text = strip_comments(text)
    depends = parse_package_refs(extract_field_value(text, "depends"))
    conflicts = parse_package_refs(extract_field_value(text, "conflicts"))
    conflict_classes = parse_conflict_classes(extract_field_value(text, "conflict-class"))
    return Package(
        key=key,
        path=path,
        depends=depends,
        conflicts=conflicts,
        conflict_classes=conflict_classes,
    )


def parse_snapshot(repo: Path) -> Snapshot:
    packages: dict[PackageKey, Package] = {}
    by_path: dict[str, PackageKey] = {}
    for file_path in (repo / "packages").glob("*/*/opam"):
        rel = file_path.relative_to(repo).as_posix()
        package = parse_opam_file(repo, rel)
        if package is None:
            continue
        packages[package.key] = package
        by_path[rel] = package.key
    return build_snapshot(packages, by_path)


def build_snapshot(packages: dict[PackageKey, Package], by_path: dict[str, PackageKey]) -> Snapshot:
    versions_by_name: dict[str, set[str]] = defaultdict(set)
    depends_by_target: dict[str, set[PackageKey]] = defaultdict(set)
    conflicts_by_target: dict[str, set[PackageKey]] = defaultdict(set)
    for key, package in packages.items():
        versions_by_name[key.name].add(key.version)
        for ref in package.depends:
            depends_by_target[ref.name].add(key)
        for ref in package.conflicts:
            conflicts_by_target[ref.name].add(key)
    return Snapshot(
        packages=packages,
        versions_by_name={name: tuple(versions) for name, versions in versions_by_name.items()},
        depends_by_target={name: set(keys) for name, keys in depends_by_target.items()},
        conflicts_by_target={name: set(keys) for name, keys in conflicts_by_target.items()},
        by_path=by_path,
    )


@lru_cache(maxsize=200_000)
def compare_versions(a: str, b: str) -> int:
    a_parts = tokenize_version(a)
    b_parts = tokenize_version(b)
    for left, right in zip(a_parts, b_parts, strict=False):
        if left == right:
            continue
        if isinstance(left, int) and isinstance(right, int):
            return -1 if left < right else 1
        if isinstance(left, int):
            return 1
        if isinstance(right, int):
            return -1
        return -1 if str(left) < str(right) else 1
    if len(a_parts) == len(b_parts):
        return 0
    return -1 if len(a_parts) < len(b_parts) else 1


@lru_cache(maxsize=200_000)
def tokenize_version(version: str) -> tuple[int | str, ...]:
    value = version[1:] if version.startswith("v") and len(version) > 1 and version[1].isdigit() else version
    tokens: list[int | str] = []
    for token in re.findall(r"\d+|[A-Za-z]+|[^A-Za-z\d]", value):
        if token.isdigit():
            tokens.append(int(token))
        else:
            tokens.append(token)
    return tuple(tokens)


@lru_cache(maxsize=1_000_000)
def satisfies(version: str, constraint: str) -> bool:
    if not constraint:
        return True
    disjuncts = split_top_level(constraint, "|")
    if not disjuncts:
        disjuncts = [constraint]
    for disjunct in disjuncts:
        atoms = VERSION_ATOM_RE.findall(disjunct)
        if not atoms:
            return True
        if all(compare_atom(version, op, target) for op, target in atoms):
            return True
    return False


def split_top_level(text: str, separator: str) -> list[str]:
    parts: list[str] = []
    depth = 0
    in_string = False
    escaped = False
    start = 0
    for i, ch in enumerate(text):
        if ch == '"' and not escaped:
            in_string = not in_string
        elif not in_string:
            if ch in "({[":
                depth += 1
            elif ch in ")}]" and depth > 0:
                depth -= 1
            elif ch == separator and depth == 0:
                parts.append(text[start:i].strip())
                start = i + 1
        escaped = ch == "\\" and not escaped
        if ch != "\\":
            escaped = False
    parts.append(text[start:].strip())
    return [part for part in parts if part]


def compare_atom(version: str, op: str, target: str) -> bool:
    cmp = compare_versions(version, target)
    if op == "=":
        return cmp == 0
    if op == "!=":
        return cmp != 0
    if op == "<":
        return cmp < 0
    if op == "<=":
        return cmp <= 0
    if op == ">":
        return cmp > 0
    if op == ">=":
        return cmp >= 0
    return True


def candidates_for(snapshot: Snapshot | IncrementalState, ref: PackageRef) -> tuple[PackageKey, ...]:
    cache_key = (ref.name, ref.constraint)
    cached = snapshot.candidate_cache.get(cache_key)
    if cached is not None:
        return cached
    versions = snapshot.versions_by_name.get(ref.name, ())
    if isinstance(versions, set):
        version_iter: Iterable[str] = versions
    else:
        version_iter = versions
    result = tuple(
        PackageKey(ref.name, version)
        for version in version_iter
        if PackageKey(ref.name, version) in snapshot.packages and satisfies(version, ref.constraint)
    )
    snapshot.candidate_cache[cache_key] = result
    return result


def declared_conflicts(package: Package, target: PackageKey) -> bool:
    for ref in package.conflicts:
        if ref.name == target.name and satisfies(target.version, ref.constraint):
            return True
    return False


def pair_conflicts(snapshot: Snapshot | IncrementalState, left: PackageKey, right: PackageKey) -> bool:
    left_package = snapshot.packages.get(left)
    right_package = snapshot.packages.get(right)
    if left_package and declared_conflicts(left_package, right):
        return True
    if right_package and declared_conflicts(right_package, left):
        return True
    if left_package and right_package:
        left_classes = set(left_package.conflict_classes)
        if left_classes and left_classes.intersection(right_package.conflict_classes):
            return True
    return False


def derive_for_package(snapshot: Snapshot | IncrementalState, key: PackageKey) -> DerivedForPackage:
    package = snapshot.packages.get(key)
    if package is None:
        return DerivedForPackage()
    dep_clauses = len(package.depends)
    conflict_count = 0
    for ref in package.conflicts:
        conflict_count += len(candidates_for(snapshot, ref))
    candidates = 0
    satisfied = 0
    non_conflicting = 0
    violations: set[tuple[str, str, str, str]] = set()
    for index, ref in enumerate(package.depends):
        clause_id = f"{key.label}:dep:{index}:{ref.name}"
        clause_candidates = candidates_for(snapshot, ref)
        candidates += len(clause_candidates)
        if not clause_candidates:
            violations.add((key.name, key.version, "missing_dependency", clause_id))
            continue
        satisfied += 1
        ok = 0
        for candidate in clause_candidates:
            if not pair_conflicts(snapshot, key, candidate):
                ok += 1
        non_conflicting += ok
        if ok == 0:
            violations.add((key.name, key.version, "self_blocked_dependency", clause_id))
    return DerivedForPackage(
        dep_clauses=dep_clauses,
        candidates=candidates,
        conflicts=conflict_count,
        satisfied_clauses=satisfied,
        non_conflicting_candidates=non_conflicting,
        violations=frozenset(violations),
    )


def sum_derived(derived_by_package: dict[PackageKey, DerivedForPackage]) -> tuple[Counter, set[tuple[str, str, str, str]]]:
    totals = Counter()
    violations: set[tuple[str, str, str, str]] = set()
    for derived in derived_by_package.values():
        totals["dep_clauses"] += derived.dep_clauses
        totals["candidates"] += derived.candidates
        totals["conflicts"] += derived.conflicts
        totals["satisfied_clauses"] += derived.satisfied_clauses
        totals["non_conflicting_candidates"] += derived.non_conflicting_candidates
        totals["violations"] += len(derived.violations)
        violations.update(derived.violations)
    return totals, violations


def batch_evaluate(snapshot: Snapshot) -> tuple[dict[PackageKey, DerivedForPackage], Counter, set[tuple[str, str, str, str]]]:
    derived = {key: derive_for_package(snapshot, key) for key in snapshot.packages}
    totals, violations = sum_derived(derived)
    totals["packages"] = len(snapshot.packages)
    totals["package_names"] = len(snapshot.versions_by_name)
    totals["input_facts"] = (
        len(snapshot.packages)
        + totals["dep_clauses"]
        + sum(len(package.conflicts) for package in snapshot.packages.values())
        + sum(len(package.conflict_classes) for package in snapshot.packages.values())
    )
    totals["derived_facts"] = (
        totals["candidates"]
        + totals["conflicts"]
        + totals["satisfied_clauses"]
        + totals["non_conflicting_candidates"]
        + totals["violations"]
    )
    return derived, totals, violations


def make_incremental_state(snapshot: Snapshot, derived: dict[PackageKey, DerivedForPackage]) -> IncrementalState:
    totals, violations = sum_derived(derived)
    totals["packages"] = len(snapshot.packages)
    totals["package_names"] = len(snapshot.versions_by_name)
    totals["input_facts"] = (
        len(snapshot.packages)
        + totals["dep_clauses"]
        + sum(len(package.conflicts) for package in snapshot.packages.values())
        + sum(len(package.conflict_classes) for package in snapshot.packages.values())
    )
    totals["derived_facts"] = (
        totals["candidates"]
        + totals["conflicts"]
        + totals["satisfied_clauses"]
        + totals["non_conflicting_candidates"]
        + totals["violations"]
    )
    return IncrementalState(
        packages=dict(snapshot.packages),
        versions_by_name={name: set(versions) for name, versions in snapshot.versions_by_name.items()},
        depends_by_target={name: set(keys) for name, keys in snapshot.depends_by_target.items()},
        conflicts_by_target={name: set(keys) for name, keys in snapshot.conflicts_by_target.items()},
        by_path=dict(snapshot.by_path),
        derived_by_package=dict(derived),
        totals=totals,
        violations=violations,
        candidate_cache={},
    )


def remove_indexes(state: IncrementalState, package: Package) -> None:
    state.versions_by_name.get(package.key.name, set()).discard(package.key.version)
    if package.key.name in state.versions_by_name and not state.versions_by_name[package.key.name]:
        del state.versions_by_name[package.key.name]
    for ref in package.depends:
        keys = state.depends_by_target.get(ref.name)
        if keys is not None:
            keys.discard(package.key)
            if not keys:
                del state.depends_by_target[ref.name]
    for ref in package.conflicts:
        keys = state.conflicts_by_target.get(ref.name)
        if keys is not None:
            keys.discard(package.key)
            if not keys:
                del state.conflicts_by_target[ref.name]


def add_indexes(state: IncrementalState, package: Package) -> None:
    state.versions_by_name.setdefault(package.key.name, set()).add(package.key.version)
    for ref in package.depends:
        state.depends_by_target.setdefault(ref.name, set()).add(package.key)
    for ref in package.conflicts:
        state.conflicts_by_target.setdefault(ref.name, set()).add(package.key)


def apply_delta(state: IncrementalState, repo: Path, paths: list[str]) -> tuple[set[PackageKey], int, int]:
    state.candidate_cache.clear()
    affected: set[PackageKey] = set()
    input_removed = 0
    input_added = 0
    changed_names: set[str] = set()
    touched_keys: set[PackageKey] = set()
    for path in paths:
        old_key = state.by_path.get(path)
        if old_key is not None:
            touched_keys.add(old_key)
            changed_names.add(old_key.name)
            old_package = state.packages.pop(old_key, None)
            if old_package is not None:
                input_removed += 1 + len(old_package.depends) + len(old_package.conflicts) + len(old_package.conflict_classes)
                remove_indexes(state, old_package)
            state.by_path.pop(path, None)
        new_package = parse_opam_file(repo, path)
        if new_package is not None:
            touched_keys.add(new_package.key)
            changed_names.add(new_package.key.name)
            state.packages[new_package.key] = new_package
            state.by_path[path] = new_package.key
            input_added += 1 + len(new_package.depends) + len(new_package.conflicts) + len(new_package.conflict_classes)
            add_indexes(state, new_package)
    affected.update(touched_keys)
    for name in changed_names:
        affected.update(state.depends_by_target.get(name, set()))
        affected.update(state.conflicts_by_target.get(name, set()))
    for key in list(touched_keys):
        old_derived = state.derived_by_package.pop(key, None)
        if old_derived is not None:
            state.violations.difference_update(old_derived.violations)
    for key in affected:
        old = state.derived_by_package.pop(key, None)
        if old is not None:
            state.violations.difference_update(old.violations)
        if key in state.packages:
            new = derive_for_package(state, key)
            state.derived_by_package[key] = new
            state.violations.update(new.violations)
    state.totals, state.violations = sum_derived(state.derived_by_package)
    state.totals["packages"] = len(state.packages)
    state.totals["package_names"] = len(state.versions_by_name)
    state.totals["input_facts"] = (
        len(state.packages)
        + state.totals["dep_clauses"]
        + sum(len(package.conflicts) for package in state.packages.values())
        + sum(len(package.conflict_classes) for package in state.packages.values())
    )
    state.totals["derived_facts"] = (
        state.totals["candidates"]
        + state.totals["conflicts"]
        + state.totals["satisfied_clauses"]
        + state.totals["non_conflicting_candidates"]
        + state.totals["violations"]
    )
    return affected, input_added, input_removed


def memory_snapshot() -> dict[str, float]:
    rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    if os.uname().sysname == "Darwin":
        rss_mb = rss / (1024 * 1024)
    else:
        rss_mb = rss / 1024
    current_rss_mb = rss_mb
    try:
        ps_out = subprocess.check_output(
            ["ps", "-o", "rss=", "-p", str(os.getpid())],
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
        if ps_out:
            current_rss_mb = int(ps_out) / 1024
    except (OSError, subprocess.SubprocessError, ValueError):
        pass
    return {
        "current_rss_mb": current_rss_mb,
        "process_peak_rss_mb": rss_mb,
    }


def timed(fn):
    start = time.perf_counter()
    result = fn()
    elapsed_ms = (time.perf_counter() - start) * 1000
    return result, elapsed_ms


def summarize_rows(rows: list[dict]) -> dict[str, float]:
    def percentile(values: list[float], p: float) -> float:
        if not values:
            return 0.0
        ordered = sorted(values)
        index = min(len(ordered) - 1, max(0, round((len(ordered) - 1) * p)))
        return ordered[index]

    updates = [row["incremental_ms"] for row in rows[1:]]
    full = [row["full_ms"] for row in rows]
    speedups = [row["full_ms"] / row["incremental_ms"] for row in rows[1:] if row["incremental_ms"] > 0]
    derived_amp = [
        row["derived_delta_abs"] / row["input_delta_abs"]
        for row in rows[1:]
        if row["input_delta_abs"] > 0
    ]
    return {
        "commits": len(rows),
        "updates": max(0, len(rows) - 1),
        "full_ms_p50": percentile(full, 0.50),
        "full_ms_p90": percentile(full, 0.90),
        "incremental_ms_p50": percentile(updates, 0.50),
        "incremental_ms_p90": percentile(updates, 0.90),
        "incremental_ms_max": max(updates) if updates else 0.0,
        "speedup_p50": percentile(speedups, 0.50),
        "speedup_p90": percentile(speedups, 0.90),
        "derived_amplification_p50": percentile(derived_amp, 0.50),
        "derived_amplification_p90": percentile(derived_amp, 0.90),
        "derived_amplification_max": max(derived_amp) if derived_amp else 0.0,
    }


def write_outputs(output_dir: Path, rows: list[dict], summary: dict, commit_meta: list[dict]) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    csv_path = output_dir / "opam-datalog-results.csv"
    json_path = output_dir / "opam-datalog-results.json"
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    json_path.write_text(
        json.dumps(
            {
                "summary": summary,
                "commits": commit_meta,
                "rows": rows,
                "datalog_program": DATALOG_PROGRAM.strip(),
            },
            indent=2,
        ),
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", required=True, type=Path)
    parser.add_argument("--commits", type=int, default=30)
    parser.add_argument("--output-dir", type=Path, default=Path("experiments/opam-datalog"))
    args = parser.parse_args()

    repo = args.repo.resolve()
    commits = latest_first_parent_commits(repo, args.commits)
    if len(commits) < 2:
        raise SystemExit("Need at least two commits")

    rows: list[dict] = []
    commit_meta: list[dict] = []

    previous_totals: Counter | None = None
    previous_violations: set[tuple[str, str, str, str]] = set()
    incremental_state: IncrementalState | None = None

    for index, commit in enumerate(commits):
        checkout(repo, commit)
        changed_paths: list[str] = []
        if index > 0:
            changed_paths = changed_opam_paths(repo, commits[index - 1], commit)

        (snapshot, parse_ms) = timed(lambda: parse_snapshot(repo))
        ((derived, full_totals, full_violations), eval_ms) = timed(lambda: batch_evaluate(snapshot))
        full_ms = parse_ms + eval_ms

        if index == 0:
            incremental_ms = full_ms
            incremental_state = make_incremental_state(snapshot, derived)
            affected_count = len(snapshot.packages)
            input_added = full_totals["input_facts"]
            input_removed = 0
        else:
            assert incremental_state is not None
            ((affected, input_added, input_removed), incremental_ms) = timed(
                lambda: apply_delta(incremental_state, repo, changed_paths)
            )
            affected_count = len(affected)
            if incremental_state.violations != full_violations:
                missing = full_violations - incremental_state.violations
                extra = incremental_state.violations - full_violations
                raise AssertionError(
                    f"Incremental mismatch at {commit[:12]}: "
                    f"missing={len(missing)} extra={len(extra)}"
                )

        violation_delta_abs = 0
        derived_delta_abs = 0
        input_delta_abs = input_added + input_removed
        if previous_totals is not None:
            derived_delta_abs = abs(full_totals["derived_facts"] - previous_totals["derived_facts"])
            violation_delta_abs = len(full_violations.symmetric_difference(previous_violations))

        mem = memory_snapshot()
        row = {
            "index": index,
            "commit": commit[:12],
            "changed_opam_files": len(changed_paths),
            "affected_packages": affected_count,
            "packages": full_totals["packages"],
            "package_names": full_totals["package_names"],
            "input_facts": full_totals["input_facts"],
            "input_delta_abs": input_delta_abs,
            "derived_facts": full_totals["derived_facts"],
            "derived_delta_abs": derived_delta_abs,
            "violations": full_totals["violations"],
            "violation_delta_abs": violation_delta_abs,
            "full_ms": round(full_ms, 3),
            "full_parse_ms": round(parse_ms, 3),
            "full_eval_ms": round(eval_ms, 3),
            "incremental_ms": round(incremental_ms, 3),
            "current_rss_mb": round(mem["current_rss_mb"], 3),
            "process_peak_rss_mb": round(mem["process_peak_rss_mb"], 3),
        }
        rows.append(row)
        commit_meta.append(
            {
                "commit": commit,
                "short": commit[:12],
                "changed_opam_paths": changed_paths,
            }
        )
        previous_totals = full_totals
        previous_violations = full_violations
        gc.collect()
        print(
            f"{index + 1:>2}/{len(commits)} {commit[:12]} "
            f"changed={len(changed_paths):>3} affected={affected_count:>5} "
            f"full={full_ms:>8.1f}ms inc={incremental_ms:>8.1f}ms "
            f"violations={full_totals['violations']}",
            flush=True,
        )

    summary = summarize_rows(rows)
    summary.update(memory_snapshot())
    summary["repo"] = str(repo)
    summary["first_commit"] = commits[0]
    summary["last_commit"] = commits[-1]
    summary["model_notes"] = (
        "Single environment; available/depext filters are not evaluated; "
        "version formulas are approximated by quoted version atoms; "
        "OPAM solver installability is not modeled."
    )
    write_outputs(args.output_dir, rows, summary, commit_meta)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
