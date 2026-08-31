import type { PipelineResult } from "./kosif/browser.mjs";

export type WorkspaceView =
  | "overview"
  | "rounds"
  | "requests"
  | "evidence"
  | "risks"
  | "balance"
  | "statements"
  | "standards"
  | "reports";

export type RequestStatus =
  | "open"
  | "partial"
  | "received"
  | "accepted";
export type Priority = "high" | "medium" | "low";
export type ProposalDecision = "pending" | "accepted" | "rejected";
export type AuditGateStatus = "open" | "blocked" | "pending_human";

export interface Engagement {
  id: string;
  client: string;
  period: string;
  framework: string;
  currency: string;
  phase: "fieldwork";
  currentRound: number;
  lead: string;
}

export interface AuditRound {
  id: string;
  number: number;
  title: string;
  objective: string;
  standards: string[];
  gates: AuditGate[];
  status: "closed" | "active" | "planned";
  openedOn: string;
  closedOn?: string;
  coveragePct: number;
  openRequests: number;
  openFindings: number;
}

export interface AuditGate {
  id: string;
  label: string;
  status: AuditGateStatus;
  reason: string;
  humanOnly: boolean;
  missing: string[];
}

export interface AuditGateSummary {
  total: number;
  open: number;
  blocked: number;
  pendingHuman: number;
  progressPct: number;
}

export interface NextAuditAction {
  roundId: string;
  roundNumber: number;
  roundTitle: string;
  gateId: string;
  gateLabel: string;
  reason: string;
  humanOnly: boolean;
  missing: string[];
}

export interface EvidenceRequest {
  id: string;
  title: string;
  area: string;
  status: RequestStatus;
  priority: Priority;
  dueDate: string;
  issuedOn: string;
  owner: string;
  evidenceCount: number;
  requiredCount: number;
  riskId: string;
  assertion: string;
  standardCodes: string[];
  rationale: string;
}

export interface AuditRisk {
  id: string;
  title: string;
  area: string;
  level: Priority;
  assertion: string;
  response: string;
  coveragePct: number;
  status: "covered" | "gap" | "review";
  standardCodes: string[];
}

export interface AIProposal {
  id: string;
  reviewer: string;
  role: string;
  initials: string;
  area: string;
  message: string;
  confidence: number;
  decision: ProposalDecision;
  citations: string[];
  evidenceIds: string[];
  limitation: string;
  origin?: "deterministic" | "ai_assisted";
  severity?: "critical" | "high" | "medium" | "low" | "info";
  roundId?: string;
  numericBasis?: {
    label: string;
    value: string;
  };
  suggestedAction?: string;
}

export interface StandardRecord {
  code: string;
  title: string;
  issuer: "IAASB" | "IFRS Foundation";
  category: "ISA" | "IFRS" | "IAS";
  summary: string;
  paragraphs: string[];
  release: string;
  effectiveLabel: string;
  lastReviewed: string;
  sourceUrl: string;
  linkedObjects: number;
  status: "pinned" | "available";
}

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  subject: string;
  reason: string;
}

export const engagement: Engagement = {
  id: "ENG-2026-014",
  client: "شركة المحروسة للتجارة",
  period: "مراجعة 2026",
  framework: "IFRS المعتمدة في المملكة",
  currency: "ريال سعودي",
  phase: "fieldwork",
  currentRound: 2,
  lead: "أحمد السبيعي",
};

