/** کنترل‌گر اپ: بارگذاری داده، مسیریابی بین صفحه‌ها و رویدادها. */
import * as data from './data.js';
import * as session from './state.js';
import * as view from './views.js';
import * as mistakes from './mistakes.js';
import { COURSE_GROUPS } from './groups.js';
import { esc, fa, $, on, toTop, skeleton } from './util.js';

const app = $('#app');
const homeBtn = $('#homeBtn');

let byId = new Map();      // id → سؤال
let unitCounts = {};       // نام واحد → تعداد سؤال
let meta = null;
let s = null;              // جلسه جاری
let ticker = null;

const qsOf = sess => sess.qs.map(id => byId.get(id)).filter(Boolean);

/* ---------- زمان ---------- */

function elapsed(sess) {
  const sec = Math.floor(((sess.finishedAt || Date.now()) - sess.startedAt) / 1000);
  const p = n => fa(String(n).padStart(2, '0'));
  const h = Math.floor(sec / 3600);
  return (h ? `${p(h)}:` : '') + `${p(Math.floor(sec / 60) % 60)}:${p(sec % 60)}`;
}

function startTicker() {
  stopTicker();
  ticker = setInterval(() => {
    const el = document.getElementById('timer');
    if (el && s) el.textContent = `⏱ ${elapsed(s)}`;
    else stopTicker();
  }, 1000);
}
const stopTicker = () => { if (ticker) { clearInterval(ticker); ticker = null; } };

/* ---------- خانه ---------- */

function goHome() {
  stopTicker();
  s = null;
  homeBtn.classList.add('hidden');
  const saved = session.load();
  // جلسه تمام‌شده نگه داشته نمی‌شود، وگرنه رفرش دوباره به همان نتیجه برمی‌گردد
  if (saved && saved.finishedAt) session.clear();
  const resume = saved && !saved.finishedAt ? saved : null;

  app.innerHTML = view.home({ meta, unitCounts, resume, mistakes: mistakes.count() });
  on(app, '[data-year]', 'click', e => startYear(+e.currentTarget.dataset.year));
  on(app, '[data-subject]', 'click', e => showSubject(+e.currentTarget.dataset.subject));
  on(app, '[data-kyear]', 'click', e => {
    const y = +e.currentTarget.dataset.kyear;
    askCount(all().filter(q => q.source === 'kanoon' && +q.year === y).sort((a, b) => a.q - b.q),
             `کانون وکلا ${fa(y)}`, 'kanoon-year');
  });
  on(app, '[data-ksubject]', 'click', e =>
    showUnitYears(e.currentTarget.dataset.ksubject, true));
  if (resume) {
    $('#resumeBtn').addEventListener('click', () => { s = resume; renderExam(); });
    $('#dropBtn').addEventListener('click', () => { session.clear(); goHome(); });
  }
  if (mistakes.count()) {
    $('#mistakeBtn').addEventListener('click', startMistakes);
    $('#mistakeClear').addEventListener('click', () => {
      if (confirm('کل دفترچه اشتباهات پاک شود؟ این کار برگشت‌پذیر نیست.')) { mistakes.clear(); goHome(); }
    });
  }
  toTop();
}

function showSubject(gi) {
  homeBtn.classList.remove('hidden');
  app.innerHTML = view.subject(gi, unitCounts);
  $('#backHome').addEventListener('click', goHome);
  on(app, '[data-unit]', 'click', e =>
    showUnitYears(COURSE_GROUPS[gi][1][+e.currentTarget.dataset.unit], false, () => showSubject(gi)));
  toTop();
}

/**
 * صفحه دوره‌های یک درس. از اینجا یا همه سال‌ها با هم آزمون داده می‌شود
 * یا فقط یک دوره — همان دفترچه آن سال، به ترتیب.
 */
function showUnitYears(unit, kanoon, back) {
  const byYear = (kanoon ? meta.kanoon.unitYears : meta.unitYears)?.[unit] || {};
  const pool = () => all().filter(q => (q.source === 'kanoon') === kanoon && q.courseUnit === unit);
  const label = kanoon ? `${unit} — کانون` : unit;

  // اگر سال‌بندی در دست نبود، مثل قبل مستقیم برو سراغ انتخاب تعداد
  if (!Object.keys(byYear).length) {
    askCount(pool().sort((a, b) => (a.year - b.year) || (a.q - b.q)),
             label, kanoon ? 'kanoon-unit' : 'unit');
    return;
  }

  homeBtn.classList.remove('hidden');
  app.innerHTML = view.unitYears(label, byYear, back ? 'بازگشت به واحدها' : 'بازگشت به درس‌ها');
  $('#uyBack').addEventListener('click', back || goHome);
  on(app, '[data-uyear]', 'click', e => {
    const v = e.currentTarget.dataset.uyear;
    if (v === 'all') {
      askCount(pool().sort((a, b) => (a.year - b.year) || (a.q - b.q)),
               label, kanoon ? 'kanoon-unit' : 'unit');
    } else {
      const y = +v;
      askCount(pool().filter(q => +q.year === y).sort((a, b) => a.q - b.q),
               `${label} — ${fa(y)}`, kanoon ? 'kanoon-unit-year' : 'unit-year');
    }
  });
  toTop();
}

