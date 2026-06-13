# Changelog

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
