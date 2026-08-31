/*
 * KOSIF Analytics Engine v52 — التحليل المالي السينمائي
 * محرك حتمي بالكامل: نسب مالية، قانون بنفورد، أعمار الديون، ألتمان Z،
 * كشف الشذوذ، ومؤشر مخاطر مركّب. لا عشوائية ولا AI — كل المخرجات قابلة لإعادة الإنتاج.
 * الأموال بأعداد صحيحة (هللة/minor units) وفق عقد KOSIF للنقود الموثوقة.
 */

export const ANALYTICS_VERSION = '52.0.0';
export const ANALYTICS_BUILD_ID = '2026.08.23-kosif-cinema-analytics';

/* ---------- أدوات مساعدة حتمية ---------- */

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pct = (num, den) => den > 0n ? Number((num * 10000n) / den) / 100 : null;

/* ---------- النسب المالية (مدخلات بأعداد صحيحة minor) ---------- */
/**
 * يحسب مجموعة النسب الأساسية من ميزان المراجعة المجمع.
 * كل المدخلات BigInt بوحدة الصغرى.
 */
export function financialRatios({ cash, receivables, inventory, currentAssets, totalAssets,
  currentLiabilities, totalLiabilities, equity, revenue, cogs, netProfit }) {
  const workingCapital = currentAssets - currentLiabilities;
  return {
    version: ANALYTICS_VERSION,
    liquidity: {
      currentRatio: pct(currentAssets, currentLiabilities),
      quickRatio: pct(currentAssets - inventory, currentLiabilities),
      cashRatio: pct(cash, currentLiabilities),
      workingCapitalMinor: workingCapital.toString()
    },
    profitability: {
      grossMarginPct: pct(revenue - cogs, revenue),
      netMarginPct: pct(netProfit, revenue),
      roaPct: pct(netProfit, totalAssets),
      roePct: pct(netProfit, equity)
    },
    leverage: {
      debtToEquity: pct(totalLiabilities, equity),
      debtToAssets: pct(totalLiabilities, totalAssets),
      equityRatio: pct(equity, totalAssets)
    },
    efficiency: {
      receivablesTurnover: pct(revenue, receivables),
      inventoryTurnover: pct(cogs, inventory)
    }
  };
}

/* ---------- قانون بنفورد ---------- */
const BENFORD_EXPECTED = [30.1, 17.6, 12.5, 9.7, 7.9, 6.7, 5.8, 5.1, 4.6];

/**
 * يفحص توزيع الرقم الأول للأمام الموجبة مقابل قانون بنفورد.
 * amounts: أعداد موجبة (بالريال الرئيسية أو أي مقياس متسق).
 * يعيد النسب الفعلية والمتوقعة وNED وإشارة الانحراف لكل رقم.
 */
export function benfordFirstDigit(amounts) {
  const counts = new Array(9).fill(0);
  let n = 0;
  for (const raw of amounts) {
    const v = Math.abs(Number(raw));
    if (!isFinite(v) || v < 1) continue;
    const d = Number(String(Math.trunc(v)).replace(/^0+/, '')[0] || '0');
    if (d >= 1 && d <= 9) { counts[d - 1]++; n++; }
  }
  if (n === 0) return { ok: false, error: 'BENFORD_NO_DATA', counts: [], expected: BENFORD_EXPECTED };
  const actual = counts.map(c => (c / n) * 100);
  // إحصاء NED (Normalized Euclidean Distance) — 0 تطابق تام، أعلى أسوأ
  let ned = 0;
  for (let i = 0; i < 9; i++) ned += (actual[i] - BENFORD_EXPECTED[i]) ** 2;
  ned = Math.sqrt(ned / 9);
  const digits = actual.map((a, i) => ({
    digit: i + 1,
    expectedPct: BENFORD_EXPECTED[i],
    actualPct: Math.round(a * 10) / 10,
    count: counts[i],
    deviationPct: Math.round((a - BENFORD_EXPECTED[i]) * 10) / 10,
    flagged: Math.abs(a - BENFORD_EXPECTED[i]) > 5 // انحراف > 5 نقاط مئوية يستدعي الفحص
  }));
  return {
    ok: true, sampleSize: n,
    ned: Math.round(ned * 100) / 100,
    verdict: ned <= 2 ? 'MATCH' : ned <= 5 ? 'REVIEW' : 'INVESTIGATE',
    digits,
    method: 'Benford First-Digit vs expected frequencies; NED threshold 2/5; deterministic'
  };
}

