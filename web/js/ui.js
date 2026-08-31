/*
 * KOSIF Audit Pro — لبنات الواجهة
 * دوال نقية تُنتج HTML. كل نص من المستخدم أو من البيانات يمر بـ esc().
 */

import { formatMinor, formatNumber, compactParts, round } from '../../src/index.mjs';

export function esc(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export const money = (minor, exp = 2) => formatMinor(minor, { exp });
export const compact = (minor, exp = 2) => compactParts(minor, { exp });

export function stat({ label, value, unit = '', foot = '', tone = '' }) {
  return `<article class="stat"${tone ? ` data-tone="${esc(tone)}"` : ''}>
    <span class="label">${esc(label)}</span>
    <span class="value"><span class="num">${esc(value)}</span>${unit ? `<span class="unit">${esc(unit)}</span>` : ''}</span>
    ${foot ? `<span class="foot">${esc(foot)}</span>` : ''}
  </article>`;
}

export function tag(text, tone = '') {
  return `<span class="tag"${tone ? ` data-tone="${esc(tone)}"` : ''}><i></i>${esc(text)}</span>`;
}

export function card(title, body, aside = '') {
  return `<section class="card"><h3>${esc(title)}${aside}</h3>${body}</section>`;
}

export function head(kicker, title, lede = '', aside = '') {
  return `<header class="head">
    <p class="kicker">${esc(kicker)}</p>
    <h1>${esc(title)}</h1>
    ${lede ? `<p>${esc(lede)}</p>` : ''}
    ${aside ? `<div style="margin-block-start:12px">${aside}</div>` : ''}
  </header>`;
}

export function table(columns, rows, { footer = null, empty = 'لا بيانات.' } = {}) {
  if (!rows.length) return `<div class="empty">${esc(empty)}</div>`;
  const th = columns.map(c => `<th${c.n ? ' class="n"' : ''}>${esc(c.label)}</th>`).join('');
  const tb = rows.map(r => `<tr>${columns.map(c =>
    `<td${c.n ? ' class="n"' : ''}>${c.render ? c.render(r) : esc(r[c.key])}</td>`).join('')}</tr>`).join('');
  const tf = footer ? `<tfoot><tr>${columns.map(c =>
    `<td${c.n ? ' class="n"' : ''}>${esc(footer[c.key] ?? '')}</td>`).join('')}</tr></tfoot>` : '';
  return `<div class="table-wrap"><table><thead><tr>${th}</tr></thead><tbody>${tb}</tbody>${tf}</table></div>`;
}

/**
 * شريط نسبة. يحمل قيمته نصًا دائمًا إلى جانب اللون — الهوية لا تكون
 * باللون وحده أبدًا.
 */
export function meter(label, valueText, percent, fill = 'var(--s1)') {
  const w = Math.max(0, Math.min(100, round(percent, 2)));
  return `<div class="meter">
    <div class="meter-head"><span>${esc(label)}</span><b class="num">${esc(valueText)}</b></div>
    <div class="track" role="img" aria-label="${esc(label)}: ${esc(valueText)}"><i data-w="${w}" style="--fill:${esc(fill)}"></i></div>
  </div>`;
}

export function gauge(value, band, label) {
  return `<div class="gauge" data-band="${esc(band)}" role="img" aria-label="${esc(label)}: ${esc(String(value))} من 100">
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle class="bg" cx="60" cy="60" r="50"></circle>
      <circle class="fg" cx="60" cy="60" r="50" data-v="${esc(String(value))}"></circle>
    </svg>
    <div class="read"><b class="num">${esc(formatNumber(value, 1))}</b><span>${esc(label)}</span></div>
  </div>`;
}

/**
 * مخطط بنفورد: الفعلي مقابل المتوقع لكل رقم.
 * سلسلتان فقط، ولذلك يحمل وسيلة إيضاح دائمة وجدولًا بديلًا — الفارق
 * بين العمودين ليس اللون وحده بل الموضع والوسم أيضًا.
 */
export function benfordFigure(benford) {
  if (!benford?.ok) return `<div class="empty">عيّنة غير كافية لتشغيل اختبار بنفورد.</div>`;
  const max = Math.max(...benford.digits.map(d => Math.max(d.actualPct, d.expectedPct)), 1);
  const cols = benford.digits.map(d => `
    <div class="bar-col" data-flagged="${d.flagged}">
      <div class="bar-pair">
        <i class="actual" data-h="${round(d.actualPct / max * 100, 2)}"></i>
        <i class="expected" data-h="${round(d.expectedPct / max * 100, 2)}"></i>
      </div>
      <small>${d.digit}</small>
    </div>`).join('');
  return `<figure>
    <div class="bars">${cols}</div>
    <div class="legend">
      <span><i style="background:var(--s1)"></i>الفعلي</span>
      <span><i style="background:var(--border-strong)"></i>المتوقع (بنفورد)</span>
      <span><i style="background:var(--s6)"></i>انحراف يتجاوز ٥ نقاط</span>
    </div>
    <figcaption>المسافة الإقليدية المعيّرة NED = ${esc(String(benford.ned))} · الحكم: ${esc(benford.verdict)} · حجم العيّنة ${esc(String(benford.sampleSize))}</figcaption>
  </figure>
  <details style="margin-block-start:12px"><summary style="cursor:pointer;font-size:.83rem">عرض القيم كجدول</summary>
  ${table([
    { key: 'digit', label: 'الرقم' },
    { key: 'actualPct', label: 'الفعلي %', n: true },
    { key: 'expectedPct', label: 'المتوقع %', n: true },
    { key: 'deviationPct', label: 'الانحراف', n: true },
    { key: 'count', label: 'العدد', n: true }
  ], benford.digits)}</details>`;
}

/** استشهاد بمعيار: الكود وتاريخ التعديل ورابط المصدر. */
export function cite(citation) {
  return `<a class="cite" href="${esc(citation.source)}" target="_blank" rel="noopener noreferrer"
    title="${esc(citation.ar)} — ${esc(citation.lastUpdate)}">${esc(citation.code)} ↗</a>`;
}

/** ملاحظة من المجلس: رقم، معيار، إجراء. */
export function noteCard(note) {
  const sev = { high: ['خطورة عالية', 'risk'], medium: ['خطورة متوسطة', 'warn'], low: ['للعلم', 'info'] }[note.severity];
  return `<article class="note" data-severity="${esc(note.severity)}">
    <div class="note-head"><b>${esc(note.title)}</b>${tag(sev[0], sev[1])}</div>
    <p>${esc(note.detail)}</p>
    <div class="note-basis"><span class="muted">${esc(note.basis.label)}</span><b class="num">${esc(note.basis.value)}</b></div>
    ${note.standards.length ? `<div class="cites">${note.standards.map(cite).join('')}</div>` : ''}
    <div class="note-action"><b>الإجراء:</b> ${esc(note.action)} <span class="muted">(جولة ${esc(note.round)})</span></div>
  </article>`;
}

const GATE_ICON = {
  open: '<svg class="gate-icon" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  blocked: '<svg class="gate-icon" viewBox="0 0 24 24" fill="none" stroke="var(--risk)" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/></svg>',
  pending_human: '<svg class="gate-icon" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M5.5 20a6.5 6.5 0 0113 0"/></svg>'
};

export function gateRow(gate) {
  return `<div class="gate" data-state="${esc(gate.state)}">
    ${GATE_ICON[gate.state] ?? ''}
    <div><b>${esc(gate.label)}</b><p>${esc(gate.detail)}</p></div>
  </div>`;
}

export function roundCard(round, expanded) {
  const label = { open: ['مكتملة', 'ok'], blocked: ['متوقفة', 'risk'], pending_human: ['تنتظر اعتمادًا', 'warn'] }[round.status];
  return `<article class="round" data-status="${esc(round.status)}" id="round-${esc(round.id)}">
    <button class="round-head" type="button" data-round="${esc(round.id)}"
      aria-expanded="${expanded ? 'true' : 'false'}" aria-controls="body-${esc(round.id)}">
      <span class="round-id">${esc(round.id)}</span>
      <span class="round-title"><b>${esc(round.title)}</b><span>${round.openGates}/${round.totalGates} بوابة · ${round.standards.join('، ')}</span></span>
      ${tag(label[0], label[1])}
    </button>
    <div class="round-body" id="body-${esc(round.id)}" ${expanded ? '' : 'hidden'}>
      <p class="round-intent">${esc(round.intent)}</p>
      ${round.gates.map(gateRow).join('')}
    </div>
  </article>`;
}
