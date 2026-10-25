/**
 * شبیه‌سازِ آزمون کانون وکلا.
 *
 * سؤالِ تازه نمی‌سازد — از همان ۷۵۱ سؤالِ واقعیِ هشت دورهٔ کانون، یک دفترچهٔ
 * تازه می‌چیند با همان ساختارِ آزمون واقعی: ۲۰ سؤال از هر درس، به همان
 * ترتیبِ دفترچه. سؤالِ ساختگی خطرِ کلیدِ غلط دارد؛ سؤالِ واقعی ندارد.
 */

/** ترتیب و سهمِ درس‌ها، دقیقاً مطابق دفترچهٔ کانون ۱۴۰۴. */
export const BLUEPRINT = [
  ['مدنی', 20],
  ['آیین دادرسی مدنی', 20],
  ['تجارت', 20],
  ['اصول استنباط و متون فقه', 20],
  ['جزا', 20],
  ['آیین دادرسی کیفری', 20],
  ['حقوق اساسی', 20],
];

/** ضرایب آزمون کانون ۱۴۰۵، طبق آگهی ثبت‌نام. */
export const WEIGHTS = {
  'مدنی': 3,
  'آیین دادرسی مدنی': 3,
  'تجارت': 2,
  'جزا': 2,
  'آیین دادرسی کیفری': 2,
  'اصول استنباط و متون فقه': 1,
  'حقوق اساسی': 1,
};

/** گزینه‌های مدت آزمون. ۱۳۵ دقیقه سابقهٔ کانون ۱۳۹۷ و ۱۵۰ دقیقه رویهٔ اخیر است. */
export const DURATIONS = [
  { min: 135, label: '۱۳۵ دقیقه — سابقهٔ کانون' },
  { min: 150, label: '۱۵۰ دقیقه — رویهٔ اخیر' },
  { min: 180, label: '۱۸۰ دقیقه — تمرین راحت' },
  { min: 0, label: 'بدون محدودیت' },
];

function shuffle(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/**
 * یک دفترچهٔ تازه می‌چیند.
 * @param pool  همهٔ سؤالات بانک
 * @param seen  شناسه‌هایی که در آزمون‌های پیشین آمده‌اند؛ تا جای ممکن کنار گذاشته می‌شوند
 */
export function paper(pool, seen = new Set()) {
  // فقط کانونِ واقعی: سال ۱۴۰۵ آزمون ارشد است و سبکش فرق دارد
  const kanoon = pool.filter(q => q.source === 'kanoon' && +q.year !== 1405);
  const out = [];
  const short = [];

  for (const [subject, n] of BLUEPRINT) {
    const mine = kanoon.filter(q => q.courseUnit === subject);
    const fresh = shuffle(mine.filter(q => !seen.has(q.id)));
    const used = shuffle(mine.filter(q => seen.has(q.id)));
    const picked = fresh.concat(used).slice(0, n);
    if (picked.length < n) short.push(`${subject} (${picked.length} از ${n})`);
    out.push(...picked);
  }
  return { qs: out, short };
}

/**
 * نمرهٔ وزنی: میانگینِ درصدِ خالصِ هر درس با ضریبِ خودش.
 * همان عددی که با حدنصابِ کانون مقایسه می‌شود.
 */
export function weighted(subjects) {
  let num = 0, den = 0;
  for (const u of subjects) {
    const w = WEIGHTS[u.name];
    if (!w) continue;
    num += (u.net || 0) * w;
    den += w;
  }
  return den ? num / den : 0;
}
