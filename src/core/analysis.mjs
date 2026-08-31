/*
 * KOSIF — طبقة التحليل المهني
 *
 * تربط ميزان المراجعة والقوائم المالية بمحرّك التحليلات الحتمي:
 * النِسب، بنفورد، أعمار الذمم، ألتمان Z، الأهمية النسبية، والعيّنات.
 *
 * الذكاء الاصطناعي لا يدخل هنا إطلاقًا: كل رقم في هذا الملف ناتج عن
 * قاعدة صريحة قابلة لإعادة الإنتاج بنفس المدخلات.
 */

import { computeMateriality, aggregateMisstatements, deterministicSample, moneyToNumber } from './engine.mjs';
import { financialRatios, benfordFirstDigit, altmanZScore, receivablesAging } from './analytics.mjs';
import { round } from './format.mjs';

export const ANALYSIS_VERSION = '1.0.0';

/** يحسب النِسب المالية من القوائم المبنية. */
export function ratiosFromStatements(statements) {
  const p = statements.position;
  const i = statements.income;
  return financialRatios({
    cash: statements.components.cash,
    receivables: statements.components.receivables,
    inventory: statements.components.inventory,
    currentAssets: p.currentAssets.minor,
    totalAssets: p.totalAssets.minor,
    currentLiabilities: p.currentLiabilities.minor,
    totalLiabilities: p.totalLiabilities.minor,
    equity: p.totalEquity.minor,
    revenue: i.revenue.minor,
    cogs: i.cogs.minor,
    netProfit: i.netProfit.minor
  });
}

/** ألتمان Z من القوائم — نسخة الشركات غير المدرجة. */
export function solvencyFromStatements(statements) {
  const p = statements.position;
  const i = statements.income;
  const ta = Number(p.totalAssets.minor);
  if (ta === 0) return { ok: false, error: 'ZERO_TOTAL_ASSETS' };
  const safe = (numerator, denominator) => (denominator === 0 ? 0 : Number(numerator) / denominator);
  const z = altmanZScore({
    wcTa: safe(p.currentAssets.minor - p.currentLiabilities.minor, ta),
    reTa: safe(p.resultForPeriod.minor, ta),
    ebitTa: safe(i.operatingProfit.minor, ta),
    bookEqLiab: safe(p.totalEquity.minor, Number(p.totalLiabilities.minor)),
    salesAssets: safe(i.revenue.minor, ta),
    privateCompany: true
  });
  return { ok: true, ...z };
}

/** اختبار بنفورد على أرصدة الميزان (بالوحدة الرئيسية، لا minor). */
export function benfordFromTrialBalance(trialBalance) {
  const exp = trialBalance.exp ?? 2;
  const amounts = (trialBalance.rows || [])
    .map(row => Math.abs(moneyToNumber({ minor: row.net < 0n ? -row.net : row.net, exp })))
    .filter(value => value >= 1);
  return benfordFirstDigit(amounts);
}

/** الأهمية النسبية من القوائم على الأساس المختار. */
export function materialityFromStatements(statements, { basis = 'profit', riskProfile = 'medium' } = {}) {
  const exp = statements.exp ?? 2;
  const basisMinor = {
    profit: statements.income.netProfit.minor,
    revenue: statements.income.revenue.minor,
    assets: statements.position.totalAssets.minor,
    equity: statements.position.totalEquity.minor
  }[basis] ?? statements.income.netProfit.minor;

  const positive = basisMinor < 0n ? -basisMinor : basisMinor;
  if (positive === 0n) return { ok: false, error: 'MATERIALITY_BASIS_MUST_BE_POSITIVE', basis };
  return computeMateriality({ basis, amount: { minor: positive, exp, ok: true }, riskProfile, exp });
}

export { aggregateMisstatements };

/**
 * عيّنة مراجعة حتمية من أرصدة الميزان.
 * نفس البذرة ونفس المدخلات ⇒ نفس العيّنة حرفيًا، وهو شرط قابلية التدقيق.
 */
