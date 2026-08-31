/*
 * KOSIF v38 — Trusted Audit Intelligence OS
 * Deterministic accounting core.
 *
 * الحاكمية: كل حساب مالي، قيد، ميزان مراجعة، أهمية نسبية، عينة، أو ثابت محاسبي
 * يُحسب هنا حسابًا حتميًا بدون أرقام عشرية عائمة وبدون تدخل نموذج لغوي.
 * الذكاء الاصطناعي يحلل ويفسر ويصوغ؛ لا يقيّد قيدًا ولا يحسب رقمًا نهائيًا مساءلًا عليه.
 *
 * بيئة التشغيل: Node.js >= 18 و Cloudflare Workers (بدون تبعيات خارجية).
 */
export const V38_CORE_VERSION = '38.0.0';
export const V38_BUILD_ID = '2026.08.19-v38-trusted-audit-os';

/* ============================================================
 * 1) تطبيع الأرقام العربية/الفارسية والفواصل
 * ============================================================ */
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function normalizeDigits(input) {
  let s = String(input ?? '');
  let out = '';
  for (const ch of s) {
    const ar = AR_DIGITS.indexOf(ch);
    if (ar >= 0) { out += String(ar); continue; }
    const fa = FA_DIGITS.indexOf(ch);
    if (fa >= 0) { out += String(fa); continue; }
    out += ch;
  }
  // فاصلة عشرية عربية ٫ → نقطة، فاصلة آلاف عربية ٬ → إزالة
  return out.replace(/\u066B/g, '.').replace(/\u066C/g, '');
}

/* ============================================================
 * 2) المال: تمثيل دقيق بوحدات صغرى (minor units) عبر BigInt
 * ============================================================ */
const CURRENCY_DECIMALS = { SAR: 2, USD: 2, EUR: 2, GBP: 2, AED: 2, KWD: 3, BHD: 3, OMR: 3, JOD: 3, IQD: 3, LYD: 3, TND: 3, JPY: 0, KRW: 0 };

export function currencyExp(currency) {
  return CURRENCY_DECIMALS[String(currency || 'SAR').toUpperCase()] ?? 2;
}

/**
 * تحليل مبلغ نصي إلى وحدات صغرى BigInt بدون تمرير عبر float.
 * يقبل: "1,240,500.75" "(1,000.50)" "١٢٣٤٫٥٠" "1.000,50" (ألماني/عربي أوروبي)
 * "500 CR" "500 DR" "ر.س 100".
 */
export function parseMoney(input, opts = {}) {
  const exp = Number.isInteger(opts.exp) && opts.exp >= 0 && opts.exp <= 8 ? opts.exp : currencyExp(opts.currency);
  let s = normalizeDigits(input).trim();
  if (!s) return { ok: false, error: 'EMPTY_AMOUNT' };
  let negative = false;
  const paren = /^\(.*\)$/.test(s);
  if (paren) { negative = true; s = s.slice(1, -1).trim(); }
  if (/\bCR\b/i.test(s)) { negative = true; s = s.replace(/\bCR\b/i, ''); }
  if (/\bDR\b/i.test(s)) { s = s.replace(/\bDR\b/i, ''); }
  s = s.replace(/[\u066B]/g, '.');
  // إزالة رموز العملات والمسافات
  s = s.replace(/(SAR|USD|EUR|GBP|AED|KWD|BHD|OMR|JOD|JPY|ر\.?س|ريال|درهم|دينار|\$|€|£)/gi, '').trim();
  // نمط أوروبي 1.234,56 → 1234.56
  const euMatch = s.match(/^(-?)(\d{1,3}(?:\.\d{3})+,\d+)$/);
  if (euMatch) s = (euMatch[1] || '') + s.replace(/\./g, '').replace(',', '.');
  // إزالة فواصل الآلاف والفواصل العربية
  s = s.replace(/,/g, '').replace(/\u066C/g, '').replace(/\s+/g, '');
  if (/^-/.test(s)) { negative = true; s = s.slice(1); }
  if (!/^\d+(\.\d+)?$/.test(s)) return { ok: false, error: 'INVALID_AMOUNT_FORMAT' };
  let [intPart, fracPart = ''] = s.split('.');
  if (fracPart.length > exp) return { ok: false, error: `FRACTION_EXCEEDS_PRECISION_${exp}` };
  fracPart = fracPart.padEnd(exp, '0');
  let minor = BigInt(intPart + fracPart);
  if (negative && minor !== 0n) minor = -minor;
  return { ok: true, minor, exp };
}

