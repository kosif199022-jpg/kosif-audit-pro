/*
 * KOSIF — برنامج المراجعة: عشر جولات ببوابات حقيقية
 *
 * الجولة هنا ليست عنوانًا في قائمة ولا مربع اختيار. كل بوابة دالة
 * تُقيَّم على حالة الارتباط الفعلية، فتفتح أو تبقى مغلقة مع ذكر السبب
 * وما ينقص بالضبط. لا يمكن ختم جولة لأن المستخدم «يشعر» أنها انتهت.
 *
 * البوابات الحتمية تفتح من البيانات. البوابات التي تتطلب حكمًا بشريًا
 * (قبول الارتباط، الرأي) لا يفتحها المحرّك ولا الذكاء الاصطناعي أبدًا —
 * تتطلب اعتمادًا موقّعًا باسم شخص.
 */

export const PROGRAMME_VERSION = '1.0.0';

/** حالات البوابة. */
export const GATE = Object.freeze({ OPEN: 'open', BLOCKED: 'blocked', PENDING_HUMAN: 'pending_human' });

const has = value => value !== undefined && value !== null && String(value).trim().length > 0;
const count = value => (Array.isArray(value) ? value.length : 0);

/**
 * تعريف الجولات. كل بوابة تُعيد { state, detail, missing? }.
 * `ctx` هو حالة الارتباط: { entity, result, decisions, evidence, signOffs }
 */
