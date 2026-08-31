"use client";

import {
  ArrowLeft,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  FileSearch,
  Gauge,
  MessageSquareText,
  Scale,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  engagement,
  phaseJourney,
  priorityLabels,
  requestCoverage,
  statusLabels,
  unresolvedEvidence,
  type AIProposal,
  type EvidenceRequest,
  type ProposalDecision,
  type WorkspaceView,
} from "@/lib/audit-workspace";
import { formatMinor, type PipelineResult } from "@/lib/kosif/browser.mjs";

interface OverviewProps {
  pipeline: PipelineResult;
  requests: EvidenceRequest[];
  proposals: AIProposal[];
  selectedRequestId: string;
  onRequestSelect: (request: EvidenceRequest) => void;
  onViewChange: (view: WorkspaceView) => void;
  onProposalDecision: (
    proposal: AIProposal,
    decision: Exclude<ProposalDecision, "pending">,
  ) => void;
}

function AuditJourney() {
  return (
    <section className="journey-panel" aria-labelledby="journey-title">
      <div className="panel-heading compact-heading">
        <div>
          <p className="section-kicker">سير الارتباط</p>
          <h2 id="journey-title">رحلة المراجعة</h2>
        </div>
        <span className="round-label">الجولة {engagement.currentRound}</span>
      </div>
      <ol className="journey-track">
        {phaseJourney.map((phase, index) => (
          <li key={phase.id} data-state={phase.state}>
            <span className="journey-node" aria-hidden="true">
              {phase.state === "done" ? <Check /> : index + 1}
            </span>
            <span>{phase.label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function NextAction({
  request,
  onOpenRequests,
}: {
  request: EvidenceRequest;
  onOpenRequests: () => void;
}) {
  return (
    <section className="next-action" aria-labelledby="next-action-title">
      <div className="action-icon" aria-hidden="true">
        <FileSearch />
      </div>
      <div className="action-copy">
        <div className="action-label">
          <Sparkles aria-hidden="true" />
          الإجراء التالي
        </div>
        <h2 id="next-action-title">راجع أدلة الإيرادات</h2>
        <p>
          يوجد {Math.max(1, request.requiredCount - request.evidenceCount)} مستند
          مطلوب لهذا الطلب قبل أن تصبح أدلة {request.assertion} قابلة للتقييم.
        </p>
        <div className="action-buttons">
          <Button type="button" size="lg" onClick={onOpenRequests}>
            فتح قائمة الطلبات
            <ArrowLeft data-icon="inline-end" />
          </Button>
          <Button type="button" size="lg" variant="outline">
            تسجيل قرار مؤقت
          </Button>
        </div>
      </div>
    </section>
  );
}

function MetricStrip({
  pipeline,
  requests,
}: {
  pipeline: PipelineResult;
  requests: EvidenceRequest[];
}) {
  const materialityMinor = pipeline.analysis?.materiality?.overall?.minor ?? 0n;
  const coverage = requestCoverage(requests);
  const unresolved = unresolvedEvidence(requests);
  const riskBand = pipeline.analysis?.risk?.bandLabel ?? "غير محسوب";
  const openFindings = pipeline.findings?.length ?? 0;

  const formattedMateriality = formatMinor(materialityMinor).replace(/\.00$/, "");

  return (
    <section className="metric-strip" aria-label="مؤشرات الجولة">
      <article>
        <span className="metric-icon violet"><Scale aria-hidden="true" /></span>
        <div>
          <small>المادية الكلية</small>
          <strong dir="ltr">{formattedMateriality}</strong>
          <span>{engagement.currency}</span>
        </div>
      </article>
      <article>
        <span className="metric-icon coral"><ShieldCheck aria-hidden="true" /></span>
        <div>
          <small>المخاطر الإجمالية</small>
          <strong>{riskBand}</strong>
          <span>{pipeline.analysis?.risk?.index ?? 0} / 100</span>
        </div>
      </article>
      <article className="coverage-metric">
        <span className="metric-icon teal"><Gauge aria-hidden="true" /></span>
        <div>
          <small>التغطية بالأدلة</small>
          <strong dir="ltr">{coverage}%</strong>
          <Progress value={coverage} aria-label={`تغطية الأدلة ${coverage}%`} />
        </div>
      </article>
      <article>
        <span className="metric-icon amber"><FileSearch aria-hidden="true" /></span>
        <div>
          <small>الأدلة غير المحسومة</small>
          <strong dir="ltr">{unresolved}</strong>
          <span>عبر {requests.length} طلبات</span>
        </div>
      </article>
      <article>
        <span className="metric-icon coral"><CircleAlert aria-hidden="true" /></span>
        <div>
          <small>القضايا المفتوحة</small>
          <strong dir="ltr">{openFindings + 3}</strong>
          <span>3 مرتفعة</span>
        </div>
      </article>
    </section>
  );
}

function RequestsTable({
  requests,
  selectedRequestId,
  onRequestSelect,
  onShowAll,
}: {
  requests: EvidenceRequest[];
  selectedRequestId: string;
  onRequestSelect: (request: EvidenceRequest) => void;
  onShowAll: () => void;
}) {
  return (
    <section className="requests-panel" aria-labelledby="requests-title">
      <div className="panel-heading table-heading">
        <div>
          <p className="section-kicker">الجولة الحالية</p>
          <h2 id="requests-title">طلبات العميل</h2>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onShowAll}>
          عرض الكل
        </Button>
      </div>

      <div className="desktop-request-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start">رقم الطلب</TableHead>
              <TableHead className="text-start">وصف الطلب</TableHead>
              <TableHead className="text-start">المنطقة</TableHead>
              <TableHead className="text-start">الموعد</TableHead>
              <TableHead className="text-start">الأولوية</TableHead>
              <TableHead className="text-start">الحالة</TableHead>
              <TableHead className="text-start">الإجراء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.slice(0, 5).map((request) => (
              <TableRow
                key={request.id}
                data-state={selectedRequestId === request.id ? "selected" : undefined}
              >
                <TableCell className="font-medium" dir="ltr">
                  {request.id}
                </TableCell>
                <TableCell className="max-w-[320px] whitespace-normal">
                  {request.title}
                </TableCell>
                <TableCell>{request.area}</TableCell>
                <TableCell dir="ltr">{request.dueDate}</TableCell>
                <TableCell>
                  <span className="priority-text" data-priority={request.priority}>
                    {priorityLabels[request.priority]}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" data-status={request.status}>
                    {statusLabels[request.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onRequestSelect(request)}
                  >
                    راجع
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mobile-request-list">
        {requests.slice(0, 4).map((request) => {
          const expanded = selectedRequestId === request.id;
          return (
            <article key={request.id} className="mobile-request" data-expanded={expanded}>
              <button
                type="button"
                className="mobile-request-summary"
                aria-expanded={expanded}
                onClick={() => onRequestSelect(request)}
              >
                <span dir="ltr">{request.id}</span>
                <strong>{request.area}</strong>
                <Badge variant="outline" data-status={request.status}>
                  {statusLabels[request.status]}
                </Badge>
                {expanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
              </button>
              {expanded && (
                <div className="mobile-request-detail">
                  <h3>{request.title}</h3>
                  <p>{request.rationale}</p>
                  <dl>
                    <div><dt>الموعد</dt><dd dir="ltr">{request.dueDate}</dd></div>
                    <div><dt>الأولوية</dt><dd>{priorityLabels[request.priority]}</dd></div>
                    <div><dt>المستندات</dt><dd dir="ltr">{request.evidenceCount}/{request.requiredCount}</dd></div>
                  </dl>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AuditCouncil({
  proposals,
  onDecision,
}: {
  proposals: AIProposal[];
  onDecision: (
    proposal: AIProposal,
    decision: Exclude<ProposalDecision, "pending">,
  ) => void;
}) {
  return (
    <aside className="council-panel" aria-labelledby="council-title">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">اقتراحات مقيدة</p>
          <h2 id="council-title">مجلس المراجعين</h2>
        </div>
        <Bot aria-hidden="true" />
      </div>
      <p className="council-intro">
        تحليلات مساعدة لا تغيّر رقمًا أو تصنيفًا، ولا تُغلق عملًا دون قرار بشري.
      </p>
      <div className="proposal-list">
        {proposals.map((proposal) => (
          <article key={proposal.id} className="proposal" data-decision={proposal.decision}>
            <header>
              <span className="reviewer-avatar">{proposal.initials}</span>
              <div>
                <h3>{proposal.reviewer}</h3>
                <p>{proposal.role}</p>
              </div>
              <span
                className="confidence"
                dir={proposal.origin === "deterministic" ? "rtl" : "ltr"}
              >
                {proposal.origin === "deterministic"
                  ? "حتمي"
                  : `${proposal.confidence}%`}
              </span>
            </header>
            <p className="proposal-message">{proposal.message}</p>
            {proposal.numericBasis ? (
              <dl className="proposal-basis">
                <div>
                  <dt>{proposal.numericBasis.label}</dt>
                  <dd dir="ltr">{proposal.numericBasis.value}</dd>
                </div>
                {proposal.roundId ? (
                  <div>
                    <dt>الجولة</dt>
                    <dd dir="ltr">{proposal.roundId}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
            <div className="proposal-citations" aria-label="الإسنادات">
              {proposal.citations.map((citation) => (
                <span key={citation} dir="ltr">{citation}</span>
              ))}
            </div>
            <details className="proposal-boundary">
              <summary>الإجراء والحدود المهنية</summary>
              {proposal.suggestedAction ? (
                <p><strong>الإجراء:</strong> {proposal.suggestedAction}</p>
              ) : null}
              <p><strong>الحد:</strong> {proposal.limitation}</p>
            </details>
            {proposal.decision === "pending" ? (
              <div className="proposal-actions">
                <Button type="button" size="sm" onClick={() => onDecision(proposal, "accepted")}>
                  <Check data-icon="inline-start" />
                  اعتماد
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => onDecision(proposal, "rejected")}>
                  <X data-icon="inline-start" />
                  رفض
                </Button>
              </div>
            ) : (
              <div className="decision-result" role="status">
                {proposal.decision === "accepted" ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
                {proposal.decision === "accepted" ? "اعتمده المراجع" : "رفضه المراجع"}
              </div>
            )}
          </article>
        ))}
      </div>
      <Button type="button" variant="link" className="self-start">
        <MessageSquareText data-icon="inline-start" />
        عرض مناقشات المجلس
      </Button>
    </aside>
  );
}

export function Overview({
  pipeline,
  requests,
  proposals,
  selectedRequestId,
  onRequestSelect,
  onViewChange,
  onProposalDecision,
}: OverviewProps) {
  const prioritized =
    requests.find((request) => request.id === "REQ-1042") ?? requests[0];

  return (
    <div className="overview-view">
      <div className="workspace-title-row">
        <div>
          <p className="section-kicker">{engagement.period}</p>
          <h1>{engagement.client}</h1>
          <p>الجولة الثانية · أعمال الإيرادات والذمم</p>
        </div>
        <div className="workspace-status">
          <span className="health-pulse" aria-hidden="true" />
          العمل جارٍ · آخر مزامنة محلية الآن
        </div>
      </div>

      <AuditJourney />

      <div className="overview-columns">
        <div className="overview-primary">
          <NextAction request={prioritized} onOpenRequests={() => onViewChange("requests")} />
          <MetricStrip pipeline={pipeline} requests={requests} />
          <RequestsTable
            requests={requests}
            selectedRequestId={selectedRequestId}
            onRequestSelect={onRequestSelect}
            onShowAll={() => onViewChange("requests")}
          />
        </div>
        <AuditCouncil proposals={proposals} onDecision={onProposalDecision} />
      </div>
    </div>
  );
}
