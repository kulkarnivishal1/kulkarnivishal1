# Smart Motorized Sectional Overhead Garage Door
## Product Design Specification (PDS)
### Document No.: GD-PDS-001 | Rev: A | Date: 2026-05-23

---

## 1. PRODUCT OVERVIEW

| Parameter         | Value                                              |
|-------------------|----------------------------------------------------|
| Product Name      | SmartLift Pro – Motorized Sectional Overhead Door  |
| Type              | Sectional overhead, horizontal track               |
| Drive             | Belt-drive trolley, ½ HP BLDC motor               |
| Control           | ESP32 WiFi + 433 MHz RF remote + App               |
| Safety            | Photo-eye IR break-beam, auto-reverse, obstruction |
| Target            | Prototype / MVP (1–5 units)                        |
| Standard Opening  | 2,500 mm W × 2,100 mm H (single car)              |
| Finish            | RAL 7016 Anthracite Grey, embossed panel skin      |

---

## 2. SCOPE OF DESIGN

This document covers:
- Door panel assembly (4 sections)
- Track system (vertical, horizontal, curved)
- Counterbalance torsion spring system
- Roller, hinge, cable drum hardware
- Belt-drive motorized operator unit
- Smart control electronics (PCB, firmware, comms)
- Safety subsystems
- Weather sealing
- Complete BOM, manufacturing plan, and costing

---

## 3. DESIGN INPUTS & CONSTRAINTS

| Constraint         | Value / Requirement                          |
|--------------------|----------------------------------------------|
| Max door weight    | ≤ 80 kg (fully loaded)                       |
| Headroom available | 300 mm minimum above opening                 |
| Side room          | 125 mm each side (minimum)                   |
| Backroom (depth)   | 2,600 mm minimum                             |
| Power supply       | 220–240 V AC, 50 Hz single phase             |
| Backup             | 12 V 7 AH SLA battery (≥ 20 open/close ops) |
| Noise level        | < 65 dB(A) at 1 m from operator             |
| Cycle life         | 10,000 cycles minimum (springs, hardware)    |
| Opening speed      | 200 mm/s (≈ 10 seconds full open)           |
| Closing speed      | 200 mm/s with final 300 mm at 100 mm/s       |
| WiFi protocol      | 2.4 GHz 802.11 b/g/n                         |
| RF remote          | 433 MHz, rolling code (Keeloq or AES)        |
| Safety standard    | EN 13241-1, UL 325 (reference)               |
| Operating temp     | –10°C to +55°C                               |
| IP rating (motor)  | IP 44 minimum                                |

---

## 4. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                    SMART GARAGE DOOR SYSTEM                      │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │  DOOR PANEL  │    │ TRACK + HINGE│    │ TORSION SPRING   │   │
│  │  ASSEMBLY    │────│   SYSTEM     │────│  COUNTERBALANCE  │   │
│  │ (4 sections) │    │(V+H+curve)   │    │  (2× springs)    │   │
│  └──────┬───────┘    └──────────────┘    └──────────────────┘   │
│         │                                                        │
│  ┌──────▼───────────────────────────────────────────────────┐   │
│  │              BELT DRIVE OPERATOR UNIT                     │   │
│  │   ┌─────────┐  ┌────────┐  ┌──────────┐  ┌──────────┐   │   │
│  │   │ ½HP BLDC│  │  Worm  │  │  Drive   │  │ Trolley  │   │   │
│  │   │  Motor  │──│  Gear  │──│  Belt    │──│ Assembly │   │   │
│  │   └─────────┘  └────────┘  └──────────┘  └────┬─────┘   │   │
│  └──────────────────────────────────────────────┬─┘         │   │
│                                                 │             │   │
│  ┌──────────────────────────────────────────────▼──────────┐ │   │
│  │                   CONTROL SYSTEM (PCB)                   │ │   │
│  │  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐  │ │   │
│  │  │ ESP32   │  │ BTS7960 │  │ 12V SMPS │  │  SLA     │  │ │   │
│  │  │WiFi+BT  │──│  Motor  │  │  Power   │  │ Battery  │  │ │   │
│  │  │433MHz RX│  │  Driver │  │  Supply  │  │ Backup   │  │ │   │
│  │  └────┬────┘  └─────────┘  └──────────┘  └──────────┘  │ │   │
│  │       │                                                  │ │   │
│  │  ┌────▼──────────────────────────────────────────────┐  │ │   │
│  │  │  SENSORS: Photo-eye | Hall-limit | Current sense  │  │ │   │
│  │  └───────────────────────────────────────────────────┘  │ │   │
│  └─────────────────────────────────────────────────────────┘ │   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. DOOR PANEL ASSEMBLY

