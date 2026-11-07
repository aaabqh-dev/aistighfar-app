# مسبحة الاستغفار — الإصدار ٢

مسبحة استغفار مع أهداف ذكية، وإحصائيات، وتذكيرات مخصصة، ومشاركة الأجر.
لا تحتاج تثبيت أي برنامج: GitHub يبني التطبيق لك مجاناً.

## المميزات

| | |
|---|---|
| 📿 المسبحة | ٩ أذكار، حلقة تقدّم نحو الهدف، اهتزاز مميز كل ٣٣ أو ١٠٠، وضع اللمس الكامل |
| 🎯 الأهداف | ١٠٠ إلى ٣٠٠٠ أو رقم خاص. إذا حققته ١٢ يوماً من ١٤ نقترح رفعه، وإذا تعثّر نقترح تخفيفه |
| 📊 الإحصائيات | أسبوع، شهر، سنة، خريطة آخر ١٢ شهراً، أيام متتالية، ١٢ وساماً، ملخص كل جمعة |
| 🔔 التذكيرات | أوقات محددة، كل ٥ دقائق إلى كل ٣ ساعات ضمن ساعات النشاط، بعد الصلوات (٣٨ مدينة) |
| 🔊 نوع التنبيه | صوت «أستغفر الله»، أو اهتزاز فقط، أو صامت |
| 💬 رسائل ذكية | «باقي لك ٣٤٠»، «سلسلتك ٧ أيام 🔥»، «اشتقنا لك»، وتتوقف تذكيرات اليوم عند تحقيق الهدف |
| 📖 الفضل | ثمرات الاستغفار، سيد الاستغفار، آيات وأحاديث |
| 🤝 المشاركة | رابط دعوة، وترى كم استغفر من دعوتهم **بدون أسمائهم** |
| 👤 الحساب | اختياري (Google / Facebook) — لا يُطلب عند الفتح. نسخة احتياطية ومزامنة |
| 🌙 المظهر | فاتح، داكن، تلقائي |
| 📌 ويدجت | مسبحة على الشاشة الرئيسية: تضغط وتستغفر بدون فتح التطبيق، وتعرض العداد وتقدّم الهدف |

الترقية من الإصدار الأول تنقل العدد القديم وأوقات التذكير تلقائياً.

---

## ١) ارفع المشروع على GitHub وثبّت التطبيق (١٥ دقيقة)

