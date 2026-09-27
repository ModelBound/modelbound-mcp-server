import assert from "node:assert/strict";
import test from "node:test";
import { harnessTools } from "./harness.js";

test("check_harness returns unknown when pipeline has no safety block", async () => {
  const cloud = {
    callTool: async () => ({ stage_results: { test: { details: {} } } }),
  } as any;
  const [tool] = harnessTools(cloud);
  const out = (await tool.handler({ skill_id: "demo-skill" })) as {
    status: string;
    ready: boolean;
  };
  assert.equal(out.status, "unknown");
  assert.equal(out.ready, false);
});

test("check_harness maps safety pillar result", async () => {
  const cloud = {
    callTool: async () => ({
      stage_results: {
        test: {
          details: {
            safety: {
              status: "pass",
              score: 88,
              summary: "ok",
              pillars: { context: "pass" },
              checks: [{ status: "fail", id: "trust" }],
            },
          },
        },
      },
    }),
  } as any;
  const [tool] = harnessTools(cloud);
  const out = (await tool.handler({ skill_id: "uuid" })) as {
    status: string;
    ready: boolean;
    blocking: unknown[];
  };
  assert.equal(out.status, "pass");
  assert.equal(out.ready, true);
  assert.equal(out.blocking.length, 1);
});
