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
