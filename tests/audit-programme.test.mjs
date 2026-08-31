import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  auditRounds,
  evaluateAuditRounds,
  getAuditGateSummary,
  getNextAuditAction,
} from "../lib/audit-workspace.ts";
import { runDemo, runPipeline } from "../lib/kosif/browser.mjs";

test("برنامج المراجعة عشر جولات و26 بوابة مفسرة", () => {
  assert.equal(auditRounds.length, 10);
  assert.deepEqual(
    auditRounds.map((round) => round.id),
    ["A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09", "A10"],
  );
  assert.equal(auditRounds.flatMap((round) => round.gates).length, 26);

  for (const round of auditRounds) {
    assert.ok(round.standards.length > 0);
    for (const gate of round.gates) {
      assert.ok(gate.reason);
      assert.ok(Array.isArray(gate.missing));
      assert.ok(["open", "blocked", "pending_human"].includes(gate.status));
    }
  }
});

test("الإجراء التالي يأتي من أول بوابة غير مفتوحة مع النواقص", () => {
  const next = getNextAuditAction(evaluateAuditRounds(runDemo()));
  assert.equal(next?.roundId, "A02");
  assert.equal(next?.gateId, "related");
  assert.ok(next?.missing.length > 0);
});

test("ميزان غير متوازن يغلق بوابات البيانات والرأي المشتق", () => {
  const pipeline = runPipeline(`الكود,اسم الحساب,مدين,دائن
1010,النقد,100.00,0
3010,رأس المال,0,99.00`);
  const rounds = evaluateAuditRounds(pipeline);
  const chart = rounds.find((round) => round.id === "A02")
    ?.gates.find((gate) => gate.id === "chart");
  const derivedOpinion = rounds.find((round) => round.id === "A10")
    ?.gates.find((gate) => gate.id === "derived-opinion");

  assert.equal(pipeline.reliance.canRely, false);
  assert.equal(chart?.status, "blocked");
  assert.ok(chart?.missing.includes("TRIAL_BALANCE_UNBALANCED"));
  assert.equal(derivedOpinion?.status, "blocked");
  assert.match(derivedOpinion?.reason ?? "", /لا يمكن اشتقاق/);
});

test("ملخص البوابات يطابق العد ولا يعتبر الحكم البشري مفتوحًا", () => {
  const summary = getAuditGateSummary(evaluateAuditRounds(runDemo()));
  assert.equal(summary.total, 26);
  assert.equal(summary.open + summary.blocked + summary.pendingHuman, 26);
  assert.ok(summary.pendingHuman >= 1);
  assert.ok(summary.progressPct > 0 && summary.progressPct < 100);
});

test("الواجهة لا تقدم حقلًا لاختيار الرأي يدويًا", async () => {
  const [workspace, views] = await Promise.all([
    readFile(new URL("../components/kosif/workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/kosif/views.tsx", import.meta.url), "utf8"),
  ]);
  const source = `${workspace}\n${views}`;

  assert.doesNotMatch(source, /name=["']opinion["']/i);
  assert.doesNotMatch(source, /id=["']opinion["']/i);
  assert.doesNotMatch(source, /value=["'](?:unmodified|qualified|adverse|disclaimer)["']/i);
  assert.match(source, /لا يوجد حقل لاختيار الرأي/);
});
