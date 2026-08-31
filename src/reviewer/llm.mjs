/*
 * KOSIF — طبقة السرد الاختيارية
 *
 * المجلس الحتمي يعمل دائمًا وبلا مفتاح. هذه الطبقة اختيارية بالكامل
 * وتضيف صياغة سردية فوق ملاحظات موجودة أصلًا.
 *
 * الحدود المفروضة هنا ليست وعدًا في التوثيق بل قيدًا في الكود:
 *   - لا يُرسَل إلى النموذج إلا نص الملاحظات والأرقام التي حسبها المحرّك.
 *   - لا يُقبل من النموذج رقم: كل رد يُصفَّى ويُرفَض إن أدخل رقمًا جديدًا.
 *   - المفتاح يبقى في متصفح المستخدم، ولا يمر بأي خادم لنا، ولا يُكتب
 *     في أي ملف داخل المستودع.
 */

export const LLM_VERSION = '1.0.0';

export const PROVIDERS = Object.freeze({
  anthropic: {
    id: 'anthropic',
    label: 'Claude (Anthropic)',
    endpoint: 'https://api.anthropic.com/v1/messages',
    docs: 'https://console.anthropic.com/settings/keys',
    build: (key, prompt, model) => ({
      url: 'https://api.anthropic.com/v1/messages',
      init: {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: model || 'claude-sonnet-5',
          max_tokens: 900,
          system: SYSTEM,
          messages: [{ role: 'user', content: prompt }]
        })
      },
      extract: data => data?.content?.[0]?.text ?? ''
    })
  },
  gemini: {
    id: 'gemini',
    label: 'Gemini (Google)',
    endpoint: 'https://generativelanguage.googleapis.com',
    docs: 'https://aistudio.google.com/app/apikey',
    build: (key, prompt, model) => ({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.0-flash'}:generateContent?key=${encodeURIComponent(key)}`,
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        })
      },
      extract: data => data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    })
  }
});

const SYSTEM = [
  'أنت كاتب صياغة لمراجع حسابات محترف يكتب بالعربية الفصحى المهنية.',
  'مهمتك صياغة الملاحظات المعطاة لك في فقرة واحدة موجزة لملف المراجعة.',
  'قيود صارمة لا تُخالَف:',
  '- لا تُنشئ أي رقم جديد ولا تعدّل رقمًا معطى. استخدم الأرقام كما وردت حرفيًا أو لا تذكرها.',
  '- لا تُبدِ رأي المراجع ولا تقترح نوع التقرير.',
  '- لا تُضف معيارًا لم يُذكر في المدخل.',
  '- إن لم يكن لديك ما تضيفه فقل ذلك بجملة واحدة.'
].join('\n');

/** يبني المُدخل من ملاحظات المجلس — لا شيء غير ما حسبه المحرّك. */
export function buildPrompt(board, entity) {
  const lines = [
    `المنشأة: ${entity?.name || 'غير محددة'}`,
    `الفترة: ${entity?.periodStart || '—'} إلى ${entity?.periodEnd || '—'}`,
    '',
    'ملاحظات المجلس الحتمي:'
  ];
  for (const note of board.notes) {
    lines.push(`- [${note.severity}] ${note.title}`);
    lines.push(`  الأساس: ${note.basis.label} = ${note.basis.value}`);
    lines.push(`  المعايير: ${note.standards.map(s => s.code).join('، ') || 'لا يوجد'}`);
    lines.push(`  الإجراء: ${note.action}`);
  }
  lines.push('', 'اكتب فقرة واحدة (٤ إلى ٦ جمل) تلخّص هذه الملاحظات لملف المراجعة.');
  return lines.join('\n');
}

/** أرقام النص — تُستخدم للتحقق أن النموذج لم يخترع رقمًا. */
export function numbersIn(text) {
  return (String(text).match(/\d[\d,.٫٬]*/g) ?? [])
    // فواصل الآلاف لا تُعد اختلافًا، وعلامة نهاية الجملة ليست جزءًا من الرقم
    .map(n => n.replace(/[,٬]/g, '').replace(/[.٫]+$/, ''))
    .filter(n => n.length > 0);
}

/**
 * يرفض أي رقم في المخرَج لم يرد في المُدخل.
 * هذه هي نقطة الحراسة الفعلية: لا نثق بالنموذج، نتحقق منه.
 */
export function verifyNarrative(prompt, narrative) {
  const allowed = new Set(numbersIn(prompt));
  const produced = numbersIn(narrative);
  const invented = produced.filter(n => !allowed.has(n));
  return {
    ok: invented.length === 0,
    invented,
    reason: invented.length ? `النموذج أدخل أرقامًا غير موجودة في المدخل: ${invented.join('، ')}` : null
  };
}

/**
 * يطلب صياغة سردية. يُعيد دائمًا كائنًا — لا يرمي — حتى لا يُسقط فشل
 * الشبكة أو المفتاح شاشةً كاملة.
 */
export async function requestNarrative({ provider, apiKey, model, board, entity, fetchImpl }) {
  const spec = PROVIDERS[provider];
  if (!spec) return { ok: false, reason: 'مزوّد غير معروف.', narrative: null };
  if (!apiKey) return { ok: false, reason: 'لا مفتاح — المجلس الحتمي يعمل بدونه.', narrative: null };
  if (!board?.notes?.length) return { ok: false, reason: 'لا ملاحظات للصياغة.', narrative: null };

  const prompt = buildPrompt(board, entity);
  const { url, init, extract } = spec.build(apiKey, prompt, model);
  const doFetch = fetchImpl ?? globalThis.fetch;

  try {
    const response = await doFetch(url, init);
    if (!response.ok) {
      return { ok: false, reason: `المزوّد أعاد ${response.status}. تحقق من المفتاح.`, narrative: null };
    }
    const data = await response.json();
    const narrative = String(extract(data) ?? '').trim();
    if (!narrative) return { ok: false, reason: 'رد فارغ من المزوّد.', narrative: null };

    const check = verifyNarrative(prompt, narrative);
    if (!check.ok) return { ok: false, reason: check.reason, narrative: null, rejected: narrative };

    return { ok: true, narrative, provider, origin: 'llm-narrative', verified: true };
  } catch (error) {
    return { ok: false, reason: `تعذّر الاتصال: ${error.message}`, narrative: null };
  }
}
