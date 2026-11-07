package com.yellowline.tasbih;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.VibrationAttributes;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.widget.RemoteViews;
import java.text.NumberFormat;
import java.util.Calendar;
import java.util.Locale;

/** ويدجت المسبحة: اضغط عليه للاستغفار بدون فتح التطبيق. */
public class TasbihWidget extends AppWidgetProvider {

    static final String ACTION_TAP = "com.yellowline.tasbih.WIDGET_TAP";
    static final String ACTION_MIDNIGHT = "com.yellowline.tasbih.WIDGET_MIDNIGHT";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) manager.updateAppWidget(id, build(context));
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_MIDNIGHT.equals(intent.getAction())) {
            refreshAll(context); // يوم جديد: يبدأ العداد من الصفر
            return;
        }
        if (!ACTION_TAP.equals(intent.getAction())) return;
        int goal = WidgetStore.goal(context);
        int cycle = WidgetStore.cycle(context);
        int before = WidgetStore.total(context);
        int after = WidgetStore.increment(context);
        if (goal > 0 && before < goal && after >= goal) {
            vibrate(context, new long[] { 0, 40, 60, 90 });
            WidgetStore.cancelTodayReminders(context);
        } else if (cycle > 0 && after % cycle == 0) {
            vibrate(context, new long[] { 0, 70 });
        } else {
            vibrate(context, new long[] { 0, 12 });
        }
        refreshAll(context);
    }

    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, TasbihWidget.class));
        RemoteViews views = build(context);
        for (int id : ids) manager.updateAppWidget(id, views);
        if (ids.length > 0) scheduleMidnight(context);
    }

    @Override
    public void onEnabled(Context context) {
        scheduleMidnight(context);
    }

    @Override
    public void onDisabled(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(midnightIntent(context));
    }

    private static PendingIntent midnightIntent(Context context) {
        int immutable = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0;
        Intent i = new Intent(context, TasbihWidget.class).setAction(ACTION_MIDNIGHT);
        return PendingIntent.getBroadcast(context, 2, i, PendingIntent.FLAG_UPDATE_CURRENT | immutable);
    }

    /** تحديث بعد منتصف الليل بدقيقة (منبّه غير دقيق — لا يحتاج إذناً). */
    static void scheduleMidnight(Context context) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            Calendar c = Calendar.getInstance();
            c.add(Calendar.DAY_OF_YEAR, 1);
            c.set(Calendar.HOUR_OF_DAY, 0);
            c.set(Calendar.MINUTE, 1);
            c.set(Calendar.SECOND, 0);
            c.set(Calendar.MILLISECOND, 0);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setAndAllowWhileIdle(AlarmManager.RTC, c.getTimeInMillis(), midnightIntent(context));
            } else {
                am.set(AlarmManager.RTC, c.getTimeInMillis(), midnightIntent(context));
            }
        } catch (Exception ignored) {}
    }

    static int installedCount(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        return manager.getAppWidgetIds(new ComponentName(context, TasbihWidget.class)).length;
    }

    private static String num(Context context, int n) {
        Locale loc = Locale.forLanguageTag(WidgetStore.label(context, "locale", "ar-EG"));
        return NumberFormat.getIntegerInstance(loc).format(n);
    }

    static RemoteViews build(Context context) {
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.tasbih_widget);
        int count = WidgetStore.total(context);
        int goal = WidgetStore.goal(context);

        v.setTextViewText(R.id.widget_title, WidgetStore.text(context));
        v.setTextViewText(R.id.widget_count, num(context, count));

        if (goal > 0) {
            v.setViewVisibility(R.id.widget_progress, View.VISIBLE);
            v.setProgressBar(R.id.widget_progress, goal, Math.min(count, goal), false);
            String sub = count >= goal
                ? WidgetStore.label(context, "label_done", "🎉 حققت هدفك اليوم")
                : WidgetStore.label(context, "label_left", "باقي {n} من {goal}")
                    .replace("{n}", num(context, goal - count))
                    .replace("{goal}", num(context, goal));
            v.setTextViewText(R.id.widget_sub, sub);
        } else {
            v.setViewVisibility(R.id.widget_progress, View.GONE);
            v.setTextViewText(R.id.widget_sub, WidgetStore.label(context, "label_tap", "اضغط للاستغفار"));
        }

        int immutable = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0;

        Intent tap = new Intent(context, TasbihWidget.class).setAction(ACTION_TAP);
        PendingIntent tapPi = PendingIntent.getBroadcast(context, 0, tap, PendingIntent.FLAG_UPDATE_CURRENT | immutable);
        v.setOnClickPendingIntent(R.id.widget_root, tapPi);

        Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (open != null) {
            open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
            PendingIntent openPi = PendingIntent.getActivity(context, 1, open, PendingIntent.FLAG_UPDATE_CURRENT | immutable);
            v.setOnClickPendingIntent(R.id.widget_open, openPi);
        }
        return v;
    }

    @SuppressWarnings("deprecation")
    private static void vibrate(Context context, long[] pattern) {
        try {
            Vibrator vib = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (vib == null || !vib.hasVibrator()) return;
            // نحدد نوع الاهتزاز "إشعار" حتى لا يتجاهله أندرويد ١٠+ (التطبيق يُعد في الخلفية أثناء ضغط الويدجت)
            if (Build.VERSION.SDK_INT >= 33) {
                vib.vibrate(
                    VibrationEffect.createWaveform(pattern, -1),
                    VibrationAttributes.createForUsage(VibrationAttributes.USAGE_NOTIFICATION)
                );
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vib.vibrate(
                    VibrationEffect.createWaveform(pattern, -1),
                    new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT).build()
                );
            } else {
                vib.vibrate(pattern, -1);
            }
        } catch (Exception ignored) {}
    }
}
