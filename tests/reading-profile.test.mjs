import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
const source = await readFile(
  new URL("../site/journal.js", import.meta.url),
  "utf8",
);
const temp = await mkdtemp(path.join(os.tmpdir(), "journal-profile-test-"));
let module;
try {
  const file = path.join(temp, "journal.mjs");
  await writeFile(file, source);
  module = await import(pathToFileURL(file).href);
} finally {
  await rm(temp, { recursive: true, force: true });
}
const { readingProfile, parseReadingProfile } = module;
const ids = ["edit", "warn", "offline"];
const prefs = { size: "large", spacing: "relaxed", measure: "narrow" };
test("exports the visible known article and only the three supported preferences", () => {
  const p = readingProfile("warn", prefs, ids);
  assert.deepEqual(parseReadingProfile(p, ids), p);
  assert.equal(p.articleId, "warn");
  assert.equal(p.schema, "chumanic.journal.reading-profile/v1");
  assert.deepEqual(p.prefs, prefs);
  assert.notEqual(p.prefs, prefs);
});
test("rejects unknown article and setting values instead of silently choosing a default", () => {
  for (const value of [
    { ...readingProfile("edit", prefs, ids), articleId: "private/article" },
    {
      ...readingProfile("edit", prefs, ids),
      prefs: { ...prefs, size: "huge" },
    },
    {
      ...readingProfile("edit", prefs, ids),
      prefs: { ...prefs, spacing: "wide" },
    },
    {
      ...readingProfile("edit", prefs, ids),
      prefs: { ...prefs, measure: "url" },
    },
  ])
    assert.throws(() => parseReadingProfile(value, ids));
});
test("does not accept a different product, arrays, missing fields or approval metadata", () => {
  const p = readingProfile("edit", prefs, ids);
  for (const value of [
    null,
    [],
    {},
    { ...p, schema: "ordarc.notes.v1" },
    { ...p, approved: true },
    { ...p, prefs: { ...prefs, body: "unselected text" } },
    { articleId: "edit", schema: p.schema },
  ])
    assert.throws(() => parseReadingProfile(value, ids));
});
test("keeps exported and supplied settings detached and does not interpret prototype keys", () => {
  const p = readingProfile("edit", prefs, ids),
    copy = parseReadingProfile(p, ids);
  copy.prefs.size = "normal";
  assert.equal(p.prefs.size, "large");
  const malicious = JSON.parse(
    JSON.stringify(p).replace(
      '"prefs":',
      '"__proto__":{"polluted":true},"prefs":',
    ),
  );
  assert.throws(() => parseReadingProfile(malicious, ids));
  assert.equal({}.polluted, undefined);
});
