# SmartLift Pro — Manufacturing & Process Plan
## Document No.: GD-MFG-001 | Rev: A | Date: 2026-05-23

---

## 1. MANUFACTURING STRATEGY (PROTOTYPE PHASE)

| Component             | Strategy           | Reason                             |
|-----------------------|--------------------|------------------------------------|
| Door panels           | **Buy-out**        | Requires roll-forming line + PU injection — not viable for prototype |
| Track sections        | **Make (outsource)**| Simple bending + drilling; local fabricator with press brake |
| Track brackets        | **Make (outsource)**| Laser cut + bend; DXF supplied     |
| Springs               | **Buy-out**        | Safety-critical; specialist supplier only |
| Motor/gearbox         | **Buy-out**        | Standard industrial product        |
| Drive belt + sprockets| **Buy-out**        | Standard power transmission        |
| Trolley + rail        | **Buy-out / Modify**| Buy LiftMaster or equiv. trolley; modify arm |
| Hinges & rollers      | **Buy-out**        | Standard catalog items             |
| Drums & bearing plates| **Buy-out**        | Catalog items                      |
| Control PCB           | **Make (in-house)**| Prototype: hand solder; later PCBA |
| Enclosure             | **Buy-out**        | Standard ABS enclosure; drill cutouts |
| Wiring harness        | **Make (in-house)**| Cut + crimp to wiring diagram      |

---

## 2. PARTS REQUIRING FABRICATION (MAKE)

### 2.1 Vertical & Horizontal Track

**Material:** 3mm HDG steel strip (76mm wide), Z450 coating

**Process:**
1. Cut strip to length: V-track = 2,285mm; H-track = 2,435mm
2. Press-brake bend to 76×32mm channel section (single bend, 90°)
3. Drill roller slot holes: Ø12mm × 25mm elongated slot, at 533mm c/c (matching panel joints)
4. Drill bolt holes: Ø9mm through-holes for bracket attachment
5. Deburr all edges — critical (installer safety)
6. No additional finish needed (HDG base material)

**Fixtures needed:** Length stop on press brake; drill jig for slot pattern

**Tolerances:** Length ±2mm; slot position ±1mm; channel squareness ±0.5mm

---

### 2.2 Track Brackets (Wall Angle + Flag Angle)

**Material:** 3mm HDG steel plate

**Process:**
1. Laser cut or plasma cut to profile (DXF file GD-DXF-003)
2. Deburr
3. Drill holes: Ø9mm (structural), Ø12mm×25mm slots for adjustment
4. Press-brake bend where needed (L-shape, 90°)
5. No coating (HDG base)

---

### 2.3 Header / Center Bracket

**Material:** 4mm HDG steel plate

**Process:**
1. Laser cut to profile (DXF file GD-DXF-004)
2. Drill: Ø26.5mm hole for spring tube clearance; 4× Ø11mm bolt holes
3. Deburr; lightly dress edges with file
4. Bend if required (flat bracket, no bend needed typically)

---

### 2.4 Control PCB Assembly

**Schematic reference:** GD-SCH-001 (KiCad project file)

**Process:**
1. Order bare PCBs from JLCPCB (5 off, $12)
2. Gather all SMD components (pre-sorted in tray)
3. Apply solder paste (stencil or manual) to SMD pads
4. Place SMD components (ESP32 module, BTS7960, passives)
5. Reflow: use hot plate or oven, 200°C peak, 30s dwell
6. Inspect solder joints (visual + magnifier)
7. Place and hand-solder through-hole: terminal blocks, connectors, LED, buzzer
8. Clean flux residue with isopropyl alcohol
9. Conformal coat (acrylic, 2 coats) — excluding connectors
10. Test per test procedure GD-TEST-001

**Test procedure (GD-TEST-001 summary):**
- Power on 12V: check 5V rail ±0.1V; check 3.3V LDO ±0.05V
- Program ESP32 via USB-C: flash firmware GD-FW-001
- Motor driver: bench test with 12V motor (no load): fwd/rev/stop commands
- RF receive: pair remote, verify OPEN/CLOSE/STOP commands received
- WiFi: connect to test AP, verify MQTT publish/subscribe
- Hall sensors: trigger with magnet; verify GPIO state changes
- Photo-eye: break beam; verify obstruction flag on MCU
- Current sense: apply load; verify ADC reading > threshold

---

### 2.5 Wiring Harness

**Wire schedule:**

