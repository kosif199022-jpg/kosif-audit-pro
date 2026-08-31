/*
 * KOSIF Audit Pro — الاختبارات
 * تغطي: اللون، الاستيراد، القوائم، التحليل، الجولات، المعايير، المجلس،
 * الحارس على النموذج اللغوي، والحتمية.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DAY, NIGHT, auditTheme, contrast, SERIES_DAY, SERIES_NIGHT, SERIES_BIRDS, CONTRACTS,
  parseTrialBalance, buildStatements, analyze, auditSample,
  STANDARDS, REPORTING_STANDARDS, AUDITING_STANDARDS, getStandard, searchStandards,
  standardsForAccount, standardsForFinding, citationsForEngagement,
  ROUNDS, GATE, evaluateProgramme,
  runBoard, REVIEWERS,
  verifyNarrative, buildPrompt, PROVIDERS,
  demoEngagement, emptyEngagement, computeEngagement, serializeEngagement, deserializeEngagement,
  DEMO_TRIAL_BALANCE
} from '../src/index.mjs';

/* ── اللون ─────────────────────────────────────────────────────── */
test('كل زوج لون في الوضعين يجتاز عتبة التباين المعلنة', () => {
  for (const [theme, name] of [[DAY, 'نهاري'], [NIGHT, 'ليلي']]) {
    for (const row of auditTheme(theme, name)) {
      assert.ok(row.pass, `${name}: ${row.fg} على ${row.bg} = ${row.ratio} < ${row.min} (${row.use})`);
    }
  }
});

