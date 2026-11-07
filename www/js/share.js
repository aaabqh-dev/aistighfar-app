/* المشاركة: رابط التطبيق مع كود الدعوة، وصورة إنجاز جميلة. */
(function (App) {
  'use strict';
  const S = (App.share = {});
  const cfg = window.APP_CONFIG || {};
  const SharePl = () => App.plugin('Share');
  const Fs = () => App.plugin('Filesystem');

  async function nativeShare(opts) {
    const sp = SharePl();
    if (sp) { await sp.share(opts); return true; }
    if (navigator.share) { await navigator.share({ title: opts.title, text: opts.text, url: opts.url }); return true; }
    try { await navigator.clipboard.writeText([opts.text, opts.url].filter(Boolean).join('\n')); App.ui.toast(App.t('copied')); } catch (e) {}
    return false;
  }

  S.app = async function () {
    let code = null, link = cfg.playUrl || '';
    if (App.cloud.enabled()) {
      try { code = await App.cloud.myCode(); link = App.cloud.shareLink(code); } catch (e) {}
    }
    const text = App.t('share_app_text') + (code ? '\n' + App.t('share_code_line', { code }) : '');
    return nativeShare({ title: App.t('app_name'), text, url: link || undefined, dialogTitle: App.t('share_dialog_app') });
  };

  // ---------- صورة الإنجاز ----------
  S.drawCard = function (data) {
    const c = document.createElement('canvas');
    c.width = 1080; c.height = 1080;
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 1080, 1080);
    grd.addColorStop(0, '#3f7a36'); grd.addColorStop(1, '#1d3a19');
    g.fillStyle = grd; g.fillRect(0, 0, 1080, 1080);
    g.fillStyle = 'rgba(255,255,255,0.06)';
    g.beginPath(); g.arc(150, 120, 330, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(980, 1000, 260, 0, Math.PI * 2); g.fill();

    g.direction = App.lang.dir; g.textAlign = 'center'; g.fillStyle = '#fff';
    const font = (w, px) => `${w} ${px}px "Noto Naskh Arabic", "Noto Sans Bengali", "Noto Nastaliq Urdu", "Amiri", system-ui, sans-serif`;
    g.font = font(700, 54); g.fillText('🌿 ' + App.t('app_name'), 540, 150);
    g.font = font(400, 40); g.globalAlpha = 0.85; g.fillText(data.label, 540, 330); g.globalAlpha = 1;
    g.font = font(800, 190); g.fillText(data.value, 540, 540);
    g.font = font(600, 46); g.fillText(data.unit, 540, 620);

    g.font = font(600, 40);
    const chips = data.chips.filter(Boolean);
    chips.forEach((t, i) => {
      const y = 740 + i * 70;
      g.globalAlpha = 0.14; g.fillStyle = '#fff';
      const w = g.measureText(t).width + 70;
      roundRect(g, 540 - w / 2, y - 48, w, 64, 32); g.fill();
      g.globalAlpha = 1; g.fillStyle = '#fff'; g.fillText(t, 540, y);
    });
    g.font = font(400, 34); g.globalAlpha = 0.75;
    g.fillText(data.footer, 540, 1010);
    return c;
  };

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  S.progress = async function () {
    const s = App.state;
    const todayKey = App.date.dayKey(new Date());
    const sum = App.summary(s, todayKey, 'istighfar');
    const n = (x) => App.fmt.num(x);
    let code = null;
    if (App.cloud.enabled()) { try { code = await App.cloud.myCode(); } catch (e) {} }
    const canvas = S.drawCard({
      label: App.t('card_label'),
      value: n(sum.total),
      unit: App.t('card_unit'),
      chips: [
        sum.currentStreak >= 2 ? App.t('card_streak', { n: n(sum.currentStreak) }) : null,
        sum.today > 0 ? App.t('card_today', { n: n(sum.today) }) : null
      ],
      footer: code ? App.t('card_footer_code', { code }) : App.t('card_footer')
    });
    const dataUrl = canvas.toDataURL('image/png');
    const link = code ? App.cloud.shareLink(code) : (cfg.playUrl || undefined);
    const text = App.t('share_progress_text', { n: n(sum.total) }) + (code ? '\n' + App.t('share_code_line', { code }) : '');
    const fs = Fs();
    if (fs && SharePl()) {
      try {
        const res = await fs.writeFile({ path: 'tasbih-share.png', data: dataUrl.split(',')[1], directory: 'CACHE' });
        await SharePl().share({ title: App.t('app_name'), text, url: link, files: [res.uri], dialogTitle: App.t('share_dialog_progress') });
        return true;
      } catch (e) {
        if (/cancel/i.test(String(e && e.message))) return false;
      }
    }
    return nativeShare({ title: App.t('app_name'), text, url: link });
  };
})(window.App = window.App || {});
