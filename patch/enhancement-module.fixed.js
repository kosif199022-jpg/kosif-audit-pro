/*
 * إصلاح: injectKosifV16 كان يحقن في المكان الخطأ.
 *
 * المشكلة — الملف frontend/index.html يحتوي وسمَي </head> اثنين:
 *   الأول  عند 36901   ← رأس الصفحة الحقيقي
 *   الثاني عند 274995  ← داخل نص JavaScript يبني مستند تقرير للطباعة:
 *                        `...</style></head><body>${rep}</body></html>`
 *
 * والدالة كانت تستعمل lastIndexOf('</head>')، فتصيب الثاني دائمًا —
 * أي أن أنماط v16 كانت تُحقن داخل سلسلة نصية في JS ولا تصل إلى الصفحة
 * إطلاقًا. تحقّقتُ من ذلك بفحص DOM الصفحة المُعاد بناؤها: الوسم
 * kosif-v16-css غير موجود، والأنماط الموجودة هي أنماط التطبيق فقط.
 *
 * الإصلاح — أول </head> للرأس، وآخر </body> للنهاية. (وسم </body>
 * الأخير كان صحيحًا أصلًا، فبقي كما هو.)
 *
 * التغيير محصور في موضع الحقن. لا سلوك آخر يتغيّر.
 */

export async function injectKosifV16(h, env) {
  if (h.includes('KOSIF_V16_FULL_SUITE_INLINE')) return h;

  const [css, js] = await Promise.all([
    env.DATA.get('kosif_enhancements_v16_css'),
    env.DATA.get('kosif_enhancements_v16_js'),
  ]);

  const head = '<style id="kosif-v16-css">' + (css || '') + '</style><!-- KOSIF_V16_FULL_SUITE_INLINE -->';
  const script = '<script id="kosif-v16-inline">' + (js || '') + '</script>';

  const low = h.toLowerCase();

  // أول </head> هو رأس المستند؛ ما بعده قد يكون داخل نص JS
  let p = low.indexOf('</head>');
  h = p >= 0 ? h.slice(0, p) + head + h.slice(p) : head + h;

  // آخر </body> هو نهاية المستند فعلًا
  p = h.toLowerCase().lastIndexOf('</body>');
  return p >= 0 ? h.slice(0, p) + script + h.slice(p) : h + script;
}

export async function handleKosifV16(req, env) {
  const u = new URL(req.url);
  if (u.pathname === '/kosif-v16.js') {
    const s = await env.DATA.get('kosif_enhancements_v16_js');
    return s == null ? new Response('not found', { status: 404 })
      : new Response(s, { headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store' } });
  }
  if (u.pathname === '/kosif-v16.css') {
    const s = await env.DATA.get('kosif_enhancements_v16_css');
    return s == null ? new Response('not found', { status: 404 })
      : new Response(s, { headers: { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'no-store' } });
  }
  // جديد: تقديم طبقة v17 كملف مستقل أيضًا
  if (u.pathname === '/kosif-v17.css') {
    const s = await env.DATA.get('kosif_enhancements_v17_css');
    return s == null ? new Response('not found', { status: 404 })
      : new Response(s, { headers: { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'no-store' } });
  }
  return null;
}
