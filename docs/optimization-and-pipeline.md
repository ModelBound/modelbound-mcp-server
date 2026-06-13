# Optimization & Pipeline tools (v0.4.0+)

`modelbound-mcp` now exposes the full **token optimization** and **Skill Development Pipeline** surface as MCP tools, so any agent that speaks MCP — Claude Desktop, Cursor, Kiro, Windsurf, Amazon Q, the ModelBound CLI — can drive both without opening the web UI.

All tools below require `MODELBOUND_API_KEY` because they touch your cloud library.

## Token optimization

| Tool | What it does |
| --- | --- |
| `optimization.run` | Run AI optimization on `{skill_id,file_id,agent_id,pack_id}` with `intensity` (`conservative\|balanced\|aggressive`) and optional `dry_run`. Returns `tokens_saved`, `savings_pct`, the `version_id` of the snapshot the server took first, and a per-file breakdown. |
| `optimization.dryRun` | Same inputs, never writes. Use for "show me what could be saved" UX. |
| `optimization.preview` | Read the already-optimized variant of a skill/file without re-running the model. |

## Skill Development Pipeline

| Tool | What it does |
| --- | --- |
| `pipeline.run` | Run **Test → Optimize → Production** on a skill. Inputs: `targets` (e.g. `["marketplace","claude"]`), `version_bump`, `override_gates`, `apply_optimization`, `changelog`. Returns `{run_id, status, version_after}`. |
| `pipeline.status` | Poll a `run_id` for stage_results JSON (edit / test / production with status, summary, and detail blocks). |
| `pipeline.config` | Read or update a skill's `pipeline_config` (`min_trust`, `max_latency_ms`, enforce flags, default targets). |

## Skill ops & history

| Tool | What it does |
| --- | --- |
| `skill.test` | Run one saved test case or an ad-hoc prompt. Returns adherence (1-10), verdict, latency_ms. |
| `skill.testCases` / `skill.testRuns` | List saved cases or recent runs. |
| `skill.versions` | List `file_versions` history for a skill or file. |
| `skill.diff` | Unified diff between two versions. |

## Safety guarantees

- Every server-side mutation creates a `file_versions` snapshot BEFORE writing — restore is always possible from the web UI or `skill.versions` + a push of the prior body.
- Local-file mutations (used by the CLI and IDE extensions, not by this MCP server's cloud tools) route through `src/core/backup.ts`, which writes 0600 backups under `.modelbound/backups/<file>/<iso>-<sha7>.bak` and auto-`.gitignore`s them.
- `pipeline.run` honours all gates by default. `override_gates: true` is forwarded as-is; UI clients are expected to surface that override visibly.

## Example: optimize a skill from Claude Desktop

```json
{
  "method": "tools/call",
  "params": {
    "name": "optimization.run",
    "arguments": { "skill_id": "abc-123", "intensity": "balanced" }
  }
}
```

## Example: run the pipeline and watch progress

```json
{ "method": "tools/call", "params": { "name": "pipeline.run", "arguments": { "skill_id": "abc-123", "targets": ["marketplace"], "apply_optimization": true } } }
```

Then poll:

```json
{ "method": "tools/call", "params": { "name": "pipeline.status", "arguments": { "run_id": "..." } } }
```
