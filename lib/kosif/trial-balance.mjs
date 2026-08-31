/*
 * KOSIF — استيراد وتحليل ميزان المراجعة
 *
 * يحوّل نصًا جدوليًا (CSV / TSV / منسوخ من Excel) إلى ميزان مراجعة
 * حتمي بوحدات minor، ويصنّف الحسابات ويكشف عدم التوازن.
 *
 * كل حساب مالي هنا يمر عبر parseMoney من المحرّك الحتمي — لا حساب
 * بفاصلة عائمة على أي مبلغ.
 */

import { parseMoney, normalizeDigits } from '../engine/v38-core.mjs';

export const TRIAL_BALANCE_VERSION = '1.0.0';

/** أنواع الحسابات وطبيعتها المدينة/الدائنة. */
export const ACCOUNT_TYPES = Object.freeze({
  asset: { label: 'أصول', nature: 'debit', statement: 'position' },
  liability: { label: 'التزامات', nature: 'credit', statement: 'position' },
  equity: { label: 'حقوق ملكية', nature: 'credit', statement: 'position' },
  revenue: { label: 'إيرادات', nature: 'credit', statement: 'income' },
  expense: { label: 'مصروفات', nature: 'debit', statement: 'income' },
  suspense: { label: 'غير مصنّف', nature: 'debit', statement: 'none' }
});

/**
 * تصنيف بدليل الحسابات: أول رقم من الكود هو المحدِّد الأساسي
 * (دليل حسابات شائع في المنطقة)، ثم كلمات مفتاحية في الاسم كاحتياط.
 */
const CODE_PREFIX_TYPE = Object.freeze({ 1: 'asset', 2: 'liability', 3: 'equity', 4: 'revenue', 5: 'expense', 6: 'expense', 7: 'expense' });

const NAME_HINTS = Object.freeze([
  { type: 'asset', words: ['نقد', 'صندوق', 'بنك', 'مدين', 'ذمم مدينة', 'مخزون', 'أصل', 'أصول', 'عهدة', 'مقدم', 'استثمار', 'cash', 'bank', 'receivable', 'inventory', 'asset', 'prepaid'] },
  { type: 'liability', words: ['دائن', 'ذمم دائنة', 'قرض', 'التزام', 'مستحق', 'مخصص', 'ضريبة', 'زكاة', 'payable', 'loan', 'liability', 'accrued', 'provision', 'vat', 'tax'] },
  { type: 'equity', words: ['رأس المال', 'رأسمال', 'احتياطي', 'أرباح مبقاة', 'حقوق الملكية', 'جاري الشريك', 'capital', 'reserve', 'retained', 'equity'] },
  { type: 'revenue', words: ['إيراد', 'مبيعات', 'دخل', 'عمولة', 'revenue', 'sales', 'income'] },
  { type: 'expense', words: ['مصروف', 'تكلفة', 'رواتب', 'أجور', 'إيجار', 'إهلاك', 'استهلاك', 'مشتريات', 'expense', 'cost', 'salary', 'rent', 'depreciation', 'purchase'] }
]);

/** ترويسات معروفة لكل عمود، عربية وإنجليزية. */
const HEADER_MAP = Object.freeze({
  code: ['code', 'account', 'accountcode', 'acct', 'رقم', 'الرقم', 'كود', 'الكود', 'رقمالحساب', 'رمزالحساب', 'الحساب'],
  name: ['name', 'accountname', 'description', 'اسم', 'الاسم', 'اسمالحساب', 'البيان', 'الوصف'],
  debit: ['debit', 'dr', 'مدين', 'المدين', 'مدينة'],
  credit: ['credit', 'cr', 'دائن', 'الدائن', 'دائنة'],
  opening: ['opening', 'openingbalance', 'افتتاحي', 'رصيدافتتاحي', 'أولالمدة'],
  balance: ['balance', 'net', 'رصيد', 'الرصيد', 'صافي']
});

