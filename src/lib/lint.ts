import matter from "gray-matter";

/** Rough token estimate: 1 token ≈ 4 characters of English text. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface LintIssue {
  severity: "error" | "warn" | "info";
  rule: string;
  message: string;
}

export interface LintReport {
  ok: boolean;
  tokens: number;
  issues: LintIssue[];
}

const LINK_RE = /\[[^\]]+\]\((?<href>[^)]+)\)/g;
const REQUIRED_FRONTMATTER = ["name", "description"];

/**
 * Lints a single skill file. Catches: missing required front-matter,
 * suspicious token counts, obviously broken links, and stale TODOs.
 *
 * Pure: no network, no filesystem writes.
 */
export function lintSkill(raw: string, opts?: { maxTokens?: number }): LintReport {
  const issues: LintIssue[] = [];
  const maxTokens = opts?.maxTokens ?? 4000;

  let frontmatter: Record<string, unknown> = {};
  let body = raw;
  try {
    const parsed = matter(raw);
    frontmatter = parsed.data ?? {};
    body = parsed.content;
  } catch (err) {
    issues.push({
      severity: "error",
      rule: "frontmatter-parse",
      message: `Front-matter could not be parsed: ${(err as Error).message}`,
    });
  }

  for (const key of REQUIRED_FRONTMATTER) {
    if (!frontmatter[key] || typeof frontmatter[key] !== "string") {
      issues.push({
        severity: "warn",
        rule: "frontmatter-required",
        message: `Missing recommended front-matter field: \`${key}\``,
      });
    }
  }

  const tokens = estimateTokens(body);
  if (tokens > maxTokens) {
    issues.push({
      severity: "warn",
      rule: "size",
      message: `Skill body is ~${tokens} tokens (limit ${maxTokens}). Consider splitting.`,
    });
  }

  for (const match of body.matchAll(LINK_RE)) {
    const href = match.groups?.href ?? "";
    if (!href || href.includes(" ") || href === "#") {
      issues.push({
        severity: "info",
        rule: "broken-link",
        message: `Suspicious link target: \`${href}\``,
      });
    }
  }

  if (/\bTODO\b|\bFIXME\b/i.test(body)) {
    issues.push({
      severity: "info",
      rule: "todo",
      message: "Contains TODO/FIXME markers.",
    });
  }

  return {
    ok: !issues.some((i) => i.severity === "error"),
    tokens,
    issues,
  };
}

/**
 * Validates a skill against the agentskills.io standard:
 * https://agentskills.io — SKILL.md + front-matter (name, description, optional version).
 */
export function validateAgentSkillsFormat(raw: string): LintReport {
  const issues: LintIssue[] = [];
  let frontmatter: Record<string, unknown> = {};
  try {
    frontmatter = matter(raw).data ?? {};
  } catch (err) {
    issues.push({
      severity: "error",
      rule: "frontmatter-parse",
      message: (err as Error).message,
    });
  }
  if (!frontmatter.name) {
    issues.push({ severity: "error", rule: "agentskills-name", message: "`name` is required." });
  }
  if (!frontmatter.description) {
    issues.push({
      severity: "error",
      rule: "agentskills-description",
      message: "`description` is required.",
    });
  }
  if (frontmatter.name && String(frontmatter.name).length > 64) {
    issues.push({
      severity: "warn",
      rule: "agentskills-name-length",
      message: "`name` should be 64 characters or fewer.",
    });
  }
  return {
    ok: !issues.some((i) => i.severity === "error"),
    tokens: estimateTokens(raw),
    issues,
  };
}
