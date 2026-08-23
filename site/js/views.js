/** ساخت HTML صفحه‌ها. هیچ نمایی مستقیماً به داده دست نمی‌زند؛ همه چیز پارامتر می‌گیرد. */
import { esc, fa, pct } from './util.js';
import { COURSE_GROUPS, YEARS } from './groups.js';
import { insights, PENALTY } from './state.js';

/* ---------- خانه ---------- */

export function home({ meta, unitCounts, resume }) {
  const years = YEARS.map(y =>
    `<button type="button" class="btn" data-year="${y}">
       <span class="unit">آزمون جامع ${fa(y)}</span>
       <span class="count">${fa(meta.years[y] || 0)} سؤال</span>
     </button>`).join('');

  const subjects = COURSE_GROUPS.map(([name, units], gi) => {
    const total = units.reduce((s, u) => s + (unitCounts[u] || 0), 0);
    return `<button type="button" class="btn" data-subject="${gi}">
              <span class="unit">${esc(name)}</span>
              <span class="count">${fa(total)} سؤال — ${fa(units.length)} واحد</span>
            </button>`;
  }).join('');

  const resumeCard = resume ? `
    <div class="card">
      <h2>ادامه آزمون نیمه‌تمام</h2>
      <p class="muted" style="margin:4px 0 12px">${esc(resume.title)} — ${fa(Object.keys(resume.ans).length)} پاسخ از ${fa(resume.qs.length)} سؤال ثبت شده است.</p>
      <div class="row">
        <button type="button" class="btn primary" id="resumeBtn">ادامه بده</button>
        <button type="button" class="btn danger" id="dropBtn">حذف کن</button>
      </div>
    </div>` : '';

  return `
    ${resumeCard}
    <div class="card">
      <div class="hero">
        <div><b>${fa(meta.total)}</b><small>سؤال واقعی</small></div>
        <div><b>${fa(YEARS.length)}</b><small>دوره آزمون</small></div>
        <div><b>${fa(Object.keys(meta.units).length)}</b><small>واحد درسی</small></div>
      </div>
    </div>
    <div class="card"><h2>آزمون جامع سالانه</h2>
      <p class="muted" style="margin:0 0 12px">تمام سؤالات یک دوره، به ترتیب دفترچه.</p>
      <div class="grid">${years}</div>
    </div>
    <div class="card"><h2>تمرین موضوعی</h2>
      <p class="muted" style="margin:0 0 12px">سؤالات یک واحد درسی از همه سال‌ها یک‌جا.</p>
      <div class="grid">${subjects}</div>
    </div>`;
}

export function subject(gi, unitCounts) {
  const [name, units] = COURSE_GROUPS[gi];
  const buttons = units.map((u, i) =>
    `<button type="button" class="btn" data-unit="${i}" ${unitCounts[u] ? '' : 'disabled'}>
       <span class="unit">${esc(u)}</span>
       <span class="count">${fa(unitCounts[u] || 0)} سؤال</span>
     </button>`).join('');
  return `<div class="card">
            <button type="button" class="btn ghost" id="backHome" style="margin-bottom:14px">→ بازگشت به درس‌ها</button>
            <h2>${esc(name)}</h2>
            <div class="grid" style="margin-top:12px">${buttons}</div>
          </div>`;
}

/* ---------- آزمون ---------- */

const sourceBlock = q => `
  <div class="src-body">
    <p class="muted" style="margin:0 0 10px">صفحات مجاور هم نمایش داده می‌شوند تا سؤال‌های ابتدای و انتهای صفحه کامل دیده شوند.</p>
    ${(q.sourcePages || []).map(p =>
      `<img class="pageimg" loading="lazy" decoding="async" alt="صفحه دفترچه" src="${esc(p)}">`).join('')}
  </div>`;

