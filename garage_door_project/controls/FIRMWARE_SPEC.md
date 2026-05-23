# SmartLift Pro — Firmware Specification
## Document No.: GD-FW-001 | Rev: A | Date: 2026-05-23

---

## 1. PLATFORM

| Parameter    | Value                              |
|--------------|------------------------------------|
| MCU          | ESP32-WROOM-32                     |
| Framework    | Arduino (ESP32 Arduino Core v3.x)  |
| IDE          | Arduino IDE 2.x or PlatformIO      |
| Language     | C++ (Arduino style)                |
| OTA          | ArduinoOTA (WiFi OTA update)       |
| MQTT Library | PubSubClient v2.8                  |
| RF Library   | rc-switch or custom Keeloq decoder |

---

## 2. STATE MACHINE

```
                    ┌──────────┐
               ┌───►│  CLOSED  │◄─────────────────┐
               │    └────┬─────┘                   │
               │         │ CMD: OPEN               │
               │         ▼                         │
               │    ┌──────────┐                   │
               │    │ OPENING  │─── limit reached ─┤
               │    └────┬─────┘                   │
               │ CMD:STOP│ obstruction              │
               │         ▼                         │
               │    ┌──────────┐                   │
               │    │  OPEN    │                   │
               │    └────┬─────┘                   │
               │         │ CMD: CLOSE              │
               │         ▼                         │
               │    ┌──────────┐                   │
               │    │ CLOSING  │─── limit reached ─┘
               │    └────┬─────┘
               │ CMD:STOP│ obstruction
               │         ▼
               │    ┌──────────┐
               └────│REVERSING │──► back to OPEN
                    └──────────┘

States: CLOSED | OPENING | OPEN | CLOSING | REVERSING | ERROR | BATTERY_LOW
```

---

## 3. MOTOR CONTROL

```cpp
// Motor direction via BTS7960
#define PIN_RPWM 25  // Forward PWM
#define PIN_LPWM 26  // Reverse PWM
#define PIN_EN   27  // Enable (active high)

void motorOpen() {
    ledcWrite(0, 200);  // PWM channel 0 → RPWM (80% duty = 200/255)
    ledcWrite(1, 0);
}

void motorClose() {
    ledcWrite(0, 0);
    ledcWrite(1, 200);
}

void motorSlow() {
    // Reduce PWM last 300mm before close limit
    ledcWrite(1, 100);  // ~40% duty → ~100mm/s
}

void motorStop() {
    ledcWrite(0, 0);
    ledcWrite(1, 0);
}
```

---

## 4. SAFETY LOGIC

```cpp
// Auto-reverse on obstruction during closing
void checkObstruction() {
    if (state == CLOSING) {
        if (digitalRead(PIN_PHOTO_EYE) == LOW) {  // beam broken
            motorStop();
            delay(100);
            motorOpen();
            state = REVERSING;
            publishStatus("REVERSING:OBSTRUCTION");
        }
        // Current-based obstruction detect
        int current = analogRead(PIN_CURRENT_SENSE);
        if (current > CURRENT_THRESHOLD) {
            motorStop();
            delay(100);
            motorOpen();
            state = REVERSING;
        }
    }
}

// Final 300mm slow-down before close
void closingSpeedControl() {
    // When encoder (or timed proxy) signals < 300mm remaining
    if (closingProgress > (DOOR_HEIGHT - 300)) {
        motorSlow();
    }
}
```

---

## 5. RF REMOTE HANDLING

```cpp
#include <RCSwitch.h>
RCSwitch rc = RCSwitch();

void setupRF() {
    rc.enableReceive(digitalPinToInterrupt(PIN_RF_DATA));
}

void handleRF() {
    if (rc.available()) {
        long code = rc.getReceivedValue();
        if (code == pairedCode_OPEN || code == pairedCode_CLOSE) {
            toggleDoor();
        } else if (code == pairedCode_STOP) {
            motorStop();
        }
        rc.resetAvailable();
    }
}

// Pairing mode: hold button 3s → enter learn mode → accept next RF code
void enterPairingMode() {
    Serial.println("PAIRING MODE: press remote button");
    unsigned long start = millis();
    while (millis() - start < 30000) {  // 30s window
        if (rc.available()) {
            pairedCode_OPEN = rc.getReceivedValue();
            EEPROM.put(0, pairedCode_OPEN);
            EEPROM.commit();
            Serial.println("Paired!");
            break;
        }
    }
}
```