export const ROUNDS = Object.freeze([
  Object.freeze({
    id: 'A01', order: 1, title: 'قبول الارتباط والاستقلال',
    intent: 'لا يبدأ عمل قبل توثيق من نراجعه، وأننا مستقلون عنه، وما نطاق ارتباطنا.',
    standards: ['ISA 200', 'ISA 220'],
    gates: [
      { id: 'entity', label: 'المنشأة والفترة موثّقتان', evaluate: ctx =>
        has(ctx.entity?.name) && has(ctx.entity?.periodStart) && has(ctx.entity?.periodEnd)
          ? { state: GATE.OPEN, detail: `${ctx.entity.name} · ${ctx.entity.periodStart} إلى ${ctx.entity.periodEnd}` }
          : { state: GATE.BLOCKED, detail: 'اسم المنشأة وتاريخا بداية ونهاية الفترة مطلوبة.', missing: ['entity.name', 'entity.periodStart', 'entity.periodEnd'] } },
      { id: 'framework', label: 'إطار التقرير المالي محدَّد', evaluate: ctx =>
        has(ctx.entity?.framework)
          ? { state: GATE.OPEN, detail: ctx.entity.framework }
          : { state: GATE.BLOCKED, detail: 'حدّد الإطار (IFRS المعتمدة في المملكة أو IFRS للمنشآت الصغيرة).', missing: ['entity.framework'] } },
      { id: 'independence', label: 'إقرار الاستقلال موقَّع', humanOnly: true, evaluate: ctx =>
        ctx.signOffs?.independence?.by
          ? { state: GATE.OPEN, detail: `أقرّه ${ctx.signOffs.independence.by}` }
          : { state: GATE.PENDING_HUMAN, detail: 'الاستقلال حكم شخصي — لا يقرّه المحرّك ولا نموذج لغوي.', missing: ['signOffs.independence'] } }
    ]
  }),
  Object.freeze({
    id: 'A02', order: 2, title: 'فهم المنشأة والبيئة',
    intent: 'لا تُقيَّم مخاطر منشأة لا نعرف نشاطها ولا نظمها ولا أطرافها ذات العلاقة.',
    standards: ['ISA 315'],
    gates: [
      { id: 'activity', label: 'النشاط والقطاع موصوفان', evaluate: ctx =>
        has(ctx.entity?.activity)
          ? { state: GATE.OPEN, detail: ctx.entity.activity }
          : { state: GATE.BLOCKED, detail: 'صف نشاط المنشأة — هو ما يحدد المعايير المنطبقة.', missing: ['entity.activity'] } },
      { id: 'chart', label: 'دليل الحسابات محمّل', evaluate: ctx =>
        count(ctx.result?.trialBalance?.rows) > 0
          ? { state: GATE.OPEN, detail: `${ctx.result.trialBalance.rows.length} حساب` }
          : { state: GATE.BLOCKED, detail: 'استورد ميزان المراجعة أولًا.', missing: ['trialBalance'] } },
      { id: 'related', label: 'الأطراف ذات العلاقة مفحوصة', evaluate: ctx => {
        const rows = ctx.result?.trialBalance?.rows ?? [];
        const flagged = rows.filter(r => /جاري الشريك|جاري شريك|أطراف ذات علاقة|related/i.test(r.name));
        if (!rows.length) return { state: GATE.BLOCKED, detail: 'لا بيانات للفحص.', missing: ['trialBalance'] };
        return { state: GATE.OPEN, detail: flagged.length ? `${flagged.length} حساب طرف ذي علاقة: ${flagged.map(r => r.code).join('، ')}` : 'لم تُرصد حسابات أطراف ذات علاقة في الميزان.' };
      } }
    ]
  }),
  Object.freeze({
    id: 'A03', order: 3, title: 'الأهمية النسبية',
    intent: 'كل قرار لاحق يُقاس بهذه العتبة، فلا تُؤجَّل ولا تُقدَّر ارتجالًا.',
    standards: ['ISA 320'],
    gates: [
      { id: 'computed', label: 'الأهمية النسبية محسوبة', evaluate: ctx =>
        ctx.result?.analysis?.materiality?.ok
          ? { state: GATE.OPEN, detail: `الكلية ${ctx.result.analysis.materiality.overall.minor} (وحدات صغرى) على أساس ${ctx.result.analysis.materiality.basisLabel}` }
          : { state: GATE.BLOCKED, detail: 'الأساس المختار غير موجب — اختر أساسًا آخر.', missing: ['analysis.materiality'] } },
      { id: 'basis-justified', label: 'سبب اختيار الأساس موثّق', evaluate: ctx =>
        has(ctx.decisions?.materialityBasisReason)
          ? { state: GATE.OPEN, detail: ctx.decisions.materialityBasisReason }
          : { state: GATE.BLOCKED, detail: 'اذكر لماذا هذا الأساس مناسب لهذه المنشأة تحديدًا.', missing: ['decisions.materialityBasisReason'] } }
    ]
  }),
  Object.freeze({
    id: 'A04', order: 4, title: 'تقييم المخاطر',
    intent: 'كل خطر يُربط بحساب وتأكيد، وإلا فهو كلام لا إجراء.',
    standards: ['ISA 315', 'ISA 240'],
    gates: [
      { id: 'index', label: 'مؤشر المخاطر محسوب', evaluate: ctx =>
        ctx.result?.analysis?.risk
          ? { state: GATE.OPEN, detail: `${ctx.result.analysis.risk.index}/100 — ${ctx.result.analysis.risk.bandLabel}` }
          : { state: GATE.BLOCKED, detail: 'شغّل التحليل أولًا.', missing: ['analysis.risk'] } },
      { id: 'fraud-presumption', label: 'افتراض خطر الغش في الإيراد مُعالج', evaluate: ctx =>
        has(ctx.decisions?.revenueFraudResponse)
          ? { state: GATE.OPEN, detail: ctx.decisions.revenueFraudResponse }
          : { state: GATE.BLOCKED, detail: 'ISA 240 يفترض خطر غش في إثبات الإيراد — وثّق استجابتك أو سبب دحض الافتراض.', missing: ['decisions.revenueFraudResponse'] } },
      { id: 'significant-risks', label: 'المخاطر الجوهرية مربوطة بحسابات', evaluate: ctx =>
        count(ctx.decisions?.significantRisks) > 0
          ? { state: GATE.OPEN, detail: `${ctx.decisions.significantRisks.length} خطر جوهري مرتبط` }
          : { state: GATE.BLOCKED, detail: 'أضف خطرًا جوهريًا واحدًا على الأقل مربوطًا بحساب وتأكيد.', missing: ['decisions.significantRisks'] } }
    ]
  }),
  Object.freeze({
    id: 'A05', order: 5, title: 'الضوابط والاختبارات',
    intent: 'الاعتماد على ضابط دون اختباره افتراض لا دليل.',
    standards: ['ISA 315', 'ISA 330'],
    gates: [
      { id: 'controls-decision', label: 'قرار الاعتماد على الضوابط متخذ', evaluate: ctx =>
        has(ctx.decisions?.controlsReliance)
          ? { state: GATE.OPEN, detail: ctx.decisions.controlsReliance === 'rely' ? 'نعتمد على الضوابط ونختبر فعاليتها' : 'لا نعتمد على الضوابط — منهج جوهري بالكامل' }
          : { state: GATE.BLOCKED, detail: 'قرّر: منهج جوهري بالكامل أم اعتماد على الضوابط.', missing: ['decisions.controlsReliance'] } },
      { id: 'tests', label: 'اختبارات الفعالية موثّقة عند الاعتماد', evaluate: ctx => {
        if (ctx.decisions?.controlsReliance !== 'rely') return { state: GATE.OPEN, detail: 'غير مطلوب — المنهج جوهري بالكامل.' };
        return count(ctx.evidence?.controlTests) > 0
          ? { state: GATE.OPEN, detail: `${ctx.evidence.controlTests.length} اختبار ضابط موثّق` }
          : { state: GATE.BLOCKED, detail: 'الاعتماد على الضوابط يستوجب اختبار فعاليتها التشغيلية.', missing: ['evidence.controlTests'] };
      } }
    ]
  }),
  Object.freeze({
    id: 'A06', order: 6, title: 'الإجراءات الجوهرية',
    intent: 'العيّنة والتحليل ينتجان نتائج، وكل نتيجة تحتاج دليلًا مرجعيًا.',
    standards: ['ISA 330', 'ISA 500', 'ISA 520', 'ISA 530'],
    gates: [
      { id: 'analytics', label: 'الإجراءات التحليلية منفّذة', evaluate: ctx =>
        ctx.result?.analysis?.benford
          ? { state: GATE.OPEN, detail: ctx.result.analysis.benford.ok ? `بنفورد: ${ctx.result.analysis.benford.verdict} (NED ${ctx.result.analysis.benford.ned})` : 'عيّنة غير كافية لبنفورد — نُفّذت النِسب فقط' }
          : { state: GATE.BLOCKED, detail: 'شغّل التحليل.', missing: ['analysis'] } },
      { id: 'sample', label: 'عيّنة مسحوبة وقابلة لإعادة الإنتاج', evaluate: ctx =>
        count(ctx.result?.sample?.selected) > 0
          ? { state: GATE.OPEN, detail: `${ctx.result.sample.selected.length} بند · تغطية ${ctx.result.sample.coveragePct}% · بذرة «${ctx.result.sample.seed}»` }
          : { state: GATE.BLOCKED, detail: 'اسحب عيّنة.', missing: ['sample'] } },
      { id: 'evidence-linked', label: 'كل بند عيّنة مربوط بدليل', evaluate: ctx => {
        const selected = ctx.result?.sample?.selected ?? [];
        if (!selected.length) return { state: GATE.BLOCKED, detail: 'لا عيّنة بعد.', missing: ['sample'] };
        const linked = new Set((ctx.evidence?.items ?? []).map(e => e.account));
        const open = selected.filter(item => !linked.has(item.code));
        return open.length === 0
          ? { state: GATE.OPEN, detail: `الأدلة مكتملة لكل بنود العيّنة (${selected.length})` }
          : { state: GATE.BLOCKED, detail: `${open.length} بند بلا دليل: ${open.slice(0, 6).map(i => i.code).join('، ')}`, missing: open.map(i => `evidence:${i.code}`) };
      } }
    ]
  }),
  Object.freeze({
    id: 'A07', order: 7, title: 'التقديرات والأحكام',
    intent: 'التقدير هو المكان الذي يدخل منه التحيّز الإداري.',
    standards: ['ISA 540', 'IFRS 9'],
    gates: [
      { id: 'ecl', label: 'مخصص الخسائر الائتمانية مُقيَّم', evaluate: ctx =>
        ctx.result?.aging
          ? { state: GATE.OPEN, detail: `المخصص المحتسب ${ctx.result.aging.provisionEclMinor} (وحدات صغرى) على مصفوفة IFRS 9 المبسطة` }
          : { state: GATE.BLOCKED, detail: 'حمّل أعمار الذمم.', missing: ['aging'] } },
      { id: 'bias', label: 'التحيّز الإداري مُقيَّم', evaluate: ctx =>
        has(ctx.decisions?.managementBias)
          ? { state: GATE.OPEN, detail: ctx.decisions.managementBias }
          : { state: GATE.BLOCKED, detail: 'سجّل تقييمك لاتجاه التقديرات: محافظ، متفائل، أم محايد.', missing: ['decisions.managementBias'] } }
    ]
  }),
  Object.freeze({
    id: 'A08', order: 8, title: 'الاستمرارية والأحداث اللاحقة',
    intent: 'الرأي عن قوائم منشأة قد لا تستمر رأي مختلف تمامًا.',
    standards: ['ISA 570', 'IAS 1'],
    gates: [
      { id: 'solvency', label: 'مؤشرات الملاءة محسوبة', evaluate: ctx =>
        ctx.result?.analysis?.solvency?.ok
          ? { state: GATE.OPEN, detail: `ألتمان Z = ${ctx.result.analysis.solvency.z} (${ctx.result.analysis.solvency.zone})` }
          : { state: GATE.BLOCKED, detail: 'تعذّر حساب الملاءة — تحقق من إجمالي الأصول.', missing: ['analysis.solvency'] } },
      { id: 'conclusion', label: 'استنتاج الاستمرارية مسجَّل', evaluate: ctx =>
        has(ctx.decisions?.goingConcern)
          ? { state: GATE.OPEN, detail: ctx.decisions.goingConcern }
          : { state: GATE.BLOCKED, detail: 'سجّل استنتاجك: لا شك جوهري، أو شك جوهري مع إفصاح، أو أساس غير ملائم.', missing: ['decisions.goingConcern'] } },
      { id: 'subsequent', label: 'الأحداث اللاحقة مفحوصة حتى تاريخ التقرير', evaluate: ctx =>
        has(ctx.decisions?.subsequentEventsThrough)
          ? { state: GATE.OPEN, detail: `مفحوصة حتى ${ctx.decisions.subsequentEventsThrough}` }
          : { state: GATE.BLOCKED, detail: 'حدّد التاريخ الذي فُحصت الأحداث اللاحقة حتى عنده.', missing: ['decisions.subsequentEventsThrough'] } }
    ]
  }),
  Object.freeze({
    id: 'A09', order: 9, title: 'الإكمال والتحريفات',
    intent: 'التحريفات تُجمَّع قبل الرأي، لا بعده.',
    standards: ['ISA 450'],
    gates: [
      { id: 'aggregated', label: 'التحريفات مجمَّعة', evaluate: ctx =>
        ctx.result?.misstatements
          ? { state: GATE.OPEN, detail: `غير المصحّح ${ctx.result.misstatements.uncorrectedTotal.minor} (وحدات صغرى)` }
          : { state: GATE.BLOCKED, detail: 'التجميع يتطلب أهمية نسبية صالحة.', missing: ['misstatements'] } },
      { id: 'pm-response', label: 'تجاوز أهمية الأداء مُعالج', evaluate: ctx => {
        const mis = ctx.result?.misstatements;
        if (!mis) return { state: GATE.BLOCKED, detail: 'لا تجميع بعد.', missing: ['misstatements'] };
        if (!mis.exceedsPerformanceMateriality) return { state: GATE.OPEN, detail: 'الإجمالي غير المصحّح دون أهمية الأداء.' };
        return has(ctx.decisions?.uncorrectedResponse)
          ? { state: GATE.OPEN, detail: ctx.decisions.uncorrectedResponse }
          : { state: GATE.BLOCKED, detail: 'التحريفات غير المصححة تتجاوز أهمية الأداء — وثّق طلب التعديل أو أثره على الرأي.', missing: ['decisions.uncorrectedResponse'] };
      } }
    ]
  }),
  Object.freeze({
    id: 'A10', order: 10, title: 'التقرير ومراجعة الجودة',
    intent: 'الرأي قرار إنسان. لا يصدره محرّك ولا نموذج لغوي.',
    standards: ['ISA 700', 'ISA 220'],
    gates: [
      { id: 'prior-rounds', label: 'كل الجولات السابقة مفتوحة', evaluate: (ctx, programme) => {
        const blocked = (programme ?? []).filter(r => r.id !== 'A10' && r.status !== GATE.OPEN);
        return blocked.length === 0
          ? { state: GATE.OPEN, detail: 'الجولات التسع السابقة مكتملة.' }
          : { state: GATE.BLOCKED, detail: `${blocked.length} جولة غير مكتملة: ${blocked.map(r => r.id).join('، ')}`, missing: blocked.map(r => r.id) };
      } },
      { id: 'opinion', label: 'الرأي محدَّد', humanOnly: true, evaluate: ctx =>
        has(ctx.decisions?.opinion)
          ? { state: GATE.OPEN, detail: ctx.decisions.opinion }
          : { state: GATE.PENDING_HUMAN, detail: 'حدّد الرأي: غير معدّل، أو متحفظ، أو معارض، أو امتناع.', missing: ['decisions.opinion'] } },
      { id: 'partner', label: 'اعتماد الشريك موقَّع', humanOnly: true, evaluate: ctx =>
        ctx.signOffs?.partner?.by
          ? { state: GATE.OPEN, detail: `اعتمده ${ctx.signOffs.partner.by}` }
          : { state: GATE.PENDING_HUMAN, detail: 'لا يُصدر التقرير بلا اعتماد بشري موقَّع باسم.', missing: ['signOffs.partner'] } }
    ]
  })
]);

