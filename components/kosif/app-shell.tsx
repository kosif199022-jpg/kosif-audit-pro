"use client";

import { useEffect, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookOpen,
  ChartNoAxesCombined,
  CircleHelp,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Home,
  Landmark,
  ListChecks,
  Menu,
  Moon,
  Scale,
  ShieldAlert,
  Sun,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  auditRounds,
  engagement,
  type StandardRecord,
  type WorkspaceView,
} from "@/lib/audit-workspace";

interface NavItem {
  id: WorkspaceView;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { id: "overview", label: "لوحة المراجعة", icon: Home },
  { id: "rounds", label: "الجولات", icon: ListChecks },
  { id: "requests", label: "طلبات العميل", icon: ClipboardCheck },
  { id: "evidence", label: "الأدلة", icon: FileCheck2 },
  { id: "risks", label: "المخاطر", icon: ShieldAlert },
  { id: "balance", label: "ميزان المراجعة", icon: Scale },
  { id: "statements", label: "القوائم المالية", icon: ChartNoAxesCombined },
  { id: "standards", label: "المعايير", icon: BookOpen },
  { id: "reports", label: "التقرير", icon: FileText },
];

interface AppShellProps {
  children: React.ReactNode;
  view: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
  onImport: () => void;
  standards: StandardRecord[];
  selectedStandardCode: string;
  onStandardSelect: (code: string) => void;
  dark: boolean;
  onThemeToggle: () => void;
}

function Navigation({
  view,
  onViewChange,
  onNavigate,
}: {
  view: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1" aria-label="التنقل الرئيسي">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.id === view;
        return (
          <Button
            key={item.id}
            type="button"
            variant={active ? "secondary" : "ghost"}
            className="nav-item w-full justify-start"
            data-active={active}
            aria-current={active ? "page" : undefined}
            onClick={() => {
              onViewChange(item.id);
              onNavigate?.();
            }}
          >
            <Icon data-icon="inline-start" />
            {item.label}
          </Button>
        );
      })}
    </nav>
  );
}