export const auditRounds: AuditRound[] = [
  {
    id: "A01",
    number: 1,
    title: "قبول الارتباط والاستقلال",
    objective: "لا يبدأ العمل قبل توثيق المنشأة والفترة والإطار واعتماد الاستقلال.",
    standards: ["ISA 200", "ISA 220"],
    gates: [
      {
        id: "entity",
        label: "المنشأة والفترة موثقتان",
        status: "open",
        reason: "ثُبت اسم المنشأة وفترة المراجعة في ملف الارتباط ENG-2026-014.",
        humanOnly: false,
        missing: [],
      },
      {
        id: "framework",
        label: "إطار التقرير المالي محدد",
        status: "open",
        reason: "ثُبت إطار IFRS المعتمد في المملكة على مستوى الارتباط.",
        humanOnly: false,
        missing: [],
      },
      {
        id: "independence",
        label: "إقرار الاستقلال موقع",
        status: "open",
        reason: "اعتمد قائد الارتباط إقرار الاستقلال وسُجل أثر الاعتماد.",
        humanOnly: true,
        missing: [],
      },
    ],
    status: "closed",
    openedOn: "2026-03-02",
    closedOn: "2026-03-18",
    coveragePct: 100,
    openRequests: 0,
    openFindings: 0,
  },
  {
    id: "A02",
    number: 2,
    title: "فهم المنشأة والبيئة",
    objective: "ربط النشاط والنظم والأطراف ذات العلاقة بما يظهر فعليًا في البيانات.",
    standards: ["ISA 315"],
    gates: [
      {
        id: "activity",
        label: "النشاط والقطاع موصوفان",
        status: "open",
        reason: "وُثق نشاط تجارة وتوزيع السلع الاستهلاكية ومحركات الإيراد الرئيسة.",
        humanOnly: false,
        missing: [],
      },
      {
        id: "chart",
        label: "دليل الحسابات محمل ومصنف",
        status: "open",
        reason: "اجتاز ميزان العرض اختبارات التوازن والتصنيف والإسناد للمصدر.",
        humanOnly: false,
        missing: [],
      },
      {
        id: "related",
        label: "الأطراف ذات العلاقة مفحوصة",
        status: "blocked",
        reason: "تحليل الحسابات موجود، لكن إقرار الإدارة ومحضر لجنة المراجعة لم يكتمل ربطهما.",
        humanOnly: false,
        missing: ["إقرار الأطراف ذات العلاقة", "محضر لجنة المراجعة"],
      },
    ],
    status: "active",
    openedOn: "2026-04-08",
    coveragePct: 67,
    openRequests: 4,
    openFindings: 3,
  },
  {
    id: "A03",
    number: 3,
    title: "الأهمية النسبية",
    objective: "تثبيت عتبة قابلة للتتبع وسبب مهني لاختيار أساسها قبل توسيع الاختبارات.",
    standards: ["ISA 320"],
    gates: [
      {
        id: "computed",
        label: "الأهمية النسبية محسوبة",
        status: "open",
        reason: "حسبها المحرك من ميزان متوازن وبمبالغ صحيحة في الوحدات الصغرى.",
        humanOnly: false,
        missing: [],
      },
      {
        id: "basis-justified",
        label: "سبب اختيار الأساس موثق",
        status: "blocked",
        reason: "النتيجة الحسابية متاحة، لكن ملاءمة أساس الإيراد لطبيعة المنشأة تحتاج مذكرة حكم.",
        humanOnly: false,
        missing: ["مذكرة مبررات أساس الأهمية"],
      },
    ],
    status: "planned",
    openedOn: "2026-05-05",
    coveragePct: 50,
    openRequests: 0,
    openFindings: 0,
  },
  {
    id: "A04",
    number: 4,
    title: "تقييم المخاطر",
    objective: "تحويل المخاطر إلى روابط بين الحساب والتأكيد والاستجابة والإجراء.",
    standards: ["ISA 315", "ISA 240"],
    gates: [
      {
        id: "index",
        label: "مؤشر المخاطر محسوب",
        status: "open",
        reason: "شغّل المحرك مؤشر المخاطر على البيانات المستوردة وأظهر محركاته.",
        humanOnly: false,
        missing: [],
      },
      {
        id: "fraud-presumption",
        label: "افتراض خطر الغش في الإيراد معالج",
        status: "blocked",
        reason: "يجب توثيق الاستجابة لافتراض ISA 240 أو مبررات دحضه.",
        humanOnly: false,
        missing: ["استجابة خطر غش الإيراد"],
      },
      {
        id: "significant-risks",
        label: "المخاطر الجوهرية مربوطة بحسابات",
        status: "blocked",
        reason: "المخاطر مقترحة، لكنها لم تعتمد بعد مع الحسابات والتأكيدات والإجراءات.",
        humanOnly: false,
        missing: ["اعتماد مصفوفة المخاطر"],
      },
    ],
    status: "planned",
    openedOn: "2026-05-12",
    coveragePct: 33,
    openRequests: 0,
    openFindings: 2,
  },
  {
    id: "A05",
    number: 5,
    title: "الضوابط والاختبارات",
    objective: "منع الاعتماد على أي ضابط قبل قرار المنهج واختبار فعاليته التشغيلية.",
    standards: ["ISA 315", "ISA 330"],
    gates: [
      {
        id: "controls-decision",
        label: "قرار الاعتماد على الضوابط متخذ",
        status: "blocked",
        reason: "لم يعتمد بعد الاختيار بين المنهج الجوهري الكامل والاعتماد على الضوابط.",
        humanOnly: false,
        missing: ["قرار منهج الضوابط"],
      },
      {
        id: "tests",
        label: "اختبارات الفعالية موثقة عند الاعتماد",
        status: "blocked",
        reason: "تظل البوابة مغلقة إلى أن يتحدد المنهج وتُربط نتائج الاختبارات عند اللزوم.",
        humanOnly: false,
        missing: ["نتائج اختبارات الضوابط أو توثيق عدم الاعتماد"],
      },
    ],
    status: "planned",
    openedOn: "2026-05-19",
    coveragePct: 0,
    openRequests: 0,
    openFindings: 0,
  },
  {
    id: "A06",
    number: 6,
    title: "الإجراءات الجوهرية",
    objective: "تنفيذ التحليل والعينة وربط كل بند مختبر بدليل يمكن تتبعه وإعادة إنتاجه.",
    standards: ["ISA 330", "ISA 500", "ISA 520", "ISA 530"],
    gates: [
      {
        id: "analytics",
        label: "الإجراءات التحليلية منفذة",
        status: "open",
        reason: "أنتج المحرك النسب واختبار بنفورد مع الإفصاح عن حدود حجم العينة.",
        humanOnly: false,
        missing: [],
      },
      {
        id: "sample",
        label: "العينة قابلة لإعادة الإنتاج",
        status: "open",
        reason: "سُجلت بذرة الاختيار والمنهج ونسبة التغطية مع عناصر العينة.",
        humanOnly: false,
        missing: [],
      },
      {
        id: "evidence-linked",
        label: "كل بند عينة مربوط بدليل",
        status: "blocked",
        reason: "أربعة بنود مختارة ما زالت بلا أدلة مقبولة ومربوطة بالتأكيد.",
        humanOnly: false,
        missing: ["4 روابط دليل لعناصر العينة"],
      },
    ],
    status: "planned",
    openedOn: "2026-06-02",
    coveragePct: 67,
    openRequests: 4,
    openFindings: 3,
  },
  {
    id: "A07",
    number: 7,
    title: "التقديرات والأحكام",
    objective: "اختبار التقديرات ومواجهة احتمال التحيز الإداري قبل قبول نتائجها.",
    standards: ["ISA 540", "IFRS 9"],
    gates: [
      {
        id: "ecl",
        label: "مخصص الخسائر الائتمانية مقيم",
        status: "blocked",
        reason: "لم تُحمّل بعد أعمار الذمم والمدخلات المعتمدة لمصفوفة الخسائر الائتمانية.",
        humanOnly: false,
        missing: ["أعمار الذمم", "مدخلات مصفوفة ECL"],
      },
      {
        id: "bias",
        label: "التحيز الإداري مقيم",
        status: "blocked",
        reason: "يلزم استنتاج موثق لاتجاه التقديرات ومقارنته بنتائج الفترات السابقة.",
        humanOnly: false,
        missing: ["تقييم التحيز الإداري"],
      },
    ],
    status: "planned",
    openedOn: "2026-06-16",
    coveragePct: 0,
    openRequests: 0,
    openFindings: 0,
  },
  {
    id: "A08",
    number: 8,
    title: "الاستمرارية والأحداث اللاحقة",
    objective: "ربط مؤشرات الملاءة بخطة الإدارة وفحص الأحداث حتى تاريخ التقرير.",
    standards: ["ISA 570", "IAS 1"],
    gates: [
      {
        id: "solvency",
        label: "مؤشرات الملاءة محسوبة",
        status: "open",
        reason: "حُسبت مؤشرات السيولة والملاءة من قوائم متوازنة مع إسناد قيمها.",
        humanOnly: false,
        missing: [],
      },
      {
        id: "conclusion",
        label: "استنتاج الاستمرارية معتمد",
        status: "blocked",
        reason: "المؤشرات وحدها لا تكفي؛ يلزم تقييم خطة الإدارة والإفصاحات واعتماد الاستنتاج.",
        humanOnly: false,
        missing: ["تقييم خطة الإدارة", "استنتاج الاستمرارية"],
      },
      {
        id: "subsequent",
        label: "الأحداث اللاحقة مفحوصة حتى التقرير",
        status: "blocked",
        reason: "لم يثبت تاريخ نهاية الفحص ولم تربط محاضر ما بعد الفترة.",
        humanOnly: false,
        missing: ["تاريخ نهاية فحص الأحداث", "محاضر ما بعد الفترة"],
      },
    ],
    status: "planned",
    openedOn: "2026-06-30",
    coveragePct: 33,
    openRequests: 0,
    openFindings: 1,
  },
  {
    id: "A09",
    number: 9,
    title: "الإكمال والتحريفات",
    objective: "تجميع التحريفات وتقييم أثر غير المصحح منها قبل اشتقاق نتيجة التقرير.",
    standards: ["ISA 450"],
    gates: [
      {
        id: "aggregated",
        label: "التحريفات مجمعة",
        status: "blocked",
        reason: "سجل التحريفات ما زال مفتوحًا ولا توجد نسخة إكمال مثبتة.",
        humanOnly: false,
        missing: ["نسخة مثبتة من سجل التحريفات"],
      },
      {
        id: "pm-response",
        label: "تجاوز أهمية الأداء معالج",
        status: "blocked",
        reason: "لا يمكن تقييم الأثر حتى يكتمل التجميع وتوثق استجابة الإدارة للتحريفات.",
        humanOnly: false,
        missing: ["استجابة الإدارة للتحريفات غير المصححة"],
      },
    ],
    status: "planned",
    openedOn: "2026-07-14",
    coveragePct: 0,
    openRequests: 0,
    openFindings: 0,
  },
  {
    id: "A10",
    number: 10,
    title: "التقرير ومراجعة الجودة",
    objective: "اشتقاق نوع الرأي من التقييمات المعتمدة ثم إخضاع التقرير لاعتماد بشري مسمى.",
    standards: ["ISA 700", "ISA 220"],
    gates: [
      {
        id: "prior-rounds",
        label: "الجولات السابقة مكتملة",
        status: "blocked",
        reason: "ثماني جولات سابقة ما زالت تحتوي بوابات مغلقة أو تنتظر حكمًا موثقًا.",
        humanOnly: false,
        missing: ["إغلاق A02 إلى A09"],
      },
      {
        id: "derived-opinion",
        label: "نوع الرأي مشتق من التقييمات المعتمدة",
        status: "blocked",
        reason: "لا يوجد حقل رأي يدوي؛ يشتق المحرك النتيجة فقط بعد اكتمال التحريفات والنطاق والاستمرارية.",
        humanOnly: false,
        missing: ["تقييم التحريفات", "تقييم قيد النطاق", "استنتاج الاستمرارية"],
      },
      {
        id: "partner",
        label: "اعتماد الشريك موقع",
        status: "pending_human",
        reason: "يبقى إصدار التقرير متوقفًا حتى يعتمد الشريك النتيجة المشتقة باسمه وتوقيته.",
        humanOnly: true,
        missing: ["توقيع شريك الارتباط"],
      },
    ],
    status: "planned",
    openedOn: "2026-07-28",
    coveragePct: 0,
    openRequests: 0,
    openFindings: 0,
  },
];