/**
 * يقيّم البرنامج كاملًا على حالة الارتباط.
 * الترتيب مهم: A10 تحتاج نتيجة الجولات السابقة، فتُقيَّم أخيرًا.
 */
export function evaluateProgramme(ctx = {}) {
  const evaluated = [];

  for (const round of ROUNDS) {
    const gates = round.gates.map(gate => {
      let outcome;
      try {
        outcome = gate.evaluate(ctx, evaluated);
      } catch (error) {
        outcome = { state: GATE.BLOCKED, detail: `تعذّر تقييم البوابة: ${error.message}` };
      }
      return { id: gate.id, label: gate.label, humanOnly: Boolean(gate.humanOnly), ...outcome };
    });

    const blocked = gates.filter(g => g.state === GATE.BLOCKED);
    const pending = gates.filter(g => g.state === GATE.PENDING_HUMAN);
    const status = blocked.length ? GATE.BLOCKED : pending.length ? GATE.PENDING_HUMAN : GATE.OPEN;

    evaluated.push({
      id: round.id, order: round.order, title: round.title, intent: round.intent,
      standards: round.standards, gates, status,
      openGates: gates.filter(g => g.state === GATE.OPEN).length,
      totalGates: gates.length,
      missing: gates.flatMap(g => g.missing ?? [])
    });
  }

  const open = evaluated.filter(r => r.status === GATE.OPEN).length;
  const totalGates = evaluated.reduce((n, r) => n + r.totalGates, 0);
  const openGatesTotal = evaluated.reduce((n, r) => n + r.openGates, 0);

  return {
    version: PROGRAMME_VERSION,
    rounds: evaluated,
    roundsOpen: open,
    roundsTotal: evaluated.length,
    gatesOpen: openGatesTotal,
    gatesTotal: totalGates,
    progressPct: totalGates ? Math.round((openGatesTotal / totalGates) * 1000) / 10 : 0,
    // الجولة التالية القابلة للعمل: أول جولة غير مفتوحة — هذا ما يفتحه التطبيق افتراضيًا
    nextRound: evaluated.find(r => r.status !== GATE.OPEN) ?? null,
    reportable: evaluated.every(r => r.status === GATE.OPEN)
  };
}
