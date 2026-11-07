// اختبار شامل للواجهة مع محاكاة إضافات أندرويد وFirebase.
// التشغيل: npm i -D playwright && (cd www && python3 -m http.server 8765 &) && node tests/e2e.test.js http://localhost:8765
// اختبار شامل بمحاكاة إضافات أندرويد + Firebase (مع قواعد الأمان مبسّطة)
const { chromium } = require('playwright');
const assert = require('assert');
const ROOT = process.argv[2];

const MOCK = () => {
  const log = (window.__log = []);
  const db = (window.__db = window.__db || {});
  const ev = {};
  let user = window.__user || null;
  let nextUid = 1;
  const listeners = {};
  const authed = () => { if (!user) throw new Error('permission-denied: unauthenticated'); };
  // قواعد مبسّطة مطابقة لـ firestore.rules
  function rulesWrite(ref, data, existing) {
    authed();
    const [col, id] = ref.split('/');
    if (col === 'users' && id !== user.uid) throw new Error('permission-denied users');
    if (col === 'codes') { if (data.uid !== user.uid || !/^[A-Z0-9]{4,12}$/.test(id)) throw new Error('permission-denied codes'); }
    if (col === 'referrals') {
      const keys = Object.keys(data);
      if (id !== user.uid || keys.some((k) => !['referrer', 'total', 'updatedAt'].includes(k)) || typeof data.referrer !== 'string'
        || data.referrer === id || !Number.isInteger(data.total) || data.total < 0 || (existing && existing.referrer !== data.referrer))
        throw new Error('permission-denied referrals ' + JSON.stringify(data));
    }
  }
  const P = {
    LocalNotifications: {
      checkPermissions: async () => ({ display: 'granted' }), requestPermissions: async () => ({ display: 'granted' }),
      createChannel: async (c) => log.push(['channel', c.id, c.sound || null, c.importance]),
      deleteChannel: async (c) => log.push(['deleteChannel', c.id]),
      checkExactNotificationSetting: async () => ({ exact_alarm: 'denied' }),
      getPending: async () => ({ notifications: (window.__pending || []).map((id) => ({ id })) }),
      cancel: async (o) => { const ids = o.notifications.map((x) => x.id); window.__pending = (window.__pending || []).filter((i) => !ids.includes(i)); log.push(['cancel', ids.length]); },
      schedule: async (o) => { o.notifications.forEach((x) => (window.__pending = (window.__pending || []).concat(x.id))); window.__lastSchedule = (window.__lastSchedule || []).concat(o.notifications); log.push(['schedule', o.notifications.length]); },
      addListener: async () => ({ remove() {} })
    },
    Haptics: { impact: async (o) => log.push(['haptic', o.style]), notification: async () => log.push(['haptic', 'SUCCESS']) },
    App: { addListener: async (n, fn) => { listeners[n] = fn; return { remove() {} }; }, minimizeApp: async () => {} },
    Share: { share: async (o) => { window.__shared = o; log.push(['share', o.url, (o.files || []).length]); } },
    Filesystem: { writeFile: async (o) => ({ uri: 'file:///cache/' + o.path }) },
    InstallReferrer: { getReferrer: async () => ({ referrer: window.__installRef || '' }) },
    TasbihWidget: {
      drain: async () => { const c = window.__widgetPending || {}; window.__widgetPending = {}; return { counts: c }; },
      update: async (o) => { window.__widgetState = JSON.parse(JSON.stringify(o)); log.push(['widgetUpdate', o.count]); },
      info: async () => ({ installed: window.__widgetInstalled || 0, canPin: true }),
      requestPin: async () => { log.push(['pin']); window.__widgetInstalled = 1; return { requested: true }; }
    },
    FirebaseAuthentication: {
      getCurrentUser: async () => ({ user }),
      signInAnonymously: async () => { user = { uid: 'anon' + nextUid++, isAnonymous: true, providerData: [] }; log.push(['anon', user.uid]); return { user }; },
      linkWithGoogle: async () => {
        if (window.__googleTaken) throw { code: 'auth/credential-already-in-use', message: 'credential-already-in-use' };
        user = { ...user, isAnonymous: false, displayName: 'عبدالله', providerData: [{ providerId: 'google.com', displayName: 'عبدالله' }] };
        return { user };
      },
      signInWithGoogle: async () => { user = { uid: window.__googleTaken || 'g1', isAnonymous: false, displayName: 'عبدالله', providerData: [{ providerId: 'google.com' }] }; return { user }; },
      signOut: async () => { user = null; },
      deleteUser: async () => { log.push(['deleteUser', user.uid]); user = null; }
    },
    FirebaseFirestore: {
      getDocument: async ({ reference }) => { authed(); return { snapshot: { id: reference.split('/')[1], path: reference, data: db[reference] ? JSON.parse(JSON.stringify(db[reference])) : null } }; },
      setDocument: async ({ reference, data, merge }) => {
        const existing = db[reference];
        const next = merge && existing ? { ...existing, ...data } : data;
        rulesWrite(reference, next, existing);
        db[reference] = JSON.parse(JSON.stringify(next));
      },
      deleteDocument: async ({ reference }) => { authed(); delete db[reference]; },
      getCollection: async ({ reference, compositeFilter }) => {
        authed();
        const f = compositeFilter.queryConstraints[0];
        if (!(f.fieldPath === 'referrer' && f.value === user.uid)) throw new Error('permission-denied list');
        return { snapshots: Object.keys(db).filter((k) => k.startsWith(reference + '/') && db[k][f.fieldPath] === f.value).map((k) => ({ id: k, data: db[k] })) };
      }
    }
  };
  window.Capacitor = { isNativePlatform: () => true, Plugins: P };
  window.__fire = (n, arg) => listeners[n] && listeners[n](arg);
  window.__setUser = (u) => { user = u; };
};

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Riyadh' });
  await ctx.route('**/js/config.js', (r) => r.fulfill({ contentType: 'application/javascript',
    body: `window.APP_CONFIG={firebase:true,providers:['google','facebook'],shareBase:'https://yl.github.io/tasbih-app/i/',playUrl:'https://play.google.com/store/apps/details?id=com.yellowline.tasbih',privacyUrl:'https://yl.github.io/tasbih-app/privacy.html',version:'1.0.9'};` }));
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  // قاعدة بيانات مشتركة: الداعي لديه كود مسبقاً
  await p.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1');
      window.__db = { 'codes/INVITE7': { uid: 'inviter', createdAt: 1 } };
      window.__installRef = 'utm_source=x&r%3DINVITE7';
      const d = new Date(); const k = (x) => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
      const y = new Date(d); y.setDate(d.getDate() - 1);
      window.__widgetPending = { [k(d)]: 30, [k(y)]: 20 };
    }
  });
  await p.addInitScript(MOCK);
  await p.goto(ROOT + '/index.html');
  await p.waitForTimeout(700);
  const ok = (name) => console.log('✓', name);

  // ١) قبول الدعوة تلقائياً من Google Play
  let db = await p.evaluate(() => window.__db);
  const anonUid = Object.keys(db).find((k) => k.startsWith('referrals/')).split('/')[1];
  assert.equal(db['referrals/' + anonUid].referrer, 'inviter');
  assert.equal(db['referrals/' + anonUid].total, 50); // يشمل ضغطات الويدجت
  ok('قبول الدعوة من مُحيل التثبيت (بدون اسم: referrer + total فقط)');

  // ويدجت: ضغطات قبل فتح التطبيق تُضاف لأيامها
  const w0 = await p.evaluate(() => ({ today: App.dayCount(App.state, App.date.dayKey(new Date()), 'istighfar'), y: App.dayCount(App.state, App.date.addDays(App.date.dayKey(new Date()), -1), 'istighfar'), ws: window.__widgetState }));
  assert.equal(w0.today, 30); assert.equal(w0.y, 20); assert.equal(w0.ws.count, 30);
  ok('ضغطات الويدجت (اليوم ٣٠، أمس ٢٠) تُضاف للإحصائيات ويُحدَّث الويدجت');

  // ٢) أول تشغيل: اختيار الهدف ثم العدّ
  if (await p.locator('#celebrate').isVisible()) { assert.match(await p.textContent('#celebrate h3'), /وسام/); await p.click('#celebrate .btn'); }
  await p.click('#homeCards .chips button:nth-child(1)'); // 100
  for (let i = 0; i < 70; i++) await p.locator('#tapBtn').dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 });
  assert.ok(await p.locator('#celebrate').isVisible());
  assert.match(await p.textContent('#celebrate h3'), /حققت هدفك/);
  await p.click('#celebrate .btn');
  ok('تحقيق الهدف يظهر التهنئة');

  // بطاقة الويدجت تظهر مرة واحدة وزر الإضافة يعمل
  assert.match(await p.textContent('#homeCards'), /شاشتك الرئيسية/);
  await p.click('#homeCards [data-pin]');
  await p.waitForTimeout(200);
  assert.ok((await p.evaluate(() => window.__log)).some((l) => l[0] === 'pin'));
  ok('بطاقة «أضف المسبحة للشاشة الرئيسية» تطلب إضافة الويدجت');

  // ٣) تفعيل التذكير
  await p.click('.tabbar button[data-tab="settings"]');
  await p.click('#remEnabled + .slider');
  await p.waitForTimeout(500);
  let log = await p.evaluate(() => window.__log);
  assert.ok(log.some((l) => l[0] === 'channel' && l[1] === 'tasbih_vibrate_v1' && l[2] === 'silence.wav'));
  assert.ok(log.some((l) => l[0] === 'deleteChannel'));
  const sched = await p.evaluate(() => window.__lastSchedule);
  assert.ok(sched.length > 5, 'scheduled ' + sched.length);
  assert.ok(sched.every((x) => x.isExactNotification === false)); // بدون إذن الدقة
  const fb = sched.find((x) => x.id === 900);
  assert.ok(fb && fb.schedule.on && fb.schedule.on.hour === 8);
  assert.equal(await p.isVisible('#exactRow'), true);
  ok(`تفعيل التذكير: ${sched.length} إشعار + احتياطي يومي، وقنوات الصوت/الاهتزاز/الصامت`);

  // الهدف محقق اليوم: لا تذكيرات استغفار متبقية لليوم
  const todayStr = await p.evaluate(() => App.date.dayKey(new Date()));
  const todayItems = sched.filter((x) => x.id !== 900 && App_dayKey(x));
  function App_dayKey() { return false; }
  const todayLeft = await p.evaluate(() => (window.__lastSchedule || []).filter((x) => x.id !== 900 && x.schedule.at && App.date.dayKey(new Date(x.schedule.at)) === App.date.dayKey(new Date()) && (x.extra || {}).kind !== 'prayer' && (x.extra || {}).kind !== 'weekly').length);
  assert.equal(todayLeft, 0);
  ok('بعد تحقيق الهدف لا تُجدول تذكيرات استغفار لبقية اليوم');

  // ٤) رفع العدد للداعي عند الخروج من التطبيق
  await p.evaluate(() => { App.cloud.pushProgress(true); });
  await p.waitForTimeout(300);
  db = await p.evaluate(() => window.__db);
  assert.equal(db['referrals/' + anonUid].total, 120);
  ok('يُرسل العدد فقط للداعي (١٢٠ = التطبيق + الويدجت)');

  // إيقاف المشاركة المجهولة
  await p.evaluate(() => { App.state.shareAnon = false; return App.cloud.pushProgress(true); });
  db = await p.evaluate(() => window.__db);
  assert.equal(db['referrals/' + anonUid].total, 0);
  await p.evaluate(() => { App.state.shareAnon = true; return App.cloud.pushProgress(true); });
  ok('خيار إيقاف إرسال العدد يعمل');

  // ٥) مشاركة التطبيق: كود دعوة + رابط
  await p.click('#shareAppBtn');
  await p.waitForTimeout(300);
  const shared = await p.evaluate(() => window.__shared);
  const code = await p.evaluate(() => App.state.referral.code);
  assert.match(code, /^[A-Z2-9]{6}$/);
  assert.equal(shared.url, 'https://yl.github.io/tasbih-app/i/?r=' + code);
  db = await p.evaluate(() => window.__db);
  assert.equal(db['codes/' + code].uid, anonUid);
  assert.ok(await p.isVisible('#myCodeRow'));
  ok('مشاركة التطبيق تنشئ كود ' + code + ' ورابط دعوة');

  // ٦) مشاركة صورة الإنجاز
  await p.click('.tabbar button[data-tab="stats"]');
  await p.click('#shareProgressBtn');
  await p.waitForTimeout(400);
  const sh2 = await p.evaluate(() => window.__shared);
  assert.equal(sh2.files.length, 1);
  assert.match(sh2.text, /١٢٠/);
  ok('مشاركة صورة الإنجاز');

  // ٧) إحصائية المدعوين كما يراها الداعي
  const stats = await p.evaluate(async () => {
    const realUser = (await Capacitor.Plugins.FirebaseAuthentication.getCurrentUser()).user;
    window.__db['referrals/someone2'] = { referrer: 'inviter', total: 250, updatedAt: 1 };
    window.__setUser({ uid: 'inviter', isAnonymous: true }); await App.cloud.refreshUser();
    const r = await App.cloud.referralStats();
    window.__setUser(realUser); await App.cloud.refreshUser();
    return r;
  });
  assert.deepEqual(stats, { people: 2, total: 370 });
  ok('الداعي يرى: شخصان — ٣٧٠ استغفار (بدون أسماء)');

  // ٨) تسجيل الدخول بقوقل (ربط المستخدم المجهول — نفس الكود)
  await p.click('.tabbar button[data-tab="settings"]');
  assert.ok(await p.isVisible('#googleBtn'));
  assert.ok(await p.isVisible('#facebookBtn'));
  await p.click('#googleBtn');
  await p.waitForTimeout(500);
  assert.ok(await p.isVisible('#userBox'));
  assert.match(await p.textContent('#userName'), /عبدالله/);
  db = await p.evaluate(() => window.__db);
  assert.equal(db['users/' + anonUid].backup.days[await p.evaluate(() => App.date.dayKey(new Date()))].astaghfar, 100);
  assert.equal(await p.evaluate(() => App.state.referral.code), code);
  ok('الدخول بقوقل يربط الحساب، يحفظ نسخة احتياطية، ويحتفظ بنفس كود الدعوة');

  // ٩) الحذف
  await p.click('#deleteAccBtn');
  await p.click('#modalOk');
  await p.waitForTimeout(400);
  db = await p.evaluate(() => window.__db);
  assert.ok(!db['users/' + anonUid] && !db['codes/' + code] && !db['referrals/' + anonUid]);
  assert.ok(await p.isVisible('#guestBox'));
  ok('حذف الحساب يمسح كل بياناته السحابية ويرجع لوضع الضيف');

  // ١٠) دخول بحساب موجود مسبقاً على جوال آخر (دمج)
  await p.evaluate(() => {
    window.__googleTaken = 'g-existing';
    window.__db['users/g-existing'] = { code: 'OLDCODE', backup: { days: { '2026-01-01': { astaghfar: 500 } }, goal: 300, goalUpdatedAt: 1 } };
  });
  const anon2 = await p.evaluate(async () => {
    await App.cloud.myCode(); // مستخدم مجهول جديد
    const u = App.cloud.user();
    App.state.referral.referredBy = 'INVITE7'; App.state.referral.applied = false;
    await App.cloud.applyReferral();
    return { uid: u.uid, code: App.state.referral.code };
  });
  assert.ok((await p.evaluate(() => window.__db))['referrals/' + anon2.uid]);
  await p.click('#googleBtn');
  await p.waitForTimeout(500);
  const merged = await p.evaluate(() => ({ old: App.state.days['2026-01-01'], code: App.state.referral.code, remote: Object.keys(window.__db['users/g-existing'].backup.days).length }));
  assert.equal(merged.old.astaghfar, 500);
  assert.equal(merged.code, 'OLDCODE');
  assert.ok(merged.remote >= 2);
  db = await p.evaluate(() => window.__db);
  assert.ok(!db['referrals/' + anon2.uid] && !db['codes/' + anon2.code], 'old anon cleaned');
  assert.equal(db['referrals/g-existing'].referrer, 'inviter'); // يُحسب مرة واحدة تحت الحساب الجديد
  ok('الدخول لحساب موجود يدمج البيانات من الجهازين ويعتمد كوده');

  // ١١) الويدجت أثناء غياب التطبيق + قائمة تذكيرات اليوم
  const ws = await p.evaluate(async () => {
    App.state.goal = 5000; App.state.reminders.interval = { on: true, min: 30 }; App.state.reminders.window = { start: '00:00', end: '23:59' };
    await App.notify.reschedule({ force: true }); window.__fire('appStateChange', { isActive: false });
    await new Promise((r) => setTimeout(r, 400));
    return window.__widgetState;
  });
  assert.equal(ws.goal, 5000);
  assert.ok(ws.reminders.length > 0 && ws.reminders.every((r) => r.at > Date.now() && r.id >= 1000));
  await p.evaluate(() => { window.__widgetPending = { [App.date.dayKey(new Date())]: 7 }; window.__fire('appStateChange', { isActive: true }); });
  await p.waitForTimeout(400);
  await p.click('.tabbar button[data-tab="home"]');
  const afterFg = await p.evaluate(() => ({ c: App.dayCount(App.state, App.date.dayKey(new Date()), 'istighfar'), ws: window.__widgetState.count, shown: document.getElementById('tapCount').textContent }));
  assert.equal(afterFg.c, 107); assert.equal(afterFg.ws, 107); assert.equal(afterFg.shown, '١٠٧');
  ok('ويدجت: يستلم الهدف وتذكيرات اليوم، وضغطاته (٧) تظهر عند العودة للتطبيق');

  // ١٢) زر الرجوع في أندرويد
  await p.evaluate(() => window.__fire('backButton'));
  assert.ok(await p.locator('#tab-home').isVisible());
  ok('زر الرجوع يعيد للمسبحة');

  console.log(errs.length ? 'أخطاء: ' + errs.join(' | ') : '\nلا أخطاء في الصفحة');
  await b.close();
  if (errs.length) process.exit(1);
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
