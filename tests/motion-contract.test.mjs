import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("..", import.meta.url);
const [css, appShell, button, progress, tabs] = await Promise.all([
  readFile(new URL("app/globals.css", root), "utf8"),
  readFile(new URL("components/kosif/app-shell.tsx", root), "utf8"),
  readFile(new URL("components/ui/button.tsx", root), "utf8"),
  readFile(new URL("components/ui/progress.tsx", root), "utf8"),
  readFile(new URL("components/ui/tabs.tsx", root), "utf8"),
]);

test("يثبت نظام حركة موحدًا بمدد قصيرة ومنحنيات واضحة", () => {
  const expected = new Map([
    ["--motion-instant", 120],
    ["--motion-fast", 160],
    ["--motion-medium", 260],
    ["--motion-slow", 420],
  ]);

  for (const [token, expectedMs] of expected) {
    const match = css.match(new RegExp(`${token}:\\s*(\\d+)ms`));
    assert.ok(match, `رمز الحركة مفقود: ${token}`);
    assert.equal(Number(match[1]), expectedMs);
    assert.ok(Number(match[1]) >= 120 && Number(match[1]) <= 420);
  }

  assert.match(css, /--ease-cinematic:\s*cubic-bezier/);
  assert.match(css, /--ease-spring:\s*cubic-bezier/);
});

test("لا تستخدم الأسطح التفاعلية transition-all", () => {
  for (const [name, source] of [
    ["button", button],
    ["progress", progress],
    ["tabs", tabs],
  ]) {
    assert.doesNotMatch(source, /transition-all/, `${name} يحرك خصائص غير مقصودة`);
  }

  assert.match(button, /transition-\[color,background-color,border-color,box-shadow,transform,opacity\]/);
  assert.match(progress, /transition-transform/);
});

test("تبديل المشاهد يحافظ على الوصول ويركز مساحة العمل", () => {
  assert.match(appShell, /data-motion="cinematic"/);
  assert.match(appShell, /<div key=\{view\} className="view-stage"/);
  assert.match(appShell, /mainRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(appShell, /data-view=\{view\}/);
});

test("الحركة المخفضة تعطل الزخرفة دون مسح تحويل شريط التقدم", () => {
  const reducedStart = css.indexOf("@media (prefers-reduced-motion: reduce)");
  assert.ok(reducedStart >= 0);
  const reduced = css.slice(reducedStart);

  assert.match(reduced, /animation-duration:\s*0\.01ms\s*!important/);
  assert.match(reduced, /transition-duration:\s*0\.01ms\s*!important/);
  assert.match(reduced, /\.journey-track::before/);
  assert.doesNotMatch(reduced, /\.view-stage\s+\*/);
  assert.match(progress, /transform:\s*`translateX/);
});

test("الهاتف يحترم ارتفاع الشاشة ومنطقة الأمان", () => {
  assert.match(css, /100dvh/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.mobile-bottom-nav[\s\S]*padding-block-end:\s*env\(safe-area-inset-bottom\)/);
});