export function moneyFromMajor(units, exp = 2) {
  // للاستخدام في المدخلات الصحيحة فقط؛ الكسور تُمرر كسلسلة عبر parseMoney
  const s = String(units ?? '0');
  const r = parseMoney(s, { exp });
  if (!r.ok) throw new Error('MONEY_FROM_MAJOR_FAILED: ' + r.error);
  return { minor: r.minor, exp };
}

export function moneyNeg(m) { return { minor: -m.minor, exp: m.exp }; }
export function moneyAdd(...ms) {
  if (!ms.length) return { minor: 0n, exp: 2 };
  const exp = ms[0].exp;
  for (const m of ms) if (m.exp !== exp) throw new Error('MONEY_EXP_MISMATCH');
  return { minor: ms.reduce((a, m) => a + m.minor, 0n), exp };
}
export function moneySub(a, b) {
  if (a.exp !== b.exp) throw new Error('MONEY_EXP_MISMATCH');
  return { minor: a.minor - b.minor, exp: a.exp };
}
export function moneyCmp(a, b) {
  if (a.exp !== b.exp) throw new Error('MONEY_EXP_MISMATCH');
  return a.minor < b.minor ? -1 : a.minor > b.minor ? 1 : 0;
}
export function moneyIsZero(m) { return m.minor === 0n; }
export function moneyAbs(m) { return { minor: m.minor < 0n ? -m.minor : m.minor, exp: m.exp }; }

export function formatMoney(m, opts = {}) {
  const neg = m.minor < 0n;
  let abs = neg ? -m.minor : m.minor;
  const sign = neg ? '-' : '';
  const intStr = (abs / 10n ** BigInt(m.exp)).toString();
  const frac = m.exp > 0 ? (abs % 10n ** BigInt(m.exp)).toString().padStart(m.exp, '0') : '';
  const grouped = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, opts.groupSep ?? ',');
  return sign + grouped + (frac ? '.' + frac : '');
}

export function moneyToNumber(m) { return Number(m.minor) / 10 ** m.exp; }

/* ============================================================
 * 3) دفتر اليومية: التحقق والترحيل غير القابل للتغيير
 * ============================================================ */
export const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense', 'contra', 'suspense'];

export function validateJournalEntry(entry, ctx = {}) {
  const errors = [];
  const id = String(entry?.id || '').trim();
  if (!id) errors.push({ code: 'ENTRY_ID_REQUIRED', message: 'معرّف القيد مطلوب' });
  const date = String(entry?.date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push({ code: 'ENTRY_DATE_INVALID', message: 'تاريخ القيد يجب أن يكون بصيغة YYYY-MM-DD' });
  if (ctx.periodStart && date && date < ctx.periodStart) errors.push({ code: 'ENTRY_BEFORE_PERIOD', message: `القيد قبل بداية الفترة (${ctx.periodStart})` });
  if (ctx.periodEnd && date && date > ctx.periodEnd) errors.push({ code: 'ENTRY_AFTER_PERIOD', message: `القيد بعد نهاية الفترة (${ctx.periodEnd})` });
  const rawLines = Array.isArray(entry?.lines) ? entry.lines : [];
  if (rawLines.length < 2) errors.push({ code: 'ENTRY_MIN_TWO_LINES', message: 'القيد يحتاج سطرين على الأقل (مدين/دائن)' });

  const known = ctx.accounts instanceof Map ? ctx.accounts : null;
  const lines = [];
  let dr = 0n, cr = 0n;
  const exp = Number.isInteger(ctx.exp) ? ctx.exp : 2;
  for (let i = 0; i < rawLines.length; i++) {
    const ln = rawLines[i] || {};
    const code = String(ln.account || '').trim();
    if (!code) { errors.push({ code: 'LINE_ACCOUNT_REQUIRED', line: i, message: `السطر ${i + 1}: الحساب مطلوب` }); continue; }
    if (known && !known.has(code)) errors.push({ code: 'LINE_ACCOUNT_UNKNOWN', line: i, account: code, message: `الحساب ${code} غير معرّف في دليل الحسابات` });
    const drP = parseMoney(ln.dr ?? 0, { exp }), crP = parseMoney(ln.cr ?? 0, { exp });
    if (!drP.ok) { errors.push({ code: 'LINE_DR_INVALID', line: i, message: `السطر ${i + 1}: المدين غير صالح` }); continue; }
    if (!crP.ok) { errors.push({ code: 'LINE_CR_INVALID', line: i, message: `السطر ${i + 1}: الدائن غير صالح` }); continue; }
    const hasDr = drP.minor !== 0n, hasCr = crP.minor !== 0n;
    if (hasDr && hasCr) { errors.push({ code: 'LINE_BOTH_SIDES', line: i, message: `السطر ${i + 1}: لا يمكن أن يكون السطر مدينًا ودائنًا معًا` }); continue; }
    if (!hasDr && !hasCr) { errors.push({ code: 'LINE_ZERO', line: i, message: `السطر ${i + 1}: سطر صفري` }); continue; }
    dr += drP.minor; cr += crP.minor;
    lines.push({ account: code, dr: hasDr ? drP.minor : null, cr: hasCr ? crP.minor : null, desc: String(ln.desc || '') });
  }
  const balanced = dr === cr;
  if (!balanced && rawLines.length) errors.push({ code: 'ENTRY_NOT_BALANCED', message: `القيد غير متوازن: مدين ${dr} مقابل دائن ${cr} (وحدات صغرى)` });
  return { ok: errors.length === 0, errors, balanced, totals: { dr: { minor: dr, exp }, cr: { minor: cr, exp } }, lines };
}

function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  const keys = Object.keys(value).filter(k => value[k] !== undefined).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalJson(value[k])).join(',') + '}';
}
export { canonicalJson };

