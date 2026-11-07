/* الحالة والتخزين والإحصائيات والأهداف الذكية والأوسمة.
   كل الدوال الحسابية هنا "نقية" (لا تلمس الواجهة) لتسهيل الاختبار. */
(function (App) {
  'use strict';

  const KEY = 'tasbih_v2';
  const DAY_MS = 86400000;

  // ---------- التواريخ (بالتوقيت المحلي) ----------
  function pad(n) { return String(n).padStart(2, '0'); }
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
  function addDays(k, n) { const d = parseKey(k); d.setDate(d.getDate() + n); return dayKey(d); }
  function diffDays(a, b) { return Math.round((parseKey(b) - parseKey(a)) / DAY_MS); } // b - a
  App.date = { dayKey, parseKey, addDays, diffDays, pad };

  App.isIstighfar = (id) => id === 'astaghfar' || id === 'astaghfar_tawba';

  // ---------- الحالة الافتراضية ----------
  function defaults() {
    return {
      v: 2,
      days: {},                 // { 'YYYY-MM-DD': { dhikrId: count } }
      legacyTotal: 0,           // من الإصدار الأول (عداد واحد)
      current: 'astaghfar',
      goal: 0,                  // الهدف اليومي للاستغفار (0 = بدون هدف)
      goalSetAt: null,
      goalLog: {},              // الهدف المعمول به في كل يوم
      smart: { lastSuggestAt: null },
      reminders: {
        enabled: false,
        times: [],
        interval: { on: false, min: 30 },
        window: { start: '08:00', end: '22:00' },
        prayers: { on: false, city: 'riyadh', offset: 10, which: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true } },
        sound: 'voice',          // voice | vibrate | silent
        stopWhenGoalMet: true,
        weekly: true
      },
      cycle: 100,
      theme: 'auto',            // auto | light | dark
      achievements: {},
      firstRunDone: false,
      weeklySeen: null,
      referral: { code: null, referredBy: null, applied: false, referrerUid: null, checkedInstall: false },
      shareAnon: true,          // مشاركة عددي (بدون اسم) مع من دعاني
      account: { uid: null, provider: null, name: null, lastSync: null }
    };
  }

  function deepMerge(base, extra) {
    if (!extra || typeof extra !== 'object' || Array.isArray(extra)) return extra === undefined ? base : extra;
    const out = Array.isArray(base) ? [] : Object.assign({}, base);
    for (const k of Object.keys(extra)) {
      out[k] = (base && typeof base[k] === 'object' && base[k] !== null && !Array.isArray(base[k]))
        ? deepMerge(base[k], extra[k]) : extra[k];
    }
    return out;
  }

  function migrateV1(state, ls) {
    try {
      const c = parseInt(ls.getItem('astaghfar_counter') || '0', 10);
      if (Number.isFinite(c) && c > 0) state.legacyTotal = c;
      const t = JSON.parse(ls.getItem('astaghfar_reminder_times') || '[]');
      if (Array.isArray(t)) state.reminders.times = t.filter((x) => /^\d{2}:\d{2}$/.test(x));
      state.reminders.enabled = ls.getItem('astaghfar_notifications_enabled') === 'true';
      if (c > 0 || state.reminders.times.length) state.firstRunDone = true;
    } catch (e) {}
    return state;
  }

  App.load = function (ls) {
    ls = ls || window.localStorage;
    let s = defaults();
    try {
      const raw = ls.getItem(KEY);
      if (raw) s = deepMerge(s, JSON.parse(raw));
      else s = migrateV1(s, ls);
    } catch (e) {}
    App.state = s;
    return s;
  };

  let saveTimer = null;
  App.saveNow = function () {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    try { window.localStorage.setItem(KEY, JSON.stringify(App.state)); } catch (e) {}
  };
  App.saveSoon = function () {
    if (!saveTimer) saveTimer = setTimeout(App.saveNow, 400);
  };

  // ---------- العدّ ----------
  App.increment = function (s, dhikr, now) {
    const k = dayKey(now || new Date());
    const day = s.days[k] || (s.days[k] = {});
    day[dhikr] = (day[dhikr] || 0) + 1;
    if (s.goal > 0 && s.goalLog[k] === undefined) s.goalLog[k] = s.goal;
    return day[dhikr];
  };

  // عدد يوم معيّن: dhikr = معرّف ذكر | 'istighfar' | 'all'
  function dayCount(s, k, dhikr) {
    const d = s.days[k];
    if (!d) return 0;
    if (dhikr === 'all') return Object.values(d).reduce((a, b) => a + b, 0);
    if (dhikr === 'istighfar') return (d.astaghfar || 0) + (d.astaghfar_tawba || 0);
    return d[dhikr] || 0;
  }
  App.dayCount = dayCount;

  function goalFor(s, k) {
    return s.goalLog[k] !== undefined ? s.goalLog[k] : s.goal;
  }

  // ---------- الإحصائيات ----------
  App.series = function (s, endKey, n, dhikr) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const k = addDays(endKey, -i);
      out.push({ key: k, count: dayCount(s, k, dhikr), goal: goalFor(s, k) });
    }
    return out;
  };

  App.monthSeries = function (s, year, month, dhikr) { // month: 0..11
    const days = new Date(year, month + 1, 0).getDate();
    const out = [];
    for (let d = 1; d <= days; d++) {
      const k = year + '-' + pad(month + 1) + '-' + pad(d);
      out.push({ key: k, day: d, count: dayCount(s, k, dhikr) });
    }
    return out;
  };

  App.yearSeries = function (s, year, dhikr) {
    return Array.from({ length: 12 }, (_, m) =>
      App.monthSeries(s, year, m, dhikr).reduce((a, x) => a + x.count, 0));
  };

  App.summary = function (s, todayKey, dhikr) {
    dhikr = dhikr || 'istighfar';
    const keys = Object.keys(s.days).sort();
    let total = 0, active = 0, best = { key: null, count: 0 }, goalDays = 0;
    for (const k of keys) {
      const c = dayCount(s, k, dhikr);
      if (c > 0) { total += c; active++; }
      if (c > best.count) best = { key: k, count: c };
      const g = goalFor(s, k);
      if (dhikr === 'istighfar' && g > 0 && dayCount(s, k, 'istighfar') >= g) goalDays++;
    }
    const daysTotal = total;
    if (dhikr === 'istighfar' || dhikr === 'astaghfar' || dhikr === 'all') total += s.legacyTotal || 0;

    // السلاسل: أي ذكر في اليوم يحسب
    let longest = 0, run = 0, prev = null;
    for (const k of keys) {
      if (dayCount(s, k, 'all') <= 0) continue;
      run = (prev && diffDays(prev, k) === 1) ? run + 1 : 1;
      longest = Math.max(longest, run);
      prev = k;
    }
    let current = 0;
    let cursor = dayCount(s, todayKey, 'all') > 0 ? todayKey : addDays(todayKey, -1);
    while (dayCount(s, cursor, 'all') > 0) { current++; cursor = addDays(cursor, -1); }

    return {
      total,
      today: dayCount(s, todayKey, dhikr),
      activeDays: active,
      average: active ? Math.round(daysTotal / active) : 0,
      bestDay: best.count,
      bestDayKey: best.key,
      goalDays,
      currentStreak: current,
      longestStreak: Math.max(longest, current)
    };
  };

  App.weekSummary = function (s, todayKey) {
    const thisWeek = App.series(s, todayKey, 7, 'istighfar');
    const lastWeek = App.series(s, addDays(todayKey, -7), 7, 'istighfar');
    const sum = (a) => a.reduce((x, y) => x + y.count, 0);
    const met = thisWeek.filter((d) => d.goal > 0 && d.count >= d.goal).length;
    const best = thisWeek.reduce((a, b) => (b.count > a.count ? b : a), thisWeek[0]);
    return { total: sum(thisWeek), prevTotal: sum(lastWeek), goalDays: met, best, days: thisWeek };
  };

  // ---------- الأهداف الذكية ----------
  function roundTo(n, step) { return Math.round(n / step) * step; }
  App.nextGoalUp = function (g) {
    if (g < 100) return Math.max(g + 10, Math.ceil((g * 1.25) / 10) * 10);
    return Math.max(g + 100, roundTo(g * 1.2, 100));
  };
  App.nextGoalDown = function (g) {
    if (g <= 100) return g; // لا نقترح أقل من ١٠٠
    return Math.max(100, roundTo(g * 0.6, 100));
  };

  /* يعيد اقتراحاً أو null:
     - رفع: حقق الهدف ١٢ يوماً من آخر ١٤ يوماً مكتملاً (بعد ١٤ يوماً على الأقل من ضبط الهدف)
     - تخفيف: حقق الهدف يومين أو أقل من آخر ٧ أيام (بعد ٧ أيام من ضبط الهدف) */
  App.smartSuggestion = function (s, todayKey) {
    const g = s.goal;
    if (!g || g <= 0) return null;
    if (s.smart.lastSuggestAt && diffDays(s.smart.lastSuggestAt, todayKey) < 7) return null;
    const sinceSet = s.goalSetAt ? diffDays(s.goalSetAt, todayKey) : 999;
    const yesterday = addDays(todayKey, -1);
    const met = (k) => dayCount(s, k, 'istighfar') >= goalFor(s, k);

    if (sinceSet >= 14) {
      const last14 = App.series(s, yesterday, 14, 'istighfar');
      const metCount = last14.filter((d) => met(d.key)).length;
      if (metCount >= 12) {
        return { type: 'up', from: g, to: App.nextGoalUp(g), metCount, window: 14 };
      }
    }
    if (sinceSet >= 7) {
      const last7 = App.series(s, yesterday, 7, 'istighfar');
      const metCount = last7.filter((d) => met(d.key)).length;
      const lower = App.nextGoalDown(g);
      if (metCount <= 2 && lower < g) {
        return { type: 'down', from: g, to: lower, metCount, window: 7 };
      }
    }
    return null;
  };

  App.setGoal = function (s, g, todayKey) {
    s.goal = Math.max(0, Math.round(g) || 0);
    s.goalSetAt = todayKey;
    s.goalUpdatedAt = Date.now();
    s.goalLog[todayKey] = s.goal; // اليوم يُحسب بالهدف الجديد
  };

  // ---------- الأوسمة ----------
  App.checkAchievements = function (s, todayKey) {
    const sum = App.summary(s, todayKey, 'istighfar');
    const fresh = [];
    for (const a of App.ACHIEVEMENTS) {
      if (!s.achievements[a.id] && a.test(sum)) {
        s.achievements[a.id] = todayKey;
        fresh.push(a);
      }
    }
    return fresh;
  };

  // ---------- دمج البيانات (للمزامنة السحابية) ----------
  // لكل يوم ولكل ذكر نأخذ الأكبر — دمج آمن يمكن تكراره بلا تضاعف
  App.mergeDays = function (a, b) {
    const out = JSON.parse(JSON.stringify(a || {}));
    for (const [k, day] of Object.entries(b || {})) {
      const t = out[k] || (out[k] = {});
      for (const [id, c] of Object.entries(day)) t[id] = Math.max(t[id] || 0, c || 0);
    }
    return out;
  };

  App.defaults = defaults;
})(window.App = window.App || {});
