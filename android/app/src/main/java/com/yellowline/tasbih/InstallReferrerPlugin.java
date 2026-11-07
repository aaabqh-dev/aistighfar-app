package com.yellowline.tasbih;

import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.android.installreferrer.api.ReferrerDetails;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * يقرأ "مُحيل التثبيت" من Google Play: عندما يثبّت شخص التطبيق من رابط دعوة
 * (…&referrer=r%3DCODE) نحصل هنا على "r=CODE" لمرة واحدة بعد التثبيت.
 */
@CapacitorPlugin(name = "InstallReferrer")
public class InstallReferrerPlugin extends Plugin {

    @PluginMethod
    public void getReferrer(final PluginCall call) {
        final AtomicBoolean done = new AtomicBoolean(false);
        final InstallReferrerClient client;
        try {
            client = InstallReferrerClient.newBuilder(getContext()).build();
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("referrer", "");
            call.resolve(ret);
            return;
        }
        client.startConnection(
            new InstallReferrerStateListener() {
                @Override
                public void onInstallReferrerSetupFinished(int responseCode) {
                    if (done.getAndSet(true)) return;
                    JSObject ret = new JSObject();
                    try {
                        if (responseCode == InstallReferrerClient.InstallReferrerResponse.OK) {
                            ReferrerDetails details = client.getInstallReferrer();
                            ret.put("referrer", details.getInstallReferrer());
                        } else {
                            ret.put("referrer", "");
                            ret.put("responseCode", responseCode);
                        }
                    } catch (Exception e) {
                        ret.put("referrer", "");
                    }
                    try {
                        client.endConnection();
                    } catch (Exception ignored) {}
                    call.resolve(ret);
                }

                @Override
                public void onInstallReferrerServiceDisconnected() {
                    if (done.getAndSet(true)) return;
                    JSObject ret = new JSObject();
                    ret.put("referrer", "");
                    call.resolve(ret);
                }
            }
        );
    }
}