export function getAuditGateSummary(
  rounds: AuditRound[] = auditRounds,
): AuditGateSummary {
  const gates = rounds.flatMap((round) => round.gates);
  const open = gates.filter((gate) => gate.status === "open").length;
  const blocked = gates.filter((gate) => gate.status === "blocked").length;
  const pendingHuman = gates.filter(
    (gate) => gate.status === "pending_human",
  ).length;

  return {
    total: gates.length,
    open,
    blocked,
    pendingHuman,
    progressPct: gates.length === 0 ? 0 : Math.round((open / gates.length) * 100),
  };
}

/**
 * Re-evaluates the programme gates that depend on the deterministic pipeline.
 * A failed reliance gate propagates forward so a visually complete workflow
 * can never mask an invalid, unbalanced, unclassified, or non-articulating TB.
 */
export function evaluateAuditRounds(
  pipeline: PipelineResult,
  rounds: AuditRound[] = auditRounds,
): AuditRound[] {
  const evaluated = rounds.map((round) => ({
    ...round,
    standards: [...round.standards],
    gates: round.gates.map((gate) => ({
      ...gate,
      missing: [...gate.missing],
    })),
  }));

  const replaceGate = (
    roundId: string,
    gateId: string,
    update: Pick<AuditGate, "status" | "reason" | "missing">,
  ) => {
    const round = evaluated.find((candidate) => candidate.id === roundId);
    const gate = round?.gates.find((candidate) => candidate.id === gateId);
    if (gate) Object.assign(gate, update);
  };

  if (!pipeline.reliance.canRely) {
    const blockers = pipeline.reliance.blockers.length
      ? pipeline.reliance.blockers
      : ["PIPELINE_NOT_RELIABLE"];
    const blockedByData = {
      status: "blocked" as const,
      reason: `أوقف المحرك الاعتماد: ${pipeline.reliance.rule}`,
      missing: blockers,
    };

    replaceGate("A02", "chart", blockedByData);
    replaceGate("A03", "computed", blockedByData);
    replaceGate("A04", "index", blockedByData);
    replaceGate("A06", "analytics", blockedByData);
    replaceGate("A06", "sample", blockedByData);
    replaceGate("A08", "solvency", blockedByData);
    replaceGate("A10", "derived-opinion", {
      ...blockedByData,
      reason:
        "لا يمكن اشتقاق نتيجة التقرير لأن بوابة الاعتماد الحسابية مغلقة.",
    });
  }

  return evaluated.map((round) => {
    const open = round.gates.filter((gate) => gate.status === "open").length;
    const firstGap = round.gates.find((gate) => gate.status !== "open");
    return {
      ...round,
      coveragePct:
        round.gates.length === 0
          ? 0
          : Math.round((open / round.gates.length) * 100),
      status:
        round.status === "closed" && !firstGap
          ? "closed"
          : round.status === "active"
            ? "active"
            : "planned",
    };
  });
}

