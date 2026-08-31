/*
 * KOSIF — الارتباط
 *
 * الارتباط هو الحالة التي يتراكم عليها العمل: المنشأة، البيانات،
 * القرارات، الأدلة، والاعتمادات. التطبيق ليس صفحات تُتصفَّح بل ارتباط
 * يتقدّم — وكل شاشة تعرض جزءًا من هذه الحالة الواحدة.
 */

import { parseTrialBalance, summarizeByType, diagnoseTrialBalance, largestBalances } from '../core/trial-balance.mjs';
import { buildStatements } from '../core/statements.mjs';
import { analyze, auditSample, aggregateMisstatements, receivablesAging } from '../core/analysis.mjs';
import { DEMO_TRIAL_BALANCE, DEMO_MISSTATEMENTS, DEMO_RECEIVABLES, DEMO_ENTITY } from '../core/dataset.mjs';
import { evaluateProgramme, GATE } from './rounds.mjs';
import { runBoard } from '../reviewer/board.mjs';
import { citationsForEngagement } from '../standards/linkage.mjs';

export const ENGAGEMENT_VERSION = '1.0.0';
export const STATE_SCHEMA = 1;

/** حالة ارتباط فارغة — لا افتراضات مخفية. */
export function emptyEngagement() {
  return {
    schema: STATE_SCHEMA,
    entity: { name: '', activity: '', framework: '', periodStart: '', periodEnd: '', currency: 'ر.س' },
    trialBalanceText: '',
    options: {
      materiality: { basis: 'profit', riskProfile: 'medium' },
      sample: { size: 12, seed: 'kosif', method: 'monetary-unit' }
    },
    decisions: {},
    evidence: { items: [], controlTests: [] },
    signOffs: {},
    misstatements: [],
    receivables: []
  };
}

/** ارتباط تجريبي جاهز — يُقلع التطبيق بعمل حقيقي لا بشاشة فارغة. */
export function demoEngagement() {
  const base = emptyEngagement();
  return {
    ...base,
    entity: { ...DEMO_ENTITY },
    trialBalanceText: DEMO_TRIAL_BALANCE,
    misstatements: DEMO_MISSTATEMENTS.map(m => ({ ...m })),
    receivables: DEMO_RECEIVABLES.map(r => ({ ...r })),
    decisions: {
      materialityBasisReason: 'المنشأة خدمية مستقرة الربحية، فالربح قبل الضريبة أنسب أساس يعكس اهتمام مستخدمي القوائم.'
    }
  };
}

/**
 * يحسب كل ما يُشتق من الحالة. دالة نقية: نفس الحالة ⇒ نفس المخرجات.
 * لا شبكة، ولا ساعة حائط، ولا عشوائية غير مبذورة.
 */
export function computeEngagement(state) {
  const trialBalance = parseTrialBalance(state.trialBalanceText, {});
  const statements = buildStatements(trialBalance);
  const analysis = analyze(trialBalance, statements, state.options);
  const findings = diagnoseTrialBalance(trialBalance);
  const sample = auditSample(trialBalance, state.options.sample);
  const misstatements = analysis.materiality.ok
    ? aggregateMisstatements(state.misstatements ?? [], analysis.materiality)
    : null;
  const aging = receivablesAging((state.receivables ?? []).map(r => ({ ...r, minor: BigInt(r.minor) })));

  const result = {
    trialBalance,
    byType: summarizeByType(trialBalance),
    largest: largestBalances(trialBalance, 8),
    statements, analysis, findings, sample, misstatements, aging
  };

  const programme = evaluateProgramme({
    entity: state.entity,
    result,
    decisions: state.decisions,
    evidence: state.evidence,
    signOffs: state.signOffs
  });

  const board = runBoard(result);
  const citations = citationsForEngagement({ accounts: trialBalance.rows, findings });

  return {
    version: ENGAGEMENT_VERSION,
    entity: state.entity,
    result,
    programme,
    board,
    citations,
    // ما يجب فعله الآن — الشيء الوحيد الذي يفتح عليه التطبيق
    nextAction: nextAction(programme, board)
  };
}

/**
 * الخطوة التالية الواحدة. تطبيق بلا هذه الدالة يتحول إلى أرشيف:
 * يعرض كل شيء ولا يقول ماذا تفعل.
 */
function nextAction(programme, board) {
  const blockingNote = board.notes.find(n => n.severity === 'high');
  const round = programme.nextRound;

  if (!round) {
    return { kind: 'complete', title: 'الارتباط جاهز للتقرير', detail: 'كل الجولات مفتوحة والاعتمادات موقّعة.', route: '#/report' };
  }

  const blocked = round.gates.find(g => g.state === GATE.BLOCKED);
  if (blocked) {
    return {
      kind: 'gate', round: round.id, gate: blocked.id,
      title: `${round.id} · ${blocked.label}`,
      detail: blocked.detail,
      route: `#/rounds/${round.id}`,
      alsoUrgent: blockingNote ? blockingNote.title : null
    };
  }

  const pending = round.gates.find(g => g.state === GATE.PENDING_HUMAN);
  return {
    kind: 'human', round: round.id, gate: pending?.id ?? null,
    title: `${round.id} · ${pending?.label ?? 'اعتماد بشري'}`,
    detail: pending?.detail ?? 'ينتظر قرارًا بشريًا.',
    route: `#/rounds/${round.id}`,
    alsoUrgent: blockingNote ? blockingNote.title : null
  };
}

/* ── الحفظ والاستعادة ──────────────────────────────────────────────── */

/** تحويل الحالة إلى نص قابل للحفظ — BigInt يُسلسل نصًا صراحةً. */
export function serializeEngagement(state) {
  return JSON.stringify(state, (_key, value) => (typeof value === 'bigint' ? value.toString() : value), 2);
}

/** استعادة حالة محفوظة مع دمجها فوق الحالة الفارغة، فلا ينكسر ملف قديم. */
export function deserializeEngagement(text) {
  const parsed = JSON.parse(text);
  const base = emptyEngagement();
  return {
    ...base,
    ...parsed,
    entity: { ...base.entity, ...(parsed.entity ?? {}) },
    options: {
      materiality: { ...base.options.materiality, ...(parsed.options?.materiality ?? {}) },
      sample: { ...base.options.sample, ...(parsed.options?.sample ?? {}) }
    },
    decisions: { ...(parsed.decisions ?? {}) },
    evidence: { items: [], controlTests: [], ...(parsed.evidence ?? {}) },
    signOffs: { ...(parsed.signOffs ?? {}) },
    misstatements: parsed.misstatements ?? [],
    receivables: parsed.receivables ?? []
  };
}
