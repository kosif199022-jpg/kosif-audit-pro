/*
 * KOSIF — طبقة العرض الرقمية
 * تنسيق حتمي للأرقام والنقود والنِسب، بلا اعتماد على Intl حتى تتطابق
 * المخرجات حرفيًا بين Node والمتصفح و Workers.
 */

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';

/** يضيف فواصل الآلاف إلى سلسلة أرقام صحيحة (بدون إشارة). */
function groupThousands(digits) {
  let out = '';
  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ',';
    out += digits[i];
  }
  return out;
}

/**
 * يحوّل مبلغًا بوحدة minor (عدد صحيح كبير) إلى نص معروض.
 * @param {bigint|string|number} minor
 * @param {{exp?:number, currency?:string, sign?:boolean, arabicDigits?:boolean}} opts
 */
export function formatMinor(minor, opts = {}) {
  const exp = Number.isInteger(opts.exp) ? opts.exp : 2;
  let value = typeof minor === 'bigint' ? minor : BigInt(String(minor ?? '0').split('.')[0] || '0');
  const negative = value < 0n;
  if (negative) value = -value;
  const base = 10n ** BigInt(exp);
  const whole = (value / base).toString();
  const frac = exp > 0 ? (value % base).toString().padStart(exp, '0') : '';
  let text = groupThousands(whole) + (exp > 0 ? '.' + frac : '');
  if (negative) text = '-' + text;
  else if (opts.sign) text = '+' + text;
  if (opts.arabicDigits) text = toArabicDigits(text);
  return opts.currency ? `${text} ${opts.currency}` : text;
}

/** يحوّل الأرقام اللاتينية في نص إلى أرقام عربية-هندية. */
export function toArabicDigits(text) {
  return String(text).replace(/[0-9]/g, d => ARABIC_INDIC[Number(d)]);
}

/** نسبة مئوية بمنزلتين، حتمية، تتعامل مع القسمة على صفر. */
export function formatPercent(numerator, denominator, decimals = 2) {
  const n = Number(numerator);
  const d = Number(denominator);
  if (!isFinite(n) || !isFinite(d) || d === 0) return '—';
  return `${round(n / d * 100, decimals)}%`;
}

/** تقريب حتمي بعدد منازل ثابت (نصف لأعلى بعيدًا عن الصفر). */
export function round(value, decimals = 2) {
  const n = Number(value);
  if (!isFinite(n)) return 0;
  const factor = 10 ** decimals;
  const scaled = n * factor;
  const rounded = scaled < 0 ? -Math.round(-scaled) : Math.round(scaled);
  return rounded / factor;
}

/** عرض رقم عشوائي (نسبة/مضاعف) بمنازل ثابتة ودائمًا بنفس الشكل. */
export function formatNumber(value, decimals = 2) {
  const n = round(value, decimals);
  const negative = n < 0;
  const abs = Math.abs(n);
  const whole = Math.trunc(abs).toString();
  const frac = decimals > 0 ? (abs - Math.trunc(abs)).toFixed(decimals).slice(2) : '';
  const text = groupThousands(whole) + (decimals > 0 ? '.' + frac : '');
  return negative ? '-' + text : text;
}

/**
 * اختصار مبلغ كبير إلى رقم ووحدة منفصلين.
 * الفصل مقصود: الرقم يُعرض بخط أحادي واتجاه LTR، والوحدة نص عربي
 * عادي — دمجهما في سلسلة واحدة يكسر ترتيب العرض في سياق RTL.
 */
export function compactParts(minor, opts = {}) {
  const exp = Number.isInteger(opts.exp) ? opts.exp : 2;
  const value = Number(typeof minor === 'bigint' ? minor : BigInt(minor || 0)) / 10 ** exp;
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1e9) return { value: `${sign}${formatNumber(abs / 1e9, 2)}`, unit: 'مليار' };
  if (abs >= 1e6) return { value: `${sign}${formatNumber(abs / 1e6, 2)}`, unit: 'مليون' };
  if (abs >= 1e3) return { value: `${sign}${formatNumber(abs / 1e3, 1)}`, unit: 'ألف' };
  return { value: `${sign}${formatNumber(abs, 2)}`, unit: '' };
}

/** اختصار مبلغ كبير كسلسلة واحدة: ٢٫٤ مليون. */
export function compactMinor(minor, opts = {}) {
  const { value, unit } = compactParts(minor, opts);
  return unit ? `${value} ${unit}` : value;
}

/** تاريخ ISO ثابت من قيمة نصية، أو null إن كانت غير صالحة. */
export function isoDate(value) {
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}



