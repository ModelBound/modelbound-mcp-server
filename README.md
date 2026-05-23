# modelbound-mcp

> Local-first MCP server for agent skills. Validate, lint, diff, and convert agent skill files across Cursor, Claude, Kiro, Windsurf, VS Code, and Amazon Q — no account required. Optional cloud sync with [ModelBound](https://modelbound.co).

[![npm](https://img.shields.io/npm/v/modelbound-mcp.svg)](https://www.npmjs.com/package/modelbound-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## What it does

`modelbound-mcp` is a small [Model Context Protocol](https://modelcontextprotocol.io) server you run locally over stdio. It exposes tools to your IDE / agent:

**Local (no API key, no network):**
- `detect_ide_layout` — find which IDE conventions your repo uses
- `list_local_skills`, `read_local_skill`, `write_local_skill`
- `lint_skill` — front-matter, token count, broken links, TODO scan
- `validate_skill_format` — agentskills.io compliance
- `convert_skill` — translate between IDE formats (e.g. Cursor → Claude)

**Cloud (with `MODELBOUND_API_KEY`):**
- `pull_skill`, `push_skill`, `list_cloud_skills`, `search_cloud`
- `install_marketplace_skill`, `get_context_health`

The cloud tools are a thin JSON-RPC proxy to `mcp.modelbound.co`. All business logic stays server-side; this repo never touches your data or secrets.

## Install

No install needed:

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
