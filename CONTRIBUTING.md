# Contributing to modelbound-mcp

Thanks for helping! The single highest-leverage contribution is **a new IDE adapter** — it lets thousands of users sync their skills from an editor we don't yet support.

## Add an IDE adapter

1. Create `src/adapters/<your-ide>.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { IdeAdapter } from "./types.js";

export const myIde: IdeAdapter = {
  id: "my-ide",
  name: "My IDE",
  skillsDir: ".my-ide/skills",
  fileExt: ".md",
  detect: (cwd) => fs.existsSync(path.join(cwd, ".my-ide")),
  toCanonical: (raw) => {
    const { data, content } = matter(raw);
    return { frontmatter: data ?? {}, body: content.trim() };
  },
  fromCanonical: ({ frontmatter, body }) =>
    Object.keys(frontmatter).length ? matter.stringify(body, frontmatter) : body + "\n",
};
```

2. Register it in `src/adapters/index.ts` by adding to `ALL_ADAPTERS`.
3. Add a unit test under `src/adapters/<your-ide>.test.ts` that round-trips a sample file.
4. Add an example IDE config in `examples/<your-ide>.json` (or `.toml`).
5. Open a PR.

## Linter rules

Add new rules in `src/lib/lint.ts`. Keep them pure (no IO), and add a test that asserts both the positive and negative case.

## Dev workflow

```bash
npm install
npm run dev               # runs the MCP server with tsx
npm test
```

## Code style

- TypeScript strict mode
- No new runtime dependencies without discussion
- No telemetry, no auto-update, no network calls outside `src/proxy.ts`
