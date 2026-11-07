#!/usr/bin/env node
/* يجهّز المشروع قبل البناء حسب ما هو متوفر:
   - بدون google-services.json: تطبيق كامل بوضع الضيف (تُستبعد إضافات Firebase حتى لا يتعطل التطبيق).
   - مع google-services.json: الدخول بقوقل + المزامنة + عدّاد المدعوين.
   - مع معرّف فيسبوك في app-config.json: الدخول بفيسبوك أيضاً.
   الاستخدام: node scripts/configure.js   (قبل: npx cap sync android) */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const p = (...x) => path.join(root, ...x);
const read = (f) => fs.readFileSync(p(f), 'utf8');
const write = (f, s) => fs.writeFileSync(p(f), s);

const cfg = JSON.parse(read('app-config.json'));
const hasFirebase = fs.existsSync(p('android/app/google-services.json'));
const fbId = String(cfg.facebookAppId || '').trim();
const fbToken = String(cfg.facebookClientToken || '').trim();
const hasFacebook = hasFirebase && /^\d{6,}$/.test(fbId) && fbToken.length >= 16;
if (!hasFirebase && fbId) console.warn('⚠️  فيسبوك يحتاج Firebase أولاً (google-services.json) — تم تجاهله.');
if (hasFirebase && fbId && !hasFacebook) console.warn('⚠️  قيم فيسبوك غير مكتملة — تم تجاهل فيسبوك.');

// رابط صفحات GitHub (للدعوات وسياسة الخصوصية)
let pagesBase = String(cfg.pagesBase || '').trim();
if (!pagesBase && process.env.GITHUB_REPOSITORY) {
  const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
  pagesBase = repo.toLowerCase() === `${owner.toLowerCase()}.github.io`
    ? `https://${owner.toLowerCase()}.github.io/`
    : `https://${owner.toLowerCase()}.github.io/${repo}/`;
}
if (pagesBase && !pagesBase.endsWith('/')) pagesBase += '/';
const pkg = cfg.playPackage || 'com.yellowline.tasbih';
const providers = hasFirebase ? ['google'].concat(hasFacebook ? ['facebook'] : []) : [];

// ١) إعدادات الواجهة
write('www/js/config.js', `/* مولَّد تلقائياً بواسطة scripts/configure.js — لا تعدّله يدوياً */
window.APP_CONFIG = ${JSON.stringify({
  firebase: hasFirebase,
  providers,
  shareBase: pagesBase ? pagesBase + 'i/' : '',
  playUrl: `https://play.google.com/store/apps/details?id=${pkg}`,
  privacyUrl: pagesBase ? pagesBase + 'privacy.html' : '',
  version: process.env.VERSION_NAME || 'dev'
}, null, 2)};
`);

// صفحة الدعوة تحتاج اسم الحزمة
const invite = p('docs/i/index.html');
if (fs.existsSync(invite)) {
  write('docs/i/index.html', read('docs/i/index.html').replace(/const PACKAGE = '[^']*';/, `const PACKAGE = '${pkg}';`));
}

// ٢) إضافات Capacitor المضمّنة
const deps = Object.keys(JSON.parse(read('package.json')).dependencies || {});
const capPlugins = deps.filter((d) => {
  try {
    const pj = JSON.parse(fs.readFileSync(p('node_modules', d, 'package.json'), 'utf8'));
    return !!(pj.capacitor && pj.capacitor.android);
  } catch (e) { return false; }
});
const include = capPlugins.filter((d) => hasFirebase || !d.startsWith('@capacitor-firebase/'));
const cap = JSON.parse(read('capacitor.config.json'));
cap.android = Object.assign({}, cap.android, { includePlugins: include });
cap.plugins = cap.plugins || {};
if (hasFirebase) {
  cap.plugins.FirebaseAuthentication = {
    skipNativeAuth: false,
    providers: ['google.com'].concat(hasFacebook ? ['facebook.com'] : [])
  };
} else delete cap.plugins.FirebaseAuthentication;
write('capacitor.config.json', JSON.stringify(cap, null, 2) + '\n');

// ٣) متغيرات Gradle
let vars = read('android/variables.gradle');
const setVar = (name, value) => {
  const re = new RegExp(`\\n\\s*${name} = [^\\n]*`);
  const line = `\n    ${name} = ${value}`;
  vars = re.test(vars) ? vars.replace(re, line) : vars.replace(/\n}\s*$/, `${line}\n}\n`);
};
setVar('rgcfaIncludeGoogle', String(hasFirebase));
setVar('rgcfaIncludeFacebook', String(hasFacebook));
setVar('androidxCredentialsVersion', "'1.3.0'");
setVar('androidxCredentialsPlayServicesAuthVersion', "'1.3.0'");
write('android/variables.gradle', vars);

// ٤) نصوص فيسبوك + عناصر AndroidManifest (فقط عند تفعيله)
let strings = read('android/app/src/main/res/values/strings.xml')
  .replace(/\s*<!-- FACEBOOK-START -->[\s\S]*?<!-- FACEBOOK-END -->/, '');
if (hasFacebook) {
  strings = strings.replace('</resources>', `    <!-- FACEBOOK-START -->
    <string name="facebook_app_id">${fbId}</string>
    <string name="fb_login_protocol_scheme">fb${fbId}</string>
    <string name="facebook_client_token">${fbToken}</string>
    <!-- FACEBOOK-END -->
</resources>`);
}
write('android/app/src/main/res/values/strings.xml', strings);

let manifest = read('android/app/src/main/AndroidManifest.xml')
  .replace(/\s*<!-- FACEBOOK-START -->[\s\S]*?<!-- FACEBOOK-END -->/, '');
if (hasFacebook) {
  manifest = manifest.replace(/(\n\s*)<\/application>/, `
        <!-- FACEBOOK-START -->
        <meta-data android:name="com.facebook.sdk.ApplicationId" android:value="@string/facebook_app_id" />
        <meta-data android:name="com.facebook.sdk.ClientToken" android:value="@string/facebook_client_token" />
        <activity
            android:name="com.facebook.FacebookActivity"
            android:configChanges="keyboard|keyboardHidden|screenLayout|screenSize|orientation"
            android:label="@string/app_name" />
        <activity android:name="com.facebook.CustomTabActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="@string/fb_login_protocol_scheme" />
            </intent-filter>
        </activity>
        <!-- FACEBOOK-END -->$1</application>`);
}
write('android/app/src/main/AndroidManifest.xml', manifest);

console.log('✅ الإعداد:', JSON.stringify({ firebase: hasFirebase, facebook: hasFacebook, providers, pagesBase: pagesBase || '(غير محدد)', plugins: include.length }));