| Wire ID | From           | To                 | Gauge | Color  | Length  |
|---------|----------------|--------------------|-------|--------|---------|
| W01     | SMPS 12V+      | PCB J1 pin 1       | 18AWG | Red    | 300mm   |
| W02     | SMPS GND       | PCB J1 pin 2       | 18AWG | Black  | 300mm   |
| W03     | PCB motor A+   | Motor term A       | 18AWG | Orange | 800mm   |
| W04     | PCB motor A–   | Motor term B       | 18AWG | Yellow | 800mm   |
| W05     | PCB photo-eye+ | Photo-eye TX (+)   | 22AWG | Blue   | 3000mm  |
| W06     | PCB photo-eye– | Photo-eye TX (–)   | 22AWG | White  | 3000mm  |
| W07     | PCB hall 1     | Hall sensor open   | 22AWG | Green  | 2800mm  |
| W08     | PCB hall 2     | Hall sensor close  | 22AWG | Green  | 200mm   |
| W09     | PCB 12V bat    | SLA battery (+)    | 18AWG | Red    | 200mm   |
| W10     | PCB GND bat    | SLA battery (–)    | 18AWG | Black  | 200mm   |
| W11     | Mains L        | SMPS input L       | 16AWG | Brown  | 500mm   |
| W12     | Mains N        | SMPS input N       | 16AWG | Blue   | 500mm   |
| W13     | Mains E        | Enclosure earth    | 16AWG | G/Y    | 500mm   |

**Process:**
1. Cut wires to length per schedule
2. Strip both ends 8mm
3. Crimp JST or ferrule terminals per connector spec
4. Label each wire (heat-shrink label or marker)
5. Bundle with cable ties at 150mm intervals

---

## 3. ASSEMBLY SEQUENCE

### Phase 1 — Structural (Track + Spring Installation)

```
STEP 1: Install vertical tracks
  ├─ Fit wall angle brackets to concrete jamb at 600mm, 1200mm, 1800mm heights
  ├─ Use lag screws M6×60mm into wall anchors (pre-drill Ø8mm, depth 60mm)
  ├─ Hang vertical tracks from brackets — finger-tight only
  └─ Check plumb with spirit level; tighten fully when plumb ✓

STEP 2: Install header bracket + center bracket
  ├─ Mark header bracket position: centered on door opening, 300mm above opening
  ├─ Lag-bolt header bracket to header / lintel (4× M10 lags into masonry)
  ├─ Lag-bolt center bracket (spring mount) centered above door opening
  └─ Check level ✓

STEP 3: Install curved track sections
  ├─ Connect curved section to top of vertical track (bolt, 2× M8×25)
  └─ Align curve to be tangent with horizontal track slope angle ✓

STEP 4: Install horizontal tracks
  ├─ Attach to top of curved sections
  ├─ Mount flag angles to ceiling joists at 600mm intervals
  ├─ Set 2° downward slope (use digital level)
  └─ Install end stops at back end of horizontal tracks ✓

STEP 5: Install torsion spring assembly
  ├─ WARNING: Spring installation — TRAINED PERSON ONLY
  ├─ Slide bearing plates onto spring tube ends
  ├─ Slide LH spring onto tube from LEFT; RH spring from RIGHT
  ├─ Slide cable drums onto tube ends; align cable grooves with cable line
  ├─ Set spring tube in bearing plate pockets + center bracket
  ├─ Lock cable drums with set screws (tighten to 15 Nm)
  ├─ Thread safety cables through springs; anchor both ends
  ├─ Wind LH spring: 8.75 turns counter-clockwise (winding bar in cone)
  ├─ Wind RH spring: 8.75 turns clockwise
  ├─ Lock winding cones with set screws (30 Nm); apply thread locker
  └─ Check spring balance: door should hold in mid-position unaided ✓
```

### Phase 2 — Door Panel Assembly

