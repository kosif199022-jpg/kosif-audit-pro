/*
 * KOSIF — مجلس المراجعين
 *
 * ثلاثة مراجعين بأدوار مختلفة يفحصون نفس الملف من ثلاث زوايا. كل واحد
 * يُنتج ملاحظات، وكل ملاحظة تحمل ثلاثة أشياء إلزامية:
 *   1. الرقم الذي بنيت عليه — من المحرّك الحتمي، لا من نموذج لغوي.
 *   2. المعيار الذي يحكمها — بكوده وتاريخ آخر تعديل ورابط مصدره.
 *   3. الإجراء المقترح — قابل للتنفيذ في جولة محددة.
 *
 * المجلس لا يصدر رأيًا ولا يعتمد جولة ولا يغيّر رقمًا. مخرجاته ملاحظات
 * موجَّهة لمراجع بشري يقرر.
 */

import { standardsForFinding, standardsForAccount } from '../standards/linkage.mjs';

export const BOARD_VERSION = '1.0.0';

export const REVIEWERS = Object.freeze([
  Object.freeze({ id: 'technical', name: 'المراجع الفني المحاسبي', focus: 'صحة القياس والعرض والتصنيف', series: 0 }),
  Object.freeze({ id: 'compliance', name: 'مراجع الامتثال والإفصاح', focus: 'انطباق المعايير واكتمال الإفصاح', series: 1 }),
  Object.freeze({ id: 'risk', name: 'مدقق المخاطر والأدلة', focus: 'مؤشرات الغش وكفاية الأدلة', series: 2 })
]);

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

function note({ reviewer, severity, title, detail, basis, standards, action, round }) {
  return {
    reviewer, severity, title, detail,
    basis,                       // الرقم الحتمي الذي بنيت عليه الملاحظة
    standards: standards ?? [],  // الاستشهادات الكاملة
    action,                      // ماذا يفعل المراجع البشري
    round,                       // في أي جولة يُنفَّذ الإجراء
    origin: 'deterministic'      // لم يشارك نموذج لغوي في إنتاج هذه الملاحظة
  };
}

/** المراجع الفني: التوازن، الاتساق، التصنيف، المقاصة. */
function technicalReview(result) {
  const notes = [];
  const tb = result.trialBalance;
  const st = result.statements;

  if (!tb.balanced) {
    notes.push(note({
      reviewer: 'technical', severity: 'high',
      title: 'الميزان غير متوازن',
      detail: 'لا يمكن بناء قوائم مالية ولا إبداء رأي على ميزان لا يتوازن. كل رقم لاحق مشكوك فيه حتى يُغلق هذا الفرق.',
      basis: { label: 'فرق الميزان (وحدات صغرى)', value: tb.difference.toString() },
      standards: standardsForFinding({ code: 'OUT_OF_BALANCE', title: 'الميزان غير متوازن' }),
      action: 'أغلق الفرق قبل الانتقال — راجع الحساب الذي يطابق الفرق تمامًا إن وُجد.',
      round: 'A02'
    }));
  }

  if (!st.articulation.articulated) {
    notes.push(note({
      reviewer: 'technical', severity: 'high',
      title: 'القوائم غير متسقة',
      detail: 'الأصول لا تساوي الالتزامات مضافًا إليها حقوق الملكية بعد إدراج نتيجة الفترة.',
      basis: { label: 'فرق المعادلة المحاسبية', value: st.articulation.balanceCheckMinor.toString() },
      standards: standardsForFinding({ code: 'OUT_OF_BALANCE', title: 'اتساق القوائم' }),
      action: 'تحقق من تعيين الحسابات إلى بنود القوائم — قد يكون حساب مصنّفًا في الجانب الخطأ.',
      round: 'A02'
    }));
  }

  if (tb.unclassified > 0) {
    const rows = tb.rows.filter(r => r.type === 'suspense');
    notes.push(note({
      reviewer: 'technical', severity: 'medium',
      title: `${tb.unclassified} حساب بلا تصنيف`,
      detail: 'الحسابات غير المصنّفة لا تدخل القوائم، فتظهر الأرقام ناقصة دون أن يبدو ذلك.',
      basis: { label: 'الحسابات', value: rows.slice(0, 8).map(r => r.code).join('، ') },
      standards: standardsForFinding({ code: 'UNCLASSIFIED_ACCOUNTS', title: 'حسابات بلا تصنيف' }),
      action: 'صنّف كل حساب أو استبعده صراحة مع تعليل.',
      round: 'A02'
    }));
  }

  const gross = tb.rows.filter(r => r.debit > 0n && r.credit > 0n);
  if (gross.length) {
    notes.push(note({
      reviewer: 'technical', severity: 'low',
      title: `${gross.length} حساب برصيد مدين ودائن معًا`,
      detail: 'أرصدة غير مصفّاة قد تخفي مقاصة غير مسموح بها بين أصل والتزام.',
      basis: { label: 'الحسابات', value: gross.slice(0, 8).map(r => r.code).join('، ') },
      standards: standardsForFinding({ code: 'GROSS_BALANCES', title: 'أرصدة غير مصفّاة' }),
      action: 'اعرض البنود بالإجمالي ما لم ينص معيار على المقاصة.',
      round: 'A06'
    }));
  }

  return notes;
}

