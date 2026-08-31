/*
 * KOSIF Audit Pro — الشاشات
 * كل شاشة تعرض جزءًا من حالة ارتباط واحدة. لا شاشة «تصفّح» بلا عمل.
 */

import { esc, money, compact, stat, tag, card, head, table, meter, gauge, benfordFigure, cite, noteCard, roundCard } from './ui.js';
import { formatNumber, round, ROUNDS } from '../../src/index.mjs';

const TYPE_AR = { asset: 'أصول', liability: 'التزامات', equity: 'حقوق ملكية', revenue: 'إيرادات', expense: 'مصروفات', suspense: 'غير مصنّف' };
const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)'];

/* ── لوحة الارتباط ─────────────────────────────────────────────── */
export function dashboard(app) {
  const { result, programme, board, entity } = app.computed;
  const p = result.statements.position;
  const i = result.statements.income;
  const risk = result.analysis.risk;
  const next = app.computed.nextAction;

  return `
  ${head('لوحة الارتباط', entity.name || 'ارتباط بلا اسم',
    entity.periodStart ? `الفترة من ${entity.periodStart} إلى ${entity.periodEnd} · ${entity.framework || 'إطار غير محدد'}` : 'ابدأ بتعريف المنشأة والفترة.',
    tag(result.trialBalance.balanced ? 'الميزان متوازن' : `فرق ${money(result.trialBalance.difference)}`, result.trialBalance.balanced ? 'ok' : 'risk')
    + ' ' + tag(`${programme.roundsOpen}/${programme.roundsTotal} جولة مكتملة`, programme.reportable ? 'ok' : 'info'))}

  <div class="grid g4">
    ${stat({ label: 'إجمالي الأصول', ...compact(p.totalAssets.minor), foot: entity.currency || 'ر.س' })}
    ${stat({ label: 'صافي الربح', ...compact(i.netProfit.minor), foot: 'نتيجة الفترة', tone: i.netProfit.minor >= 0n ? 'ok' : 'risk' })}
    ${stat({ label: 'مؤشر المخاطر', value: formatNumber(risk.index, 1), unit: '/ 100', foot: risk.bandLabel, tone: risk.band === 'high' ? 'risk' : risk.band === 'medium' ? 'warn' : 'ok' })}
    ${stat({ label: 'ملاحظات المجلس', value: String(board.notes.length), foot: `${board.counts.high} عالية · ${board.counts.medium} متوسطة`, tone: board.counts.high ? 'risk' : 'ok' })}
  </div>

  <section class="section">
    <h2>الخطوة التالية</h2>
    <div class="card" style="border-inline-start:3px solid var(--primary)">
      <p class="muted" style="font-size:.78rem;letter-spacing:.1em">${esc({ gate: 'بوابة متوقفة', human: 'ينتظر قرارك', complete: 'مكتمل' }[next.kind])}</p>
      <b style="font-size:1.05rem;display:block;margin-block:6px">${esc(next.title)}</b>
      <p>${esc(next.detail)}</p>
      <a class="btn btn-primary btn-sm" style="margin-block-start:12px" href="${esc(next.route)}">انتقل ←</a>
      ${next.alsoUrgent ? `<p class="muted" style="margin-block-start:10px;font-size:.8rem">وبالتوازي: ${esc(next.alsoUrgent)}</p>` : ''}
    </div>
  </section>

  <section class="section">
    <h2>حالة الملف</h2>
    <div class="grid g3">
      ${card('التوازن المحاسبي', `
        <div class="meter" style="gap:12px">
          <div class="meter-head"><span>مدين</span><b class="num">${esc(money(result.trialBalance.totals.debit))}</b></div>
          <div class="meter-head"><span>دائن</span><b class="num">${esc(money(result.trialBalance.totals.credit))}</b></div>
          <div class="meter-head" style="border-block-start:1px solid var(--border);padding-block-start:9px">
            <span>الفرق</span><b class="num" style="color:${result.trialBalance.balanced ? 'var(--ok)' : 'var(--risk)'}">${esc(money(result.trialBalance.difference))}</b></div>
        </div>`)}
      ${card('اتساق القوائم', `
        <div class="meter" style="gap:12px">
          <div class="meter-head"><span>الأصول</span><b class="num">${esc(money(p.totalAssets.minor))}</b></div>
          <div class="meter-head"><span>التزامات + حقوق ملكية</span><b class="num">${esc(money(p.totalLiabilities.minor + p.totalEquity.minor))}</b></div>
          <div class="meter-head" style="border-block-start:1px solid var(--border);padding-block-start:9px">
            <span>الفرق</span><b class="num" style="color:${result.statements.articulation.articulated ? 'var(--ok)' : 'var(--risk)'}">${esc(money(result.statements.articulation.balanceCheckMinor))}</b></div>
        </div>`)}
      ${card('مؤشر المخاطر المركّب', gauge(risk.index, risk.band, risk.bandLabel))}
    </div>
  </section>

  <section class="section">
    <h2>تقدّم البرنامج</h2>
    <div class="grid g2">
      ${card('الجولات', programme.rounds.map(r =>
        `<div class="meter" style="margin-block-end:11px">
          <div class="meter-head"><span>${esc(r.id)} · ${esc(r.title)}</span><b class="num">${r.openGates}/${r.totalGates}</b></div>
          <div class="track"><i data-w="${round(r.openGates / r.totalGates * 100, 1)}" style="--fill:${r.status === 'open' ? 'var(--ok)' : r.status === 'pending_human' ? 'var(--warn)' : 'var(--risk)'}"></i></div>
        </div>`).join(''))}
      ${card('التصنيف حسب النوع', result.byType.filter(t => t.count).map((t, idx) => {
        const abs = t.net < 0n ? -t.net : t.net;
        const max = result.byType.reduce((m, x) => { const a = x.net < 0n ? -x.net : x.net; return a > m ? a : m; }, 1n);
        return `<div style="margin-block-end:11px">${meter(`${t.label} (${t.count})`, money(t.net), Number(abs * 100n / max), SERIES[idx % SERIES.length])}</div>`;
      }).join(''))}
    </div>
  </section>`;
}