1. سجّل في [github.com](https://github.com) ← **+** ← **New repository** ← اسم مثل `tasbih-app` ← **Public** ← **Create**.
2. اضغط **uploading an existing file** واسحب **كل محتويات** المجلد (بما فيها `.github`) ← **Commit changes**.
   - لا يظهر `.github` في ويندوز؟ فعّل «العناصر المخفية» من قائمة «عرض».
3. تبويب **Actions**: البناء يأخذ ٥ إلى ٨ دقائق. ✅ = نجح.
4. من جوالك: صفحة المستودع ← **Releases** ← حمّل `tasbih-…-test.apk` وثبّته.

> **مهم لو عندك الإصدار الأول مثبّت:** احذفه أولاً (مفتاح التوقيع تغيّر). بعدها كل تحديث يُثبَّت فوق السابق.

5. **ويدجت المسبحة:** من التطبيق ← الإعدادات ← «📌 أضف المسبحة للشاشة الرئيسية». أو اضغط مطولاً على الشاشة الرئيسية ← الأدوات (Widgets) ← مسبحة الاستغفار.
6. **صفحات الدعوة والخصوصية:** Settings ← **Pages** ← Branch: `main` ومجلد `/docs` ← Save.

عند هذه النقطة التطبيق كامل بوضع الضيف: كل المميزات تعمل ما عدا الحساب وعدّاد المدعوين.

---

## ٢) تفعيل الدخول بقوقل والمشاركة (Firebase — مجاني، ٢٠ دقيقة)

1. افتح [console.firebase.google.com](https://console.firebase.google.com) ← **Create a project** ← اسم `tasbih` ← (Analytics: أوقفه).
2. **Add app** ← Android ← Package name: `com.yellowline.tasbih`.
3. أضف بصمات SHA-1 الثلاث (Project settings ← Your apps ← **Add fingerprint**):

   | المفتاح | SHA-1 |
   |---|---|
   | نسخ التجربة | `FF:C2:30:5B:CE:FD:5A:7A:8F:AC:84:BA:F9:98:83:58:5E:50:C9:FB` |
   | مفتاح الرفع (release) | `92:2D:1E:14:B4:83:AE:56:FD:94:75:D9:A0:F9:D8:B1:40:33:40:8A` |
   | توقيع Google Play | من Play Console ← **App integrity** ← App signing (بعد أول رفع) |

4. **Authentication** ← Get started ← فعّل: **Google** و **Anonymous**.
5. **Firestore Database** ← Create ← المنطقة الأقرب لك (مثلاً `me-central2` الدمام) ← **Production mode**.
6. تبويب **Rules** ← الصق محتوى `firebase/firestore.rules` ← **Publish**.
7. الآن (بعد تفعيل Google) حمّل `google-services.json` من Project settings وارفعه في المستودع داخل `android/app/`.
   ⚠️ لو حمّلته قبل تفعيل Google، فالدخول بقوقل لن يعمل.
8. بعد أول رفع على Google Play أضف بصمة «توقيع Google Play» (الخطوة ٣)، ثم حمّل `google-services.json` من جديد واستبدله.

البناء القادم يفعّل تلقائياً: زر الدخول بقوقل، والنسخ الاحتياطي، وكود الدعوة، وعدّاد المدعوين.

## ٣) تفعيل الدخول بفيسبوك (اختياري)

1. [developers.facebook.com](https://developers.facebook.com) ← **Create App** ← Use case: **Authenticate and request data from users with Facebook Login**.
2. App settings ← Basic: انسخ **App ID** و **App secret**. ثم Advanced ← انسخ **Client token**.
3. في Firebase ← Authentication ← فعّل **Facebook** والصق App ID و App secret، وانسخ رابط **OAuth redirect URI**.
4. في فيسبوك ← Facebook Login ← Settings ← الصق الرابط في **Valid OAuth Redirect URIs**.
5. في فيسبوك ← أضف منصة Android: Package `com.yellowline.tasbih`، Class `com.yellowline.tasbih.MainActivity`، و **Key hashes**:
   `/8IwW879WnqPrIS6+ZiDWF5Qyfs=` (نسخ التجربة) و `ki0eFLSDrlb9lHXZoPnYsUAzQIo=` (الرفع)، وبعد النشر أضف بصمة توقيع Google Play بنفس الصيغة.
6. عدّل `app-config.json` في المستودع:
   ```json
   "facebookAppId": "123456789012345",
   "facebookClientToken": "abc123…"
   ```
7. فيسبوك يطلب قبل التفعيل للعامة: رابط سياسة الخصوصية، ورابط حذف البيانات (`…/delete-account.html`)، ثم **Live mode**.

---

## ٤) النشر على Google Play

### التوقيع (مرة واحدة)
Settings ← Secrets and variables ← Actions ← أضف القيم الأربع من `secrets.txt` في المجلد الخاص:
`KEYSTORE_BASE64`، `KEYSTORE_PASSWORD`، `KEY_ALIAS`، `KEY_PASSWORD`. بعدها يظهر ملف `…-googleplay.aab` في Releases.

### حساب المطوّر
- [play.google.com/console](https://play.google.com/console) — ٢٥ دولار مرة واحدة.
- **حساب شخصي:** اختبار مغلق مع ١٢ مختبِراً لمدة ١٤ يوماً متواصلة قبل النشر للجميع.
- **حساب منشأة:** يحتاج رقم D-U-N-S ولا يشمله شرط المختبرين.

### صفحة المتجر
النصوص والصور جاهزة في `store-listing/`. وفي **App content**:

| البند | الإجابة |
|---|---|
| Privacy policy | `https://حسابك.github.io/tasbih-app/privacy.html` |
| Ads | No |
| App access | All functionality available without special access |
| Data safety — بدون Firebase | لا يجمع بيانات |
| Data safety — مع Firebase | يجمع (اختياري): الاسم، البريد، معرّف المستخدم، نشاط التطبيق (عدد الاستغفار). الغرض: وظائف التطبيق وإدارة الحساب. مشفّرة أثناء النقل: نعم. يمكن طلب الحذف: نعم |
| Account deletion URL | `https://حسابك.github.io/tasbih-app/delete-account.html` |
| Target audience | 13+ |

---

## تغيير صوت التذكير
- ضع تسجيلك في `sound/astaghfar.mp3` (أقل من ٥ ثوانٍ).
- **مهم:** أندرويد يثبّت صوت القناة عند أول تشغيل. عند تغيير الصوت غيّر `v1` إلى `v2` في `CHANNELS` داخل `www/js/planner.js`.

## مراجعة شرعية قبل النشر
النصوص في `www/js/content.js` (الآيات، الأحاديث مع تخريجها، سيد الاستغفار، رسائل التذكير). اختيرت من الصحيح المشهور، لكن يُنصح بمراجعتها من طالب علم.

---

## للمبرمج

| البند | التفاصيل |
|---|---|
| البنية | Capacitor 8، واجهة HTML/CSS/JS بدون bundler في `www/` |
| الملفات | `content` محتوى · `store` الحالة والإحصاء والأهداف الذكية · `planner` مخطِّط التذكيرات (نقي) · `notify` الجدولة · `cloud` Firebase · `share` · `charts` · `app` الواجهة |
| التذكيرات | إشعارات `at` لمرة واحدة لأيام قادمة (حد ٣٠٠، ≤٧ أيام) + احتياطي يومي `on` في أول وقت. تُعاد الجدولة عند الخروج من التطبيق إذا تغيّرت الخطة (توقيع) |
| القنوات | `tasbih_voice_v1` (astaghfar.wav) · `tasbih_vibrate_v1` (silence.wav) · `tasbih_silent_v1` (أهمية منخفضة) |
| الدقة | `isExactNotification` حسب `checkExactNotificationSetting()` — لا نفتح الإعدادات تلقائياً |
| الصلاة | `adhan` محلياً: أم القرى للمدن السعودية، وطريقة البلد لغيرها |
| Firebase | `@capacitor-firebase/authentication` + `firestore` 8.6 (أصلي). تُستبعد عبر `android.includePlugins` إن لم يوجد `google-services.json` (لأن الإضافة تتعطل عند التحميل بدونه) |
| الدعوات | `docs/i/` ← Play `&referrer=r%3DCODE` ← `InstallReferrerPlugin.java` (محلي). Firestore: `codes/{code}`، `referrals/{uid}` {referrer,total,updatedAt} |
| الحساب | مجهول عند الحاجة فقط ← `linkWith*` يحافظ على uid والكود. عند التعارض: تنظيف ثم دخول ودمج (أكبر قيمة لكل يوم وذكر) |
| الإعداد | `scripts/configure.js` يولّد `www/js/config.js` و`capacitor.config.json` ومتغيرات Gradle وعناصر فيسبوك |
| الويدجت | `TasbihWidget` (AppWidgetProvider) + `WidgetStore` (SharedPreferences: base من التطبيق + pending من الضغطات) + `TasbihWidgetPlugin` (drain / update / info / requestPin) + `www/js/widget.js`. يسحب التطبيق الضغطات عند الفتح ويرسل العدد عند الخروج. عند تحقيق الهدف من الويدجت يُلغي تذكيرات اليوم المتبقية (PendingIntent بنفس requestCode) |
| الاختبارات | `tests/logic.test.js` (١٨ اختبار، يعمل في CI) · `tests/e2e.test.js` (١٦ سيناريو مع محاكاة الإضافات) |
| التوقيع | debug: `android/app/test-signing.p12` (ثابت، ليس سرياً) · release: من أسرار GitHub |

```bash
npm ci
TZ=Asia/Riyadh node tests/logic.test.js
node scripts/configure.js
bash scripts/make-sound.sh
npx cap sync android
cd android && ./gradlew assembleDebug
```