---

## 6. WIFI & MQTT

```cpp
#include <WiFi.h>
#include <PubSubClient.h>

const char* ssid = "HOME_SSID";           // Set via config portal
const char* password = "HOME_PASS";
const char* mqtt_server = "192.168.1.100"; // Local broker

// Topics
#define TOPIC_CMD    "garage/door/command"   // subscribe
#define TOPIC_STATE  "garage/door/state"     // publish
#define TOPIC_ERROR  "garage/door/error"     // publish
#define TOPIC_BATT   "garage/battery/voltage"// publish

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    String msg = String((char*)payload).substring(0, length);
    if (msg == "OPEN") triggerOpen();
    else if (msg == "CLOSE") triggerClose();
    else if (msg == "STOP") motorStop();
    else if (msg == "STATUS") publishStatus(currentStateString());
}

void publishStatus(String state) {
    client.publish(TOPIC_STATE, state.c_str(), true);  // retained message
}
```

---

## 7. BATTERY MONITORING

```cpp
#define PIN_BATT_SENSE 22
#define BATT_LOW_MV    11200  // 11.2V = low SLA
#define BATT_FULL_MV   12700 // 12.7V = full SLA

float readBatteryVoltage() {
    int raw = analogRead(PIN_BATT_SENSE);  // 0–4095 for 0–3.3V
    float vin = (raw / 4095.0) * 3.3;
    float vbatt = vin * (10000.0 + 2200.0) / 2200.0;  // voltage divider (10k + 2.2k)
    return vbatt;
}

void checkBattery() {
    float v = readBatteryVoltage();
    if (v * 1000 < BATT_LOW_MV) {
        state = BATTERY_LOW;
        setLED(RED_SLOW_BLINK);
        publishStatus("BATTERY_LOW");
    }
}
```

---

## 8. STATUS LED PATTERNS

| State         | LED Color | Pattern           |
|---------------|-----------|-------------------|
| Closed (ready)| Green     | Solid on           |
| Opening       | Blue      | Fast blink (2Hz)  |
| Open          | Blue      | Solid on           |
| Closing       | Blue      | Fast blink (2Hz)  |
| Obstruction   | Red       | 3× flash + pause  |
| Error         | Red       | Solid on           |
| Battery low   | Red       | Slow blink (0.5Hz)|
| WiFi connecting| White    | Medium blink (1Hz)|
| Pairing mode  | White     | Fast blink (5Hz)  |

---

## 9. CONFIGURATION PORTAL

On first boot (or factory reset), ESP32 starts a WiFi AP named "SmartLift-Setup". Connect phone to this AP, open browser at 192.168.4.1, configure:
- Home WiFi SSID + password
- MQTT broker IP
- Door open/close travel time (seconds)
- Obstruction current threshold
- PIN code for app (optional)

Config stored in EEPROM/NVS (non-volatile storage).

---

## 10. OTA UPDATE

```cpp
#include <ArduinoOTA.h>

void setupOTA() {
    ArduinoOTA.setHostname("smartlift-door");
    ArduinoOTA.setPassword("smartlift2026");
    ArduinoOTA.begin();
}

// In loop():
ArduinoOTA.handle();
```

Flash new firmware via Arduino IDE → Upload → select network port.

---

## 11. BUILD & FLASH INSTRUCTIONS

```bash
# PlatformIO (recommended)
pip install platformio
pio init --board esp32dev
# Add libraries in platformio.ini:
# lib_deps = knolleary/PubSubClient, sui77/rc-switch

pio run --target upload --upload-port /dev/ttyUSB0

# Arduino IDE
# Board: "ESP32 Dev Module"
# Upload speed: 921600
# Flash size: 4MB (default)
# Tools > Port: /dev/ttyUSB0 (Linux) or COM3 (Windows)
```

---

*Document GD-FW-001 Rev A — SmartLift Pro — Prototype Phase*