function headerKey(cell) {
  const key = normalizeDigits(String(cell ?? ''))
    .toLowerCase()
    .replace(/[\s_\-.()]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
  for (const [field, aliases] of Object.entries(HEADER_MAP)) {
    if (aliases.some(alias => key === alias.replace(/ة/g, 'ه'))) return field;
  }
  return null;
}

/** يكتشف الفاصل الأكثر اتساقًا عبر الأسطر: تبويب، فاصلة، فاصلة منقوطة، أو أنبوب. */
export function detectDelimiter(text) {
  const lines = String(text).split(/\r?\n/).filter(l => l.trim()).slice(0, 12);
  if (!lines.length) return ',';
  const candidates = ['\t', ',', ';', '|'];
  let best = ',';
  let bestScore = -1;
  for (const candidate of candidates) {
    const counts = lines.map(l => splitLine(l, candidate).length);
    const first = counts[0];
    if (first < 2) continue;
    const consistent = counts.filter(c => c === first).length;
    const score = consistent * 10 + first;
    if (score > bestScore) { bestScore = score; best = candidate; }
  }
  return best;
}

/** تقسيم سطر مع احترام علامات الاقتباس المزدوجة. */
export function splitLine(line, delimiter) {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { current += '"'; i += 1; }
      else quoted = !quoted;
    } else if (ch === delimiter && !quoted) {
      cells.push(current); current = '';
    } else current += ch;
  }
  cells.push(current);
  return cells.map(c => c.trim());
}

/** يصنّف حسابًا من كوده واسمه. */
export function classifyAccount(code, name) {
  const digits = normalizeDigits(String(code ?? '')).replace(/\D/g, '');
  if (digits) {
    const type = CODE_PREFIX_TYPE[Number(digits[0])];
    if (type) return { type, basis: 'code' };
  }
  const haystack = String(name ?? '').toLowerCase();
  for (const hint of NAME_HINTS) {
    if (hint.words.some(word => haystack.includes(word))) return { type: hint.type, basis: 'name' };
  }
  return { type: 'suspense', basis: 'none' };
}

function toMinor(value, exp) {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '-') return 0n;
  const negativeParens = /^\(.*\)$/.test(raw);
  const cleaned = negativeParens ? raw.slice(1, -1) : raw;
  const parsed = parseMoney(cleaned, { exp });
  if (!parsed.ok) return null;
  return negativeParens ? -parsed.minor : parsed.minor;
}

/**
 * يحوّل نصًا جدوليًا إلى ميزان مراجعة.
 * @param {string} text
 * @param {{exp?:number, delimiter?:string}} options
 * @returns {{ok:boolean, rows:Array, totals:{debit:bigint,credit:bigint}, difference:bigint,
 *            balanced:boolean, errors:Array, columns:object, exp:number}}
 */
