# Changelog

## 0.4.0 — Optimize + Pipeline everywhere

Adds first-class MCP tools so AI engineers can run **token optimization** and the **Skill Development Pipeline** without opening the ModelBound UI.

### New MCP tools

**`optimization.*`** (require `MODELBOUND_API_KEY`)
- `optimization.run` — AI optimization on a skill / file / agent / pack with `intensity` and `dry_run` flags. Server creates a version snapshot first.
- `optimization.dryRun` — projected savings only, never writes. Safe for auto-suggest hooks.
- `optimization.preview` — fetch cached optimized variant without rerun.

**`pipeline.*`** (require `MODELBOUND_API_KEY`)
- `pipeline.run` — run Test → Optimize → Production with `targets`, `version_bump`, `override_gates`, `apply_optimization`, `changelog`.
- `pipeline.status` — poll a run id for stage-by-stage progress.
- `pipeline.config` — read or update `pipeline_config` (`min_trust`, `max_latency_ms`, gate enforcement, default targets).

**`skill.*`** (require `MODELBOUND_API_KEY`)
- `skill.test` — run a saved or ad-hoc test case, returns adherence_score + verdict + latency.
- `skill.testCases` / `skill.testRuns` — list saved cases and recent runs.
- `skill.versions` — list `file_versions` history.
- `skill.diff` — unified diff between two versions.

### New shared modules

- `src/core/progress.ts` — typed `ProgressEvent` union and pipeline-stage summarizer shared with the CLI and IDE clients so progress renders identically everywhere.
- `src/core/backup.ts` — `BackupEngine` (createBackup / listBackups / restoreBackup) for any client that mutates a file on disk. POSIX 0600, project-root-scoped, auto-`.gitignore`d.

### Safety

- All mutating tools route through the hosted server, which records a `file_versions` snapshot before writes.
- For local-file edits, clients (CLI, IDE extensions) MUST call `BackupEngine.createBackup` first. Restore is non-destructive — it snapshots the current contents before overwriting.
- `override_gates` is forwarded verbatim; downstream clients are expected to surface that override visibly.

### CI / supply chain

- Added Dependabot config for npm + GitHub Actions.
- Added CodeQL scanning workflow.
- Existing test workflow continues to run on every PR.