/* ── الجولات ───────────────────────────────────────────────────── */
export function rounds(app) {
  const { programme } = app.computed;
  const expanded = app.expandedRound ?? programme.nextRound?.id ?? 'A01';
  return `
  ${head('برنامج المراجعة', 'عشر جولات ببوابات حقيقية',
    'البوابة تفتح من بيانات الارتباط لا من مربع اختيار. البوابات ذات الأيقونة البشرية لا يفتحها المحرّك ولا الذكاء الاصطناعي.',
    tag(`${programme.gatesOpen}/${programme.gatesTotal} بوابة مفتوحة`, programme.reportable ? 'ok' : 'info'))}
  ${programme.rounds.map(r => roundCard(r, r.id === expanded)).join('')}`;
}

/* ── القرارات: المكان الذي يفتح البوابات ───────────────────────── */
export function decisions(app) {
  const s = app.state;
  const d = s.decisions;
  const field = (id, label, hint, value, type = 'text') => `
    <div class="field">
      <label for="${id}">${esc(label)}</label>
      ${type === 'textarea'
        ? `<textarea id="${id}" data-decision="${id}" style="min-height:80px;font-family:var(--font);direction:rtl;text-align:right">${esc(value ?? '')}</textarea>`
        : `<input id="${id}" data-decision="${id}" type="${type}" value="${esc(value ?? '')}">`}
      <small>${esc(hint)}</small>
    </div>`;

  return `
  ${head('القرارات والاعتمادات', 'ما لا يقرره المحرّك',
    'هذه الحقول هي ما يفتح البوابات المتوقفة. كل حقل مربوط ببوابة بعينها، والتغيير يعيد التقييم فورًا.')}

  <div class="grid g2" style="align-items:start">
    ${card('المنشأة والارتباط · A01–A02', `
      ${field('name', 'اسم المنشأة', 'يفتح بوابة «المنشأة والفترة موثّقتان».', s.entity.name)}
      ${field('activity', 'النشاط والقطاع', 'يفتح بوابة «النشاط والقطاع موصوفان» ويحدد المعايير المنطبقة.', s.entity.activity)}
      ${field('framework', 'إطار التقرير المالي', 'مثال: المعايير الدولية للتقرير المالي المعتمدة في المملكة.', s.entity.framework)}
      ${field('periodStart', 'بداية الفترة', 'بصيغة YYYY-MM-DD.', s.entity.periodStart, 'date')}
      ${field('periodEnd', 'نهاية الفترة', 'بصيغة YYYY-MM-DD.', s.entity.periodEnd, 'date')}`)}

    ${card('أحكام المراجعة · A03–A09', `
      ${field('materialityBasisReason', 'سبب اختيار أساس الأهمية النسبية', 'ISA 320 يتطلب حكمًا معلَّلًا لا نسبة آلية.', d.materialityBasisReason, 'textarea')}
      ${field('revenueFraudResponse', 'الاستجابة لافتراض غش الإيراد', 'ISA 240 يفترض الخطر — وثّق استجابتك أو دحض الافتراض.', d.revenueFraudResponse, 'textarea')}
      ${field('managementBias', 'تقييم التحيّز الإداري', 'محافظ، متفائل، أم محايد — ولماذا.', d.managementBias, 'textarea')}
      ${field('goingConcern', 'استنتاج الاستمرارية', 'لا شك جوهري / شك جوهري مع إفصاح / أساس غير ملائم.', d.goingConcern, 'textarea')}
      ${field('subsequentEventsThrough', 'الأحداث اللاحقة مفحوصة حتى', 'التاريخ الذي انتهى عنده فحص الأحداث اللاحقة.', d.subsequentEventsThrough, 'date')}
      ${field('uncorrectedResponse', 'معالجة التحريفات غير المصححة', 'يظهر أثره فقط عند تجاوز أهمية الأداء.', d.uncorrectedResponse, 'textarea')}
      <div class="field">
        <label for="controlsReliance">منهج الاعتماد على الضوابط</label>
        <select id="controlsReliance" data-decision="controlsReliance">
          <option value="">— اختر —</option>
          <option value="substantive"${d.controlsReliance === 'substantive' ? ' selected' : ''}>منهج جوهري بالكامل</option>
          <option value="rely"${d.controlsReliance === 'rely' ? ' selected' : ''}>اعتماد على الضوابط (يستوجب اختبارها)</option>
        </select>
        <small>الاعتماد يفتح شرطًا إضافيًا: توثيق اختبارات الفعالية.</small>
      </div>
      ${field('opinion', 'الرأي', 'قرار بشري. لا يقترحه التطبيق ولا يملؤه تلقائيًا.', d.opinion, 'textarea')}`)}
  </div>

  <section class="section">
    <h2>الاعتمادات الموقّعة</h2>
    <p class="muted" style="margin-block-end:14px">التوقيع باسم شخص. لا يوجد زر «اعتماد تلقائي»، ولا يستطيع أي نموذج لغوي ملء هذه الحقول.</p>
    <div class="grid g2">
      ${card('إقرار الاستقلال · A01', `
        <div class="field"><label for="signIndependence">باسم</label>
        <input id="signIndependence" data-signoff="independence" value="${esc(s.signOffs.independence?.by ?? '')}" placeholder="اسم من يقرّ بالاستقلال">
        <small>ISA 200 / ISA 220 — الاستقلال حكم شخصي.</small></div>`)}
      ${card('اعتماد الشريك · A10', `
        <div class="field"><label for="signPartner">باسم</label>
        <input id="signPartner" data-signoff="partner" value="${esc(s.signOffs.partner?.by ?? '')}" placeholder="اسم الشريك المسؤول">
        <small>ISA 700 — لا يصدر تقرير بلا اعتماد بشري.</small></div>`)}
    </div>
  </section>`;
}