export function getNextAuditAction(
  rounds: AuditRound[] = auditRounds,
): NextAuditAction | null {
  for (const round of rounds) {
    const gate = round.gates.find((candidate) => candidate.status !== "open");
    if (!gate) continue;

    return {
      roundId: round.id,
      roundNumber: round.number,
      roundTitle: round.title,
      gateId: gate.id,
      gateLabel: gate.label,
      reason: gate.reason,
      humanOnly: gate.humanOnly,
      missing: gate.missing,
    };
  }

  return null;
}

export const evidenceRequests: EvidenceRequest[] = [
  {
    id: "REQ-1042",
    title: "تحليل قيود الإيرادات اليومية — يناير إلى مارس",
    area: "الإيرادات",
    status: "open",
    priority: "high",
    dueDate: "2026-05-02",
    issuedOn: "2026-04-18",
    owner: "المدير المالي",
    evidenceCount: 1,
    requiredCount: 3,
    riskId: "RSK-REV-01",
    assertion: "الحدوث والقطع",
    standardCodes: ["ISA 240", "ISA 330", "IFRS 15"],
    rationale: "تغطي القيود اليدوية ونهاية الفترة وخطر تجاوز الإدارة للضوابط.",
  },
  {
    id: "REQ-1037",
    title: "تفاصيل العمولات المدفوعة للوكلاء",
    area: "الإيرادات",
    status: "partial",
    priority: "medium",
    dueDate: "2026-04-30",
    issuedOn: "2026-04-16",
    owner: "مدير المبيعات",
    evidenceCount: 2,
    requiredCount: 4,
    riskId: "RSK-REV-02",
    assertion: "الدقة والتصنيف",
    standardCodes: ["ISA 500", "IFRS 15"],
    rationale: "ربط العمولة بالعقد والإيراد المثبت وفترة الاستحقاق.",
  },
  {
    id: "REQ-1031",
    title: "اتفاقيات العملاء الرئيسيين وملاحق الأسعار",
    area: "الإيرادات",
    status: "received",
    priority: "high",
    dueDate: "2026-04-26",
    issuedOn: "2026-04-12",
    owner: "الشؤون القانونية",
    evidenceCount: 6,
    requiredCount: 6,
    riskId: "RSK-REV-01",
    assertion: "الحدوث والدقة",
    standardCodes: ["ISA 500", "IFRS 15"],
    rationale: "تحديد التزامات الأداء والسعر المتغير وشروط القبول.",
  },
  {
    id: "REQ-1026",
    title: "تسويات سقف الخصومات واعتماداتها",
    area: "الإيرادات",
    status: "open",
    priority: "high",
    dueDate: "2026-04-24",
    issuedOn: "2026-04-10",
    owner: "المدير التجاري",
    evidenceCount: 0,
    requiredCount: 2,
    riskId: "RSK-REV-02",
    assertion: "الدقة",
    standardCodes: ["ISA 330", "IFRS 15"],
    rationale: "التحقق من الاعتماد والتقدير السليم للمقابل المتغير.",
  },
  {
    id: "REQ-1019",
    title: "إثباتات الشحن للبضائع — الربع الأول",
    area: "الإيرادات",
    status: "accepted",
    priority: "low",
    dueDate: "2026-04-22",
    issuedOn: "2026-04-08",
    owner: "مدير العمليات",
    evidenceCount: 24,
    requiredCount: 24,
    riskId: "RSK-REV-01",
    assertion: "القطع",
    standardCodes: ["ISA 500", "ISA 530"],
    rationale: "إسناد تاريخ انتقال السيطرة لعناصر العينة المختارة.",
  },
  {
    id: "REQ-1008",
    title: "مصادقات البنوك والقيود اللاحقة",
    area: "النقد",
    status: "accepted",
    priority: "medium",
    dueDate: "2026-04-20",
    issuedOn: "2026-04-06",
    owner: "أمين الخزينة",
    evidenceCount: 3,
    requiredCount: 3,
    riskId: "RSK-CASH-01",
    assertion: "الوجود والحقوق",
    standardCodes: ["ISA 505"],
    rationale: "تأكيد الأرصدة والتسهيلات والضمانات مباشرة من البنك.",
  },
  {
    id: "REQ-0999",
    title: "محاضر مجلس الإدارة واللجان",
    area: "الحوكمة",
    status: "partial",
    priority: "medium",
    dueDate: "2026-04-28",
    issuedOn: "2026-04-05",
    owner: "أمين المجلس",
    evidenceCount: 4,
    requiredCount: 6,
    riskId: "RSK-GOV-01",
    assertion: "العرض والإفصاح",
    standardCodes: ["ISA 250", "ISA 550"],
    rationale: "تحديد الأطراف ذات العلاقة والالتزامات والأحداث اللاحقة.",
  },
  {
    id: "REQ-0987",
    title: "سجل الأصول الثابتة وفواتير الإضافات",
    area: "الأصول",
    status: "accepted",
    priority: "low",
    dueDate: "2026-04-18",
    issuedOn: "2026-04-04",
    owner: "محاسب الأصول",
    evidenceCount: 12,
    requiredCount: 12,
    riskId: "RSK-PPE-01",
    assertion: "الوجود والتقييم",
    standardCodes: ["ISA 500", "IAS 16"],
    rationale: "اختبار الوجود والرسملة والعمر الإنتاجي والإهلاك.",
  },
];