const all = () => [...byId.values()];

const startYear = y => askCount(
  all().filter(q => q.source !== 'kanoon' && +q.year === y).sort((a, b) => a.q - b.q),
  `آزمون جامع ${fa(y)}`, 'year');

/** سؤال‌های اشتباه‌زده‌شده، تازه‌ترین اول. */
function startMistakes() {
  const qs = mistakes.ids().map(id => byId.get(id)).filter(Boolean);
  if (!qs.length) { alert('دفترچه اشتباهات خالی است.'); return; }
  askCount(qs, 'تمرین اشتباهات', 'mistakes');
}

/** انتخاب تصادفی n عضو، بدون دست زدن به آرایه ورودی. */
function sample(arr, n) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

/**
 * صفحه انتخاب تعداد. اگر مجموعه ده سؤال یا کمتر داشته باشد
 * پرسیدن بی‌فایده است و مستقیم شروع می‌شود.
 */
function askCount(qs, title, mode) {
  if (!qs.length) { alert('برای این مجموعه سؤالی ثبت نشده است.'); return; }
  if (qs.length <= 10) { start(qs, title, mode); return; }

  homeBtn.classList.remove('hidden');
  app.innerHTML = view.picker(title, qs.length);
  let shuffle = false;
  const ordBook = $('#ordBook'), ordRand = $('#ordRand');
  const setOrder = rand => {
    shuffle = rand;
    ordBook.setAttribute('aria-pressed', String(!rand));
    ordRand.setAttribute('aria-pressed', String(rand));
  };
  ordBook.addEventListener('click', () => setOrder(false));
  ordRand.addEventListener('click', () => setOrder(true));
  $('#pickerBack').addEventListener('click', goHome);

  on(app, '[data-count]', 'click', e => {
    const n = +e.currentTarget.dataset.count;
    // برای زیرمجموعه، انتخاب تصادفی است تا هر بار تمرین تازه باشد
    let picked = n >= qs.length ? qs.slice() : sample(qs, n);
    if (!shuffle) picked.sort((a, b) => (a.year - b.year) || (a.q - b.q));
    else picked = sample(picked, picked.length);
    start(picked, n >= qs.length ? title : `${title} — ${fa(n)} سؤال`, mode);
  });
  toTop();
}

function start(qs, title, mode) {
  if (!qs.length) { alert('برای این واحد سؤالی ثبت نشده است.'); return; }
  s = session.create(qs, title, mode);
  session.save(s);
  homeBtn.classList.remove('hidden');
  renderExam();
}

/* ---------- آزمون ---------- */

function renderExam() {
  const qs = qsOf(s);
  const q = qs[s.i];
  app.innerHTML = view.exam(q, {
    index: s.i,
    total: qs.length,
    picked: s.ans[q.id] || 0,
    flagged: !!s.flags[q.id],
    answered: Object.keys(s.ans).length,
    elapsed: elapsed(s),
  });
  // شناسه برای به‌روزرسانی ثانیه‌ای بدون رندر دوباره کل صفحه
  app.querySelector('.qhead .pill:last-child').id = 'timer';

  on(app, '[data-pick]', 'click', e => {
    const pick = +e.currentTarget.dataset.pick;
    if (s.ans[q.id] === pick) delete s.ans[q.id]; else s.ans[q.id] = pick;
    persistAndRender();
  });
  $('#flagBtn').addEventListener('click', () => {
    if (s.flags[q.id]) delete s.flags[q.id]; else s.flags[q.id] = 1;
    persistAndRender();
  });
  $('#clearBtn').addEventListener('click', () => { delete s.ans[q.id]; persistAndRender(); });
  $('#prevBtn').addEventListener('click', () => move(-1));
  $('#nextBtn').addEventListener('click', () => move(1));
  $('#finishBtn').addEventListener('click', finish);
  $('#mapBtn').addEventListener('click', toggleMap);

  startTicker();
  toTop();
}

const persistAndRender = () => { session.save(s); renderExam(); };

function move(step) {
  const n = s.qs.length;
  const next = s.i + step;
  if (next < 0 || next >= n) return;
  s.i = next;
  persistAndRender();
}