/* ---------- أعمار الذمم ---------- */
/**
 * buckets: مصفوفة {code, name, daysOutstanding, minor}
 * يعيد تجميعًا حسب الشرائح مع نسب وتقدير خسارة ائتمانية ECL مبسط.
 */
const AGING_BUCKETS = [
  { key: 'current', label: 'غير مستحق بعد', maxDays: 0, eclPct: 1 },
  { key: 'd30', label: '1–30 يومًا', maxDays: 30, eclPct: 2 },
  { key: 'd60', label: '31–60 يومًا', maxDays: 60, eclPct: 5 },
  { key: 'd90', label: '61–90 يومًا', maxDays: 90, eclPct: 10 },
  { key: 'd180', label: '91–180 يومًا', maxDays: 180, eclPct: 25 },
  { key: 'dOver', label: 'أكثر من 180 يومًا', maxDays: Infinity, eclPct: 50 }
];

export function receivablesAging(entries) {
  const buckets = AGING_BUCKETS.map(b => ({ ...b, minor: 0n, count: 0 }));
  let total = 0n;
  for (const e of entries || []) {
    const minor = BigInt(e.minor ?? 0);
    if (minor <= 0n) continue;
    total += minor;
    const b = AGING_BUCKETS.find(b => (e.daysOutstanding ?? 0) <= b.maxDays);
    const slot = buckets.find(x => x.key === b.key);
    slot.minor += minor; slot.count++;
  }
  let weightedEcl = 0n;
  for (const b of buckets) weightedEcl += (b.minor * BigInt(b.eclPct)) / 100n;
  return {
    buckets: buckets.map(({ key, label, minor, count, eclPct }) => ({
      key, label, count, eclPct,
      minor: minor.toString(),
      shareOfTotalPct: pct(minor, total)
    })),
    totalMinor: total.toString(),
    provisionEclMinor: weightedEcl.toString(),
    standard: 'IFRS 9 simplified approach — provision matrix; deterministic percentages'
  };
}

/* ---------- ألتمان Z (نسخة عامة للشركات غير المساهمة العامة) ---------- */
/**
 * مدخلات بالنسبة المالية كأرقام (وليس minor): 
 * wc/ta, re/ta, ebit/ta, equity/liabilities, sales/assets
 */
export function altmanZScore({ wcTa, reTa, ebitTa, bookEqLiab, salesAssets, privateCompany = true }) {
  let z = 1.2 * wcTa + 1.4 * reTa + 3.3 * ebitTa + 0.6 * bookEqLiab + 1.0 * salesAssets;
  if (!privateCompany) z += 0.4 * bookEqLiab; // نسخة A-Z'-prime تقريب توضيحي
  const zone = z > 2.9 ? 'SAFE' : z > 1.23 ? 'GREY' : 'DISTRESS';
  return { z: Math.round(z * 100) / 100, zone, model: privateCompany ? 'Altman Z\" (private)' : 'Altman Z', thresholds: { safe: 2.9, distress: 1.23 } };
}

/* ---------- مؤشر المخاطر المركّب ---------- */
/**
 * يجمع مخرجات المحرك في بطاقة مخاطر واحدة 0-100 حتمية:
 * بنفورد، أعمار، سيولة، رافعة، شذوذ القيود.
 */