/* ── البيانات ──────────────────────────────────────────────────── */
export function data(app) {
  const tb = app.computed.result.trialBalance;
  const findings = app.computed.result.findings;
  return `
  ${head('البيانات', 'ميزان المراجعة',
    'الصق الميزان أو ارفع ملفًا. الاستيراد يكتشف الفاصل والترويسة ويطبّع الأرقام العربية ويصنّف الحسابات.',
    tag(tb.balanced ? 'متوازن' : `فرق ${money(tb.difference)}`, tb.balanced ? 'ok' : 'risk'))}

  <div class="grid g2" style="align-items:start">
    ${card('المصدر', `
      <div class="field">
        <label for="tb-input">CSV / TSV / منسوخ من Excel</label>
        <textarea id="tb-input" dir="ltr" spellcheck="false">${esc(app.state.trialBalanceText)}</textarea>
        <small>الأعمدة: الكود، الاسم، مدين، دائن، رصيد، افتتاحي — بالعربية أو الإنجليزية.</small>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" data-act="import">استيراد وتحليل</button>
        <button class="btn btn-ghost" data-act="pick-file">رفع ملف</button>
        <input type="file" id="tb-file" accept=".csv,.tsv,.txt" hidden>
      </div>`)}
    ${card(`التشخيص (${findings.length})`, findings.length
      ? findings.map(f => `<div class="gate" data-state="${f.severity === 'info' ? 'open' : 'blocked'}" style="margin-block-end:8px">
          <div><b>${esc(f.title)}</b><p>${esc(f.detail || '')}</p></div></div>`).join('')
      : `<div class="empty">لا ملاحظات: الميزان متوازن ومصنّف بالكامل وخالٍ من التكرار.</div>`)}
  </div>

  <section class="section">
    <h2>الأرصدة (${tb.rows.length})</h2>
    ${table([
      { key: 'code', label: 'الكود' },
      { key: 'name', label: 'الحساب' },
      { key: 'type', label: 'النوع', render: r => tag(TYPE_AR[r.type] || r.type, r.type === 'suspense' ? 'warn' : '') },
      { key: 'debit', label: 'مدين', n: true, render: r => esc(money(r.debit)) },
      { key: 'credit', label: 'دائن', n: true, render: r => esc(money(r.credit)) },
      { key: 'net', label: 'الرصيد', n: true, render: r => `<b>${esc(money(r.net))}</b>` }
    ], tb.rows, {
      footer: { code: 'الإجمالي', debit: money(tb.totals.debit), credit: money(tb.totals.credit), net: money(tb.difference) },
      empty: 'لم يُستورد أي حساب بعد.'
    })}
  </section>`;
}

