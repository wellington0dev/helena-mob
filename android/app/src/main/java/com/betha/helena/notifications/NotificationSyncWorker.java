package com.betha.helena.notifications;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Pull periódico da fila de notificações (§10). Roda em background (WorkManager),
 * SEM a WebView. A cada ciclo:
 *   - GET /notifications/pending (próximas 24h, não entregues);
 *   - posta LOCALMENTE só as já vencidas (fire_at <= agora) — o timing exato das
 *     futuras vem do @capacitor/local-notifications quando o app é aberto;
 *   - dá ack só nas que postou (dedup entre este Worker e o sync do TS).
 *
 * Postar só as vencidas evita disparo adiantado; o custo é latência de até um
 * ciclo (~15 min), que o §10 tolera explicitamente. (Um look-ahead pequeno
 * reduziria a latência ao custo de disparo adiantado — tuning.)
 */
public class NotificationSyncWorker extends Worker {
    public static final String TAG = "HelenaWorker";

    public NotificationSyncWorker(@NonNull Context ctx, @NonNull WorkerParameters params) {
        super(ctx, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context ctx = getApplicationContext();
        SharedPreferences prefs = SecureStore.get(ctx);
        String baseUrl = prefs.getString(SecureStore.KEY_BASE_URL, null);
        String token = prefs.getString(SecureStore.KEY_TOKEN, null);
        if (baseUrl == null || token == null) {
            Log.i(TAG, "sem credenciais — nada a fazer");
            return Result.success();
        }

        try {
            JSONArray pending = fetchPending(baseUrl, token);
            long now = System.currentTimeMillis();
            HelenaNotifications.ensureChannel(ctx);

            List<Integer> posted = new ArrayList<>();
            for (int i = 0; i < pending.length(); i++) {
                JSONObject n = pending.getJSONObject(i);
                long fireAt = OffsetDateTime.parse(n.getString("fire_at"))
                        .toInstant().toEpochMilli();
                if (fireAt > now) continue; // ainda futura → próximo ciclo / local-notifications

                int id = n.getInt("id");
                String title = n.optString("title", "Helena");
                String body = n.optString("body", "");
                String type = n.optString("type", "reminder");
                if ("job_done".equals(type) || "ai_initiative".equals(type)) {
                    HelenaNotifications.postReplyable(ctx, id, title, body);
                } else {
                    HelenaNotifications.postSimple(ctx, id, title, body);
                }
                posted.add(id);
            }

            if (!posted.isEmpty()) {
                ack(baseUrl, token, posted); // ack SÓ após postar (dedup)
                Log.i(TAG, "postou e deu ack em " + posted.size() + " notificações");
            } else {
                Log.i(TAG, "nenhuma notificação vencida (" + pending.length() + " pendentes)");
            }
            return Result.success();
        } catch (Exception e) {
            Log.w(TAG, "falha no pull: " + e.getMessage());
            return Result.retry();
        }
    }

    private JSONArray fetchPending(String baseUrl, String token) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(
                baseUrl + "/notifications/pending").openConnection();
        try {
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(15000);
            conn.setRequestProperty("Authorization", "Bearer " + token);
            StringBuilder sb = new StringBuilder();
            try (BufferedReader r = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = r.readLine()) != null) sb.append(line);
            }
            return new JSONObject(sb.toString()).getJSONArray("notifications");
        } finally {
            conn.disconnect();
        }
    }

    private void ack(String baseUrl, String token, List<Integer> ids) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(
                baseUrl + "/notifications/ack").openConnection();
        try {
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(15000);
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Authorization", "Bearer " + token);
            JSONObject body = new JSONObject().put("ids", new JSONArray(ids));
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.toString().getBytes(StandardCharsets.UTF_8));
            }
            conn.getResponseCode(); // dispara a requisição
        } finally {
            conn.disconnect();
        }
    }
}
