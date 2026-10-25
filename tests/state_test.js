// تست منطق نمره‌دهی. توسط scripts/run_tests.py اجرا می‌شود؛
// محتویات site/js/state.js پیش از این کد چسبانده می‌شود.
var localStorage = undefined;   // شبیه‌سازی حالت خصوصی مرورگر: نباید بترکد
function ok(name, got, want) {
  var pass = String(got) === String(want);
  console.log((pass ? 'PASS  ' : 'FAIL  ') + name + '  → ' + got + (pass ? '' : '  (انتظار ' + want + ')'));
  if (!pass) failures++;
}
var failures = 0;

// آزمون جامع ۳۰ سؤالی از دو واحد
var qs = [];
for (var i = 1; i <= 30; i++)
  qs.push({ id: 'q' + i, answer: 1, courseUnit: i <= 12 ? 'مدنی ۵ — خانواده' : 'تجارت ۳ — اسناد تجاری و چک' });

var ans = {};
for (i = 1;  i <= 10; i++) ans['q' + i] = 1;   // ۱۰ صحیح (۱۰ تای اول از واحد مدنی)
for (i = 11; i <= 22; i++) ans['q' + i] = 3;   // ۱۲ غلط
                                               // q23..q30 = ۸ نزده
var s = score(qs, ans);
ok('صحیح',            s.correct, 10);
ok('غلط',             s.wrong,   12);
ok('نزده',            s.blank,    8);
ok('جمع',             s.correct + s.wrong + s.blank, 30);
ok('درصد خام',        s.raw.toFixed(2),  '33.33');
ok('با نمره منفی',    s.net.toFixed(2),  '20.00');   // (10 - 12/3)/30 = 6/30
ok('تعداد واحدها',    s.units.length, 2);

var civil = s.units.filter(function(u){return u.unit.indexOf('مدنی')===0})[0];
ok('مدنی: کل',        civil.total,   12);
ok('مدنی: صحیح',      civil.correct, 10);
ok('مدنی: درصد',      civil.rate.toFixed(1), '83.3');

var ins = insights(s.units);
ok('نقطه قوت',        ins.strengths.length, 1);
ok('قوی‌ترین واحد',    ins.strengths[0].unit.indexOf('مدنی'), 0);
ok('نقطه ضعف',        ins.weaknesses.length, 1);
ok('ضعیف‌ترین واحد',   ins.weaknesses[0].unit.indexOf('تجارت'), 0);

// واحدهای کم‌سؤال باید کنار گذاشته شوند
var tiny = score([{id:'a',answer:1,courseUnit:'حقوق ثبت ۳ — اجرای اسناد رسمی'}], {a:1});
ok('واحد ۱ سؤالی کنار گذاشته شد', insights(tiny.units).ranked.length, 0);
ok('در فهرست کم‌نمونه هست',        insights(tiny.units).thin.length, 1);

// جلسه خالی نباید تقسیم بر صفر بدهد
ok('جلسه خالی',      score([], {}).raw, 0);
// ذخیره‌سازی در نبود localStorage نباید استثنا بدهد
save({a:1}); clear();
ok('بدون localStorage نترکید', 'ok', 'ok');

console.log(failures ? ('\n' + failures + ' تست ناموفق') : '\nهمه تست‌ها موفق');

// ---------- نمره‌دهی وقتی قانون تغییر کرده ----------
var qc = [
  { id: 'c1', answer: 1, answerToday: 3, courseUnit: 'جزای عمومی ۳ — مجازات‌ها و نهادهای ارفاقی' },
  { id: 'c2', answer: 2,                 courseUnit: 'جزای عمومی ۳ — مجازات‌ها و نهادهای ارفاقی' },
];
ok('کلید ملاک = قانون روز',    keyOf(qc[0]), 3);
ok('بدون تغییر = کلید دفترچه', keyOf(qc[1]), 2);

var sc1 = score(qc, { c1: 3, c2: 2 });          // هر دو مطابق قانون روز
ok('پاسخ مطابق قانون روز صحیح است', sc1.correct, 2);
ok('شمارش سؤالات تغییرکرده',        sc1.lawChanged, 1);

var sc2 = score(qc, { c1: 1, c2: 2 });          // c1 مطابق کلید قدیمی دفترچه
ok('پاسخ مطابق کلید قدیمی غلط است', sc2.correct, 1);
ok('و غلط شمرده می‌شود',            sc2.wrong, 1);

// ---------- توقف و ادامهٔ آزمون ----------
ok('جلسهٔ تازه متوقف نیست', isPaused({ startedAt: 1, pausedAt: 0 }), false);
ok('زمان ساده', elapsedMs({ startedAt: 1000, finishedAt: 5000, pausedMs: 0, pausedAt: 0 }), 4000);
ok('مدت توقف کسر می‌شود', elapsedMs({ startedAt: 1000, finishedAt: 5000, pausedMs: 1500, pausedAt: 0 }), 2500);
ok('حین توقف ساعت می‌ایستد', elapsedMs({ startedAt: 1000, pausedAt: 3000, pausedMs: 0 }), 2000);
ok('زمان هرگز منفی نمی‌شود', elapsedMs({ startedAt: 9000, finishedAt: 1000, pausedMs: 0, pausedAt: 0 }), 0);

var ps = { startedAt: Date.now() - 5000, pausedMs: 0, pausedAt: 0 };
pause(ps);
ok('pause جلسه را متوقف می‌کند', isPaused(ps), true);
var frozen = elapsedMs(ps);
ok('pause دوباره اثری ندارد', (pause(ps), isPaused(ps)), true);
ok('زمانِ متوقف ثابت می‌ماند', elapsedMs(ps), frozen);
resume(ps);
ok('resume ادامه می‌دهد', isPaused(ps), false);
ok('مدت توقف ثبت شد', ps.pausedMs >= 0, true);

// ---------- کارنامهٔ درس‌به‌درس ----------
ok('نام درس از واحد درآمد', subjectOf('مدنی ۳ — قواعد عمومی قراردادها'), 'مدنی');
ok('نام درس کانون دست‌نخورده', subjectOf('حقوق اساسی'), 'حقوق اساسی');

var qk = [
  { id: 'a1', answer: 1, courseUnit: 'تجارت' },
  { id: 'a2', answer: 2, courseUnit: 'تجارت' },
  { id: 'a3', answer: 3, courseUnit: 'تجارت' },
  { id: 'a4', answer: 4, courseUnit: 'مدنی' },
];
var sk = score(qk, { a1: 1, a2: 1, a3: 1, a4: 4 });   // تجارت: ۱ درست ۲ غلط · مدنی: ۱ درست
var tej = sk.subjects.filter(function (u) { return u.name === 'تجارت'; })[0];
ok('درس‌ها تفکیک شد', sk.subjects.length, 2);
ok('شمارش درستِ درس', tej.correct, 1);
ok('شمارش غلطِ درس', tej.wrong, 2);
ok('خالصِ درس با نمره منفی', Math.round(tej.net * 100) / 100, Math.round(((1 - 2 / 3) / 3 * 100) * 100) / 100);
ok('درس پرسؤال‌تر اول است', sk.subjects[0].name, 'تجارت');
