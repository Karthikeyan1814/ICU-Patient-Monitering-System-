/**
 * ============================================================
 * Smart Predictive ICU Patient Monitoring System
 * -- ESP8266 (NodeMCU) Wi-Fi Bridge --
 * ============================================================
 * Receives JSON strings from Arduino Uno over Hardware Serial
 * Transmits data to Node.js backend via HTTP POST every 2s
 *
 * Hardware Connections:
 *   Arduino D10 (TX, through voltage divider) → ESP8266 RX (GPIO3)
 *   Arduino D11 (RX)                          → ESP8266 TX (GPIO1)
 *   NOTE: NodeMCU uses 3.3V logic. Arduino is 5V.
 *         Use a 1kΩ + 2kΩ voltage divider on the Arduino TX line.
 *
 * Required Libraries (install via Arduino Library Manager):
 *   - "ESP8266WiFi"       (bundled with ESP8266 board package)
 *   - "ESP8266HTTPClient" (bundled with ESP8266 board package)
 *   - "ArduinoJson"       by Benoit Blanchon v6+
 *
 * Board Manager URL (if not already added):
 *   http://arduino.esp8266.com/stable/package_esp8266com_index.json
 * ============================================================
 */

#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>

// ─── !! CONFIGURE THESE BEFORE FLASHING !! ──────────────────
const char* WIFI_SSID     = "StreetLightHub2";         // Your Wi-Fi network name
const char* WIFI_PASSWORD = "12345678";      // Your Wi-Fi password

// Your Node.js server endpoint
// Local network example: "http://10.66.199.137:5000/api/readings"
// Cloud/production:      "https://your-domain.com/api/readings"
const char* SERVER_URL    = "http://10.66.199.137:5000/api/readings";

// Optional: Device/ward identifier
const char* DEVICE_ID     = "ICU-BED-01";
const char* PATIENT_ID    = "PAT-2024-001";
// ─────────────────────────────────────────────────────────────

// ─── Constants ───────────────────────────────────────────────
#define SERIAL_BAUD_RATE       9600
#define WIFI_RETRY_INTERVAL_MS 5000
#define HTTP_TIMEOUT_MS        5000
#define LED_PIN                LED_BUILTIN   // NodeMCU onboard LED (active LOW)

// ─── State ───────────────────────────────────────────────────
String  serialBuffer    = "";
bool    dataAvailable   = false;
unsigned long lastWifiCheck = 0;

// ─── Function Prototypes ─────────────────────────────────────
void connectToWiFi();
bool postDataToServer(const String& payload);
void blinkLED(int times, int delayMs = 100);

// ─── Setup ───────────────────────────────────────────────────
void setup() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);  // HIGH = OFF for NodeMCU LED

  Serial.begin(SERIAL_BAUD_RATE);  // Hardware Serial: receive from Arduino

  // Small delay to let Arduino stabilize
  delay(1000);

  Serial.println();
  Serial.println(F("==========================================="));
  Serial.println(F("  ICU Monitor - ESP8266 Wi-Fi Bridge      "));
  Serial.println(F("==========================================="));

  connectToWiFi();
}

// ─── Wi-Fi Connection ────────────────────────────────────────
void connectToWiFi() {
  Serial.print(F("[WiFi] Connecting to: "));
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(F("."));
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));  // Blink while connecting
    attempts++;

    if (attempts > 40) {
      Serial.println(F("\n[WiFi] Connection failed! Retrying in 5s..."));
      delay(WIFI_RETRY_INTERVAL_MS);
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      attempts = 0;
    }
  }

  digitalWrite(LED_PIN, HIGH);  // LED off
  Serial.println();
  Serial.println(F("[WiFi] Connected!"));
  Serial.print(F("[WiFi] IP Address: "));
  Serial.println(WiFi.localIP());
  Serial.print(F("[WiFi] Signal Strength (RSSI): "));
  Serial.print(WiFi.RSSI());
  Serial.println(F(" dBm"));

  blinkLED(3, 200);  // 3 blinks = connected
}

// ─── HTTP POST to Node.js Server ────────────────────────────
bool postDataToServer(const String& jsonPayload) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[HTTP] Not connected to WiFi. Skipping POST."));
    connectToWiFi();
    return false;
  }

  WiFiClient wifiClient;
  HTTPClient http;

  http.begin(wifiClient, SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-ID", DEVICE_ID);
  http.setTimeout(HTTP_TIMEOUT_MS);

  int httpCode = http.POST(jsonPayload);

  if (httpCode > 0) {
    if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
      String response = http.getString();
      Serial.print(F("[HTTP] POST OK ("));
      Serial.print(httpCode);
      Serial.print(F("): "));
      Serial.println(response.substring(0, 80));  // Print first 80 chars of response
      blinkLED(1, 50);  // Single quick blink = success
      http.end();
      return true;
    } else {
      Serial.print(F("[HTTP] POST Error code: "));
      Serial.println(httpCode);
    }
  } else {
    Serial.print(F("[HTTP] POST failed, error: "));
    Serial.println(http.errorToString(httpCode).c_str());
  }

  http.end();
  return false;
}

// ─── LED Blink Utility ───────────────────────────────────────
void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, LOW);   // ON
    delay(delayMs);
    digitalWrite(LED_PIN, HIGH);  // OFF
    delay(delayMs);
  }
}

// ─── Main Loop ───────────────────────────────────────────────
void loop() {
  // ── Reconnect Wi-Fi if dropped ──────────────────────────
  unsigned long now = millis();
  if (now - lastWifiCheck > WIFI_RETRY_INTERVAL_MS) {
    lastWifiCheck = now;
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println(F("[WiFi] Connection lost. Reconnecting..."));
      connectToWiFi();
    }
  }

  // ── Read from Arduino over Hardware Serial ───────────────
  // Arduino sends a complete JSON string terminated by '\n'
  while (Serial.available()) {
    char c = Serial.read();

    if (c == '\n') {
      // Complete message received
      serialBuffer.trim();

      if (serialBuffer.length() > 0) {
        Serial.print(F("[RX from Arduino] "));
        Serial.println(serialBuffer);

        // ── Validate & Enrich JSON ──────────────────────────
        // Parse Arduino JSON and add ESP8266-side metadata
        StaticJsonDocument<384> doc;
        DeserializationError error = deserializeJson(doc, serialBuffer);

        if (error) {
          Serial.print(F("[JSON] Parse error: "));
          Serial.println(error.f_str());
        } else {
          // Add device/patient metadata
          doc["deviceId"]   = DEVICE_ID;
          doc["patientId"]  = PATIENT_ID;
          doc["rssi"]       = WiFi.RSSI();  // Signal strength for diagnostics

          // Re-serialize enriched payload
          String enrichedPayload;
          serializeJson(doc, enrichedPayload);

          // ── POST to Node.js server ──────────────────────
          bool success = postDataToServer(enrichedPayload);
          if (!success) {
            Serial.println(F("[WARN] Failed to send data. Will retry on next reading."));
          }
        }

        serialBuffer = "";  // Clear buffer for next message
      }
    } else if (c != '\r') {
      // Accumulate characters (ignore carriage return)
      if (serialBuffer.length() < 512) {  // Guard against buffer overflow
        serialBuffer += c;
      }
    }
  }

  // Small yield to prevent watchdog reset on ESP8266
  yield();
}
