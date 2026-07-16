package com.betha.helena.notifications;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

/**
 * Guarda as credenciais (baseUrl, JWT, userId) que o BroadcastReceiver usa para
 * postar a resposta direto no Flask, sem abrir a WebView. Usa
 * EncryptedSharedPreferences (§11 — token nunca em texto plano).
 */
public final class SecureStore {
    private static final String FILE = "helena_secure_prefs";
    public static final String KEY_BASE_URL = "baseUrl";
    public static final String KEY_TOKEN = "token";
    public static final String KEY_USER_ID = "userId";

    private SecureStore() {}

    public static SharedPreferences get(Context ctx) {
        try {
            MasterKey masterKey = new MasterKey.Builder(ctx)
                    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                    .build();
            return EncryptedSharedPreferences.create(
                    ctx,
                    FILE,
                    masterKey,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );
        } catch (Exception e) {
            throw new RuntimeException("falha ao abrir o store seguro", e);
        }
    }

    public static void setAuth(Context ctx, String baseUrl, String token, String userId) {
        get(ctx).edit()
                .putString(KEY_BASE_URL, baseUrl)
                .putString(KEY_TOKEN, token)
                .putString(KEY_USER_ID, userId)
                .apply();
    }

    public static void clear(Context ctx) {
        get(ctx).edit().clear().apply();
    }
}
