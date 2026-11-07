package com.yellowline.tasbih;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * تخزين مشترك بين الويدجت والتطبيق.
 * - base: عدد الاستغفار اليوم كما أرسله التطبيق آخر مرة (مع تاريخه).
 * - pending: ضغطات الويدجت التي لم يستلمها التطبيق بعد { "YYYY-MM-DD": count }.
 * عدد اليوم المعروض = base (إن كان لليوم نفسه) + pending لليوم.
 * عند فتح التطبيق يسحب pending (drain) ويضيفه لإحصائياته ثم يرسل base جديداً.
 */
final class WidgetStore {

    private static final String PREFS = "tasbih_widget";

    private WidgetStore() {}

    private static SharedPreferences prefs(Context c) {
        return c.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    private static JSONObject pending(SharedPreferences p) {
        try {
            return new JSONObject(p.getString("pending", "{}"));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    static synchronized int total(Context c) {
        SharedPreferences p = prefs(c);
        String d = today();
        int base = d.equals(p.getString("base_day", "")) ? p.getInt("base_count", 0) : 0;
        return base + pending(p).optInt(d, 0);
    }

    /** يزيد العدد ويعيد المجموع الجديد لليوم. */
    static synchronized int increment(Context c) {
        SharedPreferences p = prefs(c);
        JSONObject pend = pending(p);
        String d = today();
        try {
            pend.put(d, pend.optInt(d, 0) + 1);
        } catch (Exception ignored) {}
        p.edit().putString("pending", pend.toString()).apply(); // الذاكرة تتحدث فوراً
        return total(c);
    }

    /** يعيد ضغطات الويدجت غير المستلمة ويمسحها (يستدعيه التطبيق). */
    static synchronized JSONObject drain(Context c) {
        SharedPreferences p = prefs(c);
        JSONObject pend = pending(p);
        p.edit().remove("pending").commit();
        return pend;
    }

    static synchronized void setBase(Context c, String day, int count, int goal, int cycle, String text, String reminders) {
        prefs(c)
            .edit()
            .putString("base_day", day)
            .putInt("base_count", Math.max(0, count))
            .putInt("goal", Math.max(0, goal))
            .putInt("cycle", Math.max(0, cycle))
            .putString("text", text == null || text.isEmpty() ? "أستغفر الله" : text)
            .putString("reminders", reminders == null ? "[]" : reminders)
            .putString("reminders_day", day)
            .commit();
    }

    /** نصوص الويدجت بلغة المستخدم (يرسلها التطبيق). */
    static synchronized void setLabels(Context c, String locale, String left, String done, String tap) {
        SharedPreferences.Editor e = prefs(c).edit();
        if (locale != null) e.putString("locale", locale);
        if (left != null) e.putString("label_left", left);
        if (done != null) e.putString("label_done", done);
        if (tap != null) e.putString("label_tap", tap);
        e.commit();
    }

    static String label(Context c, String key, String fallback) {
        return prefs(c).getString(key, fallback);
    }

    static int goal(Context c) {
        return prefs(c).getInt("goal", 0);
    }

    static int cycle(Context c) {
        return prefs(c).getInt("cycle", 100);
    }

    static String text(Context c) {
        return prefs(c).getString("text", "أستغفر الله");
    }

    /**
     * عند تحقيق الهدف من الويدجت: نلغي تذكيرات الاستغفار المتبقية لليوم
     * (التي جدولتها إضافة الإشعارات) كما يفعل التطبيق نفسه.
     * التذكير اليومي الاحتياطي وتذكيرات الصلاة لا تُرسل هنا أصلاً فلا تُلغى.
     */
    static synchronized void cancelTodayReminders(Context c) {
        SharedPreferences p = prefs(c);
        if (!today().equals(p.getString("reminders_day", ""))) return;
        try {
            JSONArray arr = new JSONArray(p.getString("reminders", "[]"));
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            long now = System.currentTimeMillis();
            int flags = PendingIntent.FLAG_NO_CREATE;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) flags |= PendingIntent.FLAG_MUTABLE;
            for (int i = 0; i < arr.length(); i++) {
                JSONObject r = arr.optJSONObject(i);
                if (r == null || r.optLong("at", 0) <= now) continue;
                Intent intent = new Intent();
                intent.setClassName(c.getPackageName(), "com.capacitorjs.plugins.localnotifications.TimedNotificationPublisher");
                PendingIntent pi = PendingIntent.getBroadcast(c, r.optInt("id"), intent, flags);
                if (pi != null && am != null) {
                    am.cancel(pi);
                    pi.cancel();
                }
            }
            p.edit().putString("reminders", "[]").commit();
        } catch (Exception ignored) {}
    }
}
