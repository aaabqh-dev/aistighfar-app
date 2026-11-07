package com.yellowline.tasbih;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Iterator;
import org.json.JSONObject;

/** الجسر بين واجهة التطبيق (JavaScript) والويدجت. */
@CapacitorPlugin(name = "TasbihWidget")
public class TasbihWidgetPlugin extends Plugin {

    /** يسحب ضغطات الويدجت غير المستلمة: { counts: { "YYYY-MM-DD": n } } */
    @PluginMethod
    public void drain(PluginCall call) {
        JSONObject pend = WidgetStore.drain(getContext());
        JSObject counts = new JSObject();
        Iterator<String> keys = pend.keys();
        while (keys.hasNext()) {
            String k = keys.next();
            counts.put(k, pend.optInt(k, 0));
        }
        JSObject ret = new JSObject();
        ret.put("counts", counts);
        call.resolve(ret);
    }

    /** يرسل حالة اليوم للويدجت ويحدّثه. */
    @PluginMethod
    public void update(PluginCall call) {
        String day = call.getString("day", WidgetStore.today());
        int count = call.getInt("count", 0);
        int goal = call.getInt("goal", 0);
        int cycle = call.getInt("cycle", 100);
        String text = call.getString("text", "أستغفر الله");
        JSArray reminders = call.getArray("reminders", new JSArray());
        WidgetStore.setBase(getContext(), day, count, goal, cycle, text, reminders.toString());
        WidgetStore.setLabels(
            getContext(),
            call.getString("locale"),
            call.getString("labelLeft"),
            call.getString("labelDone"),
            call.getString("labelTap")
        );
        TasbihWidget.refreshAll(getContext());
        call.resolve();
    }

    /** عدد الويدجتات المضافة، وهل يدعم الجوال الإضافة من داخل التطبيق. */
    @PluginMethod
    public void info(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("installed", TasbihWidget.installedCount(getContext()));
        boolean canPin = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            canPin = AppWidgetManager.getInstance(getContext()).isRequestPinAppWidgetSupported();
        }
        ret.put("canPin", canPin);
        call.resolve(ret);
    }

    /** يطلب من الشاشة الرئيسية إضافة الويدجت (أندرويد ٨ فأحدث). */
    @PluginMethod
    public void requestPin(PluginCall call) {
        JSObject ret = new JSObject();
        boolean requested = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
            if (manager.isRequestPinAppWidgetSupported()) {
                requested = manager.requestPinAppWidget(new ComponentName(getContext(), TasbihWidget.class), null, null);
            }
        }
        ret.put("requested", requested);
        call.resolve(ret);
    }

    /** يفتح إعدادات الإشعارات الخاصة بالتطبيق. */
    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        Intent i = new Intent();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            i.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            i.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
        } else {
            i.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            i.setData(Uri.parse("package:" + getContext().getPackageName()));
        }
        startSettings(call, i);
    }

    /** يفتح صفحة معلومات التطبيق (ومنها البطارية). */
    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        i.setData(Uri.parse("package:" + getContext().getPackageName()));
        startSettings(call, i);
    }

    private void startSettings(PluginCall call, Intent i) {
        try {
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("settings-unavailable");
        }
    }
}