export function auditSample(trialBalance, { size = 10, seed = 'kosif', method = 'monetary-unit' } = {}) {
  const items = (trialBalance.rows || []).map(row => ({
    code: row.code,
    name: row.name,
    type: row.type,
    amount: Number(row.net < 0n ? -row.net : row.net)
  }));
  const engineMethod = method === 'monetary-unit' ? 'mus' : method;
  const result = deterministicSample(items, { size, seed, method: engineMethod, amountKey: 'amount' });
  const selected = result.picked || [];
  const populationAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const selectedAmount = selected.reduce((sum, item) => sum + item.amount, 0);
  return {
    method: result.method,
    seed: result.seed,
    requested: size,
    population: items.length,
    selected,
    coveragePct: populationAmount > 0 ? round((selectedAmount / populationAmount) * 100, 2) : 0,
    reproducible: true,
    standard: 'ISA 530 — العينات في المراجعة'
  };
}

/**
 * مؤشر مخاطر مركّب من إشارات مستقلة، كل واحدة بوزن معلن.
 * النتيجة 0–100 حيث الأعلى أخطر، مع تفصيل مساهمة كل إشارة.
 */
export function riskProfile({ trialBalance, statements, benford, ratios }) {
  const signals = [];

  const balanceSignal = trialBalance.balanced ? 0 : 100;
  signals.push({ key: 'balance', label: 'توازن الميزان', weightPct: 30, score: balanceSignal, note: trialBalance.balanced ? 'الميزان متوازن' : 'الميزان غير متوازن — خطر جوهري على كل ما يُبنى فوقه' });

  const unclassifiedRatio = trialBalance.rows.length ? trialBalance.unclassified / trialBalance.rows.length : 0;
  signals.push({ key: 'classification', label: 'اكتمال التصنيف', weightPct: 15, score: Math.min(100, round(unclassifiedRatio * 200, 2)), note: `${trialBalance.unclassified} حساب غير مصنّف` });

  const benfordScore = benford?.ok ? Math.min(100, round(benford.ned * 12, 2)) : 0;
  signals.push({ key: 'benford', label: 'انتظام توزيع الأرقام', weightPct: 20, score: benfordScore, note: benford?.ok ? `NED = ${benford.ned} (${benford.verdict})` : 'عيّنة غير كافية لاختبار بنفورد' });

  const currentRatio = Number(ratios?.liquidity?.currentRatio ?? 0);
  const liquidityScore = currentRatio <= 0 ? 60 : currentRatio >= 200 ? 0 : round((200 - currentRatio) / 2, 2);
  signals.push({ key: 'liquidity', label: 'السيولة', weightPct: 20, score: Math.max(0, Math.min(100, liquidityScore)), note: `نسبة التداول ${currentRatio}%` });

  const articulationScore = statements.articulation.articulated ? 0 : 100;
  signals.push({ key: 'articulation', label: 'اتساق القوائم', weightPct: 15, score: articulationScore, note: statements.articulation.articulated ? 'الأصول = الالتزامات + حقوق الملكية' : 'القوائم غير متسقة' });

  // الأوزان بنقاط مئوية صحيحة ثم قسمة واحدة في النهاية — يتجنّب تراكم خطأ الفاصلة العائمة
  const weighted = signals.reduce((sum, s) => sum + s.score * s.weightPct, 0);
  const index = round(weighted / 100, 2);
  const band = index >= 60 ? 'high' : index >= 30 ? 'medium' : 'low';

  return {
    index,
    band,
    bandLabel: { high: 'مرتفع', medium: 'متوسط', low: 'منخفض' }[band],
    signals,
    method: 'مؤشر مركّب بأوزان معلنة؛ حتمي وقابل للتفسير بندًا بندًا'
  };
}

export { receivablesAging };

/**
 * التحليل الكامل: مدخل واحد يُنتج كل ما تعرضه الواجهة.
 * دالة نقية — لا حالة، لا شبكة، لا ساعة حائط.
 */
export function analyze(trialBalance, statements, options = {}) {
  const ratios = ratiosFromStatements(statements);
  const benford = benfordFromTrialBalance(trialBalance);
  const solvency = solvencyFromStatements(statements);
  const materiality = materialityFromStatements(statements, options.materiality);
  const risk = riskProfile({ trialBalance, statements, benford, ratios });
  return {
    version: ANALYSIS_VERSION,
    ratios,
    benford,
    solvency,
    materiality,
    risk
  };
}
