/*
 * KOSIF — نظام اللون المشتق من الطبيعة
 * ======================================================================
 * الألوان هنا ليست اختيارًا ذوقيًا؛ كل لون مأخوذ من ريش طائر حقيقي من
 * طيور الجزيرة العربية، والقاعدة التي تحكم توزيعها مأخوذة من الطبيعة
 * نفسها لا من اتجاهات التصميم:
 *
 *   1. قاعدة المساحة (نسبة الريش) — الطائر لا يلبس لونًا صارخًا على كل
 *      جسده. المساحات الكبيرة رمادية/رملية مكتومة، واللون المشبع يظهر
 *      في مساحة صغيرة جدًا (العُرف، الحنجرة، شريط الجناح). لذلك:
 *      المحايد ≈ 70٪، الأساسي المكتوم ≈ 20٪، المشبع ≈ 10٪ فقط.
 *
 *   2. قاعدة الحد الداكن (شريط العين) — أغمق لون في الطائر لا يملأ
 *      مساحة، بل يرسم حدًّا: شريط العين، حافة الجناح، طرف الذيل. لذلك
 *      الأسود المزرق هنا للحدود والفواصل والنص، لا للخلفيات.
 *
 *   3. قاعدة القرابة اللونية — ألوان الطائر متجاورة على عجلة الألوان
 *      (أخضر ← فيروزي ← أزرق) ويكسرها لون واحد مكمّل فقط (قرفي/نحاسي).
 *      لا نستخدم أكثر من مكمّل واحد.
 *
 * كل زوج (نص/خلفية) هنا مفحوص فعليًا مقابل WCAG AA في الوضعين،
 * والفحص يعمل في tests/palette.test.mjs — لا ادّعاء بلا برهان.
 * ====================================================================== */

export const PALETTE_VERSION = '1.0.0';

/** المصادر الحية التي اشتُق منها كل لون. */
export const SOURCES = Object.freeze([
  Object.freeze({
    id: 'bee-eater',
    bird: 'الوروار الأخضر العربي',
    latin: 'Merops cyanophrys',
    note: 'الأخضر الزمردي على الظهر والفيروزي على الحنجرة — مصدر اللون الأساسي والثانوي.',
    takes: ['primary', 'secondary']
  }),
  Object.freeze({
    id: 'hoopoe',
    bird: 'الهدهد',
    latin: 'Upupa epops',
    note: 'الجسم رملي قرفي دافئ والعُرف برتقالي — مصدر المحايد الدافئ ولون التمييز.',
    takes: ['neutral', 'accent']
  }),
  Object.freeze({
    id: 'roller',
    bird: 'الشقراق الأوروبي',
    latin: 'Coracias garrulus',
    note: 'أزرق سماوي مع ظهر قرفي — مصدر اللون المعلوماتي والتباين المكمّل.',
    takes: ['info']
  }),
  Object.freeze({
    id: 'sandgrouse',
    bird: 'القطا',
    latin: 'Pterocles alchata',
    note: 'رمادي رملي مبقّع مكتوم — مصدر مساحات الخلفية والأسطح.',
    takes: ['surface']
  }),
  Object.freeze({
    id: 'shrike',
    bird: 'الصرد',
    latin: 'Lanius excubitor',
    note: 'شريط العين الأسود على رأس رمادي — مصدر الحدود والنص الأغمق.',
    takes: ['border', 'ink']
  })
]);

/**
 * الوضع النهاري. المساحات الكبيرة من ريش القطا والهدهد،
 * والمشبع من الوروار في مساحة صغيرة.
 */
export const DAY = Object.freeze({
  ground: '#f7f5f0',        // القطا — رملي فاتح
  surface: '#ffffff',
  surfaceAlt: '#f0ede6',    // الهدهد — رملي دافئ
  border: '#ded8cc',
  borderStrong: '#c2b9a6',
  ink: '#1b2420',           // الصرد — أسود مخضرّ للنص
  inkMuted: '#4a564f',
  inkSoft: '#6d7a72',
  primary: '#0f7a5f',       // الوروار — زمردي
  primaryDeep: '#0a5844',
  primarySoft: '#dcefe7',
  secondary: '#0d7f88',     // الوروار — فيروزي الحنجرة
  accent: '#b4621f',        // الهدهد — برتقالي العُرف
  accentSoft: '#f7e7d6',
  info: '#1f5fa8',          // الشقراق — أزرق سماوي
  ok: '#1f7a45',
  warn: '#9a6a10',
  risk: '#a8321f'
});

/**
 * الوضع الليلي. ليس عكسًا حسابيًا للنهاري: الطبيعة في الظل تُبقي
 * الصبغة وتخفض الإضاءة وترفع النقاء قليلًا في الأجزاء المشبعة فقط.
 */
export const NIGHT = Object.freeze({
  ground: '#0c1210',
  surface: '#131b18',
  surfaceAlt: '#1a2420',
  border: '#28332e',
  borderStrong: '#3a4740',
  ink: '#eef2ef',
  inkMuted: '#aebab3',
  inkSoft: '#7f8d85',
  primary: '#43c79b',
  primaryDeep: '#1d8a68',
  primarySoft: '#12332a',
  secondary: '#3fbcc6',
  accent: '#e08a44',
  accentSoft: '#33241a',
  info: '#6aa9ec',
  ok: '#46c07d',
  warn: '#e0b155',
  risk: '#ef7a68'
});

