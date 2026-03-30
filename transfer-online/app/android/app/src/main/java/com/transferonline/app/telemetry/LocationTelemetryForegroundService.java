package com.transferonline.app.telemetry;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.location.Location;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.util.Log;

import android.content.pm.ServiceInfo;
import android.webkit.WebView;
import java.lang.ref.WeakReference;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * LocationTelemetryForegroundService — Foreground Service de rastreamento GPS.
 *
 * Responsabilidades:
 *  - Manter GPS ativo em background com PARTIAL_WAKE_LOCK
 *  - Usar FusedLocationProviderClient (alta precisão) + LocationManager (fallback)
 *  - Bufferar eventos e enviar em batch via TelemetryHttpClient
 *  - Reiniciar após reboot via TelemetryTrackingBootReceiver
 *  - Reagendar via AlarmManager quando a tarefa é removida pelo usuário
 */
public class LocationTelemetryForegroundService extends Service {

    private static final String TAG = "VistaTelemetryFGS";

    // Ações do Intent
    public static final String ACTION_START_TRACKING    = "ACTION_START_TRACKING";
    public static final String ACTION_STOP_TRACKING     = "ACTION_STOP_TRACKING";
    public static final String ACTION_FLUSH             = "ACTION_FLUSH";
    public static final String ACTION_RESTART_FROM_ALARM = "ACTION_RESTART_FROM_ALARM";

    // Notificação
    private static final String CHANNEL_ID   = "vista_telemetry_fg_low";
    private static final int    NOTIF_ID     = 1001;

    // SharedPreferences key para estado de tracking
    public static final String KEY_TRACKING_ACTIVE = "telemetry_tracking_active";

    // Configuração
    private TelemetryConfig config;

    // Location providers
    private FusedLocationProviderClient fusedClient;
    private LocationCallback            fusedCallback;

    // Buffer sincronizado de eventos
    private final List<TelemetryEvent> buffer = new ArrayList<>();

    // Handler para flush periódico (main looper)
    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable flushRunnable;

    // WakeLock
    private PowerManager.WakeLock wakeLock;

    // Executor para flush em background (evita thread leak)
    private final ExecutorService flushExecutor = Executors.newSingleThreadExecutor();

    // WebView reference for JS bridge (GPS push via evaluateJavascript)
    private static WeakReference<WebView> webViewRef = new WeakReference<>(null);

    public static void setWebView(WebView webView) {
        webViewRef = new WeakReference<>(webView);
    }

    // Destination geofence
    private double destLat = 0;
    private double destLon = 0;
    private float destRadiusMeters = 100f;
    private boolean destActive = false;
    private boolean destTriggered = false;

    private static double pendingDestLat = 0;
    private static double pendingDestLon = 0;
    private static float pendingDestRadius = 100f;
    private static boolean pendingDestSet = false;

    public static void setDestination(double lat, double lon, float radiusMeters) {
        pendingDestLat = lat;
        pendingDestLon = lon;
        pendingDestRadius = radiusMeters;
        pendingDestSet = true;
    }

    public static void clearDestination() {
        pendingDestSet = false;
        pendingDestLat = 0;
        pendingDestLon = 0;
    }

