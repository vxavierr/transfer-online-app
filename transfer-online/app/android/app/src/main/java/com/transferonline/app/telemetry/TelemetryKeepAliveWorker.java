package com.transferonline.app.telemetry;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

/**
 * TelemetryKeepAliveWorker — WorkManager worker periódico (15 min).
 *
 * Garante que o Foreground Service de telemetria seja reiniciado
 * caso tenha sido morto pelo sistema operacional.
 */
public class TelemetryKeepAliveWorker extends Worker {

    private static final String TAG = "VistaTelemetryFGS";

    public TelemetryKeepAliveWorker(@NonNull Context context,
                                     @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        SharedPreferences prefs = context.getSharedPreferences(
                TelemetryConfig.PREFS_NAME, Context.MODE_PRIVATE);

        boolean trackingActive = prefs.getBoolean(
                LocationTelemetryForegroundService.KEY_TRACKING_ACTIVE, false);

        Log.d(TAG, "KeepAliveWorker.doWork — trackingActive=" + trackingActive);

        if (trackingActive) {
            try {
                Intent intent = new Intent(context, LocationTelemetryForegroundService.class);
                intent.setAction(LocationTelemetryForegroundService.ACTION_RESTART_FROM_ALARM);
                ContextCompat.startForegroundService(context, intent);
            } catch (Exception e) {
                Log.e(TAG, "KeepAliveWorker: failed to restart FGS: " + e.getMessage());
            }
        }

        return Result.success();
    }
}
