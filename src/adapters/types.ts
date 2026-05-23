import fs from "node:fs";
import path from "node:path";

/**
 * IDE adapter interface. Each adapter knows where a given IDE stores its
 * agent skill / rules files and how to translate that IDE's flavor of a
 * skill file to and from a canonical { frontmatter, body } representation.
 *
 * Adding a new IDE is the single best way to contribute to this project.
 * See CONTRIBUTING.md for a 10-line recipe.
 */
export interface CanonicalSkill {
  frontmatter: Record<string, unknown>;
  body: string;
}

export interface IdeAdapter {
  /** Stable identifier used in CLI args, e.g. `cursor`, `claude`. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Returns true if this IDE's project marker exists in `cwd`. */
  detect: (cwd: string) => boolean;
  /** Project-relative directory that holds skill / rule files. */
  skillsDir: string;
  /** File extension this IDE uses for its skill files (e.g. `.mdc`, `.md`). */
  fileExt: string;
  /** Parse a raw file body into the canonical representation. */
  toCanonical: (raw: string) => CanonicalSkill;
  /** Serialize the canonical representation back to this IDE's format. */
  fromCanonical: (skill: CanonicalSkill) => string;
}

/** Walk the skills directory and return absolute file paths. */
export function listAdapterFiles(adapter: IdeAdapter, cwd: string): string[] {
  const dir = path.join(cwd, adapter.skillsDir);
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && full.endsWith(adapter.fileExt)) out.push(full);
    }
  };
  walk(dir);
  return out;
}
