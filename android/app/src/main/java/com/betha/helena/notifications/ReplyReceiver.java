package com.betha.helena.notifications;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.RemoteInput;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Recebe a resposta digitada na notificação (RemoteInput) e faz POST direto no
 * Flask, em background, SEM abrir a WebView (§11). A rede precisa rodar fora da
 * main thread → goAsync() + Thread.
 */
public class ReplyReceiver extends BroadcastReceiver {
    public static final String ACTION_REPLY = "com.betha.helena.REPLY";
    public static final String KEY_REPLY = "key_reply";
    public static final String EXTRA_NOTIF_ID = "notif_id";
    private static final String TAG = "HelenaReply";

    @Override
    public void onReceive(Context context, Intent intent) {
        Bundle results = RemoteInput.getResultsFromIntent(intent);
        CharSequence reply = results != null ? results.getCharSequence(KEY_REPLY) : null;
        int notifId = intent.getIntExtra(EXTRA_NOTIF_ID, 0);
        if (reply == null || reply.toString().trim().isEmpty()) {
            return;
        }

        final String text = reply.toString().trim();
        final Context appCtx = context.getApplicationContext();
        final PendingResult pending = goAsync();

        new Thread(() -> {
            boolean ok = false;
            try {
                ok = postMessage(appCtx, text);
            } catch (Exception e) {
                Log.w(TAG, "falha ao enviar resposta", e);
            } finally {
                updateNotification(appCtx, notifId, ok);
                pending.finish();
            }
        }).start();
    }

    private boolean postMessage(Context ctx, String text) throws Exception {
        SharedPreferences prefs = SecureStore.get(ctx);
        String baseUrl = prefs.getString(SecureStore.KEY_BASE_URL, null);
        String token = prefs.getString(SecureStore.KEY_TOKEN, null);
        if (baseUrl == null || token == null) {
            Log.w(TAG, "sem credenciais (não logado no nativo) — resposta ignorada");
            return false;
        }

        URL url = new URL(baseUrl + "/messages");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        try {
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(15000);
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Authorization", "Bearer " + token);

            String body = new JSONObject().put("content", text).toString();
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes(StandardCharsets.UTF_8));
            }
            int code = conn.getResponseCode();
            return code >= 200 && code < 300;
        } finally {
            conn.disconnect();
        }
    }

    /** Atualiza a notificação existente: "enviado ✓" ou "falha ao enviar". */
    private void updateNotification(Context ctx, int notifId, boolean ok) {
        NotificationManager nm =
                (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationCompat.Builder b =
                new NotificationCompat.Builder(ctx, HelenaNotifications.CHANNEL_ID)
                        .setSmallIcon(android.R.drawable.ic_dialog_email)
                        .setContentText(ok ? "Enviado ✓" : "Falha ao enviar")
                        .setTimeoutAfter(3000)
                        .setOnlyAlertOnce(true);
        nm.notify(notifId, b.build());
    }
}
