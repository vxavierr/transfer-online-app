package com.transferonline.app.telemetry;

import android.content.SharedPreferences;

/**
 * TelemetryConfig — POJO de configuração do serviço de telemetria.
 * Lê e persiste configuração em SharedPreferences "telemetry_prefs".
 */
public class TelemetryConfig {

    public static final String PREFS_NAME = "telemetry_prefs";

    // Keys
    private static final String KEY_URL              = "telemetry_url";
    private static final String KEY_TOKEN            = "telemetry_token";
    private static final String KEY_VEHICLE_ID       = "telemetry_vehicle_id";
    private static final String KEY_DRIVER_ID        = "telemetry_driver_id";
    private static final String KEY_SESSION_ID       = "telemetry_session_id";
    private static final String KEY_SEND_INTERVAL_MS = "telemetry_send_interval_ms";

    public String url             = "https://base44.app";
    public String token           = "";
    public String vehicleId       = "";
    public String driverId        = "";
    public String sessionId       = "";
    public long   sendIntervalMs  = 5000L;

    // ------------------------------------------------------------------ //
    //  Factory — lê de SharedPreferences
    // ------------------------------------------------------------------ //
    public static TelemetryConfig fromPrefs(SharedPreferences prefs) {
        TelemetryConfig cfg = new TelemetryConfig();
        cfg.url            = prefs.getString(KEY_URL, "https://base44.app");
        cfg.token          = prefs.getString(KEY_TOKEN, "");
        cfg.vehicleId      = prefs.getString(KEY_VEHICLE_ID, "");
        cfg.driverId       = prefs.getString(KEY_DRIVER_ID, "");
        cfg.sessionId      = prefs.getString(KEY_SESSION_ID, "");
        cfg.sendIntervalMs = prefs.getLong(KEY_SEND_INTERVAL_MS, 5000L);
        return cfg;
    }

    // ------------------------------------------------------------------ //
    //  Persistência
    // ------------------------------------------------------------------ //
    public void saveToPrefs(SharedPreferences prefs) {
        prefs.edit()
            .putString(KEY_URL, url)
            .putString(KEY_TOKEN, token)
            .putString(KEY_VEHICLE_ID, vehicleId)
            .putString(KEY_DRIVER_ID, driverId)
            .putString(KEY_SESSION_ID, sessionId)
            .putLong(KEY_SEND_INTERVAL_MS, sendIntervalMs)
            .commit();
    }
}
