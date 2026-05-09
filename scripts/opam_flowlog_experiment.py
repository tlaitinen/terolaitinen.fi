#!/usr/bin/env python3
"""Run the OPAM conflict experiment through FlowLog.

This is the production-engine version of the benchmark. It compiles the rules
with FlowLog and runs both:

* datalog-batch: full recomputation for every snapshot
* datalog-inc: one long incremental replay with insert/delete deltas

The Python code only extracts OPAM metadata and writes finite EDB facts.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import shutil
import subprocess
import time
from dataclasses import dataclass, field
from pathlib import Path

from opam_datalog_experiment import (
    PackageKey,
    candidates_for,
    changed_opam_paths,
    checkout,
    latest_first_parent_commits,
    parse_snapshot,
    pair_conflicts,
    run_git,
)


FLOWLOG_VERSION = "flowlog-compiler-v0.3.0"
FLOWLOG_DOWNLOAD = (
    "https://github.com/flowlog-rs/flowlog/releases/download/"
    "flowlog-compiler-v0.3.0/"
    "flowlog-compiler-0.3.0-aarch64-apple-darwin.tar.gz"
)


BATCH_PROGRAM = """
.decl DepClause(pid: int32, cid: int32)
.input DepClause(IO="file", filename="DepClause.csv", delimiter=",")

.decl Candidate(pid: int32, cid: int32, qid: int32)
.input Candidate(IO="file", filename="Candidate.csv", delimiter=",")

.decl Conflict(pid: int32, qid: int32)
.input Conflict(IO="file", filename="Conflict.csv", delimiter=",")

.decl SatisfiedClause(pid: int32, cid: int32)
SatisfiedClause(pid, cid) :- DepClause(pid, cid), Candidate(pid, cid, _).

.decl MissingDependency(pid: int32, cid: int32)
MissingDependency(pid, cid) :- DepClause(pid, cid), !SatisfiedClause(pid, cid).

.decl NonConflictingClause(pid: int32, cid: int32)
NonConflictingClause(pid, cid) :-
  Candidate(pid, cid, qid),
  !Conflict(pid, qid),
  !Conflict(qid, pid).

.decl SelfBlockedDependency(pid: int32, cid: int32)
SelfBlockedDependency(pid, cid) :-
  DepClause(pid, cid),
  Candidate(pid, cid, _),
  !NonConflictingClause(pid, cid).

