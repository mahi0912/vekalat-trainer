// تست رندر نماها با داده واقعی از bank.json.
// توسط scripts/run_tests.py اجرا می‌شود؛ site/js/views.js و وابستگی‌هایش پیش از این چسبانده می‌شوند.

var failures = 0;
function ok(name, cond, detail) {
  if (cond) { console.log('PASS  ' + name); }
  else { console.log('FAIL  ' + name + (detail ? '  → ' + detail : '')); failures++; }
}
function html(name, out) {
  ok(name + ': رشته برگرداند', typeof out === 'string' && out.length > 50);
  ok(name + ': undefined ندارد', out.indexOf('undefined') === -1,
     out.slice(Math.max(0, out.indexOf('undefined') - 60), out.indexOf('undefined') + 40));
  ok(name + ': NaN ندارد', out.indexOf('NaN') === -1);
  ok(name + ': تگ باز نمانده', (out.match(/</g) || []).length === (out.match(/>/g) || []).length);
}

var F = JSON.parse(FIXTURE);
var qs = F.questions;

// ---------- خانه ----------
var unitCounts = F.meta.units;
html('home', home({ meta: F.meta, unitCounts: unitCounts, resume: null }));
var withResume = home({ meta: F.meta, unitCounts: unitCounts,
  resume: { title: 'آزمون جامع ۱۳۹۸', ans: { 'a': 1 }, qs: ['a', 'b'] } });
html('home+ادامه', withResume);
ok('home: دکمه ادامه دارد', withResume.indexOf('resumeBtn') > -1);
ok('home: هر ۷ سال هست', (home({meta:F.meta,unitCounts:unitCounts,resume:null}).match(/data-year=/g)||[]).length === 7);

// ---------- انتخاب درس ----------
html('subject', subject(0, unitCounts));
ok('subject: ۸ واحد مدنی', (subject(0, unitCounts).match(/data-unit=/g) || []).length === 8);

// ---------- آزمون ----------
var e = exam(qs[0], { index: 0, total: qs.length, picked: 0, flagged: false, answered: 0, elapsed: '۰۰:۰۵' });
html('exam', e);
ok('exam: چهار گزینه', (e.match(/data-pick=/g) || []).length === 4);
ok('exam: دکمه قبلی غیرفعال', e.indexOf('id="prevBtn" disabled') > -1);
var e2 = exam(qs[1], { index: 1, total: qs.length, picked: 3, flagged: true, answered: 1, elapsed: '۰۱:۲۰' });
ok('exam: گزینه انتخابی نشان دارد', e2.indexOf('option sel') > -1);
ok('exam: نشان‌دار بودن منعکس شده', e2.indexOf('نشان برداشته شود') > -1);

// ---------- فهرست پرش ----------
var ng = navGrid(qs, { index: 2, ans: {}, flags: {} });
ok('navGrid: به تعداد سؤال', (ng.match(/data-go=/g) || []).length === qs.length);
ok('navGrid: سؤال جاری علامت دارد', ng.indexOf('now') > -1);

// ---------- نتیجه ----------
var ans = {};
ans[qs[0].id] = qs[0].answer;                        // صحیح
ans[qs[1].id] = qs[1].answer === 1 ? 2 : 1;          // غلط
var s = score(qs, ans);
var r = results(s, 'آزمون جامع ۱۳۹۸');
html('results', r);
ok('results: درصد خام هست', r.indexOf('درصد خام') > -1);
ok('results: نمره منفی هست', r.indexOf('نمره منفی') > -1);
ok('results: نقاط قوت و ضعف هست', r.indexOf('نقاط قوت و ضعف') > -1);
ok('results: چهار فیلتر دارد', (r.match(/data-filter=/g) || []).length === 4);

// ---------- کارت مرور ----------
var rc = reviewCard(qs[0], ans[qs[0].id], F.review[qs[0].id]);
html('reviewCard', rc);
ok('reviewCard: چهار تحلیل', (rc.match(/class="an /g) || []).length === 4);
ok('reviewCard: گزینه صحیح علامت دارد', rc.indexOf('✅') > -1);
ok('reviewCard: مستند قانونی دارد', rc.indexOf('مستند قانونی') > -1);
// نبودِ تحلیل نباید بترکاند
html('reviewCard بدون تحلیل', reviewCard(qs[2], 0, undefined));

// ---------- خنثی‌سازی HTML ----------
var evil = JSON.parse(JSON.stringify(qs[0]));
evil.questionText = '<img src=x onerror=alert(1)>';
evil.options = ['<script>bad()</scr' + 'ipt>', 'ب', 'ج', 'د'];
var x = exam(evil, { index: 0, total: 1, picked: 0, flagged: false, answered: 0, elapsed: '۰۰:۰۰' });
ok('XSS: تگ img خام نیست', x.indexOf('<img src=x') === -1);
ok('XSS: تگ script خام نیست', x.indexOf('<script>') === -1);
ok('XSS: به شکل escape شده هست', x.indexOf('&lt;img') > -1);

console.log(failures ? ('\n' + failures + ' تست ناموفق') : '\nهمه تست‌ها موفق');
