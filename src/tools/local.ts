import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ALL_ADAPTERS, detectAdapters, getAdapter, listAdapterFiles } from "../adapters/index.js";
import { lintSkill, validateAgentSkillsFormat } from "../lib/lint.js";
import { CloudClient } from "../proxy.js";
import { buildServedSkillPayload, parseSkillForTrust } from "../lib/skillPayload.js";
import { applyReviewToFile, ciBlocksMerge, hashBody, readSkillParts } from "../lib/skillReview.js";
import { appendRun, readRuns, summarizeConfidence } from "../lib/confidenceHistory.js";
import { SCANNER_VERSION } from "../lib/skillTrust.js";
import { writeScaffoldedSkill } from "../lib/skillScaffold.js";

const inside = (cwd: string, p: string) => {
  const abs = path.resolve(cwd, p);
  if (!abs.startsWith(path.resolve(cwd) + path.sep) && abs !== path.resolve(cwd)) {
    throw new Error(`Path escapes working directory: ${p}`);
  }
  return abs;
};

export function localTools(cloud: CloudClient | null = CloudClient.fromEnv()) {
  return [
  {
    name: "ide.detectLayout",
    description:
      "Detect which IDE skill/rule layouts exist in the current working directory. Returns the list of matching adapters (e.g. cursor, claude, codex, kiro). Local-only, no network.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: async (_args: unknown, ctx: { cwd: string }) => {
      const adapters = detectAdapters(ctx.cwd);
      return {
        cwd: ctx.cwd,
        detected: adapters.map((a) => ({
          id: a.id,
          name: a.name,
          skillsDir: a.skillsDir,
          fileExt: a.fileExt,
        })),
        knownAdapters: ALL_ADAPTERS.map((a) => a.id),
      };
    },
  },

  {
    name: "skills.listLocal",
    description: "List all skill / rule files found in the detected IDE directories under the current working directory.",
    inputSchema: {
      type: "object",
      properties: { adapter: { type: "string", description: "Optional adapter id to scope the listing." } },
      additionalProperties: false,
    },
    handler: async (args: unknown, ctx: { cwd: string }) => {
      const { adapter } = z.object({ adapter: z.string().optional() }).parse(args ?? {});
      const adapters = adapter ? [getAdapter(adapter)].filter(Boolean) : detectAdapters(ctx.cwd);
      const files: { adapter: string; path: string; bytes: number }[] = [];
      for (const a of adapters) {
        if (!a) continue;
        for (const abs of listAdapterFiles(a, ctx.cwd)) {
          files.push({
            adapter: a.id,
            path: path.relative(ctx.cwd, abs),
            bytes: fs.statSync(abs).size,
          });
        }
      }
      return { count: files.length, files };
    },
  },

  {
    name: "skills.readLocal",
    description: "Read a local skill file (raw contents). Path must be inside the current working directory.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
      additionalProperties: false,
    },
    handler: async (args: unknown, ctx: { cwd: string }) => {
      const { path: p } = z.object({ path: z.string().min(1) }).parse(args);
      const abs = inside(ctx.cwd, p);
      const raw = fs.readFileSync(abs, "utf8");
      return buildServedSkillPayload(ctx.cwd, p, raw);
    },
  },

  {
    name: "skills.writeLocal",
    description: "Write a local skill file. Creates parent directories. Path must be inside the current working directory.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" }, contents: { type: "string" } },
      required: ["path", "contents"],
      additionalProperties: false,
    },
    handler: async (args: unknown, ctx: { cwd: string }) => {
      const { path: p, contents } = z
        .object({ path: z.string().min(1), contents: z.string() })
        .parse(args);
      const abs = inside(ctx.cwd, p);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, contents, "utf8");
      return { path: p, bytes: Buffer.byteLength(contents, "utf8") };
    },
  },

  {
    name: "skills.lint",
    description: "Lint a skill file: front-matter, token count, broken links, TODO markers. Local-only.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" }, maxTokens: { type: "number" } },
      required: ["path"],
      additionalProperties: false,
    },
    handler: async (args: unknown, ctx: { cwd: string }) => {
      const { path: p, maxTokens } = z
        .object({ path: z.string().min(1), maxTokens: z.number().optional() })
        .parse(args);
      const abs = inside(ctx.cwd, p);
      const raw = fs.readFileSync(abs, "utf8");
      const lint = lintSkill(raw, { maxTokens });
      const trust = parseSkillForTrust(raw, p);
      appendRun(ctx.cwd, p, {
        ts: new Date().toISOString(),
        trust: trust.total,
        tests_passed: lint.ok ? 1 : 0,
        tests_total: 1,
        scanner_version: SCANNER_VERSION,
      });
      return { path: p, ...lint, trust_score: trust.total, scanner_version: SCANNER_VERSION, findings: trust.findings };
    },
  },

  {
    name: "skills.validateFormat",
    description: "Validate a skill file against the agentskills.io standard.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
      additionalProperties: false,
    },
    handler: async (args: unknown, ctx: { cwd: string }) => {
      const { path: p } = z.object({ path: z.string().min(1) }).parse(args);
      const abs = inside(ctx.cwd, p);
      return { path: p, ...validateAgentSkillsFormat(fs.readFileSync(abs, "utf8")) };
    },
  },

  {
    name: "skills.convert",
    description:
      "Convert a skill file from one IDE format to another (e.g. cursor → claude). Round-trips through a canonical {frontmatter, body} representation.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        from: { type: "string", description: "Source adapter id (e.g. cursor)" },
        to: { type: "string", description: "Target adapter id (e.g. claude)" },
        outPath: { type: "string", description: "Optional output path. If omitted, returns the converted body without writing." },
      },
      required: ["path", "from", "to"],
      additionalProperties: false,
    },
    handler: async (args: unknown, ctx: { cwd: string }) => {
      const { path: p, from, to, outPath } = z
        .object({
          path: z.string().min(1),
          from: z.string(),
          to: z.string(),
          outPath: z.string().optional(),
        })
        .parse(args);
      const src = getAdapter(from);
      const dst = getAdapter(to);
      if (!src) throw new Error(`Unknown source adapter: ${from}`);
      if (!dst) throw new Error(`Unknown target adapter: ${to}`);
      const abs = inside(ctx.cwd, p);
      const raw = fs.readFileSync(abs, "utf8");
      const canonical = src.toCanonical(raw);
      const converted = dst.fromCanonical(canonical);
      if (outPath) {
        const outAbs = inside(ctx.cwd, outPath);
        fs.mkdirSync(path.dirname(outAbs), { recursive: true });
        fs.writeFileSync(outAbs, converted, "utf8");
        return { from, to, wrote: outPath, bytes: Buffer.byteLength(converted, "utf8") };
      }
      return { from, to, contents: converted };
    },
  },



  {
    name: "skills.diff",
    description:
      "Diff a local skill file against its cloud counterpart by slug. Local-side diff is computed here; the cloud half requires MODELBOUND_API_KEY.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Local skill file path." },
        slug: { type: "string", description: "Cloud skill slug to compare against." },
      },
      required: ["path", "slug"],
      additionalProperties: false,
    },
    handler: async (args: unknown, ctx: { cwd: string }) => {
      const { path: p, slug } = z
        .object({ path: z.string().min(1), slug: z.string().min(1) })
        .parse(args);
      const abs = inside(ctx.cwd, p);
      const local = fs.readFileSync(abs, "utf8");
      if (!cloud) {
        return {
          path: p,
          slug,
          local_only: true,
          local_bytes: Buffer.byteLength(local, "utf8"),
          note: "MODELBOUND_API_KEY not set; returning local file only.",
        };
      }
      const remote = await cloud.callTool("get_skill", { skill_id: slug });
      const remoteBody =
        typeof remote === "string"
          ? remote
          : (remote as any)?.body_md ?? JSON.stringify(remote, null, 2);
      return {
        path: p,
        slug,
        identical: local.trim() === String(remoteBody).trim(),
        local_bytes: Buffer.byteLength(local, "utf8"),
        remote_bytes: Buffer.byteLength(String(remoteBody), "utf8"),
        local,
        remote: remoteBody,
      };
    },
  },

  {
    name: "skills.scaffold",
    description: "Create a new SKILL.md with default scope constraints and draft review state.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        path: { type: "string", description: "Optional output path relative to cwd." },
        noScope: { type: "boolean", description: "Omit default scope-constraint block." },
      },
      required: ["name", "description"],
      additionalProperties: false,
    },
    handler: async (args: unknown, ctx: { cwd: string }) => {
      const parsed = z
        .object({
          name: z.string().min(1),
          description: z.string().min(1),
          path: z.string().optional(),
          noScope: z.boolean().optional(),
        })
        .parse(args);
      const rel = writeScaffoldedSkill(ctx.cwd, {
        name: parsed.name,
        description: parsed.description,
        cwd: ctx.cwd,
        includeScope: !parsed.noScope,
      }, parsed.path);
      return { path: rel, created: true };
    },
  },

  {
    name: "skills.trust",
    description: "Score a local skill with deterministic trust heuristics (scanner h5).",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
      additionalProperties: false,
    },
    handler: async (args: unknown, ctx: { cwd: string }) => {
      const { path: p } = z.object({ path: z.string().min(1) }).parse(args);
      const abs = inside(ctx.cwd, p);
      const raw = fs.readFileSync(abs, "utf8");
      const trust = parseSkillForTrust(raw, p);
      const parts = readSkillParts(raw);
      appendRun(ctx.cwd, p, {
        ts: new Date().toISOString(),
        trust: trust.total,
        tests_passed: 0,
        tests_total: 0,
        scanner_version: SCANNER_VERSION,
      });
      return {
        path: p,
        trust_score: trust.total,
        review_state: parts.review_state,
        confidence: summarizeConfidence(readRuns(ctx.cwd, p)),
        clarity: trust.clarity,
        safety: trust.safety,
        fit: trust.fit,
        total: trust.total,
        findings: trust.findings,
        scanner_version: trust.scanner_version,
      };
    },
  },

  {
    name: "skills.reviewStatus",
    description: "Show review_state, review_meta, trust score, and confidence trend for a skill.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
      additionalProperties: false,
    },
    handler: async (args: unknown, ctx: { cwd: string }) => {
      const { path: p } = z.object({ path: z.string().min(1) }).parse(args);
      const abs = inside(ctx.cwd, p);
      return buildServedSkillPayload(ctx.cwd, p, fs.readFileSync(abs, "utf8"));
    },
  },

  {
    name: "skills.reviewRequest",
    description: "Move a skill to pending_review.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
      additionalProperties: false,
    },
    handler: async (args: unknown, ctx: { cwd: string }) => {
      const { path: p } = z.object({ path: z.string().min(1) }).parse(args);
      const abs = inside(ctx.cwd, p);
      const raw = fs.readFileSync(abs, "utf8");
      const next = applyReviewToFile(raw, { state: "pending_review" });
      fs.writeFileSync(abs, next, "utf8");
      return buildServedSkillPayload(ctx.cwd, p, next);
    },
  },

  {
    name: "skills.reviewApprove",
    description: "Approve a skill; stores approved body hash and trust score at approval time.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        reviewed_by: { type: "string" },
        notes: { type: "string" },
      },
      required: ["path"],
      additionalProperties: false,
    },
    handler: async (args: unknown, ctx: { cwd: string }) => {
      const parsed = z
        .object({
          path: z.string().min(1),
          reviewed_by: z.string().optional(),
          notes: z.string().optional(),
        })
        .parse(args);
      const abs = inside(ctx.cwd, parsed.path);
      const raw = fs.readFileSync(abs, "utf8");
      const parts = readSkillParts(raw);
      const trust = parseSkillForTrust(raw, parsed.path);
      const next = applyReviewToFile(raw, {
        state: "approved",
        reviewed_by: parsed.reviewed_by ?? process.env.USER ?? "local",
        reviewed_at: new Date().toISOString(),
        approved_hash: hashBody(parts.body),
        approved_trust: trust.total,
        scanner_version: SCANNER_VERSION,
        notes: parsed.notes,
      });
      fs.writeFileSync(abs, next, "utf8");
      return buildServedSkillPayload(ctx.cwd, parsed.path, next);
    },
  },

  {
    name: "skills.reviewReject",
    description: "Reject a skill with optional reviewer notes.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        reviewed_by: { type: "string" },
        notes: { type: "string" },
      },
      required: ["path"],
      additionalProperties: false,
    },
    handler: async (args: unknown, ctx: { cwd: string }) => {
      const parsed = z
        .object({
          path: z.string().min(1),
          reviewed_by: z.string().optional(),
          notes: z.string().optional(),
        })
        .parse(args);
      const abs = inside(ctx.cwd, parsed.path);
      const raw = fs.readFileSync(abs, "utf8");
      const next = applyReviewToFile(raw, {
        state: "rejected",
        reviewed_by: parsed.reviewed_by ?? process.env.USER ?? "local",
        reviewed_at: new Date().toISOString(),
        notes: parsed.notes,
      });
      fs.writeFileSync(abs, next, "utf8");
      return buildServedSkillPayload(ctx.cwd, parsed.path, next);
    },
  },

  {
    name: "skills.reviewGate",
    description: "CI gate: exit semantics via blocked=true when skill is not approved.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
      additionalProperties: false,
    },
    handler: async (args: unknown, ctx: { cwd: string }) => {
      const { path: p } = z.object({ path: z.string().min(1) }).parse(args);
      const abs = inside(ctx.cwd, p);
      const payload = buildServedSkillPayload(ctx.cwd, p, fs.readFileSync(abs, "utf8"));
      const blocked = ciBlocksMerge(payload.review_state as any);
      return { ...payload, blocked, ci_exit_code: blocked ? 1 : 0 };
    },
  },
];
}