export function parseTrialBalance(text, options = {}) {
  const exp = Number.isInteger(options.exp) ? options.exp : 2;
  const source = String(text ?? '').replace(/^﻿/, '');
  const lines = source.split(/\r?\n/).filter(line => line.trim().length > 0);
  const errors = [];

  if (!lines.length) {
    return { ok: false, rows: [], totals: { debit: 0n, credit: 0n }, difference: 0n, balanced: true, errors: [{ line: 0, code: 'EMPTY_INPUT', message: 'لا توجد بيانات للاستيراد' }], columns: {}, exp };
  }

  const delimiter = options.delimiter || detectDelimiter(source);
  const headerCells = splitLine(lines[0], delimiter);
  const columns = {};
  headerCells.forEach((cell, index) => {
    const field = headerKey(cell);
    if (field && columns[field] === undefined) columns[field] = index;
  });

  const hasHeader = Object.keys(columns).length >= 2;
  if (!hasHeader) {
    // بلا ترويسة: نفترض الترتيب الشائع كود، اسم، مدين، دائن
    columns.code = 0;
    columns.name = headerCells.length > 2 ? 1 : 1;
    columns.debit = headerCells.length > 3 ? 2 : 2;
    columns.credit = headerCells.length > 3 ? 3 : 3;
  }

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const rows = [];
  const seen = new Map();
  let totalDebit = 0n;
  let totalCredit = 0n;

  dataLines.forEach((line, index) => {
    const lineNumber = index + (hasHeader ? 2 : 1);
    const cells = splitLine(line, delimiter);
    const code = String(cells[columns.code] ?? '').trim();
    const name = String(cells[columns.name] ?? '').trim() || code;
    if (!code && !name) return;

    // سطر إجماليات في نهاية الملف — يُتجاهل بدل أن يُضاعف الأرصدة
    if (/^(الإجمالي|الاجمالي|المجموع|total|totals)$/i.test(code) || /^(الإجمالي|الاجمالي|المجموع|total|totals)$/i.test(name)) return;

    let debit = columns.debit !== undefined ? toMinor(cells[columns.debit], exp) : 0n;
    let credit = columns.credit !== undefined ? toMinor(cells[columns.credit], exp) : 0n;

    if (debit === null || credit === null) {
      errors.push({ line: lineNumber, code: 'AMOUNT_NOT_NUMERIC', message: `مبلغ غير صالح في السطر ${lineNumber}`, raw: line });
      return;
    }

    // عمود رصيد صافٍ بدل عمودي مدين/دائن
    if (columns.debit === undefined && columns.credit === undefined && columns.balance !== undefined) {
      const net = toMinor(cells[columns.balance], exp);
      if (net === null) {
        errors.push({ line: lineNumber, code: 'AMOUNT_NOT_NUMERIC', message: `رصيد غير صالح في السطر ${lineNumber}`, raw: line });
        return;
      }
      if (net >= 0n) debit = net; else credit = -net;
    }

    // مبالغ سالبة في عمود واحد تُنقل إلى العمود المقابل حتى يبقى الميزان موجب الطرفين
    if (debit < 0n) { credit += -debit; debit = 0n; }
    if (credit < 0n) { debit += -credit; credit = 0n; }

    const opening = columns.opening !== undefined ? (toMinor(cells[columns.opening], exp) ?? 0n) : 0n;
    const classification = classifyAccount(code, name);

    if (seen.has(code)) {
      errors.push({ line: lineNumber, code: 'DUPLICATE_ACCOUNT', message: `الحساب ${code} مكرر (السطر ${seen.get(code)} والسطر ${lineNumber})` });
    } else {
      seen.set(code, lineNumber);
    }

    totalDebit += debit;
    totalCredit += credit;

    rows.push({
      line: lineNumber,
      code,
      name,
      type: classification.type,
      classifiedBy: classification.basis,
      debit,
      credit,
      opening,
      net: ACCOUNT_TYPES[classification.type].nature === 'debit' ? debit - credit : credit - debit
    });
  });

  const difference = totalDebit - totalCredit;
  return {
    ok: rows.length > 0,
    exp,
    delimiter,
    columns,
    hasHeader,
    rows,
    totals: { debit: totalDebit, credit: totalCredit },
    difference,
    balanced: difference === 0n,
    unclassified: rows.filter(r => r.type === 'suspense').length,
    errors
  };
}

/** تجميع الميزان حسب نوع الحساب. */
export function summarizeByType(trialBalance) {
  const summary = {};
  for (const key of Object.keys(ACCOUNT_TYPES)) {
    summary[key] = { type: key, label: ACCOUNT_TYPES[key].label, count: 0, debit: 0n, credit: 0n, net: 0n };
  }
  for (const row of trialBalance.rows || []) {
    const bucket = summary[row.type] || summary.suspense;
    bucket.count += 1;
    bucket.debit += row.debit;
    bucket.credit += row.credit;
    bucket.net += row.net;
  }
  return Object.values(summary);
}