### 5.1 Panel Geometry

```
FRONT VIEW — 4-SECTION DOOR (all dims in mm)
┌────────────────────────────────────────────┐
│◄──────────────── 2,540 ───────────────────►│
│                                            │ ▲
│  SECTION 4 (top)    533mm tall             │ │
│  ╔══════════════════════════════════════╗  │ │
│  ║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║  │ │
│  ╚══════════════════════════════════════╝  │ │
│         ← SECTION JOINT (hinge) →         │ │ 2,135
│  SECTION 3                                 │ │
│  ╔══════════════════════════════════════╗  │ │
│  ║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║  │ │
│  ╚══════════════════════════════════════╝  │ │
│  SECTION 2                                 │ │
│  ╔══════════════════════════════════════╗  │ │
│  ║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║  │ │
│  ╚══════════════════════════════════════╝  │ │
│  SECTION 1 (bottom) — includes bottom seal │ │
│  ╔══════════════════════════════════════╗  │ ▼
│  ╚══════════════════════════════════════╝  │
└────────────────────────────────────────────┘
         ╪ = bottom seal (EPDM rubber)
```

### 5.2 Panel Cross-Section (Double-Skin Insulated)

```
CROSS-SECTION A-A (scale ~5:1, dims in mm)
                    40mm total thickness
        ◄────────────────────────────────────►
        ┌──┬────────────────────────────────┬──┐
        │  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  │
Outer   │  │                                │  │  Inner
skin    │  │   PU FOAM CORE (36mm)          │  │  skin
0.45mm  │  │   ρ = 40 kg/m³                 │  │  0.40mm
PPGI    │  │   CFC-free, self-adhesive      │  │  GI
        │  │                                │  │
        └──┴────────────────────────────────┴──┘
        2mm ←──────────── 36mm ────────────► 2mm

TOP JOINT (tongue & groove with EPDM seal):
        ┌─────────────────────────────────────┐
        │         Section N+1 bottom          │
        │  ╔═══════════╗                      │
        │  ║   tongue  ║  ← 10mm protrusion   │
EPDM ──►│  ╚═══════════╝                      │
        │   ◄──────────►                      │
        │     Section N top (groove)          │
        └─────────────────────────────────────┘
```

### 5.3 Panel Specifications

| Parameter          | Value                                       |
|--------------------|---------------------------------------------|
| Panel width        | 2,540 mm (door width + 20mm per side)       |
| Panel height       | 533 mm (× 4 = 2,132 mm ≈ door height)      |
| Panel thickness    | 40 mm                                       |
| Outer skin         | 0.45 mm PPGI, Z275, RAL 7016 pre-painted   |
| Inner skin         | 0.40 mm GI, Z200                           |
| Core               | 40mm CFC-free rigid PU foam, 40 kg/m³      |
| Joint              | Tongue-and-groove with co-extruded EPDM     |
| Panel weight       | ≈ 18 kg each, ≈ 72 kg total (4 panels)     |
| U-value            | 1.5 W/m²K (insulated panel)                |
| Bottom section     | Modified — includes extruded Al bottom rail |
| Surface embossing  | Wood-grain or ribbed pattern, optional      |

