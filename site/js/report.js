/**
 * گزارشِ متنیِ پایان آزمون — جمع‌وجور، برای کپی‌کردن و فرستادن.
 *
 * عمداً ساده و خط‌به‌خط است تا هم آدم بخواندش و هم ماشین بتواند تجزیه‌اش کند:
 * هر غلط یک خط است با شناسهٔ سؤال، درس، گزینهٔ انتخابی، کلید، و اینکه
 * چند آزمون پیش‌تر هم همین سؤال غلط زده شده.
 */

import { keyOf, subjectOf } from './state.js';

const FA_D = '۰۱۲۳۴۵۶۷۸۹';
const fa = v => String(v).replace(/\d/g, d => FA_D[+d]);
const pct = n => fa((Math.round(n * 10) / 10).toFixed(1));

/** تاریخ شمسی کوتاه، بدون وابستگی به کتابخانه. */
function stamp(ms) {
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian',
      { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
  } catch (_) { return ''; }
}

function clock(ms) {
  const sec = Math.floor(ms / 1000);
  const p = n => fa(String(n).padStart(2, '0'));
  return `${p(Math.floor(sec / 3600))}:${p(Math.floor(sec / 60) % 60)}:${p(sec % 60)}`;
}

/**
 * متن گزارش.
 * @param qs      سؤالات همین جلسه
 * @param s       جلسه (برای پاسخ‌ها، نشان‌ها و زمان)
 * @param sc      خروجی score()
 * @param ms      زمان سپری‌شده به میلی‌ثانیه
 * @param rep     نگاشت شناسه → تعداد دفعاتِ غلط در آزمون‌های پیشین
 */
export function build(qs, s, sc, ms, rep = {}) {
  const L = [];
  L.push('#گزارش‌آزمون ۱');
  L.push(`عنوان: ${s.title}`);
  L.push(`تاریخ: ${stamp(s.finishedAt || Date.now())} · زمان: ${clock(ms)}`);
  L.push(`کل ${fa(sc.total)} | درست ${fa(sc.correct)} | غلط ${fa(sc.wrong)} | نزده ${fa(sc.blank)}`);
  L.push(`خام ${pct(sc.raw)}٪ | خالص ${pct(sc.net)}٪`);

  L.push('');
  L.push('[درس‌ها] درس | درست/غلط/نزده | خالص');
  for (const u of sc.subjects) {
    L.push(`${u.name} | ${fa(u.correct)}/${fa(u.wrong)}/${fa(u.blank)} | ${pct(u.net)}٪`);
  }

  const wrong = qs.filter(q => s.ans[q.id] && +s.ans[q.id] !== keyOf(q));
  L.push('');
  L.push(`[غلط‌ها] شناسه | درس | زدم←کلید | تکرار`);
  if (!wrong.length) L.push('—');
  for (const q of wrong) {
    const again = rep[q.id] ? ` | ×${fa(rep[q.id] + 1)}` : '';
    L.push(`${q.id} | ${subjectOf(q.courseUnit)} | ${fa(s.ans[q.id])}←${fa(keyOf(q))}${again}`);
  }

  const flagged = qs.filter(q => s.flags[q.id] && !s.ans[q.id]);
  if (flagged.length) {
    L.push('');
    L.push('[نشان‌دارِ نزده]');
    for (const q of flagged) L.push(`${q.id} | ${subjectOf(q.courseUnit)}`);
  }

  L.push('');
  L.push('—— این گزارش را برای کلود بفرست تا الگوی اشتباه‌ها را دربیاورد.');
  return L.join('\n');
}

/** همان داده، برای ذخیره در تاریخچه. */
export function entry(qs, s, sc, ms) {
  return {
    at: s.finishedAt || Date.now(),
    title: s.title,
    ms,
    total: sc.total, correct: sc.correct, wrong: sc.wrong, blank: sc.blank,
    raw: sc.raw, net: sc.net,
    subjects: sc.subjects.map(u => ({
      name: u.name, total: u.total, correct: u.correct, wrong: u.wrong, blank: u.blank, net: u.net,
    })),
    wrong: qs.filter(q => s.ans[q.id] && +s.ans[q.id] !== keyOf(q))
      .map(q => ({ id: q.id, pick: +s.ans[q.id], key: keyOf(q), subject: subjectOf(q.courseUnit) })),
  };
}
