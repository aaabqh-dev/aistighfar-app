/* الحساب والمزامنة والدعوات (Firebase عبر إضافات أصلية).
   - التطبيق يعمل كاملاً بدون حساب. لا نطلب التسجيل عند الفتح.
   - الحساب الاختياري (قوقل/فيسبوك) = نسخة احتياطية ومزامنة بين الأجهزة.
   - الدعوات: كل مستخدم له كود. من يثبّت عبر رابطك يُرسل "عدده فقط" بدون اسم.
     فيظهر لك: "استغفر معك ٧ أشخاص — ١٢٬٤٠٠ استغفار".
   - مستخدم مجهول (Anonymous) يُنشأ بصمت فقط عند الحاجة (المشاركة أو قبول دعوة). */
(function (App) {
  'use strict';

  const C = (App.cloud = {});
  const cfg = window.APP_CONFIG || {};
  const Auth = () => App.plugin('FirebaseAuthentication');
  const Db = () => App.plugin('FirebaseFirestore');
  const Referrer = () => App.plugin('InstallReferrer');
  const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // بدون أحرف ملتبسة

  C.enabled = () => !!(cfg.firebase && Auth() && Db());
  C.providers = () => (C.enabled() ? (cfg.providers || []) : []);

  // ---------- المستخدم ----------
  let currentUser = null;
  C.user = () => currentUser;
  C.isGuest = () => !currentUser || currentUser.isAnonymous;

  C.refreshUser = async function () {
    if (!C.enabled()) return null;
    try { currentUser = (await Auth().getCurrentUser()).user || null; } catch (e) { currentUser = null; }
    syncAccountState();
    return currentUser;
  };

  function syncAccountState() {
    const acc = App.state.account;
    if (currentUser && !currentUser.isAnonymous) {
      const p = (currentUser.providerData || [])[0];
      acc.uid = currentUser.uid;
      acc.provider = p ? p.providerId : null;
      acc.name = currentUser.displayName || (p && p.displayName) || null;
    } else {
      acc.uid = null; acc.provider = null; acc.name = null;
    }
  }

  async function ensureUser() {
    if (!C.enabled()) throw new Error('cloud-disabled');
    if (!currentUser) await C.refreshUser();
    if (!currentUser) {
      const res = await Auth().signInAnonymously();
      currentUser = res.user;
    }
    return currentUser;
  }

  // ---------- Firestore ----------
  async function getDoc(ref) {
    try { return (await Db().getDocument({ reference: ref })).snapshot.data || null; } catch (e) { return null; }
  }
  function setDoc(ref, data, merge) {
    return Db().setDocument({ reference: ref, data, merge: merge !== false });
  }

  // ---------- كود الدعوة ----------
  function randomCode() {
    let c = '';
    const buf = new Uint32Array(6);
    (window.crypto || {}).getRandomValues ? window.crypto.getRandomValues(buf) : buf.forEach((_, i) => (buf[i] = Math.random() * 1e9));
    for (const n of buf) c += CODE_ALPHABET[n % CODE_ALPHABET.length];
    return c;
  }

  C.myCode = async function () {
    const s = App.state;
    if (s.referral.code) return s.referral.code;
    const u = await ensureUser();
    const existing = await getDoc('users/' + u.uid);
    if (existing && existing.code) { s.referral.code = existing.code; App.saveNow(); return existing.code; }
    for (let i = 0; i < 5; i++) {
      const code = randomCode();
      if (await getDoc('codes/' + code)) continue; // مستخدم مسبقاً
      await setDoc('codes/' + code, { uid: u.uid, createdAt: Date.now() }, false);
      await setDoc('users/' + u.uid, { code }, true);
      s.referral.code = code;
      App.saveNow();
      return code;
    }
    throw new Error('code-failed');
  };

  C.shareLink = function (code) {
    const base = cfg.shareBase || '';
    if (base) return base + '?r=' + encodeURIComponent(code);
    return (cfg.playUrl || '') + '&referrer=' + encodeURIComponent('r=' + code);
  };

  // ---------- قبول دعوة ----------
  function parseReferrer(str) {
    if (!str) return null;
    const m = /(?:^|[&?])r=([A-Z0-9]{4,12})/i.exec(decodeURIComponent(str));
    return m ? m[1].toUpperCase() : null;
  }
  C.parseReferrer = parseReferrer;

  // يُستدعى مرة عند أول تشغيل بعد التثبيت
  C.readInstallReferrer = async function () {
    const s = App.state;
    if (s.referral.checkedInstall) return;
    s.referral.checkedInstall = true;
    App.saveNow();
    const r = Referrer();
    if (!r) return;
    try {
      const res = await r.getReferrer();
      const code = parseReferrer(res && res.referrer);
      if (code && !s.referral.referredBy) {
        s.referral.referredBy = code;
        App.saveNow();
        await C.applyReferral();
      }
    } catch (e) {}
  };

  // قبول كود يدوياً (من شاشة الإعدادات)
  C.enterCode = async function (raw) {
    const code = String(raw || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{4,12}$/.test(code)) return { ok: false, reason: 'invalid' };
    const s = App.state;
    if (s.referral.code === code) return { ok: false, reason: 'own' };
    if (s.referral.applied) return { ok: false, reason: 'already' };
    s.referral.referredBy = code;
    App.saveNow();
    return C.applyReferral();
  };

  C.applyReferral = async function () {
    const s = App.state;
    if (!C.enabled() || !s.referral.referredBy || s.referral.applied) return { ok: false, reason: 'skip' };
    try {
      const u = await ensureUser();
      const target = await getDoc('codes/' + s.referral.referredBy);
      if (!target || !target.uid) return { ok: false, reason: 'notfound' };
      if (target.uid === u.uid) return { ok: false, reason: 'own' };
      await setDoc('referrals/' + u.uid, {
        referrer: target.uid,
        total: s.shareAnon ? myTotal() : 0,
        updatedAt: Date.now()
      }, false);
      s.referral.applied = true;
      s.referral.referrerUid = target.uid;
      App.saveNow();
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: 'error', error: String(e && e.message || e) };
    }
  };

  function myTotal() {
    const sum = App.summary(App.state, App.date.dayKey(new Date()), 'istighfar');
    return sum.total;
  }

  // ---------- إحصائية من دعوتهم (بدون أسماء) ----------
  C.referralStats = async function () {
    if (!C.enabled()) return null;
    const u = await ensureUser();
    const res = await Db().getCollection({
      reference: 'referrals',
      compositeFilter: { type: 'and', queryConstraints: [{ type: 'where', fieldPath: 'referrer', opStr: '==', value: u.uid }] }
    });
    const docs = (res.snapshots || []).map((x) => x.data || {});
    return { people: docs.length, total: docs.reduce((a, d) => a + (Number(d.total) || 0), 0) };
  };

  // ---------- رفع العدد للداعي + نسخة احتياطية للحساب ----------
  let lastPush = 0;
  C.pushProgress = async function (force) {
    if (!C.enabled()) return;
    const now = Date.now();
    if (!force && now - lastPush < 10 * 60000) return;
    lastPush = now;
    const s = App.state;
    try {
      if (s.referral.applied && currentUser) {
        await setDoc('referrals/' + currentUser.uid, {
          referrer: s.referral.referrerUid,
          total: s.shareAnon ? myTotal() : 0,
          updatedAt: now
        }, true);
      }
      if (currentUser && !currentUser.isAnonymous) await C.sync();
    } catch (e) {}
  };

  // ---------- المزامنة (للحساب المسجّل فقط) ----------
  C.sync = async function () {
    if (!currentUser || currentUser.isAnonymous) return;
    const s = App.state;
    const ref = 'users/' + currentUser.uid;
    const remote = (await getDoc(ref)) || {};
    const r = remote.backup || {};
    s.days = App.mergeDays(s.days, r.days || {});
    s.legacyTotal = Math.max(s.legacyTotal || 0, r.legacyTotal || 0);
    s.goalLog = Object.assign({}, r.goalLog || {}, s.goalLog);
    s.achievements = Object.assign({}, r.achievements || {}, s.achievements);
    if ((r.goalUpdatedAt || 0) > (s.goalUpdatedAt || 0)) {
      s.goal = r.goal; s.goalSetAt = r.goalSetAt; s.goalUpdatedAt = r.goalUpdatedAt;
    }
    if (!s.referral.code && remote.code) s.referral.code = remote.code;
    await setDoc(ref, {
      backup: {
        days: s.days, legacyTotal: s.legacyTotal || 0, goal: s.goal, goalSetAt: s.goalSetAt || null,
        goalUpdatedAt: s.goalUpdatedAt || 0, goalLog: s.goalLog, achievements: s.achievements, updatedAt: Date.now()
      }
    }, true);
    s.account.lastSync = Date.now();
    App.saveNow();
  };

  // ---------- تسجيل الدخول ----------
  // إن كان مستخدماً مجهولاً نربط الحساب (فيبقى كود الدعوة نفسه)، وإن كان الحساب موجوداً مسبقاً ندخل عليه وندمج
  C.signIn = async function (provider) {
    const A = Auth();
    const name = provider === 'facebook' ? 'Facebook' : 'Google';
    await C.refreshUser();
    let result;
    if (currentUser && currentUser.isAnonymous) {
      try {
        result = await A['linkWith' + name]();
      } catch (e) {
        const msg = String(e && (e.code || e.message) || e);
        if (/already|in-use|exists/i.test(msg)) {
          // ننظّف بيانات المستخدم المجهول قبل الانتقال (حتى لا يُحسب مرتين عند من دعاه)
          const st = App.state;
          await Db().deleteDocument({ reference: 'referrals/' + currentUser.uid }).catch(() => {});
          if (st.referral.code) await Db().deleteDocument({ reference: 'codes/' + st.referral.code }).catch(() => {});
          st.referral.applied = false;
          await A.signOut().catch(() => {});
          result = await A['signInWith' + name]();
          App.state.referral.code = null; // نعتمد كود الحساب الموجود
        } else throw e;
      }
    } else {
      result = await A['signInWith' + name]();
    }
    currentUser = (result && result.user) || (await A.getCurrentUser()).user;
    syncAccountState();
    await C.sync();
    if (App.state.referral.referredBy && !App.state.referral.applied) await C.applyReferral();
    App.saveNow();
    return currentUser;
  };

  C.signOut = async function () {
    if (!C.enabled()) return;
    await Auth().signOut().catch(() => {});
    currentUser = null;
    App.state.referral.code = null;
    syncAccountState();
    App.saveNow();
  };

  // حذف الحساب وبياناته السحابية (شرط من Google Play)
  C.deleteAccount = async function () {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const code = App.state.referral.code;
    const del = (ref) => Db().deleteDocument({ reference: ref }).catch(() => {});
    await del('referrals/' + uid);
    if (code) await del('codes/' + code);
    await del('users/' + uid);
    try { await Auth().deleteUser(); } catch (e) { await Auth().signOut().catch(() => {}); }
    currentUser = null;
    App.state.referral = { code: null, referredBy: null, applied: false, checkedInstall: true };
    syncAccountState();
    App.saveNow();
  };

  C.init = async function () {
    if (!C.enabled()) return;
    await C.refreshUser();
    await C.readInstallReferrer();
    if (App.state.referral.referredBy && !App.state.referral.applied) C.applyReferral();
    C.pushProgress(true);
  };
})(window.App = window.App || {});