### 5.4 Fabrication Method (Panels)

- Roll-form outer and inner skins from coil
- Insert foam via injection/pour between skins in jig
- Foam cures under controlled pressure in 3–5 minutes
- Form tongue-and-groove profile on press brake (roll-former preferred)
- Cut to length on flying shear or cold saw
- **For prototype:** order as buy-out from panel manufacturer (Hörmann, Normstahl, or local OEM)

---

## 6. TRACK SYSTEM

### 6.1 Track Layout — Side View

```
SIDE VIEW (Right side shown, dims in mm)
                      CEILING
    ════════════════════════════════════════
                  ↑300mm headroom
    ╔═══════════════════════════════════╗   ← header bracket
    ║          HORIZONTAL TRACK         ║   2,435mm long
    ║           (slope 2° down)         ║
    ╚═══════════════════════════════════╝
    ╔═╗  ← 90° curved track section
    ║ ║     305mm radius
    ║ ║
    ║ ║  ← VERTICAL TRACK
    ║ ║     2,285mm long
    ║ ║
    ╚═╝  ← floor level (track end, 150mm clearance)
    ═══  FLOOR
```

### 6.2 Track Profile

```
TRACK CROSS-SECTION (2" radius track)
     ┌──┐
     │  │ ← 3mm wall thickness
 ────┤  ├────  76mm
     │  │
     └──┘
     32mm

Material: 3mm hot-dip galvanized steel (Z450)
Formed: roll-formed or press-brake bent
```

### 6.3 Track Components

| Part                   | Qty | Dims (mm)               | Material          |
|------------------------|-----|-------------------------|-------------------|
| Vertical track         | 2   | 76×32×2,285mm           | 3mm HDG steel     |
| Horizontal track       | 2   | 76×32×2,435mm           | 3mm HDG steel     |
| Curved section (90°)   | 2   | R=305mm, 76×32 section  | 3mm HDG steel     |
| Wall angle bracket     | 8   | 100×50×3mm              | 3mm HDG steel     |
| Horizontal flag angle  | 6   | 75×50×3mm               | 3mm HDG steel     |
| Header bracket (center)| 1   | 150×100×4mm             | 4mm HDG steel     |
| Track end stop         | 4   | 50×30×3mm with bolt     | 3mm steel, ZnCr   |
| Track bolts M8×25      | 24  | M8×25                   | 8.8 grade ZnCr    |

---

## 7. HINGE & ROLLER SYSTEM

### 7.1 Hinge Types

```
SECTION HINGE (between panels)
                    pivot pin
          ┌──────────┼──────────┐
 Panel N  │  fixed   ●  pivot  │  Panel N+1
  top ────┤  leaf              ├──── bottom
          └──────────────────────┘
          Width: 150mm, 14ga (2mm) stamped steel
          Zinc plated per ASTM B633 SC3

END HINGE (carries roller + cable)
          ┌────────────────┐
          │   hinge body   │──── roller stem socket
Panel end─┤                │
          │   cable hole   │──── cable end attachment
          └────────────────┘
          Width: 75mm, 14ga (2mm) stamped steel
```

### 7.2 Roller Specification

```
NYLON ROLLER (2" dia)
         ┌────────────────────┐
    stem ├────────────┬───────┤ stem
    4"   │  nylon rim │ steel │ inside dia 50.8mm
         │  10-ball   │ core  │ outside dia 50.8mm
         └────────────┴───────┘
                   ▲
            stem: Ø9.5mm × 100mm
            Material: cold-rolled steel, zinc plated
```

