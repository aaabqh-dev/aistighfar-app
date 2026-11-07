/* الواجهة: المسبحة، الإحصائيات، الفضل، الإعدادات. */
(function (App) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const n = (x) => App.fmt.num(x);
  const t = (k, v) => App.t(k, v);
  // نص مترجم فيه {b}{/b}{br} → HTML
  const th = (k, v) => App.t(k, v).replace(/\{b\}/g, '<b>').replace(/\{\/b\}/g, '</b>').replace(/\{br\}/g, '<br>');
  const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const D = App.date;
  const todayKey = () => D.dayKey(new Date());
  const ui = (App.ui = {});
  const cfg = window.APP_CONFIG || {};
  let s;


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
      $('modalTitle').textContent = o.title || t('confirm');
      $('modalMsg').textContent = o.msg || '';
      const ok = $('modalOk'), cancel = $('modalCancel'), box = $('modal');
      ok.textContent = o.ok || t('confirm');
      ok.className = 'btn ' + (o.danger ? 'danger' : 'primary');
      cancel.textContent = o.cancel || t('cancel');
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
    box.innerHTML = `<div class="big"></div><h3></h3><p class="muted"></p><button class="btn primary block" type="button"></button>`;
    box.querySelector('.big').textContent = icon;
    box.querySelector('h3').textContent = title;
    box.querySelector('p').textContent = text || '';
    box.querySelector('button').textContent = t('alhamdulillah');
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

  function applyI18nDom() {
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => el.setAttribute('placeholder', t(el.dataset.i18nPh)));
    document.querySelectorAll('[data-num]').forEach((el) => { el.textContent = n(Number(el.dataset.num)); });
    document.title = t('app_name');
  }

  // عند تغيير اللغة: نعيد بناء كل ما فيه نصوص
  function changeLang(pref) {
    s.lang = pref;
    App.saveNow();
    App.setLang(pref);
    applyI18nDom();
    ['statsDhikr', 'intMin', 'prCity', 'prOffset', 'langSelect'].forEach((id) => $(id).replaceChildren());
    virtueDone = false;
    renderHome();
    renderSettings();
    App.notify.ensureChannels();          // أسماء قنوات الإشعارات بلغة المستخدم
    App.notify.reschedule({ force: true }) // نصوص التذكيرات باللغة الجديدة
      .then(updateSchedInfo);
    App.widget.push();
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

  const fmtTime = (v) => App.fmt.time(v);
  const fmtDate = (k) => App.fmt.date(k);
  const dayName = (k) => App.fmt.weekday(D.parseKey(k).getDay(), false);

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
      if (st.done) return t('prog_done', { n: `<b>${n(st.ist)}</b>` });
      return t('prog_left', { n: `<b>${n(s.goal - st.ist)}</b>`, goal: n(s.goal) });
    }
    if (App.isIstighfar(s.current) && !s.goal) return th('prog_set_goal');
    if (st.mode === 'cycle') return t('prog_cycle', { n: n(st.inCycle || (st.count ? st.cycle : 0)), cycle: n(st.cycle) });
    return t('prog_today', { n: `<b>${n(st.count)}</b>` });
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
    chip.querySelector('span').textContent = t('streak_days', { n: n(sum.currentStreak) });
  }

  function renderHome() {
    const d = dhikr();
    $('dhikrChipText').textContent = d.text;
    $('tapText').textContent = d.text;
    $('fsText').textContent = d.text;
    const meaning = App.lang.code === 'ar' ? '' : t('dhikr_' + d.id);
    $('tapMeaning').textContent = meaning;
    $('fsMeaning').textContent = meaning;
    renderCounter(false);
    renderStreak();
    renderHomeCards();
    renderDailyText();
  }

  function renderDailyText() {
    const all = App.AYAT.map((a) => ({ text: a.text, ref: a.ref, meaning: a.meaning, q: true }))
      .concat(App.AHADITH.map((h) => ({ text: h.text, ref: h.ref, meaning: h.meaning })));
    const idx = Math.floor(D.parseKey(todayKey()).getTime() / 86400000) % all.length;
    const x = all[idx];
    const el = $('dailyText');
    el.innerHTML = '<p class="quran"></p><p class="meaning-text"></p><p class="ref"></p>';
    el.querySelector('.quran').textContent = x.q ? `﴿${x.text}﴾` : `«${x.text}»`;
    el.querySelector('.meaning-text').textContent = App.lang.code === 'ar' ? '' : x.meaning;
    el.querySelector('.ref').textContent = x.ref;
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
      celebrate('🎉', t('goal_reached_title'), t('goal_reached_text', { n: n(s.goal) }));
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
      if ($('celebrate').hidden) celebrate(a.icon, t('new_badge', { title: a.title }), a.desc);
      else ui.toast(`${a.icon} ${t('new_badge', { title: a.title })}`);
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
    openSheet(t('choose_dhikr'), (body) => {
      const list = document.createElement('div');
      list.className = 'sheet-list';
      const k = todayKey();
      for (const d of App.ADHKAR) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = d.id === s.current ? 'on' : '';
        b.innerHTML = '<span><span class="sheet-ar"></span><small class="sheet-meaning"></small></span><small></small>';
        b.querySelector('.sheet-ar').textContent = d.text;
        b.querySelector('.sheet-meaning').textContent = App.lang.code === 'ar' ? '' : t('dhikr_' + d.id);
        const c = App.dayCount(s, k, d.id);
        b.querySelector(':scope > small').textContent = c ? t('today_count', { n: n(c) }) : '';
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
      const c = card('', `<p><b>${t('card_goal_title')}</b><br><span class="muted">${t('card_goal_sub')}</span></p><div class="chips"></div><div class="row"><button class="btn ghost small" type="button" data-later>${t('later')}</button></div>`);
      const chips = c.querySelector('.chips');
      for (const g of App.GOAL_PRESETS) {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = n(g);
        b.onclick = () => { App.setGoal(s, g, k); s.firstRunDone = true; App.saveNow(); renderHome(); ui.toast(t('goal_set_toast', { n: n(g) })); scheduleSoon(0); };
        chips.appendChild(b);
      }
      c.querySelector('[data-later]').onclick = () => { s.firstRunDone = true; App.saveNow(); renderHome(); };
      box.appendChild(c);
      return;
    }

    // ٢) دعوة لتفعيل التذكير (مرة واحدة)
    if (!s.reminders.enabled && !s.remPromptDone && App.notify.available()) {
      const c = card('', `<p><b>${t('card_rem_title')}</b><br><span class="muted">${t('card_rem_sub')}</span></p><div class="row"><button class="btn primary small" type="button" data-yes>${t('card_rem_yes')}</button><button class="btn ghost small" type="button" data-no>${t('later')}</button></div>`);
      c.querySelector('[data-yes]').onclick = async () => { s.remPromptDone = true; App.saveNow(); showTab('settings'); await enableReminders(true); };
      c.querySelector('[data-no]').onclick = () => { s.remPromptDone = true; App.saveNow(); renderHomeCards(); };
      box.appendChild(c);
    }

    // تنبيه: التذكيرات مفعّلة لكن أندرويد سيؤخرها
    if (s.reminders.enabled && App.notify.exactKnown === false) {
      const c = card('gold', `<p><b>${t('card_exact_title')}</b><br><span class="muted">${t('card_exact_sub')}</span></p><div class="row"><button class="btn primary small" type="button" data-exact>${t('allow')}</button></div>`);
      c.querySelector('[data-exact]').onclick = () => App.notify.openExactSettings();
      box.appendChild(c);
    }

    // ويدجت الشاشة الرئيسية (مرة واحدة)
    if (App.widget.available() && App.widget.installed === 0 && !s.widgetPromptDone) {
      const c = card('', `<p><b>${t('card_widget_title')}</b><br><span class="muted">${t('card_widget_sub')}</span></p><div class="row"><button class="btn primary small" type="button" data-pin>${t('card_widget_yes')}</button><button class="btn ghost small" type="button" data-no>${t('later')}</button></div>`);
      c.querySelector('[data-pin]').onclick = async () => { s.widgetPromptDone = true; App.saveNow(); await addWidget(); renderHomeCards(); };
      c.querySelector('[data-no]').onclick = () => { s.widgetPromptDone = true; App.saveNow(); renderHomeCards(); };
      box.appendChild(c);
    }

    // ٣) اقتراح الهدف الذكي
    const sg = App.smartSuggestion(s, k);
    if (sg) {
      const html = sg.type === 'up'
        ? `<p>${th('smart_up', { met: n(sg.metCount), win: n(sg.window), from: n(sg.from), to: n(sg.to) })}</p><div class="row"><button class="btn primary small" type="button" data-yes>${t('smart_up_yes')}</button><button class="btn ghost small" type="button" data-no>${t('later')}</button></div>`
        : `<p>${th('smart_down', { from: n(sg.from), to: n(sg.to) })}</p><div class="row"><button class="btn primary small" type="button" data-yes>${t('smart_down_yes')}</button><button class="btn ghost small" type="button" data-no>${t('smart_down_no')}</button></div>`;
      const c = card(sg.type === 'up' ? 'gold' : '', html);
      c.querySelector('[data-yes]').onclick = () => {
        App.setGoal(s, sg.to, k); s.smart.lastSuggestAt = k; App.saveNow(); renderHome(); scheduleSoon(0);
        ui.toast(t('new_goal_toast', { n: n(sg.to) }));
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
        const trend = diff === null ? '' : ` <span class="muted">${t(diff >= 0 ? 'week_up' : 'week_down', { p: App.fmt.percent(Math.abs(diff)) })}</span>`;
        const c = card('gold', `<p><b>${t('week_title')}</b><br>${t('week_total', { n: n(w.total) })}${trend}${s.goal ? `<br>${t('week_goal_days', { n: n(w.goalDays) })}` : ''}<br>${t('week_best', { day: dayName(w.best.key), n: n(w.best.count) })}</p><div class="row"><button class="btn small" type="button" data-share>${t('share')}</button><button class="btn ghost small" type="button" data-ok>${t('done')}</button></div>`);
        c.querySelector('[data-ok]').onclick = () => { s.weeklySeen = friday; App.saveNow(); renderHomeCards(); };
        c.querySelector('[data-share]').onclick = () => App.share.progress();
        box.appendChild(c);
      }
    }
  }

  async function addWidget() {
    await App.widget.push();
    if (await App.widget.requestPin()) {
      ui.toast(t('widget_pin_toast'), 4000);
    } else {
      ui.toast(t('widget_manual_toast'), 6000);
    }
  }

  // =============== الإحصائيات ===============
  const st = { range: 'week', offset: 0, dhikr: 'istighfar' };

  function fillDhikrSelect() {
    const sel = $('statsDhikr');
    if (sel.options.length) return;
    const add = (v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); };
    add('istighfar', t('stats_istighfar'));
    add('all', t('stats_all'));
    App.ADHKAR.filter((d) => !App.isIstighfar(d.id)).forEach((d) => add(d.id, App.lang.code === 'ar' ? d.text : `${d.text} — ${t('dhikr_' + d.id)}`));
    sel.value = st.dhikr;
    if (!sel.dataset.bound) { sel.dataset.bound = '1'; sel.addEventListener('change', () => { st.dhikr = sel.value; renderStats(); }); }
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
        label: App.fmt.weekday(D.parseKey(d.key).getDay(), true), count: d.count, today: d.key === k,
        met: goal > 0 && d.count >= (d.goal || goal)
      }));
      title = st.offset === 0 ? t('last_7_days') : `${fmtDate(series[0].key)} – ${fmtDate(series[6].key)}`;
      total = series.reduce((a, d) => a + d.count, 0);
      App.charts.bars(chart, data, { goal, values: true });
    } else if (st.range === 'month') {
      const base = D.parseKey(k);
      const m = new Date(base.getFullYear(), base.getMonth() - st.offset, 1);
      const series = App.monthSeries(s, m.getFullYear(), m.getMonth(), st.dhikr);
      data = series.map((d) => ({ label: n(d.day), count: d.count, today: d.key === k, met: goal > 0 && d.count >= goal }));
      title = App.fmt.monthYear(m.getFullYear(), m.getMonth());
      total = series.reduce((a, d) => a + d.count, 0);
      App.charts.bars(chart, data, { goal, labelEvery: 5 });
    } else {
      const y = D.parseKey(k).getFullYear() - st.offset;
      const months = App.yearSeries(s, y, st.dhikr);
      data = months.map((c, i) => ({ label: App.fmt.month(i, true), count: c, today: st.offset === 0 && i === new Date().getMonth() }));
      title = App.fmt.plain(y);
      total = months.reduce((a, c) => a + c, 0);
      App.charts.bars(chart, data, {});
    }
    $('chartTitle').textContent = title;
    $('chartSub').textContent = t('chart_total', { n: n(total) });

    // البطاقات
    const sum = App.summary(s, k, st.dhikr);
    const tiles = [
      [n(sum.today), t('tile_today')],
      [n(sum.total), t('tile_total')],
      [n(sum.average), t('tile_avg')],
      [n(sum.bestDay), sum.bestDayKey ? t('tile_best_on', { date: fmtDate(sum.bestDayKey) }) : t('tile_best')],
      ['🔥 ' + n(sum.currentStreak), t('tile_streak')],
      [n(sum.longestStreak), t('tile_longest')]
    ];
    if (st.dhikr === 'istighfar' && s.goal) tiles.push([n(sum.goalDays), t('tile_goal_days')], [n(sum.activeDays), t('tile_active_days')]);
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
    const ar = App.lang.code === 'ar';
    $('benefits').innerHTML = App.BENEFITS.map((b) => `<div class="benefit"><i>${b.icon}</i><div>${esc(b.title)}<small>${esc(b.ref)}</small></div></div>`).join('');
    $('sayyidText').textContent = App.SAYYID_ISTIGHFAR.text;
    $('sayyidMeaning').textContent = ar ? '' : App.SAYYID_ISTIGHFAR.meaning;
    $('sayyidVirtue').textContent = '«' + App.SAYYID_ISTIGHFAR.virtue + '»';
    $('sayyidVirtueMeaning').textContent = ar ? '' : App.SAYYID_ISTIGHFAR.virtueMeaning;
    $('sayyidRef').textContent = App.SAYYID_ISTIGHFAR.ref;
    const render = (list, q) => list.map((x) => `<article><p class="quran">${q ? '﴿' + x.text + '﴾' : '«' + x.text + '»'}</p>${ar ? '' : `<p class="meaning-text">${esc(x.meaning)}</p>`}<p class="ref">${esc(x.ref)}</p></article>`).join('');
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

  function whenText(d) {
    const k = D.dayKey(d), tk = todayKey();
    const hm = fmtTime(d);
    if (k === tk) return t('when_today', { time: hm });
    if (k === D.addDays(tk, 1)) return t('when_tomorrow', { time: hm });
    return t('when_date', { date: fmtDate(k), time: hm });
  }

  function updateSchedInfo(r) {
    const el = $('schedInfo');
    if (!el) return;
    if (!App.notify.available()) { el.textContent = t('rem_web_only'); return; }
    if (!s.reminders.enabled || !r) { el.textContent = ''; return; }
    if (r.error) { el.textContent = t('rem_error', { e: r.error }); return; }
    if (!r.nextAt) { el.textContent = t('rem_add_source'); return; }
    const lines = [];
    if (r.goalMetToday) lines.push(t('rem_goal_met'));
    lines.push(t('rem_next', { when: whenText(new Date(r.nextAt)) }));
    if (r.exact === false) lines.push(t('rem_may_delay'));
    el.textContent = lines.join('\n');
  }

  async function enableReminders(on) {
    if (on) {
      if (App.notify.available()) {
        const ok = await App.notify.requestPermission();
        if (!ok) {
          $('remEnabled').checked = false;
          ui.toast(t('notif_denied'));
          return;
        }
        await App.notify.ensureChannels();
      }
      const r = s.reminders;
      if (!r.times.length && !r.interval.on && !r.prayers.on) {
        r.interval.on = true; r.interval.min = 60;
        ui.toast(t('default_hourly'));
      }
    }
    s.reminders.enabled = on;
    s.remPromptDone = true;
    App.saveNow();
    renderSettings();
    scheduleSoon(0);
    if (on) setTimeout(() => ensureExact(), 600);
  }

  // بدون إذن «المنبهات والتذكيرات» يؤخّر أندرويد التذكيرات (حتى ساعة) لتوفير البطارية
  async function ensureExact() {
    if (!App.notify.available() || !s.reminders.enabled) return true;
    if (await App.notify.exactAllowed()) return true;
    const go = await ui.confirm({
      title: t('exact_title'),
      msg: t('exact_msg'),
      ok: t('allow'),
      cancel: t('later')
    });
    if (go) App.notify.openExactSettings();
    return false;
  }

  function renderTimes() {
    const ul = $('timeList');
    ul.replaceChildren();
    const times = [...s.reminders.times].sort();
    if (!times.length) { ul.innerHTML = `<li class="empty">${t('no_times')}</li>`; return; }
    for (const tm of times) {
      const li = document.createElement('li');
      li.innerHTML = `<span>${fmtTime(tm)}</span><button type="button" aria-label="${t('delete')}">×</button>`;
      li.querySelector('button').onclick = () => {
        s.reminders.times = s.reminders.times.filter((x) => x !== tm);
        App.saveNow(); renderTimes(); scheduleSoon();
      };
      ul.appendChild(li);
    }
  }

  function renderPrayerPreview() {
    const pr = s.reminders.prayers;
    const pt = App.prayerTimes(todayKey(), pr.city);
    if (!pt) { $('prToday').textContent = ''; return; }
    $('prToday').textContent = t('prayer_times_today', { list: Object.keys(App.PRAYER_NAMES).map((p) => `${App.PRAYER_NAMES[p]} ${fmtTime(pt[p])}`).join(' · ') });
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
      b.textContent = g ? n(g) : t('none');
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
      ui.toast(t(v === 'voice' ? 'sound_voice_toast' : v === 'vibrate' ? 'sound_vibrate_toast' : 'sound_silent_toast'));
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
    if (!pc.options.length) {
      [...App.CITIES].sort((a, b) => App.cityName(a).localeCompare(App.cityName(b), App.lang.locale))
        .forEach((c) => { const o = document.createElement('option'); o.value = c.id; o.textContent = App.cityName(c); pc.appendChild(o); });
    }
    const po = $('prOffset');
    if (!po.options.length) [10, 15, 20, 30].forEach((m) => { const o = document.createElement('option'); o.value = m; o.textContent = t('after_adhan_min', { n: n(m) }); po.appendChild(o); });
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
      App.notify.reschedule().then(updateSchedInfo);
    } else $('exactRow').hidden = true;

    // المسبحة والمظهر
    segmented('cycleMode', s.cycle, (v) => { s.cycle = Number(v); App.saveNow(); });
    segmented('themeMode', s.theme, (v) => { s.theme = v; App.saveNow(); applyTheme(); });

    $('widgetBtn').hidden = !App.widget.available();
    const ls = $('langSelect');
    if (!ls.options.length) {
      const add = (v, label) => { const o = document.createElement('option'); o.value = v; o.textContent = label; ls.appendChild(o); };
      add('auto', `${t('lang_auto')} (${App.LANGS.find((l) => l.code === App.detectLang()).name})`);
      App.LANGS.forEach((l) => add(l.code, l.name));
      ls.onchange = () => changeLang(ls.value);
    }
    ls.value = s.lang || 'auto';
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
    ui.toast(g ? t('goal_daily_toast', { n: n(g) }) : t('goal_none_toast'));
  }

  function bindSettings() {
    settingsBound = true;
    const r = () => s.reminders;
    $('goalCustomBtn').onclick = () => {
      const v = parseInt($('goalCustom').value, 10);
      if (!v || v < 1 || v > 100000) { ui.toast(t('goal_invalid')); return; }
      setGoal(v);
    };
    $('remEnabled').onchange = (e) => enableReminders(e.target.checked);
    $('exactBtn').onclick = () => App.notify.openExactSettings();
    $('batteryBtn').onclick = async () => {
      if (await ui.confirm({ title: t('battery_title'), msg: t('battery_msg'), ok: t('open_app_settings') })) App.notify.openAppSettings();
    };
    $('addTimeBtn').onclick = () => {
      const v = $('timeInput').value;
      if (!/^\d{2}:\d{2}$/.test(v)) return;
      if (r().times.includes(v)) { ui.toast(t('time_exists')); return; }
      r().times.push(v); App.saveNow(); renderTimes(); scheduleSoon();
      const [hh, mm] = v.split(':').map(Number);
      const now = new Date();
      const today = hh * 60 + mm > now.getHours() * 60 + now.getMinutes();
      ui.toast(t('time_added', { time: fmtTime(v), when: t(today ? 'today' : 'tomorrow') }), 4000);
    };
    $('intOn').onchange = (e) => { r().interval.on = e.target.checked; $('intBody').hidden = !e.target.checked; App.saveNow(); scheduleSoon(); };
    $('intMin').onchange = (e) => {
      r().interval.min = Number(e.target.value); App.saveNow(); scheduleSoon();
      if (r().interval.min <= 10 && r().sound === 'voice') ui.toast(t('interval_tip'));
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
      if (!App.notify.available()) { ui.toast(t('rem_web_only')); return; }
      const r = await App.notify.test();
      if (r.ok) {
        ui.toast(t('test_sent'), 4500);
        setTimeout(() => ensureExact(), 1800);
      } else if (r.reason === 'permission') {
        if (await ui.confirm({ title: t('notif_off_title'), msg: t('notif_off_msg'), ok: t('open_settings') })) {
          App.notify.openNotificationSettings();
        }
      } else {
        ui.toast(t('test_failed', { e: r.error || '' }), 5000);
      }
    };

    $('shareAppBtn').onclick = async () => { await App.share.app(); renderShare(); };
    $('codeBtn').onclick = async () => {
      const res = await App.cloud.enterCode($('codeInput').value);
      const msg = { invalid: 'code_invalid', own: 'code_own', already: 'code_already', notfound: 'code_notfound', error: 'code_error' };
      ui.toast(res.ok ? t('code_ok') : t(msg[res.reason] || 'code_failed'));
      renderShare();
    };
    $('shareAnon').onchange = (e) => { s.shareAnon = e.target.checked; App.saveNow(); App.cloud.pushProgress(true); };

    $('googleBtn').onclick = () => signIn('google');
    $('facebookBtn').onclick = () => signIn('facebook');
    $('syncBtn').onclick = async () => {
      try { await App.cloud.sync(); ui.toast(t('synced')); renderAccount(); } catch (e) { ui.toast(t('sync_failed')); }
    };
    $('signOutBtn').onclick = async () => {
      if (!(await ui.confirm({ title: t('signout_title'), msg: t('signout_msg'), ok: t('signout_ok') }))) return;
      await App.cloud.signOut(); renderSettings(); ui.toast(t('signed_out'));
    };
    $('deleteAccBtn').onclick = async () => {
      if (!(await ui.confirm({ title: t('delete_acc_title'), msg: t('delete_acc_msg'), ok: t('delete_forever'), danger: true }))) return;
      try { await App.cloud.deleteAccount(); ui.toast(t('acc_deleted')); } catch (e) { ui.toast(t('delete_failed')); }
      renderSettings();
    };

    $('widgetBtn').onclick = () => addWidget();
    $('resetTodayBtn').onclick = async () => {
      const d = dhikr();
      if (!(await ui.confirm({ title: t('reset_today_title'), msg: t('reset_today_msg', { dhikr: d.text }), ok: t('reset_today_ok'), danger: true }))) return;
      const day = s.days[todayKey()];
      if (day) delete day[s.current];
      App.saveNow(); renderHome(); scheduleSoon(); App.widget.push(); ui.toast(t('reset_today_done'));
    };
    $('resetAllBtn').onclick = async () => {
      if (!(await ui.confirm({ title: t('reset_all_title'), msg: t('reset_all_msg'), ok: t('reset_all_ok'), danger: true }))) return;
      try { localStorage.removeItem('tasbih_v2'); localStorage.removeItem('tasbih_sched_sig'); ['astaghfar_counter', 'astaghfar_reminder_times', 'astaghfar_notifications_enabled'].forEach((k) => localStorage.removeItem(k)); } catch (e) {}
      s.reminders.enabled = false;
      await App.notify.reschedule({ force: true });
      location.reload();
    };
    $('privacyLink').onclick = (e) => { e.preventDefault(); if (cfg.privacyUrl) window.open(cfg.privacyUrl, '_blank'); };
  }

  async function signIn(provider) {
    try {
      ui.toast(t('signing_in'));
      await App.cloud.signIn(provider);
      ui.toast(t('welcome'));
      renderSettings(); renderHome();
    } catch (e) {
      const m = String(e && (e.message || e.code) || e);
      ui.toast(t(/cancel/i.test(m) ? 'signin_cancelled' : 'signin_failed'));
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
      $('userName').textContent = acc.name || t('your_account');
      $('userProvider').textContent = acc.provider === 'facebook.com' ? t('via_facebook') : acc.provider === 'google.com' ? t('via_google') : '';
      $('lastSync').textContent = acc.lastSync ? t('last_sync', { t: App.fmt.dateTime(acc.lastSync) }) : '';
    }
  }

  async function refreshExactState() {
    App.notify.exactKnown = App.notify.available() ? await App.notify.exactAllowed() : null;
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
    await refreshExactState();
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
    App.setLang(s.lang || 'auto');
    applyI18nDom();
    applyTheme();
    await App.widget.drain();
    await App.widget.refreshInfo();
    await refreshExactState();
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
