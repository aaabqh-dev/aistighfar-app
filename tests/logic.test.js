// اختبارات منطق البيانات والتذكيرات: node tests/logic.test.js
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const store = {};
const ctx = { window: {}, console, Date, Math, JSON, Map, Set, Object, Array, Number, String, Intl,
  localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } } };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['i18n.js', 'lang/ar.js', 'lang/en.js', 'vendor/adhan.min.js', 'content.js', 'store.js', 'planner.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../www/js', f), 'utf8'), ctx, { filename: f });
const App = ctx.App;
App.setLang('ar');
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('✓', name); };
const D = App.date;

t('ترحيل بيانات الإصدار الأول', () => {
  store.astaghfar_counter = '250'; store.astaghfar_reminder_times = '["05:00","21:30"]'; store.astaghfar_notifications_enabled = 'true';
  const s = App.load(ctx.localStorage);
  assert.equal(s.legacyTotal, 250); assert.deepEqual([...s.reminders.times], ['05:00', '21:30']);
  assert.equal(s.reminders.enabled, true); assert.equal(s.firstRunDone, true);
  App.saveNow();
  const s2 = App.load(ctx.localStorage); assert.equal(s2.legacyTotal, 250); // لا ترحيل مكرر
});

function fresh() { return App.defaults(); }
function seed(s, today, counts, dhikr = 'astaghfar') { // counts[0] = أقدم يوم
  counts.forEach((c, i) => { if (c) (s.days[D.addDays(today, i - counts.length + 1)] ||= {})[dhikr] = c; });
}

t('العدّ اليومي وتسجيل الهدف', () => {
  const s = fresh(); s.goal = 500; const now = new Date(2026, 10, 7, 9);
  for (let i = 0; i < 3; i++) App.increment(s, 'astaghfar', now);
  App.increment(s, 'subhan', now);
  assert.equal(App.dayCount(s, '2026-11-07', 'istighfar'), 3);
  assert.equal(App.dayCount(s, '2026-11-07', 'all'), 4);
  assert.equal(s.goalLog['2026-11-07'], 500);
});

t('الإحصائيات والسلاسل', () => {
  const s = fresh(); s.goal = 100; s.legacyTotal = 50; const today = '2026-11-07';
  seed(s, today, [100, 0, 120, 130, 90, 200]); // آخر ٦ أيام
  const sum = App.summary(s, today, 'istighfar');
  assert.equal(sum.total, 640 + 50); assert.equal(sum.activeDays, 5); assert.equal(sum.average, 128);
  assert.equal(sum.bestDay, 200); assert.equal(sum.currentStreak, 4); assert.equal(sum.longestStreak, 4);
  assert.equal(sum.goalDays, 4);
  // سلسلة مستمرة إذا اليوم صفر وأمس فيه نشاط
  delete s.days[today]; assert.equal(App.summary(s, today, 'istighfar').currentStreak, 3);
});

t('الرسوم: أسبوع وشهر وسنة', () => {
  const s = fresh(); seed(s, '2026-11-07', [10, 20, 30]);
  assert.deepEqual(App.series(s, '2026-11-07', 3, 'istighfar').map((d) => d.count), [10, 20, 30]);
  assert.equal(App.monthSeries(s, 2026, 10, 'istighfar').length, 30);
  assert.equal(App.yearSeries(s, 2026, 'istighfar')[10], 60);
});

t('اقتراح رفع الهدف بعد ١٢ من ١٤ يوماً', () => {
  const s = fresh(); const today = '2026-11-20'; App.setGoal(s, 1000, '2026-11-01');
  seed(s, D.addDays(today, -1), [1000, 1100, 1000, 1200, 0, 1000, 1000, 1000, 1000, 1000, 1500, 1000, 1000, 1000]);
  const sg = App.smartSuggestion(s, today);
  assert.equal(sg.type, 'up'); assert.equal(sg.to, 1200);
  s.smart.lastSuggestAt = today; assert.equal(App.smartSuggestion(s, today), null); // فترة تهدئة
});

t('لا اقتراح قبل مرور ١٤ يوماً على ضبط الهدف', () => {
  const s = fresh(); const today = '2026-11-20'; App.setGoal(s, 1000, '2026-11-10');
  seed(s, D.addDays(today, -1), Array(14).fill(1000));
  assert.equal(App.smartSuggestion(s, today), null);
});