export async function sha256Hex(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text)));
  return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, '0')).join('');
}

/** بصمة القيد: سلسلة تجزئة ترحيل غير قابلة للتغيير (بدون ساعة حائط). */
export async function entryFingerprint(entry, prevHash) {
  const payload = canonicalJson({
    v: 1, id: String(entry.id || ''), date: String(entry.date || ''),
    memo: String(entry.memo || ''), ref: String(entry.ref || ''),
    user: String(entry.user || ''), lines: (entry.lines || []).map(l => ({ a: String(l.account || ''), d: l.dr == null ? null : String(l.dr), c: l.cr == null ? null : String(l.cr) }))
  });
  return sha256Hex((prevHash || 'GENESIS') + '\n' + payload);
}

/**
 * ترحيل قيد: يعيد دفترًا جديدًا (immutable) ولا يعدل الأصل.
 * القيد المرحّل يحمل seq وhash وprevHash فقط — لا طابع زمني غير حتمي.
 */
export async function postJournal(ledger, entry, ctx = {}) {
  const v = validateJournalEntry(entry, { ...ctx, accounts: ledger.accounts });
  if (!v.ok) return { ok: false, errors: v.errors, posted: null, ledger };
  const postings = [...(ledger.postings || [])];
  const prevHash = postings.length ? postings[postings.length - 1].hash : null;
  const seq = postings.length + 1;
  const frozen = { id: String(entry.id), date: entry.date, memo: String(entry.memo || ''), ref: String(entry.ref || ''), user: String(entry.user || ''), lines: v.lines };
  const hash = await entryFingerprint(frozen, prevHash);
  const posted = { ...frozen, seq, prevHash, hash, status: 'posted', immutable: true };
  postings.push(posted);
  return { ok: true, posted, ledger: { ...ledger, postings }, errors: [] };
}

/** قيد عكسي معكوس تمامًا لقيد مرحّل، بنفس البنية والمصدر. */
export function reversalEntry(posted, reversalId) {
  if (!posted?.hash) throw new Error('REVERSAL_REQUIRES_POSTED_ENTRY');
  return {
    id: reversalId || `REV-${posted.id}`,
    date: posted.date,
    memo: `عكس القيد ${posted.id} (بصمة ${posted.hash.slice(0, 12)})`,
    ref: posted.ref || '',
    user: posted.user || '',
    reverses: posted.id,
    lines: posted.lines.map(l => ({ account: l.account, dr: l.cr, cr: l.dr, desc: l.desc ? 'عكس: ' + l.desc : '' }))
  };
}

/* ============================================================
 * 4) ميزان المراجعة والميزان المعدّل
 * ============================================================ */
function accountKind(acc) {
  return String(acc?.type || 'asset').toLowerCase();
}

export function buildLedger(accounts, postings = []) {
  const map = new Map();
  for (const a of accounts || []) map.set(String(a.code), { code: String(a.code), name: String(a.name || a.code), type: accountKind(a), opening: a.opening == null ? null : parseMoney(a.opening, { exp: 2 }).minor ?? 0n });
  return { accounts: map, postings: [...postings] };
}

