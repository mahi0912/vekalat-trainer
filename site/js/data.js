/**
 * لایه داده — همه چیز از پوشه data/ می‌آید که scripts/build_data.py می‌سازد.
 *
 * questions.json  یک‌بار در شروع لود می‌شود (~۷۷۰KB) و برای کل مسیر آزمون کافی است.
 * review/<سال>.json  فقط وقتی نتیجه نمایش داده می‌شود، و فقط برای سال‌های همان جلسه.
 */

const cache = { questions: null, meta: null, review: new Map() };

async function getJSON(path) {
  const res = await fetch(path, { cache: 'default' });
  if (!res.ok) throw new Error(`دریافت ${path} ناموفق بود (${res.status})`);
  return res.json();
}

export async function questions() {
  cache.questions ??= await getJSON('data/questions.json');
  return cache.questions;
}

export async function meta() {
  cache.meta ??= await getJSON('data/meta.json');
  return cache.meta;
}

/**
 * تحلیل‌های حقوقی را می‌آورد و در یک نگاشت id → تحلیل ادغام می‌کند.
 * کلید هر فایل یا «۱۴۰۳» است (مرکز) یا «k۱۴۰۳» (کانون).
 */
export async function review(keys) {
  const wanted = [...new Set(keys)];
  await Promise.all(wanted.map(async k => {
    if (!cache.review.has(k)) cache.review.set(k, await getJSON(`data/review/${k}.json`));
  }));
  return Object.assign({}, ...wanted.map(y => cache.review.get(y)));
}
