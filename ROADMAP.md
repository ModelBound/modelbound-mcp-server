# Roadmap

This repo is open source because we want it to outgrow what the core team can build alone. Anything below labeled **help wanted** is fair game.

## IDE adapters (help wanted)

- [ ] Zed (`.zed/`)
- [ ] Aider (`.aider.conf.yml`, `CONVENTIONS.md`)
- [ ] Continue (`.continue/config.json`)
- [ ] JetBrains AI Assistant
- [ ] Cline (`.clinerules`)
- [ ] Sourcegraph Cody

## Linter rules

- [ ] Better token estimation (tiktoken-compatible)
- [ ] Frontmatter schema validation per adapter
- [ ] Cross-file dead-link checker
- [ ] Detect duplicated rules across files

## Format converters

- [ ] Lossless `cursor ↔ claude` round-trip tests
- [ ] `AGENTS.md` → adapter-specific split
- [ ] Bundle multiple files into a single `SKILL.md`

## Cloud surface (maintainer-owned)

- [x] Proxy with `?source=oss-mcp` tagging
- [ ] Surface ModelBound rate-limit headers back to the client
- [ ] Optional auto-detect of `MODELBOUND_API_KEY` from common locations
