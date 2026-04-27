package com.transferonline.app.telemetry;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * TelemetryEvent — POJO de evento de telemetria.
 *
 * Tipos suportados:
 *   location_update | hard_brake | speeding | sharp_turn
 */
public class TelemetryEvent {

    public String type;        // Tipo do evento
    public double latitude;
    public double longitude;
    public double speed;       // km/h
    public double value;       // valor auxiliar (ex: deceleration em hard_brake)
    public String details;     // JSON string com detalhes adicionais (nullable)
    public String timestamp;   // ISO-8601
    public Double accuracyM;   // Acurácia GPS em metros (nullable)

    public TelemetryEvent() {}

    public TelemetryEvent(String type, double latitude, double longitude,
                          double speed, double value, String details,
                          String timestamp, Double accuracyM) {
        this.type      = type;
        this.latitude  = latitude;
        this.longitude = longitude;
        this.speed     = speed;
        this.value     = value;
        this.details   = details;
        this.timestamp = timestamp;
        this.accuracyM = accuracyM;
    }

    /**
     * Serializa o evento para JSONObject pronto para envio ao backend.
     */
    public JSONObject toJSON() throws JSONException {
        JSONObject obj = new JSONObject();
        obj.put("type",      type);
        obj.put("latitude",  latitude);
        obj.put("longitude", longitude);
        obj.put("speed",     speed);
        obj.put("value",     value);
        obj.put("timestamp", timestamp);
        if (details != null) {
            obj.put("details", details);
        }
        if (accuracyM != null) {
            obj.put("accuracyM", accuracyM);
        }
        return obj;
    }
}
