# modelbound-mcp

> Local-first MCP server for agent skills. Validate, lint, diff, and convert agent skill files across Cursor, Claude, Kiro, Windsurf, VS Code, and Amazon Q — no account required. Optional cloud sync with [ModelBound](https://modelbound.co).

[![npm](https://img.shields.io/npm/v/modelbound-mcp.svg)](https://www.npmjs.com/package/modelbound-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Why ModelBound?

AI tools come and go. You might use Cursor today, switch to Claude Code tomorrow, and try Kiro next week — but your skills, rules, and context shouldn't be locked into any one of them. ModelBound gives you a single place to store and manage your agent skills, so you can move between tools freely without rebuilding your setup each time. Write a skill once, sync it everywhere, and get more value out of every AI subscription you're already paying for.

## What it does

`modelbound-mcp` is a small [Model Context Protocol](https://modelcontextprotocol.io) server you run locally over stdio. It exposes tools to your IDE / agent using **dot-notation naming** for navigable discovery (per the [Smithery quality guidelines](https://smithery.ai/docs/quality)):

**Local (no API key, no network):**
- `ide.detectLayout` — find which IDE conventions your repo uses
- `skills.listLocal`, `skills.readLocal`, `skills.writeLocal`
- `skills.lint` — front-matter, token count, broken links, TODO scan
- `skills.validateFormat` — agentskills.io compliance
- `skills.convert` — translate between IDE formats (e.g. Cursor → Claude)
- `skills.diff` — compare a local skill with its cloud counterpart

**Cloud (with `MODELBOUND_API_KEY`):**
- `cloud.pullSkill`, `cloud.pushSkill`, `cloud.search`
- `cloud.listSkills` — now accepts `ai_type` and `source_platform` filters; every row includes `ai_type`, `source_platform`, `source_path`, and `repo`
- `cloud.resourceTree` — returns the team's full hierarchy grouped by platform → top-level dir (`.claude/skills`, `.cursor/rules`, `.kiro/steering`, …) → files. Use this before `cloud.listSkills` when an orchestrator needs to map context before loading.
- `cloud.installMarketplaceSkill`
- `optimization.health`

### Resource hierarchy

Orchestrators that juggle multiple AI platforms can call `cloud.resourceTree` once to get a complete map of available skills, rules, hooks, steering files, and system prompts — grouped exactly how each platform expects them on disk. Pair it with the new `ai_type` / `source_platform` filters on `cloud.listSkills` to load only the slice you need. See [`examples/resource-tree.ts`](./examples/resource-tree.ts).

The cloud tools are a thin JSON-RPC proxy to `mcp.modelbound.co`. All business logic stays server-side; this repo never touches your data or secrets.

> **Migration from 0.1.x** — old snake_case names (`detect_ide_layout`, `pull_skill`, …) were removed in 0.2.0. The hosted ModelBound MCP server still accepts both forms forever for backward compatibility.

## Install

```bash
npx modelbound-mcp
```

Or install globally:

```bash
npm i -g modelbound-mcp
```

## Use as an MCP server

### Cursor (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "modelbound": {
      "command": "npx",
      "args": ["-y", "modelbound-mcp"],
      "env": { "MODELBOUND_API_KEY": "mb_live_..." }
    }
  }
}
```

`MODELBOUND_API_KEY` is optional. Without it, local tools still work.

See [`examples/`](./examples) for Claude Desktop, Kiro, Windsurf, and VS Code configs.

## Use as a CLI

```bash
modelbound-mcp detect                                  # which IDE layouts exist here?
modelbound-mcp ls                                      # list every skill file
modelbound-mcp lint .cursor/rules/                     # lint a directory
modelbound-mcp validate ./SKILL.md                     # agentskills.io compliance
modelbound-mcp convert --from cursor --to claude ./rule.mdc > out.md
```

## Contributing

We want help. Specifically:

- **New IDE adapters** — Zed, Aider, Continue, JetBrains AI, Cline. See [CONTRIBUTING.md](CONTRIBUTING.md) for the ~50 line recipe.
- **Linter rules** — token estimation accuracy, dead-link detection, format-specific gotchas.
- **Format converters** — fidelity improvements between adapter pairs.

Browse [good first issues](https://github.com/ModelBound/modelbound-mcp-server/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) and the [roadmap](ROADMAP.md).

## Related projects

| Project | Description |
| --- | --- |
| [ModelBound CLI](https://github.com/ModelBound/modelbound-cli) · [npm](https://www.npmjs.com/package/modelbound) | Terminal + CI for token optimization, skill pipeline, and version management |
| [Cursor Extension](https://github.com/ModelBound/modelbound-cursor-extension) · [Marketplace](https://marketplace.visualstudio.com/items?itemName=ModelBound.modelbound-cursor-extension) | VS Code/Cursor extension for rules sync and MCP bridge |
| [Cursor Plugin](https://github.com/ModelBound/cursor-plugin) | Cursor slash commands for pipeline, trust & safety, and versions |
| [Claude Code Plugin](https://github.com/ModelBound/modelbound-claude-code-plugin) | Claude Code plugin for pipeline, hooks, and skill sync |
| [Dev Packs](https://github.com/ModelBound/dev-packs) | Open-source curated AI context packs for engineering teams |

Also on [Smithery](https://smithery.ai) (stdio via `npx modelbound-mcp`) and the [MCP Registry](https://github.com/ModelBound/modelbound-mcp-server/blob/main/server.json). Install hub: [modelbound.co/connect](https://modelbound.co/connect)

## License

MIT © ModelBound
