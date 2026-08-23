/** کنترل‌گر اپ: بارگذاری داده، مسیریابی بین صفحه‌ها و رویدادها. */
import * as data from './data.js';
import * as session from './state.js';
import * as view from './views.js';
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

  app.innerHTML = view.home({ meta, unitCounts, resume });
  on(app, '[data-year]', 'click', e => startYear(+e.currentTarget.dataset.year));
  on(app, '[data-subject]', 'click', e => showSubject(+e.currentTarget.dataset.subject));
  if (resume) {
    $('#resumeBtn').addEventListener('click', () => { s = resume; renderExam(); });
    $('#dropBtn').addEventListener('click', () => { session.clear(); goHome(); });
  }
  toTop();
}

function showSubject(gi) {
  homeBtn.classList.remove('hidden');
  app.innerHTML = view.subject(gi, unitCounts);
  $('#backHome').addEventListener('click', goHome);
  on(app, '[data-unit]', 'click', e => {
    const unit = COURSE_GROUPS[gi][1][+e.currentTarget.dataset.unit];
    start(all().filter(q => q.courseUnit === unit)
            .sort((a, b) => (a.year - b.year) || (a.q - b.q)), unit, 'unit');
  });
  toTop();
}

const all = () => [...byId.values()];

const startYear = y => start(
  all().filter(q => +q.year === y).sort((a, b) => a.q - b.q),
  `آزمون جامع ${fa(y)}`, 'year');

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
  app.innerHTML = view.results(sc, s.title);
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