export const auditRisks: AuditRisk[] = [
  {
    id: "RSK-REV-01",
    title: "الاعتراف بالإيراد قرب نهاية الفترة",
    area: "الإيرادات",
    level: "high",
    assertion: "الحدوث والقطع",
    response: "اختبارات قيود، عقود، شحن، ومبيعات لاحقة على عينة حتمية.",
    coveragePct: 68,
    status: "gap",
    standardCodes: ["ISA 240", "ISA 330", "IFRS 15"],
  },
  {
    id: "RSK-REV-02",
    title: "المقابل المتغير والخصومات التجارية",
    area: "الإيرادات",
    level: "high",
    assertion: "الدقة والتقييم",
    response: "إعادة احتساب شروط الخصم والعمولات ومقارنة الاتجاهات.",
    coveragePct: 54,
    status: "gap",
    standardCodes: ["ISA 540", "IFRS 15"],
  },
  {
    id: "RSK-CASH-01",
    title: "اكتمال الحسابات والتسهيلات البنكية",
    area: "النقد",
    level: "medium",
    assertion: "الوجود والاكتمال",
    response: "مصادقات خارجية وتسوية بنكية وفحص قيود لاحقة.",
    coveragePct: 100,
    status: "covered",
    standardCodes: ["ISA 505"],
  },
  {
    id: "RSK-GOV-01",
    title: "اكتمال الأطراف ذات العلاقة",
    area: "الحوكمة",
    level: "medium",
    assertion: "العرض والإفصاح",
    response: "محاضر، إقرارات الإدارة، وبحث تضارب الأطراف.",
    coveragePct: 61,
    status: "review",
    standardCodes: ["ISA 550", "IAS 24"],
  },
  {
    id: "RSK-PPE-01",
    title: "رسملة مصروفات تشغيلية ضمن الأصول",
    area: "الأصول",
    level: "low",
    assertion: "التقييم والتصنيف",
    response: "فحص إضافات، إعادة احتساب الإهلاك، ومعاينة مختارة.",
    coveragePct: 100,
    status: "covered",
    standardCodes: ["ISA 500", "IAS 16"],
  },
];