/* ── التحليل ───────────────────────────────────────────────────── */
export function analysis(app) {
  const r = app.computed.result;
  const a = r.analysis;
  const groups = [
    ['السيولة', [['نسبة التداول', a.ratios.liquidity.currentRatio], ['النسبة السريعة', a.ratios.liquidity.quickRatio], ['نسبة النقد', a.ratios.liquidity.cashRatio]]],
    ['الربحية', [['هامش مجمل الربح', a.ratios.profitability.grossMarginPct], ['هامش صافي الربح', a.ratios.profitability.netMarginPct], ['العائد على الأصول', a.ratios.profitability.roaPct], ['العائد على حقوق الملكية', a.ratios.profitability.roePct]]],
    ['الرفع المالي', [['الدين إلى حقوق الملكية', a.ratios.leverage.debtToEquity], ['الدين إلى الأصول', a.ratios.leverage.debtToAssets], ['نسبة حقوق الملكية', a.ratios.leverage.equityRatio]]],
    ['الكفاءة', [['دوران الذمم المدينة', a.ratios.efficiency.receivablesTurnover], ['دوران المخزون', a.ratios.efficiency.inventoryTurnover]]]
  ];

  return `
  ${head('التحليل', 'إجراءات تحليلية — ISA 520',
    'محسوبة من القوائم المبنية من ميزانك، لا من أرقام مُدخلة يدويًا.',
    a.solvency.ok ? tag(`ألتمان Z = ${formatNumber(a.solvency.z, 2)} · ${{ SAFE: 'منطقة أمان', GREY: 'منطقة رمادية', DISTRESS: 'منطقة تعثّر' }[a.solvency.zone]}`,
      a.solvency.zone === 'SAFE' ? 'ok' : a.solvency.zone === 'GREY' ? 'warn' : 'risk') : '')}

  <div class="grid g4">
    ${groups.map(([title, items], gi) => card(title,
      items.map(([label, value]) => `<div style="margin-block-end:11px">${meter(label, `${formatNumber(Number(value) || 0, 2)}%`, Math.min(100, Math.abs(Number(value) || 0) / 3), SERIES[gi % SERIES.length])}</div>`).join('')
      + `<p class="muted" style="font-size:.72rem">مقياس الشريط: ٣٠٠٪ = امتلاء</p>`)).join('')}
  </div>

  <section class="section">
    <h2>نزاهة الأرقام — ISA 240 / ISA 520</h2>
    <div class="grid g2" style="align-items:start">
      ${card('اختبار بنفورد للرقم الأول', benfordFigure(a.benford))}
      ${card('أعمار الذمم ومخصص ECL — IFRS 9', `
        ${r.aging.buckets.map((b, i) => `<div style="margin-block-end:11px">${meter(`${b.label} (${b.count})`, money(BigInt(b.minor)), Number(b.shareOfTotalPct) || 0, SERIES[i % SERIES.length])}</div>`).join('')}
        <div class="meter-head" style="border-block-start:1px solid var(--border);padding-block-start:11px;margin-block-start:5px">
          <span>مخصص الخسائر الائتمانية المتوقعة</span><b class="num" style="color:var(--warn)">${esc(money(BigInt(r.aging.provisionEclMinor)))}</b></div>
        <p class="muted" style="font-size:.75rem;margin-block-start:8px">${esc(r.aging.standard)}</p>`)}
    </div>
  </section>

  <section class="section">
    <h2>إشارات المخاطر</h2>
    <div class="grid g2" style="align-items:start">
      ${card('المؤشر المركّب', gauge(a.risk.index, a.risk.band, a.risk.bandLabel) + `<p class="muted" style="text-align:center;font-size:.79rem;margin-block-start:12px">${esc(a.risk.method)}</p>`)}
      ${card('تفصيل الإشارات', table([
        { key: 'label', label: 'الإشارة' },
        { key: 'note', label: 'الملاحظة' },
        { key: 'weightPct', label: 'الوزن', n: true, render: s => `${s.weightPct}%` },
        { key: 'score', label: 'الدرجة', n: true, render: s => `<b style="color:${s.score >= 60 ? 'var(--risk)' : s.score >= 30 ? 'var(--warn)' : 'var(--ok)'}">${esc(formatNumber(s.score, 1))}</b>` }
      ], a.risk.signals))}
    </div>
  </section>`;
}