const DEBIT_NATURE = new Set(['asset', 'expense']);

/** ميزان مراجعة مجموعي مع أرصدة افتتاحية. dr/cr وحدات صغرى. */
export function trialBalance(ledger) {
  const rows = new Map();
  for (const [code, acc] of ledger.accounts) {
    rows.set(code, { code, name: acc.name, type: acc.type, dr: 0n, cr: 0n, opening: acc.opening || 0n });
  }
  for (const p of ledger.postings || []) {
    for (const ln of p.lines || []) {
      let row = rows.get(ln.account);
      if (!row) { row = { code: ln.account, name: ln.account, type: 'suspense', dr: 0n, cr: 0n, opening: 0n }; rows.set(ln.account, row); }
      if (ln.dr != null) row.dr += BigInt(ln.dr);
      if (ln.cr != null) row.cr += BigInt(ln.cr);
    }
  }
  let tdr = 0n, tcr = 0n;
  const list = [...rows.values()].map(r => {
    tdr += r.dr; tcr += r.cr;
    const net = DEBIT_NATURE.has(r.type) ? r.dr - r.cr : r.cr - r.dr;
    const openingAdj = r.opening == null ? 0n : (DEBIT_NATURE.has(r.type) ? r.opening : -r.opening);
    return { ...r, netMovement: net, closing: openingAdj + net };
  });
  return {
    rows: list.sort((a, b) => a.code.localeCompare(b.code, 'en')),
    totals: { dr: tdr, cr: tcr },
    difference: tdr - tcr,
    balanced: tdr === tcr
  };
}

/** تطبيق قيود تسوية (قائمة قيود) على ميزان المراجعة → ميزان معدّل. */
export function adjustedTrialBalance(tb, adjustments, opts = {}) {
  const applied = [], rejected = [];
  const delta = new Map();
  for (const adj of adjustments || []) {
    const v = validateJournalEntry(adj, { exp: opts.exp ?? 2 });
    if (!v.ok) { rejected.push({ id: adj?.id, errors: v.errors }); continue; }
    for (const ln of v.lines) {
      const cur = delta.get(ln.account) || { dr: 0n, cr: 0n };
      if (ln.dr != null) cur.dr += ln.dr;
      if (ln.cr != null) cur.cr += ln.cr;
      delta.set(ln.account, cur);
    }
    applied.push({ id: String(adj.id), totals: v.totals });
  }
  let adjDr = 0n, adjCr = 0n;
  const rows = tb.rows.map(r => {
    const d = delta.get(r.code) || { dr: 0n, cr: 0n };
    adjDr += d.dr; adjCr += d.cr;
    const dr = r.dr + d.dr, cr = r.cr + d.cr;
    const net = DEBIT_NATURE.has(r.type) ? dr - cr : cr - dr;
    const openingAdj = r.opening == null ? 0n : (DEBIT_NATURE.has(r.type) ? r.opening : -r.opening);
    return { ...r, adjDr: d.dr, adjCr: d.cr, dr, cr, closing: openingAdj + net };
  });
  // حسابات جديدة وردت في التسويات فقط
  for (const [code, d] of delta) {
    if (rows.some(r => r.code === code)) continue;
    adjDr += 0n; adjCr += 0n;
    const dr = d.dr, cr = d.cr;
    const net = dr - cr;
    rows.push({ code, name: code, type: 'suspense', dr, cr, opening: 0n, adjDr: d.dr, adjCr: d.cr, closing: net });
  }
  const totals = { dr: tb.totals.dr + adjDr, cr: tb.totals.cr + adjCr };
  return { rows: rows.sort((a, b) => a.code.localeCompare(b.code, 'en')), totals, difference: totals.dr - totals.cr, balanced: totals.dr === totals.cr, applied, rejected, adjustmentsTotals: { dr: adjDr, cr: adjCr } };
}

/* ============================================================
 * 5) الأهمية النسبية (ISA 320) وتجميع التحريفات (ISA 450)
 * ============================================================ */
const MATERIALITY_RATES = {
  profit: { pct: '0.05', label: '5% من الربح قبل الضريبة' },
  revenue: { pct: '0.005', label: '0.5% من الإيرادات' },
  assets: { pct: '0.005', label: '0.5% من إجمالي الأصول' },
  equity: { pct: '0.01', label: '1% من حقوق الملكية' }
};
const RISK_PROFILE_FACTOR = { low: '0.75', medium: '0.65', high: '0.50' };