| Part              | Qty | Spec                              |
|-------------------|-----|-----------------------------------|
| Section hinge #1  | 12  | 150mm wide, 14ga, zinc-plated     |
| End hinge (top)   | 2   | Carries top roller only           |
| End hinge (mid)   | 6   | For sections 1-3, carry roller    |
| End hinge (bot)   | 2   | Bottom section, carries cable     |
| Nylon roller 2"   | 10  | 50.8mm OD, 100mm stem, 10-ball   |
| Top roller        | 2   | 50.8mm OD, short 4" stem         |
| Hinge pins        | 12  | Ø8mm × 40mm, split cotter        |

---

## 8. COUNTERBALANCE TORSION SPRING SYSTEM

### 8.1 Spring Layout

```
FRONT VIEW — TORSION SPRING ASSEMBLY
              ◄──── 2,540mm (door width) ────►
                    ◄────── ~1,600mm ─────►
┌───────────────────────────────────────────────┐
│  ┌────────┐                       ┌────────┐  │
│  │ drum L │◄── spring LH ──┬── spring RH ──►│ drum R│  │
│  └────────┘                │                └────────┘  │
│                   ┌────────┴────────┐                    │
│                   │ CENTER BRACKET  │                    │
│                   │  (wall mount)   │                    │
│                   └────────────────┘                    │
│  ←─── cable ───                         ─── cable ───►  │
└───────────────────────────────────────────────────────┘
              HEADER / WALL ABOVE DOOR
```

### 8.2 Spring Calculation

| Parameter                   | Value         | Notes                       |
|-----------------------------|---------------|-----------------------------|
| Door weight (W)             | 72 kg = 706 N | 4 panels + hardware         |
| Door height (H)             | 2,135 mm      |                             |
| Drum pitch radius (r)       | 38.1 mm       | Standard 3" drum            |
| Cable lift per turn         | 239 mm        | = 2π × 38.1mm               |
| Turns to lift door          | 8.93 turns    | = 2135 / 239                |
| Required IPPT               | 38 in-lb/turn | = (W × r) / turns           |
| Wire diameter (d)           | 6.5 mm        | Selected from spring table  |
| Inside diameter (ID)        | 102 mm        |                             |
| Total turns                 | 30 turns      | includes 1/4 turn pre-load  |
| Spring length               | 965 mm        | = turns × (d + clearance)  |
| Material                    | High-carbon steel, ASTM A227, shot-peened |
| LH spring (left-wound)      | 1 off         |                             |
| RH spring (right-wound)     | 1 off         |                             |
| Safety cable (inside spring)| 2 off         | Ø6mm, prevents spring lash |
| Rated cycle life            | 10,000 cycles |                             |

### 8.3 Spring Tube (Torsion Bar)

| Parameter    | Value                          |
|--------------|--------------------------------|
| OD           | 25.4 mm                        |
| Wall         | 2.5 mm (ID = 20.4mm)          |
| Length       | 1,600 mm                       |
| Material     | ERW steel tube, ASTM A513      |
| Treatment    | Zinc phosphate + oil           |
| End fittings | Hexagonal winding cones (weld) |

---

## 9. CABLE DRUM & LIFT CABLE

### 9.1 Cable Drum

```
CABLE DRUM (RH shown)
        ┌───────────────────┐
 shaft ─┤  groove helix     ├─ shaft bore
        │  (cable winds in) │
        │  pitch OD = 76mm  │
        └───────────────────┘
        Width: 100mm
        Material: Die-cast aluminum (ADC12) or cast iron
        Bore: 25.5mm (fits spring tube)
        Set screw: M8×20mm, Grade 8.8
```

| Part          | Qty | Spec                               |
|---------------|-----|------------------------------------|
| Cable drum LH | 1   | Al die-cast, 76mm pitch dia       |
| Cable drum RH | 1   | Al die-cast, 76mm pitch dia       |
| Bearing plate | 2   | 4mm steel, flanged, 25.4mm bore   |
| End bearing   | 2   | 6205-2RS (25mm bore, 52mm OD)     |

### 9.2 Lift Cable

