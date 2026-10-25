/**
 * تاریخچهٔ آزمون‌های تمام‌شده.
 *
 * برای دو کار است: کارنامهٔ هر آزمون بعداً هم در دسترس باشد، و بشود دید
 * یک اشتباه در آزمون‌های بعدی تکرار شده یا نه.
 * جدا از جلسهٔ جاری ذخیره می‌شود تا با پاک شدن جلسه از بین نرود.
 */

const KEY = 'vekalat.history.v1';
const CAP = 40;

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (_) { return []; }
}

function write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, CAP))); } catch (_) { /* حالت خصوصی */ }
}

/** تازه‌ترین آزمون اول. */
export const all = () => read();

export const count = () => read().length;

/** یک کارنامه را ثبت می‌کند و خودش را برمی‌گرداند. */
export function push(entry) {
  const list = read();
  list.unshift(entry);
  write(list);
  return entry;
}

export function clear() {
  try { localStorage.removeItem(KEY); } catch (_) { /* بی‌اهمیت */ }
}

/**
 * شناسه‌هایی که در آزمون‌های پیشین هم غلط زده شده‌اند، با تعداد دفعات.
 * برای علامت‌زدن «این اشتباه را قبلاً هم داشتی» در گزارش.
 */
export function repeatedWrong() {
  const n = {};
  for (const h of read()) for (const w of (h.wrong || [])) n[w.id] = (n[w.id] || 0) + 1;
  return n;
}