export function compositeRiskIndex({ benfordResult, agingResult, ratios, anomalyCount, entryCount }) {
  const parts = [];
  if (benfordResult?.ok) {
    parts.push({ id: 'benford', weight: 25, score: Math.min(100, Math.round(benfordResult.ned * 12)) });
  }
  if (agingResult?.buckets) {
    const over90 = agingResult.buckets.filter(b => ['d90', 'd180', 'dOver'].includes(b.key))
      .reduce((s, b) => s + (b.shareOfTotalPct ?? 0), 0);
    parts.push({ id: 'aging', weight: 20, score: Math.min(100, Math.round(over90 * 2.5)) });
  }
  if (ratios?.liquidity?.currentRatio != null) {
    // تقبل نسبة عشرية (1.4) أو مئوية (140) — توحيد المقياس حتميًا
    const rawCr = ratios.liquidity.currentRatio;
    const cr = Math.abs(rawCr) > 10 ? rawCr / 100 : rawCr;
    parts.push({ id: 'liquidity', weight: 20, score: cr >= 2 ? 10 : cr >= 1 ? 40 : cr >= 0.5 ? 75 : 95 });
  }
  if (ratios?.leverage?.debtToEquity != null) {
    const de = ratios.leverage.debtToEquity;
    parts.push({ id: 'leverage', weight: 15, score: de <= 50 ? 15 : de <= 150 ? 45 : de <= 300 ? 70 : 92 });
  }
  if (entryCount > 0) {
    const rate = (anomalyCount / entryCount) * 100;
    parts.push({ id: 'anomalies', weight: 20, score: Math.min(100, Math.round(rate * 8)) });
  }
  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  const index = parts.reduce((s, p) => s + p.score * p.weight, 0) / (totalWeight || 1);
  const level = index >= 70 ? 'CRITICAL' : index >= 45 ? 'ELEVATED' : index >= 25 ? 'MODERATE' : 'LOW';
  return {
    index: Math.round(index * 10) / 10,
    level,
    parts,
    method: 'Weighted deterministic composite; no randomness; human review still required'
  };
}

/* ---------- كشف شذوذ القيود ---------- */
const SUSPICIOUS_WORDS = ['تسوية', 'يدوي', 'عجل', 'خاص', 'تصفير', 'مؤقت'];

/**
 * قواعد حتمية لكشف أنماط القيود الخطرة — نفس روح journalRiskFlags لكن موسعة:
 * round amounts، ذروة نهاية الفترة، كلمات مشبوهة، مستخدم مميز، مبالغ فوق العتبة.
 */
export function detectAnomalies(journals, ctx = {}) {
  const {
    amountThresholdMajor = 5_000_000,
    privilegedUsers = [],
    periodEndMonth = 12,
    suspenseCodes = []
  } = ctx;
  const priv = new Set(privilegedUsers);
  const susp = new Set(suspenseCodes);
  const out = [];
  for (const j of journals || []) {
    const flags = [];
    let maxAmount = 0;
    let touchesSuspense = false;
    for (const l of j.lines || []) {
      const amt = Math.abs(Number(String(l.dr || l.cr || '0').replace(/,/g, '')));
      if (amt > maxAmount) maxAmount = amt;
      if (susp.has(l.account)) touchesSuspense = true;
    }
    if (maxAmount >= amountThresholdMajor) flags.push('LARGE_AMOUNT');
    if (/^-?[\d]{1,3}(000){1,}\.00$/.test(String(maxAmount))) flags.push('ROUND_AMOUNT');
    const month = Number(String(j.date || '').slice(5, 7));
    const day = Number(String(j.date || '').slice(8, 10));
    if (month === periodEndMonth && day >= 28) flags.push('PERIOD_END_SPIKE');
    if (priv.has(j.user)) flags.push('PRIVILEGED_USER');
    if (j.source === 'manual') flags.push('MANUAL_SOURCE');
    if (touchesSuspense) flags.push('SUSPENSE_TOUCH');
    const memo = String(j.memo || '');
    if (SUSPICIOUS_WORDS.some(w => memo.includes(w))) flags.push('SUSPICIOUS_MEMO');
    if ((j.lines || []).length >= 6) flags.push('COMPLEX_ENTRY');
    if (flags.length) out.push({ id: j.id, date: j.date, memo: memo.slice(0, 80), user: j.user, maxAmount, flags });
  }
  return out;
}

/* ---------- تحليل شهري ---------- */
export function monthlyTrend(journals, year) {
  const toMinor = s => {
    const clean = String(s ?? '0').replace(/,/g, '');
    const neg = clean.startsWith('-');
    const raw = neg ? clean.slice(1) : clean;
    const [w, f = ''] = raw.split('.');
    const n = BigInt(w || '0') * 100n + BigInt((f || '00').padEnd(2, '0').slice(0, 2));
    return neg ? -n : n;
  };
  const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, label: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][i], debitMinor: 0n, count: 0 }));
  for (const j of journals || []) {
    const m = Number(String(j.date || '').slice(5, 7));
    if (!(m >= 1 && m <= 12)) continue;
    months[m - 1].count++;
    for (const l of j.lines || []) months[m - 1].debitMinor += toMinor(l.dr);
  }
  return months.map(m => ({
    month: m.month, label: m.label, count: m.count,
    volumeMinor: m.debitMinor.toString(),
    volumeMajor: Number(m.debitMinor / 100n)
  }));
}



