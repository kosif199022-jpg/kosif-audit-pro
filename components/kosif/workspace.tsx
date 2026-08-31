"use client";

import { useEffect, useMemo, useState } from "react";
import { FileInput, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/kosif/app-shell";
import { Overview } from "@/components/kosif/overview";
import {
  BalanceView,
  EvidenceView,
  ReportsView,
  RequestsView,
  RisksView,
  RoundsView,
  StandardsView,
  StatementsView,
} from "@/components/kosif/views";
import {
  aiProposals,
  decisionEvent,
  evidenceRequests,
  initialAuditEvents,
  standardsRegistry,
  type AIProposal,
  type AuditEvent,
  type EvidenceRequest,
  type ProposalDecision,
  type WorkspaceView,
} from "@/lib/audit-workspace";
import {
  DEMO_TRIAL_BALANCE,
  runDemo,
  runPipeline,
  type PipelineResult,
} from "@/lib/kosif/browser.mjs";
import { buildDeterministicReviewerBoard } from "@/lib/reviewer-board";

const STORAGE_KEY = "kosif:audit-workspace:v1";
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

function proposalsForPipeline(pipeline: PipelineResult): AIProposal[] {
  const deterministic = buildDeterministicReviewerBoard(pipeline)
    .filter(
      (note) =>
        note.severity !== "info" || note.id === "DET-A02-RELIANCE",
    )
    .slice(0, 6)
    .map<AIProposal>((note) => ({
      id: note.id,
      reviewer: note.reviewer,
      role: note.role,
      initials: "ح",
      area: note.roundId,
      message: `${note.title} — ${note.message}`,
      confidence: 100,
      decision: "pending",
      citations: note.citations,
      evidenceIds: [],
      limitation: note.limitation,
      origin: note.origin,
      severity: note.severity,
      roundId: note.roundId,
      numericBasis: note.numericBasis,
      suggestedAction: note.suggestedAction,
    }));

  return [...deterministic, ...aiProposals];
}

const INITIAL_PIPELINE = runDemo();
const INITIAL_PROPOSALS = proposalsForPipeline(INITIAL_PIPELINE);

interface PersistedWorkspace {
  schema: 1;
  requests: Array<{ id: string; status: EvidenceRequest["status"]; evidenceCount: number }>;
  proposals: Array<{ id: string; decision: ProposalDecision }>;
  events: AuditEvent[];
  trialBalanceText: string;
  dark: boolean;
}

function restoreRequests(
  source: EvidenceRequest[],
  saved: PersistedWorkspace["requests"],
): EvidenceRequest[] {
  const byId = new Map(saved.map((item) => [item.id, item]));
  return source.map((request) => {
    const state = byId.get(request.id);
    return state
      ? { ...request, status: state.status, evidenceCount: state.evidenceCount }
      : request;
  });
}

function restoreProposals(
  source: AIProposal[],
  saved: PersistedWorkspace["proposals"],
): AIProposal[] {
  const byId = new Map(saved.map((item) => [item.id, item.decision]));
  return source.map((proposal) => ({
    ...proposal,
    decision: byId.get(proposal.id) ?? proposal.decision,
  }));
}

function ImportDialog({
  open,
  onOpenChange,
  draft,
  onDraftChange,
  onCommit,
  onResetDemo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: string;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
  onResetDemo: () => void;
}) {
  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      toast.error("الملف أكبر من 5 MB. قسّمه إلى دفعات أصغر قبل الاستيراد.");
      return;
    }
    const allowed = [".csv", ".tsv", ".txt"];
    const lower = file.name.toLowerCase();
    if (!allowed.some((extension) => lower.endsWith(extension))) {
      toast.error("هذه النسخة تقبل CSV وTSV والنص المنسوخ فقط.");
      return;
    }
    onDraftChange(await file.text());
    toast.success("قُرئ الملف محليًا؛ راجع النص ثم شغّل الفحص.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="import-dialog" dir="rtl">
        <DialogHeader className="text-start">
          <DialogTitle>استيراد ميزان المراجعة</DialogTitle>
          <DialogDescription>
            المعالجة داخل المتصفح. لا يُرسل الملف إلى خدمة خارجية في هذه النسخة.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="paste" dir="rtl">
          <TabsList aria-label="طريقة الاستيراد">
            <TabsTrigger value="paste">لصق بيانات</TabsTrigger>
            <TabsTrigger value="file">ملف CSV / TSV</TabsTrigger>
          </TabsList>
          <TabsContent value="paste">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="trial-balance-text">بيانات الميزان</FieldLabel>
                <Textarea
                  id="trial-balance-text"
                  value={draft}
                  onChange={(event) => onDraftChange(event.target.value)}
                  className="min-h-64 font-mono text-xs"
                  dir="auto"
                  spellCheck={false}
                />
                <FieldDescription>
                  الأعمدة المقبولة: الكود، اسم الحساب، مدين، دائن. يدعم الأرقام العربية
                  والأقواس السالبة.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </TabsContent>
          <TabsContent value="file">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="trial-balance-file">ملف نصي حتى 5 MB</FieldLabel>
                <label className="file-drop" htmlFor="trial-balance-file">
                  <FileInput aria-hidden="true" />
                  <strong>اختر CSV أو TSV</strong>
                  <span>سيُقرأ الملف على جهازك دون رفعه.</span>
                </label>
                <input
                  id="trial-balance-file"
                  className="sr-only"
                  type="file"
                  accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
                  onChange={(event) => void handleFile(event.target.files?.[0])}
                />
              </Field>
            </FieldGroup>
          </TabsContent>
        </Tabs>
        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="ghost" onClick={onResetDemo}>
            استعادة بيانات العرض
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="button" onClick={onCommit} disabled={!draft.trim()}>
              <ShieldCheck data-icon="inline-start" />
              تشغيل الفحص الحتمي
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function KosifWorkspace() {
  const [view, setView] = useState<WorkspaceView>("overview");
  const [requests, setRequests] = useState<EvidenceRequest[]>(evidenceRequests);
  const [proposals, setProposals] =
    useState<AIProposal[]>(INITIAL_PROPOSALS);
  const [events, setEvents] = useState<AuditEvent[]>(initialAuditEvents);
  const [selectedRequestId, setSelectedRequestId] = useState("REQ-1042");
  const [selectedStandardCode, setSelectedStandardCode] = useState("ISA 240");
  const [trialBalanceText, setTrialBalanceText] = useState(DEMO_TRIAL_BALANCE);
  const [draftImport, setDraftImport] = useState(DEMO_TRIAL_BALANCE);
  const [pipeline, setPipeline] =
    useState<PipelineResult>(INITIAL_PIPELINE);
  const [importOpen, setImportOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as PersistedWorkspace;
          if (saved.schema === 1) {
            setRequests(restoreRequests(evidenceRequests, saved.requests ?? []));
            setEvents(saved.events?.length ? saved.events : initialAuditEvents);
            let restoredPipeline = INITIAL_PIPELINE;
            if (saved.trialBalanceText?.trim()) {
              setTrialBalanceText(saved.trialBalanceText);
              setDraftImport(saved.trialBalanceText);
              restoredPipeline = runPipeline(saved.trialBalanceText);
              setPipeline(restoredPipeline);
            }
            setProposals(
              restoreProposals(
                proposalsForPipeline(restoredPipeline),
                saved.proposals ?? [],
              ),
            );
            setDark(Boolean(saved.dark));
            document.documentElement.dataset.theme = saved.dark ? "dark" : "light";
          }
        }
      } catch {
        toast.error("تعذرت استعادة الحالة المحلية؛ بدأت نسخة عرض نظيفة.");
      } finally {
        setHydrated(true);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload: PersistedWorkspace = {
      schema: 1,
      requests: requests.map(({ id, status, evidenceCount }) => ({
        id,
        status,
        evidenceCount,
      })),
      proposals: proposals.map(({ id, decision }) => ({ id, decision })),
      events: events.slice(0, 50),
      trialBalanceText,
      dark,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage may be intentionally disabled. The in-memory workflow remains usable.
    }
  }, [dark, events, hydrated, proposals, requests, trialBalanceText]);

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedRequestId) ?? requests[0],
    [requests, selectedRequestId],
  );

  function selectRequest(request: EvidenceRequest) {
    setSelectedRequestId(request.id);
    if (request.standardCodes[0]) setSelectedStandardCode(request.standardCodes[0]);
  }

  function decideProposal(
    proposal: AIProposal,
    decision: Exclude<ProposalDecision, "pending">,
  ) {
    setProposals((current) =>
      current.map((item) =>
        item.id === proposal.id ? { ...item, decision } : item,
      ),
    );
    setEvents((current) => [
      decisionEvent(proposal, decision, current.length + 1),
      ...current,
    ]);
    toast.success(
      decision === "accepted"
        ? "سُجل اعتماد المراجع دون تغيير أي رقم تلقائيًا."
        : "سُجل رفض الاقتراح في أثر المراجعة.",
    );
  }

  function advanceRequest(request: EvidenceRequest) {
    if (request.status === "accepted") return;
    const nextStatus = request.status === "received" ? "accepted" : "received";
    setRequests((current) =>
      current.map((item) =>
        item.id === request.id
          ? {
              ...item,
              status: nextStatus,
              evidenceCount:
                nextStatus === "received" ? item.requiredCount : item.evidenceCount,
            }
          : item,
      ),
    );
    setEvents((current) => [
      {
        id: `EVT-REQ-${String(current.length + 1).padStart(4, "0")}`,
        at: new Date().toISOString(),
        actor: "أحمد السبيعي",
        action: nextStatus === "accepted" ? "قبل دليل الطلب" : "سجل اكتمال الاستلام",
        subject: request.id,
        reason:
          nextStatus === "accepted"
            ? "قيّم المراجع الملاءمة والكفاية وربط الدليل بالإجراء."
            : "اكتمل العدد المطلوب وبقي تقييم المراجع.",
      },
      ...current,
    ]);
    toast.success(
      nextStatus === "accepted"
        ? "أصبح الدليل مقبولًا بقرار المراجع."
        : "سُجل الاستلام؛ ما زال قبول الدليل بحاجة إلى مراجعة.",
    );
  }

  function commitImport() {
    const next = runPipeline(draftImport);
    setPipeline(next);
    setProposals(proposalsForPipeline(next));
    setTrialBalanceText(draftImport);
    setImportOpen(false);
    if (next.reliance.canRely) {
      toast.success(`تم فحص ${next.trialBalance.rows.length} حسابًا والميزان متوازن.`);
    } else {
      toast.error("اكتمل التشخيص، لكن بوابة الاعتماد ما زالت مغلقة.");
    }
  }

  function resetDemo() {
    setDraftImport(DEMO_TRIAL_BALANCE);
    toast.success("أُعيدت بيانات العرض المتوازنة.");
  }

  function exportWorkspace() {
    const payload = {
      exportedAt: new Date().toISOString(),
      pipeline,
      workflow: { requests, proposals, events },
    };
    const text = JSON.stringify(
      payload,
      (_key, value) => (typeof value === "bigint" ? value.toString() : value),
      2,
    );
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "kosif-audit-workspace-2026.json";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير لقطة قابلة للمراجعة بصيغة JSON.");
  }

  function toggleTheme() {
    setDark((current) => {
      const next = !current;
      document.documentElement.dataset.theme = next ? "dark" : "light";
      return next;
    });
  }

  function renderView() {
    switch (view) {
      case "rounds":
        return (
          <RoundsView
            pipeline={pipeline}
            onCreateRound={() =>
              toast.error("لا يمكن فتح جولة جديدة قبل حسم فجوات الجولة الثانية.")
            }
          />
        );
      case "requests":
        return (
          <RequestsView
            requests={requests}
            selectedRequestId={selectedRequest.id}
            onSelect={selectRequest}
            onAdvance={advanceRequest}
          />
        );
      case "evidence":
        return <EvidenceView events={events} />;
      case "risks":
        return <RisksView />;
      case "balance":
        return (
          <BalanceView
            pipeline={pipeline}
            onImport={() => setImportOpen(true)}
            onExport={exportWorkspace}
          />
        );
      case "statements":
        return (
          <StatementsView
            pipeline={pipeline}
            onTrace={(key) => {
              setView("evidence");
              toast.success(`فُتح مسار إسناد البند ${key}.`);
            }}
          />
        );
      case "standards":
        return (
          <StandardsView
            standards={standardsRegistry}
            onSelect={(code) => {
              setSelectedStandardCode(code);
              toast.success(`تم فتح سياق ${code}.`);
            }}
          />
        );
      case "reports":
        return (
          <ReportsView
            pipeline={pipeline}
            requests={requests}
            pendingProposals={proposals.filter((item) => item.decision === "pending").length}
            onExport={exportWorkspace}
          />
        );
      default:
        return (
          <Overview
            pipeline={pipeline}
            requests={requests}
            proposals={proposals}
            selectedRequestId={selectedRequest.id}
            onRequestSelect={selectRequest}
            onViewChange={setView}
            onProposalDecision={decideProposal}
          />
        );
    }
  }

  return (
    <>
      <AppShell
        view={view}
        onViewChange={setView}
        onImport={() => setImportOpen(true)}
        standards={standardsRegistry}
        selectedStandardCode={selectedStandardCode}
        onStandardSelect={setSelectedStandardCode}
        dark={dark}
        onThemeToggle={toggleTheme}
      >
        {renderView()}
      </AppShell>
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        draft={draftImport}
        onDraftChange={setDraftImport}
        onCommit={commitImport}
        onResetDemo={resetDemo}
      />
      <Toaster position="top-center" richColors closeButton />
    </>
  );
}
