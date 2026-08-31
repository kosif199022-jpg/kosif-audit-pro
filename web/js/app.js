/*
 * KOSIF Audit Pro — القشرة
 *
 * حالة واحدة (الارتباط) + دالة اشتقاق نقية + إعادة رسم. لا إطار عمل،
 * ولا خطوة بناء: المتصفح يستورد وحدات ESM من src/ مباشرة، فما تختبره
 * الاختبارات في Node هو نفسه ما يعمل في المتصفح.
 */

import {
  demoEngagement, emptyEngagement, computeEngagement,
  serializeEngagement, deserializeEngagement, requestNarrative
} from '../../src/index.mjs';
import { VIEWS } from './views.js';

const KEY_STATE = 'kosif.audit.engagement';
const KEY_THEME = 'kosif.audit.theme';
const KEY_LLM = 'kosif.audit.llm';

const ROUTES = {
  '': 'dashboard', '#/': 'dashboard', '#/rounds': 'rounds', '#/decisions': 'decisions',
  '#/data': 'data', '#/analysis': 'analysis', '#/statements': 'statements',
  '#/board': 'board', '#/standards': 'standards', '#/report': 'report'
};

const NAV = [
  { route: '#/', label: 'لوحة الارتباط' },
  { route: '#/data', label: 'البيانات' },
  { route: '#/rounds', label: 'الجولات' },
  { route: '#/decisions', label: 'القرارات' },
  { route: '#/analysis', label: 'التحليل' },
  { route: '#/statements', label: 'القوائم' },
  { route: '#/board', label: 'المجلس' },
  { route: '#/standards', label: 'المعايير' },
  { route: '#/report', label: 'التقرير' }
];

const TITLES = Object.fromEntries(NAV.map(n => [ROUTES[n.route], n.label]));

const app = {
  state: null,
  computed: null,
  view: 'dashboard',
  expandedRound: null,
  llm: { provider: 'anthropic', apiKey: '', narrative: null, status: '', ok: false }
};

/* ── التخزين ───────────────────────────────────────────────────── */
const save = () => { try { localStorage.setItem(KEY_STATE, serializeEngagement(app.state)); } catch { /* محجوب */ } };
const saveLlm = () => { try { localStorage.setItem(KEY_LLM, JSON.stringify({ provider: app.llm.provider, apiKey: app.llm.apiKey })); } catch { /* محجوب */ } };

function load() {
  try {
    const raw = localStorage.getItem(KEY_STATE);
    if (raw) return deserializeEngagement(raw);
  } catch { /* ملف تالف أو تخزين محجوب — نبدأ من التجريبي */ }
  return demoEngagement();
}

function loadLlm() {
  try {
    const raw = localStorage.getItem(KEY_LLM);
    if (raw) Object.assign(app.llm, JSON.parse(raw));
  } catch { /* محجوب */ }
}

/* ── الاشتقاق ──────────────────────────────────────────────────── */
function recompute() {
  try {
    app.computed = computeEngagement(app.state);
    return true;
  } catch (error) {
    toast(`تعذّر الحساب: ${error.message}`);
    return false;
  }
}

/* ── الرسم ─────────────────────────────────────────────────────── */
/**
 * المسار من الـ hash. أي hash ليس مسارًا (مثل #view الذي يضعه رابط
 * التخطي) لا يُعد تنقّلًا: يبقى المستخدم في شاشته بدل أن يُقذف إلى
 * اللوحة لأنه استعمل رابط الوصولية.
 */
function routeOf() {
  const hash = location.hash;
  if (hash.startsWith('#/rounds/')) { app.expandedRound = hash.split('/')[2]; return 'rounds'; }
  if (hash in ROUTES) return ROUTES[hash];
  if (!hash.startsWith('#/')) return app.view ?? 'dashboard';
  return 'dashboard';
}

function renderRail() {
  const { programme, nextAction } = app.computed;
  document.querySelector('.track-main i').dataset.w = String(programme.progressPct);
  // الرقم وحده داخل .num (LTR)؛ الكلمة العربية خارجه، وإلا انقلب الترتيب
  document.getElementById('progress-text').textContent = `${programme.gatesOpen}/${programme.gatesTotal}`;
  document.getElementById('progress-pct').textContent = `${programme.progressPct}%`;

  document.getElementById('next-card').innerHTML = `
    <span class="kicker">${{ gate: 'بوابة متوقفة', human: 'ينتظر قرارك', complete: 'مكتمل' }[nextAction.kind]}</span>
    <b>${escapeText(nextAction.title)}</b>
    <p>${escapeText(nextAction.detail)}</p>
    <a href="${escapeText(nextAction.route)}">انتقل ←</a>`;

  const counts = {
    rounds: `${programme.roundsOpen}/${programme.roundsTotal}`,
    board: String(app.computed.board.notes.length),
    standards: String(app.computed.citations.length),
    data: String(app.computed.result.trialBalance.rows.length)
  };
  document.querySelectorAll('.nav a').forEach(link => {
    const view = ROUTES[link.getAttribute('href')];
    if (view === app.view) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
    const slot = link.querySelector('.count');
    if (slot) slot.textContent = counts[view] ?? '';
  });
}

