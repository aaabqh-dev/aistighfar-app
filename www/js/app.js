/* الواجهة: المسبحة، الإحصائيات، الفضل، الإعدادات. */
(function (App) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const n = (x) => Number(x || 0).toLocaleString('ar-EG');
  const D = App.date;
  const todayKey = () => D.dayKey(new Date());
  const ui = (App.ui = {});
  const cfg = window.APP_CONFIG || {};
  let s;

  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const DAYS = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

  // =============== أدوات عامة ===============
  let toastTimer;
  ui.toast = function (msg, ms) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms || 2800);
  };

  ui.confirm = function (o) {
    return new Promise((resolve) => {
      $('modalTitle').textContent = o.title || 'تأكيد';
      $('modalMsg').textContent = o.msg || '';
      const ok = $('modalOk'), cancel = $('modalCancel'), box = $('modal');
      ok.textContent = o.ok || 'تأكيد';
      ok.className = 'btn ' + (o.danger ? 'danger' : 'primary');
      cancel.textContent = o.cancel || 'إلغاء';
      box.hidden = false;
      const done = (v) => { box.hidden = true; ok.onclick = cancel.onclick = box.onclick = null; resolve(v); };
      ok.onclick = () => done(true);
      cancel.onclick = () => done(false);
      box.onclick = (e) => { if (e.target === box) done(false); };
    });
  };

  function openSheet(title, build) {
    $('sheetTitle').textContent = title;
    const body = $('sheetBody');
    body.replaceChildren();
    build(body);
    $('sheet').hidden = false;
  }
  function closeSheet() { $('sheet').hidden = true; }
  $('sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') closeSheet(); });

  function celebrate(icon, title, text) {
    const c = $('celebrate');
    c.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'box';
    box.innerHTML = `<div class="big"></div><h3></h3><p class="muted"></p><button class="btn primary block" type="button">الحمد لله</button>`;
    box.querySelector('.big').textContent = icon;
    box.querySelector('h3').textContent = title;
    box.querySelector('p').textContent = text || '';
    box.querySelector('button').onclick = () => { c.hidden = true; };
    c.appendChild(box);
    c.hidden = false;
    c.onclick = (e) => { if (e.target === c) c.hidden = true; };
  }

  function haptic(kind) {
    const H = App.plugin('Haptics');
    if (H) {
      if (kind === 'heavy') H.impact({ style: 'HEAVY' }).catch(() => {});
      else if (kind === 'success') H.notification({ type: 'SUCCESS' }).catch(() => {});
      else H.impact({ style: 'LIGHT' }).catch(() => {});
      return;
    }
    if (navigator.vibrate) {
      try { navigator.vibrate(kind === 'heavy' ? 60 : kind === 'success' ? [40, 60, 80] : 10); } catch (e) {}
    }
  }

  function applyTheme() {
    const dark = s.theme === 'dark' || (s.theme === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#0f1a0e' : '#2d5a27';
  }

  function segmented(id, value, onPick) {
    const wrap = $(id);
    wrap.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(value)));
    if (!wrap.dataset.bound) {
      wrap.dataset.bound = '1';
      wrap.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        wrap.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        onPick(b.dataset.v);
      });
    }
  }

  function fmtTime(t) {
    const [h, m] = t.split(':').map(Number);
    return `${n(h % 12 === 0 ? 12 : h % 12)}:${String(m).padStart(2, '0').replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])} ${h < 12 ? 'ص' : 'م'}`;
  }
  function fmtDate(k) {
    const d = D.parseKey(k);
    return `${n(d.getDate())} ${MONTHS[d.getMonth()]}`;
  }

  // =============== التبويبات ===============
  let currentTab = 'home';
  function showTab(name) {
    currentTab = name;
    document.querySelectorAll('.screen').forEach((x) => x.classList.toggle('active', x.id === 'tab-' + name));
    document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
    window.scrollTo(0, 0);
    if (name === 'home') renderHome();
    if (name === 'stats') renderStats();
    if (name === 'virtue') renderVirtue();
    if (name === 'settings') renderSettings();
  }
  document.querySelector('.tabbar').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) showTab(b.dataset.tab);
  });

  // =============== المسبحة ===============
  const RING_C = 2 * Math.PI * 100;
  const dhikr = () => App.ADHKAR.find((d) => d.id === s.current) || App.ADHKAR[0];

  function counterState() {
    const k = todayKey();
    const isIst = App.isIstighfar(s.current);
    const count = App.dayCount(s, k, s.current);
    const ist = App.dayCount(s, k, 'istighfar');
    const cycle = Number(s.cycle) || 0;
    if (isIst && s.goal > 0) {
      return { count, progress: Math.min(1, ist / s.goal), done: ist >= s.goal, ist, mode: 'goal' };
    }
    if (cycle > 0) {
      const inCycle = count % cycle;
      return { count, progress: (inCycle === 0 && count > 0) ? 1 : inCycle / cycle, inCycle, cycle, mode: 'cycle' };
    }
    return { count, progress: 0, mode: 'none' };
  }

  function progressText(st) {
    if (st.mode === 'goal') {
      if (st.done) return `🎉 حققت هدفك اليوم — <b>${n(st.ist)}</b> استغفار`;
      return `باقي <b>${n(s.goal - st.ist)}</b> على هدفك (${n(s.goal)})`;
    }
    if (App.isIstighfar(s.current) && !s.goal) return 'اضبط <b>هدفك اليومي</b> من الإعدادات 🎯';
    if (st.mode === 'cycle') return `الدورة ${n(st.inCycle || (st.count ? st.cycle : 0))} من ${n(st.cycle)}`;
    return `اليوم: <b>${n(st.count)}</b>`;
  }

  function renderCounter(bump) {
    const st = counterState();
    $('tapCount').textContent = n(st.count);
    $('ringBar').style.strokeDasharray = RING_C;
    $('ringBar').style.strokeDashoffset = RING_C * (1 - st.progress);
    $('ringBar').classList.toggle('done', !!st.done);
    $('progressLine').innerHTML = progressText(st);
    if (bump) { const c = $('tapCount'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
    if (!$('fullscreen').hidden) {
      $('fsCount').textContent = n(st.count);
      $('fsSub').innerHTML = progressText(st);
      if (bump) { const f = $('fsCount'); f.classList.remove('bump'); void f.offsetWidth; f.classList.add('bump'); }
    }
  }

  function renderStreak() {
    const sum = App.summary(s, todayKey(), 'istighfar');
    const chip = $('streakChip');
    chip.hidden = sum.currentStreak < 2;
    chip.querySelector('span').textContent = n(sum.currentStreak) + ' يوم';
  }

  function renderHome() {
    const d = dhikr();
    $('dhikrChipText').textContent = d.text;
    $('tapText').textContent = d.text;
    $('fsText').textContent = d.text;
    renderCounter(false);
    renderStreak();
    renderHomeCards();
    renderDailyText();
  }

  function renderDailyText() {
    const all = App.AYAT.map((a) => ({ ...a, q: true })).concat(App.AHADITH);
    const idx = Math.floor(D.parseKey(todayKey()).getTime() / 86400000) % all.length;
    const t = all[idx];
    const el = $('dailyText');
    el.innerHTML = '<p class="quran"></p><p class="ref"></p>';
    el.querySelector('.quran').textContent = t.q ? `﴿${t.text}﴾` : `«${t.text}»`;
    el.querySelector('.ref').textContent = t.ref;
  }

  let tapsSinceCheck = 0;
  function tap() {
    const k = todayKey();
    const before = App.dayCount(s, k, 'istighfar');
    const c = App.increment(s, s.current, new Date());
    App.saveSoon();
    const cycle = Number(s.cycle) || 0;
    const after = App.dayCount(s, k, 'istighfar');
    if (s.goal > 0 && before < s.goal && after >= s.goal) {
      haptic('success');
      App.saveNow();
      celebrate('🎉', 'حققت هدفك اليوم!', `${n(s.goal)} استغفار — تقبّل الله منك`);
      scheduleSoon(0);
      checkAchievements();
      renderStreak();
    } else if (cycle > 0 && c % cycle === 0) {
      haptic('heavy');
    } else {
      haptic('light');
    }
    if (++tapsSinceCheck >= 100) { tapsSinceCheck = 0; checkAchievements(); }
    if (c === 1) renderStreak();
    renderCounter(true);
  }

  function checkAchievements() {
    const fresh = App.checkAchievements(s, todayKey());
    if (fresh.length) {
      App.saveNow();
      const a = fresh[fresh.length - 1];
      if ($('celebrate').hidden) celebrate(a.icon, 'وسام جديد: ' + a.title, a.desc);
      else ui.toast(`${a.icon} وسام جديد: ${a.title}`);
    }
  }

  $('tapBtn').addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    tap();
  });
  $('tapBtn').addEventListener('contextmenu', (e) => e.preventDefault());
  $('progressLine').addEventListener('click', () => { if (App.isIstighfar(s.current) && !s.goal) showTab('settings'); });
  $('streakChip').addEventListener('click', () => showTab('stats'));

  $('dhikrChip').addEventListener('click', () => {
    openSheet('اختر الذكر', (body) => {
      const list = document.createElement('div');
      list.className = 'sheet-list';
      const k = todayKey();
      for (const d of App.ADHKAR) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = d.id === s.current ? 'on' : '';
        b.innerHTML = '<span></span><small></small>';
        b.querySelector('span').textContent = d.text;
        const c = App.dayCount(s, k, d.id);
        b.querySelector('small').textContent = c ? `اليوم ${n(c)}` : '';
        b.onclick = () => { s.current = d.id; App.saveNow(); closeSheet(); renderHome(); };
        list.appendChild(b);
      }
      body.appendChild(list);
    });
  });

  // وضع اللمس الكامل
  $('fullscreenBtn').addEventListener('click', () => { $('fullscreen').hidden = false; renderCounter(false); });
  $('fsClose').addEventListener('click', (e) => { e.stopPropagation(); $('fullscreen').hidden = true; });
  $('fsClose').addEventListener('pointerdown', (e) => e.stopPropagation());
  $('fullscreen').addEventListener('pointerdown', (e) => {
    if (e.target.closest('.fs-close')) return;
    tap();
  });
  $('fullscreen').addEventListener('contextmenu', (e) => e.preventDefault());

  // ---------- بطاقات الرئيسية ----------
  function card(cls, html) {
    const c = document.createElement('div');
    c.className = 'card note-card ' + (cls || '');
    c.innerHTML = html;
    return c;
  }

  function renderHomeCards() {
    const box = $('homeCards');
    box.replaceChildren();
    const k = todayKey();

    // ١) أول تشغيل: اختيار الهدف
    if (!s.firstRunDone) {
      const c = card('', `<p><b>🎯 اختر هدفك اليومي من الاستغفار</b><br><span class="muted">تقدر تغيّره في أي وقت</span></p><div class="chips"></div><div class="row"><button class="btn ghost small" type="button" data-later>لاحقاً</button></div>`);
      const chips = c.querySelector('.chips');
      for (const g of App.GOAL_PRESETS) {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = n(g);
        b.onclick = () => { App.setGoal(s, g, k); s.firstRunDone = true; App.saveNow(); renderHome(); ui.toast(`هدفك اليومي: ${n(g)} 🌿`); scheduleSoon(0); };
        chips.appendChild(b);
      }
      c.querySelector('[data-later]').onclick = () => { s.firstRunDone = true; App.saveNow(); renderHome(); };
      box.appendChild(c);
      return;
    }

    // ٢) دعوة لتفعيل التذكير (مرة واحدة)
    if (!s.reminders.enabled && !s.remPromptDone && App.notify.available()) {
      const c = card('', `<p><b>🔔 تبي نذكّرك بالاستغفار؟</b><br><span class="muted">تختار الأوقات، وكل كم دقيقة، وبصوت أو بدون</span></p><div class="row"><button class="btn primary small" type="button" data-yes>فعّل التذكير</button><button class="btn ghost small" type="button" data-no>لاحقاً</button></div>`);
      c.querySelector('[data-yes]').onclick = async () => { s.remPromptDone = true; App.saveNow(); showTab('settings'); await enableReminders(true); };
      c.querySelector('[data-no]').onclick = () => { s.remPromptDone = true; App.saveNow(); renderHomeCards(); };
      box.appendChild(c);
    }

    // ويدجت الشاشة الرئيسية (مرة واحدة)
    if (App.widget.available() && App.widget.installed === 0 && !s.widgetPromptDone) {
      const c = card('', `<p><b>✨ جديد: المسبحة على شاشتك الرئيسية</b><br><span class="muted">استغفر بضغطة من الشاشة الرئيسية بدون ما تفتح التطبيق، ويتحدّث عدّادك وهدفك تلقائياً</span></p><div class="row"><button class="btn primary small" type="button" data-pin>📌 أضفها</button><button class="btn ghost small" type="button" data-no>لاحقاً</button></div>`);
      c.querySelector('[data-pin]').onclick = async () => { s.widgetPromptDone = true; App.saveNow(); await addWidget(); renderHomeCards(); };
      c.querySelector('[data-no]').onclick = () => { s.widgetPromptDone = true; App.saveNow(); renderHomeCards(); };
      box.appendChild(c);
    }

    // ٣) اقتراح الهدف الذكي
    const sg = App.smartSuggestion(s, k);
    if (sg) {
      const html = sg.type === 'up'
        ? `<p><b>ما شاء الله 🌟</b> حققت هدفك ${n(sg.metCount)} يوم من آخر ${n(sg.window)} يوم.<br>تبي ترفعه من <b>${n(sg.from)}</b> إلى <b>${n(sg.to)}</b>؟</p><div class="row"><button class="btn primary small" type="button" data-yes>ارفع الهدف 💪</button><button class="btn ghost small" type="button" data-no>لاحقاً</button></div>`
        : `<p><b>القليل الدائم خير من الكثير المنقطع 🤍</b><br>تبي نخفف هدفك مؤقتاً من <b>${n(sg.from)}</b> إلى <b>${n(sg.to)}</b>؟</p><div class="row"><button class="btn primary small" type="button" data-yes>نعم، خففه</button><button class="btn ghost small" type="button" data-no>لا، أبقيه</button></div>`;
      const c = card(sg.type === 'up' ? 'gold' : '', html);
      c.querySelector('[data-yes]').onclick = () => {
        App.setGoal(s, sg.to, k); s.smart.lastSuggestAt = k; App.saveNow(); renderHome(); scheduleSoon(0);
        ui.toast(`هدفك الجديد: ${n(sg.to)} 🎯`);
      };
      c.querySelector('[data-no]').onclick = () => { s.smart.lastSuggestAt = k; App.saveNow(); renderHomeCards(); };
      box.appendChild(c);
    }

    // ٤) ملخص الأسبوع (الجمعة والسبت)
    const dow = D.parseKey(k).getDay();
    const friday = D.addDays(k, dow === 6 ? -1 : 0);
    if ((dow === 5 || dow === 6) && s.weeklySeen !== friday) {
      const w = App.weekSummary(s, k);
      if (w.total > 0) {
        const diff = w.prevTotal ? Math.round(((w.total - w.prevTotal) / w.prevTotal) * 100) : null;
        const trend = diff === null ? '' : diff >= 0 ? ` <span class="muted">(↑ ${n(diff)}٪ عن الأسبوع الماضي)</span>` : ` <span class="muted">(↓ ${n(-diff)}٪)</span>`;
        const c = card('gold', `<p><b>📊 ملخص أسبوعك</b><br>${n(w.total)} استغفار${trend}${s.goal ? `<br>حققت هدفك ${n(w.goalDays)} من ٧ أيام` : ''}<br>أفضل يوم: ${DAYS[D.parseKey(w.best.key).getDay()]} (${n(w.best.count)})</p><div class="row"><button class="btn small" type="button" data-share>📤 شارك</button><button class="btn ghost small" type="button" data-ok>تم</button></div>`);
        c.querySelector('[data-ok]').onclick = () => { s.weeklySeen = friday; App.saveNow(); renderHomeCards(); };
        c.querySelector('[data-share]').onclick = () => App.share.progress();
        box.appendChild(c);
      }
    }
  }

  async function addWidget() {
    await App.widget.push();
    if (await App.widget.requestPin()) {
      ui.toast('اضغط «إضافة» في النافذة اللي ظهرت 📌', 4000);
    } else {
      ui.toast('اضغط مطولاً على الشاشة الرئيسية ← «الأدوات/Widgets» ← «مسبحة الاستغفار»', 6000);
    }
  }

  // =============== الإحصائيات ===============
  const st = { range: 'week', offset: 0, dhikr: 'istighfar' };

  function fillDhikrSelect() {
    const sel = $('statsDhikr');
    if (sel.options.length) return;
    const add = (v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); };
    add('istighfar', 'الاستغفار');
    add('all', 'كل الأذكار');
    App.ADHKAR.filter((d) => !App.isIstighfar(d.id)).forEach((d) => add(d.id, d.text));
    sel.addEventListener('change', () => { st.dhikr = sel.value; renderStats(); });
  }

  function renderStats() {
    fillDhikrSelect();
    const k = todayKey();
    const goal = st.dhikr === 'istighfar' ? s.goal : 0;
    $('statsRange').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.r === st.range));
    $('chartNext').disabled = st.offset === 0;
    const chart = $('chart');
    let data, title, total;

    if (st.range === 'week') {
      const end = D.addDays(k, -7 * st.offset);
      const series = App.series(s, end, 7, st.dhikr);
      data = series.map((d) => ({
        label: DAYS[D.parseKey(d.key).getDay()], count: d.count, today: d.key === k,
        met: goal > 0 && d.count >= (d.goal || goal)
      }));
      title = st.offset === 0 ? 'آخر ٧ أيام' : `${fmtDate(series[0].key)} – ${fmtDate(series[6].key)}`;
      total = series.reduce((a, d) => a + d.count, 0);
      App.charts.bars(chart, data, { goal, values: true });
    } else if (st.range === 'month') {
      const base = D.parseKey(k);
      const m = new Date(base.getFullYear(), base.getMonth() - st.offset, 1);
      const series = App.monthSeries(s, m.getFullYear(), m.getMonth(), st.dhikr);
      data = series.map((d) => ({ label: n(d.day), count: d.count, today: d.key === k, met: goal > 0 && d.count >= goal }));
      title = `${MONTHS[m.getMonth()]} ${n(m.getFullYear()).replace(/٬/g, '')}`;
      total = series.reduce((a, d) => a + d.count, 0);
      App.charts.bars(chart, data, { goal, labelEvery: 5 });
    } else {
      const y = D.parseKey(k).getFullYear() - st.offset;
      const months = App.yearSeries(s, y, st.dhikr);
      data = months.map((c, i) => ({ label: MONTHS[i].slice(0, 3), count: c, today: st.offset === 0 && i === new Date().getMonth() }));
      title = n(y).replace(/٬/g, '');
      total = months.reduce((a, c) => a + c, 0);
      App.charts.bars(chart, data, {});
    }
    $('chartTitle').textContent = title;
    $('chartSub').textContent = `المجموع: ${n(total)}`;

    // البطاقات
    const sum = App.summary(s, k, st.dhikr);
    const tiles = [
      [n(sum.today), 'اليوم'],
      [n(sum.total), 'المجموع الكلي'],
      [n(sum.average), 'متوسطك اليومي'],
      [n(sum.bestDay), 'أفضل يوم' + (sum.bestDayKey ? ` (${fmtDate(sum.bestDayKey)})` : '')],
      ['🔥 ' + n(sum.currentStreak), 'أيام متتالية الآن'],
      [n(sum.longestStreak), 'أطول سلسلة']
    ];
    if (st.dhikr === 'istighfar' && s.goal) tiles.push([n(sum.goalDays), 'يوم حققت فيه هدفك'], [n(sum.activeDays), 'يوم استغفرت فيه']);
    $('tiles').innerHTML = tiles.map(([b, l]) => `<div class="tile"><b>${b}</b><span>${l}</span></div>`).join('');

    App.charts.heatmap($('heatmap'), s, k, st.dhikr);

    // الأوسمة
    const wrap = $('achievements');
    wrap.replaceChildren();
    let got = 0;
    for (const a of App.ACHIEVEMENTS) {
      const on = !!s.achievements[a.id];
      if (on) got++;
      const b = document.createElement('div');
      b.className = 'badge' + (on ? ' on' : '');
      b.innerHTML = '<i></i><span></span>';
      b.querySelector('i').textContent = a.icon;
      b.querySelector('span').textContent = a.title;
      b.title = a.desc;
      b.onclick = () => ui.toast(`${a.icon} ${a.title}: ${a.desc}${on ? ' ✅' : ''}`);
      wrap.appendChild(b);
    }
    $('achCount').textContent = `${n(got)} / ${n(App.ACHIEVEMENTS.length)}`;
  }

  $('statsRange').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    st.range = b.dataset.r; st.offset = 0; renderStats();
  });
  $('chartPrev').addEventListener('click', () => { st.offset++; renderStats(); });
  $('chartNext').addEventListener('click', () => { if (st.offset > 0) { st.offset--; renderStats(); } });
  $('shareProgressBtn').addEventListener('click', () => App.share.progress());

  // =============== الفضل ===============
  let virtueDone = false;
  function renderVirtue() {
    if (virtueDone) return;
    virtueDone = true;
    $('benefits').innerHTML = App.BENEFITS.map((b) => `<div class="benefit"><i>${b.icon}</i><div>${b.title}<small>${b.ref}</small></div></div>`).join('');
    $('sayyidText').textContent = App.SAYYID_ISTIGHFAR.text;
    $('sayyidVirtue').textContent = '«' + App.SAYYID_ISTIGHFAR.virtue + '»';
    $('sayyidRef').textContent = App.SAYYID_ISTIGHFAR.ref;
    const render = (list, q) => list.map((t) => `<article><p class="quran">${q ? '﴿' + t.text + '﴾' : '«' + t.text + '»'}</p><p class="ref">${t.ref}</p></article>`).join('');
    $('ayatList').innerHTML = render(App.AYAT, true);
    $('hadithList').innerHTML = render(App.AHADITH, false);
  }

  // =============== الإعدادات ===============
  let schedTimer = null;
  function scheduleSoon(ms) {
    clearTimeout(schedTimer);
    schedTimer = setTimeout(async () => {
      const r = await App.notify.reschedule();
      updateSchedInfo(r);
    }, ms === undefined ? 700 : ms);
  }

  function updateSchedInfo(r) {
    const el = $('schedInfo');
    if (!el) return;
    if (!App.notify.available()) { el.textContent = 'التذكيرات تعمل داخل التطبيق على الجوال'; return; }
    if (!s.reminders.enabled || !r) { el.textContent = ''; return; }
    if (r.error) { el.textContent = 'تعذّرت الجدولة: ' + r.error; return; }
    if (typeof r.count === 'number') {
      el.textContent = r.count ? `✅ ${n(r.count)} تذكير مجدول${r.horizonEnd ? ' حتى ' + fmtDate(r.horizonEnd) : ''}، وتتجدد تلقائياً` : 'أضف وقتاً أو فعّل التذكير المتكرر';
    }
  }

  async function enableReminders(on) {
    if (on) {
      if (App.notify.available()) {
        const ok = await App.notify.requestPermission();
        if (!ok) {
          $('remEnabled').checked = false;
          ui.toast('لم يتم السماح بالإشعارات — فعّلها من إعدادات الجوال');
          return;
        }
        await App.notify.ensureChannels();
      }
      const r = s.reminders;
      if (!r.times.length && !r.interval.on && !r.prayers.on) {
        r.interval.on = true; r.interval.min = 60;
        ui.toast('فعّلنا تذكيراً كل ساعة من ٨ص إلى ١٠م — عدّله كما تحب');
      }
    }
    s.reminders.enabled = on;
    s.remPromptDone = true;
    App.saveNow();
    renderSettings();
    scheduleSoon(0);
  }

  function renderTimes() {
    const ul = $('timeList');
    ul.replaceChildren();
    const times = [...s.reminders.times].sort();
    if (!times.length) { ul.innerHTML = '<li class="empty">لا توجد أوقات</li>'; return; }
    for (const t of times) {
      const li = document.createElement('li');
      li.innerHTML = `<span>${fmtTime(t)}</span><button type="button" aria-label="حذف">×</button>`;
      li.querySelector('button').onclick = () => {
        s.reminders.times = s.reminders.times.filter((x) => x !== t);
        App.saveNow(); renderTimes(); scheduleSoon();
      };
      ul.appendChild(li);
    }
  }

  function renderPrayerPreview() {
    const pr = s.reminders.prayers;
    const pt = App.prayerTimes(todayKey(), pr.city);
    if (!pt) { $('prToday').textContent = ''; return; }
    const hm = (d) => fmtTime(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'));
    $('prToday').textContent = 'أوقات اليوم: ' + Object.keys(App.PRAYER_NAMES).map((p) => `${App.PRAYER_NAMES[p]} ${hm(pt[p])}`).join(' · ');
  }

  let settingsBound = false;
  function renderSettings() {
    const r = s.reminders;
    // الهدف
    const gc = $('goalChips');
    gc.replaceChildren();
    for (const g of [0].concat(App.GOAL_PRESETS)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = g ? n(g) : 'بدون';
      b.className = s.goal === g ? 'on' : '';
      b.onclick = () => setGoal(g);
      gc.appendChild(b);
    }
    if (s.goal && !App.GOAL_PRESETS.includes(s.goal)) $('goalCustom').value = s.goal;

    // التذكيرات
    $('remEnabled').checked = r.enabled;
    $('remBody').style.opacity = r.enabled ? '1' : '0.45';
    $('remBody').style.pointerEvents = r.enabled ? '' : 'none';
    segmented('soundMode', r.sound, (v) => {
      r.sound = v; App.saveNow(); scheduleSoon();
      ui.toast(v === 'voice' ? '🔊 بصوت «أستغفر الله»' : v === 'vibrate' ? '📳 اهتزاز بدون صوت' : '🔕 إشعار صامت');
    });
    renderTimes();
    $('intOn').checked = r.interval.on;
    $('intBody').hidden = !r.interval.on;
    const im = $('intMin');
    if (!im.options.length) App.INTERVALS.forEach((x) => { const o = document.createElement('option'); o.value = x.min; o.textContent = x.label; im.appendChild(o); });
    im.value = r.interval.min;
    $('winStart').value = r.window.start;
    $('winEnd').value = r.window.end;
    $('prOn').checked = r.prayers.on;
    $('prBody').hidden = !r.prayers.on;
    const pc = $('prCity');
    if (!pc.options.length) App.CITIES.forEach((c) => { const o = document.createElement('option'); o.value = c.id; o.textContent = c.name; pc.appendChild(o); });
    pc.value = r.prayers.city;
    $('prOffset').value = String(r.prayers.offset);
    const pw = $('prWhich');
    pw.replaceChildren();
    for (const p of Object.keys(App.PRAYER_NAMES)) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = App.PRAYER_NAMES[p];
      b.className = r.prayers.which[p] ? 'on' : '';
      b.onclick = () => { r.prayers.which[p] = !r.prayers.which[p]; b.classList.toggle('on'); App.saveNow(); scheduleSoon(); };
      pw.appendChild(b);
    }
    if (r.prayers.on) renderPrayerPreview();
    $('stopGoal').checked = r.stopWhenGoalMet;
    $('weeklyOn').checked = r.weekly;
    if (App.notify.available() && r.enabled) {
      App.notify.exactAllowed().then((ok) => { $('exactRow').hidden = ok; });
    } else $('exactRow').hidden = true;

    // المسبحة والمظهر
    segmented('cycleMode', s.cycle, (v) => { s.cycle = Number(v); App.saveNow(); });
    segmented('themeMode', s.theme, (v) => { s.theme = v; App.saveNow(); applyTheme(); });

    $('widgetBtn').hidden = !App.widget.available();
    renderShare();
    renderAccount();
    $('appVersion').textContent = cfg.version && cfg.version !== 'dev' ? cfg.version : '';
    $('privacyLink').hidden = !cfg.privacyUrl;
    $('aboutSep').hidden = !cfg.privacyUrl;

    if (!settingsBound) bindSettings();
  }

  function setGoal(g) {
    App.setGoal(s, g, todayKey());
    s.firstRunDone = true;
    App.saveNow();
    renderSettings();
    scheduleSoon();
    ui.toast(g ? `هدفك اليومي: ${n(g)} 🎯` : 'بدون هدف يومي');
  }

  function bindSettings() {
    settingsBound = true;
    const r = () => s.reminders;
    $('goalCustomBtn').onclick = () => {
      const v = parseInt($('goalCustom').value, 10);
      if (!v || v < 1 || v > 100000) { ui.toast('اكتب رقماً بين ١ و ١٠٠٬٠٠٠'); return; }
      setGoal(v);
    };
    $('remEnabled').onchange = (e) => enableReminders(e.target.checked);
    $('exactBtn').onclick = () => App.notify.openExactSettings();
    $('addTimeBtn').onclick = () => {
      const v = $('timeInput').value;
      if (!/^\d{2}:\d{2}$/.test(v)) return;
      if (r().times.includes(v)) { ui.toast('هذا الوقت مضاف'); return; }
      r().times.push(v); App.saveNow(); renderTimes(); scheduleSoon();
      ui.toast(`سيصلك تذكير يومياً ${fmtTime(v)}`);
    };
    $('intOn').onchange = (e) => { r().interval.on = e.target.checked; $('intBody').hidden = !e.target.checked; App.saveNow(); scheduleSoon(); };
    $('intMin').onchange = (e) => {
      r().interval.min = Number(e.target.value); App.saveNow(); scheduleSoon();
      if (r().interval.min <= 10 && r().sound === 'voice') ui.toast('نصيحة: مع التذكير المتكرر جداً، جرّب «اهتزاز» 📳');
    };
    const win = () => { r().window.start = $('winStart').value || '08:00'; r().window.end = $('winEnd').value || '22:00'; App.saveNow(); scheduleSoon(); };
    $('winStart').onchange = win;
    $('winEnd').onchange = win;
    $('prOn').onchange = (e) => { r().prayers.on = e.target.checked; $('prBody').hidden = !e.target.checked; if (e.target.checked) renderPrayerPreview(); App.saveNow(); scheduleSoon(); };
    $('prCity').onchange = (e) => { r().prayers.city = e.target.value; renderPrayerPreview(); App.saveNow(); scheduleSoon(); };
    $('prOffset').onchange = (e) => { r().prayers.offset = Number(e.target.value); App.saveNow(); scheduleSoon(); };
    $('stopGoal').onchange = (e) => { r().stopWhenGoalMet = e.target.checked; App.saveNow(); scheduleSoon(); };
    $('weeklyOn').onchange = (e) => { r().weekly = e.target.checked; App.saveNow(); scheduleSoon(); };
    $('testNotifBtn').onclick = async () => {
      if (!App.notify.available()) { ui.toast('تجربة التذكير تعمل داخل التطبيق على الجوال'); return; }
      ui.toast((await App.notify.test()) ? 'سيصلك تذكير تجريبي بعد ٥ ثوانٍ — اقفل الشاشة وانتظر 🔊' : 'اسمح بالإشعارات أولاً');
    };

    $('shareAppBtn').onclick = async () => { await App.share.app(); renderShare(); };
    $('codeBtn').onclick = async () => {
      const res = await App.cloud.enterCode($('codeInput').value);
      const msg = { invalid: 'الكود غير صحيح', own: 'هذا كود دعوتك أنت 😊', already: 'سبق أن أدخلت كود دعوة', notfound: 'ما لقينا هذا الكود', error: 'تعذّر الاتصال، حاول لاحقاً' };
      ui.toast(res.ok ? 'تم ✅ جزاك الله وجزى من دعاك خيراً' : (msg[res.reason] || 'تعذّر'));
      renderShare();
    };
    $('shareAnon').onchange = (e) => { s.shareAnon = e.target.checked; App.saveNow(); App.cloud.pushProgress(true); };

    $('googleBtn').onclick = () => signIn('google');
    $('facebookBtn').onclick = () => signIn('facebook');
    $('syncBtn').onclick = async () => {
      try { await App.cloud.sync(); ui.toast('تمت المزامنة ✅'); renderAccount(); } catch (e) { ui.toast('تعذّرت المزامنة، تحقق من الإنترنت'); }
    };
    $('signOutBtn').onclick = async () => {
      if (!(await ui.confirm({ title: 'تسجيل الخروج', msg: 'بياناتك تبقى على هذا الجوال، وتقدر ترجع تسجل دخولك في أي وقت.', ok: 'خروج' }))) return;
      await App.cloud.signOut(); renderSettings(); ui.toast('تم تسجيل الخروج');
    };
    $('deleteAccBtn').onclick = async () => {
      if (!(await ui.confirm({ title: 'حذف الحساب', msg: 'سيُحذف حسابك ونسختك الاحتياطية وكود دعوتك نهائياً. بيانات هذا الجوال تبقى.', ok: 'احذف نهائياً', danger: true }))) return;
      try { await App.cloud.deleteAccount(); ui.toast('تم حذف الحساب'); } catch (e) { ui.toast('تعذّر الحذف، سجّل دخولك مجدداً ثم حاول'); }
      renderSettings();
    };

    $('widgetBtn').onclick = () => addWidget();
    $('resetTodayBtn').onclick = async () => {
      const d = dhikr();
      if (!(await ui.confirm({ title: 'تصفير عداد اليوم', msg: `تصفير «${d.text}» لليوم؟ إحصائيات الأيام السابقة تبقى.`, ok: 'نعم، صفّر', danger: true }))) return;
      const day = s.days[todayKey()];
      if (day) delete day[s.current];
      App.saveNow(); renderHome(); scheduleSoon(); App.widget.push(); ui.toast('تم تصفير عداد اليوم');
    };
    $('resetAllBtn').onclick = async () => {
      if (!(await ui.confirm({ title: 'حذف كل البيانات', msg: 'ستُحذف كل الإحصائيات والإعدادات من هذا الجوال نهائياً.', ok: 'احذف الكل', danger: true }))) return;
      try { localStorage.removeItem('tasbih_v2'); localStorage.removeItem('tasbih_sched_sig'); ['astaghfar_counter', 'astaghfar_reminder_times', 'astaghfar_notifications_enabled'].forEach((k) => localStorage.removeItem(k)); } catch (e) {}
      s.reminders.enabled = false;
      await App.notify.reschedule({ force: true });
      location.reload();
    };
    $('privacyLink').onclick = (e) => { e.preventDefault(); if (cfg.privacyUrl) window.open(cfg.privacyUrl, '_blank'); };
  }

  async function signIn(provider) {
    try {
      ui.toast('جارٍ تسجيل الدخول…');
      await App.cloud.signIn(provider);
      ui.toast('أهلاً بك 🌿 تم حفظ تقدمك');
      renderSettings(); renderHome();
    } catch (e) {
      const m = String(e && (e.message || e.code) || e);
      ui.toast(/cancel/i.test(m) ? 'تم إلغاء تسجيل الدخول' : 'تعذّر تسجيل الدخول، حاول لاحقاً');
    }
  }

  let refStatsLoaded = 0;
  function renderShare() {
    const cloud = App.cloud.enabled();
    const ref = s.referral;
    $('myCodeRow').hidden = !(cloud && ref.code);
    $('myCode').textContent = ref.code || '';
    $('enterCodeBox').hidden = !cloud || ref.applied;
    $('shareAnonRow').hidden = !(cloud && ref.applied);
    $('shareAnon').checked = s.shareAnon;
    $('refStats').hidden = true;
    if (cloud && ref.code && Date.now() - refStatsLoaded > 30000) {
      refStatsLoaded = Date.now();
      App.cloud.referralStats().then((r) => {
        if (!r) return;
        $('refPeople').textContent = n(r.people);
        $('refTotal').textContent = Math.abs(r.total) >= 10000 ? App.charts.compact(r.total) : n(r.total);
        $('refStats').hidden = false;
      }).catch(() => {});
    }
  }

  function renderAccount() {
    const provs = App.cloud.providers();
    $('accountCard').hidden = !provs.length;
    if (!provs.length) return;
    const guest = App.cloud.isGuest();
    $('guestBox').hidden = !guest;
    $('userBox').hidden = guest;
    $('googleBtn').hidden = !provs.includes('google');
    $('facebookBtn').hidden = !provs.includes('facebook');
    if (!guest) {
      const acc = s.account;
      $('userName').textContent = acc.name || 'حسابك';
      $('userProvider').textContent = acc.provider === 'facebook.com' ? 'عبر Facebook' : acc.provider === 'google.com' ? 'عبر Google' : '';
      $('lastSync').textContent = acc.lastSync ? 'آخر مزامنة: ' + new Date(acc.lastSync).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '';
    }
  }

  // =============== دورة حياة التطبيق ===============
  function onBackground() {
    App.saveNow();
    checkAchievements();
    App.widget.push();         // الويدجت يعرض عدد اليوم فوراً
    App.notify.reschedule()    // يحدّث نصوص التذكيرات حسب تقدّمك الحالي
      .then(() => App.widget.push());
    App.cloud.pushProgress();
  }
  async function onForeground() {
    const fromWidget = await App.widget.drain(); // ضغطات الويدجت أثناء غياب التطبيق
    if (fromWidget) { checkAchievements(); App.widget.push(); }
    App.widget.refreshInfo();
    if (currentTab === 'home') renderHome();
    else if (currentTab === 'stats') renderStats();
    if (s.reminders.enabled && App.notify.available()) {
      App.notify.checkPermission().then((ok) => {
        if (!ok) { s.reminders.enabled = false; App.saveNow(); if (currentTab === 'settings') renderSettings(); }
        scheduleSoon(300);
        if (currentTab === 'settings') App.notify.exactAllowed().then((x) => { $('exactRow').hidden = x; });
      });
    }
  }

  function bindLifecycle() {
    const CapApp = App.plugin('App');
    if (CapApp) {
      CapApp.addListener('appStateChange', ({ isActive }) => (isActive ? onForeground() : onBackground()));
      CapApp.addListener('backButton', () => {
        if (!$('celebrate').hidden) { $('celebrate').hidden = true; return; }
        if (!$('modal').hidden) { $('modalCancel').click(); return; }
        if (!$('sheet').hidden) { closeSheet(); return; }
        if (!$('fullscreen').hidden) { $('fullscreen').hidden = true; return; }
        if (currentTab !== 'home') { showTab('home'); return; }
        CapApp.minimizeApp ? CapApp.minimizeApp() : CapApp.exitApp();
      });
    } else {
      document.addEventListener('visibilitychange', () => (document.visibilityState === 'hidden' ? onBackground() : onForeground()));
    }
    window.addEventListener('pagehide', App.saveNow);
    const LN = App.plugin('LocalNotifications');
    if (LN) LN.addListener('localNotificationActionPerformed', () => showTab('home'));
    if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => s.theme === 'auto' && applyTheme());
  }

  async function init() {
    s = App.load();
    applyTheme();
    await App.widget.drain();
    await App.widget.refreshInfo();
    renderHome();
    bindLifecycle();
    if (App.notify.available() && s.reminders.enabled) {
      if (await App.notify.checkPermission()) {
        await App.notify.ensureChannels();
        scheduleSoon(0);
      } else {
        s.reminders.enabled = false;
        App.saveNow();
      }
    }
    checkAchievements();
    App.widget.push();
    App.cloud.init().catch(() => {});
  }

  ui.showTab = showTab;
  init();
})(window.App = window.App || {});
