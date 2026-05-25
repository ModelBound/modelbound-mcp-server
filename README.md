# modelbound-mcp

> Local-first MCP server for agent skills. Validate, lint, diff, and convert agent skill files across Cursor, Claude, Kiro, Windsurf, VS Code, and Amazon Q — no account required. Optional cloud sync with [ModelBound](https://modelbound.co).

[![npm](https://img.shields.io/npm/v/modelbound-mcp.svg)](https://www.npmjs.com/package/modelbound-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

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
- `cloud.pullSkill`, `cloud.pushSkill`, `cloud.listSkills`, `cloud.search`
- `cloud.installMarketplaceSkill`
- `optimization.health`

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

## License

MIT © ModelBound
