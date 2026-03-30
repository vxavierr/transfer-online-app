package com.transferonline.app.telemetry;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.util.Log;

import androidx.core.content.ContextCompat;

/**
 * TelemetryTrackingBootReceiver — reinicia o serviço de telemetria após reboot do dispositivo,
 * caso o tracking estivesse ativo antes do desligamento.
 */
public class TelemetryTrackingBootReceiver extends BroadcastReceiver {

    private static final String TAG = "VistaTelemetryFGS";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) return;

        SharedPreferences prefs = context.getSharedPreferences(
                TelemetryConfig.PREFS_NAME, Context.MODE_PRIVATE);
        boolean trackingActive = prefs.getBoolean(
                LocationTelemetryForegroundService.KEY_TRACKING_ACTIVE, false);

        Log.d(TAG, "BOOT_COMPLETED — trackingActive=" + trackingActive);

        if (trackingActive) {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
                    != PackageManager.PERMISSION_GRANTED) {
                Log.w(TAG, "BOOT_COMPLETED — location permission revoked, skipping restart");
                return;
            }
            try {
                Intent serviceIntent = new Intent(context, LocationTelemetryForegroundService.class);
                serviceIntent.setAction(LocationTelemetryForegroundService.ACTION_RESTART_FROM_ALARM);
                ContextCompat.startForegroundService(context, serviceIntent);
            } catch (Exception e) {
                Log.e(TAG, "BOOT_COMPLETED — failed to restart FGS: " + e.getMessage());
            }
        }
    }
}
