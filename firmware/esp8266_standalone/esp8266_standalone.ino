#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <DHT.h>

const char* WIFI_SSID     = "StreetLightHub2";
const char* WIFI_PASSWORD = "12345678";
const char* serverUrl     = "http://10.254.142.137:5000/api/readings";

// ─── Pin Configurations ──────────────────────────────────────
#define DHTPIN D1        // Connect DHT11 "Out" to D1
#define DHTTYPE DHT11    // DHT 11 sensor type
#define PULSE_PIN D2     // Connect Pulse Sensor "O/P3.3VL" (Digital out) to D2
#define LM35_PIN A0      // Connect LM35 "Out" (Analog out) to A0

DHT dht(DHTPIN, DHTTYPE);
WiFiClient client;

// ─── Variables ───────────────────────────────────────────────
volatile unsigned long lastBeatTime = 0;
volatile int currentBPM = 72; // Default starting BPM
unsigned long lastPayloadSent = 0;

// ─── Variables for BPM Smoothing ─────────────────────────────
#define BPM_HISTORY_SIZE 4
volatile int bpmHistory[BPM_HISTORY_SIZE];
volatile int bpmHistoryIndex = 0;

// ─── Interrupt for Pulse Sensor ──────────────────────────────
// Because your pulse sensor outputs a digital HIGH/LOW signal,
// we can use a hardware interrupt to perfectly track the heartbeat in the background!
void IRAM_ATTR onPulseDetected() {
  unsigned long currentTime = millis();
  // Debounce filter: Ignore beats faster than 300ms apart (max 200 BPM)
  if (currentTime - lastBeatTime > 300) { 
    unsigned long beatDuration = currentTime - lastBeatTime;
    int calculatedBpm = 60000 / beatDuration;
    
    // Only accept realistic human BPM ranges
    if (calculatedBpm >= 40 && calculatedBpm <= 180) {
      // ── Apply Moving Average for Smooth BPM ──
      bpmHistory[bpmHistoryIndex] = calculatedBpm;
      bpmHistoryIndex = (bpmHistoryIndex + 1) % BPM_HISTORY_SIZE;
      
      int sum = 0;
      int count = 0;
      for (int i = 0; i < BPM_HISTORY_SIZE; i++) {
        if (bpmHistory[i] > 0) {
          sum += bpmHistory[i];
          count++;
        }
      }
      
      if (count > 0) {
        currentBPM = sum / count;
      }
    }
    lastBeatTime = currentTime;
  }
}

void setup() {
  Serial.begin(115200); 
  delay(1000);
  Serial.println("\n\n--- ICU Monitor ESP8266 Starting ---");
  
  dht.begin();
  
  // Set up Pulse Sensor as a Digital Input and attach interrupt
  pinMode(PULSE_PIN, INPUT);
  attachInterrupt(digitalPinToInterrupt(PULSE_PIN), onPulseDetected, RISING);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ Wi-Fi Connected!");
}

void loop() {
  unsigned long currentTime = millis();
  
  // If no heartbeat is detected for 3 seconds, reset BPM to 0 (finger removed)
  if (currentTime - lastBeatTime > 3000) {
    currentBPM = 0;
    // Clear the smoothing history so it doesn't skew data when finger returns
    for (int i = 0; i < BPM_HISTORY_SIZE; i++) {
      bpmHistory[i] = 0;
    }
  }

  // ─── Send Data (Every 2 Seconds) ──────────────────────────
  if (currentTime - lastPayloadSent > 2000) {
    lastPayloadSent = currentTime;
    
    // 1. Read Room Temp & Humidity (DHT11)
    float humidity = dht.readHumidity();
    float roomTemp = dht.readTemperature();
    
    if (isnan(humidity) || isnan(roomTemp)) {
      Serial.println("⚠️ Failed to read from DHT sensor!");
      humidity = 0;
      roomTemp = 0;
    }
    
    // 2. Read Body Temp (LM35 Analog)
    // NodeMCU's A0 pin maps 0 to 3.3V as 0 to 1024.
    // The LM35 outputs 10mV (0.01V) per degree Celsius.
    int rawA0 = analogRead(LM35_PIN);
    float rawTemp = (rawA0 / 1024.0) * 330.0;
    
    // SOFTWARE CALIBRATION: Add an offset to fix cheap/inaccurate LM35 modules
    // If it reads 5°C but it should be 36°C, the offset is 31.0
    float calibrationOffset = 31.0; 
    float bodyTemp = rawTemp + calibrationOffset;

    // 3. Build JSON & Send to Backend
    if (WiFi.status() == WL_CONNECTED) {
      String jsonPayload = "{\"bpm\": " + String(currentBPM) + 
                           ", \"bodyTemp\": " + String(bodyTemp, 1) + 
                           ", \"humidity\": " + String(humidity, 1) + 
                           ", \"roomTemp\": " + String(roomTemp, 1) + "}";
                           
      Serial.println("📡 Sending: " + jsonPayload);
      
      HTTPClient http;
      http.begin(client, serverUrl);
      http.addHeader("Content-Type", "application/json");
      
      int httpCode = http.POST(jsonPayload);
      if (httpCode > 0) {
        Serial.printf("✅ Server responded: %d\n", httpCode);
      } else {
        Serial.printf("❌ HTTP Error: %s\n", http.errorToString(httpCode).c_str());
      }
      http.end();
    } else {
       Serial.println("❌ Wi-Fi Disconnected!");
    }
  }
  
  delay(10); // Background tasks
}