test('ألوان المخططات ستة، من ستة طيور، ومختلفة في الوضعين', () => {
  assert.equal(SERIES_DAY.length, 6);
  assert.equal(SERIES_NIGHT.length, 6);
  assert.equal(SERIES_BIRDS.length, 6);
  assert.equal(new Set(SERIES_DAY).size, 6, 'لا تكرار في ألوان النهار');
  assert.equal(new Set(SERIES_NIGHT).size, 6, 'لا تكرار في ألوان الليل');
  for (const entry of SERIES_BIRDS) {
    assert.match(entry.day, /^#[0-9a-f]{6}$/i);
    assert.match(entry.night, /^#[0-9a-f]{6}$/i);
    assert.ok(entry.bird.length > 2, 'كل لون يذكر الطائر الذي اشتُق منه');
  }
});

test('كل لون مخطط يتباين مع سطحه بما لا يقل عن 3:1', () => {
  for (const c of SERIES_DAY) assert.ok(contrast(c, DAY.surface) >= 3, `${c} على سطح النهار = ${contrast(c, DAY.surface)}`);
  for (const c of SERIES_NIGHT) assert.ok(contrast(c, NIGHT.surface) >= 3, `${c} على سطح الليل = ${contrast(c, NIGHT.surface)}`);
});

test('عقود التباين تغطي النص والعناصر والحدود', () => {
  assert.ok(CONTRACTS.length >= 10);
  assert.ok(CONTRACTS.some(c => c.min >= 4.5), 'يوجد عقد نص عادي');
});

/* ── المعايير ──────────────────────────────────────────────────── */
test('الفهرس يضم معايير التقرير والمراجعة، ولكل معيار تعديل ومصدر', () => {
  assert.equal(REPORTING_STANDARDS.length, 26);
  assert.ok(AUDITING_STANDARDS.length >= 14);
  assert.equal(STANDARDS.length, REPORTING_STANDARDS.length + AUDITING_STANDARDS.length);
  for (const s of STANDARDS) {
    assert.ok(s.lastUpdate, `${s.code} بلا تاريخ تعديل`);
    assert.match(s.source, /^https:\/\//, `${s.code} بلا مصدر رسمي`);
    assert.ok(s.ar && s.en, `${s.code} بلا عنوان مزدوج`);
  }
  assert.equal(new Set(STANDARDS.map(s => s.code)).size, STANDARDS.length, 'أكواد المعايير فريدة');
});

test('البحث والاسترجاع يعملان', () => {
  assert.equal(getStandard('ISA 530').framework, 'isa');
  assert.equal(getStandard('لا-يوجد'), null);
  assert.ok(searchStandards('مخزون').some(s => s.code === 'IAS 2'));
});

test('كل معيار مراجعة مذكور في الجولات موجود في الفهرس', () => {
  const cited = new Set(ROUNDS.flatMap(r => r.standards));
  for (const code of cited) assert.ok(getStandard(code), `الجولات تستشهد بمعيار غير موجود: ${code}`);
});

/* ── الربط ─────────────────────────────────────────────────────── */
test('الربط يستدعي المعيار من الحساب ومن النتيجة معًا', () => {
  const receivable = standardsForAccount({ code: '1120', name: 'ذمم مدينة' });
  assert.ok(receivable.some(c => c.code === 'IFRS 9'));
  assert.ok(receivable.every(c => c.why && c.lastUpdate && c.source), 'كل استشهاد يحمل سببًا وتاريخًا ومصدرًا');

  const byName = standardsForAccount({ code: 'ZZ', name: 'جاري الشريك' });
  assert.ok(byName.some(c => c.code === 'IAS 24'));

  const finding = standardsForFinding({ code: 'OUT_OF_BALANCE', title: 'غير متوازن' });
  assert.ok(finding.some(c => c.code === 'IAS 1'));
  assert.deepEqual(standardsForFinding({ code: 'UNKNOWN_CODE' }), []);
});

test('استشهادات الارتباط مرتّبة بعدد الإثارة لا أبجديًا', () => {
  const cites = citationsForEngagement({
    accounts: [{ code: '1120', name: 'ذمم' }, { code: '1130', name: 'ذمم أخرى' }, { code: '4010', name: 'مبيعات' }],
    findings: []
  });
  assert.ok(cites.length > 0);
  for (let i = 1; i < cites.length; i += 1) assert.ok(cites[i - 1].hits >= cites[i].hits);
});

/* ── الجولات ───────────────────────────────────────────────────── */
test('البرنامج عشر جولات بترتيب وبوابات', () => {
  assert.equal(ROUNDS.length, 10);
  ROUNDS.forEach((r, i) => {
    assert.equal(r.order, i + 1);
    assert.ok(r.gates.length >= 2, `${r.id} يحتاج بوابتين على الأقل`);
    assert.ok(r.standards.length >= 1);
  });
  assert.equal(new Set(ROUNDS.map(r => r.id)).size, 10);
});

test('ارتباط فارغ يوقف كل شيء ويشير إلى A01', () => {
  const p = evaluateProgramme({});
  assert.equal(p.reportable, false);
  assert.equal(p.nextRound.id, 'A01');
  assert.ok(p.progressPct < 20);
});

test('البوابات البشرية لا تفتحها البيانات مهما اكتملت', () => {
  const state = demoEngagement();
  state.decisions = {
    materialityBasisReason: 'x', revenueFraudResponse: 'x', significantRisks: [{ id: 1 }],
    controlsReliance: 'substantive', managementBias: 'x', goingConcern: 'x',
    subsequentEventsThrough: '2027-02-01', uncorrectedResponse: 'x', opinion: 'غير معدّل'
  };
  state.evidence = { items: [], controlTests: [] };
  const p = evaluateProgramme({ entity: state.entity, result: computeEngagement(state).result, decisions: state.decisions, evidence: state.evidence, signOffs: {} });
  const a01 = p.rounds.find(r => r.id === 'A01');
  const independence = a01.gates.find(g => g.id === 'independence');
  assert.equal(independence.state, GATE.PENDING_HUMAN, 'الاستقلال لا يفتحه المحرّك');
  assert.equal(p.reportable, false, 'لا تقرير بلا اعتماد بشري');
});

test('التوقيع البشري يفتح البوابة التي كانت تنتظره', () => {
  const state = demoEngagement();
  const before = computeEngagement(state);
  const a01Before = before.programme.rounds.find(r => r.id === 'A01');
  assert.notEqual(a01Before.status, GATE.OPEN);

  state.signOffs = { independence: { by: 'محمود الدسوقي' } };
  const after = computeEngagement(state);
  const a01After = after.programme.rounds.find(r => r.id === 'A01');
  assert.equal(a01After.status, GATE.OPEN);
});

test('بوابة أدلة العيّنة تُغلق حتى يُربط كل بند بدليل', () => {
  const state = demoEngagement();
  const computed = computeEngagement(state);
  const a06 = computed.programme.rounds.find(r => r.id === 'A06');
  const gate = a06.gates.find(g => g.id === 'evidence-linked');
  assert.equal(gate.state, GATE.BLOCKED);

  state.evidence.items = computed.result.sample.selected.map(item => ({ account: item.code, ref: 'EV-' + item.code }));
  const after = computeEngagement(state);
  const gateAfter = after.programme.rounds.find(r => r.id === 'A06').gates.find(g => g.id === 'evidence-linked');
  assert.equal(gateAfter.state, GATE.OPEN);
});

/* ── المجلس ────────────────────────────────────────────────────── */
test('كل ملاحظة تحمل رقمًا وإجراءً وجولة، ولا تدّعي رأيًا', () => {
  const computed = computeEngagement(demoEngagement());
  const board = computed.board;
  assert.equal(REVIEWERS.length, 3);
  assert.ok(board.notes.length > 0);
  for (const note of board.notes) {
    assert.ok(note.basis?.label && note.basis?.value !== undefined, `${note.title} بلا أساس رقمي`);
    assert.ok(note.action, `${note.title} بلا إجراء`);
    assert.ok(ROUNDS.some(r => r.id === note.round), `${note.title} يشير إلى جولة غير موجودة`);
    assert.equal(note.origin, 'deterministic');
    assert.ok(['high', 'medium', 'low'].includes(note.severity));
  }
  assert.match(board.boundary, /لا يصدر رأيًا/);
});

test('المجلس حتمي: نفس المدخلات تعطي نفس الملاحظات بنفس الترتيب', () => {
  const a = computeEngagement(demoEngagement()).board;
  const b = computeEngagement(demoEngagement()).board;
  assert.deepEqual(a.notes.map(n => n.title), b.notes.map(n => n.title));
});

test('ميزان غير متوازن يرفع ملاحظة عالية الخطورة مربوطة بمعيار', () => {
  const state = demoEngagement();
  state.trialBalanceText = 'كود,اسم,مدين,دائن\n1010,نقد,900000,0\n2010,دائن,0,100000';
  const board = computeEngagement(state).board;
  const note = board.notes.find(n => n.title.includes('غير متوازن'));
  assert.ok(note, 'يجب أن تُرصد ملاحظة عدم التوازن');
  assert.equal(note.severity, 'high');
  assert.ok(note.standards.length > 0, 'الملاحظة يجب أن تستشهد بمعيار');
});

/* ── حارس النموذج اللغوي ───────────────────────────────────────── */
test('الحارس يرفض أي رقم لم يرد في المدخل ويقبل الأمين', () => {
  assert.equal(verifyNarrative('الفرق 1500 والمخصص 200', 'بلغ الفرق 1500 والمخصص 200.').ok, true);
  const bad = verifyNarrative('الفرق 1500', 'بلغ الفرق 1500 والمخصص 9999.');
  assert.equal(bad.ok, false);
  assert.ok(bad.invented.includes('9999'));
  assert.equal(verifyNarrative('الفرق 1,500', 'الفرق 1500.').ok, true, 'الفواصل لا تُعد اختلافًا');
});

test('المُدخل لا يحمل إلا ما حسبه المحرّك، والمزوّدون معرّفون', () => {
  const computed = computeEngagement(demoEngagement());
  const prompt = buildPrompt(computed.board, computed.entity);
  assert.ok(prompt.includes('ملاحظات المجلس الحتمي'));
  for (const note of computed.board.notes) assert.ok(prompt.includes(note.title));
  assert.ok(Object.keys(PROVIDERS).length >= 2);
  for (const p of Object.values(PROVIDERS)) assert.equal(typeof p.build, 'function');
});

/* ── الارتباط ──────────────────────────────────────────────────── */
test('الارتباط التجريبي متوازن ومتسق ويتقدّم فعليًا', () => {
  const c = computeEngagement(demoEngagement());
  assert.equal(c.result.trialBalance.balanced, true);
  assert.equal(c.result.statements.articulation.articulated, true);
  assert.ok(c.programme.progressPct > 30, 'التجريبي يجب أن يبدأ بعمل حقيقي لا بصفر');
  assert.ok(c.programme.progressPct < 100, 'ويجب أن يبقى فيه ما يُعمل');
  assert.ok(c.citations.length > 5);
  assert.ok(c.nextAction.title);
});

test('الارتباط الفارغ لا ينهار ويشير إلى أول خطوة', () => {
  const c = computeEngagement(emptyEngagement());
  assert.equal(c.result.trialBalance.ok, false);
  assert.equal(c.programme.reportable, false);
  assert.equal(c.nextAction.round, 'A01');
});

test('الاشتقاق حتمي بالكامل', () => {
  const s = demoEngagement();
  const one = JSON.stringify(computeEngagement(s), (_k, v) => (typeof v === 'bigint' ? v.toString() : v));
  const two = JSON.stringify(computeEngagement(s), (_k, v) => (typeof v === 'bigint' ? v.toString() : v));
  assert.equal(one, two);
});

test('الحفظ والاستعادة يحفظان الحالة كما هي', () => {
  const s = demoEngagement();
  s.signOffs = { independence: { by: 'اسم' } };
  const restored = deserializeEngagement(serializeEngagement(s));
  assert.equal(serializeEngagement(restored), serializeEngagement(s));
  assert.equal(restored.signOffs.independence.by, 'اسم');
});

test('ملف محفوظ ناقص لا يكسر الاستعادة', () => {
  const restored = deserializeEngagement('{"entity":{"name":"منشأة قديمة"}}');
  assert.equal(restored.entity.name, 'منشأة قديمة');
  assert.equal(restored.entity.currency, 'ر.س', 'الحقول الناقصة تأخذ الافتراضي');
  assert.deepEqual(restored.evidence.items, []);
  assert.ok(restored.options.sample.size > 0);
});

/* ── المحرّك الحتمي ────────────────────────────────────────────── */
test('العيّنة حتمية بالبذرة وحسّاسة لها', () => {
  const tb = parseTrialBalance(DEMO_TRIAL_BALANCE);
  const a = auditSample(tb, { size: 6, seed: 'alpha' });
  const b = auditSample(tb, { size: 6, seed: 'alpha' });
  const c = auditSample(tb, { size: 6, seed: 'beta' });
  assert.deepEqual(a.selected.map(x => x.code), b.selected.map(x => x.code));
  assert.notDeepEqual(a.selected.map(x => x.code), c.selected.map(x => x.code));
});

test('القوائم تتسق والأرقام تُحسب بأعداد صحيحة', () => {
  const tb = parseTrialBalance(DEMO_TRIAL_BALANCE);
  const st = buildStatements(tb);
  assert.equal(typeof st.position.totalAssets.minor, 'bigint');
  assert.equal(st.position.totalAssets.minor, st.position.totalLiabilities.minor + st.position.totalEquity.minor);
  const an = analyze(tb, st);
  assert.equal(an.materiality.ok, true);
  assert.equal(an.risk.signals.reduce((n, s) => n + s.weightPct, 0), 100);
});