| Parameter    | Value                               |
|--------------|-------------------------------------|
| Construction | 7×7 galvanized wire rope           |
| Diameter     | 3/32" (2.4mm)                      |
| Length       | 2,600 mm each side (×2 cables)     |
| Break load   | ≥ 900 N (safety factor ≥ 4×)       |
| End fitting  | Swaged loop or crimped ferrule     |
| Material     | Galvanized carbon steel, ASTM A603 |

---

## 10. BELT-DRIVE OPERATOR (MOTOR UNIT)

### 10.1 Operator Assembly Layout

```
SIDE VIEW — OPERATOR UNIT ON RAIL
                             CEILING
    ════════════════════════════════════
    ┌──────────────────────────────────────────┐  ← ceiling bracket
    │                DRIVE RAIL (T-bar)        │    (3-pt mount)
    │    ←───────────── 2,700mm ─────────────► │
    │  ┌────┐                            ┌───┐ │
    │  │HEAD│←── drive belt (closed) ───►│END│ │
    │  │UNIT│   ┌───────┐               │PUL│ │
    │  │    │   │TROLLEY│               │LEY│ │
    │  └────┘   └───┬───┘               └───┘ │
    └──────────────┼───────────────────────────┘
                   │ arm
                   ▼
              TOP SECTION of door
```

### 10.2 Motor Specifications

| Parameter           | Value                                    |
|---------------------|------------------------------------------|
| Type                | BLDC (Brushless DC) preferred            |
| Power               | 375 W (½ HP)                            |
| Voltage             | 24 V DC (from 24V SMPS)                 |
| No-load speed       | 3,000 RPM                               |
| Torque (rated)      | 1.2 Nm                                  |
| Reduction           | 30:1 worm gear                          |
| Output shaft speed  | 100 RPM → via sprocket: belt 200 mm/s   |
| Duty cycle          | S2 (intermittent, 15 min)               |
| Thermal protection  | 130°C PTC thermistor                    |
| Noise               | < 60 dB(A)                              |
| Enclosure           | IP 44                                   |
| Mount               | Bolted to head unit chassis             |

**Alternative:** PSC (Permanent Split Capacitor) AC motor, ½ HP, 230V, 1400 RPM through same gearbox — simpler, lower cost for prototype.

### 10.3 Drive Rail & Trolley

| Part               | Qty | Spec                                   |
|--------------------|-----|----------------------------------------|
| T-bar rail         | 1   | 40×40mm extruded Al, 2,700mm long      |
| Drive belt         | 1   | 8mm pitch polyurethane timing belt, 20mm wide, closed loop ~5,800mm |
| Drive sprocket     | 1   | 8mm pitch, 20T, Al alloy              |
| Idler sprocket     | 1   | 8mm pitch, 20T, nylon                 |
| Trolley body       | 1   | Die-cast Al, 4× nylon guide wheels    |
| Trolley arm        | 1   | Ø16mm steel rod, 300mm, quick release |
| Quick release      | 1   | Red T-handle pulls to disengage       |
| Rail ceiling mount | 3   | L-bracket, 3mm steel, lag-bolt anchor |
| Header wall mount  | 1   | Wall plate + pivot bracket, 4mm steel |

---

## 11. CONTROL SYSTEM DESIGN

### 11.1 Block Diagram

```
                    230V AC MAINS
                         │
               ┌─────────▼─────────┐
               │   12V / 5A SMPS   │
               │  (Mean Well or eq)│
               └──────┬────────────┘
                       │ 12V
         ┌─────────────┼──────────────────────┐
         │             │                      │
    ┌────▼────┐   ┌────▼────────────────┐  ┌──▼──────┐
    │ SLA     │   │     ESP32-WROOM-32  │  │BTS7960  │
    │ 12V 7AH │   │   (MCU + WiFi +     │  │H-Bridge │
    │ backup  │   │    BT + 433 RX)     │  │Motor Dr.│
    └────┬────┘   └──┬────────────────┬─┘  └──┬──────┘
         │           │                │        │
         │      ┌────▼────┐    ┌──────▼──┐     │ to MOTOR
         │      │ 433 MHz │    │Hall eff.│     │
         │      │ RX mod  │    │Limit sw.│     │
         │      └─────────┘    └─────────┘     │
         │
    ┌────▼──────────────────────────────┐
    │  Photo-eye IR pair (obstruction) │
    │  Current sense (load monitor)    │
    │  Status LEDs (R/G/B)             │
    └───────────────────────────────────┘
```

