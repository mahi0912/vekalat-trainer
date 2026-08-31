/**
 * دفترچه اشتباهات: سؤال‌هایی که غلط زده‌ای، برای تمرین دوباره.
 *
 * جدا از جلسه آزمون ذخیره می‌شود تا با تمام شدن یا پاک کردن جلسه از بین نرود.
 * شکل داده:  { "1402-25": { wrong: 2, lastPick: 3, at: 1735… } }
 */

const KEY = 'vekalat.mistakes.v1';

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) { return {}; }
}

function write(m) {
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (_) { /* حالت خصوصی مرورگر */ }
}

/** شناسه‌های ثبت‌شده، تازه‌ترین اشتباه اول. */
export function ids() {
  const m = read();
  return Object.keys(m).sort((a, b) => (m[b].at || 0) - (m[a].at || 0));
}

export const count = () => ids().length;

export const has = id => Object.prototype.hasOwnProperty.call(read(), id);

/** یک اشتباه تازه ثبت می‌کند و شمارنده‌اش را بالا می‌برد. */
export function add(id, pick) {
  const m = read();
  const prev = m[id] || { wrong: 0 };
  m[id] = { wrong: prev.wrong + 1, lastPick: pick || 0, at: Date.now() };
  write(m);
}

/** وقتی سؤال درست زده شد از دفترچه بیرون می‌رود. */
export function remove(id) {
  const m = read();
  if (id in m) { delete m[id]; write(m); return true; }
  return false;
}

export function clear() {
  try { localStorage.removeItem(KEY); } catch (_) { /* بی‌اهمیت */ }
}

/**
 * نتیجه یک جلسه را در دفترچه اعمال می‌کند:
 * غلط‌ها اضافه می‌شوند و درست‌ها (اگر قبلاً ثبت شده بودند) حذف.
 * بی‌پاسخ‌ها دست نخورده می‌مانند — نزدنِ سؤال، اشتباه به حساب نمی‌آید.
 * خروجی: تعداد افزوده و حذف‌شده، برای نمایش به کاربر.
 */
export function apply(qs, ans, keyOf) {
  let added = 0, cleared = 0;
  for (const q of qs) {
    const picked = ans[q.id];
    if (!picked) continue;
    if (+picked === keyOf(q)) { if (remove(q.id)) cleared++; }
    else { add(q.id, +picked); added++; }
  }
  return { added, cleared };
}
