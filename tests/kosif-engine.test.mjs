import assert from "node:assert/strict";
import test from "node:test";

import {
  DEMO_TRIAL_BALANCE,
  formatMinor,
  runDemo,
  runPipeline,
} from "../lib/kosif/browser.mjs";

function stringifyDeterministically(value) {
  return JSON.stringify(value, (_key, item) =>
    typeof item === "bigint" ? `${item}n` : item,
  );
}

test("بيانات العرض متوازنة وصالحة للاعتماد", () => {
  const result = runDemo();

  assert.equal(result.trialBalance.ok, true);
  assert.equal(result.trialBalance.rows.length, 26);
  assert.equal(
    result.trialBalance.totals.debit,
    result.trialBalance.totals.credit,
  );
  assert.equal(result.trialBalance.difference, 0n);
  assert.equal(result.trialBalance.balanced, true);
  assert.deepEqual(result.reliance.blockers, []);
  assert.equal(result.reliance.canRely, true);
});

test("بوابة الاعتماد تغلق عند عدم اتزان ميزان المراجعة", () => {
  const unbalanced = `الكود,اسم الحساب,مدين,دائن
1010,النقد,100.00,0
3010,رأس المال,0,99.00`;

  const result = runPipeline(unbalanced);

  assert.equal(result.trialBalance.ok, true);
  assert.equal(result.trialBalance.balanced, false);
  assert.equal(result.trialBalance.difference, 100n);
  assert.equal(result.reliance.canRely, false);
  assert.ok(
    result.reliance.blockers.includes("TRIAL_BALANCE_UNBALANCED"),
  );
});

test("التصنيف والقوائم متسقان وكاملان في بيانات العرض", () => {
  const result = runPipeline(DEMO_TRIAL_BALANCE);
  const classifiedRows = result.byType.reduce(
    (count, bucket) => count + bucket.count,
    0,
  );

  assert.equal(classifiedRows, result.trialBalance.rows.length);
  assert.equal(result.trialBalance.unclassified, 0);
  assert.deepEqual(result.statements.unmapped, []);
  assert.equal(result.statements.articulation.articulated, true);
  assert.equal(result.statements.articulation.balanceCheckMinor, 0n);
  assert.ok(
    !result.reliance.blockers.includes("UNCLASSIFIED_ACCOUNTS"),
  );
  assert.ok(
    !result.reliance.blockers.includes("STATEMENTS_NOT_ARTICULATED"),
  );
});

test("إعادة تشغيل النواة حتمية مع تسلسل BigInt صريح", () => {
  const first = stringifyDeterministically(runDemo());
  const second = stringifyDeterministically(runDemo());

  assert.equal(first, second);
  assert.match(first, /"debit":"\d+n"/);
  assert.match(first, /"balanceCheckMinor":"0n"/);
});

test("تحافظ النواة على مبلغ يتجاوز Number.MAX_SAFE_INTEGER بدقة", () => {
  const exactMajor = "9007199254740993.27";
  const expectedMinor = 900719925474099327n;
  const oversized = `الكود,اسم الحساب,مدين,دائن
1010,النقد,${exactMajor},0
3010,رأس المال,0,${exactMajor}`;

  const result = runPipeline(oversized);

  assert.equal(result.trialBalance.rows[0].debit, expectedMinor);
  assert.equal(result.trialBalance.rows[1].credit, expectedMinor);
  assert.equal(result.trialBalance.totals.debit, expectedMinor);
  assert.equal(result.trialBalance.totals.credit, expectedMinor);
  assert.equal(result.statements.position.totalAssets.minor, expectedMinor);
  assert.equal(result.statements.position.totalEquity.minor, expectedMinor);
  assert.equal(result.statements.articulation.balanceCheckMinor, 0n);
  assert.equal(result.reliance.canRely, true);
  assert.equal(formatMinor(expectedMinor), "9,007,199,254,740,993.27");
});
