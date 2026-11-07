/* مُخطِّط التذكيرات (دالة نقية): يحسب قائمة الإشعارات للأيام القادمة.
   - أوقات محددة + كل X دقيقة داخل ساعات النشاط + بعد الصلوات + ملخص أسبوعي
   - رسائل تتغير حسب التقدم، وتتوقف تذكيرات اليوم عند تحقيق الهدف
   - حد أقصى للعدد (أندرويد يسمح بحوالي ٥٠٠ منبّه لكل تطبيق)
   - تذكير يومي احتياطي متكرر (في أول وقت تذكير) حتى لا تنقطع التذكيرات إن لم يُفتح التطبيق؛
     ولا نجدول تذكيراً آخر في نفس الدقيقة لتجنّب التكرار */
(function (App) {
  'use strict';

  const MAX_ITEMS = 300;
  const MAX_DAYS = 7;
  const ID_BASE = 1000;
  App.NOTIF_IDS = { base: ID_BASE, max: ID_BASE + MAX_ITEMS, fallback: 900, test: 9999 };

  const CHANNELS = {
    voice: 'tasbih_voice_v1',
    vibrate: 'tasbih_vibrate_v1',
    silent: 'tasbih_silent_v1'
  };
  App.CHANNELS = CHANNELS;

  function toMin(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
  function atMinute(dayKey, minutes) {
    const d = App.date.parseKey(dayKey);
    d.setMinutes(minutes); // يتعامل مع ما بعد منتصف الليل تلقائياً
    return d;
  }
  function fill(tpl, vars) {
    return tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? App.fmtNum(vars[k]) : ''));
  }
  function pick(list, seed) { return list[Math.abs(seed) % list.length]; }

  App.fmtNum = function (n) {
    return typeof n === 'number' ? n.toLocaleString('ar-EG') : n;
  };

  // ---------- أوقات الصلاة (مكتبة adhan، بدون إنترنت) ----------
  const METHOD_BY_CITY = {
    kuwait: 'Kuwait', doha: 'Qatar', dubai: 'Dubai', abudhabi: 'Dubai', cairo: 'Egyptian',
    istanbul: 'Turkey', muscat: 'MuslimWorldLeague', manama: 'MuslimWorldLeague'
  };
  App.prayerTimes = function (dayKey, cityId) {
    const A = window.adhan;
    const city = App.CITIES.find((c) => c.id === cityId);
    if (!A || !city) return null;
    const saudi = ['makkah', 'madinah', 'riyadh', 'jeddah', 'dammam', 'khobar', 'taif', 'tabuk', 'buraydah', 'abha', 'khamis', 'hail', 'jazan', 'najran', 'hofuf', 'jubail', 'yanbu', 'arar', 'sakaka', 'baha'];
    const methodName = saudi.includes(cityId) ? 'UmmAlQura' : (METHOD_BY_CITY[cityId] || 'MuslimWorldLeague');
    const fn = A.CalculationMethod[methodName] || A.CalculationMethod.MuslimWorldLeague;
    const pt = new A.PrayerTimes(new A.Coordinates(city.lat, city.lng), App.date.parseKey(dayKey), fn());
    return { fajr: pt.fajr, dhuhr: pt.dhuhr, asr: pt.asr, maghrib: pt.maghrib, isha: pt.isha };
  };

  // ---------- مصادر التذكير ليوم واحد ----------
  function itemsForDay(s, dayKey) {
    const r = s.reminders;
    const out = [];
    for (const t of r.times || []) out.push({ at: atMinute(dayKey, toMin(t)), kind: 'time' });

    if (r.interval && r.interval.on && r.interval.min >= 5) {
      const start = toMin(r.window.start);
      let end = toMin(r.window.end);
      if (end <= start) end += 1440; // نافذة تتجاوز منتصف الليل
      for (let m = start; m <= end; m += r.interval.min) out.push({ at: atMinute(dayKey, m), kind: 'interval' });
    }

    if (r.prayers && r.prayers.on) {
      const pt = App.prayerTimes(dayKey, r.prayers.city);
      if (pt) {
        for (const p of Object.keys(App.PRAYER_NAMES)) {
          if (!r.prayers.which[p]) continue;
          const at = new Date(pt[p].getTime() + (r.prayers.offset || 0) * 60000);
          at.setSeconds(0, 0);
          out.push({ at, kind: 'prayer', prayer: p });
        }
      }
    }

    if (r.weekly && App.date.parseKey(dayKey).getDay() === 5) { // الجمعة
      out.push({ at: atMinute(dayKey, 17 * 60), kind: 'weekly' });
    }
    return out;
  }

  // ---------- النص المناسب لكل تذكير ----------
  function bodyFor(s, item, ctx) {
    const seed = Math.floor(item.at.getTime() / 60000);
    const M = App.MESSAGES;
    if (item.kind === 'weekly') return pick(M.weekly, seed);
    if (item.kind === 'prayer') return fill(pick(M.afterPrayer, seed), { prayer: App.PRAYER_NAMES[item.prayer] });

    const goal = s.goal;
    const isToday = ctx.dayIndex === 0;
    const done = isToday ? ctx.todayDone : 0;
    const left = Math.max(0, goal - done);
    const vars = { goal, done, left, streak: ctx.streak };

    // غياب: لم يستغفر منذ يومين أو أكثر في ذلك اليوم
    const idle = ctx.idleDaysBefore + ctx.dayIndex;
    if (idle >= 2 && done === 0) return pick(M.missYou, seed);

    if (goal > 0) {
      if (done === 0) {
        const hour = item.at.getHours();
        if (item.isFirstOfDay && hour < 11) return fill(pick(M.morning, seed), vars);
        if (ctx.streak >= 3 && hour >= 18) return fill(pick(M.streak, seed), vars);
        return fill(pick(M.notStarted, seed), vars);
      }
      if (left <= Math.max(1, Math.round(goal * 0.2))) return fill(pick(M.almost, seed), vars);
      return fill(pick(M.progress, seed), vars);
    }
    return fill(pick(M.notStarted, seed), vars);
  }

  /* يعيد { items: [...], fallback: {...}|null, horizonEnd: dayKey } */
  App.planReminders = function (s, now) {
    const r = s.reminders;
    if (!r.enabled) return { items: [], fallback: null, horizonEnd: null };

    const todayKey = App.date.dayKey(now);
    const sum = App.summary(s, todayKey, 'istighfar');
    const todayDone = App.dayCount(s, todayKey, 'istighfar');
    const goalMet = s.goal > 0 && todayDone >= s.goal;

    // أيام بلا نشاط قبل اليوم
    let idleDaysBefore = 0;
    if (todayDone === 0) {
      let k = App.date.addDays(todayKey, -1);
      while (idleDaysBefore < 30 && App.dayCount(s, k, 'all') === 0) { idleDaysBefore++; k = App.date.addDays(k, -1); }
      if (idleDaysBefore >= 30) idleDaysBefore = Object.keys(s.days).length ? 30 : 0; // مستخدم جديد: لا "اشتقنا لك"
    }

    // دقيقة التذكير الاحتياطي اليومي
    const hasSources = (r.times && r.times.length) || (r.interval && r.interval.on) || (r.prayers && r.prayers.on);
    const fbMinute = (r.times && r.times.length) ? toMin([...r.times].sort()[0])
      : (r.interval && r.interval.on ? toMin(r.window.start) : 20 * 60);

    const minTime = now.getTime() + 30000;
    const items = [];
    let horizonEnd = todayKey;

    for (let d = 0; d < MAX_DAYS; d++) {
      const dayKey = App.date.addDays(todayKey, d);
      let dayItems = itemsForDay(s, dayKey)
        .filter((it) => it.at.getTime() > minTime)
        .sort((a, b) => a.at - b.at);

      // إزالة التكرار في نفس الدقيقة (الأولوية: صلاة > أسبوعي > وقت محدد > فترة)
      const rank = { prayer: 0, weekly: 1, time: 2, interval: 3 };
      const byMinute = new Map();
      for (const it of dayItems) {
        const key = Math.floor(it.at.getTime() / 60000);
        const ex = byMinute.get(key);
        if (!ex || rank[it.kind] < rank[ex.kind]) byMinute.set(key, it);
      }
      dayItems = [...byMinute.values()].sort((a, b) => a.at - b.at)
        .filter((it) => !(hasSources && (it.kind === 'time' || it.kind === 'interval') &&
          it.at.getHours() * 60 + it.at.getMinutes() === fbMinute % 1440));

      // تحقق الهدف اليوم: نوقف تذكيرات الاستغفار المتبقية (تبقى تذكيرات الصلاة والملخص)
      if (d === 0 && goalMet && r.stopWhenGoalMet) {
        dayItems = dayItems.filter((it) => it.kind === 'prayer' || it.kind === 'weekly');
      }

      const firstIstighfar = dayItems.find((it) => it.kind === 'time' || it.kind === 'interval');
      if (firstIstighfar) firstIstighfar.isFirstOfDay = true;

      if (d > 0 && items.length + dayItems.length > MAX_ITEMS) break;
      for (const it of dayItems) {
        if (items.length >= MAX_ITEMS) break;
        it.body = bodyFor(s, it, { dayIndex: d, todayDone, streak: sum.currentStreak, idleDaysBefore });
        items.push(it);
      }
      horizonEnd = dayKey;
      if (items.length >= MAX_ITEMS) break;
    }

    items.forEach((it, i) => {
      it.id = ID_BASE + i;
      it.title = it.kind === 'weekly' ? '📊 ملخص الأسبوع' : '🌿 مسبحة الاستغفار';
      it.channelId = CHANNELS[r.sound] || CHANNELS.voice;
    });

    // تذكير احتياطي يومي متكرر في أول وقت تذكير.
    // نصّه يُحسب لموعده القادم (ويُحدَّث كلما أُعيدت الجدولة عند إغلاق التطبيق).
    let fallback = null;
    if (hasSources) {
      const m = fbMinute % 1440;
      let next = atMinute(todayKey, m);
      if (next.getTime() <= minTime) next = atMinute(App.date.addDays(todayKey, 1), m);
      const dayIndex = App.date.dayKey(next) === todayKey ? 0 : 1;
      const body = (dayIndex === 0 && goalMet)
        ? fill(App.MESSAGES.goalDone[Math.floor(next.getTime() / 60000) % App.MESSAGES.goalDone.length], { goal: s.goal })
        : bodyFor(s, { at: next, kind: 'time', isFirstOfDay: true }, { dayIndex, todayDone, streak: sum.currentStreak, idleDaysBefore });
      fallback = {
        id: App.NOTIF_IDS.fallback,
        on: { hour: Math.floor(m / 60), minute: m % 60 },
        title: '🌿 مسبحة الاستغفار',
        body,
        channelId: CHANNELS[r.sound] || CHANNELS.voice
      };
    }

    return { items, fallback, horizonEnd };
  };
})(window.App = window.App || {});