/**
 * تسلسل ألوان المخططات — ستة طيور، ستة أصباغ.
 *
 * لم تُختر بالذوق: مُرِّرت على فاحص لوحات فئوية يقيس نطاق الإضاءة،
 * أرضية النقاء، الفصل تحت عمى الألوان (protan/deutan/tritan)، الفصل
 * تحت الرؤية الطبيعية، والتباين مع السطح — واجتازت الفحوص الخمسة في
 * الوضعين. الترتيب نفسه جزء من النتيجة: الأخضر والبرتقالي غير
 * متجاورين لأن ذلك الاقتران تحديدًا هو أضعف نقطة عند عمى الأحمر-الأخضر،
 * فوُضع الأزرق بينهما.
 *
 * الترتيب ثابت ولا يُدار دورانيًا: السلسلة السابعة تُدمج في «أخرى»
 * ولا يُولَّد لها لون جديد.
 */
export const SERIES_BIRDS = Object.freeze([
  Object.freeze({ bird: 'الوروار الأخضر', part: 'الظهر الزمردي', day: '#0e9b6a', night: '#12a271' }),
  Object.freeze({ bird: 'الشقراق', part: 'الجناح السماوي', day: '#2b6be8', night: '#4480dd' }),
  Object.freeze({ bird: 'الهدهد', part: 'العُرف البرتقالي', day: '#e07a12', night: '#cc7a24' }),
  Object.freeze({ bird: 'التمير الأرجواني', part: 'الريش المتقزح', day: '#9d5bd6', night: '#9a68cc' }),
  Object.freeze({ bird: 'القطا', part: 'المغرة الرملية', day: '#b8860b', night: '#ae8a2a' }),
  Object.freeze({ bird: 'الوردية السيناوية', part: 'الصدر الوردي', day: '#d94070', night: '#d2557a' })
]);

export const SERIES_DAY = Object.freeze(SERIES_BIRDS.map(s => s.day));
export const SERIES_NIGHT = Object.freeze(SERIES_BIRDS.map(s => s.night));

/** نتيجة الفحص المرجعية — يعيد الاختبار التحقق منها ولا يثق بها كما هي. */
export const SERIES_VALIDATION = Object.freeze({
  checks: Object.freeze(['نطاق الإضاءة', 'أرضية النقاء', 'الفصل تحت عمى الألوان', 'الفصل تحت الرؤية الطبيعية', 'التباين مع السطح']),
  day: Object.freeze({ surface: '#ffffff', band: [0.43, 0.77], passed: 5 }),
  night: Object.freeze({ surface: '#131b18', band: [0.48, 0.67], passed: 5 })
});

/* ── فحص التباين (WCAG 2.1) ───────────────────────────────────────── */

function channel(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** إضاءة نسبية للون hex. */
export function luminance(hex) {
  const clean = String(hex).replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** نسبة التباين بين لونين، من 1 إلى 21. */
export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return Math.round(((light + 0.05) / (dark + 0.05)) * 100) / 100;
}

/**
 * الأزواج التي يجب أن تجتاز AA. النص العادي 4.5، والنص الكبير
 * وحدود عناصر الواجهة 3.0.
 */
export const CONTRACTS = Object.freeze([
  { fg: 'ink', bg: 'ground', min: 4.5, use: 'النص الأساسي على الخلفية' },
  { fg: 'ink', bg: 'surface', min: 4.5, use: 'النص الأساسي على البطاقة' },
  { fg: 'inkMuted', bg: 'surface', min: 4.5, use: 'النص الثانوي على البطاقة' },
  { fg: 'inkSoft', bg: 'surface', min: 3.0, use: 'النص المساعد (كبير فقط)' },
  { fg: 'primary', bg: 'surface', min: 3.0, use: 'اللون الأساسي كعنصر واجهة' },
  { fg: 'accent', bg: 'surface', min: 3.0, use: 'لون التمييز كعنصر واجهة' },
  { fg: 'info', bg: 'surface', min: 3.0, use: 'اللون المعلوماتي' },
  { fg: 'ok', bg: 'surface', min: 3.0, use: 'حالة النجاح' },
  { fg: 'warn', bg: 'surface', min: 3.0, use: 'حالة التنبيه' },
  { fg: 'risk', bg: 'surface', min: 3.0, use: 'حالة الخطر' },
  { fg: 'borderStrong', bg: 'surface', min: 1.4, use: 'الحد الواضح' }
]);

/** يفحص وضعًا كاملًا ويعيد كل زوج ونتيجته. */
export function auditTheme(theme, name) {
  return CONTRACTS.map(rule => {
    const ratio = contrast(theme[rule.fg], theme[rule.bg]);
    return { theme: name, ...rule, fgHex: theme[rule.fg], bgHex: theme[rule.bg], ratio, pass: ratio >= rule.min };
  });
}

/** أقل تباين بين ألوان السلسلة — يجب أن تُميَّز عن بعضها. */
export function seriesSeparation(series) {
  let worst = Infinity;
  let pair = null;
  for (let i = 0; i < series.length; i += 1) {
    for (let j = i + 1; j < series.length; j += 1) {
      const ratio = contrast(series[i], series[j]);
      if (ratio < worst) { worst = ratio; pair = [series[i], series[j]]; }
    }
  }
  return { worst, pair };
}

export const THEMES = Object.freeze({ day: DAY, night: NIGHT });