export const aiProposals: AIProposal[] = [
  {
    id: "AI-REV-01",
    reviewer: "سارة الخطيب",
    role: "مراجع الإيرادات",
    initials: "س",
    area: "الإيرادات",
    message:
      "وسّع اختبار القيود اليدوية ذات العمولات المرتفعة، واربطها بموافقات الخصم والعقود قبل إغلاق الجولة.",
    confidence: 82,
    decision: "pending",
    citations: ["ISA 240.32", "ISA 330.21"],
    evidenceIds: ["REQ-1042", "REQ-1026"],
    limitation: "اقتراح تحليلي؛ لا يغيّر خطة الإجراء قبل قرار المراجع.",
    origin: "ai_assisted",
  },
  {
    id: "AI-RSK-02",
    reviewer: "فهد العتيبي",
    role: "متخصص المخاطر",
    initials: "ف",
    area: "المخاطر",
    message:
      "يوجد تركّز غير معتاد في الإيرادات خلال آخر 5 أيام من الفترة. اختبر القطع حتى 10 أيام بعد الإقفال.",
    confidence: 76,
    decision: "pending",
    citations: ["ISA 240.26", "ISA 330.18"],
    evidenceIds: ["REQ-1042", "REQ-1019"],
    limitation: "الإشارة تعتمد على نمط زمني وليست إثباتًا لتحريف.",
    origin: "ai_assisted",
  },
  {
    id: "AI-QA-03",
    reviewer: "نورة المبارك",
    role: "شريك الارتباط",
    initials: "ن",
    area: "جودة الملف",
    message:
      "لا تغلق جولة الإيرادات قبل توثيق أثر المقابل المتغير على الأهمية وتجميع التحريفات.",
    confidence: 88,
    decision: "pending",
    citations: ["ISA 320.12", "ISA 450.11"],
    evidenceIds: ["REQ-1037", "REQ-1026"],
    limitation: "الرأي النهائي والاعتماد من اختصاص الشريك البشري.",
    origin: "ai_assisted",
  },
];

const IAASB_SOURCE = "https://www.iaasb.org/standards-pronouncements";
const IFRS_SOURCE = "https://www.ifrs.org/issued-standards/list-of-standards/";

