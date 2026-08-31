/*
 * تقرير اللون: يعيد فحص كل عقود التباين في الوضعين ويطبع النتيجة.
 * يفشل بخروج غير صفري إن سقط أي عقد — فاللون هنا عقد لا ذوق.
 */
import { DAY, NIGHT, auditTheme, contrast, SERIES_DAY, SERIES_NIGHT, SERIES_BIRDS } from '../src/palette.mjs';

let failures = 0;
for (const [theme, name, surface] of [[DAY, 'نهاري', DAY.surface], [NIGHT, 'ليلي', NIGHT.surface]]) {
  console.log(`\n── الوضع ال${name} ──`);
  for (const row of auditTheme(theme, name)) {
    const mark = row.pass ? '✓' : '✗';
    if (!row.pass) failures += 1;
    console.log(`  ${mark} ${row.ratio.toString().padStart(6)} (≥${row.min})  ${row.use}`);
  }
  const series = name === 'نهاري' ? SERIES_DAY : SERIES_NIGHT;
  for (const [i, colour] of series.entries()) {
    const ratio = contrast(colour, surface);
    const mark = ratio >= 3 ? '✓' : '✗';
    if (ratio < 3) failures += 1;
    console.log(`  ${mark} ${ratio.toString().padStart(6)} (≥3)    مخطط ${i + 1} — ${SERIES_BIRDS[i].bird} (${SERIES_BIRDS[i].part})`);
  }
}
console.log(failures === 0 ? '\nكل عقود اللون سليمة.' : `\n${failures} عقد لون ساقط.`);
process.exit(failures === 0 ? 0 : 1);
