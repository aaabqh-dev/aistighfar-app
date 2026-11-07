/* طبقة الإشعارات: تحوّل خطة المُخطِّط إلى إشعارات نظام حقيقية (تعمل والتطبيق مغلق). */
(function (App) {
  'use strict';

  const Cap = window.Capacitor;
  App.isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  App.plugin = (name) => (App.isNative && Cap.Plugins ? Cap.Plugins[name] || null : null);

  const N = (App.notify = {});
  const LN = () => App.plugin('LocalNotifications');
  const SIG_KEY = 'tasbih_sched_sig';

  N.available = () => !!LN();

  // ---------- القنوات (صوت القناة ثابت بعد إنشائها في أندرويد) ----------
  N.ensureChannels = async function () {
    const ln = LN();
    if (!ln) return;
    const base = { visibility: 1, lights: true, lightColor: '#2d5a27' };
    const defs = [
      { id: App.CHANNELS.voice, name: App.t('ch_voice'), importance: 4, sound: 'astaghfar.wav', vibration: true },
      { id: App.CHANNELS.vibrate, name: App.t('ch_vibrate'), importance: 4, sound: 'silence.wav', vibration: true },
      { id: App.CHANNELS.silent, name: App.t('ch_silent'), importance: 2, vibration: false }
    ];
    for (const d of defs) {
      try { await ln.createChannel(Object.assign({ description: d.name }, base, d)); } catch (e) {}
    }
    try { await ln.deleteChannel({ id: 'astaghfar_reminders_v1' }); } catch (e) {} // قناة الإصدار الأول
  };

  N.checkPermission = async function () {
    const ln = LN();
    if (!ln) return false;
    try { return (await ln.checkPermissions()).display === 'granted'; } catch (e) { return false; }
  };

  N.requestPermission = async function () {
    const ln = LN();
    if (!ln) return false;
    try {
      let st = await ln.checkPermissions();
      if (st.display !== 'granted') st = await ln.requestPermissions();
      return st.display === 'granted';
    } catch (e) { return false; }
  };

  N.exactAllowed = async function () {
    const ln = LN();
    if (!ln || !ln.checkExactNotificationSetting) return true;
    try { return (await ln.checkExactNotificationSetting()).exact_alarm === 'granted'; } catch (e) { return true; }
  };

  N.openExactSettings = async function () {
    const ln = LN();
    if (ln && ln.changeExactNotificationSetting) {
      try { await ln.changeExactNotificationSetting(); } catch (e) {}
    }
  };

  async function cancelOurs(ln) {
    try {
      const pending = await ln.getPending();
      const ids = (pending.notifications || [])
        .map((n) => n.id)
        .filter((id) => id !== App.NOTIF_IDS.test)
        .map((id) => ({ id }));
      for (let i = 0; i < ids.length; i += 100) await ln.cancel({ notifications: ids.slice(i, i + 100) });
    } catch (e) {}
  }

  function signature(plan, exact) {
    const parts = plan.items.map((i) => i.id + '|' + i.at.getTime() + '|' + i.body + '|' + i.channelId);
    if (plan.fallback) { const { nextAt, ...fb } = plan.fallback; parts.push('fb|' + JSON.stringify(fb)); }
    return String(exact) + '#' + App.lang.code + '#' + parts.join('~');
  }

  // تنفيذ متسلسل (يمنع التداخل)
  let chain = Promise.resolve();
  N.reschedule = function (opts) {
    chain = chain.then(() => doReschedule(opts || {}), () => doReschedule(opts || {}));
    return chain;
  };

  async function doReschedule(opts) {
    const ln = LN();
    if (!ln) return { skipped: 'web' };
    const s = App.state;
    if (!s.reminders.enabled || !(await N.checkPermission())) {
      await cancelOurs(ln);
      localStorage.removeItem(SIG_KEY);
      if (App.widget) App.widget.setReminders([]);
      return { cancelled: true };
    }
    const plan = App.planReminders(s, new Date());
    const exact = await N.exactAllowed();
    const sig = signature(plan, exact);
    const info = { count: plan.items.length + (plan.fallback ? 1 : 0), horizonEnd: plan.horizonEnd, nextAt: plan.nextAt, goalMetToday: plan.goalMetToday, exact };
    if (!opts.force && localStorage.getItem(SIG_KEY) === sig) return Object.assign({ unchanged: true }, info);

    await cancelOurs(ln);
    const toNative = (i) => ({
      id: i.id,
      title: i.title,
      body: i.body,
      channelId: i.channelId,
      smallIcon: 'ic_stat_tasbih',
      schedule: { at: i.at, allowWhileIdle: true },
      isExactNotification: exact,
      extra: { kind: i.kind }
    });
    try {
      for (let k = 0; k < plan.items.length; k += 50) {
        await ln.schedule({ notifications: plan.items.slice(k, k + 50).map(toNative) });
      }
      if (plan.fallback) {
        const f = plan.fallback;
        await ln.schedule({
          notifications: [{
            id: f.id, title: f.title, body: f.body, channelId: f.channelId, smallIcon: 'ic_stat_tasbih',
            schedule: { on: Object.assign({ second: 0 }, f.on), allowWhileIdle: true },
            isExactNotification: exact, extra: { kind: 'fallback' }
          }]
        });
      }
      localStorage.setItem(SIG_KEY, sig);
      // تذكيرات الاستغفار المتبقية لليوم: يلغيها الويدجت إن حققت هدفك منه
      const today = App.date.dayKey(new Date());
      if (App.widget) App.widget.setReminders(plan.items
        .filter((i) => (i.kind === 'time' || i.kind === 'interval') && App.date.dayKey(i.at) === today)
        .map((i) => ({ id: i.id, at: i.at.getTime(), day: today })));
      return info;
    } catch (e) {
      console.warn('schedule failed', e);
      localStorage.removeItem(SIG_KEY);
      return { error: String(e && e.message || e) };
    }
  }

  // تجربة فورية (بدون جدولة): تتأكد من الإذن والقناة والصوت مباشرة
  N.test = async function () {
    const ln = LN();
    if (!ln) return { ok: false, reason: 'web' };
    if (!(await N.requestPermission())) return { ok: false, reason: 'permission' };
    await N.ensureChannels();
    const ch = App.CHANNELS[App.state.reminders.sound] || App.CHANNELS.voice;
    try {
      await ln.schedule({
        notifications: [{
          id: App.NOTIF_IDS.test,
          title: App.t('notif_title'),
          body: App.t('notif_test_body'),
          channelId: ch,
          smallIcon: 'ic_stat_tasbih'
        }]
      });
      return { ok: true };
    } catch (e) {
      const msg = String((e && (e.message || e.code)) || e);
      return { ok: false, reason: /disabled|permission/i.test(msg) ? 'permission' : 'error', error: msg };
    }
  };

  // فتح صفحات إعدادات الجوال الخاصة بالتطبيق
  const Helper = () => App.plugin('TasbihWidget');
  N.openNotificationSettings = async function () {
    try { await Helper().openNotificationSettings(); return true; } catch (e) { return false; }
  };
  N.openAppSettings = async function () {
    try { await Helper().openAppSettings(); return true; } catch (e) { return false; }
  };
})(window.App = window.App || {});
