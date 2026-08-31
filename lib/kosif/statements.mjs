/*
 * KOSIF — بناء القوائم المالية من ميزان المراجعة
 *
 * تحويل حتمي: كل بند في القائمة يُبنى من مجموع أرصدة حسابات محددة،
 * ويحتفظ بمرجع الحسابات التي كوّنته حتى يظل كل رقم قابلًا للتتبع.
 */

import { ACCOUNT_TYPES } from './trial-balance.mjs';

export const STATEMENTS_VERSION = '1.0.0';

/**
 * خريطة بنود القائمة حسب بادئة الكود. الترتيب مهم: أول تطابق يفوز،
 * لذا تُذكر البادئات الأطول أولًا.
 */
const LINE_MAP = Object.freeze([
  { key: 'cash', label: 'النقد وما في حكمه', statement: 'position', group: 'currentAssets', prefixes: ['101', '102'] },
  { key: 'receivables', label: 'ذمم مدينة', statement: 'position', group: 'currentAssets', prefixes: ['112', '113'] },
  { key: 'inventory', label: 'المخزون', statement: 'position', group: 'currentAssets', prefixes: ['114', '115'] },
  { key: 'otherCurrentAssets', label: 'أصول متداولة أخرى', statement: 'position', group: 'currentAssets', prefixes: ['11', '12'] },
  { key: 'nonCurrentAssets', label: 'أصول غير متداولة', statement: 'position', group: 'nonCurrentAssets', prefixes: ['13', '14', '15', '16', '17', '18', '19'] },
  { key: 'payables', label: 'ذمم دائنة', statement: 'position', group: 'currentLiabilities', prefixes: ['201', '202'] },
  { key: 'accrued', label: 'مصروفات مستحقة', statement: 'position', group: 'currentLiabilities', prefixes: ['203', '204'] },
  { key: 'taxLiabilities', label: 'التزامات ضريبية وزكوية', statement: 'position', group: 'currentLiabilities', prefixes: ['205', '206'] },
  { key: 'otherCurrentLiabilities', label: 'التزامات متداولة أخرى', statement: 'position', group: 'currentLiabilities', prefixes: ['20', '21'] },
  { key: 'nonCurrentLiabilities', label: 'التزامات غير متداولة', statement: 'position', group: 'nonCurrentLiabilities', prefixes: ['22', '23', '24', '25', '26', '27', '28', '29'] },
  { key: 'capital', label: 'رأس المال', statement: 'position', group: 'equity', prefixes: ['301', '302'] },
  { key: 'reserves', label: 'الاحتياطيات', statement: 'position', group: 'equity', prefixes: ['303', '304'] },
  { key: 'retained', label: 'أرباح مبقاة', statement: 'position', group: 'equity', prefixes: ['30', '31', '32'] },
  { key: 'revenue', label: 'الإيرادات', statement: 'income', group: 'revenue', prefixes: ['40', '41', '42', '43'] },
  { key: 'otherIncome', label: 'إيرادات أخرى', statement: 'income', group: 'revenue', prefixes: ['44', '45', '46', '47', '48', '49'] },
  { key: 'cogs', label: 'تكلفة الإيرادات', statement: 'income', group: 'cogs', prefixes: ['50', '51'] },
  { key: 'operatingExpenses', label: 'مصروفات تشغيلية', statement: 'income', group: 'opex', prefixes: ['52', '53', '54', '55', '56', '57', '58', '59', '6'] },
  { key: 'financeCosts', label: 'تكاليف تمويل', statement: 'income', group: 'finance', prefixes: ['7'] }
]);

function lineFor(row) {
  const code = String(row.code || '').replace(/\D/g, '');
  for (const line of LINE_MAP) {
    if (line.prefixes.some(prefix => code.startsWith(prefix))) return line;
  }
  // احتياط بالنوع حين لا يتبع الكود دليل الحسابات
  const fallback = {
    asset: 'otherCurrentAssets',
    liability: 'otherCurrentLiabilities',
    equity: 'retained',
    revenue: 'revenue',
    expense: 'operatingExpenses'
  }[row.type];
  return LINE_MAP.find(l => l.key === fallback) || null;
}

