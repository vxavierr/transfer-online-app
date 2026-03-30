package com.transferonline.app.telemetry;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * TelemetryForegroundPlugin — Plugin Capacitor que expõe o Foreground Service
 * de telemetria GPS ao JavaScript/React.
 *
 * Métodos disponíveis no JS:
 *   TelemetryForeground.start({ url, token, vehicleId, driverId, sessionId, sendIntervalMs })
 *   TelemetryForeground.stop()
 *   TelemetryForeground.requestImmediateFlush()
 */
@CapacitorPlugin(name = "TelemetryForeground")
public class TelemetryForegroundPlugin extends Plugin {

    private static final String TAG = "VistaTelemetryFGS";

    /**
     * Inicia o rastreamento.
     * Persiste a configuração em SharedPreferences e dispara ACTION_START_TRACKING.
     */
    @PluginMethod
    public void start(PluginCall call) {
        // Verificar permissão de localização ANTES de iniciar o serviço
        // Sem isso, o serviço inicia mas GPS falha silenciosamente
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            Log.e(TAG, "start() — ACCESS_FINE_LOCATION not granted, aborting");
            call.reject("Location permission not granted");
            return;
        }

        String url            = call.getString("url", "https://base44.app");
        String token          = call.getString("token", "");
        String vehicleId      = call.getString("vehicleId", "");
        String driverId       = call.getString("driverId", "");
        String sessionId      = call.getString("sessionId", "");
        int    sendIntervalMs = call.getInt("sendIntervalMs", 5000);

        if (token == null || token.isEmpty()) {
            Log.w(TAG, "start() — token is empty, HTTP calls will likely fail (401)");
        }

        Log.d(TAG, "start() — session=" + sessionId + " driver=" + driverId + " token=" + (token != null && !token.isEmpty() ? "present" : "EMPTY"));

        SharedPreferences prefs = getContext()
                .getSharedPreferences(TelemetryConfig.PREFS_NAME, Context.MODE_PRIVATE);

        prefs.edit()
                .putString("telemetry_url",              url)
                .putString("telemetry_token",            token)
                .putString("telemetry_vehicle_id",       vehicleId)
                .putString("telemetry_driver_id",        driverId)
                .putString("telemetry_session_id",       sessionId)
                .putLong("telemetry_send_interval_ms",   (long) sendIntervalMs)
                .putBoolean(LocationTelemetryForegroundService.KEY_TRACKING_ACTIVE, true)
                .commit();

        Intent intent = new Intent(getContext(), LocationTelemetryForegroundService.class);
        intent.setAction(LocationTelemetryForegroundService.ACTION_START_TRACKING);
        ContextCompat.startForegroundService(getContext(), intent);

        // Pass WebView reference to FGS for JS bridge
        LocationTelemetryForegroundService.setWebView(getBridge().getWebView());

        Log.d(TAG, "start() — service launch requested");
        call.resolve();
    }

    /**
     * Para o rastreamento e encerra o Foreground Service.
     */
    @PluginMethod
    public void stop(PluginCall call) {
        Intent intent = new Intent(getContext(), LocationTelemetryForegroundService.class);
        intent.setAction(LocationTelemetryForegroundService.ACTION_STOP_TRACKING);
        getContext().startService(intent);
        call.resolve();
    }

    /**
     * Solicita flush imediato do buffer de eventos.
     */
    @PluginMethod
    public void requestImmediateFlush(PluginCall call) {
        Intent intent = new Intent(getContext(), LocationTelemetryForegroundService.class);
        intent.setAction(LocationTelemetryForegroundService.ACTION_FLUSH);
        getContext().startService(intent);
        call.resolve();
    }

    /**
     * Define o destino para o geofence de chegada.
     * Quando o motorista chega a <= radiusMeters do destino, dispara alerta full-screen.
     */
    @PluginMethod
    public void setDestination(PluginCall call) {
        Double lat = call.getDouble("latitude");
        Double lon = call.getDouble("longitude");
        Float radius = call.getFloat("radiusMeters", 100f);

        if (lat == null || lon == null) {
            call.reject("latitude and longitude are required");
            return;
        }

        LocationTelemetryForegroundService.setDestination(lat, lon, radius);
        Log.d(TAG, "setDestination: " + lat + ", " + lon + " r=" + radius);
        call.resolve();
    }

    /**
     * Limpa o destino ativo (ex: ao encerrar a viagem).
     */
    @PluginMethod
    public void clearDestination(PluginCall call) {
        LocationTelemetryForegroundService.clearDestination();
        call.resolve();
    }
}
