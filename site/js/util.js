/** ابزارهای مشترک رابط کاربری. */

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** خنثی‌سازی HTML — تمام متن‌های بانک سؤال باید از این عبور کنند. */
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** تبدیل ارقام لاتین به فارسی برای نمایش. */
export const fa = v => String(v).replace(/\d/g, d => FA_DIGITS[+d]);

/** درصد با یک رقم اعشار، بدون صفر اضافه. */
export const pct = n => fa((Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, '')).replace('.', '٫');

export const $ = sel => document.querySelector(sel);

export const on = (root, sel, ev, fn) =>
  root.querySelectorAll(sel).forEach(el => el.addEventListener(ev, fn));

export const toTop = () => window.scrollTo({ top: 0, behavior: 'instant' });

/** اسکلت بارگذاری تا رسیدن داده. */
export const skeleton = (rows = 4) =>
  `<div class="card">${'<div class="skeleton"></div>'.repeat(rows)}</div>`;