/**
 * يبني القوائم المالية من ميزان مراجعة مُحلَّل.
 * كل مبلغ bigint بوحدة minor؛ لا تحويل إلى Number في أي خطوة حسابية.
 */
export function buildStatements(trialBalance) {
  const exp = trialBalance.exp ?? 2;
  const lines = new Map();
  const unmapped = [];

  for (const row of trialBalance.rows || []) {
    const line = lineFor(row);
    if (!line) { unmapped.push(row.code); continue; }
    if (!lines.has(line.key)) {
      lines.set(line.key, { key: line.key, label: line.label, statement: line.statement, group: line.group, minor: 0n, accounts: [] });
    }
    const bucket = lines.get(line.key);
    // الطبيعة تحدد الإشارة: مدين موجب للأصول والمصروفات، دائن موجب لغيرها
    const nature = ACCOUNT_TYPES[row.type]?.nature ?? 'debit';
    const value = nature === 'debit' ? row.debit - row.credit : row.credit - row.debit;
    bucket.minor += value;
    bucket.accounts.push({ code: row.code, name: row.name, minor: value });
  }

  const get = key => lines.get(key)?.minor ?? 0n;
  const groupTotal = group => [...lines.values()].filter(l => l.group === group).reduce((sum, l) => sum + l.minor, 0n);

  const currentAssets = groupTotal('currentAssets');
  const nonCurrentAssets = groupTotal('nonCurrentAssets');
  const totalAssets = currentAssets + nonCurrentAssets;
  const currentLiabilities = groupTotal('currentLiabilities');
  const nonCurrentLiabilities = groupTotal('nonCurrentLiabilities');
  const totalLiabilities = currentLiabilities + nonCurrentLiabilities;
  const contributedEquity = groupTotal('equity');

  const revenue = groupTotal('revenue');
  const cogs = groupTotal('cogs');
  const opex = groupTotal('opex');
  const finance = groupTotal('finance');
  const grossProfit = revenue - cogs;
  const operatingProfit = grossProfit - opex;
  const netProfit = operatingProfit - finance;

  const totalEquity = contributedEquity + netProfit;
  const balanceCheck = totalAssets - (totalLiabilities + totalEquity);

  return {
    version: STATEMENTS_VERSION,
    exp,
    lines: [...lines.values()].sort((a, b) => a.key.localeCompare(b.key, 'en')),
    unmapped,
    position: {
      currentAssets: { label: 'الأصول المتداولة', minor: currentAssets },
      nonCurrentAssets: { label: 'الأصول غير المتداولة', minor: nonCurrentAssets },
      totalAssets: { label: 'إجمالي الأصول', minor: totalAssets },
      currentLiabilities: { label: 'الالتزامات المتداولة', minor: currentLiabilities },
      nonCurrentLiabilities: { label: 'الالتزامات غير المتداولة', minor: nonCurrentLiabilities },
      totalLiabilities: { label: 'إجمالي الالتزامات', minor: totalLiabilities },
      contributedEquity: { label: 'حقوق الملكية المساهم بها', minor: contributedEquity },
      resultForPeriod: { label: 'نتيجة الفترة', minor: netProfit },
      totalEquity: { label: 'إجمالي حقوق الملكية', minor: totalEquity }
    },
    income: {
      revenue: { label: 'الإيرادات', minor: revenue },
      cogs: { label: 'تكلفة الإيرادات', minor: cogs },
      grossProfit: { label: 'مجمل الربح', minor: grossProfit },
      operatingExpenses: { label: 'المصروفات التشغيلية', minor: opex },
      operatingProfit: { label: 'الربح التشغيلي', minor: operatingProfit },
      financeCosts: { label: 'تكاليف التمويل', minor: finance },
      netProfit: { label: 'صافي الربح', minor: netProfit }
    },
    components: {
      cash: get('cash'),
      receivables: get('receivables'),
      inventory: get('inventory')
    },
    articulation: {
      balanceCheckMinor: balanceCheck,
      articulated: balanceCheck === 0n,
      note: 'الأصول = الالتزامات + حقوق الملكية بعد إدراج نتيجة الفترة'
    },
    standard: 'IAS 1 — عرض القوائم المالية (تصنيف متداول/غير متداول)'
  };
}