export const standardsRegistry: StandardRecord[] = [
  {
    code: "ISA 240",
    title: "مسؤوليات المراجع المتعلقة بالغش",
    issuer: "IAASB",
    category: "ISA",
    summary: "تقييم مخاطر الغش والاستجابة لها، بما في ذلك تجاوز الإدارة للضوابط.",
    paragraphs: ["26", "32", "33"],
    release: "الإصدار المثبّت للارتباط",
    effectiveLabel: "مطبق على الفترة الحالية",
    lastReviewed: "2026-08-31",
    sourceUrl: IAASB_SOURCE,
    linkedObjects: 12,
    status: "pinned",
  },
  {
    code: "ISA 315",
    title: "تحديد وتقييم مخاطر التحريف الجوهري",
    issuer: "IAASB",
    category: "ISA",
    summary: "فهم المنشأة والرقابة وتحديد مخاطر التحريف على مستوى القوائم والتأكيدات.",
    paragraphs: ["19", "28", "31"],
    release: "Revised 2019 — مثبت",
    effectiveLabel: "مطبق على الفترة الحالية",
    lastReviewed: "2026-08-31",
    sourceUrl: IAASB_SOURCE,
    linkedObjects: 18,
    status: "pinned",
  },
  {
    code: "ISA 320",
    title: "الأهمية النسبية في التخطيط والتنفيذ",
    issuer: "IAASB",
    category: "ISA",
    summary: "تحديد الأهمية الكلية وأهمية الأداء ومراجعتها مع تطور المراجعة.",
    paragraphs: ["10", "11", "12", "14"],
    release: "الإصدار المثبّت للارتباط",
    effectiveLabel: "مطبق على الفترة الحالية",
    lastReviewed: "2026-08-31",
    sourceUrl: IAASB_SOURCE,
    linkedObjects: 9,
    status: "pinned",
  },
  {
    code: "ISA 330",
    title: "استجابات المراجع للمخاطر المقدّرة",
    issuer: "IAASB",
    category: "ISA",
    summary: "تصميم وتنفيذ الاستجابات والإجراءات المرتبطة بالمخاطر المقدرة.",
    paragraphs: ["6", "18", "21"],
    release: "الإصدار المثبّت للارتباط",
    effectiveLabel: "مطبق على الفترة الحالية",
    lastReviewed: "2026-08-31",
    sourceUrl: IAASB_SOURCE,
    linkedObjects: 15,
    status: "pinned",
  },
  {
    code: "ISA 450",
    title: "تقييم التحريفات المكتشفة",
    issuer: "IAASB",
    category: "ISA",
    summary: "تجميع التحريفات وتقييم أثرها الفردي والمجمل على القوائم والرأي.",
    paragraphs: ["5", "8", "11", "12"],
    release: "الإصدار المثبّت للارتباط",
    effectiveLabel: "مطبق على الفترة الحالية",
    lastReviewed: "2026-08-31",
    sourceUrl: IAASB_SOURCE,
    linkedObjects: 7,
    status: "pinned",
  },
  {
    code: "ISA 500",
    title: "أدلة المراجعة",
    issuer: "IAASB",
    category: "ISA",
    summary: "تصميم وتنفيذ إجراءات للحصول على أدلة كافية ومناسبة.",
    paragraphs: ["6", "7", "9"],
    release: "الإصدار المثبّت للارتباط",
    effectiveLabel: "مطبق على الفترة الحالية",
    lastReviewed: "2026-08-31",
    sourceUrl: IAASB_SOURCE,
    linkedObjects: 24,
    status: "pinned",
  },
  {
    code: "ISA 505",
    title: "المصادقات الخارجية",
    issuer: "IAASB",
    category: "ISA",
    summary: "إجراءات الحصول على ردود مباشرة من أطراف خارجية وتقييم موثوقيتها.",
    paragraphs: ["7", "10", "16"],
    release: "الإصدار المثبّت للارتباط",
    effectiveLabel: "مطبق على الفترة الحالية",
    lastReviewed: "2026-08-31",
    sourceUrl: IAASB_SOURCE,
    linkedObjects: 5,
    status: "pinned",
  },
  {
    code: "ISA 530",
    title: "العينات في المراجعة",
    issuer: "IAASB",
    category: "ISA",
    summary: "اختيار عينة وتقييم نتائجها بما يتيح استنتاجًا عن المجتمع.",
    paragraphs: ["6", "8", "14"],
    release: "الإصدار المثبّت للارتباط",
    effectiveLabel: "مطبق على الفترة الحالية",
    lastReviewed: "2026-08-31",
    sourceUrl: IAASB_SOURCE,
    linkedObjects: 8,
    status: "pinned",
  },
  {
    code: "IFRS 15",
    title: "الإيرادات من العقود مع العملاء",
    issuer: "IFRS Foundation",
    category: "IFRS",
    summary: "الاعتراف بالإيراد استنادًا إلى انتقال السيطرة والوفاء بالتزامات الأداء.",
    paragraphs: ["31", "47", "56"],
    release: "المعيار المثبّت للارتباط",
    effectiveLabel: "مطبق على الفترة الحالية",
    lastReviewed: "2026-08-31",
    sourceUrl: IFRS_SOURCE,
    linkedObjects: 16,
    status: "pinned",
  },
  {
    code: "IAS 16",
    title: "العقارات والآلات والمعدات",
    issuer: "IFRS Foundation",
    category: "IAS",
    summary: "الاعتراف والقياس والإهلاك والإفصاح للأصول الملموسة.",
    paragraphs: ["7", "16", "50"],
    release: "المعيار المثبّت للارتباط",
    effectiveLabel: "مطبق على الفترة الحالية",
    lastReviewed: "2026-08-31",
    sourceUrl: IFRS_SOURCE,
    linkedObjects: 6,
    status: "pinned",
  },
  {
    code: "IAS 24",
    title: "الإفصاحات عن الأطراف ذات العلاقة",
    issuer: "IFRS Foundation",
    category: "IAS",
    summary: "تحديد الأطراف ذات العلاقة والإفصاح عن المعاملات والأرصدة ذات الصلة.",
    paragraphs: ["9", "18", "19"],
    release: "المعيار المثبّت للارتباط",
    effectiveLabel: "مطبق على الفترة الحالية",
    lastReviewed: "2026-08-31",
    sourceUrl: IFRS_SOURCE,
    linkedObjects: 7,
    status: "pinned",
  },
];

