"use client";

import { useMemo, useState } from "react";
import {
  Check,
  CircleAlert,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileCheck2,
  FileInput,
  GitBranch,
  LockKeyhole,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  auditRisks,
  evaluateAuditRounds,
  getAuditGateSummary,
  getNextAuditAction,
  priorityLabels,
  requestCoverage,
  statusLabels,
  type AuditEvent,
  type EvidenceRequest,
  type RequestStatus,
  type StandardRecord,
} from "@/lib/audit-workspace";
import {
  formatMinor,
  formatNumber,
  type MoneyLine,
  type PipelineResult,
  type TrialBalanceRow,
} from "@/lib/kosif/browser.mjs";

function ViewHeader({
  kicker,
  title,
  description,
  action,
}: {
  kicker: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="view-header">
      <div>
        <p className="section-kicker">{kicker}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

export function RoundsView({
  pipeline,
  onCreateRound,
}: {
  pipeline: PipelineResult;
  onCreateRound: () => void;
}) {
  const evaluatedRounds = evaluateAuditRounds(pipeline);
  const programmeSummary = getAuditGateSummary(evaluatedRounds);
  const nextAction = getNextAuditAction(evaluatedRounds);

  return (
    <div className="content-view">
      <ViewHeader
        kicker="تنفيذ متكرر ومحكوم"
        title="جولات المراجعة"
        description="كل جولة لها هدف وأدلة وإجراءات وقرار إغلاق؛ إعادة الفتح تنشئ نسخة جديدة ولا تمحو السابقة."
        action={
          <Button type="button" onClick={onCreateRound}>
            <Plus data-icon="inline-start" />
            إنشاء جولة
          </Button>
        }
      />

      <section className="round-programme" aria-labelledby="programme-title">
        <div className="programme-overview">
          <div>
            <p className="section-kicker">برنامج A01–A10 · بوابات Fail-closed</p>
            <h2 id="programme-title">
              <span dir="ltr">{programmeSummary.open}/{programmeSummary.total}</span>{" "}
              بوابة مفتوحة
            </h2>
            <p>
              لا تُغلق الجولة بالنسبة المئوية وحدها؛ يجب أن تذكر كل بوابة سبب حالتها وما ينقصها.
            </p>
          </div>
          <Progress
            value={programmeSummary.progressPct}
            aria-label={`تقدم برنامج المراجعة ${programmeSummary.progressPct}%`}
          />
          <dl className="programme-counts" aria-label="ملخص حالات البوابات">
            <div data-status="open">
              <dt>مفتوحة</dt>
              <dd dir="ltr">{programmeSummary.open}</dd>
            </div>
            <div data-status="blocked">
              <dt>مغلقة</dt>
              <dd dir="ltr">{programmeSummary.blocked}</dd>
            </div>
            <div data-status="pending_human">
              <dt>حكم بشري</dt>
              <dd dir="ltr">{programmeSummary.pendingHuman}</dd>
            </div>
            <div>
              <dt>التقدم</dt>
              <dd dir="ltr">{programmeSummary.progressPct}%</dd>
            </div>
          </dl>
        </div>

        {nextAction ? (
          <aside className="next-gate-action" aria-labelledby="next-gate-title">
            <div>
              <span className="section-kicker">الإجراء التالي المحدد</span>
              <strong id="next-gate-title">
                <span dir="ltr">{nextAction.roundId}</span> · {nextAction.gateLabel}
              </strong>
            </div>
            <p>{nextAction.reason}</p>
            {nextAction.missing.length > 0 ? (
              <p className="next-gate-missing">
                <span>ينقص:</span> {nextAction.missing.join("، ")}
              </p>
            ) : null}
            <a
              className="next-gate-link"
              href={`#gate-${nextAction.roundId}-${nextAction.gateId}`}
            >
              فتح البوابة في الجولة {nextAction.roundNumber}
            </a>
          </aside>
        ) : (
          <aside className="next-gate-action complete" aria-label="اكتمل برنامج المراجعة">
            <Check aria-hidden="true" />
            <strong>جميع البوابات مفتوحة؛ انتقل إلى اعتماد التقرير.</strong>
          </aside>
        )}
      </section>

      <section className="rounds-timeline" aria-label="جولات الارتباط">
        {evaluatedRounds.map((round) => {
          const gateSummary = getAuditGateSummary([round]);

          return (
            <article key={round.id} className="round-row" data-status={round.status}>
              <div className="round-number" aria-hidden="true">{round.number}</div>
              <div className="round-main">
                <div className="round-heading">
                  <div>
                    <span className="round-code" dir="ltr">{round.id}</span>
                    <h2>{round.title}</h2>
                    <p>{round.objective}</p>
                  </div>
                  <Badge variant={round.status === "active" ? "default" : "outline"}>
                    {round.status === "closed"
                      ? "مغلقة"
                      : round.status === "active"
                        ? "الجولة الحالية"
                        : "مخططة"}
                  </Badge>
                </div>
                <div className="round-standards" aria-label="المعايير المرتبطة">
                  {round.standards.map((standard) => (
                    <Badge key={standard} variant="outline" dir="ltr">{standard}</Badge>
                  ))}
                </div>
                <div className="round-metrics">
                  <div>
                    <span>بوابات مفتوحة</span>
                    <strong dir="ltr">{gateSummary.open}/{gateSummary.total}</strong>
                  </div>
                  <Progress
                    value={round.coveragePct}
                    aria-label={`بوابات الجولة المفتوحة ${round.coveragePct}%`}
                  />
                  <div><span>طلبات مفتوحة</span><strong dir="ltr">{round.openRequests}</strong></div>
                  <div><span>نتائج مفتوحة</span><strong dir="ltr">{round.openFindings}</strong></div>
                  <div><span>تاريخ الفتح</span><strong dir="ltr">{round.openedOn}</strong></div>
                </div>

                <details
                  className="round-gates"
                  open={round.status === "active" || round.id === nextAction?.roundId}
                >
                  <summary>
                    <span>بوابات الجولة</span>
                    <strong dir="ltr">{gateSummary.open}/{gateSummary.total}</strong>
                  </summary>
                  <ul className="round-gate-list">
                    {round.gates.map((gate) => (
                      <li
                        key={gate.id}
                        id={`gate-${round.id}-${gate.id}`}
                        data-status={gate.status}
                        tabIndex={-1}
                      >
                        <span className="round-gate-icon" aria-hidden="true">
                          {gate.status === "open" ? (
                            <Check />
                          ) : gate.status === "pending_human" ? (
                            <LockKeyhole />
                          ) : (
                            <CircleAlert />
                          )}
                        </span>
                        <div>
                          <div className="round-gate-title">
                            <h3>{gate.label}</h3>
                            {gate.humanOnly ? (
                              <span className="human-only-label">
                                <LockKeyhole aria-hidden="true" />
                                اعتماد بشري فقط
                              </span>
                            ) : null}
                          </div>
                          <p>{gate.reason}</p>
                          {gate.missing.length > 0 ? (
                            <small>ينقص: {gate.missing.join("، ")}</small>
                          ) : null}
                        </div>
                        <span className="round-gate-status">
                          {gate.status === "open"
                            ? "مفتوحة"
                            : gate.status === "pending_human"
                              ? "بانتظار إنسان"
                              : "مغلقة"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

export function RequestsView({
  requests,
  selectedRequestId,
  onSelect,
  onAdvance,
}: {
  requests: EvidenceRequest[];
  selectedRequestId: string;
  onSelect: (request: EvidenceRequest) => void;
  onAdvance: (request: EvidenceRequest) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<RequestStatus | "all">("all");
  const filtered = useMemo(
    () =>
      requests.filter((request) => {
        const matchesQuery = `${request.id} ${request.title} ${request.area}`
          .toLowerCase()
          .includes(query.trim().toLowerCase());
        const matchesStatus = status === "all" || request.status === status;
        return matchesQuery && matchesStatus;
      }),
    [query, requests, status],
  );
  const selected =
    requests.find((request) => request.id === selectedRequestId) ?? requests[0];

  return (
    <div className="content-view">
      <ViewHeader
        kicker="قائمة PBC قابلة للعمل"
        title="طلبات العميل"
        description="الملف المرفوع لا يصبح دليلًا مقبولًا قبل ربطه بخطر وإجراء وتأكيد وتقييم كفاية."
        action={
          <Button type="button">
            <Plus data-icon="inline-start" />
            طلب جديد
          </Button>
        }
      />

      <div className="filters-bar">
        <label className="search-control">
          <Search aria-hidden="true" />
          <span className="sr-only">بحث في الطلبات</span>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث بالرقم أو الوصف أو المنطقة"
          />
        </label>
        <Select value={status} onValueChange={(value) => setStatus(value as RequestStatus | "all")} dir="rtl">
          <SelectTrigger aria-label="تصفية حسب الحالة">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="open">مفتوح</SelectItem>
              <SelectItem value="partial">جزئي</SelectItem>
              <SelectItem value="received">مستلم</SelectItem>
              <SelectItem value="accepted">مقبول</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <div className="filter-summary">
          <strong dir="ltr">{filtered.length}</strong>
          <span>طلبًا ظاهرًا</span>
        </div>
      </div>

      <div className="split-workspace requests-workspace">
        <section className="data-panel" aria-labelledby="request-list-title">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">الجولة الثانية</p>
              <h2 id="request-list-title">قائمة المتابعة</h2>
            </div>
            <span className="status-dot attention">{requestCoverage(requests)}% تغطية</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">الطلب</TableHead>
                <TableHead className="text-start">المنطقة</TableHead>
                <TableHead className="text-start">الحالة</TableHead>
                <TableHead className="text-start">الأدلة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((request) => (
                <TableRow
                  key={request.id}
                  role="button"
                  tabIndex={0}
                  data-state={request.id === selected.id ? "selected" : undefined}
                  onClick={() => onSelect(request)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") onSelect(request);
                  }}
                >
                  <TableCell>
                    <strong dir="ltr">{request.id}</strong>
                    <span className="cell-subtitle">{request.title}</span>
                  </TableCell>
                  <TableCell>{request.area}</TableCell>
                  <TableCell>
                    <Badge variant="outline" data-status={request.status}>
                      {statusLabels[request.status]}
                    </Badge>
                  </TableCell>
                  <TableCell dir="ltr">{request.evidenceCount}/{request.requiredCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <aside className="detail-panel" aria-labelledby="request-detail-title">
          <div className="detail-panel-head">
            <div>
              <span dir="ltr">{selected.id}</span>
              <h2 id="request-detail-title">{selected.title}</h2>
            </div>
            <Badge variant="outline" data-status={selected.status}>
              {statusLabels[selected.status]}
            </Badge>
          </div>
          <p>{selected.rationale}</p>
          <dl className="detail-list wide">
            <div><dt>الخطر</dt><dd dir="ltr">{selected.riskId}</dd></div>
            <div><dt>التأكيد</dt><dd>{selected.assertion}</dd></div>
            <div><dt>المسؤول</dt><dd>{selected.owner}</dd></div>
            <div><dt>الموعد</dt><dd dir="ltr">{selected.dueDate}</dd></div>
            <div><dt>الأولوية</dt><dd>{priorityLabels[selected.priority]}</dd></div>
            <div><dt>الأدلة</dt><dd dir="ltr">{selected.evidenceCount}/{selected.requiredCount}</dd></div>
          </dl>
          <div className="linked-standards">
            <span>المعايير المرتبطة</span>
            <div>
              {selected.standardCodes.map((code) => <Badge key={code} variant="outline" dir="ltr">{code}</Badge>)}
            </div>
          </div>
          <div className="detail-actions">
            <Button type="button" onClick={() => onAdvance(selected)} disabled={selected.status === "accepted"}>
              <Check data-icon="inline-start" />
              {selected.status === "received" ? "قبول الدليل" : selected.status === "accepted" ? "تم القبول" : "تسجيل استلام كامل"}
            </Button>
            <Button type="button" variant="outline">
              <Upload data-icon="inline-start" />
              إرفاق دليل
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function EvidenceView({ events }: { events: AuditEvent[] }) {
  const traceNodes = [
    { id: "SRC-TB-2026-03", label: "دفعة ميزان المراجعة", type: "مصدر", state: "verified" },
    { id: "REQ-1042", label: "طلب أدلة الإيرادات", type: "طلب", state: "verified" },
    { id: "PROC-REV-09", label: "اختبار القطع", type: "إجراء", state: "attention" },
    { id: "FND-REV-03", label: "استثناء قيد يدوي", type: "نتيجة", state: "attention" },
    { id: "JDG-REV-02", label: "قرار المراجع", type: "حكم", state: "pending" },
  ];

  return (
    <div className="content-view">
      <ViewHeader
        kicker="رسم إسناد حي"
        title="الأدلة وأثرها"
        description="لا تُعرض الملفات كمجلدات؛ تُعرض علاقتها بالخطر والإجراء والنتيجة والحكم والتقرير."
        action={<Button type="button" variant="outline"><Download data-icon="inline-start" />تصدير حزمة إسناد</Button>}
      />

      <section className="trace-panel" aria-labelledby="trace-title">
        <div className="panel-heading">
          <div><p className="section-kicker">DERIVED_FROM → TESTED_BY → DECIDED_BY</p><h2 id="trace-title">مسار الدليل المحدد</h2></div>
          <GitBranch aria-hidden="true" />
        </div>
        <ol className="trace-chain">
          {traceNodes.map((node, index) => (
            <li key={node.id} data-state={node.state}>
              <span className="trace-index">{index + 1}</span>
              <div><small>{node.type}</small><strong>{node.label}</strong><span dir="ltr">{node.id}</span></div>
            </li>
          ))}
        </ol>
      </section>

      <div className="split-workspace">
        <section className="data-panel" aria-labelledby="evidence-register-title">
          <div className="panel-heading"><div><p className="section-kicker">إصدارات لا تُستبدل</p><h2 id="evidence-register-title">سجل الأدلة</h2></div><FileCheck2 /></div>
          <Table>
            <TableHeader><TableRow><TableHead className="text-start">الدليل</TableHead><TableHead className="text-start">النوع</TableHead><TableHead className="text-start">البصمة</TableHead><TableHead className="text-start">التقييم</TableHead></TableRow></TableHeader>
            <TableBody>
              {[
                ["EVD-4589", "تحليل قيود", "a1d7…b92e", "قيد التقييم"],
                ["EVD-4512", "عقود عملاء", "38fa…11c0", "مناسب"],
                ["EVD-4477", "إثباتات شحن", "ff03…a84d", "مقبول"],
                ["EVD-4391", "مصادقة بنك", "7aa1…90bd", "مقبول"],
              ].map((row) => (
                <TableRow key={row[0]}><TableCell dir="ltr">{row[0]}</TableCell><TableCell>{row[1]}</TableCell><TableCell dir="ltr"><code>{row[2]}</code></TableCell><TableCell>{row[3]}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
        <aside className="detail-panel event-panel">
          <div className="panel-heading"><div><p className="section-kicker">Append-only</p><h2>آخر أحداث الملف</h2></div><LockKeyhole /></div>
          <ol className="event-list">
            {events.slice(0, 5).map((event) => (
              <li key={event.id}><span className="event-dot" /><div><strong>{event.action}</strong><p>{event.subject} · {event.reason}</p><small>{event.actor} · <bdi>{event.at.replace("T", " ").slice(0, 16)}</bdi></small></div></li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}

export function RisksView() {
  return (
    <div className="content-view">
      <ViewHeader kicker="مصفوفة مخاطر وتغطية" title="المخاطر والاستجابات" description="الخطر لا يكتمل بوصفه؛ يجب ربطه بتأكيد وإجراء ودليل ومعيار وقرار مراجعة." />
      <section className="data-panel">
        <Table>
          <TableHeader><TableRow><TableHead className="text-start">الخطر</TableHead><TableHead className="text-start">التأكيد</TableHead><TableHead className="text-start">الاستجابة</TableHead><TableHead className="text-start">المستوى</TableHead><TableHead className="text-start">التغطية</TableHead></TableRow></TableHeader>
          <TableBody>
            {auditRisks.map((risk) => (
              <TableRow key={risk.id}>
                <TableCell><strong>{risk.title}</strong><span className="cell-subtitle" dir="ltr">{risk.id}</span></TableCell>
                <TableCell>{risk.assertion}</TableCell>
                <TableCell className="max-w-[360px] whitespace-normal">{risk.response}</TableCell>
                <TableCell><span className="priority-text" data-priority={risk.level}>{priorityLabels[risk.level]}</span></TableCell>
                <TableCell className="min-w-[150px]"><div className="coverage-cell"><strong dir="ltr">{risk.coveragePct}%</strong><Progress value={risk.coveragePct} aria-label={`تغطية ${risk.title} ${risk.coveragePct}%`} /></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

export function BalanceView({ pipeline, onImport, onExport }: { pipeline: PipelineResult; onImport: () => void; onExport: () => void }) {
  const tb = pipeline.trialBalance;
  return (
    <div className="content-view">
      <ViewHeader
        kicker="المصدر المحاسبي"
        title="ميزان المراجعة"
        description="استيراد محلي، تصنيف حتمي، وتشخيص قبل السماح بالاعتماد على أي قائمة أو تقرير."
        action={<div className="view-actions"><Button type="button" onClick={onImport}><Upload data-icon="inline-start" />استيراد</Button><Button type="button" variant="outline" onClick={onExport}><Download data-icon="inline-start" />تصدير النتيجة</Button></div>}
      />
      <Alert variant={pipeline.reliance.canRely ? "default" : "destructive"}>
        {pipeline.reliance.canRely ? <ShieldCheck /> : <CircleAlert />}
        <AlertTitle>{pipeline.reliance.canRely ? "الميزان صالح للتحليل" : "توقف اعتماد القوائم"}</AlertTitle>
        <AlertDescription>{pipeline.reliance.canRely ? "اتزان الميزان واكتمال التصنيف واتساق القوائم تحققت." : pipeline.reliance.rule}</AlertDescription>
      </Alert>
      <section className="metric-strip compact-metrics" aria-label="ملخص الميزان">
        <article><div><small>الحسابات</small><strong dir="ltr">{tb.rows.length}</strong><span>صفًا صالحًا</span></div></article>
        <article><div><small>إجمالي المدين</small><strong dir="ltr">{formatMinor(tb.totals.debit)}</strong><span>ريال</span></div></article>
        <article><div><small>إجمالي الدائن</small><strong dir="ltr">{formatMinor(tb.totals.credit)}</strong><span>ريال</span></div></article>
        <article><div><small>الفرق</small><strong dir="ltr">{formatMinor(tb.difference)}</strong><span>{tb.balanced ? "متوازن" : "غير متوازن"}</span></div></article>
      </section>
      <section className="data-panel">
        <div className="panel-heading"><div><p className="section-kicker">أولوية الفحص</p><h2>أكبر الأرصدة</h2></div><FileInput /></div>
        <Table>
          <TableHeader><TableRow><TableHead className="text-start">الحساب</TableHead><TableHead className="text-start">الاسم</TableHead><TableHead className="text-start">النوع</TableHead><TableHead className="text-start">الرصيد</TableHead><TableHead className="text-start">أساس التصنيف</TableHead></TableRow></TableHeader>
          <TableBody>
            {pipeline.largest.map((row: TrialBalanceRow) => (
              <TableRow key={row.code}><TableCell dir="ltr">{row.code}</TableCell><TableCell>{row.name}</TableCell><TableCell>{row.type}</TableCell><TableCell dir="ltr">{formatMinor(row.net < 0n ? -row.net : row.net)}</TableCell><TableCell>{row.classifiedBy === "code" ? "دليل الحسابات" : "اسم الحساب"}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

function StatementRows({ rows, onTrace }: { rows: Array<MoneyLine & { key: string }>; onTrace: (key: string) => void }) {
  return (
    <Table>
      <TableHeader><TableRow><TableHead className="text-start">البند</TableHead><TableHead className="text-start">القيمة</TableHead><TableHead className="text-start">الإسناد</TableHead></TableRow></TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}><TableCell><strong>{row.label}</strong></TableCell><TableCell dir="ltr">{formatMinor(row.minor)}</TableCell><TableCell><Button type="button" variant="link" size="sm" onClick={() => onTrace(row.key)}><GitBranch data-icon="inline-start" />تتبّع المصدر</Button></TableCell></TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function StatementsView({ pipeline, onTrace }: { pipeline: PipelineResult; onTrace: (key: string) => void }) {
  const p = pipeline.statements.position;
  const i = pipeline.statements.income;
  const positionRows = [
    { key: "currentAssets", ...p.currentAssets },
    { key: "nonCurrentAssets", ...p.nonCurrentAssets },
    { key: "totalAssets", ...p.totalAssets },
    { key: "currentLiabilities", ...p.currentLiabilities },
    { key: "nonCurrentLiabilities", ...p.nonCurrentLiabilities },
    { key: "totalLiabilities", ...p.totalLiabilities },
    { key: "totalEquity", ...p.totalEquity },
  ];
  const incomeRows = [
    { key: "revenue", ...i.revenue },
    { key: "cogs", ...i.cogs },
    { key: "grossProfit", ...i.grossProfit },
    { key: "operatingExpenses", ...i.operatingExpenses },
    { key: "operatingProfit", ...i.operatingProfit },
    { key: "financeCosts", ...i.financeCosts },
    { key: "netProfit", ...i.netProfit },
  ];
  return (
    <div className="content-view">
      <ViewHeader kicker="قوائم مشتقة وليست مدخلة" title="القوائم المالية" description="كل مبلغ مبني من حسابات الميزان ويحمل مسارًا إلى المصدر ومعادلة الاشتقاق." action={<Button type="button" variant="outline" onClick={() => window.print()}><Printer data-icon="inline-start" />طباعة</Button>} />
      <div className="ratio-band">
        <article><span>نسبة التداول</span><strong dir="ltr">{formatNumber(pipeline.analysis.ratios.liquidity.currentRatio, 1)}%</strong></article>
        <article><span>هامش صافي الربح</span><strong dir="ltr">{formatNumber(pipeline.analysis.ratios.profitability.netMarginPct, 1)}%</strong></article>
        <article><span>الدين إلى حقوق الملكية</span><strong dir="ltr">{formatNumber(pipeline.analysis.ratios.leverage.debtToEquity, 1)}%</strong></article>
        <article><span>منطقة ألتمان</span><strong dir="ltr">{pipeline.analysis.solvency.zone}</strong></article>
      </div>
      <section className="data-panel">
        <Tabs defaultValue="position" dir="rtl">
          <TabsList variant="line" aria-label="اختيار القائمة"><TabsTrigger value="position">المركز المالي</TabsTrigger><TabsTrigger value="income">الدخل</TabsTrigger></TabsList>
          <TabsContent value="position"><StatementRows rows={positionRows} onTrace={onTrace} /></TabsContent>
          <TabsContent value="income"><StatementRows rows={incomeRows} onTrace={onTrace} /></TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

export function StandardsView({ standards, onSelect }: { standards: StandardRecord[]; onSelect: (code: string) => void }) {
  const [query, setQuery] = useState("");
  const filtered = standards.filter((standard) => `${standard.code} ${standard.title} ${standard.summary}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="content-view">
      <ViewHeader kicker="سجل إصدارات مثبت" title="المعايير والتحديثات" description="يرتبط كل خطر وإجراء ودليل بإصدار وفقرة ومصدر رسمي؛ التحديث لا يغيّر ارتباطًا قائمًا دون اعتماد." action={<Button type="button" variant="outline"><RefreshCw data-icon="inline-start" />فحص التحديثات</Button>} />
      <label className="search-control wide-search"><Search aria-hidden="true" /><span className="sr-only">بحث في المعايير</span><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث برمز المعيار أو الموضوع" /></label>
      <section className="standards-register">
        {filtered.map((standard) => (
          <article key={standard.code} className="standard-row">
            <button type="button" className="standard-row-main" onClick={() => onSelect(standard.code)}>
              <span className="standard-code" dir="ltr">{standard.code}</span>
              <div><h2>{standard.title}</h2><p>{standard.summary}</p></div>
            </button>
            <dl><div><dt>الفقرات</dt><dd dir="ltr">{standard.paragraphs.join(" · ")}</dd></div><div><dt>آخر تحقق</dt><dd dir="ltr">{standard.lastReviewed}</dd></div><div><dt>الارتباطات</dt><dd dir="ltr">{standard.linkedObjects}</dd></div></dl>
            <a href={standard.sourceUrl} target="_blank" rel="noreferrer" aria-label={`فتح المصدر الرسمي لـ ${standard.code}`}><ExternalLink /></a>
          </article>
        ))}
      </section>
    </div>
  );
}

export function ReportsView({ pipeline, requests, pendingProposals, onExport }: { pipeline: PipelineResult; requests: EvidenceRequest[]; pendingProposals: number; onExport: () => void }) {
  const coverage = requestCoverage(requests);
  const programmeSummary = getAuditGateSummary(evaluateAuditRounds(pipeline));
  const checks = [
    { label: "سلامة ميزان المراجعة واتساق القوائم", passed: pipeline.reliance.canRely },
    { label: "فتح بوابات برنامج A01–A10 جميعًا", passed: programmeSummary.open === programmeSummary.total },
    { label: "تغطية الأدلة لا تقل عن 95%", passed: coverage >= 95 },
    { label: "إغلاق طلبات الأدلة مرتفعة الأولوية", passed: !requests.some((item) => item.priority === "high" && item.status !== "accepted") },
    { label: "حسم مقترحات مجلس المراجعين", passed: pendingProposals === 0 },
    { label: "إغلاق نتائج الجولة وملاحظات المراجعة", passed: false },
    { label: "اعتماد الشريك البشري", passed: false },
  ];
  const ready = checks.every((check) => check.passed);
  return (
    <div className="content-view">
      <ViewHeader kicker="الرأي مشتق من الملف" title="التقرير والجاهزية" description="لا يوجد حقل لاختيار الرأي؛ المحرك يشتقه بعد اكتمال الأدلة والتحريفات والمراجعة والاعتماد." action={<div className="view-actions"><Button type="button" variant="outline" onClick={onExport}><Download data-icon="inline-start" />تصدير ملف العمل</Button><Button type="button" disabled={!ready}><LockKeyhole data-icon="inline-start" />إصدار التقرير</Button></div>} />
      <div className="report-readiness">
        <section className="opinion-panel" data-ready={ready}>
          <p className="section-kicker">حالة الرأي</p>
          <h2>{ready ? "جاهز للاشتقاق والاعتماد" : "غير جاهز للإصدار"}</h2>
          <p>{ready ? "اكتملت بوابات الملف ويمكن إرسال الرأي المشتق للشريك." : "تبقى فجوات أدلة وقرارات بشرية؛ لا يعرض النظام رأيًا نهائيًا قبل إغلاقها."}</p>
          <div className="readiness-score"><strong dir="ltr">{checks.filter((check) => check.passed).length}/{checks.length}</strong><span>بوابات مكتملة</span></div>
        </section>
        <section className="gate-panel" aria-labelledby="gates-title">
          <div className="panel-heading"><div><p className="section-kicker">بوابات Fail-closed</p><h2 id="gates-title">قائمة الجاهزية</h2></div><ClipboardCheck /></div>
          <ul className="gate-list">
            {checks.map((check) => <li key={check.label} data-passed={check.passed}>{check.passed ? <Check /> : <CircleAlert />}<span>{check.label}</span><strong>{check.passed ? "مكتمل" : "مطلوب"}</strong></li>)}
          </ul>
        </section>
      </div>
    </div>
  );
}