/** مراجع الامتثال: أي معيار يمسّ هذا الملف، وهل طرأ عليه تعديل حديث. */
function complianceReview(result) {
  const notes = [];
  const rows = result.trialBalance.rows ?? [];

  // حسابات تجرّ معايير طرأ عليها تعديل ساري أو وشيك — أعلى قيمة عملية للمراجع
  const touched = new Map();
  for (const row of rows) {
    for (const citation of standardsForAccount(row)) {
      if (!touched.has(citation.code)) touched.set(citation.code, { citation, accounts: [] });
      touched.get(citation.code).accounts.push(row.code);
    }
  }

  for (const { citation, accounts } of touched.values()) {
    const recent = /202[4-9]|2030|سيحل محله|النسخة المنقحة|قيد التنقيح/.test(citation.lastUpdate);
    if (!recent) continue;
    notes.push(note({
      reviewer: 'compliance', severity: 'medium',
      title: `${citation.code} — تعديل يستوجب الانتباه`,
      detail: `${citation.ar}: ${citation.lastUpdate}`,
      basis: { label: 'حسابات متأثرة', value: accounts.slice(0, 8).join('، ') },
      standards: [citation],
      action: 'تحقق من أن سياسة المنشأة تعكس التعديل الساري لهذه الفترة، وراجع الإفصاح المقابل.',
      round: 'A02'
    }));
  }

  if (result.statements.unmapped?.length) {
    notes.push(note({
      reviewer: 'compliance', severity: 'medium',
      title: `${result.statements.unmapped.length} حساب بلا تعيين لبند قائمة`,
      detail: 'حساب لا يُعيَّن إلى بند لا يظهر في العرض، والعرض الناقص إخلال بالاكتمال.',
      basis: { label: 'الحسابات', value: result.statements.unmapped.slice(0, 8).join('، ') },
      standards: standardsForFinding({ code: 'UNCLASSIFIED_ACCOUNTS', title: 'بلا تعيين' }),
      action: 'عيّن كل حساب إلى بند في المركز المالي أو الدخل.',
      round: 'A02'
    }));
  }

  return notes;
}