/* ── القوائم ───────────────────────────────────────────────────── */
export function statements(app) {
  const s = app.computed.result.statements;
  const p = s.position, i = s.income;
  const row = (label, minor, strong = false, indent = 0) =>
    `<tr${strong ? ' style="font-weight:800"' : ''}><td style="padding-inline-start:${13 + indent * 16}px">${esc(label)}</td><td class="n">${esc(money(minor))}</td></tr>`;

  return `
  ${head('القوائم المالية', 'المركز المالي والدخل',
    'كل بند مبني من حسابات محددة، ومربوط بالمعايير التي تحكمه.',
    tag(s.articulation.articulated ? 'القوائم متسقة' : 'القوائم غير متسقة', s.articulation.articulated ? 'ok' : 'risk'))}

  <div class="grid g2" style="align-items:start">
    ${card('قائمة المركز المالي', `<div class="table-wrap"><table><tbody>
      ${row(p.currentAssets.label, p.currentAssets.minor, false, 1)}
      ${row(p.nonCurrentAssets.label, p.nonCurrentAssets.minor, false, 1)}
      ${row(p.totalAssets.label, p.totalAssets.minor, true)}
      ${row(p.currentLiabilities.label, p.currentLiabilities.minor, false, 1)}
      ${row(p.nonCurrentLiabilities.label, p.nonCurrentLiabilities.minor, false, 1)}
      ${row(p.totalLiabilities.label, p.totalLiabilities.minor, true)}
      ${row(p.contributedEquity.label, p.contributedEquity.minor, false, 1)}
      ${row(p.resultForPeriod.label, p.resultForPeriod.minor, false, 1)}
      ${row(p.totalEquity.label, p.totalEquity.minor, true)}
    </tbody></table></div><p class="muted" style="font-size:.77rem;margin-block-start:10px">${esc(s.standard)}</p>`)}
    ${card('قائمة الدخل', `<div class="table-wrap"><table><tbody>
      ${row(i.revenue.label, i.revenue.minor)}
      ${row(i.cogs.label, i.cogs.minor, false, 1)}
      ${row(i.grossProfit.label, i.grossProfit.minor, true)}
      ${row(i.operatingExpenses.label, i.operatingExpenses.minor, false, 1)}
      ${row(i.operatingProfit.label, i.operatingProfit.minor, true)}
      ${row(i.financeCosts.label, i.financeCosts.minor, false, 1)}
      ${row(i.netProfit.label, i.netProfit.minor, true)}
    </tbody></table></div><p class="muted" style="font-size:.77rem;margin-block-start:10px">نتيجة الفترة تنتقل إلى حقوق الملكية.</p>`)}
  </div>

  <section class="section">
    <h2>بنود القوائم ومصادرها</h2>
    ${table([
      { key: 'label', label: 'البند' },
      { key: 'statement', label: 'القائمة', render: r => esc(r.statement === 'position' ? 'المركز المالي' : 'الدخل') },
      { key: 'accounts', label: 'الحسابات', render: r => esc(r.accounts.map(a => a.code).join('، ')) },
      { key: 'minor', label: 'المبلغ', n: true, render: r => `<b>${esc(money(r.minor))}</b>` }
    ], s.lines)}
  </section>`;
}

