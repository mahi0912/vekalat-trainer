/* شبیه‌ساز باید دفترچه‌ای با ساختار واقعی کانون بچیند. */
var failures = 0;
function ok(name, got, want) {
  var pass = want === undefined ? !!got : String(got) === String(want);
  if (!pass) failures++;
  console.log((pass ? 'PASS  ' : 'FAIL  ') + name + '  → ' + got);
}

// بانک ساختگی: از هر درس ۳۰ سؤال کانون + چند سؤال ارشد و مرکز
var pool = [];
BLUEPRINT.forEach(function (b, bi) {
  for (var i = 0; i < 30; i++) {
    pool.push({ id: 'k-' + bi + '-' + i, source: 'kanoon', year: 1400, courseUnit: b[0] });
  }
  pool.push({ id: 'a-' + bi, source: 'kanoon', year: 1405, courseUnit: b[0] });   // ارشد
  pool.push({ id: 'm-' + bi, source: 'markaz', year: 1402, courseUnit: b[0] });   // مرکز
});

var p = paper(pool);
ok('۱۴۰ سؤال چیده شد', p.qs.length, 140);
ok('کمبودی گزارش نشد', p.short.length, 0);
ok('سؤال ارشد وارد نشد', p.qs.filter(function (q) { return q.year === 1405; }).length, 0);
ok('سؤال مرکز وارد نشد', p.qs.filter(function (q) { return q.source !== 'kanoon'; }).length, 0);
ok('شناسه تکراری ندارد', new Set(p.qs.map(function (q) { return q.id; })).size, 140);

// ترتیب دفترچه: ۲۰تایی و به ترتیب BLUEPRINT
var orderOk = true, n = 0;
BLUEPRINT.forEach(function (b) {
  for (var i = 0; i < b[1]; i++, n++) if (p.qs[n].courseUnit !== b[0]) orderOk = false;
});
ok('۲۰ سؤال از هر درس، به ترتیب دفترچه', orderOk, true);

// سؤال دیده‌شده آخر صف می‌آید
var seen = new Set(pool.filter(function (q) { return q.courseUnit === 'مدنی'; })
  .slice(0, 25).map(function (q) { return q.id; }));
var p2 = paper(pool, seen);
var madani = p2.qs.filter(function (q) { return q.courseUnit === 'مدنی'; });
var freshCount = madani.filter(function (q) { return !seen.has(q.id); }).length;
ok('اول سؤال‌های نادیده انتخاب می‌شوند', freshCount >= 5, true);

// کمبود سؤال گزارش می‌شود
var tiny = pool.filter(function (q) { return q.courseUnit !== 'حقوق اساسی'; });
ok('کمبود درس گزارش می‌شود', paper(tiny).short.length, 1);

// نمرهٔ وزنی
var subs = [
  { name: 'مدنی', net: 60 },                      // ۳
  { name: 'آیین دادرسی مدنی', net: 30 },          // ۳
  { name: 'تجارت', net: 0 },                      // ۲
  { name: 'جزا', net: 0 },                        // ۲
  { name: 'آیین دادرسی کیفری', net: 0 },          // ۲
  { name: 'اصول استنباط و متون فقه', net: 0 },    // ۱
  { name: 'حقوق اساسی', net: 0 },                 // ۱
];
ok('وزن‌دهی با ضرایب کانون', Math.round(weighted(subs) * 10) / 10, Math.round((60 * 3 + 30 * 3) / 14 * 10) / 10);
ok('درسِ ناشناخته وزن نمی‌گیرد', weighted([{ name: 'نجوم', net: 99 }]), 0);

console.log(failures ? ('\n' + failures + ' تست ناموفق') : '\nهمه تست‌ها موفق');

// وقتی همهٔ سؤال‌ها دیده شده‌اند، باز هم باید دفترچهٔ کامل بدهد
var allSeen = new Set(pool.map(function (q) { return q.id; }));
var p3 = paper(pool, allSeen);
ok('با همه‌چیزِ دیده‌شده هم دفترچه کامل است', p3.qs.length, 140);
ok('و باز هم بدون تکرار', new Set(p3.qs.map(function (q) { return q.id; })).size, 140);
