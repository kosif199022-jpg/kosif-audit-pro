import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);

function mediaSection(start, end) {
  const from = css.indexOf(start);
  const to = css.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `تعذر تحديد ${start}`);
  return css.slice(from, to);
}

test("عند 768px تتحول القشرة إلى تنقل سفلي وتختفي القضبان الجانبية", () => {
  const mobile = mediaSection(
    "@media (max-width: 768px)",
    "@media (max-width: 480px)",
  );
  assert.match(mobile, /\.mobile-bottom-nav\s*\{[\s\S]*display:\s*grid/);
  assert.match(mobile, /\.primary-rail,[\s\S]*\.context-rail\s*\{[\s\S]*display:\s*none/);
  assert.match(mobile, /\.main-workspace\s*\{[\s\S]*padding:\s*16px/);
});

test("طلبات العميل والجولات والمجلس تملك تخطيط هاتف صريح", () => {
  const mobile = mediaSection(
    "@media (max-width: 768px)",
    "@media (max-width: 480px)",
  );
  assert.match(mobile, /\.desktop-request-table\s*\{[\s\S]*display:\s*none/);
  assert.match(mobile, /\.mobile-request-list\s*\{[\s\S]*display:\s*flex/);
  assert.match(mobile, /\.proposal-list\s*\{[\s\S]*display:\s*flex/);
  assert.match(mobile, /\.round-gate-list\s*>\s*li\s*\{[\s\S]*grid-template-columns/);
});

test("الشاشة الصغيرة والحركة المخفضة والطباعة لها عقود مستقلة", () => {
  const small = mediaSection("@media (max-width: 480px)", "@media print");
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(small, /\.main-workspace\s*\{[\s\S]*padding:\s*12px/);
  assert.match(small, /\.round-row\s*\{[\s\S]*grid-template-columns:\s*32px/);
  assert.match(reduced, /animation-duration:\s*0\.01ms/);
  assert.match(reduced, /transition-duration:\s*0\.01ms/);
});

test("التنقل الثابت على الهاتف يحترم dynamic viewport ومنطقة الأمان", () => {
  const mobile = mediaSection(
    "@media (max-width: 768px)",
    "@supports (min-height: 100dvh)",
  );
  assert.match(mobile, /padding-block-end:\s*calc\(72px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(mobile, /min-height:\s*calc\(68px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(mobile, /inset-block-end:\s*calc\(80px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /min-height:\s*calc\(100dvh - 64px\)/);
});
