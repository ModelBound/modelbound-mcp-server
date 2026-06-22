#!/usr/bin/env node
/**
 * Standalone CLI: `modelbound-mcp <subcommand>`
 *
 * Without arguments, launches the MCP stdio server (this is what IDEs invoke).
 * With a subcommand, runs that subcommand against the filesystem.
 */
import fs from "node:fs";
import path from "node:path";
import { ALL_ADAPTERS, detectAdapters, getAdapter, listAdapterFiles } from "./adapters/index.js";
import { lintSkill, validateAgentSkillsFormat } from "./lib/lint.js";

const args = process.argv.slice(2);
const cmd = args[0];

if (!cmd) {
  // No subcommand → boot the MCP server.
  await import("./index.js");
} else if (cmd === "validate") {
  const file = args[1];
  if (!file) die("Usage: modelbound-mcp validate <file>");
  const report = validateAgentSkillsFormat(fs.readFileSync(file, "utf8"));
  printReport(file, report);
  process.exit(report.ok ? 0 : 1);
} else if (cmd === "lint") {
  const target = args[1] ?? ".";
  const stat = fs.statSync(target);
  let failed = false;
  const files = stat.isDirectory()
    ? walk(target).filter((f) => f.endsWith(".md") || f.endsWith(".mdc"))
    : [target];
  for (const f of files) {
    const report = lintSkill(fs.readFileSync(f, "utf8"));
    printReport(f, report);
    if (!report.ok) failed = true;
  }
  process.exit(failed ? 1 : 0);
} else if (cmd === "convert") {
  const fromIdx = args.indexOf("--from");
  const toIdx = args.indexOf("--to");
  const file = args[args.length - 1];
  if (fromIdx < 0 || toIdx < 0 || !file) {
    die("Usage: modelbound-mcp convert --from <ide> --to <ide> <file>");
  }
  const from = getAdapter(args[fromIdx + 1]!);
  const to = getAdapter(args[toIdx + 1]!);
  if (!from || !to) die(`Unknown adapter. Known: ${ALL_ADAPTERS.map((a) => a.id).join(", ")}`);
  const canonical = from!.toCanonical(fs.readFileSync(file, "utf8"));
  process.stdout.write(to!.fromCanonical(canonical));
} else if (cmd === "detect") {
  const adapters = detectAdapters(process.cwd());
  console.log(
    adapters.length
      ? adapters.map((a) => `${a.id}\t${a.skillsDir}`).join("\n")
      : "No known IDE layouts detected.",
  );
} else if (cmd === "ls") {
  for (const a of detectAdapters(process.cwd())) {
    for (const f of listAdapterFiles(a, process.cwd())) {
      console.log(`${a.id}\t${path.relative(process.cwd(), f)}`);
    }
  }
} else if (cmd === "--help" || cmd === "-h") {
  console.log(`modelbound-mcp — local-first MCP server + CLI for agent skills

Without arguments, launches the MCP stdio server (used by IDEs).

Subcommands:
  detect                          List IDE layouts found in the current directory
  ls                              List all skill files across detected layouts
  validate <file>                 Validate a skill against the agentskills.io standard
  lint <file|dir>                 Run the full linter (front-matter, size, links, TODOs)
  convert --from X --to Y <file>  Convert between IDE formats (writes to stdout)

Adapters: ${ALL_ADAPTERS.map((a) => a.id).join(", ")}

Set MODELBOUND_API_KEY to unlock cloud sync tools when running as an MCP server.
`);
} else {
  die(`Unknown subcommand: ${cmd}. Try --help.`);
}

function die(msg: string): never {
  console.error(msg);
  process.exit(2);
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".cursor" && entry.name !== ".claude" && entry.name !== ".codex" && entry.name !== ".kiro" && entry.name !== ".windsurf") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function printReport(file: string, report: { ok: boolean; tokens: number; issues: { severity: string; rule: string; message: string }[] }) {
  const tag = report.ok ? "OK  " : "FAIL";
  console.log(`${tag}  ${file}  (~${report.tokens} tokens)`);
  for (const i of report.issues) {
    console.log(`  ${i.severity.padEnd(5)} ${i.rule.padEnd(22)} ${i.message}`);
  }
}