```
STEP 6: Install bottom section (Section 1)
  ├─ Position bottom section in door opening, centered
  ├─ Attach end hinges (HN-004) to each end — 3 bolts each
  ├─ Thread lift cables through bottom bracket cable holes; knot and clamp
  ├─ Insert rollers into track (vertical) — should roll freely
  └─ Check level across bottom section ✓

STEP 7: Install sections 2, 3, 4
  ├─ Lift Section 2 onto Section 1; engage tongue-and-groove joint
  ├─ Attach 4× section hinges (#1) at joint: 2 per bolt line (4 bolts per hinge)
  ├─ Attach end hinges (HN-003) to each end of Section 2
  ├─ Insert rollers into vertical tracks
  ├─ Repeat for Sections 3 and 4
  └─ Top section (4): attach end hinges type HN-002 (roller only)

STEP 8: Attach lift cables to drums
  ├─ Pull lift cables up; loop around cable drum groove (bottom winding slot)
  ├─ Tension cable by rotating drum 1–2 turns by hand
  ├─ Lock cable to drum with cable retention bolt
  └─ Check equal tension both sides; door panel should sit level ✓

STEP 9: Initial manual cycle check
  ├─ Manually lift door slowly — should move smoothly through full travel
  ├─ Check rollers track correctly in curved sections
  ├─ Check door balance: if door drifts down (springs under-wound); up (over-wound)
  ├─ Adjust spring tension: ¼ turn increments
  └─ Final check: door holds in mid-position unaided ✓
```

### Phase 3 — Operator Installation

```
STEP 10: Install drive rail
  ├─ Attach header wall-plate bracket to wall above door opening (4× M8 lags)
  ├─ Attach rail rear bracket to ceiling at back position
  ├─ Slide T-bar rail between brackets; adjust height = top-of-door + 50mm clearance
  ├─ Bolt rail to both brackets; check level and alignment ✓

STEP 11: Install head unit (motor + gearbox + belt)
  ├─ Slide head unit to front of rail; engage drive sprocket in belt loop
  ├─ Tension belt via idler sprocket adjuster — 10mm deflection per 300mm span
  ├─ Bolt head unit to rail (4× M8 cap screws)
  └─ Connect motor leads temporarily for direction test ✓

STEP 12: Install trolley
  ├─ Slide trolley onto rail from rear; engage nylon guide wheels
  ├─ Attach drive arm to trolley body (quick-release clevis)
  ├─ Connect drive arm lower end to top door section bracket (bolt + lock washer)
  └─ Check trolley travel: full door height + 150mm overtravel ✓

STEP 13: Install limit sensors (hall effect)
  ├─ Mount magnets in trolley at open and close positions (mark rail with sharpie first)
  ├─ Mount hall sensor at CLOSE position (near head unit)
  ├─ Mount hall sensor at OPEN position (near end stop)
  └─ Check clearance: sensor–magnet gap = 5mm ±2mm ✓
```

### Phase 4 — Electrical & Controls

```
STEP 14: Mount control enclosure
  ├─ Wall-mount ABS enclosure (IP54) adjacent to head unit, at comfortable reach height
  ├─ Drill cable entry holes (bottom of enclosure); fit cable glands
  └─ Mount SMPS on DIN rail inside enclosure ✓

STEP 15: Install photo-eye sensors
  ├─ Mount TX on one jamb, RX on opposite jamb — 150mm above floor
  ├─ Align: TX beam must hit RX center (green LED on receiver = aligned)
  ├─ Run shielded 2-core cable (W05, W06) back to enclosure
  └─ Secure cable with cable cleats every 500mm ✓

STEP 16: Install PCB + wiring
  ├─ Mount PCB in enclosure on standoffs (4× M3×10mm)
  ├─ Connect wiring harness per wire schedule W01–W13
  ├─ Connect motor, hall sensors, photo-eye, SLA battery
  ├─ Connect 230V AC supply — SAFETY: isolate mains before this step
  ├─ Cable-tie all wiring inside enclosure
  └─ Fit lid; check IP seal ✓

STEP 17: Power-on and commissioning
  ├─ Apply mains power; check 12V rail (multimeter: 12.0V ±0.2V)
  ├─ Check 5V rail; check ESP32 boots (LED blinks)
  ├─ Connect laptop via USB-C; open serial monitor
  ├─ Verify all sensor readings print to serial (photo-eye clear, limits open)
  ├─ Test OPEN command via serial: door should open to limit, stop
  ├─ Test CLOSE command: door closes, auto-slows last 300mm, stops at limit
  ├─ Test obstruction: break photo-eye during close → door reverses → ✓
  ├─ Test RF remote: pair, verify OPEN/CLOSE/STOP all function
  ├─ Connect to WiFi; test MQTT from phone (publish door/command = OPEN)
  ├─ Simulate power cut: disconnect mains; test battery backup operation ✓
  └─ Run 10 full open/close cycles; observe for binding, noise, mis-tracking
```

---

## 4. QUALITY CONTROL CHECKPOINTS

