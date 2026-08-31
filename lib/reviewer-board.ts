import type { PipelineResult } from "./kosif/browser.mjs";

export type ReviewerSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info";

export type AuditRoundId =
  | "A01"
  | "A02"
  | "A03"
  | "A04"
  | "A05"
  | "A06"
  | "A07"
  | "A08"
  | "A09"
  | "A10";

export interface ReviewerNumericBasis {
  /** Human-readable name for the single metric behind the note. */
  label: string;
  /** Always a string. In particular, monetary BigInt values never cross into Number. */
  value: string;
}

export interface DeterministicReviewerNote {
  id: string;
  reviewer: "المراجع الحتمي";
  role: string;
  severity: ReviewerSeverity;
  title: string;
  message: string;
  numericBasis: ReviewerNumericBasis;
  citations: string[];
  suggestedAction: string;
  roundId: AuditRoundId;
  limitation: string;
  origin: "deterministic";
}

interface BenfordSummary {
  ok?: boolean;
  sampleSize?: number;
  ned?: number;
  verdict?: "MATCH" | "REVIEW" | "INVESTIGATE" | string;
}

interface RiskSummary {
  index?: number;
  band?: "low" | "medium" | "high" | string;
  bandLabel?: string;
}

interface ReviewerAnalysis {
  benford?: BenfordSummary;
  risk?: RiskSummary;
  ratios?: {
    liquidity?: {
      currentRatio?: number | null;
    };
  };
}

interface SampleSummary {
  requested?: number;
  population?: number;
  selected?: unknown[];
}

const REVIEWER = "المراجع الحتمي" as const;

function metricString(value: bigint | number): string {
  return typeof value === "bigint" ? value.toString() : String(value);
}

function isFiniteMetric(value: unknown): value is number {
  return (
    typeof value === "number" &&
    value === value &&
    value !== Infinity &&
    value !== -Infinity
  );
}

function createNote(
  note: Omit<DeterministicReviewerNote, "reviewer" | "origin">,
): DeterministicReviewerNote {
  return {
    ...note,
    reviewer: REVIEWER,
    origin: "deterministic",
    numericBasis: { ...note.numericBasis },
    citations: [...note.citations],
  };
}

function benfordSeverity(verdict: BenfordSummary["verdict"]): ReviewerSeverity {
  if (verdict === "INVESTIGATE") return "high";
  if (verdict === "REVIEW") return "medium";
  return "info";
}

function riskSeverity(band: RiskSummary["band"]): ReviewerSeverity {
  if (band === "high") return "high";
  if (band === "medium") return "medium";
  return "info";
}

function liquiditySeverity(currentRatio: number): ReviewerSeverity {
  if (currentRatio <= 0) return "critical";
  if (currentRatio < 100) return "high";
  if (currentRatio < 150) return "medium";
  return "info";
}

/**
 * Converts a deterministic pipeline result into an ordered reviewer board.
 *
 * The adapter is deliberately advisory: it neither reads nor emits an audit
 * opinion, and it never mutates the pipeline result. Monetary values remain
 * exact BigInt strings in every note.
 */
