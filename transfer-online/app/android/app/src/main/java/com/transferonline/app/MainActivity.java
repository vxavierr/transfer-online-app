package com.transferonline.app;

import android.os.Bundle;

import androidx.annotation.NonNull;

import com.getcapacitor.BridgeActivity;
import com.transferonline.app.telemetry.TelemetryForegroundPlugin;
import com.transferonline.app.telemetry.TrackingEnvironmentBootstrap;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TelemetryForegroundPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onResume() {
        super.onResume();
        TrackingEnvironmentBootstrap.check(this);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        // Encadeia: assim que uma permissão é concedida, solicita a próxima
        TrackingEnvironmentBootstrap.onPermissionResult(this, requestCode, permissions, grantResults);
    }
}
