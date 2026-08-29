import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyReviewToFile,
  effectiveReviewState,
  hashBody,
  readSkillParts,
} from "./skillReview.js";

const BASE = `---
name: demo
description: Triggered when testing; validates review flow.
review:
  state: draft
---

# Demo

Body v1.
`;

describe("review state machine", () => {
  it("starts as draft", () => {
    const parts = readSkillParts(BASE);
    assert.equal(parts.review_state, "draft");
  });

  it("resets to draft when approved body changes", () => {
    const approved = applyReviewToFile(BASE, {
      state: "approved",
      approved_hash: hashBody(readSkillParts(BASE).body),
      approved_trust: 90,
    });
    const edited = approved.replace("Body v1.", "Body v2.");
    const state = effectiveReviewState(readSkillParts(edited).body, readSkillParts(edited).review);
    assert.equal(state, "draft");
  });

  it("stays approved when body unchanged", () => {
    const approved = applyReviewToFile(BASE, {
      state: "approved",
      approved_hash: hashBody(readSkillParts(BASE).body),
    });
    const state = effectiveReviewState(readSkillParts(approved).body, readSkillParts(approved).review);
    assert.equal(state, "approved");
  });
});
