/* گزارش پایان آزمون — باید جمع‌وجور، کامل و قابل‌تجزیه باشد. */
var failures = 0;
function ok(name, got, want) {
  var pass = want === undefined ? !!got : String(got) === String(want);
  if (!pass) failures++;
  console.log((pass ? 'PASS  ' : 'FAIL  ') + name + '  → ' + got);
}

var qs = [
  { id: 'k1404-12', answer: 3, courseUnit: 'مدنی' },
  { id: 'k1404-44', answer: 1, courseUnit: 'تجارت' },
  { id: 'k1404-51', answer: 4, courseUnit: 'تجارت' },
  { id: 'k1404-61', answer: 2, courseUnit: 'آیین دادرسی مدنی' },
];
var sess = {
  title: 'کانون ۱۴۰۴',
  ans: { 'k1404-12': 3, 'k1404-44': 2, 'k1404-51': 4 },   // یکی غلط، دو تا درست، یکی نزده
  flags: { 'k1404-61': 1 },
  startedAt: 0, finishedAt: 60000, pausedMs: 0, pausedAt: 0,
};
var sc = score(qs, sess.ans);
var txt = build(qs, sess, sc, 60000, { 'k1404-44': 2 });

ok('سرآیند دارد', txt.indexOf('#گزارش‌آزمون') === 0, true);
ok('عنوان آزمون آمده', txt.indexOf('کانون ۱۴۰۴') > -1, true);
ok('بخش درس‌ها هست', txt.indexOf('[درس‌ها]') > -1, true);
ok('بخش غلط‌ها هست', txt.indexOf('[غلط‌ها]') > -1, true);
ok('سؤال غلط فهرست شد', txt.indexOf('k1404-44') > -1, true);
ok('گزینهٔ زده‌شده و کلید آمد', txt.indexOf('۲←۱') > -1, true);
ok('تکرارِ اشتباه علامت خورد', txt.indexOf('×۳') > -1, true);
ok('سؤال درست در فهرست غلط‌ها نیست', txt.indexOf('k1404-51') === -1, true);
ok('نشان‌دارِ نزده آمد', txt.indexOf('[نشان‌دارِ نزده]') > -1 && txt.indexOf('k1404-61') > -1, true);
ok('گزارش کوتاه است', txt.split('\n').length < 40, true);

var e = entry(qs, sess, sc, 60000);
ok('ورودیِ تاریخچه غلط‌ها را دارد', e.wrong.length, 1);
ok('و درس را نگه می‌دارد', e.wrong[0].subject, 'تجارت');
ok('و کارنامهٔ درس‌ها را دارد', e.subjects.length, 3);

// آزمون بی‌غلط نباید فهرست خالی بی‌معنا بدهد
var clean = build(qs, { title: 'ت', ans: { 'k1404-12': 3 }, flags: {}, finishedAt: 0 },
  score(qs, { 'k1404-12': 3 }), 1000, {});
ok('آزمون بی‌غلط خط «—» می‌گذارد', clean.indexOf('[غلط‌ها]') > -1 && clean.indexOf('\n—\n') > -1, true);

console.log(failures ? ('\n' + failures + ' تست ناموفق') : '\nهمه تست‌ها موفق');
