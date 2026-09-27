# Changelog

## 0.7.1 — 2026-09-27

### Fixed
- Restore **pipeline**, **skill ops**, **workspace**, and **eval** tools in the stdio server registry (regression in 0.7.0).
- Centralize registration in `toolRegistry.ts`; apply optional `traceWrap` on cloud-backed tools.

### Added
- Registry parity tests vs **modelbound-cli** surface; harness unit tests; smoke checks for `check_harness`, outcomes, and `report_run`.
- CI runs `test:e2e` (anti-slop); `docs/PARITY.md`.

## 0.7.0

### Added
- `report_run` — self-report a finished agent run; each step is tied to the skill and version that shaped it.
- Opt-in automatic summary spans for ModelBound tool calls (`MODELBOUND_TRACING=1`). No prompts, outputs or arguments are sent.

## 0.6.0

### Added
- `check_harness` — ask whether a skill is cleared to run unattended across the four harness pillars (context, permissions, guardrails, verification).
- `presets/harness.json` — cautious / balanced / autonomous gate, approval and budget presets.

The Safety result also rides along in existing pipeline-status output, so `mb pipeline` and the IDE panels pick it up with no change.

## 0.5.0

### Added
- `skill.report_outcome` — report whether a skill worked (worked | partial | failed) plus a failure category (ignored_rule, out_of_scope, wrong_tool, hallucinated, wrong_format, too_vague, other).
- `skill.reliability` — read per-skill reliability over a rolling window.

Reports feed the ModelBound feedback loop: repeated failures are grouped, diagnosed, and turned into a proposed edit plus a regression test you accept or reject.

## 0.4.0

### Added — token optimization & Skill Development Pipeline

Bring the optimization and pipeline features that previously required the
ModelBound web UI directly into any MCP client (Cursor, Claude Code,
Windsurf, custom agents, the new `modelbound-cli`).

New tool group `optimization.*`:
- `optimization.run` — run token optimization on a skill/file; preview diff
  or apply in place (creates a new version).
- `optimization.suggestions` — list pending suggestions.
- `optimization.apply` — apply one or more suggestions by ID.

New tool group `pipeline.*`:
- `pipeline.run` — run the full Skill Development Pipeline
  (lint → trust → test → benchmark → optimize).
- `pipeline.status` — poll a run by ID.

New `skill.*` tools:
- `skill.test` — run the test suite against the current or a specific version.
- `skill.benchmark` — head-to-head benchmark (tokens, cost, pass rate, latency).
- `skill.versions` — list versions newest-first.
- `skill.restore` — restore to a previous version (non-destructive).
- `skill.diff` — unified diff between two versions.

All new tools are cloud-backed and require `MODELBOUND_API_KEY`.

## 0.3.0

- Initial public release with local validate/lint/diff/convert and cloud
  pull/push/list/search.
