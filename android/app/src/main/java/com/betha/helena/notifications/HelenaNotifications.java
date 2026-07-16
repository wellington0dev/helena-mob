package com.betha.helena.notifications;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.RemoteInput;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.TimeUnit;

/**
 * Plugin nativo da Helena (Nível B, §11): responder mensagem da IA direto pela
 * notificação (RemoteInput), sem abrir a WebView. A resposta é capturada pelo
 * {@link ReplyReceiver}, que posta no Flask.
 *
 * NOTA: escrito em Java (não Kotlin como no §11) porque o módulo app do
 * Capacitor 8 não tem toolchain Kotlin; comportamento é idêntico.
 */
@CapacitorPlugin(name = "HelenaNotifications")
public class HelenaNotifications extends Plugin {
    public static final String CHANNEL_ID = "helena_messages";

    @Override
    public void load() {
        ensureChannel(getContext());
    }

    /** Cria o canal se preciso. Estático: o Worker (app em background) também usa. */
    static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "Mensagens da Helena",
                    NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Mensagens e lembretes com resposta rápida");
            NotificationManager nm = ctx.getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    /** Guarda baseUrl + JWT + userId no store seguro (chamado após o login). */
    @PluginMethod
    public void setAuth(PluginCall call) {
        String baseUrl = call.getString("baseUrl");
        String token = call.getString("token");
        String userId = call.getString("userId");
        if (baseUrl == null || token == null) {
            call.reject("baseUrl e token são obrigatórios");
            return;
        }
        SecureStore.setAuth(getContext(), baseUrl, token, userId);
        schedulePeriodicSync(getContext()); // liga o pull de fundo (§10)
        call.resolve();
    }

    /** Limpa as credenciais (chamado no logout). */
    @PluginMethod
    public void clearAuth(PluginCall call) {
        SecureStore.clear(getContext());
        WorkManager.getInstance(getContext()).cancelUniqueWork(WORK_NAME);
        call.resolve();
    }

    /** Dispara um pull imediato (usado para testar o Worker sem esperar 15 min). */
    @PluginMethod
    public void syncNow(PluginCall call) {
        OneTimeWorkRequest req = new OneTimeWorkRequest.Builder(
                NotificationSyncWorker.class).build();
        WorkManager.getInstance(getContext()).enqueue(req);
        call.resolve();
    }

    private static final String WORK_NAME = "helena_notif_sync";

    /** Enfileira o pull periódico (mínimo do Android: 15 min). Único/idempotente. */
    static void schedulePeriodicSync(Context ctx) {
        PeriodicWorkRequest req = new PeriodicWorkRequest.Builder(
                NotificationSyncWorker.class, 15, TimeUnit.MINUTES).build();
        WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(
                WORK_NAME, ExistingPeriodicWorkPolicy.KEEP, req);
    }

    /**
     * Posta uma notificação com campo de resposta inline (RemoteInput). Usada
     * para mensagens da IA que o usuário pode responder pela notificação.
     */
    @PluginMethod
    public void notifyReplyable(PluginCall call) {
        Integer id = call.getInt("id");
        String title = call.getString("title", "Helena");
        String body = call.getString("body", "");
        if (id == null) {
            call.reject("id é obrigatório");
            return;
        }
        postReplyable(getContext(), id, title, body);
        call.resolve();
    }

    /** Notificação simples (lembrete): sem ação de resposta, toque abre o app. */
    static void postSimple(Context ctx, int id, String title, String body) {
        Notification notif = new NotificationCompat.Builder(ctx, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .build();
        NotificationManager nm =
                (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(id, notif);
    }

    /** Monta e dispara a notificação respondível. */
    static void postReplyable(Context ctx, int id, String title, String body) {
        RemoteInput remoteInput = new RemoteInput.Builder(ReplyReceiver.KEY_REPLY)
                .setLabel("Responder…")
                .build();

        Intent replyIntent = new Intent(ctx, ReplyReceiver.class)
                .setAction(ReplyReceiver.ACTION_REPLY)
                .putExtra(ReplyReceiver.EXTRA_NOTIF_ID, id);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE; // RemoteInput exige mutable no 12+
        }
        PendingIntent replyPending = PendingIntent.getBroadcast(ctx, id, replyIntent, flags);

        NotificationCompat.Action action = new NotificationCompat.Action.Builder(
                android.R.drawable.ic_menu_send, "Responder", replyPending)
                .addRemoteInput(remoteInput)
                .setAllowGeneratedReplies(true)
                .build();

        Notification notif = new NotificationCompat.Builder(ctx, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_email)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .addAction(action)
                .build();

        NotificationManager nm =
                (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(id, notif);
    }
}
