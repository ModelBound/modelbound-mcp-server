# CLI parity (modelbound vs MCP server)

Package **[modelbound](https://www.npmjs.com/package/modelbound)** CLI **0.3.6** and this **`modelbound-mcp`** server share the same cloud APIs and local anti-slop libraries.

## MCP tools ↔ CLI

| CLI | MCP tool(s) |
|-----|-------------|
| `mb detect` | `ide.detectLayout` |
| `mb ls` | `skills.listLocal` |
| `mb lint` / `validate` | `skills.lint`, `skills.validateFormat` |
| `mb init` / `new` / `trust` | `skills.scaffold`, `skills.trust`, task budgets via local files |
| `mb review *` | `skills.reviewRequest`, `reviewApprove`, `reviewReject`, `reviewStatus`, `reviewGate` |
| `mb push` / `pull` / `sync` | `cloud.pushSkill`, `cloud.pullSkill`, `sync.fromIde`, `workspace.setContext` |
| `mb optimize` | `optimization.run`, `optimization.dryRun`, `optimization.preview` |
| `mb pipeline` | `pipeline.run`, `pipeline.status`, `pipeline.config` |
| `mb test` / `eval` | `skill.test`, `skill.testCases`, `eval.*` |
| `mb versions` / `diff` / `restore` | `skill.versions`, `skill.diff`, cloud restore via pull |
| `mb benchmark` / `compare` | `skill.benchmark`, `skill.compareVersions` |
| `mb findings` / `suggest` | `skill.findings`, `skill.suggestImprovements` |
| `mb report` / `reliability` | `skill.report_outcome`, `skill.reliability` |
| `mb harness` | `check_harness` |
| `mb trace` (shell wrap) | `report_run` (+ opt-in `MODELBOUND_TRACING=1` spans on MCP tool calls) |

## CLI-only

| Area | Why |
|------|-----|
| `mb config`, `mcp`, `skills` top-level | Terminal config; MCP clients use env + tool list |
| Interactive auth | Use `MODELBOUND_API_KEY` in the MCP host config |

Presets: `presets/harness.json` (same as Cursor plugin / extension).