export function exam(q, { index, total, picked, flagged, answered, elapsed }) {
  const progress = total ? (index + 1) / total * 100 : 0;
  const options = (q.options || []).map((text, i) => {
    const n = i + 1;
    return `<button type="button" class="option ${picked === n ? 'sel' : ''}" data-pick="${n}"
              aria-pressed="${picked === n}">
              <span class="num">${fa(n)}</span><span>${esc(text)}</span>
            </button>`;
  }).join('');

  return `
    <div class="card">
      <div class="qhead">
        <span class="pill accent">${esc(q.courseUnit)}</span>
        <span class="pill">سال ${fa(q.year)}</span>
        <span class="pill">سؤال دفترچه ${fa(q.q)}</span>
        <span class="pill" style="margin-inline-start:auto">⏱ ${esc(elapsed)}</span>
      </div>
      <div class="progress" role="progressbar" aria-valuenow="${index + 1}" aria-valuemin="1" aria-valuemax="${total}">
        <i style="width:${progress}%"></i>
      </div>
      <p class="muted" style="margin:8px 0 0">سؤال ${fa(index + 1)} از ${fa(total)} — ${fa(answered)} پاسخ ثبت شده</p>
    </div>

    <div class="card">
      <p class="qtext">${esc(q.questionText)}</p>
      ${options}
      <div class="row" style="margin-top:12px">
        <button type="button" class="btn ghost" id="flagBtn" aria-pressed="${flagged}">
          ${flagged ? '🔖 نشان برداشته شود' : '🔖 نشان‌دار کن'}
        </button>
        <button type="button" class="btn ghost" id="clearBtn" ${picked ? '' : 'disabled'}>پاک کردن پاسخ</button>
      </div>
    </div>

    <details class="card src"><summary>اصل دفترچه و صفحات مرتبط</summary>${sourceBlock(q)}</details>

    <div class="card" id="navigatorCard" hidden><h2>پرش به سؤال</h2><div class="navgrid" id="navGrid"></div></div>

    <div class="navbar">
      <button type="button" class="btn ghost" id="prevBtn" ${index === 0 ? 'disabled' : ''}>قبلی</button>
      <button type="button" class="btn ghost" id="mapBtn">فهرست</button>
      <button type="button" class="btn primary" id="nextBtn" ${index === total - 1 ? 'disabled' : ''}>بعدی</button>
      <button type="button" class="btn danger" id="finishBtn">پایان</button>
    </div>`;
}

export const navGrid = (qs, { index, ans, flags }) => qs.map((q, i) =>
  `<button type="button" data-go="${i}"
     class="${ans[q.id] ? 'done' : ''} ${i === index ? 'now' : ''} ${flags[q.id] ? 'flag' : ''}"
     aria-label="سؤال ${fa(i + 1)}">${fa(i + 1)}</button>`).join('');

/* ---------- نتیجه ---------- */

function insightBlock(s) {
  const { strengths, weaknesses, ranked, thin } = insights(s.units);
  const bar = u => `
    <div class="bar-row">
      <span>${esc(u.unit)}</span>
      <span class="muted">${pct(u.rate)}٪ — ${fa(u.correct)} از ${fa(u.total)}</span>
      <span class="bar"><i style="width:${u.rate}%;background:${u.rate >= 60 ? 'var(--good)' : u.rate >= 40 ? 'var(--warn)' : 'var(--bad)'}"></i></span>
    </div>`;

  if (!ranked.length) {
    return `<div class="card"><h2>نقاط قوت و ضعف</h2>
              <p class="muted" style="margin:6px 0 0">برای تحلیل واحدها، هر واحد درسی باید دست‌کم ۳ سؤال در این آزمون داشته باشد.</p>
            </div>`;
  }

  return `
    <div class="card">
      <h2>نقاط قوت و ضعف</h2>
      <p class="muted" style="margin:4px 0 14px">بر پایه واحدهایی که دست‌کم ۳ سؤال در این آزمون داشته‌اند.</p>
      ${strengths.length ? `<h3 style="font-size:15px;color:var(--good);margin:0 0 8px">💪 قوی‌ترین واحدها</h3>
        <div class="bars" style="margin-bottom:18px">${strengths.map(bar).join('')}</div>` : ''}
      ${weaknesses.length ? `<h3 style="font-size:15px;color:var(--bad);margin:0 0 8px">📚 نیازمند مرور</h3>
        <div class="bars">${weaknesses.map(bar).join('')}</div>` : ''}
      ${!weaknesses.length ? '<p class="muted" style="margin:0">در هیچ واحدی زیر ۶۰٪ نشدی.</p>' : ''}
      <details style="margin-top:16px"><summary class="muted" style="cursor:pointer">همه واحدها (${fa(ranked.length)})</summary>
        <div class="bars" style="margin-top:12px">${ranked.map(bar).join('')}</div>
        ${thin.length ? `<p class="muted" style="margin-top:10px">${fa(thin.length)} واحد با کمتر از ۳ سؤال کنار گذاشته شد.</p>` : ''}
      </details>
    </div>`;
}