t('اقتراح تخفيف الهدف عند التعثر', () => {
  const s = fresh(); const today = '2026-11-20'; App.setGoal(s, 1000, '2026-11-05');
  seed(s, D.addDays(today, -1), [1000, 200, 0, 300, 0, 100, 0]);
  const sg = App.smartSuggestion(s, today); assert.equal(sg.type, 'down'); assert.equal(sg.to, 600);
});

t('قيم الهدف التالي', () => {
  assert.equal(App.nextGoalUp(100), 200); assert.equal(App.nextGoalUp(1000), 1200); assert.equal(App.nextGoalUp(3000), 3600);
  assert.equal(App.nextGoalUp(33), 50); assert.equal(App.nextGoalDown(1000), 600); assert.equal(App.nextGoalDown(100), 100);
});

t('الأوسمة', () => {
  const s = fresh(); s.goal = 100; seed(s, '2026-11-07', [150, 120, 1000]);
  const got = App.checkAchievements(s, '2026-11-07').map((a) => a.id);
  for (const id of ['first', 'day100', 'goal1', 'day1000', 'streak3']) assert.ok(got.includes(id), id);
  assert.equal(App.checkAchievements(s, '2026-11-07').length, 0); // لا تكرار
});

t('دمج المزامنة يأخذ الأكبر ولا يضاعف', () => {
  const a = { '2026-11-01': { astaghfar: 10 } }, b = { '2026-11-01': { astaghfar: 7, subhan: 3 }, '2026-11-02': { astaghfar: 5 } };
  const m = App.mergeDays(App.mergeDays(a, b), b);
  assert.equal(m['2026-11-01'].astaghfar, 10); assert.equal(m['2026-11-01'].subhan, 3); assert.equal(m['2026-11-02'].astaghfar, 5);
});

function remindersState() {
  const s = fresh(); s.goal = 1000; s.reminders.enabled = true; return s;
}

t('تذكير كل ١٠ دقائق داخل ساعات النشاط فقط', () => {
  const s = remindersState(); Object.assign(s.reminders, { interval: { on: true, min: 10 }, window: { start: '08:00', end: '22:00' } });
  const now = new Date(2026, 10, 7, 21, 0);
  const p = App.planReminders(s, now);
  const today = p.items.filter((i) => D.dayKey(i.at) === '2026-11-07');
  assert.equal(today.length, 6); // 21:10 .. 22:00
  assert.ok(p.items.every((i) => { const m = i.at.getHours() * 60 + i.at.getMinutes(); return m >= 480 && m <= 1320; }));
  assert.ok(p.items.length <= 300 && p.items.every((i, k) => i.id === 1000 + k));
  assert.deepEqual({ ...p.fallback.on }, { hour: 8, minute: 0 }); // الاحتياطي في بداية النافذة
  assert.ok(!p.items.some((i) => i.at.getHours() === 8 && i.at.getMinutes() === 0)); // بلا تكرار
});

t('كل ٥ دقائق: يلتزم بالحد الأقصى ويُكمل أياماً كاملة', () => {
  const s = remindersState(); Object.assign(s.reminders, { interval: { on: true, min: 5 }, window: { start: '06:00', end: '23:00' } });
  const p = App.planReminders(s, new Date(2026, 10, 7, 5, 0));
  assert.ok(p.items.length <= 300); assert.equal(p.items.length, 204); // يوم كامل (205 ناقص دقيقة الاحتياطي)، واليوم الثاني لا يتسع
  assert.equal(p.horizonEnd, '2026-11-07');
});

t('نافذة تتجاوز منتصف الليل', () => {
  const s = remindersState(); Object.assign(s.reminders, { interval: { on: true, min: 60 }, window: { start: '22:00', end: '02:00' } });
  const p = App.planReminders(s, new Date(2026, 10, 7, 12, 0));
  const hours = p.items.slice(0, 4).map((i) => i.at.getHours()); assert.deepEqual(hours, [23, 0, 1, 2]); assert.equal(p.fallback.on.hour, 22);
});