/* ── المجلس ────────────────────────────────────────────────────── */
export function board(app) {
  const b = app.computed.board;
  const llm = app.llm;
  return `
  ${head('مجلس المراجعين', 'ثلاث زوايا على نفس الملف',
    b.boundary,
    tag(`${b.notes.length} ملاحظة · ${b.counts.high} عالية`, b.counts.high ? 'risk' : 'ok'))}

  <div class="card" style="margin-block-end:20px">
    <h3>الصياغة السردية <span class="tag">اختيارية</span></h3>
    <p class="muted" style="font-size:.85rem;margin-block-end:12px">
      المجلس أعلاه حتمي ويعمل بلا مفتاح. هذه الطبقة تضيف صياغة فوق ملاحظات موجودة أصلًا،
      وترفض أي رقم لم يحسبه المحرّك. مفتاحك يبقى في متصفحك ولا يمر بأي خادم لنا.</p>
    <div style="display:flex;gap:9px;flex-wrap:wrap;align-items:flex-end">
      <div class="field" style="margin:0;min-width:160px">
        <label for="llm-provider">المزوّد</label>
        <select id="llm-provider">
          <option value="anthropic"${llm.provider === 'anthropic' ? ' selected' : ''}>Claude (Anthropic)</option>
          <option value="gemini"${llm.provider === 'gemini' ? ' selected' : ''}>Gemini (Google)</option>
        </select>
      </div>
      <div class="field" style="margin:0;flex:1;min-width:220px">
        <label for="llm-key">المفتاح</label>
        <input id="llm-key" type="password" value="${esc(llm.apiKey)}" placeholder="يُحفظ في متصفحك فقط" autocomplete="off">
      </div>
      <button class="btn btn-primary" data-act="narrate"${b.notes.length ? '' : ' disabled'}>اطلب الصياغة</button>
    </div>
    ${llm.status ? `<p style="margin-block-start:12px;font-size:.85rem;color:${llm.ok ? 'var(--ink)' : 'var(--risk)'}">${esc(llm.status)}</p>` : ''}
    ${llm.narrative ? `<blockquote style="margin:12px 0 0;padding:13px;border-inline-start:3px solid var(--primary);background:var(--surface-alt);border-radius:var(--r-s);font-size:.9rem">${esc(llm.narrative)}</blockquote>
      <p class="muted" style="font-size:.75rem;margin-block-start:8px">صياغة مُتحقَّق منها: لا تحتوي رقمًا لم يحسبه المحرّك.</p>` : ''}
  </div>

  ${b.notes.length
    ? b.byReviewer.filter(r => r.notes.length).map(r => `
      <section class="section" style="margin-block-start:24px">
        <h2>${esc(r.name)} <span class="muted" style="font-size:.82rem;font-weight:400">— ${esc(r.focus)}</span></h2>
        <div class="grid" style="gap:12px">${r.notes.map(noteCard).join('')}</div>
      </section>`).join('')
    : `<div class="empty">لا ملاحظات على الملف الحالي.</div>`}`;
}