export function results(s, title) {
  const net = Math.max(0, s.net);
  return `
    <div class="card">
      <h2>نتیجه ${esc(title)}</h2>
      <div class="scorewrap" style="margin-top:14px">
        <div class="ring" style="--p:${net}"><i>${pct(s.net)}٪</i></div>
        <div style="flex:1;min-width:220px">
          <div class="metrics">
            <div><b style="color:var(--good)">${fa(s.correct)}</b><small>صحیح</small></div>
            <div><b style="color:var(--bad)">${fa(s.wrong)}</b><small>غلط</small></div>
            <div><b>${fa(s.blank)}</b><small>نزده</small></div>
          </div>
          <div class="metrics" style="margin-top:8px;grid-template-columns:repeat(2,1fr)">
            <div><b>${pct(s.raw)}٪</b><small>درصد خام</small></div>
            <div><b>${pct(s.net)}٪</b><small>با نمره منفی (۱−ᐟ₃)</small></div>
          </div>
        </div>
      </div>
      <p class="muted" style="margin:14px 0 0">
        درصد خام = صحیح ÷ کل. درصد با نمره منفی = (صحیح − غلط×⅓) ÷ کل، مطابق شیوه نمره‌دهی آزمون مرکز وکلا؛
        هر ${fa(Math.round(1 / PENALTY))} پاسخ غلط یک پاسخ صحیح را خنثی می‌کند.
      </p>
    </div>

    ${insightBlock(s)}

    <div class="card">
      <h2>مرور سؤالات</h2>
      <div class="tabs" style="margin-top:12px" id="reviewTabs">
        <button type="button" data-filter="all" aria-selected="true">همه (${fa(s.total)})</button>
        <button type="button" data-filter="wrong" aria-selected="false">غلط (${fa(s.wrong)})</button>
        <button type="button" data-filter="blank" aria-selected="false">نزده (${fa(s.blank)})</button>
        <button type="button" data-filter="flag" aria-selected="false">نشان‌دار</button>
      </div>
    </div>
    <div id="reviewList"></div>
    <div class="navbar">
      <button type="button" class="btn primary" id="resultHome">بازگشت به خانه</button>
    </div>`;
}

export function reviewCard(q, picked, analysis) {
  const a = analysis || { legalBasis: '', summary: '', options: [] };
  const rows = [1, 2, 3, 4].map(i => {
    const cls = i === +q.answer ? 'correct' : (picked === i ? 'picked-wrong' : '');
    const mark = i === +q.answer ? ' ✅' : (picked === i ? ' ❌ انتخاب تو' : '');
    return `<div class="an ${cls}">
              <b>گزینه ${fa(i)}${mark} — ${esc(q.options[i - 1] || '')}</b>
              ${esc(a.options[i - 1] || 'تحلیل این گزینه ثبت نشده است.')}
            </div>`;
  }).join('');

  return `<div class="card">
    <div class="qhead">
      <span class="pill accent">${esc(q.courseUnit)}</span>
      <span class="pill">سال ${fa(q.year)}</span>
      <span class="pill">سؤال ${fa(q.q)}</span>
      <span class="pill" style="margin-inline-start:auto">پاسخ تو: ${picked ? fa(picked) : '—'} | کلید: ${fa(q.answer)}</span>
    </div>
    <p class="qtext">${esc(q.questionText)}</p>
    ${a.legalBasis || a.summary ? `<div class="legal">
      ${a.legalBasis ? `<b>مستند قانونی:</b> ${esc(a.legalBasis)}<br>` : ''}
      ${a.summary ? `<b>جمع‌بندی:</b> ${esc(a.summary)}` : ''}
      ${a.currentLawNote ? `<br><b>توجه:</b> ${esc(a.currentLawNote)}` : ''}
    </div>` : ''}
    ${rows}
    <details class="src" style="margin-top:12px;border:1px solid var(--border);border-radius:12px">
      <summary>اصل دفترچه</summary>${sourceBlock(q)}
    </details>
  </div>`;
}
