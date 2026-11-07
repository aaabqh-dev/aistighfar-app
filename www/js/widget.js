/* ويدجت الشاشة الرئيسية: مزامنة الضغطات بين الويدجت والتطبيق.
   - الويدجت يعدّ «أستغفر الله» بدون فتح التطبيق ويحفظ الضغطات في تخزين أصلي.
   - عند فتح التطبيق: نسحب ضغطات الويدجت (drain) ونضيفها لإحصائيات كل يوم.
   - عند الخروج من التطبيق: نرسل عدد اليوم والهدف للويدجت (push). */
(function (App) {
  'use strict';
  const W = (App.widget = {});
  const P = () => App.plugin('TasbihWidget');
  const REM_KEY = 'tasbih_widget_rem';

  W.available = () => !!P();
  W.installed = null; // عدد الويدجتات المضافة (يُحدَّث من info)
  W.canPin = false;

  W.refreshInfo = async function () {
    if (!P()) return;
    try {
      const r = await P().info();
      W.installed = r.installed || 0;
      W.canPin = !!r.canPin;
    } catch (e) {}
  };

  // يضيف ضغطات الويدجت لأيامها — يعيد عدد الضغطات المضافة
  W.drain = async function () {
    if (!P()) return 0;
    let counts = {};
    try { counts = (await P().drain()).counts || {}; } catch (e) { return 0; }
    const s = App.state;
    let added = 0;
    for (const [day, c] of Object.entries(counts)) {
      const n = Math.floor(Number(c) || 0);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || n <= 0) continue;
      const d = s.days[day] || (s.days[day] = {});
      d.astaghfar = (d.astaghfar || 0) + n;
      if (s.goal > 0 && s.goalLog[day] === undefined) s.goalLog[day] = s.goal;
      added += n;
    }
    if (added) App.saveNow();
    return added;
  };

  // تذكيرات الاستغفار المتبقية لليوم — يلغيها الويدجت إن تحقق الهدف منه
  W.setReminders = function (list) {
    try { localStorage.setItem(REM_KEY, JSON.stringify(list || [])); } catch (e) {}
  };
  function reminders() {
    try { return JSON.parse(localStorage.getItem(REM_KEY) || '[]'); } catch (e) { return []; }
  }

  W.push = async function () {
    if (!P()) return;
    const s = App.state;
    const day = App.date.dayKey(new Date());
    try {
      await P().update({
        day,
        count: App.dayCount(s, day, 'istighfar'),
        goal: s.goal || 0,
        cycle: Number(s.cycle) || 0,
        text: 'أستغفر الله',
        reminders: (s.reminders.enabled && s.reminders.stopWhenGoalMet) ? reminders().filter((r) => r.day === day) : []
      });
    } catch (e) {}
  };

  W.requestPin = async function () {
    if (!P()) return false;
    await W.refreshInfo();
    if (!W.canPin) return false;
    try { return !!(await P().requestPin()).requested; } catch (e) { return false; }
  };
})(window.App = window.App || {});