    // ------------------------------------------------------------------ //
    //  onCreate
    // ------------------------------------------------------------------ //
    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "onCreate");
        createNotificationChannel();
        createArrivalChannel();
    }

    // ------------------------------------------------------------------ //
    //  onStartCommand
    // ------------------------------------------------------------------ //
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            Log.w(TAG, "onStartCommand: intent null — returning START_NOT_STICKY");
            return START_NOT_STICKY;
        }

        String action = intent.getAction();
        Log.d(TAG, "onStartCommand action=" + action);

        if (ACTION_START_TRACKING.equals(action)) {
            return handleStartTracking();
        } else if (ACTION_STOP_TRACKING.equals(action)) {
            return handleStopTracking();
        } else if (ACTION_FLUSH.equals(action)) {
            flushBuffer();
            return START_NOT_STICKY;
        } else if (ACTION_RESTART_FROM_ALARM.equals(action)) {
            return handleRestartFromAlarm();
        }

        return START_NOT_STICKY;
    }

    // ------------------------------------------------------------------ //
    //  Handlers de ação
    // ------------------------------------------------------------------ //

    private int handleStartTracking() {
        SharedPreferences prefs = getSharedPreferences(TelemetryConfig.PREFS_NAME, MODE_PRIVATE);
        config = TelemetryConfig.fromPrefs(prefs);

        Log.d(TAG, "START_TRACKING — sessionId=" + config.sessionId
                + " driverId=" + config.driverId);

        // Wake lock
        acquireWakeLock();

        // Foreground notification — DEVE ser chamado nos primeiros 5 segundos!
        // Android 14+ exige foregroundServiceType explícito
        ServiceCompat.startForeground(this, NOTIF_ID, buildNotification(),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);

        // Iniciar coleta de localização
        startLocationUpdates();

        // Agendar flush periódico
        schedulePeriodicFlush();

        // Marcar tracking como ativo
        prefs.edit().putBoolean(KEY_TRACKING_ACTIVE, true).commit();

        return START_STICKY;
    }

    private int handleStopTracking() {
        Log.d(TAG, "STOP_TRACKING");

        // Flush final
        flushBuffer();

        // Parar listeners
        stopLocationUpdates();

        // Liberar wake lock
        releaseWakeLock();

        // Cancelar flush periódico
        cancelPeriodicFlush();

        // Marcar como inativo
        getSharedPreferences(TelemetryConfig.PREFS_NAME, MODE_PRIVATE)
                .edit().putBoolean(KEY_TRACKING_ACTIVE, false).commit();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
        stopSelf();

        return START_NOT_STICKY;
    }

    private int handleRestartFromAlarm() {
        SharedPreferences prefs = getSharedPreferences(TelemetryConfig.PREFS_NAME, MODE_PRIVATE);
        boolean active = prefs.getBoolean(KEY_TRACKING_ACTIVE, false);
        Log.d(TAG, "RESTART_FROM_ALARM — trackingActive=" + active);

        if (active) {
            return handleStartTracking();
        } else {
            stopSelf();
            return START_NOT_STICKY;
        }
    }

    // ------------------------------------------------------------------ //
    //  Location — FusedLocationProviderClient
    // ------------------------------------------------------------------ //

    private void startLocationUpdates() {
        fusedClient = LocationServices.getFusedLocationProviderClient(this);

        fusedCallback = new LocationCallback() {
            @Override
            public void onLocationResult(@NonNull LocationResult result) {
                for (Location loc : result.getLocations()) {
                    processLocation(loc);
                }
            }
        };

        LocationRequest request = new LocationRequest.Builder(
                Priority.PRIORITY_HIGH_ACCURACY, 5000L)
                .setMinUpdateIntervalMillis(3000L)
                .setMinUpdateDistanceMeters(5f)
                .build();

        try {
            fusedClient.requestLocationUpdates(request, fusedCallback, Looper.getMainLooper());
            Log.d(TAG, "FusedLocationClient started (sole provider)");
        } catch (SecurityException e) {
            Log.e(TAG, "FusedLocation SecurityException: " + e.getMessage());
        }
    }

    private void stopLocationUpdates() {
        if (fusedClient != null && fusedCallback != null) {
            fusedClient.removeLocationUpdates(fusedCallback);
            fusedClient = null;
            fusedCallback = null;
        }
    }

    // ------------------------------------------------------------------ //
    //  Processamento de localização
    // ------------------------------------------------------------------ //

    private void processLocation(Location location) {
        // Apply pending destination
        if (pendingDestSet) {
            destLat = pendingDestLat;
            destLon = pendingDestLon;
            destRadiusMeters = pendingDestRadius;
            destActive = true;
            destTriggered = false;
            pendingDestSet = false;
            Log.d(TAG, "Destination geofence set: " + destLat + ", " + destLon + " r=" + destRadiusMeters);
        }

        float accuracy = location.getAccuracy();
        // Descartar leituras com acurácia ruim (> 50m)
        if (accuracy > 50f) {
            Log.v(TAG, "Discarding low-accuracy location: " + accuracy + "m");
            return;
        }

        // Converter m/s → km/h
        double speedKmh = location.hasSpeed() ? location.getSpeed() * 3.6 : 0.0;

        // Descartar velocidades impossíveis (GPS jitter)
        if (speedKmh > 200.0) {
            Log.v(TAG, "Discarding impossible speed: " + speedKmh + " km/h");
            return;
        }

        TelemetryEvent event = new TelemetryEvent(
                "location_update",
                location.getLatitude(),
                location.getLongitude(),
                speedKmh,
                0.0,
                null,
                isoTimestamp(),
                (double) accuracy
        );

        synchronized (buffer) {
            buffer.add(event);
        }

        Log.v(TAG, "Location buffered — lat=" + location.getLatitude()
                + " lon=" + location.getLongitude()
                + " speed=" + String.format(Locale.US, "%.1f", speedKmh) + " km/h"
                + " acc=" + String.format(Locale.US, "%.0f", accuracy) + "m"
                + " buffer_size=" + buffer.size());

        // Bridge to JS — push position to TelemetryTracker
        double heading = location.hasBearing() ? location.getBearing() : -1;
        pushLocationToJS(location.getLatitude(), location.getLongitude(),
                location.getSpeed(), heading, location.getTime());

        // Check arrival geofence
        if (destActive && !destTriggered) {
            float[] results = new float[1];
            Location.distanceBetween(location.getLatitude(), location.getLongitude(), destLat, destLon, results);
            float distMeters = results[0];

            if (distMeters <= destRadiusMeters) {
                destTriggered = true;
                Log.d(TAG, "GEOFENCE TRIGGERED — distance=" + distMeters + "m");
                triggerArrivalAlert();
            }
        }
    }

    private void pushLocationToJS(double lat, double lon, float speedMps, double heading, long timestamp) {
        WebView webView = webViewRef.get();
        if (webView == null) return;

        final String js = String.format(Locale.US,
            "javascript:void(window.updateTelemetryLocation && window.updateTelemetryLocation(%f, %f, %f, %f, %d))",
            lat, lon, speedMps, heading, timestamp);

        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                WebView wv = webViewRef.get();
                if (wv != null) {
                    wv.evaluateJavascript(js, null);
                }
            } catch (Exception e) {
                Log.w(TAG, "pushLocationToJS failed: " + e.getMessage());
            }
        });
    }

    // ------------------------------------------------------------------ //
    //  Flush de buffer
    // ------------------------------------------------------------------ //

    private void schedulePeriodicFlush() {
        long intervalMs = (config != null) ? config.sendIntervalMs : 5000L;

        flushRunnable = new Runnable() {
            @Override
            public void run() {
                flushBuffer();
                handler.postDelayed(this, intervalMs);
            }
        };
        handler.postDelayed(flushRunnable, intervalMs);
        Log.d(TAG, "Periodic flush scheduled every " + intervalMs + "ms");
    }

    private void cancelPeriodicFlush() {
        if (flushRunnable != null) {
            handler.removeCallbacks(flushRunnable);
            flushRunnable = null;
        }
    }

    private void flushBuffer() {
        if (config == null) {
            Log.w(TAG, "flushBuffer: config is null, skipping");
            return;
        }

        List<TelemetryEvent> toSend;
        synchronized (buffer) {
            if (buffer.isEmpty()) return;
            toSend = new ArrayList<>(buffer);
            buffer.clear();
        }

        Log.d(TAG, "Flushing " + toSend.size() + " events");

        final TelemetryConfig cfg = config;
        final List<TelemetryEvent> batch = toSend;

        flushExecutor.submit(() -> {
            try {
                JSONArray events = new JSONArray();
                for (TelemetryEvent e : batch) {
                    events.put(e.toJSON());
                }

                JSONObject stats = new JSONObject();
                if (!batch.isEmpty()) {
                    TelemetryEvent last = batch.get(batch.size() - 1);
                    stats.put("lastSpeedKmh", last.speed);
                }

                TelemetryHttpClient.postBatch(
                        cfg.url,
                        cfg.token,
                        cfg.sessionId,
                        events,
                        stats
                );
            } catch (Exception e) {
                Log.e(TAG, "flushBuffer error: " + e.getMessage(), e);
            }
        });
    }

    // ------------------------------------------------------------------ //
    //  WakeLock
    // ------------------------------------------------------------------ //

    private void acquireWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) return;

        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm == null) return;

        wakeLock = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "transferonline:telemetry"
        );
        wakeLock.acquire(4 * 60 * 60 * 1000L); // 4 horas max — safety net
        Log.d(TAG, "WakeLock acquired");
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            Log.d(TAG, "WakeLock released");
        }
        wakeLock = null;
    }

    // ------------------------------------------------------------------ //
    //  Notificação
    // ------------------------------------------------------------------ //

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Telemetria GPS",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Rastreamento de viagem em andamento");
            channel.setShowBadge(false);

            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Transfer Online — Rastreando")
                .setContentText("Telemetria de viagem ativa")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
                .build();
    }

    // ------------------------------------------------------------------ //
    //  onTaskRemoved — re-agendar via AlarmManager
    // ------------------------------------------------------------------ //

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
        SharedPreferences prefs = getSharedPreferences(TelemetryConfig.PREFS_NAME, MODE_PRIVATE);
        boolean active = prefs.getBoolean(KEY_TRACKING_ACTIVE, false);

        Log.d(TAG, "onTaskRemoved — trackingActive=" + active);

        if (active) {
            Intent restart = new Intent(this, LocationTelemetryForegroundService.class);
            restart.setAction(ACTION_RESTART_FROM_ALARM);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pi = PendingIntent.getService(this, 0, restart, flags);
            AlarmManager am  = (AlarmManager) getSystemService(Context.ALARM_SERVICE);

            if (am != null) {
                am.setAndAllowWhileIdle(
                        AlarmManager.ELAPSED_REALTIME_WAKEUP,
                        SystemClock.elapsedRealtime() + 4000L,
                        pi
                );
                Log.d(TAG, "Restart alarm set for 4s");
            }
        }
    }

    // ------------------------------------------------------------------ //
    //  onDestroy
    // ------------------------------------------------------------------ //

    @Override
    public void onDestroy() {
        Log.d(TAG, "onDestroy");
        cancelPeriodicFlush();
        stopLocationUpdates();
        releaseWakeLock();
        flushExecutor.shutdownNow();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    // ------------------------------------------------------------------ //
    //  Arrival Alert
    // ------------------------------------------------------------------ //

    private static final String ARRIVAL_CHANNEL_ID = "vista_telemetry_arrival";
    private static final int ARRIVAL_NOTIF_ID = 1002;

    private void createArrivalChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    ARRIVAL_CHANNEL_ID,
                    "Chegada ao destino",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Alerta de chegada ao destino");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 200, 500});

            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    private void triggerArrivalAlert() {
        createArrivalChannel();

        // Intent to open the app's main activity
        Intent openApp = new Intent(this, com.transferonline.app.MainActivity.class);
        openApp.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent fullScreenPI = PendingIntent.getActivity(this, ARRIVAL_NOTIF_ID, openApp, flags);
        PendingIntent contentPI = PendingIntent.getActivity(this, ARRIVAL_NOTIF_ID + 1, openApp, flags);

        Notification notification = new NotificationCompat.Builder(this, ARRIVAL_CHANNEL_ID)
                .setContentTitle("Chegou ao destino!")
                .setContentText("Toque para abrir o Transfer Online")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(fullScreenPI, true)
                .setContentIntent(contentPI)
                .setAutoCancel(true)
                .setVibrate(new long[]{0, 500, 200, 500})
                .build();

        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm != null) {
            nm.notify(ARRIVAL_NOTIF_ID, notification);
        }

        // Also push to JS
        pushLocationToJS(destLat, destLon, 0, -1, System.currentTimeMillis());
    }

    // ------------------------------------------------------------------ //
    //  Utilitários
    // ------------------------------------------------------------------ //

    private String isoTimestamp() {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
        return sdf.format(new Date());
    }
}