/** مدقق المخاطر: بنفورد، السيولة، الملاءة، التحريفات، كفاية العيّنة. */
function riskReview(result) {
  const notes = [];
  const a = result.analysis;

  if (a.benford?.ok && a.benford.verdict !== 'MATCH') {
    const flagged = a.benford.digits.filter(d => d.flagged);
    notes.push(note({
      reviewer: 'risk', severity: a.benford.verdict === 'INVESTIGATE' ? 'high' : 'medium',
      title: `توزيع الرقم الأول ينحرف عن بنفورد (${a.benford.verdict})`,
      detail: flagged.length
        ? `الأرقام ${flagged.map(d => d.digit).join('، ')} خارج النطاق المتوقع بأكثر من 5 نقاط مئوية.`
        : 'الانحراف الكلي مرتفع دون تركّز في رقم بعينه.',
      basis: { label: 'المسافة الإقليدية المعيّرة (NED)', value: String(a.benford.ned) },
      standards: standardsForFinding({ code: 'BENFORD_DEVIATION', title: 'انحراف بنفورد' }),
      action: 'وسّع الفحص على القيود اليدوية والقيود قرب نهاية الفترة. الانحراف مؤشر تحرٍّ لا دليل غش.',
      round: 'A06'
    }));
  }

  const current = Number(a.ratios?.liquidity?.currentRatio ?? 0);
  if (current > 0 && current < 100) {
    notes.push(note({
      reviewer: 'risk', severity: 'high',
      title: 'الالتزامات المتداولة تتجاوز الأصول المتداولة',
      detail: 'رأس مال عامل سالب — أحد المؤشرات التي يذكرها ISA 570 صراحةً لتقييم الاستمرارية.',
      basis: { label: 'نسبة التداول', value: `${current}%` },
      standards: standardsForFinding({ code: 'LIQUIDITY_STRESS', title: 'ضغط سيولة' }),
      action: 'اطلب من الإدارة خطة تدفقات نقدية اثني عشر شهرًا، وقيّم مدى واقعيتها.',
      round: 'A08'
    }));
  }

  if (a.solvency?.ok && a.solvency.zone === 'DISTRESS') {
    notes.push(note({
      reviewer: 'risk', severity: 'high',
      title: 'مؤشر ألتمان في منطقة التعثّر',
      detail: 'النموذج مؤشر إحصائي لا حكم قانوني، لكنه يستوجب توثيق تقييم الاستمرارية.',
      basis: { label: 'ألتمان Z', value: String(a.solvency.z) },
      standards: standardsForFinding({ code: 'GOING_CONCERN_DOUBT', title: 'شك في الاستمرارية' }),
      action: 'وثّق تقييم الاستمرارية وأثره المحتمل على فقرة التقرير.',
      round: 'A08'
    }));
  }

  if (result.misstatements?.exceedsPerformanceMateriality) {
    notes.push(note({
      reviewer: 'risk', severity: 'high',
      title: 'التحريفات غير المصححة تتجاوز أهمية الأداء',
      detail: 'تجاوز أهمية الأداء يستوجب طلب تعديل أو تقييم أثره على الرأي.',
      basis: { label: 'الإجمالي غير المصحّح (وحدات صغرى)', value: result.misstatements.uncorrectedTotal.minor.toString() },
      standards: standardsForFinding({ code: 'MISSTATEMENTS_EXCEED_PM', title: 'تجاوز أهمية الأداء' }),
      action: 'اطلب التعديل كتابةً؛ فإن رُفض فقيّم أثره على نوع الرأي.',
      round: 'A09'
    }));
  }

  const coverage = Number(result.sample?.coveragePct ?? 0);
  if (result.sample?.selected?.length && coverage < 30) {
    notes.push(note({
      reviewer: 'risk', severity: 'medium',
      title: 'تغطية العيّنة منخفضة',
      detail: 'تغطية قيمية منخفضة تضعف قدرة العيّنة على اكتشاف تحريف جوهري.',
      basis: { label: 'تغطية القيمة', value: `${coverage}%` },
      standards: standardsForFinding({ code: 'AMOUNT_NOT_NUMERIC', title: 'كفاية الدليل' }).length
        ? standardsForFinding({ code: 'AMOUNT_NOT_NUMERIC', title: 'كفاية الدليل' })
        : [],
      action: 'ارفع حجم العيّنة أو أضف فحصًا موجّهًا لأكبر الأرصدة.',
      round: 'A06'
    }));
  }

  return notes;
}

/**
 * يشغّل المجلس على نتيجة خط المعالجة.
 * دالة نقية: نفس النتيجة تعطي نفس الملاحظات بنفس الترتيب.
 */
export function runBoard(result) {
  const notes = [...technicalReview(result), ...complianceReview(result), ...riskReview(result)];
  notes.sort((a, b) =>
    (SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]) ||
    a.reviewer.localeCompare(b.reviewer, 'en') ||
    a.title.localeCompare(b.title, 'ar'));

  const byReviewer = REVIEWERS.map(reviewer => ({
    ...reviewer,
    notes: notes.filter(n => n.reviewer === reviewer.id)
  }));

  const cited = new Set(notes.flatMap(n => n.standards.map(s => s.code)));

  return {
    version: BOARD_VERSION,
    notes,
    byReviewer,
    counts: {
      high: notes.filter(n => n.severity === 'high').length,
      medium: notes.filter(n => n.severity === 'medium').length,
      low: notes.filter(n => n.severity === 'low').length
    },
    standardsCited: [...cited].sort(),
    boundary: 'المجلس يلاحظ ويستشهد ويقترح. لا يصدر رأيًا، ولا يعتمد جولة، ولا يغيّر رقمًا.'
  };
}
