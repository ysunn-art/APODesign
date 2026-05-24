import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreEmoji, timeAgo } from "@/lib/format";

test("scoreEmoji: maps score buckets", () => {
  assert.equal(scoreEmoji(null), "❓");
  assert.equal(scoreEmoji(2), "✨");
  assert.equal(scoreEmoji(5), "💩");
  assert.equal(scoreEmoji(8), "💩💩");
  assert.equal(scoreEmoji(10), "💩💩💩");
});

test("timeAgo: recent timestamps render in seconds", () => {
  const tenSecAgo = new Date(Date.now() - 10_000).toISOString();
  assert.match(timeAgo(tenSecAgo), /^\d+s ago$/);
});

test("timeAgo: hours render in hours", () => {
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  assert.equal(timeAgo(threeHoursAgo), "3h ago");
});
