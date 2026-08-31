/*
 * KOSIF — ربط النتائج بالمعايير
 *
 * هذا الملف هو الفرق بين تطبيق يعرض قائمة معايير وتطبيق يستشهد بها.
 * لا توجد هنا شاشة «تصفّح المعايير»: المعيار يظهر لأنه ينطبق على حساب
 * موجود في ملفك أو على نتيجة خرجت من محرّك حتمي، ومعه سبب الانطباق
 * وتاريخ آخر تعديل ورابط المصدر.
 */

import { getStandard, STANDARDS } from './catalog.mjs';

export const LINKAGE_VERSION = '1.0.0';

/**
 * ربط بادئة كود الحساب بالمعايير التي تحكمه.
 * البادئات الأطول أولًا، وأول تطابق يفوز.
 */
const ACCOUNT_RULES = Object.freeze([
  { prefixes: ['101', '102'], codes: ['IAS 7'], why: 'حساب نقدية أو ما في حكمها' },
  { prefixes: ['112', '113'], codes: ['IFRS 9', 'IFRS 7'], why: 'ذمم مدينة تخضع لنموذج الخسائر الائتمانية المتوقعة' },
  { prefixes: ['114', '115'], codes: ['IAS 2'], why: 'مخزون يُقاس بالأقل بين التكلفة وصافي القيمة القابلة للتحقق' },
  { prefixes: ['131', '132', '133'], codes: ['IAS 16', 'IAS 36'], why: 'أصل ثابت خاضع للإهلاك واختبار انخفاض القيمة' },
  { prefixes: ['134'], codes: ['IAS 38', 'IAS 36'], why: 'أصل غير ملموس' },
  { prefixes: ['135'], codes: ['IAS 40'], why: 'عقار استثماري' },
  { prefixes: ['139'], codes: ['IAS 16'], why: 'مجمع إهلاك مرتبط بأصل ثابت' },
  { prefixes: ['16'], codes: ['IFRS 16'], why: 'أصل حق استخدام ناشئ عن عقد إيجار' },
  { prefixes: ['201', '202'], codes: ['IFRS 7'], why: 'ذمم دائنة — التزام مالي' },
  { prefixes: ['203', '204'], codes: ['IAS 37'], why: 'مستحقات ومخصصات' },
  { prefixes: ['205'], codes: ['SOCPA-CO'], why: 'التزام ضريبة القيمة المضافة' },
  { prefixes: ['206'], codes: ['SOCPA-CO', 'IAS 12'], why: 'مخصص زكاة أو ضريبة دخل' },
  { prefixes: ['207'], codes: ['IAS 19'], why: 'التزام مزايا موظفين' },
  { prefixes: ['22', '23'], codes: ['IFRS 7', 'IFRS 9'], why: 'التزام تمويلي طويل الأجل' },
  { prefixes: ['24'], codes: ['IFRS 16'], why: 'التزام إيجار' },
  { prefixes: ['30', '31', '32'], codes: ['IAS 1'], why: 'بند من بنود حقوق الملكية' },
  { prefixes: ['40', '41', '42', '43'], codes: ['IFRS 15'], why: 'إيراد من عقود مع العملاء' },
  { prefixes: ['50', '51'], codes: ['IAS 2', 'IFRS 15'], why: 'تكلفة إيراد مرتبطة بالمخزون والاعتراف بالإيراد' },
  { prefixes: ['521', '522'], codes: ['IAS 19'], why: 'مصروف رواتب ومزايا' },
  { prefixes: ['523'], codes: ['IFRS 16'], why: 'مصروف إيجار قد يستوجب رسملة' },
  { prefixes: ['527'], codes: ['IAS 16', 'IAS 38'], why: 'مصروف إهلاك أو إطفاء' },
  { prefixes: ['7'], codes: ['IFRS 7', 'IFRS 9'], why: 'أعباء تمويلية' }
]);

/** ربط كلمات في اسم الحساب بمعايير — احتياط حين لا يتبع الكود دليلًا معروفًا. */
const NAME_RULES = Object.freeze([
  { words: ['أطراف ذات علاقة', 'جاري الشريك', 'جاري شريك', 'related party'], codes: ['IAS 24', 'ISA 550'], why: 'حساب طرف ذي علاقة' },
  { words: ['قيمة عادلة', 'fair value'], codes: ['IFRS 13'], why: 'بند مقيس بالقيمة العادلة' },
  { words: ['شهرة', 'goodwill'], codes: ['IFRS 3', 'IAS 36'], why: 'شهرة تخضع لاختبار انخفاض سنوي' },
  { words: ['عملة أجنبية', 'فروق صرف', 'foreign exchange'], codes: ['IAS 21'], why: 'بند بعملة أجنبية' },
  { words: ['محتفظ به للبيع', 'held for sale'], codes: ['IFRS 5'], why: 'أصل محتفظ به للبيع' }
]);

/**
 * ربط نتيجة تشخيصية (بكودها) بالمعيار الذي يحكم معالجتها.
 * هذه هي الطريق من «وجدنا شيئًا» إلى «وهذا هو المرجع».
 */
