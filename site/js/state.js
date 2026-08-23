/**
 * وضعیت جلسه آزمون + ذخیره‌سازی محلی + نمره‌دهی.
 *
 * جلسه در localStorage نگه داشته می‌شود، پس بستن یا رفرش صفحه پاسخ‌ها را از بین نمی‌برد.
 */

const KEY = 'vekalat.session.v1';

/**
 * ضریب نمره منفی آزمون مرکز وکلا: هر سه پاسخ غلط، یک پاسخ صحیح را خنثی می‌کند.
 * اگر آیین‌نامه تغییر کرد فقط همین عدد را عوض کنید.
 */
export const PENALTY = 1 / 3;

export function create(qs, title, mode) {
  return { qs: qs.map(q => q.id), title, mode, i: 0, ans: {}, flags: {}, startedAt: Date.now() };
}

export function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) { /* حالت خصوصی مرورگر */ }
}

export function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) { return null; }
}

export function clear() {
  try { localStorage.removeItem(KEY); } catch (_) { /* بی‌اهمیت */ }
}

/**
 * نمره‌دهی جلسه.
 * raw      درصد خام: صحیح ÷ کل
 * net      درصد با نمره منفی: (صحیح − غلط×۱/۳) ÷ کل — می‌تواند منفی شود
 * units    عملکرد به تفکیک واحد درسی، برای نقاط قوت و ضعف
 */
export function score(qs, ans) {
  let correct = 0, wrong = 0, blank = 0;
  const units = new Map();

  for (const q of qs) {
    const picked = ans[q.id];
    const bucket = units.get(q.courseUnit)
      || units.set(q.courseUnit, { unit: q.courseUnit, total: 0, correct: 0, wrong: 0, blank: 0 }).get(q.courseUnit);
    bucket.total++;

    if (!picked) { blank++; bucket.blank++; }
    else if (+picked === +q.answer) { correct++; bucket.correct++; }
    else { wrong++; bucket.wrong++; }
  }

  const total = qs.length || 1;
  const raw = correct / total * 100;
  const net = (correct - wrong * PENALTY) / total * 100;

  for (const u of units.values()) u.rate = u.total ? u.correct / u.total * 100 : 0;

  return { correct, wrong, blank, total: qs.length, raw, net, units: [...units.values()] };
}

/**
 * نقاط قوت و ضعف.
 * واحدهایی با کمتر از `min` سؤال کنار گذاشته می‌شوند چون نمونه‌شان برای قضاوت کافی نیست.
 */
export function insights(units, min = 3) {
  const solid = units.filter(u => u.total >= min).sort((a, b) => b.rate - a.rate);
  const thin = units.filter(u => u.total < min);
  return {
    strengths: solid.filter(u => u.rate >= 60).slice(0, 4),
    weaknesses: solid.filter(u => u.rate < 60).reverse().slice(0, 4),
    ranked: solid,
    thin,
  };
}