function pctOfMinor(minor, pctStr) {
  const s = String(pctStr);
  const dot = s.indexOf('.');
  const dec = dot >= 0 ? s.length - dot - 1 : 0;
  const n = BigInt(s.replace('.', ''));
  const d = 10n ** BigInt(dec);
  return (minor * n) / d;
}

export function computeMateriality({ basis = 'profit', amount, riskProfile = 'medium', exp = 2 }) {
  const parsed = typeof amount === 'string' || typeof amount === 'number' ? parseMoney(amount, { exp }) : amount;
  if (!parsed?.ok || parsed.minor <= 0n) return { ok: false, error: 'MATERIALITY_BASIS_MUST_BE_POSITIVE' };
  const rate = MATERIALITY_RATES[basis] || MATERIALITY_RATES.profit;
  const overall = pctOfMinor(parsed.minor, rate.pct);
  const factor = RISK_PROFILE_FACTOR[riskProfile] || RISK_PROFILE_FACTOR.medium;
  const performance = pctOfMinor(overall, factor);
  const trivial = pctOfMinor(overall, '0.05');
  return {
    ok: true, basis, basisLabel: rate.label, riskProfile,
    overall: { minor: overall, exp }, performance: { minor: performance, exp },
    clearlyTrivial: { minor: trivial, exp },
    performanceFactor: factor,
    method: 'ISA 320-style benchmark percentages; deterministic; AI لا يعدل هذه العتبات'
  };
}

/**
 * تجميع التحريفات وفق منهج ISA 450:
 * factual: تحريف مؤكد، judgmental: تحريف تقديري، projected: مسقط من العينة.
 */
export function aggregateMisstatements(items, materiality) {
  const m = materiality;
  let factual = 0n, judgmental = 0n, projected = 0n, corrected = 0n;
  const exp = m?.exp ?? 2;
  const uncorrected = [];
  for (const it of items || []) {
    const amt = typeof it.amount === 'string' || typeof it.amount === 'number' ? parseMoney(it.amount, { exp }) : { ok: true, minor: BigInt(it.amount ?? 0), exp };
    if (!amt?.ok) continue;
    if (it.corrected) { corrected += moneyAbs({ minor: amt.minor, exp }).minor; continue; }
    uncorrected.push({ id: it.id, type: it.type, minor: amt.minor });
    if (it.type === 'factual') factual += amt.minor;
    else if (it.type === 'judgmental') judgmental += amt.minor;
    else projected += amt.minor;
  }
  const total = factual + judgmental + projected;
  const pm = m?.performance?.minor ?? null;
  const trivial = m?.clearlyTrivial?.minor ?? null;
  return {
    factual: { minor: factual, exp }, judgmental: { minor: judgmental, exp }, projected: { minor: projected, exp },
    corrected: { minor: corrected, exp }, uncorrectedTotal: { minor: total, exp },
    exceedsPerformanceMateriality: pm != null ? total > pm : null,
    itemsAboveTrivial: trivial != null ? uncorrected.filter(u => moneyAbs({ minor: u.minor, exp }).minor > trivial) : [],
    methodology: 'ISA 450-style aggregation (factual + judgmental + projected uncorrected)'
  };
}

/* ============================================================
 * 6) أعلام مخاطر القيود — قواعد حتمية
 * ============================================================ */