### 11.2 MCU — ESP32-WROOM-32

| GPIO | Function           | Notes                        |
|------|--------------------|------------------------------|
| 25   | Motor DIR A        | BTS7960 RPWM                |
| 26   | Motor DIR B        | BTS7960 LPWM                |
| 27   | Motor PWM EN       | Speed control 0–100%         |
| 32   | Limit SW open      | Hall effect, active low      |
| 33   | Limit SW close     | Hall effect, active low      |
| 34   | Current sense ADC  | Motor load monitoring        |
| 35   | Photo-eye IN       | Obstruction, active low      |
| 04   | LED Red            | Fault indicator              |
| 05   | LED Green          | Door closed / ready          |
| 18   | LED Blue           | WiFi connected               |
| 19   | 433 RF DATA IN     | RF module data pin           |
| 21   | Buzzer             | Audible alerts               |
| 22   | Battery sense ADC  | Voltage divider (12V→3.3V)  |
| 23   | Backup relay       | Switch to SLA battery        |

### 11.3 Motor Driver — BTS7960 43A H-Bridge

| Parameter      | Value              |
|----------------|--------------------|
| Input voltage  | 6–27 V             |
| Max current    | 43A peak, 15A cont.|
| PWM frequency  | 1–25 kHz           |
| Thermal prot.  | Built-in           |
| Over-current   | Built-in           |
| Logic level    | 3.3V / 5V compat.  |
| Package        | Module (buy-out)   |

### 11.4 Power Supply

| Rail    | Source      | Current | Use                        |
|---------|-------------|---------|----------------------------|
| 12V     | SMPS        | 5A      | Motor, BTS7960, relay      |
| 5V      | LDO from 12V| 500mA   | ESP32, sensors, RF module  |
| 12V     | SLA backup  | 7AH     | 20+ cycles on power failure|

SMPS: **Mean Well DR-60-12** (DIN rail, 60W, 12V/5A) — buy-out

### 11.5 Safety Sensors

**Photo-eye pair (obstruction detection):**
- Mount: 150mm above floor, both jamb sides
- Type: Active IR break-beam
- Range: 8–10m
- Output: NPN open-collector, active low
- Model reference: Liftmaster 041A4373 or equivalent generic
- Wiring: Shielded 2-core cable

**Limit Switches (door position):**
- Type: Hall-effect sensors (non-contact)
- Mount: On rail at open and close positions
- Trigger: Magnet embedded in trolley
- Models: AH3503 or AH49E

**Motor Current Sensing:**
- Shunt resistor: 10mΩ, 5W, on BTS7960 output
- ADC reads voltage → current
- Threshold: If current > 3× normal → obstruction → reverse

### 11.6 RF Remote

| Parameter     | Value                            |
|---------------|----------------------------------|
| Frequency     | 433.92 MHz                       |
| Encoding      | Rolling code (Keeloq protocol)   |
| Range         | 30–50m open air                  |
| Channels      | 2 (open/close + stop)            |
| Battery       | 12V 23A alkaline (1 cell)        |
| Receiver      | Superheterodyne module (RXB6)    |
| Pairing       | Button-press learn mode on PCB   |

### 11.7 WiFi / App Control

