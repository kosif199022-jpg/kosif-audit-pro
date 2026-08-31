/*
 * Browser-facing KOSIF pipeline.
 *
 * The numerical modules below are copied byte-for-byte from the reviewed
 * 767d1d1 source. This bridge deliberately excludes the legacy dynamic module
 * loader and adds a fail-closed reliance gate for imported trial balances.
 */

import {
  parseTrialBalance,
  summarizeByType,
  diagnoseTrialBalance,
  largestBalances,
} from "./trial-balance.mjs";
import { buildStatements } from "./statements.mjs";
import {
  analyze,
  auditSample,
  aggregateMisstatements,
  receivablesAging,
} from "./analysis.mjs";
import {
  DEMO_TRIAL_BALANCE,
  DEMO_COMPANY,
  DEMO_RECEIVABLES,
  DEMO_MISSTATEMENTS,
} from "./dataset.mjs";
import { formatMinor, compactMinor, formatNumber } from "./format.mjs";

export const KOSIF_ENGINE_VERSION = "1.1.0-unified";
export const KOSIF_ENGINE_SOURCE = "mahmoud1990@767d1d1";

export function runPipeline(trialBalanceText, options = {}) {
  const trialBalance = parseTrialBalance(trialBalanceText, {
    exp: options.exp,
  });
  const statements = buildStatements(trialBalance);
  const findings = diagnoseTrialBalance(trialBalance);
  const analysis = analyze(trialBalance, statements, options);
  const sample = auditSample(trialBalance, options.sample);
  const misstatements = analysis.materiality.ok
    ? aggregateMisstatements(
        options.misstatements ?? DEMO_MISSTATEMENTS,
        analysis.materiality,
      )
    : null;
  const aging = receivablesAging(
    options.receivables ?? DEMO_RECEIVABLES,
  );

  const blockers = [];
  if (!trialBalance.ok) blockers.push("IMPORT_INVALID");
  if (!trialBalance.balanced) blockers.push("TRIAL_BALANCE_UNBALANCED");
  if (trialBalance.unclassified > 0) blockers.push("UNCLASSIFIED_ACCOUNTS");
  if (!statements.articulation.articulated) {
    blockers.push("STATEMENTS_NOT_ARTICULATED");
  }

  return {
    version: KOSIF_ENGINE_VERSION,
    source: KOSIF_ENGINE_SOURCE,
    company: options.company ?? DEMO_COMPANY,
    trialBalance,
    byType: summarizeByType(trialBalance),
    largest: largestBalances(trialBalance, options.largestLimit ?? 8),
    statements,
    analysis,
    findings,
    sample,
    misstatements,
    aging,
    reliance: {
      canRely: blockers.length === 0,
      blockers,
      rule:
        "لا اعتماد للقوائم أو التقرير قبل صحة الاستيراد واتزان الميزان واكتمال التصنيف واتساق القوائم.",
    },
  };
}

export function runDemo(options = {}) {
  return runPipeline(DEMO_TRIAL_BALANCE, options);
}

export {
  DEMO_TRIAL_BALANCE,
  DEMO_COMPANY,
  formatMinor,
  compactMinor,
  formatNumber,
};