export function journalRiskFlags(entry, ctx = {}) {
  const flags = [];
  const exp = Number.isInteger(ctx.exp) ? ctx.exp : 2;
  const amountOf = v => { const p = parseMoney(v ?? 0, { exp }); return p.ok ? moneyAbs(p).minor : 0n; };
  const lineAmount = l => {
    const d = parseMoney(l?.dr ?? 0, { exp });
    if (d.ok && d.minor !== 0n) return moneyAbs(d).minor;
    return amountOf(l?.cr ?? 0);
  };
  const total = (entry?.lines || []).reduce((a, l) => { const d = parseMoney(l?.dr ?? 0, { exp }); return a + (d.ok ? moneyAbs(d).minor : 0n); }, 0n);
  const maxLine = (entry?.lines || []).reduce((a, l) => { const v = lineAmount(l); return v > a ? v : a; }, 0n);
  const bench = ctx.amountThreshold ? amountOf(ctx.amountThreshold) : null;

  if (maxLine >= 10000000n && maxLine % 1000000n === 0n) flags.push({ code: 'ROUND_LARGE_AMOUNT', severity: 'medium', message: 'مبلغ كبير ومقرب بالكامل (قابل للتتبع كنمط)' });
  if (bench && maxLine > bench) flags.push({ code: 'ABOVE_PERFORMANCE_MATERIALITY', severity: 'high', message: 'المبلغ يتجاوز الأهمية النسبية التنفيذية' });
  const date = String(entry?.date || '');
  if (ctx.periodStart && date && date < ctx.periodStart) flags.push({ code: 'BACKDATED', severity: 'high', message: 'قيد مؤرخ قبل بداية الفترة' });
  if (ctx.periodEnd && date && date > ctx.periodEnd) flags.push({ code: 'POST_PERIOD', severity: 'high', message: 'قيد بعد نهاية الفترة' });
  if (date && ctx.weekendDays instanceof Array && ctx.weekendDays.length) {
    const d = new Date(date + 'T00:00:00Z');
    if (!Number.isNaN(d.getTime()) && ctx.weekendDays.includes(d.getUTCDay())) flags.push({ code: 'WEEKEND_POSTING', severity: 'low', message: 'ترحيل في يوم راحة وفق التقويم المعطى' });
  }
  const accounts = new Set((entry?.lines || []).map(l => String(l.account || '')));
  if (accounts.has(ctx.suspenseAccount || '9999')) flags.push({ code: 'SUSPENSE_ACCOUNT', severity: 'medium', message: 'القيد يمر عبر حساب وسيط/معلق' });
  if (ctx.privilegedUsers instanceof Set && ctx.privilegedUsers.has(String(entry?.user || ''))) flags.push({ code: 'PRIVILEGED_MANUAL_ENTRY', severity: 'medium', message: 'قيد يدوي من مستخدم بصلاحية مميزة' });
  if (ctx.rareAccounts instanceof Set) {
    const rare = (entry?.lines || []).map(l => String(l.account || '')).filter(a => ctx.rareAccounts.has(a));
    if (rare.length) flags.push({ code: 'RARE_ACCOUNT_USAGE', severity: 'low', message: 'استخدام حسابات نادرة الاستعمال: ' + rare.join('، ') });
  }
  if (ctx.suspiciousKeywords instanceof Array) {
    const hay = `${entry?.memo || ''} ${entry?.ref || ''}`.toLowerCase();
    if (suspiciousHit(hay, ctx.suspiciousKeywords)) flags.push({ code: 'SENSITIVE_MEMO_KEYWORD', severity: 'medium', message: 'وصف القيد يتضمن كلمة تتطلب فحصًا' });
  }
  return { flags, maxLine: { minor: maxLine, exp }, total: { minor: total, exp } };
}
function suspiciousHit(hay, words) {
  for (const w of words) { const s = String(w || '').trim().toLowerCase(); if (s && hay.includes(s)) return true; }
  return false;
}

/* ============================================================
 * 7) المعاينة الحتمية القابلة للتكرار
 * ============================================================ */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < String(str).length; i++) { h ^= String(str).charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** عينة عشوائية حتمية: نفس العناصر+n+البذرة = نفس النتيجة دائمًا. */
export function deterministicSample(items, { size, seed = 'kosif', method = 'random', amountKey } = {}) {
  const n = items?.length || 0;
  const k = Math.max(0, Math.min(Number(size) || 0, n));
  if (!n || !k) return { picked: [], method, seed: String(seed), coverage: 0 };
  const rng = mulberry32(hashSeed(String(seed)));
  if (method === 'systematic') {
    const interval = n / k;
    const start = Math.floor(rng() * interval);
    const picked = [];
    for (let i = 0; i < k; i++) picked.push(items[Math.floor(start + i * interval)]);
    return { picked, method, seed: String(seed), interval };
  }
  if (method === 'mus' && amountKey) {
    // معاينة الوحدات النقدية: احتمال الاختيار يتناسب مع القيمة
    const amounts = items.map(it => Math.max(0, Number(it?.[amountKey] ?? 0)));
    const total = amounts.reduce((a, b) => a + b, 0);
    if (total <= 0) return deterministicSample(items, { size: k, seed, method: 'random' });
    const picked = [], seen = new Set();
    const cum = []; let acc = 0;
    for (const a of amounts) { acc += a; cum.push(acc); }
    for (let j = 0; j < k; j++) {
      const point = rng() * total;
      let lo = 0, hi = cum.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < point) lo = mid + 1; else hi = mid; }
      if (!seen.has(lo)) { seen.add(lo); picked.push(items[lo]); }
    }
    return { picked, method: 'monetary-unit', seed: String(seed), coverage: picked.reduce((a, p) => a + Math.max(0, Number(p?.[amountKey] ?? 0)), 0) / total };
  }
  const idx = items.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return { picked: idx.slice(0, k).map(i => items[i]), method: 'random', seed: String(seed) };
}