/* ── المعايير: المنطبق فقط ─────────────────────────────────────── */
export function standards(app) {
  const cites = app.computed.citations;
  return `
  ${head('المعايير', 'ما ينطبق على ملفك',
    'لا قائمة معايير للتصفّح. كل معيار هنا ظهر لأن حسابًا في ميزانك أو نتيجة من محرّكك استدعته — ومعه سبب الانطباق وتاريخ آخر تعديل.',
    tag(`${cites.length} معيار منطبق`, 'info'))}

  ${cites.length ? cites.map(c => `
    <article class="note" style="--tone:var(--s2);margin-block-end:11px">
      <div class="note-head">
        <b>${esc(c.code)} — ${esc(c.ar)}</b>
        ${tag(`${c.hits} إثارة`, 'info')}
      </div>
      <p><b>لماذا ظهر:</b> ${esc(c.why)}</p>
      <div class="note-basis"><span class="muted">أثاره</span><span style="text-align:end">${esc(c.triggers.slice(0, 4).join(' · '))}</span></div>
      <p style="font-size:.83rem"><b>آخر تعديل:</b> ${esc(c.lastUpdate)}</p>
      <p class="muted" style="font-size:.82rem">${esc(c.relation)}</p>
      <div class="cites">${cite(c)}
        <a class="cite" href="${esc(c.localSource)}" target="_blank" rel="noopener noreferrer">المصدر المحلي ↗</a></div>
    </article>`).join('')
    : `<div class="empty">استورد ميزانًا ليظهر ما ينطبق عليه.</div>`}

  <p class="muted" style="margin-block-start:20px;font-size:.82rem">
    تواريخ التعديلات مرجع عمل لا نص نظامي. الروابط الرسمية أعلاه هي المرجع النهائي.</p>`;
}

