import { test } from "node:test";
import assert from "node:assert/strict";
import { statusFromRoast, normalizeRoast } from "@/lib/ai/roast";
import type { RoastReport } from "@/lib/types";

const base: RoastReport = {
  poop_score: 7,
  heuristics_violated: ["Consistency and Standards"],
  roast_text: "Bad.",
  fix_suggestion: "Fix it.",
  confidence: 0.9,
  should_moderate: false,
};

test("statusFromRoast: high-confidence safe report auto-approves", () => {
  assert.equal(statusFromRoast({ ...base, confidence: 0.9 }), "approved");
});

test("statusFromRoast: low confidence is rejected", () => {
  assert.equal(statusFromRoast({ ...base, confidence: 0.3 }), "rejected");
});

test("statusFromRoast: mid confidence stays pending for review", () => {
  assert.equal(statusFromRoast({ ...base, confidence: 0.5 }), "pending");
});

test("statusFromRoast: should_moderate forces pending even when confident", () => {
  assert.equal(statusFromRoast({ ...base, confidence: 0.95, should_moderate: true }), "pending");
});

test("normalizeRoast: coerces stringified scalars from Groq tool output", () => {
  const r = normalizeRoast({
    poop_score: "8",
    confidence: "0.82",
    should_moderate: "false",
    heuristics_violated: ["Error Prevention"],
    roast_text: "Yikes.",
    fix_suggestion: "Add labels.",
  });
  assert.equal(r.poop_score, 8);
  assert.equal(r.confidence, 0.82);
  assert.equal(r.should_moderate, false);
});

test("normalizeRoast: clamps out-of-range score and confidence", () => {
  const r = normalizeRoast({
    poop_score: 42,
    confidence: 5,
    should_moderate: false,
    heuristics_violated: [],
    roast_text: "x",
    fix_suggestion: "y",
  });
  assert.equal(r.poop_score, 10);
  assert.equal(r.confidence, 1);
});

test("normalizeRoast: throws on malformed payload", () => {
  assert.throws(() =>
    normalizeRoast({
      poop_score: "not-a-number",
      confidence: 0.5,
      should_moderate: false,
      heuristics_violated: [],
      roast_text: "x",
      fix_suggestion: "y",
    })
  );
});