/* ============================================================
 * 8) الثوابت المحاسبية
 * ============================================================ */
export async function checkInvariants(ledger, ctx = {}) {
  const results = [];
  const tb = trialBalance(ledger);
  results.push({ id: 'DOUBLE_ENTRY', ok: tb.balanced, detail: `مدين ${tb.totals.dr.toString()} / دائن ${tb.totals.cr.toString()} (وحدات صغرى)`, fatal: !tb.balanced });
  let assets = 0n, liab = 0n, equity = 0n, revenue = 0n, expense = 0n;
  for (const r of tb.rows) {
    const closing = r.closing;
    if (r.type === 'asset') assets += closing;
    else if (r.type === 'liability') liab += closing;
    else if (r.type === 'equity') equity += closing;
    else if (r.type === 'revenue') revenue += closing;
    else if (r.type === 'expense') expense += closing;
  }
  const netIncome = revenue - expense;
  results.push({ id: 'ACCOUNTING_EQUATION', ok: assets === liab + equity + netIncome, detail: `أصول ${assets.toString()} = التزامات ${liab.toString()} + حقوق ${equity.toString()} + صافي الدخل ${netIncome.toString()}`, fatal: assets !== liab + equity + netIncome });
  if (ctx.closed === true) results.push({ id: 'POST_CLOSING_EQUATION', ok: revenue === 0n && expense === 0n, detail: 'بعد الإقفال يجب أن تكون حسابات الإيرادات والمصروفات صفرية', fatal: false });
  const suspense = tb.rows.filter(r => r.type === 'suspense' && (r.dr !== 0n || r.cr !== 0n));
  results.push({ id: 'NO_UNCLEARED_SUSPENSE', ok: suspense.length === 0, detail: suspense.length ? `حسابات وسيطة غير مصفاة: ${suspense.map(r => r.code).join('، ')}` : 'لا حسابات وسيطة معلقة', fatal: false });
  if (ledger.postings?.length) {
    const chain = await verifyHashChain(ledger.postings);
    results.push({ id: 'POSTING_HASH_CHAIN', ok: chain.ok, detail: chain.ok ? `سلسلة بصمات سليمة (${ledger.postings.length} قيد)` : `انقطاع في سلسلة البصمات عند القيد رقم ${chain.brokenAt}`, fatal: true });
  }
  return { results, allOk: results.every(r => r.ok), fatalCount: results.filter(r => !r.ok && r.fatal).length };
}

export async function verifyHashChain(postings) {
  let prev = null;
  for (let i = 0; i < postings.length; i++) {
    const p = postings[i];
    if (p.seq !== i + 1) return { ok: false, brokenAt: p.seq ?? i + 1 };
    if ((p.prevHash || null) !== prev) return { ok: false, brokenAt: p.seq };
    const h = await entryFingerprint(p, prev);
    if (h !== p.hash) return { ok: false, brokenAt: p.seq };
    prev = p.hash;
  }
  return { ok: true, brokenAt: null };
}

/* ============================================================
 * 9) انساق الإطار المالي حسب الفترة (قراءة فقط — ليست حكمًا نافذًا)
 * ============================================================ */
