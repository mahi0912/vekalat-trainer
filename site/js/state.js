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

/**
 * کلید ملاکِ نمره‌دهی: پاسخ صحیح بر مبنای قانون امروز.
 * اگر تحلیل بازنویسی‌شده نشان داده باشد که قانون تغییر کرده، answerToday
 * روی سؤال نشسته است؛ در غیر این صورت همان کلید دفترچه ملاک است.
 */
export const keyOf = q => +(q.answerToday ?? q.answer);

export function create(qs, title, mode) {
  return {
    qs: qs.map(q => q.id), title, mode, i: 0, ans: {}, flags: {},
    startedAt: Date.now(), pausedMs: 0, pausedAt: 0,
  };
}

/* ---------- توقف و ادامه ---------- */

export const isPaused = s => !!(s && s.pausedAt);

/** ساعت را نگه می‌دارد. لحظهٔ توقف ثبت می‌شود تا بعداً از زمان کسر شود. */
export function pause(s) {
  if (s && !s.pausedAt) s.pausedAt = Date.now();
}

/** ساعت را راه می‌اندازد و مدت توقف را روی جمعِ توقف‌ها می‌افزاید. */
export function resume(s) {
  if (s && s.pausedAt) {
    s.pausedMs = (s.pausedMs || 0) + (Date.now() - s.pausedAt);
    s.pausedAt = 0;
  }
}

/** زمان سپری‌شده به میلی‌ثانیه، بدون مدتی که آزمون متوقف بوده. */
export function elapsedMs(s) {
  if (!s) return 0;
  const end = s.finishedAt || s.pausedAt || Date.now();
  return Math.max(0, end - s.startedAt - (s.pausedMs || 0));
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
 * نام درس از روی واحد درسی: «مدنی ۳ — قواعد عمومی قراردادها» → «مدنی».
 * بانک کانون خودش نام درس را در courseUnit دارد، پس بی‌تغییر می‌ماند.
 */
export const subjectOf = unit =>
  String(unit || '—').split('—')[0].trim().replace(/\s+[۱-۸]$/, '');

/**
 * نمره‌دهی جلسه.
 * raw       درصد خام: صحیح ÷ کل
 * net       درصد با نمره منفی: (صحیح − غلط×۱/۳) ÷ کل — می‌تواند منفی شود
 * units     عملکرد به تفکیک واحد درسی، برای نقاط قوت و ضعف
 * subjects  کارنامهٔ درس‌به‌درس، هر درس با درصد خام و درصد خالص
 */
export function score(qs, ans) {
  let correct = 0, wrong = 0, blank = 0;
  const units = new Map();
  const subjects = new Map();

  let lawChanged = 0;

  for (const q of qs) {
    const picked = ans[q.id];
    const key = keyOf(q);
    if (q.answerToday != null && +q.answerToday !== +q.answer) lawChanged++;
    const bucket = units.get(q.courseUnit)
      || units.set(q.courseUnit, { unit: q.courseUnit, total: 0, correct: 0, wrong: 0, blank: 0 }).get(q.courseUnit);
    bucket.total++;

    const sname = subjectOf(q.courseUnit);
    const sub = subjects.get(sname)
      || subjects.set(sname, { name: sname, total: 0, correct: 0, wrong: 0, blank: 0 }).get(sname);
    sub.total++;

    if (!picked) { blank++; bucket.blank++; sub.blank++; }
    else if (+picked === key) { correct++; bucket.correct++; sub.correct++; }
    else { wrong++; bucket.wrong++; sub.wrong++; }
  }

  const total = qs.length || 1;
  const raw = correct / total * 100;
  const net = (correct - wrong * PENALTY) / total * 100;

  for (const u of units.values()) u.rate = u.total ? u.correct / u.total * 100 : 0;
  // کارنامهٔ درس‌به‌درس: درصد خام و درصد پس از کسر نمرهٔ منفی
  for (const u of subjects.values()) {
    u.rate = u.total ? u.correct / u.total * 100 : 0;
    u.net = u.total ? (u.correct - u.wrong * PENALTY) / u.total * 100 : 0;
  }
  const bySubject = [...subjects.values()].sort((a, b) => b.total - a.total);

  return {
    correct, wrong, blank, total: qs.length, raw, net, lawChanged,
    units: [...units.values()], subjects: bySubject,
  };
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