| QC Point | Check                              | Method           | Accept Criteria        |
|----------|------------------------------------|------------------|------------------------|
| QC-01    | Track plumb                        | Spirit level      | ≤ 1mm per 1000mm       |
| QC-02    | Track spacing (inside)             | Steel tape        | 2,540 ±2mm             |
| QC-03    | Spring balance                     | Manual lift test  | Door holds in mid-pos. |
| QC-04    | Cable tension equal                 | Tug test          | Equal resistance L & R |
| QC-05    | Panel alignment (flush)            | Straight edge     | ≤ 1.5mm step at joints |
| QC-06    | Roller tracking                    | Visual cycle      | No rubbing in tracks   |
| QC-07    | Belt tension                       | Deflection test   | 10mm per 300mm span    |
| QC-08    | Door cycle time (full)             | Stopwatch         | 8–12 seconds          |
| QC-09    | Noise level                        | Phone dB meter    | < 65 dB(A) at 1m      |
| QC-10    | Obstruction auto-reverse           | Block with 2kg weight | Door reverses <0.5s|
| QC-11    | Photo-eye function                 | Break beam        | Door reverses ✓        |
| QC-12    | RF range                           | Walk test         | Functions at 30m       |
| QC-13    | WiFi command latency               | App + stopwatch   | < 1 second             |
| QC-14    | Battery backup                     | Mains disconnect  | ≥ 5 cycles on battery  |
| QC-15    | Bottom seal (weather)              | Water spray test  | No water ingress       |

---

## 5. CRITICAL SAFETY NOTES

```
⚠ TORSION SPRING WARNING
   Torsion springs store lethal energy. Always use a proper
   winding bar (Ø10mm solid steel, 600mm long). Never use
   a screwdriver or other improvised tool. Release tension
   before any disassembly. Two-person operation required.

⚠ ELECTRICAL SAFETY  
   230V AC is present in the control enclosure. Isolate mains
   supply before opening enclosure or making any wiring changes.
   Earth bonding: continuity between enclosure, motor frame,
   and mains earth must be verified (< 0.5Ω) before energizing.

⚠ CRUSHING HAZARD
   Never place hands/feet in door path during testing.
   Fit photo-eye sensors before any powered testing.
   Post warning labels on both sides of door.
```

---

## 6. DRAWINGS REQUIRED (TO BE PRODUCED IN CAD)

| Drawing No.   | Title                              | Scale | Views          |
|---------------|------------------------------------|-------|----------------|
| GD-DRW-001    | Door Assembly — Overall            | 1:20  | Front, Side, Plan |
| GD-DRW-002    | Panel Section — Cross-section A-A  | 1:2   | Section        |
| GD-DRW-003    | Track Vertical — Detail            | 1:5   | Front, End, Detail holes |
| GD-DRW-004    | Track Horizontal — Detail          | 1:5   | Front, End     |
| GD-DRW-005    | Spring Assembly — Spring tube and drum | 1:5 | Front, section|
| GD-DRW-006    | Bottom Bracket Assembly            | 1:2   | Front, side    |
| GD-DRW-007    | Header / Center Bracket            | 1:2   | Front, side    |
| GD-DRW-008    | Trolley Assembly & Arm             | 1:2   | Front, section |
| GD-DRW-009    | Control Enclosure Layout           | 1:2   | Front inside, wiring |
| GD-DRW-010    | PCB Layout (KiCad Gerber)          | 1:1   | Top copper, silkscreen |
| GD-DRW-011    | Wiring Diagram (schematic)         | –     | Full schematic |
| GD-DXF-003    | Wall angle bracket — DXF for laser | 1:1   | Flat blank     |
| GD-DXF-004    | Header bracket — DXF for laser     | 1:1   | Flat blank     |

---

## 7. LEAD TIME ESTIMATES (PROTOTYPE)

| Activity                          | Lead Time         |
|-----------------------------------|-------------------|
| PCB fabrication (JLCPCB)          | 5–7 working days  |
| Panel order (local OEM)           | 3–4 weeks         |
| Springs (import/local)            | 1–2 weeks         |
| Track fabrication (outsource)     | 3–5 working days  |
| Standard hardware (local)         | 1–3 days          |
| Motor / gearbox (import/local)    | 1–2 weeks         |
| **Total critical path**           | **~5 weeks**      |

---

*Document GD-MFG-001 Rev A — SmartLift Pro — Prototype Phase*