- **Protocol:** MQTT over WiFi (ESP32 native)
- **Broker:** Local (mosquitto on home router) or cloud (AWS IoT / Blynk)
- **App:** Compatible with Home Assistant, custom Flutter app, or Blynk IoT
- **Commands:** OPEN, CLOSE, STOP, STATUS
- **Status topics:** door/state (open/closed/moving), door/error, battery/voltage
- **OTA update:** ESP32 ArduinoOTA for firmware update over WiFi

### 11.8 PCB Design Summary

- **Form factor:** 100mm × 80mm, 2-layer PCB
- **Fabrication:** JLCPCB or PCBWay (prototype: 5 boards, $12)
- **Connectors:**
  - 2-pin JST for photo-eye
  - 3-pin for each hall sensor
  - 4-pin for motor output (screw terminal)
  - 2-pin 230V AC input (4mm², fused)
  - 4-pin USB-C for programming
  - 2-pin JST for SLA battery
- **Protection:** TVS diodes on all I/O, 5A fuse on motor rail, polyfuse on 5V

---

## 12. WEATHER SEALING

| Location      | Part                | Material     | Dims          |
|---------------|---------------------|--------------|---------------|
| Bottom        | Bottom seal         | EPDM rubber  | D-section, 2,540mm |
| Sides (jambs) | Side seal           | EPDM brush   | 2,135mm × 2  |
| Top           | Top seal            | EPDM bulb    | 2,540mm      |
| Section joints| Panel joint seal    | Co-ext EPDM  | integral in panel |

Bottom seal is retained in extruded aluminum astragal screwed to bottom section.

---

## 13. FASTENERS & HARDWARE SUMMARY

| Part                  | Qty | Spec                         | Standard         |
|-----------------------|-----|------------------------------|------------------|
| Hex bolt M8×25        | 40  | Grade 8.8, HDG               | ISO 4014         |
| Hex bolt M10×35       | 12  | Grade 8.8, HDG               | ISO 4014         |
| Spring washer M8      | 40  | HDG                          | ISO 7090         |
| Flat washer M8        | 40  | HDG                          | ISO 7089         |
| Nyloc nut M8          | 20  | Grade 8, zinc plated         | ISO 7042         |
| Nyloc nut M10         | 12  | Grade 8, zinc plated         | ISO 7042         |
| Lag screw 6×60mm      | 12  | Hex head, zinc               | DIN 571          |
| Wall anchor M10       | 12  | Fischer FUR or equiv.        |                  |
| Self-drill screw 5×16 | 48  | Hex washer head, ZnCr        | DIN 7504N        |
| Set screw M8×20       | 4   | Cup point, Grade 12.9        | ISO 4026         |
| Cotter pin 2×20       | 12  | Stainless 304                | DIN 94           |

---

## 14. SURFACE FINISH & PAINT

| Component        | Surface Treatment                           |
|------------------|---------------------------------------------|
| Steel panels     | Pre-painted at factory (RAL 7016, PVDF coat)|
| Track (HDG)      | Hot-dip galvanized, Z450, no additional paint|
| Hinges/rollers   | Electroplated zinc, min 12µm per ASTM B633 |
| Spring tube      | Zinc phosphate + oil                        |
| Motor enclosure  | Powder coat, RAL 7035 light grey            |
| PCB              | HASL (Hot Air Solder Leveling), green mask  |
| Al parts (drums) | Anodize, clear, 15µm min                   |

---

## 15. COMPLIANCE & STANDARDS (REFERENCE)

| Standard       | Scope                              |
|----------------|------------------------------------|
| EN 13241-1     | Industrial/commercial doors        |
| EN 60335-2-95  | Safety of motorized door operators |
| UL 325         | Door, drapery, gate operators (USA)|
| ISO 4014       | Hex bolts                          |
| ASTM A36       | Structural steel                   |
| ASTM A227      | Hard-drawn spring wire             |
| ASTM A603      | Zinc-coated wire rope              |

---

*Document GD-PDS-001 Rev A — SmartLift Pro — Prototype Phase*