const FINDING_RULES = Object.freeze({
  OUT_OF_BALANCE: { codes: ['IAS 1', 'ISA 500'], why: 'قوائم لا تتوازن لا يمكن عرضها ولا الاستناد إليها كدليل' },
  SINGLE_ACCOUNT_MATCHES_DIFFERENCE: { codes: ['ISA 500'], why: 'مرشّح مباشر لفحص الدليل' },
  TRANSPOSITION_SUSPECTED: { codes: ['IAS 8'], why: 'خطأ إدخال يعالَج كخطأ فترة سابقة إن كان جوهريًا' },
  UNCLASSIFIED_ACCOUNTS: { codes: ['IAS 1'], why: 'بند بلا تصنيف لا يمكن عرضه في القوائم' },
  DUPLICATE_ACCOUNT: { codes: ['ISA 240'], why: 'التكرار من أنماط الغش المعتادة' },
  GROSS_BALANCES: { codes: ['IAS 1'], why: 'المقاصة بين الأصول والالتزامات محظورة إلا بنص' },
  ZERO_BALANCE_ACCOUNTS: { codes: ['IAS 1'], why: 'حسابات خاملة تُستبعد من العرض' },
  AMOUNT_NOT_NUMERIC: { codes: ['ISA 500'], why: 'بيانات غير صالحة لا تصلح دليلًا' },
  EMPTY_INPUT: { codes: ['ISA 500'], why: 'لا دليل بلا بيانات' },
  BENFORD_DEVIATION: { codes: ['ISA 240', 'ISA 520'], why: 'انحراف توزيع الأرقام مؤشر تحرٍّ عن الغش' },
  GOING_CONCERN_DOUBT: { codes: ['ISA 570', 'IAS 1'], why: 'شك جوهري في الاستمرارية' },
  ECL_PROVISION_GAP: { codes: ['IFRS 9', 'ISA 540'], why: 'مخصص خسائر ائتمانية يستدعي تقديرًا' },
  MISSTATEMENTS_EXCEED_PM: { codes: ['ISA 450', 'ISA 700'], why: 'تحريفات غير مصححة تتجاوز أهمية الأداء تؤثر على الرأي' },
  LIQUIDITY_STRESS: { codes: ['ISA 570'], why: 'ضغط سيولة يغذّي تقييم الاستمرارية' }
});

function decorate(code, why, trigger) {
  const standard = getStandard(code);
  if (!standard) return null;
  return {
    code: standard.code,
    framework: standard.framework,
    ar: standard.ar,
    en: standard.en,
    relation: standard.relation,
    lastUpdate: standard.lastUpdate,
    source: standard.source,
    localSource: standard.localSource,
    why,
    trigger
  };
}

function unique(citations) {
  const seen = new Set();
  const out = [];
  for (const citation of citations) {
    if (!citation || seen.has(citation.code)) continue;
    seen.add(citation.code);
    out.push(citation);
  }
  return out;
}

/** المعايير التي تحكم حسابًا بعينه. */
export function standardsForAccount(account) {
  const digits = String(account?.code ?? '').replace(/\D/g, '');
  const name = String(account?.name ?? '').toLowerCase();
  const hits = [];

  for (const rule of ACCOUNT_RULES) {
    if (rule.prefixes.some(prefix => digits.startsWith(prefix))) {
      hits.push(...rule.codes.map(code => decorate(code, rule.why, `الحساب ${account.code}`)));
      break;
    }
  }
  for (const rule of NAME_RULES) {
    if (rule.words.some(word => name.includes(word))) {
      hits.push(...rule.codes.map(code => decorate(code, rule.why, `اسم الحساب «${account.name}»`)));
    }
  }
  return unique(hits);
}

/** المعايير التي تحكم معالجة نتيجة تشخيصية. */
export function standardsForFinding(finding) {
  const rule = FINDING_RULES[finding?.code];
  if (!rule) return [];
  return unique(rule.codes.map(code => decorate(code, rule.why, finding.title || finding.code)));
}

/**
 * ملف الاستشهادات لارتباط كامل: كل معيار ينطبق، ولماذا، وكم مرة أثاره الملف.
 * يُرتَّب بعدد مرات الإثارة فالأكثر صلة أولًا — لا أبجديًا.
 */
export function citationsForEngagement({ accounts = [], findings = [] } = {}) {
  const tally = new Map();

  const add = citation => {
    if (!citation) return;
    const current = tally.get(citation.code);
    if (current) {
      current.hits += 1;
      if (!current.triggers.includes(citation.trigger)) current.triggers.push(citation.trigger);
    } else {
      tally.set(citation.code, { ...citation, hits: 1, triggers: [citation.trigger] });
    }
  };

  for (const account of accounts) standardsForAccount(account).forEach(add);
  for (const finding of findings) standardsForFinding(finding).forEach(add);

  return [...tally.values()].sort((a, b) => (b.hits - a.hits) || a.code.localeCompare(b.code, 'en'));
}

/** المعايير التي لم يُثرها الملف — تُعرض مطوية، لأن غير المنطبق ليس محتوى. */
export function dormantStandards(citations) {
  const cited = new Set(citations.map(c => c.code));
  return STANDARDS.filter(s => !cited.has(s.code));
}