function StandardsContext({
  standards,
  selectedStandardCode,
  onStandardSelect,
  compact = false,
}: {
  standards: StandardRecord[];
  selectedStandardCode: string;
  onStandardSelect: (code: string) => void;
  compact?: boolean;
}) {
  const selected =
    standards.find((item) => item.code === selectedStandardCode) ?? standards[0];

  return (
    <div className={cn("standards-context", compact && "standards-context-sheet")}>
      <div className="panel-heading">
        <div>
          <p className="section-kicker">السياق المهني</p>
          <h2>المعايير المرتبطة</h2>
        </div>
        <BookOpen aria-hidden="true" />
      </div>

      <div className="standard-switcher" role="list" aria-label="المعايير المرتبطة">
        {standards.slice(0, compact ? standards.length : 5).map((standard) => (
          <button
            key={standard.code}
            type="button"
            className="standard-switch"
            data-active={standard.code === selected.code}
            aria-pressed={standard.code === selected.code}
            onClick={() => onStandardSelect(standard.code)}
          >
            <span dir="ltr">{standard.code}</span>
            <small>{standard.linkedObjects} ارتباطًا</small>
          </button>
        ))}
      </div>

      <article
        key={selected.code}
        className="standard-detail standard-detail-motion"
        aria-live="polite"
      >
        <div className="standard-code-row">
          <span className="standard-code" dir="ltr">
            {selected.code}
          </span>
          <span className="status-dot verified">مثبّت</span>
        </div>
        <h3>{selected.title}</h3>
        <p>{selected.summary}</p>
        <dl className="detail-list">
          <div>
            <dt>الفقرات</dt>
            <dd dir="ltr">{selected.paragraphs.join(" · ")}</dd>
          </div>
          <div>
            <dt>الإصدار</dt>
            <dd>{selected.release}</dd>
          </div>
          <div>
            <dt>آخر تحقق</dt>
            <dd dir="ltr">{selected.lastReviewed}</dd>
          </div>
        </dl>
        <a
          className="source-link"
          href={selected.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          فتح المصدر الرسمي
        </a>
      </article>

      {!compact && (
        <p className="context-note">
          التحديثات لا تغيّر هذا الارتباط بأثر رجعي؛ يلزم قرار بشري لتثبيت إصدار
          أحدث.
        </p>
      )}
    </div>
  );
}

export function AppShell({
  children,
  view,
  onViewChange,
  onImport,
  standards,
  selectedStandardCode,
  onStandardSelect,
  dark,
  onThemeToggle,
}: AppShellProps) {
  const mainRef = useRef<HTMLElement>(null);
  const previousView = useRef(view);

  useEffect(() => {
    if (previousView.current === view) return;
    previousView.current = view;

    const frame = window.requestAnimationFrame(() => {
      mainRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [view]);

  return (
    <div className="kosif-app" data-motion="cinematic">
      <a className="skip-link" href="#main-workspace">
        انتقل إلى مساحة العمل
      </a>

      <header className="topbar">
        <div className="brand-lockup" aria-label="KOSIF Audit Studio">
          <span className="brand-mark">K</span>
          <span>
            <strong>KOSIF</strong>
            <small>Audit Studio</small>
          </span>
        </div>

        <div className="topbar-context" aria-label="سياق الارتباط">
          <Select defaultValue={engagement.id} dir="rtl">
            <SelectTrigger aria-label="العميل">
              <Landmark aria-hidden="true" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={engagement.id}>{engagement.client}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select defaultValue="2026" dir="rtl">
            <SelectTrigger aria-label="فترة المراجعة">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="2026">{engagement.period}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select defaultValue="2" dir="rtl">
            <SelectTrigger aria-label="الجولة الحالية">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {auditRounds.map((round) => (
                  <SelectItem key={round.id} value={String(round.number)}>
                    الجولة {round.number}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="topbar-actions">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="icon-action"
            aria-label="المساعدة"
          >
            <CircleHelp />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="icon-action"
            aria-label="التنبيهات"
          >
            <Bell />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="theme-toggle"
            data-theme={dark ? "dark" : "light"}
            aria-label={dark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
            onClick={onThemeToggle}
          >
            {dark ? <Sun /> : <Moon />}
          </Button>
          <Button type="button" className="import-cta" onClick={onImport}>
            <Upload data-icon="inline-start" />
            استيراد ميزان
          </Button>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              type="button"
              className="mobile-menu-trigger"
              variant="outline"
              size="icon-lg"
              aria-label="فتح القائمة"
            >
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[88%]" showCloseButton={false}>
            <SheetHeader>
              <SheetTitle>KOSIF</SheetTitle>
              <SheetDescription>التنقل في ملف المراجعة</SheetDescription>
            </SheetHeader>
            <div className="px-4">
              <Navigation view={view} onViewChange={onViewChange} />
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <div className="app-grid">
        <aside className="primary-rail">
          <div className="rail-engagement">
            <span className="avatar-mark">م</span>
            <div>
              <strong>{engagement.lead}</strong>
              <small>مدير المراجعة</small>
            </div>
          </div>
          <Navigation view={view} onViewChange={onViewChange} />
          <div className="rail-footer">
            <span className="health-pulse" aria-hidden="true" />
            النواة الحتمية جاهزة
          </div>
        </aside>

        <main
          ref={mainRef}
          id="main-workspace"
          className="main-workspace"
          data-view={view}
          tabIndex={-1}
        >
          <div key={view} className="view-stage" data-view={view}>
            {children}
          </div>
        </main>

        <aside className="context-rail">
          <StandardsContext
            standards={standards}
            selectedStandardCode={selectedStandardCode}
            onStandardSelect={onStandardSelect}
          />
        </aside>
      </div>

      <nav className="mobile-bottom-nav" aria-label="التنقل السريع">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = item.id === view;
          return (
            <button
              key={item.id}
              type="button"
              className="mobile-nav-item"
              data-active={active}
              aria-current={active ? "page" : undefined}
              onClick={() => onViewChange(item.id)}
            >
              <Icon aria-hidden="true" />
              <span>{item.label.replace("لوحة المراجعة", "العمل")}</span>
            </button>
          );
        })}
      </nav>

      <Sheet>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="mobile-standard-trigger"
          >
            <BookOpen data-icon="inline-start" />
            المعيار
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto" showCloseButton={false}>
          <SheetHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <SheetTitle>المعايير المرتبطة</SheetTitle>
                <SheetDescription>السياق المهني للعنصر المحدد</SheetDescription>
              </div>
              <SheetClose asChild>
                <Button type="button" variant="ghost" size="icon" aria-label="إغلاق">
                  <X />
                </Button>
              </SheetClose>
            </div>
          </SheetHeader>
          <StandardsContext
            standards={standards}
            selectedStandardCode={selectedStandardCode}
            onStandardSelect={onStandardSelect}
            compact
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
