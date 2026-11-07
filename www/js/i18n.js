/* نظام اللغات: اختيار اللغة، الترجمة، الاتجاه، وتنسيق الأرقام والأوقات والتواريخ.
   كل لغة في ملف www/js/lang/<code>.js يعرّف App.I18N[code] = { key: 'نص {متغير}' }.
   المفاتيح الناقصة في أي لغة تُعرض بالإنجليزية ثم العربية. */
(function (App) {
  'use strict';

  App.I18N = App.I18N || {};

  // اللغات المدعومة: الاسم بلغتها، الاتجاه، ولغة التنسيق (Intl)
  App.LANGS = [
    { code: 'ar', name: 'العربية', dir: 'rtl', locale: 'ar-EG' },
    { code: 'en', name: 'English', dir: 'ltr', locale: 'en-US' },
    { code: 'id', name: 'Bahasa Indonesia', dir: 'ltr', locale: 'id-ID' },
    { code: 'tr', name: 'Türkçe', dir: 'ltr', locale: 'tr-TR' },
    { code: 'ur', name: 'اردو', dir: 'rtl', locale: 'ur-PK' },
    { code: 'bn', name: 'বাংলা', dir: 'ltr', locale: 'bn-BD' },
    { code: 'fa', name: 'فارسی', dir: 'rtl', locale: 'fa-IR' },
    { code: 'ha', name: 'Hausa', dir: 'ltr', locale: 'ha-NG' }
  ];

  const L = (App.lang = { code: 'ar', dir: 'rtl', locale: 'ar-EG' });

  App.detectLang = function () {
    const prefs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'ar']);
    for (const p of prefs) {
      const base = String(p).toLowerCase().split(/[-_]/)[0];
      const code = base === 'in' ? 'id' : base; // أندرويد القديم يسمي الإندونيسية "in"
      if (App.LANGS.some((l) => l.code === code)) return code;
    }
    return 'en';
  };

  App.setLang = function (pref) {
    const code = !pref || pref === 'auto' ? App.detectLang() : pref;
    const info = App.LANGS.find((l) => l.code === code) || App.LANGS[0];
    L.code = info.code; L.dir = info.dir; L.locale = info.locale;
    if (typeof document !== 'undefined') {
      document.documentElement.lang = info.code;
      document.documentElement.dir = info.dir;
    }
    return info.code;
  };

  App.t = function (key, vars) {
    const v = (App.I18N[L.code] || {})[key];
    let s = v !== undefined ? v : (App.I18N.en || {})[key] !== undefined ? App.I18N.en[key] : (App.I18N.ar || {})[key];
    if (s === undefined) return key;
    if (Array.isArray(s)) return s;
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''));
    return s;
  };
  // قائمة نصوص (مثل رسائل التذكير)
  App.tList = function (key) {
    const v = App.t(key);
    return Array.isArray(v) ? v : [v];
  };

  // ---------- التنسيق ----------
  const cache = {};
  function nf(opts) {
    const k = L.locale + JSON.stringify(opts || {});
    if (!cache[k]) {
      try { cache[k] = new Intl.NumberFormat(L.locale, opts); } catch (e) { cache[k] = new Intl.NumberFormat('en-US', opts); }
    }
    return cache[k];
  }
  function df(opts) {
    const k = 'd' + L.locale + JSON.stringify(opts);
    if (!cache[k]) {
      // نستخدم التقويم الميلادي دائماً (العربية/الفارسية قد تفترض تقويماً آخر)
      const loc = L.locale + '-u-ca-gregory';
      try { cache[k] = new Intl.DateTimeFormat(loc, opts); } catch (e) { cache[k] = new Intl.DateTimeFormat('en-US', opts); }
    }
    return cache[k];
  }

  App.fmt = {
    num: (n) => nf().format(Number(n) || 0),
    // رقم بدون فواصل (للسنوات)
    plain: (n) => nf({ useGrouping: false }).format(Number(n) || 0),
    compact: (n) => {
      n = Number(n) || 0;
      if (n < 1000) return nf().format(n);
      try { return nf({ notation: 'compact', maximumFractionDigits: 1 }).format(n); } catch (e) { return nf().format(n); }
    },
    percent: (n) => nf({ style: 'percent', maximumFractionDigits: 0 }).format((Number(n) || 0) / 100),
    // "HH:MM" أو Date ← وقت بصيغة المستخدم
    time: (v) => {
      let d = v;
      if (typeof v === 'string') { const [h, m] = v.split(':').map(Number); d = new Date(2000, 0, 1, h, m); }
      return df({ hour: 'numeric', minute: '2-digit' }).format(d);
    },
    // "YYYY-MM-DD" ← "7 نوفمبر"
    date: (key) => df({ day: 'numeric', month: 'long' }).format(App.date.parseKey(key)),
    dateTime: (ms) => df({ day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(ms)),
    month: (i, short) => df({ month: short ? 'short' : 'long' }).format(new Date(2026, i, 1)),
    monthYear: (y, i) => df({ month: 'long', year: 'numeric' }).format(new Date(y, i, 1)),
    // 0 = الأحد
    weekday: (i, short) => df({ weekday: short ? 'short' : 'long' }).format(new Date(2026, 1, 1 + i)) // 1 فبراير 2026 أحد
  };
})(window.App = window.App || {});