/**
 * تشخيص الميزان: يقترح أسبابًا محتملة لعدم التوازن ويرتب أكبر الأرصدة.
 * تشخيص حتمي بالكامل — لا نموذج لغوي ولا عشوائية.
 */
export function diagnoseTrialBalance(trialBalance) {
  const findings = [];
  const { difference, rows } = trialBalance;

  if (difference !== 0n) {
    findings.push({
      severity: 'critical',
      code: 'OUT_OF_BALANCE',
      title: 'الميزان غير متوازن',
      detail: 'مجموع المدين لا يساوي مجموع الدائن.',
      amountMinor: difference
    });

    const target = difference < 0n ? -difference : difference;
    const exact = rows.find(r => (r.debit - r.credit === target) || (r.credit - r.debit === target));
    if (exact) {
      findings.push({
        severity: 'high',
        code: 'SINGLE_ACCOUNT_MATCHES_DIFFERENCE',
        title: 'حساب واحد يطابق الفرق بالضبط',
        detail: `رصيد الحساب ${exact.code} — ${exact.name} يساوي فرق الميزان تمامًا، وهو مرشّح أول للفحص.`,
        account: exact.code
      });
    }

    // فرق قابل للقسمة على ٩ مؤشر كلاسيكي على قلب أرقام
    if (target % 9n === 0n && target !== 0n) {
      findings.push({
        severity: 'medium',
        code: 'TRANSPOSITION_SUSPECTED',
        title: 'يُحتمل قلب أرقام',
        detail: 'الفرق يقبل القسمة على ٩، وهو النمط المعتاد لخطأ قلب خانتين عند الإدخال.'
      });
    }
  }

  const unclassified = rows.filter(r => r.type === 'suspense');
  if (unclassified.length) {
    findings.push({
      severity: 'medium',
      code: 'UNCLASSIFIED_ACCOUNTS',
      title: `${unclassified.length} حساب بلا تصنيف`,
      detail: 'هذه الحسابات لن تظهر في القوائم المالية حتى يُحدَّد نوعها.',
      accounts: unclassified.slice(0, 12).map(r => r.code)
    });
  }

  const bothSides = rows.filter(r => r.debit > 0n && r.credit > 0n);
  if (bothSides.length) {
    findings.push({
      severity: 'low',
      code: 'GROSS_BALANCES',
      title: `${bothSides.length} حساب برصيد مدين ودائن معًا`,
      detail: 'أرصدة غير مصفّاة قد تخفي مقاصة غير مسموح بها بين بنود.',
      accounts: bothSides.slice(0, 12).map(r => r.code)
    });
  }

  const zero = rows.filter(r => r.debit === 0n && r.credit === 0n);
  if (zero.length) {
    findings.push({
      severity: 'info',
      code: 'ZERO_BALANCE_ACCOUNTS',
      title: `${zero.length} حساب برصيد صفري`,
      detail: 'حسابات خاملة يمكن استبعادها من العرض النهائي.'
    });
  }

  for (const error of trialBalance.errors || []) {
    findings.push({ severity: error.code === 'DUPLICATE_ACCOUNT' ? 'high' : 'critical', code: error.code, title: error.message, detail: error.raw || '' });
  }

  const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  return findings.sort((a, b) => order[a.severity] - order[b.severity]);
}

/** أكبر الأرصدة بالقيمة المطلقة — مدخل طبيعي لاختيار العينة. */
export function largestBalances(trialBalance, limit = 10) {
  const abs = value => (value < 0n ? -value : value);
  return [...(trialBalance.rows || [])]
    .sort((a, b) => {
      const diff = abs(b.net) - abs(a.net);
      if (diff > 0n) return 1;
      if (diff < 0n) return -1;
      return a.code.localeCompare(b.code, 'en');
    })
    .slice(0, limit);
}



