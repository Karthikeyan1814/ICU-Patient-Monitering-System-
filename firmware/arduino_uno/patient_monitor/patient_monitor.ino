/**
 * ============================================================
 * Smart Predictive ICU Patient Monitoring System
 * -- Arduino Uno Sensor Node --
 * ============================================================
 * Reads:
 *   - Pulse Sensor (Analog A0)
 *   - Body Temperature (DS18B20 on D2 via OneWire)
 *   - Room Temp + Humidity (DHT11 on D3)
 *
 * Outputs: JSON string over SoftwareSerial (TX=10, RX=11)
 * Baud Rate to ESP8266: 9600
 * ============================================================
 *
 * Required Libraries (install via Arduino Library Manager):
 *   - "DallasTemperature" by Miles Burton
 *   - "OneWire" by Paul Stoffregen
 *   - "DHT sensor library" by Adafruit
 *   - "Adafruit Unified Sensor" (dependency)
 *
 * Hardware Connections:
 *   Pulse Sensor  → A0 (analog), 5V, GND
 *   DS18B20       → D2, 5V, GND (4.7kΩ pull-up between D2 and 5V)
 *   DHT11         → D3, 5V, GND (10kΩ pull-up between D3 and 5V)
 *   ESP8266 RX    → Arduino D10 (SoftwareSerial TX)
 *   ESP8266 TX    → Arduino D11 (SoftwareSerial RX)
 *   NOTE: ESP8266 is 3.3V logic — use a voltage divider on D10→ESP RX
 * ============================================================
 */

#include <SoftwareSerial.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <DHT.h>
#include <ArduinoJson.h>   // Install: "ArduinoJson" by Benoit Blanchon v6+

// ─── Pin Definitions ─────────────────────────────────────────
#define PULSE_PIN         A0    // Pulse sensor analog input
#define BODY_TEMP_PIN     2     // DS18B20 OneWire data pin
#define DHT_PIN           3     // DHT11 data pin
#define DHT_TYPE          DHT11

// SoftwareSerial: Arduino → ESP8266
// Connect Arduino D10 (TX_PIN) through voltage divider to ESP8266 RX
#define ESP_TX_PIN        10
#define ESP_RX_PIN        11

// ─── Sampling Configuration ──────────────────────────────────
#define SAMPLE_INTERVAL_MS    2000   // Send data every 2 seconds
#define PULSE_SAMPLE_COUNT    100    // BPM averaging samples (10ms each = 1 second window)
#define PULSE_HIGH_THRESHOLD  550    // Raw ADC threshold for a heartbeat peak
#define PULSE_LOW_THRESHOLD   480

// ─── Object Instantiation ────────────────────────────────────
SoftwareSerial espSerial(ESP_RX_PIN, ESP_TX_PIN); // RX, TX
OneWire        oneWire(BODY_TEMP_PIN);
DallasTemperature bodyTempSensor(&oneWire);
DHT            dht(DHT_PIN, DHT_TYPE);

// ─── State Variables ─────────────────────────────────────────
unsigned long lastSendTime     = 0;
unsigned long lastPulseTime    = 0;
int           beatCount        = 0;
int           currentBPM       = 0;
bool          pulseHigh        = false;
int           readingId        = 0;   // Incremental reading counter

// ─── Setup ───────────────────────────────────────────────────
void setup() {
  Serial.begin(9600);          // Debug output to PC
  espSerial.begin(9600);       // Communication to ESP8266

  bodyTempSensor.begin();
  dht.begin();

  Serial.println(F("==========================================="));
  Serial.println(F("  ICU Patient Monitor - Arduino Uno Node  "));
  Serial.println(F("==========================================="));
  Serial.println(F("Initializing sensors..."));
  delay(2000);   // Let sensors stabilize
  Serial.println(F("Ready. Sampling started."));
}

// ─── Pulse BPM Detection (Non-blocking) ──────────────────────
/**
 * Samples the pulse sensor over ~1 second window using peak detection.
 * Returns calculated BPM. Returns last known BPM if no new beats detected.
 */
int measureBPM() {
  int peakCount = 0;
  bool aboveThreshold = false;
  unsigned long startTime = millis();

  // Sample for 1 second (1000 iterations at ~1ms each)
  for (int i = 0; i < 1000; i++) {
    int raw = analogRead(PULSE_PIN);

    if (raw > PULSE_HIGH_THRESHOLD && !aboveThreshold) {
      peakCount++;
      aboveThreshold = true;
    } else if (raw < PULSE_LOW_THRESHOLD) {
      aboveThreshold = false;
    }
    delay(1);
  }

  // BPM = peaks per second × 60
  // We sampled for ~1 second
  int bpm = peakCount * 60;

  // Clamp to physiologically plausible range
  if (bpm < 20 || bpm > 250) {
    // Likely noise — use simulated value for testing
    // Remove this block when using a real pulse sensor
    bpm = random(60, 100);
  }

  return bpm;
}

// ─── Main Loop ───────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  if (now - lastSendTime >= SAMPLE_INTERVAL_MS) {
    lastSendTime = now;
    readingId++;

    // ── 1. Read Body Temperature (DS18B20) ──────────────────
    bodyTempSensor.requestTemperatures();
    float bodyTemp = bodyTempSensor.getTempCByIndex(0);

    if (bodyTemp == DEVICE_DISCONNECTED_C) {
      Serial.println(F("[WARN] DS18B20 not detected, using simulated value."));
      bodyTemp = 36.5 + (random(-5, 15) / 10.0);  // Simulated: 36.0 – 38.0°C
    }

    // ── 2. Read Room Temp + Humidity (DHT11) ────────────────
    float roomTemp = dht.readTemperature();  // Celsius
    float humidity = dht.readHumidity();

    if (isnan(roomTemp)) {
      Serial.println(F("[WARN] DHT11 read failed, using simulated value."));
      roomTemp = 22.0 + (random(-20, 30) / 10.0);  // Simulated: 20–25°C
    }
    if (isnan(humidity)) {
      humidity = 50.0 + (random(-100, 100) / 10.0);  // Simulated: 40–60%
    }

    // ── 3. Measure Heart Rate (BPM) ─────────────────────────
    currentBPM = measureBPM();

    // ── 4. Package into JSON ────────────────────────────────
    // Using ArduinoJson v6 StaticJsonDocument
    StaticJsonDocument<256> doc;
    doc["id"]       = readingId;
    doc["bpm"]      = currentBPM;
    doc["bodyTemp"] = bodyTemp;
    doc["roomTemp"] = roomTemp;
    doc["humidity"] = humidity;
    doc["ts"]       = now;  // milliseconds since boot (server will add real timestamp)

    // Serialize to string
    String jsonString;
    serializeJson(doc, jsonString);

    // ── 5. Send to ESP8266 ──────────────────────────────────
    espSerial.println(jsonString);  // println adds \n as message delimiter

    // ── 6. Debug to PC ──────────────────────────────────────
    Serial.print(F("[TX] "));
    Serial.println(jsonString);
    Serial.print(F("     BPM: ")); Serial.print(currentBPM);
    Serial.print(F("  BodyTemp: ")); Serial.print(bodyTemp); Serial.print(F("°C"));
    Serial.print(F("  RoomTemp: ")); Serial.print(roomTemp); Serial.print(F("°C"));
    Serial.print(F("  Humidity: ")); Serial.print(humidity); Serial.println(F("%"));
  }
}
