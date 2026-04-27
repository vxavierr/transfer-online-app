package com.transferonline.app.telemetry;

import android.content.Context;
import android.util.Log;

import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import java.util.concurrent.TimeUnit;

/**
 * TelemetryScheduler — agenda e cancela o TelemetryKeepAliveWorker via WorkManager.
 *
 * O worker roda a cada 15 minutos (mínimo permitido pelo WorkManager) e
 * garante que o Foreground Service seja reiniciado se necessário.
 */
public class TelemetryScheduler {

    private static final String TAG       = "VistaTelemetryFGS";
    private static final String WORK_NAME = "telemetry_keep_alive";

    /**
     * Agenda o worker periódico de keep-alive.
     * Política KEEP: não substitui se já existir.
     */
    public static void schedule(Context context) {
        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(
                TelemetryKeepAliveWorker.class,
                15, TimeUnit.MINUTES
        ).build();

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request
        );

        Log.d(TAG, "TelemetryScheduler: keep-alive work scheduled");
    }

    /**
     * Cancela o worker periódico.
     */
    public static void cancel(Context context) {
        WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME);
        Log.d(TAG, "TelemetryScheduler: keep-alive work cancelled");
    }
}