function toggleMap() {
  const card = $('#navigatorCard');
  card.hidden = !card.hidden;
  if (card.hidden) return;
  $('#navGrid').innerHTML = view.navGrid(qsOf(s), s);
  on(app, '[data-go]', 'click', e => { s.i = +e.currentTarget.dataset.go; persistAndRender(); });
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function finish() {
  const left = s.qs.length - Object.keys(s.ans).length;
  const msg = left
    ? `${fa(left)} سؤال بی‌پاسخ مانده است. آزمون تمام شود؟`
    : 'آزمون تمام شود و تحلیل نمایش داده شود؟';
  if (!confirm(msg)) return;
  s.finishedAt = Date.now();
  session.save(s);
  renderResults();
}

/* ---------- نتیجه ---------- */

async function renderResults() {
  stopTicker();
  const qs = qsOf(s);
  const sc = session.score(qs, s.ans);
  // ثبت در دفترچه اشتباهات: غلط‌ها اضافه، درست‌ها حذف. بی‌پاسخ‌ها دست‌نخورده.
  const md = mistakes.apply(qs, s.ans, session.keyOf);
  app.innerHTML = view.results(sc, s.title, md);
  $('#resultHome').addEventListener('click', () => { session.clear(); goHome(); });
  toTop();

  const list = $('#reviewList');
  list.innerHTML = skeleton(6);

  let analyses;
  try {
    analyses = await data.review(qs.map(q => q.year));
  } catch (err) {
    list.innerHTML = `<div class="card"><div class="warning">بارگذاری تحلیل‌ها ناموزن بود: ${esc(err.message)}</div></div>`;
    return;
  }

  const filters = {
    all: () => true,
    wrong: q => s.ans[q.id] && +s.ans[q.id] !== session.keyOf(q),
    blank: q => !s.ans[q.id],
    flag: q => !!s.flags[q.id],
  };

  const draw = key => {
    const shown = qs.filter(filters[key]);
    list.innerHTML = shown.length
      ? shown.map(q => view.reviewCard(q, s.ans[q.id] || 0, analyses[q.id])).join('')
      : '<div class="card"><p class="muted" style="margin:0">سؤالی در این دسته نیست.</p></div>';
  };

  on(app, '#reviewTabs button', 'click', e => {
    app.querySelectorAll('#reviewTabs button')
       .forEach(b => b.setAttribute('aria-selected', String(b === e.currentTarget)));
    draw(e.currentTarget.dataset.filter);
  });
  draw('all');
}

/* ---------- میان‌بر صفحه‌کلید ---------- */

document.addEventListener('keydown', e => {
  if (!s || s.finishedAt || e.metaKey || e.ctrlKey || e.altKey) return;
  if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
  const q = qsOf(s)[s.i];
  if (e.key >= '1' && e.key <= '4') {
    const pick = +e.key;
    if (s.ans[q.id] === pick) delete s.ans[q.id]; else s.ans[q.id] = pick;
    persistAndRender();
  } else if (e.key === 'ArrowLeft') { move(1); }   // چیدمان راست‌به‌چپ: چپ یعنی جلو
  else if (e.key === 'ArrowRight') { move(-1); }
  else if (e.key.toLowerCase() === 'f') {
    if (s.flags[q.id]) delete s.flags[q.id]; else s.flags[q.id] = 1;
    persistAndRender();
  } else return;
  e.preventDefault();
});

/* ---------- پوسته روشن/تیره ---------- */

const THEME_KEY = 'vekalat.theme';
function applyTheme(mode) {
  if (mode) document.documentElement.setAttribute('data-theme', mode);
  else document.documentElement.removeAttribute('data-theme');
  $('#themeBtn').textContent = mode === 'dark' ? '☀️' : mode === 'light' ? '🌙' : '🌗';
}
$('#themeBtn').addEventListener('click', () => {
  const order = [null, 'light', 'dark'];
  const now = document.documentElement.getAttribute('data-theme');
  const next = order[(order.indexOf(now) + 1) % order.length];
  try { next ? localStorage.setItem(THEME_KEY, next) : localStorage.removeItem(THEME_KEY); } catch (_) {}
  applyTheme(next);
});
try { applyTheme(localStorage.getItem(THEME_KEY)); } catch (_) { applyTheme(null); }

/* ---------- راه‌اندازی ---------- */

homeBtn.addEventListener('click', goHome);

export async function boot() {
  app.innerHTML = skeleton(5);
  try {
    const [qs, m] = await Promise.all([data.questions(), data.meta()]);
    byId = new Map(qs.map(q => [q.id, q]));
    meta = m;
    unitCounts = m.units;
  } catch (err) {
    app.innerHTML = `<div class="card"><div class="warning">بارگذاری بانک سؤال ناموفق بود: ${esc(err.message)}</div></div>`;
    return;
  }

  const saved = session.load();
  if (saved && saved.qs.every(id => byId.has(id))) {
    s = saved;
    homeBtn.classList.remove('hidden');
    if (saved.finishedAt) { renderResults(); return; }
  }
  goHome();
}