function escapeText(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function render() {
  const view = VIEWS[app.view] ?? VIEWS.dashboard;
  const host = document.getElementById('view');
  host.innerHTML = `<div class="view">${view(app)}</div>`;
  document.title = `${TITLES[app.view] ?? 'KOSIF'} · KOSIF Audit Pro`;
  renderRail();
  animate(host);
}

/** يحرّك الأشرطة والحلقات بعد الرسم؛ يتخطى الحركة عند طلب التقليل. */
function animate(scope) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const apply = () => {
    document.querySelectorAll('.track i[data-w]').forEach(el => { el.style.width = `${el.dataset.w}%`; });
    scope.querySelectorAll('.bar-pair i[data-h]').forEach(el => { el.style.height = `${el.dataset.h}%`; });
    scope.querySelectorAll('.gauge .fg[data-v]').forEach(el => {
      const c = 2 * Math.PI * Number(el.getAttribute('r'));
      el.style.strokeDasharray = String(c);
      el.style.strokeDashoffset = String(c * (1 - Number(el.dataset.v) / 100));
    });
  };
  if (reduce) apply(); else requestAnimationFrame(() => requestAnimationFrame(apply));
}

function navigate() {
  const next = routeOf();
  // hash غير تنقّلي (رابط التخطي) — لا نعيد الرسم ولا نفقد موضع القراءة
  if (next === app.view && document.getElementById('view').childElementCount) return;
  app.view = next;
  render();
  window.scrollTo({ top: 0 });
}

/* ── تنبيه ─────────────────────────────────────────────────────── */
let toastTimer;
function toast(message) {
  const node = document.getElementById('toast');
  node.textContent = message;
  node.dataset.open = 'true';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.dataset.open = 'false'; }, 2800);
}

/* ── السمة ─────────────────────────────────────────────────────── */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'night' ? '#0c1210' : '#f7f5f0');
  document.getElementById('theme-label').textContent = theme === 'night' ? 'الوضع النهاري' : 'الوضع الليلي';
}

/* ── التفاعلات ─────────────────────────────────────────────────── */
function bind() {
  document.addEventListener('click', async event => {
    const roundBtn = event.target.closest('[data-round]');
    if (roundBtn) {
      const id = roundBtn.dataset.round;
      app.expandedRound = app.expandedRound === id ? null : id;
      render();
      return;
    }

    const trigger = event.target.closest('[data-act]');
    if (!trigger) return;
    const act = trigger.dataset.act;

    if (act === 'import') {
      const box = document.getElementById('tb-input');
      if (box) app.state.trialBalanceText = box.value;
      if (recompute()) { save(); render(); toast(`تم الاستيراد: ${app.computed.result.trialBalance.rows.length} حساب`); }
    }
    if (act === 'pick-file') document.getElementById('tb-file')?.click();
    if (act === 'print') window.print();
    if (act === 'theme') {
      const next = document.documentElement.dataset.theme === 'night' ? 'day' : 'night';
      applyTheme(next);
      try { localStorage.setItem(KEY_THEME, next); } catch { /* محجوب */ }
      render();
    }
    if (act === 'demo') { app.state = demoEngagement(); recompute(); save(); render(); toast('تم تحميل الارتباط التجريبي.'); }
    if (act === 'reset') {
      if (!confirm('سيُمسح الارتباط الحالي بالكامل ولا يمكن التراجع. هل تريد المتابعة؟')) return;
      app.state = emptyEngagement(); recompute(); save(); render(); toast('ارتباط جديد فارغ.');
    }
    if (act === 'export') {
      const blob = new Blob([serializeEngagement(app.state)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kosif-engagement-${(app.state.entity.name || 'engagement').replace(/\s+/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('صُدِّر ملف الارتباط.');
    }
    if (act === 'narrate') {
      app.llm.provider = document.getElementById('llm-provider').value;
      app.llm.apiKey = document.getElementById('llm-key').value;
      saveLlm();
      app.llm.status = 'جارٍ الطلب…'; app.llm.ok = true; render();
      const outcome = await requestNarrative({
        provider: app.llm.provider, apiKey: app.llm.apiKey,
        board: app.computed.board, entity: app.state.entity
      });
      app.llm.ok = outcome.ok;
      app.llm.status = outcome.ok ? 'صياغة مُتحقَّق منها.' : outcome.reason;
      app.llm.narrative = outcome.narrative;
      render();
    }
  });

  document.addEventListener('change', async event => {
    const target = event.target;

    if (target.id === 'tb-file' && target.files?.[0]) {
      app.state.trialBalanceText = await target.files[0].text();
      if (recompute()) { save(); render(); toast(`استُورد ${target.files[0].name}`); }
      return;
    }
    if (target.dataset.decision) {
      const key = target.dataset.decision;
      if (['name', 'activity', 'framework', 'periodStart', 'periodEnd'].includes(key)) app.state.entity[key] = target.value;
      else app.state.decisions[key] = target.value;
      recompute(); save(); renderRail();
      return;
    }
    if (target.dataset.signoff) {
      const key = target.dataset.signoff;
      app.state.signOffs[key] = target.value.trim() ? { by: target.value.trim() } : undefined;
      recompute(); save(); renderRail();
    }
  });

  window.addEventListener('hashchange', navigate);
}

/* ── الإقلاع ───────────────────────────────────────────────────── */
function boot() {
  let theme = 'day';
  try { theme = localStorage.getItem(KEY_THEME) || 'day'; } catch { /* محجوب */ }
  applyTheme(theme);

  loadLlm();
  app.state = load();
  if (!recompute()) return;

  document.querySelector('.nav').innerHTML = NAV.map(item =>
    `<a href="${item.route}"><span class="dot"></span>${item.label}<span class="count"></span></a>`).join('');

  bind();
  navigate();
}

try {
  boot();
} catch (error) {
  document.getElementById('view').innerHTML =
    `<div class="empty"><b>تعذّر الإقلاع</b><p>${escapeText(error.message)}</p></div>`;
}
