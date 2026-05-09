#!/usr/bin/env python3
"""Render static SVG charts for the OPAM FlowLog experiment."""

from __future__ import annotations

import argparse
import csv
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Series:
    name: str
    values: list[float]
    color: str
    stroke_width: float = 2.0


def read_rows(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def nice_max(value: float) -> float:
    if value <= 0:
        return 1
    magnitude = 10 ** (len(str(int(value))) - 1)
    for multiplier in [1, 2, 5, 10]:
        candidate = multiplier * magnitude
        if candidate >= value:
            return candidate
    return 10 * magnitude


def polyline(points: list[tuple[float, float]]) -> str:
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in points)


def render_line_chart(
    path: Path,
    title: str,
    subtitle: str,
    x_labels: list[str],
    series: list[Series],
    y_label: str,
    y_max: float | None = None,
    width: int = 1100,
    height: int = 560,
) -> None:
    margin_left = 74
    margin_right = 34
    margin_top = 94
    margin_bottom = 76
    plot_w = width - margin_left - margin_right
    plot_h = height - margin_top - margin_bottom
    max_value = y_max if y_max is not None else nice_max(max(max(s.values) for s in series))
    min_x = 0
    max_x = max(1, len(x_labels) - 1)

    def sx(i: int) -> float:
        return margin_left + plot_w * ((i - min_x) / max_x)

    def sy(value: float) -> float:
        return margin_top + plot_h - plot_h * (value / max_value)

    grid = []
    for i in range(6):
        value = max_value * i / 5
        y = sy(value)
        grid.append(
            f'<line x1="{margin_left}" y1="{y:.1f}" x2="{width - margin_right}" y2="{y:.1f}" class="grid" />'
        )
        grid.append(f'<text x="{margin_left - 12}" y="{y + 4:.1f}" text-anchor="end" class="tick">{value:g}</text>')

    x_ticks = []
    tick_indexes = sorted(set([0, len(x_labels) - 1, *range(4, len(x_labels), 5)]))
    for i in tick_indexes:
        x = sx(i)
        x_ticks.append(f'<line x1="{x:.1f}" y1="{margin_top + plot_h}" x2="{x:.1f}" y2="{margin_top + plot_h + 6}" class="axis" />')
        x_ticks.append(
            f'<text x="{x:.1f}" y="{margin_top + plot_h + 24}" text-anchor="middle" class="tick">{i}</text>'
        )

    lines = []
    dots = []
    for s in series:
        pts = [(sx(i), sy(v)) for i, v in enumerate(s.values)]
        lines.append(
            f'<polyline points="{polyline(pts)}" fill="none" stroke="{s.color}" stroke-width="{s.stroke_width}" stroke-linejoin="round" stroke-linecap="round" />'
        )
        for x, y in pts:
            dots.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="2.3" fill="{s.color}" />')

    legend = []
    legend_x = margin_left
    legend_y = 58
    for s in series:
        legend.append(f'<line x1="{legend_x}" y1="{legend_y}" x2="{legend_x + 24}" y2="{legend_y}" stroke="{s.color}" stroke-width="3" />')
        legend.append(f'<text x="{legend_x + 32}" y="{legend_y + 4}" class="legend">{s.name}</text>')
        legend_x += 250

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">
  <title id="title">{escape(title)}</title>
  <desc id="desc">{escape(subtitle)}</desc>
  <style>
    .bg {{ fill: #fbfaf8; }}
    .title {{ font: 700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #1f2933; }}
    .subtitle {{ font: 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #52616b; }}
    .axis {{ stroke: #7b8794; stroke-width: 1; }}
    .grid {{ stroke: #d9e2ec; stroke-width: 1; }}
    .tick {{ font: 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #52616b; }}
    .label {{ font: 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #334e68; }}
    .legend {{ font: 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #334e68; }}
  </style>
  <rect class="bg" width="{width}" height="{height}" rx="0" />
  <text x="{margin_left}" y="31" class="title">{escape(title)}</text>
  <text x="{margin_left}" y="50" class="subtitle">{escape(subtitle)}</text>
  {''.join(legend)}
  {''.join(grid)}
  <line x1="{margin_left}" y1="{margin_top}" x2="{margin_left}" y2="{margin_top + plot_h}" class="axis" />
  <line x1="{margin_left}" y1="{margin_top + plot_h}" x2="{width - margin_right}" y2="{margin_top + plot_h}" class="axis" />
  {''.join(x_ticks)}
  {''.join(lines)}
  {''.join(dots)}
  <text x="{width / 2:.1f}" y="{height - 22}" text-anchor="middle" class="label">commit index in replay window</text>
  <text transform="translate(22,{margin_top + plot_h / 2:.1f}) rotate(-90)" text-anchor="middle" class="label">{escape(y_label)}</text>
</svg>
"""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(svg, encoding="utf-8")


def render_bar_chart(
    path: Path,
    title: str,
    subtitle: str,
    labels: list[str],
    values: list[float],
    color: str,
    y_label: str,
    width: int = 1100,
    height: int = 520,
) -> None:
    margin_left = 74
    margin_right = 34
    margin_top = 82
    margin_bottom = 76
    plot_w = width - margin_left - margin_right
    plot_h = height - margin_top - margin_bottom
    max_value = nice_max(max(values))
    bar_gap = 3
    bar_w = (plot_w - bar_gap * (len(values) - 1)) / len(values)

    def sy(value: float) -> float:
        return margin_top + plot_h - plot_h * (value / max_value)

    grid = []
    for i in range(6):
        value = max_value * i / 5
        y = sy(value)
        grid.append(f'<line x1="{margin_left}" y1="{y:.1f}" x2="{width - margin_right}" y2="{y:.1f}" class="grid" />')
        grid.append(f'<text x="{margin_left - 12}" y="{y + 4:.1f}" text-anchor="end" class="tick">{value:g}</text>')

    bars = []
    for i, value in enumerate(values):
        x = margin_left + i * (bar_w + bar_gap)
        y = sy(value)
        bars.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{bar_w:.1f}" height="{margin_top + plot_h - y:.1f}" fill="{color}" />')

    x_ticks = []
    tick_indexes = sorted(set([0, len(labels) - 1, *range(4, len(labels), 5)]))
    for i in tick_indexes:
        x = margin_left + i * (bar_w + bar_gap) + bar_w / 2
        x_ticks.append(f'<text x="{x:.1f}" y="{margin_top + plot_h + 24}" text-anchor="middle" class="tick">{i}</text>')

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">
  <title id="title">{escape(title)}</title>
  <desc id="desc">{escape(subtitle)}</desc>
  <style>
    .bg {{ fill: #fbfaf8; }}
    .title {{ font: 700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #1f2933; }}
    .subtitle {{ font: 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #52616b; }}
    .axis {{ stroke: #7b8794; stroke-width: 1; }}
    .grid {{ stroke: #d9e2ec; stroke-width: 1; }}
    .tick {{ font: 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #52616b; }}
    .label {{ font: 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #334e68; }}
  </style>
  <rect class="bg" width="{width}" height="{height}" />
  <text x="{margin_left}" y="31" class="title">{escape(title)}</text>
  <text x="{margin_left}" y="50" class="subtitle">{escape(subtitle)}</text>
  {''.join(grid)}
  <line x1="{margin_left}" y1="{margin_top}" x2="{margin_left}" y2="{margin_top + plot_h}" class="axis" />
  <line x1="{margin_left}" y1="{margin_top + plot_h}" x2="{width - margin_right}" y2="{margin_top + plot_h}" class="axis" />
  {''.join(bars)}
  {''.join(x_ticks)}
  <text x="{width / 2:.1f}" y="{height - 22}" text-anchor="middle" class="label">commit index in replay window</text>
  <text transform="translate(22,{margin_top + plot_h / 2:.1f}) rotate(-90)" text-anchor="middle" class="label">{escape(y_label)}</text>
</svg>
"""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(svg, encoding="utf-8")


def escape(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", type=Path, default=Path("experiments/opam-flowlog/opam-flowlog-results.csv"))
    parser.add_argument("--output-dir", type=Path, default=Path("public/images/2026/05"))
    args = parser.parse_args()
    rows = read_rows(args.csv)
    commits = [row["commit"] for row in rows]
    batch_ms = [float(row["batch_ms"]) for row in rows]
    inc_ms = [float(row["incremental_commit_ms"]) for row in rows]
    delta = [float(row["input_delta_abs"]) for row in rows]

    render_line_chart(
        args.output_dir / "opam-flowlog-runtime.svg",
        "FlowLog Batch vs Incremental Runtime",
        "30 first-parent OPAM commits; initial load included for context",
        commits,
        [
            Series("batch recomputation ms", batch_ms, "#1f77b4", 2.2),
            Series("incremental commit ms", inc_ms, "#c2410c", 2.2),
        ],
        "milliseconds",
        y_max=1200,
    )
    render_line_chart(
        args.output_dir / "opam-flowlog-incremental-runtime.svg",
        "FlowLog Incremental Commit Runtime",
        "Updates after the initial load; largest update is lwt.6.1.2",
        commits[1:],
        [Series("incremental commit ms", inc_ms[1:], "#c2410c", 2.4)],
        "milliseconds",
        y_max=10,
    )
    render_bar_chart(
        args.output_dir / "opam-flowlog-delta-size.svg",
        "Input Fact Delta Size",
        "Inserted plus removed FlowLog input facts per commit",
        commits[1:],
        delta[1:],
        "#0f766e",
        "facts",
    )


if __name__ == "__main__":
    main()
