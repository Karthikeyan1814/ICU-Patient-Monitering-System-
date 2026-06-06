#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
const char* WIFI_SSID     = "StreetLightHub2";         // Your Wi-Fi network name
const char* WIFI_PASSWORD = "12345678";      // Your Wi-Fi password

const char* serverUrl = "http://10.66.199.137:5000/api/readings"; // Update with your Node.js backend API URL

WiFiClient client;

void setup() {
  // Initialize hardware serial at 9600 baud (connected to Arduino Uno TX)
  Serial.begin(9600);
  
  // Connect to Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  // Note: We avoid printing debug messages to Serial because it's shared with the Arduino RX line.
  // Using the onboard LED for status indication instead.
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH); // Off (active low)
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
  }
  digitalWrite(LED_BUILTIN, LOW); // On (connected)
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(LED_BUILTIN, HIGH); // Off
    // Attempt to reconnect if disconnected
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    delay(1000);
    return;
  }

  if (Serial.available() > 0) {
    String line = Serial.readStringUntil('\n');
    line.trim();

    if (line == "@") {
      // The @ symbol acts as our start marker. Now we read the next 5 lines.
      String pulseStr = Serial.readStringUntil('\n');
      pulseStr.trim();
      
      String bodyTempStr = Serial.readStringUntil('\n');
      bodyTempStr.trim();
      
      String humidityStr = Serial.readStringUntil('\n');
      humidityStr.trim();
      
      String roomTempStr = Serial.readStringUntil('\n');
      roomTempStr.trim();
      
      String alertCodeStr = Serial.readStringUntil('\n');
      alertCodeStr.trim(); // We read it to clear it from the buffer, but we don't use it in JSON

      // Validate that we received actual data (basic check to avoid empty JSON values)
      if (pulseStr.length() > 0 && bodyTempStr.length() > 0) {
        // Construct JSON manually since it's a flat, simple structure
        String jsonPayload = "{\"bpm\": " + pulseStr + 
                             ", \"bodyTemp\": " + bodyTempStr + 
                             ", \"humidity\": " + humidityStr + 
                             ", \"roomTemp\": " + roomTempStr + "}";
        
        // Send data to backend
        HTTPClient http;
        http.begin(client, serverUrl);
        http.addHeader("Content-Type", "application/json");
        
        int httpResponseCode = http.POST(jsonPayload);
        
        if (httpResponseCode > 0) {
          // Success: Blink LED briefly
          digitalWrite(LED_BUILTIN, HIGH);
          delay(100);
          digitalWrite(LED_BUILTIN, LOW);
        }
        
        http.end();
      }
    }
  }
}