export const initialAuditEvents: AuditEvent[] = [
  {
    id: "EVT-0004",
    at: "2026-04-18T10:22:00Z",
    actor: "أحمد السبيعي",
    action: "أصدر طلب دليل",
    subject: "REQ-1042",
    reason: "توسيع استجابة مخاطر تجاوز الإدارة في الإيرادات.",
  },
  {
    id: "EVT-0003",
    at: "2026-04-17T14:05:00Z",
    actor: "النواة الحتمية",
    action: "أعاد حساب العينة",
    subject: "SAMPLE-REV-02",
    reason: "تغيّر مجتمع قيود الإيرادات بعد تثبيت دفعة الاستيراد.",
  },
  {
    id: "EVT-0002",
    at: "2026-04-12T08:40:00Z",
    actor: "نورة المبارك",
    action: "اعتمد خطة الجولة",
    subject: "RND-02",
    reason: "اكتمال المخاطر والتأكيدات والإجراءات الأساسية.",
  },
];

export const phaseJourney = [
  { id: "acceptance", label: "قبول الارتباط", state: "done" },
  { id: "planning", label: "التخطيط", state: "done" },
  { id: "fieldwork", label: "أعمال المراجعة", state: "current" },
  { id: "review", label: "المراجعة", state: "upcoming" },
  { id: "reporting", label: "التقرير", state: "upcoming" },
] as const;

export function requestCoverage(requests: EvidenceRequest[]): number {
  const required = requests.reduce((sum, item) => sum + item.requiredCount, 0);
  const received = requests.reduce(
    (sum, item) => sum + Math.min(item.evidenceCount, item.requiredCount),
    0,
  );
  return required === 0 ? 0 : Math.round((received / required) * 100);
}

export function unresolvedEvidence(requests: EvidenceRequest[]): number {
  return requests.reduce(
    (sum, item) => sum + Math.max(0, item.requiredCount - item.evidenceCount),
    0,
  );
}

export function nextRequest(requests: EvidenceRequest[]): EvidenceRequest {
  const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
  return [...requests]
    .filter((item) => item.status !== "accepted")
    .sort((a, b) => {
      const byPriority = priorityOrder[a.priority] - priorityOrder[b.priority];
      return byPriority || a.dueDate.localeCompare(b.dueDate);
    })[0];
}

export function decisionEvent(
  proposal: AIProposal,
  decision: Exclude<ProposalDecision, "pending">,
  index: number,
): AuditEvent {
  return {
    id: `EVT-AI-${String(index).padStart(4, "0")}`,
    at: new Date().toISOString(),
    actor: engagement.lead,
    action: decision === "accepted" ? "اعتمد اقتراحًا" : "رفض اقتراحًا",
    subject: proposal.id,
    reason:
      decision === "accepted"
        ? "قُبل الإجراء المقترح مع بقاء الحساب والاعتماد النهائي بيد المراجع."
        : "رُفض الاقتراح بعد تقييم الأدلة والسياق المهني.",
  };
}

export const statusLabels: Record<RequestStatus, string> = {
  open: "مفتوح",
  partial: "جزئي",
  received: "مستلم",
  accepted: "مقبول",
};

export const priorityLabels: Record<Priority, string> = {
  high: "مرتفع",
  medium: "متوسط",
  low: "منخفض",
};
