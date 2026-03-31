package com.transferonline.app.telemetry;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

/**
 * TrackingEnvironmentBootstrap — verifica e solicita permissões e isenções
 * necessárias para o Foreground Service de telemetria GPS funcionar em background.
 *
 * Chamado em MainActivity.onResume() para garantir que o ambiente está pronto.
 */
public class TrackingEnvironmentBootstrap {

    private static final String TAG = "VistaTelemetryFGS";

    // Código de request de permissão (deve ser único no app)
    private static final int REQ_LOCATION_PERMISSIONS = 1001;
    private static final int REQ_NOTIFICATIONS        = 1002;

    // Chave para throttle da solicitação de battery opt
    private static final String KEY_LAST_BATTERY_OPT_REQUEST = "telemetry_last_battery_opt_request";
    private static final long   BATTERY_OPT_REQUEST_INTERVAL = 24L * 60 * 60 * 1000; // 24 horas

    /**
     * Ponto de entrada — verificar e solicitar tudo necessário.
     * @param activity Activity ativa (MainActivity)
     */
    public static void check(Activity activity) {
        checkLocationPermissions(activity);
        checkNotificationPermission(activity);
        checkBatteryOptimization(activity);
        checkOverlayPermission(activity);
    }

    /**
     * Callback de resultado de permissão — encadeia solicitações na mesma sessão.
     * Assim que FINE_LOCATION é concedido, pede BACKGROUND_LOCATION imediatamente.
     * Assim que BACKGROUND_LOCATION é concedido, pede isenção de bateria.
     */
    public static void onPermissionResult(Activity activity, int requestCode,
                                          String[] permissions, int[] grantResults) {
        if (requestCode == REQ_LOCATION_PERMISSIONS && permissions.length > 0) {
            for (int i = 0; i < permissions.length; i++) {
                String perm = permissions[i];

                // FINE concedido → pedir BACKGROUND imediatamente
                if (perm.equals(android.Manifest.permission.ACCESS_FINE_LOCATION)
                        && grantResults[i] == PackageManager.PERMISSION_GRANTED) {
                    requestBackgroundIfNeeded(activity);
                }

                // BACKGROUND concedido → pedir isenção de bateria imediatamente
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                        && perm.equals(android.Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                        && grantResults[i] == PackageManager.PERMISSION_GRANTED) {
                    Log.d(TAG, "Background location granted — requesting battery optimization exemption");
                    checkBatteryOptimization(activity);
                }
            }
        }
    }

    // ------------------------------------------------------------------ //
    //  Localização
    // ------------------------------------------------------------------ //

    private static void checkLocationPermissions(Activity activity) {
        boolean hasFine = ContextCompat.checkSelfPermission(
                activity, android.Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;

        if (!hasFine) {
            Log.d(TAG, "Requesting ACCESS_FINE_LOCATION");
            ActivityCompat.requestPermissions(activity,
                    new String[]{
                            android.Manifest.permission.ACCESS_FINE_LOCATION,
                            android.Manifest.permission.ACCESS_COARSE_LOCATION
                    },
                    REQ_LOCATION_PERMISSIONS);
            return;
        }

        // Se FINE já concedido, tentar BACKGROUND direto
        requestBackgroundIfNeeded(activity);
    }

    private static void requestBackgroundIfNeeded(Activity activity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            boolean hasBg = ContextCompat.checkSelfPermission(
                    activity, android.Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                    == PackageManager.PERMISSION_GRANTED;

            if (!hasBg) {
                Log.d(TAG, "Requesting ACCESS_BACKGROUND_LOCATION");
                ActivityCompat.requestPermissions(activity,
                        new String[]{android.Manifest.permission.ACCESS_BACKGROUND_LOCATION},
                        REQ_LOCATION_PERMISSIONS);
            }
        }
    }

    // ------------------------------------------------------------------ //
    //  Notificações (Android 13+)
    // ------------------------------------------------------------------ //

    private static void checkNotificationPermission(Activity activity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            boolean hasNotif = ContextCompat.checkSelfPermission(
                    activity, android.Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED;

            if (!hasNotif) {
                Log.d(TAG, "Requesting POST_NOTIFICATIONS");
                ActivityCompat.requestPermissions(activity,
                        new String[]{android.Manifest.permission.POST_NOTIFICATIONS},
                        REQ_NOTIFICATIONS);
            }
        }
    }

    // ------------------------------------------------------------------ //
    //  Overlay (SYSTEM_ALERT_WINDOW) — draw over other apps
    // ------------------------------------------------------------------ //

    private static void checkOverlayPermission(Activity activity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(activity)) {
                Log.d(TAG, "Requesting SYSTEM_ALERT_WINDOW (overlay permission)");
                try {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            Uri.parse("package:" + activity.getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    activity.startActivity(intent);
                } catch (Exception e) {
                    Log.w(TAG, "Could not open overlay settings: " + e.getMessage());
                }
            } else {
                Log.d(TAG, "Overlay permission already granted");
            }
        }
    }

    // ------------------------------------------------------------------ //
    //  Otimização de bateria
    // ------------------------------------------------------------------ //

    private static void checkBatteryOptimization(Activity activity) {
        PowerManager pm = (PowerManager) activity.getSystemService(Activity.POWER_SERVICE);
        if (pm == null) return;

        String packageName = activity.getPackageName();

        if (pm.isIgnoringBatteryOptimizations(packageName)) {
            Log.d(TAG, "Battery optimization already ignored");
            return;
        }

        // Throttle — não perguntar mais de uma vez a cada 24 horas
        SharedPreferences prefs = activity.getSharedPreferences(
                TelemetryConfig.PREFS_NAME, Activity.MODE_PRIVATE);
        long lastRequest = prefs.getLong(KEY_LAST_BATTERY_OPT_REQUEST, 0L);
        long now         = System.currentTimeMillis();

        if ((now - lastRequest) < BATTERY_OPT_REQUEST_INTERVAL) {
            Log.d(TAG, "Battery opt request throttled (last: " + lastRequest + ")");
            return;
        }

        Log.d(TAG, "Requesting IGNORE_BATTERY_OPTIMIZATIONS");
        prefs.edit().putLong(KEY_LAST_BATTERY_OPT_REQUEST, now).commit();

        try {
            Intent intent = new Intent(
                    android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + packageName));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(intent);
        } catch (Exception e) {
            Log.w(TAG, "Could not open battery optimization settings: " + e.getMessage());
        }
    }
}