.decl Violation(kind: int32, pid: int32, cid: int32)
Violation(1, pid, cid) :- MissingDependency(pid, cid).
Violation(2, pid, cid) :- SelfBlockedDependency(pid, cid).
.output Violation
""".strip()


INC_PROGRAM = BATCH_PROGRAM.replace(
    '.input DepClause(IO="file", filename="DepClause.csv", delimiter=",")',
    '.input DepClause(IO="command", delimiter=",")',
).replace(
    '.input Candidate(IO="file", filename="Candidate.csv", delimiter=",")',
    '.input Candidate(IO="command", delimiter=",")',
).replace(
    '.input Conflict(IO="file", filename="Conflict.csv", delimiter=",")',
    '.input Conflict(IO="command", delimiter=",")',
)


@dataclass
class IdMaps:
    pkg_to_id: dict[PackageKey, int] = field(default_factory=dict)
    id_to_pkg: dict[int, PackageKey] = field(default_factory=dict)
    clause_to_id: dict[tuple[str, str, int, str, str], int] = field(default_factory=dict)
    id_to_clause: dict[int, tuple[str, str, int, str, str]] = field(default_factory=dict)

    def pkg_id(self, key: PackageKey) -> int:
        existing = self.pkg_to_id.get(key)
        if existing is not None:
            return existing
        value = len(self.pkg_to_id) + 1
        self.pkg_to_id[key] = value
        self.id_to_pkg[value] = key
        return value

    def clause_id(self, pkg: PackageKey, index: int, dep_name: str, constraint: str) -> int:
        key = (pkg.name, pkg.version, index, dep_name, constraint)
        existing = self.clause_to_id.get(key)
        if existing is not None:
            return existing
        value = len(self.clause_to_id) + 1
        self.clause_to_id[key] = value
        self.id_to_clause[value] = key
        return value


@dataclass(frozen=True)
class FactSets:
    dep_clause: frozenset[tuple[int, int]]
    candidate: frozenset[tuple[int, int, int]]
    conflict: frozenset[tuple[int, int]]

    @property
    def count(self) -> int:
        return len(self.dep_clause) + len(self.candidate) + len(self.conflict)


def relation_rows(facts: FactSets, relation: str):
    if relation == "DepClause":
        return facts.dep_clause
    if relation == "Candidate":
        return facts.candidate
    if relation == "Conflict":
        return facts.conflict
    raise ValueError(relation)


def build_fact_sets(snapshot, ids: IdMaps) -> FactSets:
    dep_clause: set[tuple[int, int]] = set()
    candidate: set[tuple[int, int, int]] = set()
    conflict: set[tuple[int, int]] = set()

    for key in sorted(snapshot.packages, key=lambda item: (item.name, item.version)):
        ids.pkg_id(key)

    for key in sorted(snapshot.packages, key=lambda item: (item.name, item.version)):
        package = snapshot.packages[key]
        pid = ids.pkg_id(key)
        for index, ref in enumerate(package.depends):
            cid = ids.clause_id(key, index, ref.name, ref.constraint)
            dep_clause.add((pid, cid))
            for candidate_key in candidates_for(snapshot, ref):
                qid = ids.pkg_id(candidate_key)
                candidate.add((pid, cid, qid))
                if pair_conflicts(snapshot, key, candidate_key):
                    conflict.add((pid, qid))
                    conflict.add((qid, pid))
        for ref in package.conflicts:
            for target in candidates_for(snapshot, ref):
                conflict.add((pid, ids.pkg_id(target)))

    return FactSets(
        dep_clause=frozenset(dep_clause),
        candidate=frozenset(candidate),
        conflict=frozenset(conflict),
    )


def write_relation(path: Path, rows) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, lineterminator="\n")
        writer.writerows(sorted(rows))


def write_fact_dir(path: Path, facts: FactSets) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True)
    write_relation(path / "DepClause.csv", facts.dep_clause)
    write_relation(path / "Candidate.csv", facts.candidate)
    write_relation(path / "Conflict.csv", facts.conflict)


def write_delta_files(base: Path, index: int, previous: FactSets, current: FactSets) -> list[str]:
    commands: list[str] = ["begin"]
    for relation, command_name in [
        ("DepClause", "depclause"),
        ("Candidate", "candidate"),
        ("Conflict", "conflict"),
    ]:
        old_rows = relation_rows(previous, relation)
        new_rows = relation_rows(current, relation)
        added = new_rows - old_rows
        removed = old_rows - new_rows
        if added:
            rel_path = base / f"{index:03d}_{relation}_add.csv"
            write_relation(rel_path, added)
            commands.append(f"file {command_name} {rel_path.as_posix()} +1")
        if removed:
            rel_path = base / f"{index:03d}_{relation}_del.csv"
            write_relation(rel_path, removed)
            commands.append(f"file {command_name} {rel_path.as_posix()} -1")
    commands.append("commit")
    return commands


def ensure_flowlog_compiler(path: Path | None, tools_dir: Path) -> Path:
    if path and path.exists():
        return path.resolve()
    compiler = tools_dir / "flowlog-compiler-0.3.0-aarch64-apple-darwin" / "flowlog-compiler"
    if compiler.exists():
        return compiler
    tools_dir.mkdir(parents=True, exist_ok=True)
    archive = tools_dir / "flowlog.tar.gz"
    subprocess.check_call(["curl", "-L", "-o", str(archive), FLOWLOG_DOWNLOAD])
    subprocess.check_call(["tar", "-xzf", str(archive), "-C", str(tools_dir)])
    return compiler


def run_with_time(command: list[str], cwd: Path, stdin_path: Path | None = None) -> tuple[float, float, str, str]:
    stdin = stdin_path.open("rb") if stdin_path else None
    start = time.perf_counter()
    try:
        proc = subprocess.run(
            ["/usr/bin/time", "-l", *command],
            cwd=cwd,
            stdin=stdin,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=False,
            check=False,
        )
    finally:
        if stdin:
            stdin.close()
    elapsed_ms = (time.perf_counter() - start) * 1000
    stdout = proc.stdout.decode("utf-8", errors="replace")
    stderr = proc.stderr.decode("utf-8", errors="replace")
    if proc.returncode != 0:
        raise RuntimeError(
            f"command failed ({proc.returncode}): {' '.join(command)}\nSTDOUT:\n{stdout}\nSTDERR:\n{stderr}"
        )
    max_rss_mb = parse_time_max_rss(stderr)
    return elapsed_ms, max_rss_mb, stdout, stderr


def parse_time_max_rss(stderr: str) -> float:
    match = re.search(r"(\d+)\s+maximum resident set size", stderr)
    if not match:
        return 0.0
    value = int(match.group(1))
    if value > 10_000_000:
        return value / (1024 * 1024)
    return value / 1024


def parse_flowlog_commit_times(text: str) -> list[float]:
    values: list[float] = []
    for line in text.splitlines():
        if "Committed & executed" not in line:
            continue
        token = line.split(":", 1)[0].strip()
        values.append(duration_to_ms(token))
    return values


def duration_to_ms(value: str) -> float:
    value = value.strip()
    if value.endswith("\u00b5s") or value.endswith("us"):
        return float(value[:-2]) / 1000.0
    if value.endswith("ms"):
        return float(value[:-2])
    if value.endswith("s"):
        return float(value[:-1]) * 1000.0
    return float(value)


def parse_violation_file(path: Path) -> set[tuple[int, int, int]]:
    if not path.exists():
        return set()
    rows: set[tuple[int, int, int]] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        parts = line.split(",")
        rows.add((int(parts[0]), int(parts[1]), int(parts[2])))
    return rows


def parse_violation_delta(path: Path) -> tuple[set[tuple[int, int, int]], set[tuple[int, int, int]]]:
    added: set[tuple[int, int, int]] = set()
    removed: set[tuple[int, int, int]] = set()
    if not path.exists():
        return added, removed
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        parts = line.split(",")
        fact = (int(parts[0]), int(parts[1]), int(parts[2]))
        diff = int(parts[3])
        if diff > 0:
            added.add(fact)
        elif diff < 0:
            removed.add(fact)
    return added, removed


def percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, round((len(ordered) - 1) * p)))
    return ordered[index]


def compile_flowlog(compiler: Path, program: Path, mode: str, binary: Path, output_dir: Path, fact_dir: Path | None) -> None:
    command = [
        str(compiler),
        str(program),
        "--mode",
        mode,
        "-o",
        str(binary),
        "-D",
        str(output_dir),
        "--sip",
    ]
    if fact_dir is not None:
        command.extend(["-F", str(fact_dir)])
    subprocess.check_call(command)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", required=True, type=Path)
    parser.add_argument("--commits", type=int, default=30)
    parser.add_argument("--end-ref", default="HEAD")
    parser.add_argument("--output-dir", type=Path, default=Path("experiments/opam-flowlog"))
    parser.add_argument("--flowlog-compiler", type=Path)
    parser.add_argument("--workers", type=int, default=1)
    parser.add_argument("--skip-compile", action="store_true")
    args = parser.parse_args()

    repo = args.repo.resolve()
    output_dir = args.output_dir.resolve()
    tools_dir = output_dir / "tools"
    compiler = ensure_flowlog_compiler(args.flowlog_compiler, tools_dir)

    programs_dir = output_dir / "programs"
    data_dir = output_dir / "data"
    delta_dir = data_dir / "deltas"
    batch_data_dir = data_dir / "batch-current"
    current_link = data_dir / "current"
    batch_output_dir = output_dir / "flowlog-output" / "batch"
    inc_output_dir = output_dir / "flowlog-output" / "inc"
    bin_dir = output_dir / "bin"
    for directory in [programs_dir, data_dir, delta_dir, batch_output_dir, inc_output_dir, bin_dir]:
        directory.mkdir(parents=True, exist_ok=True)

    batch_program = programs_dir / "opam_batch.dl"
    inc_program = programs_dir / "opam_inc.dl"
    batch_program.write_text(BATCH_PROGRAM + "\n", encoding="utf-8")
    inc_program.write_text(INC_PROGRAM + "\n", encoding="utf-8")

    if current_link.exists() or current_link.is_symlink():
        current_link.unlink()
    current_link.symlink_to(batch_data_dir)

    batch_bin = bin_dir / "opam_batch"
    inc_bin = bin_dir / "opam_inc"
    if not args.skip_compile:
        compile_flowlog(compiler, batch_program, "datalog-batch", batch_bin, batch_output_dir, current_link)
        compile_flowlog(compiler, inc_program, "datalog-inc", inc_bin, inc_output_dir, None)

    commits = latest_first_parent_commits(repo, args.commits) if args.end_ref == "HEAD" else [
        line.strip()
        for line in run_git(repo, "rev-list", "--first-parent", "--max-count", str(args.commits), args.end_ref).splitlines()
        if line.strip()
    ][::-1]
    ids = IdMaps()
    previous_facts: FactSets | None = None
    batch_violations_by_index: list[set[tuple[int, int, int]]] = []
    rows: list[dict] = []
    commands: list[str] = []
    commit_meta: list[dict] = []

    if delta_dir.exists():
        shutil.rmtree(delta_dir)
    delta_dir.mkdir(parents=True)

    for index, commit in enumerate(commits):
        checkout(repo, commit)
        changed_paths = changed_opam_paths(repo, commits[index - 1], commit) if index else []
        parse_start = time.perf_counter()
        snapshot = parse_snapshot(repo)
        facts = build_fact_sets(snapshot, ids)
        fact_generation_ms = (time.perf_counter() - parse_start) * 1000
        write_fact_dir(batch_data_dir, facts)
        if index == 0:
            initial_dir = data_dir / "initial"
            write_fact_dir(initial_dir, facts)
            commands.extend(
                [
                    "begin",
                    f"file depclause {(initial_dir / 'DepClause.csv').as_posix()} +1",
                    f"file candidate {(initial_dir / 'Candidate.csv').as_posix()} +1",
                    f"file conflict {(initial_dir / 'Conflict.csv').as_posix()} +1",
                    "commit",
                ]
            )
            input_delta_abs = facts.count
        else:
            assert previous_facts is not None
            delta_commands = write_delta_files(delta_dir, index, previous_facts, facts)
            commands.extend(delta_commands)
            input_delta_abs = (
                len(facts.dep_clause.symmetric_difference(previous_facts.dep_clause))
                + len(facts.candidate.symmetric_difference(previous_facts.candidate))
                + len(facts.conflict.symmetric_difference(previous_facts.conflict))
            )
        commands.append("")

        if batch_output_dir.exists():
            shutil.rmtree(batch_output_dir)
        batch_output_dir.mkdir(parents=True)
        batch_ms, batch_rss_mb, _stdout, _stderr = run_with_time(
            [str(batch_bin), "-w", str(args.workers)],
            cwd=output_dir,
        )
        batch_violations = parse_violation_file(batch_output_dir / "violation")
        batch_violations_by_index.append(batch_violations)
        row = {
            "index": index,
            "commit": commit[:12],
            "changed_opam_files": len(changed_paths),
            "package_versions": len(snapshot.packages),
            "package_names": len(snapshot.versions_by_name),
            "dep_clause_facts": len(facts.dep_clause),
            "candidate_facts": len(facts.candidate),
            "conflict_facts": len(facts.conflict),
            "input_facts": facts.count,
            "input_delta_abs": input_delta_abs,
            "violations": len(batch_violations),
            "batch_ms": round(batch_ms, 3),
            "batch_max_rss_mb": round(batch_rss_mb, 3),
            "fact_generation_ms": round(fact_generation_ms, 3),
        }
        rows.append(row)
        commit_meta.append(
            {
                "commit": commit,
                "short": commit[:12],
                "changed_opam_paths": changed_paths,
            }
        )
        previous_facts = facts
        print(
            f"{index + 1:>2}/{len(commits)} {commit[:12]} "
            f"facts={facts.count:>8} violations={len(batch_violations):>4} "
            f"batch={batch_ms:>8.1f}ms",
            flush=True,
        )

    commands.append("quit")
    commands_path = data_dir / "commands.txt"
    commands_path.write_text("\n".join(commands) + "\n", encoding="utf-8")

    if inc_output_dir.exists():
        shutil.rmtree(inc_output_dir)
    inc_output_dir.mkdir(parents=True)
    inc_total_ms, inc_rss_mb, inc_stdout, inc_stderr = run_with_time(
        [str(inc_bin), "-w", str(args.workers)],
        cwd=output_dir,
        stdin_path=commands_path,
    )
    commit_times = parse_flowlog_commit_times(inc_stdout + "\n" + inc_stderr)
    if len(commit_times) != len(commits):
        raise AssertionError(f"expected {len(commits)} FlowLog commit timings, got {len(commit_times)}")

    current_violations: set[tuple[int, int, int]] = set()
    for index, row in enumerate(rows):
        added, removed = parse_violation_delta(inc_output_dir / f"violation_t{index + 1}")
        current_violations.difference_update(removed)
        current_violations.update(added)
        expected = batch_violations_by_index[index]
        if current_violations != expected:
            raise AssertionError(
                f"FlowLog incremental mismatch at {row['commit']}: "
                f"missing={len(expected - current_violations)} extra={len(current_violations - expected)}"
            )
        row["incremental_commit_ms"] = round(commit_times[index], 3)
        row["violation_delta_abs"] = len(added) + len(removed)

    update_rows = rows[1:]
    summary = {
        "engine": "FlowLog",
        "flowlog_version": FLOWLOG_VERSION,
        "workers": args.workers,
        "commits": len(rows),
        "updates": len(update_rows),
        "first_commit": commits[0],
        "last_commit": commits[-1],
        "batch_ms_p50": percentile([row["batch_ms"] for row in rows], 0.50),
        "batch_ms_p90": percentile([row["batch_ms"] for row in rows], 0.90),
        "incremental_commit_ms_p50": percentile([row["incremental_commit_ms"] for row in update_rows], 0.50),
        "incremental_commit_ms_p90": percentile([row["incremental_commit_ms"] for row in update_rows], 0.90),
        "incremental_commit_ms_max": max(row["incremental_commit_ms"] for row in update_rows),
        "speedup_p50": percentile(
            [
                row["batch_ms"] / row["incremental_commit_ms"]
                for row in update_rows
                if row["incremental_commit_ms"] > 0
            ],
            0.50,
        ),
        "speedup_p90": percentile(
            [
                row["batch_ms"] / row["incremental_commit_ms"]
                for row in update_rows
                if row["incremental_commit_ms"] > 0
            ],
            0.90,
        ),
        "input_delta_abs_p50": percentile([row["input_delta_abs"] for row in update_rows], 0.50),
        "input_delta_abs_p90": percentile([row["input_delta_abs"] for row in update_rows], 0.90),
        "input_delta_abs_max": max(row["input_delta_abs"] for row in update_rows),
        "incremental_total_wall_ms": round(inc_total_ms, 3),
        "incremental_max_rss_mb": round(inc_rss_mb, 3),
        "batch_max_rss_mb_max": max(row["batch_max_rss_mb"] for row in rows),
        "validation": "Each incremental Violation snapshot matched FlowLog batch output for the same commit.",
        "model_notes": (
            "Single abstract environment; available/depext filters are not evaluated; "
            "version formulas are approximated by quoted version atoms; "
            "OPAM solver installability is not modeled."
        ),
    }

    with (output_dir / "opam-flowlog-results.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    (output_dir / "opam-flowlog-results.json").write_text(
        json.dumps(
            {
                "summary": summary,
                "commits": commit_meta,
                "rows": rows,
                "programs": {
                    "batch": BATCH_PROGRAM,
                    "incremental": INC_PROGRAM,
                },
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    (output_dir / "pkg-id-map.json").write_text(
        json.dumps({str(pid): key.label for pid, key in ids.id_to_pkg.items()}, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(summary, indent=2), flush=True)


if __name__ == "__main__":
    main()
