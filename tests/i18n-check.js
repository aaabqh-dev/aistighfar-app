// يتحقق أن كل ملف لغة يحتوي نفس مفاتيح الإنجليزية ونفس المتغيرات {x}
// التشغيل: node tests/i18n-check.js [code ...]
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '../www/js/lang');
const ctx = { window: {} };
vm.createContext(ctx);
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
  vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
}
const I = ctx.window.App.I18N;
const en = I.en;
const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(I).filter((c) => c !== 'en');
const vars = (s) => (Array.isArray(s) ? s.join('|') : String(s)).match(/\{\/?\w+\}/g) || [];
let bad = 0;
for (const code of want) {
  const d = I[code];
  if (!d) { console.log(`✗ ${code}: file missing or not registered`); bad++; continue; }
  const missing = Object.keys(en).filter((k) => d[k] === undefined || d[k] === '');
  const extra = Object.keys(d).filter((k) => en[k] === undefined);
  const varErr = [];
  const typeErr = [];
  for (const k of Object.keys(en)) {
    if (d[k] === undefined) continue;
    if (Array.isArray(en[k]) !== Array.isArray(d[k])) { typeErr.push(k); continue; }
    if (Array.isArray(en[k])) {
      // كل عنصر يجب أن يستخدم فقط متغيرات موجودة في نسخة الإنجليزية لنفس المفتاح
      const allowed = new Set(vars(en[k]));
      d[k].forEach((s, i) => vars(s).forEach((v) => { if (!allowed.has(v)) varErr.push(`${k}[${i}] ${v}`); }));
      if (d[k].length < 1) typeErr.push(k);
    } else {
      const a = vars(en[k]).sort().join(), b = vars(d[k]).sort().join();
      if (a !== b) varErr.push(`${k}: en=${a} ${code}=${b}`);
    }
  }
  const ok = !missing.length && !extra.length && !varErr.length && !typeErr.length;
  if (!ok) bad++;
  console.log(`${ok ? '✓' : '✗'} ${code}: ${Object.keys(d).length}/${Object.keys(en).length} keys` +
    (missing.length ? `\n   missing: ${missing.join(', ')}` : '') +
    (extra.length ? `\n   extra: ${extra.join(', ')}` : '') +
    (typeErr.length ? `\n   string/array mismatch: ${typeErr.join(', ')}` : '') +
    (varErr.length ? `\n   placeholder errors: ${varErr.join(' | ')}` : ''));
}
process.exit(bad ? 1 : 0);