/* ── التقرير ───────────────────────────────────────────────────── */
export function report(app) {
  const { programme, result, board, entity, citations } = app.computed;
  const blocked = programme.rounds.filter(r => r.status !== 'open');

  return `
  ${head('التقرير', programme.reportable ? 'الارتباط جاهز' : 'الارتباط غير جاهز للتقرير',
    programme.reportable
      ? 'كل الجولات مفتوحة والاعتمادات موقّعة. هذا ملخص الملف للطباعة أو التصدير.'
      : 'التقرير لا يُصدر قبل فتح كل البوابات. هذه هي المتبقية.',
    tag(programme.reportable ? 'جاهز' : `${blocked.length} جولة متبقية`, programme.reportable ? 'ok' : 'risk'))}

  ${blocked.length ? `<section class="section" style="margin-block-start:0">
    <h2>ما يمنع الإصدار</h2>
    ${blocked.map(r => `<div class="gate" data-state="${r.status === 'pending_human' ? 'pending_human' : 'blocked'}" style="margin-block-end:8px">
      <div><b>${esc(r.id)} · ${esc(r.title)}</b>
      <p>${esc(r.gates.filter(g => g.state !== 'open').map(g => g.label).join(' · '))}</p></div></div>`).join('')}
  </section>` : ''}

  <section class="section">
    <h2>ملخص الملف</h2>
    <div class="grid g2">
      ${card('المنشأة', `
        <div class="meter-head"><span>الاسم</span><b>${esc(entity.name || '—')}</b></div>
        <div class="meter-head"><span>النشاط</span><b>${esc(entity.activity || '—')}</b></div>
        <div class="meter-head"><span>الفترة</span><b class="num">${esc(entity.periodStart || '—')} → ${esc(entity.periodEnd || '—')}</b></div>
        <div class="meter-head"><span>الإطار</span><b style="font-size:.84rem;text-align:end">${esc(entity.framework || '—')}</b></div>`)}
      ${card('الأرقام الحاكمة', `
        <div class="meter-head"><span>إجمالي الأصول</span><b class="num">${esc(money(result.statements.position.totalAssets.minor))}</b></div>
        <div class="meter-head"><span>صافي الربح</span><b class="num">${esc(money(result.statements.income.netProfit.minor))}</b></div>
        <div class="meter-head"><span>الأهمية النسبية الكلية</span><b class="num">${result.analysis.materiality.ok ? esc(money(result.analysis.materiality.overall.minor)) : '—'}</b></div>
        <div class="meter-head"><span>أهمية الأداء</span><b class="num">${result.analysis.materiality.ok ? esc(money(result.analysis.materiality.performance.minor)) : '—'}</b></div>
        <div class="meter-head"><span>التحريفات غير المصححة</span><b class="num">${result.misstatements ? esc(money(result.misstatements.uncorrectedTotal.minor)) : '—'}</b></div>`)}
    </div>
  </section>

  <section class="section">
    <h2>الملاحظات ذات الأولوية</h2>
    ${board.notes.filter(n => n.severity === 'high').length
      ? `<div class="grid" style="gap:12px">${board.notes.filter(n => n.severity === 'high').map(noteCard).join('')}</div>`
      : `<div class="empty">لا ملاحظات عالية الخطورة.</div>`}
  </section>

  <section class="section">
    <h2>المعايير المستشهد بها (${citations.length})</h2>
    ${table([
      { key: 'code', label: 'المعيار' },
      { key: 'ar', label: 'العنوان' },
      { key: 'lastUpdate', label: 'آخر تعديل' },
      { key: 'hits', label: 'الإثارات', n: true }
    ], citations)}
  </section>

  <div style="margin-block-start:24px;display:flex;gap:9px;flex-wrap:wrap">
    <button class="btn btn-ghost" data-act="print">طباعة الملف</button>
    <button class="btn btn-ghost" data-act="export">تصدير الارتباط (JSON)</button>
  </div>`;
}

export const VIEWS = { dashboard, rounds, decisions, data, analysis, statements, board, standards, report };