export function buildDeterministicReviewerBoard(
  result: PipelineResult,
): DeterministicReviewerNote[] {
  const notes: DeterministicReviewerNote[] = [];
  const blockerCount = result.reliance.blockers.length;

  notes.push(
    createNote({
      id: "DET-A02-RELIANCE",
      role: "مراجع جودة البيانات",
      severity: result.reliance.canRely ? "info" : "critical",
      title: result.reliance.canRely
        ? "اجتازت البيانات بوابة الاعتماد الحسابية"
        : "بوابة الاعتماد الحسابية مغلقة",
      message: result.reliance.canRely
        ? "لم يسجل المحرك مانعًا حسابيًا للاعتماد على المخرجات الأساسية."
        : `سجل المحرك ${blockerCount} مانعًا؛ لا تُستخدم القوائم أو التحليلات كأساس للإقفال قبل معالجتها.`,
      numericBasis: {
        label: "عدد موانع الاعتماد",
        value: metricString(blockerCount),
      },
      citations: ["ISA 500", "ISA 230"],
      suggestedAction: result.reliance.canRely
        ? "حافظ على أثر مصدر البيانات وإصدار المحرك ضمن ملف العمل."
        : "عالج موانع الاعتماد وأعد تشغيل المسار الحتمي قبل متابعة الجولة.",
      roundId: "A02",
      limitation:
        "هذه بوابة سلامة حسابية للبيانات، وليست استنتاجًا بشأن كفاية أدلة المراجعة.",
    }),
  );

  if (!result.trialBalance.ok || result.trialBalance.errors.length > 0) {
    notes.push(
      createNote({
        id: "DET-A02-IMPORT",
        role: "مراجع جودة البيانات",
        severity: result.trialBalance.ok ? "high" : "critical",
        title: "استيراد ميزان المراجعة يحتاج معالجة",
        message: result.trialBalance.ok
          ? `اكتمل الاستيراد مع ${result.trialBalance.errors.length} خطأ مسجل ينبغي تسويته.`
          : "لم ينتج الاستيراد ميزان مراجعة صالحًا للاختبار.",
        numericBasis: {
          label: "عدد أخطاء الاستيراد",
          value: metricString(result.trialBalance.errors.length),
        },
        citations: ["ISA 500", "ISA 230"],
        suggestedAction:
          "راجع الأسطر المرفوضة والتكرارات وتنسيق الأعمدة، ثم أعد الاستيراد مع الاحتفاظ بملف المصدر.",
        roundId: "A02",
        limitation:
          "التشخيص يصف سلامة البنية المستوردة فقط ولا يثبت اكتمال دفاتر المنشأة.",
      }),
    );
  }

  if (!result.trialBalance.balanced) {
    notes.push(
      createNote({
        id: "DET-A02-TRIAL-BALANCE",
        role: "مراجع ميزان المراجعة",
        severity: "critical",
        title: "ميزان المراجعة غير متوازن",
        message:
          "إجمالي المدين لا يساوي إجمالي الدائن؛ لذلك تظل القوائم والتحليلات التابعة غير قابلة للاعتماد.",
        numericBasis: {
          label: "فرق الميزان بالوحدات الصغرى",
          value: metricString(result.trialBalance.difference),
        },
        citations: ["ISA 500", "ISA 315"],
        suggestedAction:
          "طابق إجماليات المصدر، وافحص قيود الطرف الواحد والحسابات التي تطابق الفرق، ثم أعد التشغيل.",
        roundId: "A02",
        limitation:
          "مطابقة الفرق تحدد خللًا حسابيًا ولا تعيّن وحدها القيد أو الطرف المسؤول عنه.",
      }),
    );
  }

  notes.push(
    createNote({
      id: "DET-A02-CLASSIFICATION",
      role: "مراجع التصنيف والعرض",
      severity: result.trialBalance.unclassified > 0 ? "high" : "info",
      title:
        result.trialBalance.unclassified > 0
          ? "حسابات غير مصنفة تمنع اكتمال العرض"
          : "اكتمل التصنيف الآلي للحسابات",
      message:
        result.trialBalance.unclassified > 0
          ? `بقي ${result.trialBalance.unclassified} حسابًا خارج بنود القوائم، ويلزم حكم بشري على تصنيفها.`
          : "لم يترك المحرك حسابًا في فئة التعليق ضمن الميزان الحالي.",
      numericBasis: {
        label: "عدد الحسابات غير المصنفة",
        value: metricString(result.trialBalance.unclassified),
      },
      citations: ["IAS 1", "ISA 315"],
      suggestedAction:
        result.trialBalance.unclassified > 0
          ? "اربط كل حساب غير مصنف ببند قائمة وتأكيد مراجعة مع توثيق أساس الحكم."
          : "راجع عينة من التصنيفات الجوهرية يدويًا قبل اعتماد خريطة الحسابات.",
      roundId: "A02",
      limitation:
        "اكتمال التصنيف الآلي لا يثبت ملاءمة العرض أو الإفصاح لكل حساب جوهري.",
    }),
  );

  notes.push(
    createNote({
      id: "DET-A08-ARTICULATION",
      role: "مراجع القوائم المالية",
      severity: result.statements.articulation.articulated
        ? "info"
        : "critical",
      title: result.statements.articulation.articulated
        ? "القوائم مترابطة حسابيًا"
        : "معادلة المركز المالي غير مترابطة",
      message: result.statements.articulation.articulated
        ? "يتساوى إجمالي الأصول مع الالتزامات وحقوق الملكية بعد إدراج نتيجة الفترة."
        : "يوجد فرق بين الأصول ومجموع الالتزامات وحقوق الملكية، فيجب إيقاف الإقفال.",
      numericBasis: {
        label: "فرق معادلة المركز المالي بالوحدات الصغرى",
        value: metricString(
          result.statements.articulation.balanceCheckMinor,
        ),
      },
      citations: ["IAS 1", "ISA 500"],
      suggestedAction: result.statements.articulation.articulated
        ? "احتفظ بتتبع كل بند إلى حساباته واختبر الإفصاحات ذات الصلة."
        : "أعد فحص خريطة البنود ونتيجة الفترة والحسابات غير المصنفة قبل الإقفال.",
      roundId: "A08",
      limitation:
        "الاتساق الحسابي شرط لازم لكنه لا يثبت خلو القوائم من التحريف الجوهري.",
    }),
  );

  const analysis = result.analysis as unknown as ReviewerAnalysis;
  const benford = analysis.benford;
  if (benford?.ok && isFiniteMetric(benford.ned)) {
    const severity = benfordSeverity(benford.verdict);
    notes.push(
      createNote({
        id: "DET-A04-BENFORD",
        role: "مراجع التحليلات والشذوذ",
        severity,
        title:
          benford.verdict === "INVESTIGATE"
            ? "توزيع الأرقام يستدعي تحقيقًا موجّهًا"
            : benford.verdict === "REVIEW"
              ? "توزيع الأرقام يستدعي مراجعة إضافية"
              : "لا تظهر إشارة جوهرية من اختبار بنفورد",
        message: `بلغ مؤشر NED ${metricString(benford.ned)} على عينة من ${metricString(benford.sampleSize ?? 0)} رصيدًا.`,
        numericBasis: {
          label: "مؤشر NED لبنفورد",
          value: metricString(benford.ned),
        },
        citations: ["ISA 520", "ISA 240"],
        suggestedAction:
          severity === "info"
            ? "وثق ملاءمة المجتمع للاختبار واربط النتيجة بإجراءات تحليلية أخرى."
            : "افحص الخانات الأكثر انحرافًا وحدد قيودًا وحسابات لاختبارات تفصيلية، دون افتراض وجود غش.",
        roundId: "A04",
        limitation:
          "اختبار بنفورد إشارة فرز تعتمد على ملاءمة المجتمع وحجمه، ولا يمثل دليلًا منفردًا على الغش أو الخطأ.",
      }),
    );
  }

  const risk = analysis.risk;
  if (risk && isFiniteMetric(risk.index)) {
    notes.push(
      createNote({
        id: "DET-A04-RISK-INDEX",
        role: "متخصص المخاطر",
        severity: riskSeverity(risk.band),
        title: `مؤشر المخاطر ${risk.bandLabel ?? risk.band ?? "غير مصنف"}`,
        message: `بلغ المؤشر المركب ${metricString(risk.index)} من 100 وفق الأوزان المعلنة في المحرك.`,
        numericBasis: {
          label: "مؤشر المخاطر من 100",
          value: metricString(risk.index),
        },
        citations: ["ISA 315", "ISA 330"],
        suggestedAction:
          risk.band === "high"
            ? "زد طبيعة وتوقيت ومدى الاستجابات واربط كل محرك خطر بتأكيد وإجراء ودليل."
            : "راجع محركات المؤشر واربطها بمصفوفة المخاطر والإجراءات المقررة.",
        roundId: "A04",
        limitation:
          "المؤشر أداة ترتيب حتمية بأوزان محددة، ولا يحل محل تقييم المراجع للمخاطر الجوهرية.",
      }),
    );
  }

  const currentRatio = analysis.ratios?.liquidity?.currentRatio;
  if (isFiniteMetric(currentRatio)) {
    const severity = liquiditySeverity(currentRatio);
    notes.push(
      createNote({
        id: "DET-A04-LIQUIDITY",
        role: "مراجع الاستمرارية والسيولة",
        severity,
        title:
          severity === "critical" || severity === "high"
            ? "نسبة التداول تستدعي تقييم ضغط السيولة"
            : severity === "medium"
              ? "هامش السيولة يحتاج متابعة"
              : "نسبة التداول فوق عتبة المتابعة الأولية",
        message: `بلغت نسبة التداول ${metricString(currentRatio)}% وفق الأصول والالتزامات المتداولة المصنفة.`,
        numericBasis: {
          label: "نسبة التداول (%)",
          value: metricString(currentRatio),
        },
        citations: ["ISA 570", "IAS 1"],
        suggestedAction:
          severity === "info"
            ? "اربط النسبة بالتدفقات النقدية اللاحقة والتسهيلات والالتزامات التعاقدية."
            : "اختبر توقعات التدفق النقدي والتسهيلات والتعهدات والأحداث اللاحقة مع الإدارة.",
        roundId: "A04",
        limitation:
          "النسبة لقطة تاريخية تعتمد على صحة التصنيف ولا تكفي منفردة للحكم على الاستمرارية.",
      }),
    );
  }

  const sample = result.sample as SampleSummary | null;
  if (sample && Array.isArray(sample.selected)) {
    const selectedCount = sample.selected.length;
    const requested = sample.requested ?? selectedCount;
    const population = sample.population ?? selectedCount;
    const severity: ReviewerSeverity =
      population > 0 && selectedCount === 0
        ? "high"
        : selectedCount < requested && selectedCount < population
          ? "medium"
          : "info";

    notes.push(
      createNote({
        id: "DET-A06-SAMPLE",
        role: "مراجع العينات",
        severity,
        title:
          severity === "high"
            ? "لم تُنتج العينة عناصر للاختبار"
            : severity === "medium"
              ? "حجم العينة المنفذ دون الحجم المطلوب"
              : "العينة الحتمية جاهزة للربط بالإجراءات",
        message: `اختار المحرك ${metricString(selectedCount)} عنصرًا من مجتمع يضم ${metricString(population)} عنصرًا، مقابل حجم مطلوب ${metricString(requested)}.`,
        numericBasis: {
          label: "عدد عناصر العينة المختارة",
          value: metricString(selectedCount),
        },
        citations: ["ISA 530", "ISA 500"],
        suggestedAction:
          severity === "info"
            ? "اربط كل عنصر بإجراء ونتيجة ودليل، واحتفظ بالبذرة وطريقة الاختيار."
            : "راجع حجم المجتمع وطريقة الاختيار والتكرارات، ثم أكمل الحجم أو وثق مبررًا مهنيًا.",
        roundId: "A06",
        limitation:
          "الاختيار الحتمي يضمن قابلية إعادة الإنتاج، لكنه لا يثبت كفاية حجم العينة أو الأدلة الناتجة.",
      }),
    );
  }

  return notes;
}

