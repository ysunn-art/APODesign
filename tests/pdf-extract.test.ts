import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePdfConstraints } from "@/lib/pdf/extract";

test("validatePdfConstraints: throws when buffer exceeds 20MB", () => {
  const big = Buffer.alloc(21 * 1024 * 1024);
  assert.throws(
    () => validatePdfConstraints(big),
    /exceeds 20MB/
  );
});

test("validatePdfConstraints: accepts buffer under 20MB", () => {
  const small = Buffer.alloc(1024);
  assert.doesNotThrow(() => validatePdfConstraints(small));
});