const FRAMEWORKS = [
  { id: 'IFRS_18', title: 'IFRS 18 — عرض التقارير المالية والإفصاح', issued: '2024-04', effectiveFrom: '2027-01-01', scope: 'annual-periods-beginning', earlyAdoption: true, kind: 'accounting' },
  { id: 'IFRS_19', title: 'IFRS 19 — Subsidiaries without Public Accountability', issued: '2024-05', effectiveFrom: '2027-01-01', scope: 'annual-periods-beginning', earlyAdoption: true, kind: 'accounting' },
  { id: 'IFRS_S1', title: 'IFRS S1 — الإفصاح العام عن الاستدامة', issued: '2023-06', effectiveFrom: '2024-01-01', scope: 'annual-periods-beginning', earlyAdoption: true, kind: 'sustainability' },
  { id: 'IFRS_S2', title: 'IFRS S2 — الإفصاح المناخي', issued: '2023-06', effectiveFrom: '2024-01-01', scope: 'annual-periods-beginning', earlyAdoption: true, kind: 'sustainability' },
  { id: 'ISA_240_REVISED', title: 'ISA 240 (المعدّل) — المسؤوليات المتعلقة بالغش', issued: '2024-11', effectiveFrom: '2026-12-15', scope: 'audit-periods-ending', earlyAdoption: false, kind: 'audit' },
  { id: 'ISA_315_REVISED_2019', title: 'ISA 315 (المعدّل 2019) — تحديد وتقييم مخاطر التحريف الجوهري', issued: '2019', effectiveFrom: '2021-12-15', scope: 'audit-periods-ending', earlyAdoption: false, kind: 'audit' },
  { id: 'ISQM_1', title: 'ISQM 1 — إدارة الجودة في الشركات', issued: '2020', effectiveFrom: '2022-12-15', scope: 'fixed-date', earlyAdoption: true, kind: 'quality' },
  { id: 'ZATCA_VAT_15', title: 'ضريبة القيمة المضافة 15% (السعودية)', issued: '2020-07', effectiveFrom: '2020-07-01', scope: 'fixed-date', earlyAdoption: false, kind: 'local-tax' }
];

export function frameworkApplicability({ periodStart, periodEnd, earlyAdoption = {}, jurisdiction = 'saudi' } = {}) {
  const list = FRAMEWORKS.map(f => {
    let effectiveForPeriod = false;
    if (f.scope === 'annual-periods-beginning' && periodStart) effectiveForPeriod = periodStart >= f.effectiveFrom;
    else if (f.scope === 'audit-periods-ending' && periodEnd) effectiveForPeriod = periodEnd >= f.effectiveFrom;
    else if (f.scope === 'fixed-date' && periodEnd) effectiveForPeriod = periodEnd >= f.effectiveFrom;
    const early = !effectiveForPeriod && earlyAdoption[f.id] === true && f.earlyAdoption;
    let state = effectiveForPeriod ? 'in-effect' : early ? 'early-adoption' : 'future';
    if (jurisdiction !== 'saudi' && f.kind === 'local-tax') state = 'not-applicable';
    return { ...f, state, effectiveForPeriod: state === 'in-effect', earlyAdoptionApplied: early };
  });
  return {
    jurisdiction, periodStart: periodStart || null, periodEnd: periodEnd || null,
    frameworks: list,
    disclaimer: 'هذه بيانات جاهزية حسب تواريخ الإنفاذ المعلنة؛ لا تُحوّل تلقائيًا إلى متطلب نافذ قبل التحقق من المصدر الرسمي (SOCPA/IAASB/IFRS Foundation).'
  };
}

/* ============================================================
 * 10) حاسبات محاسبية سعودية حتمية (ZATCA VAT + الزكاة)
 * ============================================================ */
export function computeVat({ taxableSuppliesMinor, zeroRatedMinor = 0n, exemptMinor = 0n, inputVatMinor, exp = 2, ratePct = 15 }) {
  const rateNum = BigInt(Math.round(ratePct * 100));
  const outputVat = (taxableSuppliesMinor * rateNum) / 10000n;
  const net = outputVat - inputVatMinor;
  return {
    ratePct,
    standardRated: { base: { minor: taxableSuppliesMinor, exp }, vat: { minor: outputVat, exp } },
    zeroRated: { minor: zeroRatedMinor, exp }, exempt: { minor: exemptMinor, exp },
    inputVat: { minor: inputVatMinor, exp },
    netPayable: { minor: net, exp },
    direction: net > 0n ? 'payable' : net < 0n ? 'refundable' : 'balanced',
    method: 'ZATCA standard-rated 15% since 2020-07; deterministic integer math'
  };
}

export function estimateZakat({ basisMinor, exp = 2, ratePct = 2.5, lunarYear = true }) {
  const rateNum = BigInt(Math.round(ratePct * 1000));
  const amount = (basisMinor * rateNum) / 100000n;
  return {
    ratePct, calendar: lunarYear ? 'hijri-lunar' : 'gregorian-adjusted',
    basis: { minor: basisMinor, exp },
    estimatedZakat: { minor: amount, exp },
    disclaimer: 'تقدير مبدئي لوعاء مبسط؛ الوعاء الفعلي يحدده نظام هيئة الزكاة والضريبة والجمارك وقواعدها لكل نوع كيان.'
  };
}



