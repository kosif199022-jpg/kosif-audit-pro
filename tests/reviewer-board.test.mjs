import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDeterministicReviewerBoard,
} from "../lib/reviewer-board.ts";
import { runDemo, runPipeline } from "../lib/kosif/browser.mjs";

function exactJson(value) {
  return JSON.stringify(value, (_key, item) =>
    typeof item === "bigint" ? `${item}n` : item,
  );
}

test("لوحة المراجعين حتمية وكاملة الحقول ولا تعدّل نتيجة المسار", () => {
  const result = runDemo();
  const before = exactJson(result);
  const first = buildDeterministicReviewerBoard(result);
  const second = buildDeterministicReviewerBoard(result);

  assert.deepEqual(first, second);
  assert.equal(exactJson(result), before);
  assert.ok(first.length >= 7);

  for (const note of first) {
    assert.equal(note.origin, "deterministic");
    assert.equal(note.reviewer, "المراجع الحتمي");
    assert.match(note.id, /^DET-A\d{2}-/);
    assert.match(note.roundId, /^A(?:0[1-9]|10)$/);
    assert.ok(note.role);
    assert.ok(note.severity);
    assert.ok(note.title);
    assert.ok(note.message);
    assert.equal(typeof note.numericBasis.value, "string");
    assert.ok(note.numericBasis.label);
    assert.ok(note.citations.length > 0);
    assert.ok(note.suggestedAction);
    assert.ok(note.limitation);
    assert.equal(Object.hasOwn(note, "opinion"), false);
  }
});

test("تبقى فروق الأموال الكبيرة سلاسل BigInt دقيقة في الملاحظات", () => {
  const exactMajor = "9007199254740993.27";
  const exactMinor = "900719925474099327";
  const result = runPipeline(`الكود,اسم الحساب,مدين,دائن
1010,النقد,${exactMajor},0
3010,رأس المال,0,0`);

  const notes = buildDeterministicReviewerBoard(result);
  const trialBalanceNote = notes.find(
    (note) => note.id === "DET-A02-TRIAL-BALANCE",
  );
  const articulationNote = notes.find(
    (note) => note.id === "DET-A08-ARTICULATION",
  );

  assert.equal(trialBalanceNote.numericBasis.value, exactMinor);
  assert.equal(articulationNote.numericBasis.value, exactMinor);
  assert.equal(typeof trialBalanceNote.numericBasis.value, "string");
  assert.doesNotMatch(JSON.stringify(notes), /"opinion"/i);
});

test("تسجل اللوحة موانع الاعتماد والتصنيف دون إصدار رأي", () => {
  const result = runPipeline(`الكود,اسم الحساب,مدين,دائن
1010,النقد,100.00,0
9990,حساب غامض,0,99.00`);
  const notes = buildDeterministicReviewerBoard(result);

  assert.equal(
    notes.find((note) => note.id === "DET-A02-RELIANCE")?.severity,
    "critical",
  );
  assert.equal(
    notes.find((note) => note.id === "DET-A02-CLASSIFICATION")
      ?.numericBasis.value,
    "1",
  );
  assert.ok(notes.some((note) => note.id === "DET-A04-BENFORD"));
  assert.ok(notes.some((note) => note.id === "DET-A04-RISK-INDEX"));
});