t('إيقاف تذكيرات اليوم بعد تحقيق الهدف (مع بقاء الصلوات)', () => {
  const s = remindersState(); s.days['2026-11-07'] = { astaghfar: 1000 };
  Object.assign(s.reminders, { times: ['18:00', '20:00'], prayers: { on: true, city: 'riyadh', offset: 10, which: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true } } });
  const p = App.planReminders(s, new Date(2026, 10, 7, 12, 0));
  const today = p.items.filter((i) => D.dayKey(i.at) === '2026-11-07');
  assert.ok(today.length > 0 && today.every((i) => i.kind === 'prayer'));
  assert.ok(p.items.some((i) => i.kind === 'time' && D.dayKey(i.at) === '2026-11-08'));
});

t('أوقات الصلاة للرياض منطقية (أم القرى)', () => {
  const pt = App.prayerTimes('2026-11-07', 'riyadh');
  const hm = (d) => d.getUTCHours() + 3 + d.getUTCMinutes() / 60; // بتوقيت الرياض
  assert.ok(hm(pt.fajr) > 4.3 && hm(pt.fajr) < 5.2, 'fajr ' + hm(pt.fajr));
  assert.ok(hm(pt.maghrib) > 16.9 && hm(pt.maghrib) < 17.6, 'maghrib ' + hm(pt.maghrib));
});

t('رسائل حسب التقدم (والتذكير الاحتياطي يحمل نفس الذكاء)', () => {
  const s = remindersState(); s.days['2026-11-07'] = { astaghfar: 900 }; s.reminders.times = ['15:00'];
  let p = App.planReminders(s, new Date(2026, 10, 7, 12, 0));
  assert.ok(/١٠٠/.test(p.fallback.body), p.fallback.body); // باقي ١٠٠
  s.reminders.times = ['15:00', '18:00'];
  s.days['2026-11-07'] = { astaghfar: 300 };
  p = App.planReminders(s, new Date(2026, 10, 7, 12, 0));
  const at18 = p.items.find((i) => i.at.getHours() === 18);
  assert.ok(/٧٠٠|٣٠٠/.test(at18.body), at18.body);
  s.days['2026-11-07'] = { astaghfar: 1000 };
  p = App.planReminders(s, new Date(2026, 10, 7, 12, 0));
  assert.ok(App.MESSAGES.goalDone.some((m) => p.fallback.body === m.replace('{goal}', '١٬٠٠٠')) || /هدف/.test(p.fallback.body), p.fallback.body);
  s.days = { '2026-11-01': { astaghfar: 5 } }; // غائب منذ أيام
  p = App.planReminders(s, new Date(2026, 10, 7, 12, 0));
  assert.ok(App.MESSAGES.missYou.includes(p.fallback.body), p.fallback.body);
});

t('قناة الإشعار حسب اختيار الصوت', () => {
  const s = remindersState(); s.reminders.times = ['15:00']; s.reminders.sound = 'vibrate';
  const p = App.planReminders(s, new Date(2026, 10, 7, 12, 0));
  assert.equal(p.items[0].channelId, 'tasbih_vibrate_v1'); assert.equal(p.fallback.channelId, 'tasbih_vibrate_v1');
});

t('بدون تفعيل لا شيء يُجدول', () => {
  const s = fresh(); s.reminders.times = ['15:00'];
  assert.equal(App.planReminders(s, new Date()).items.length, 0);
});

t('التذكيرات بلغة المستخدم (الإنجليزية) وتنسيق أرقامها', () => {
  App.setLang('en');
  const s = remindersState(); s.days['2026-11-07'] = { astaghfar: 900 }; s.reminders.times = ['15:00', '18:00'];
  const p = App.planReminders(s, new Date(2026, 10, 7, 12, 0));
  const at18 = p.items.find((i) => i.at.getHours() === 18);
  assert.match(at18.body, /100/); assert.equal(at18.title, '🌿 Istighfar Tasbih');
  assert.match(App.fmt.time('17:05'), /5:05\s?PM/);
  assert.equal(App.t('prog_left', { n: 5, goal: 10 }), '5 left to reach your goal (10)');
  App.setLang('fa'); assert.equal(App.fmt.num(1234), '۱٬۲۳۴');
  App.setLang('ar');
});

console.log(`\n${passed} اختبار ناجح`);
