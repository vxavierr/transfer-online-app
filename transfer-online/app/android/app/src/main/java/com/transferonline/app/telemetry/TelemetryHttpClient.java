package com.transferonline.app.telemetry;

import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * TelemetryHttpClient — cliente HTTP leve sem dependência de OkHttp.
 *
 * Usa HttpURLConnection puro para enviar lotes de eventos ao endpoint de telemetria
 * do Base44:
 *
 *   POST {url}/api/apps/{appId}/functions/telemetry
 *
 * Body:
 * {
 *   "action": "logBatch",
 *   "sessionId": "...",
 *   "events": [...],
 *   "currentStats": {...}
 * }
 */
public class TelemetryHttpClient {

    private static final String TAG         = "VistaTelemetryFGS";
    private static final int    CONNECT_TIMEOUT = 15_000;
    private static final int    READ_TIMEOUT    = 15_000;

    private static final String APP_ID = "68effdb75fcac474f3f66b8f";

    /**
     * Envia um batch de eventos ao backend.
     *
     * @param url       Base URL (ex: https://base44.app)
     * @param token     Bearer token de autenticação
     * @param sessionId ID da sessão de telemetria
     * @param events    Array JSON com os eventos
     * @param stats     Objeto JSON com estatísticas atuais da sessão
     * @return true se HTTP 2xx
     */
    public static boolean postBatch(String url, String token,
                                    String sessionId,
                                    JSONArray events, JSONObject stats) {
        String endpoint = url + "/api/apps/" + APP_ID + "/functions/telemetry";
        HttpURLConnection conn = null;

        try {
            JSONObject body = new JSONObject();
            body.put("action",       "logBatch");
            body.put("sessionId",    sessionId);
            body.put("events",       events);
            body.put("currentStats", stats != null ? stats : new JSONObject());

            byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);

            conn = (HttpURLConnection) new URL(endpoint).openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(CONNECT_TIMEOUT);
            conn.setReadTimeout(READ_TIMEOUT);
            conn.setDoOutput(true);
            conn.setRequestProperty("Authorization",  "Bearer " + token);
            conn.setRequestProperty("Content-Type",   "application/json; charset=utf-8");
            conn.setRequestProperty("Content-Length",  String.valueOf(payload.length));
            conn.setRequestProperty("User-Agent",      "TransferOnline-Android/1.0");

            try (OutputStream os = conn.getOutputStream()) {
                os.write(payload);
            }

            int code = conn.getResponseCode();
            boolean success = (code >= 200 && code < 300);

            if (success) {
                Log.d(TAG, "postBatch OK — " + events.length() + " events, HTTP " + code);
            } else {
                Log.w(TAG, "postBatch FAILED — HTTP " + code + " endpoint=" + endpoint);
            }

            return success;

        } catch (Exception e) {
            Log.e(TAG, "postBatch exception: " + e.getMessage(), e);
            return false;
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }
}
