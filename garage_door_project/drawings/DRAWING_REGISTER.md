# SmartLift Pro — Engineering Drawing Register & Key Dimensions
## Document No.: GD-DRW-REG-001 | Rev: A | Date: 2026-05-23

All drawings to be produced in CAD (SolidWorks, FreeCAD, or DraftSight).
DXF files for laser cutting are ready to issue upon CAD completion.
This register defines all required drawings and captures critical dimensions.

---

## 1. OVERALL ASSEMBLY — GD-DRW-001

```
DOOR ASSEMBLY — FRONT VIEW (not to scale, dims mm)

         ←────────────── 2,540 ──────────────────→
    ┌─────────────────────────────────────────────────┐
    │     SECTION 4 (TOP)          533               │▲
    ├─────────────────────────────────────────────────┤│
    │     SECTION 3                533               ││ 2,132
    ├─────────────────────────────────────────────────┤│
    │     SECTION 2                533               ││
    ├─────────────────────────────────────────────────┤│
    │     SECTION 1 (BOTTOM)       533               │▼
    └─────────────────────────────────────────────────┘
    ╪══════════════════════════════════════════════════╪
           bottom seal (EPDM D-section)

DOOR ASSEMBLY — SIDE VIEW

                         ──────── CEILING ────────────
                              ↕ 300mm (headroom)
    ────────────────── HEADER ──────────────────────
          ╔═══════════════════════════════════╗
          ║                                   ║  ← horizontal track (2,435mm)
          ╗   ← curved section (R=305mm)     ╔
          ║
          ║                                   ← vertical track (2,285mm)
          ║                         ┌────────┐
          ║                         │SECTION4│ ← door sections (closed pos.)
          ║                         │   3    │
          ║                         │   2    │
          ║                         │   1    │
    ─── FLOOR ─────────────────────────────────────
    ↕ 150mm gap at floor (track end)

KEY ASSEMBLY DIMENSIONS:
  A: Door width                = 2,540mm
  B: Door height               = 2,132mm (4 × 533mm)
  C: Clear opening height      = 2,100mm
  D: Clear opening width       = 2,500mm
  E: Headroom required         = 300mm min
  F: Side room (each side)     = 125mm min
  G: Backroom (depth required) = 2,600mm min
  H: Spring tube c/l above door= 75mm
  J: Operator rail clearance   = door top + 50mm = 2,182mm above floor
```

---

## 2. PANEL CROSS-SECTION DETAIL — GD-DRW-002

```
PANEL CROSS-SECTION A–A (Horizontal cut, 5:1 scale)
                              40.0mm total
                    ←──────────────────────────►
                    ┌──┬──────────────────────┬──┐
                    │  │ PU FOAM CORE         │  │
               0.45 │  │ ρ = 40 kg/m³         │  │ 0.40
               PPGI │  │ CFC-free             │  │  GI
                    │  │ λ = 0.022 W/mK       │  │
                    └──┴──────────────────────┴──┘
                   2.0  ←────── 36.0 ──────►  2.0

PANEL JOINT DETAIL (Vertical section, tongue-and-groove):
             Upper panel
         ════════════════
             ┌───────────┐
             │  TONGUE   │← 10mm wide, 8mm protrusion
         ════╡ EPDM seal ╞════
             │  GROOVE   │← 12mm wide, 10mm deep
         ════════════════
             Lower panel

BOTTOM EDGE DETAIL (Section 1):
         ════════════════════
         │   panel body      │
         └──────────────────┘
              ↓ screws 5×16 @300mm c/c
         ┌──────────────────────┐ ← extruded Al astragal 6063-T5
         │      ╪══╪            │   20mm × 60mm section
         └──────────────────────┘
                 ↑
         EPDM D-section seal (2,540mm)
              ↓ contacts floor
         ════════ FLOOR ════════

TOLERANCE NOTES:
  Panel width:  2,540 ±1mm
  Panel height: 533 ±0.5mm
  Thickness:    40 ±0.5mm
  Tongue width: 10 ±0.2mm
  Groove width: 12 ±0.3mm (0.5mm clearance each side for EPDM)
```

---

## 3. VERTICAL TRACK DETAIL — GD-DRW-003

```
VERTICAL TRACK — FRONT VIEW
                           76mm
               ←──────────────────────────→
               ┌──────────────────────────┐
               │                          │ ↑
     bracket   │ ● Ø9mm bolt hole        │ 50mm
     holes     │                          │ ↓
               │                          │
               │ ⬜ 12×25mm slot          │← roller slot (typ. at 533, 1066, 1599mm)
               │                          │
               │ ⬜ 12×25mm slot          │
               │                          │
               │ ⬜ 12×25mm slot          │
               │                          │
               │ ● Ø9mm bolt hole        │
               └──────────────────────────┘
                      2,285mm total length

TRACK CROSS-SECTION (C-C):
        ←── 76mm ──→
        ┌──────────┐ ↑
        │  32mm    │ 3mm wall
        │          │ ↓
        └──────────┘

ROLLER SLOT POSITIONS FROM BOTTOM:
  Slot 1: 266mm  (mid-height of Section 1)
  Slot 2: 799mm  (mid-height of Section 2)
  Slot 3: 1332mm (mid-height of Section 3)
  Slot 4: 1865mm (mid-height of Section 4)
  Top:    2235mm (top roller position)

MATERIAL: Hot-dip galvanized steel, 3mm, Z450
TOLERANCES: Length ±2mm; slot pos. ±1mm; perpendicularity ±0.5°/m
```

---

## 4. HEADER / CENTER BRACKET — GD-DRW-007

```
HEADER BRACKET — FRONT VIEW
                 ←── 150mm ──→
                 ┌────────────┐ ↑
                 │  ● ●  ●  ●│ 50mm ← 4× Ø11mm bolt holes (lag to wall)
                 ├────────────┤ ↓
                 │   Ø26.5mm ○│← spring tube clearance hole
                 │            │
                 │   ○ bearing│← 6205 bearing pocket, Ø52mm press fit
                 │            │
                 └────────────┘
                 100mm total height
                 4mm thick plate
                 Material: HDG mild steel

CENTER BRACKET:
             ← 120mm →
             ┌────────┐ ↑
      wall   │● ●  ● ●│ 40mm ← lag bolt holes
      bolt   ├────────┤ ↓
      holes  │ ○      │← Ø26.5mm tube hole
             │        │
             │ ○      │← 6205 bearing pocket
             └────────┘
             80mm tall | 4mm thick
```

---

## 5. CABLE DRUM — GD-DRW-005 (Reference only; buy-out part)

```
CABLE DRUM RH — FRONT VIEW
           ←── 100mm ──→
           ┌────────────┐ ↑
 bore      │ Ø25.5mm    │  ← press onto spring tube
 25.5mm ──►│ ╔══════╗   │ 76mm OD
           │ ║ helix║   │  (pitch circle)
           │ ╚══════╝   │
           │ M8 set screw│← 2 off, 90° apart
           └────────────┘ ↓
           100mm wide
           NOTE: LH and RH drums are mirror images
           LH drum: cable winds counter-clockwise viewed from outside
           RH drum: cable winds clockwise viewed from outside
```

---

## 6. PCB LAYOUT SKETCH — GD-DRW-010 (to be detailed in KiCad)

```
PCB LAYOUT — 100mm × 80mm (Top view, not to scale)

 ┌─────────────────────────────────────────────────────┐
 │  [J-MAINS]    [SMPS conn]    [ESP32 MODULE]         │
 │  L N E        12V GND        ┌──────────┐           │
 │  ╪ ╪ ╪        ╪   ╪          │          │           │
 │                               │  ESP32   │  [J-RF]  │
 │  [FUSE 5A]   [BTS7960 MODULE] │  WROOM   │  ╪╪      │
 │   |               ╔════╗     │  32      │           │
 │  [RELAY]          ║    ║     └──────────┘           │
 │   mains/bat       ╚════╝                            │
 │                                    [LED] [BUZZ]     │
 │  [J-MOTOR]   [J-PHOTOEYE]   [J-HALL1] [J-HALL2]   │
 │   ╪╪╪           ╪╪            ╪╪╪        ╪╪╪       │
 │                                                     │
 │  [J-BATTERY]   [USB-C prog]   [J-5V_OUT]           │
 │   ╪╪            ╪╪╪╪╪          ╪╪                  │
 └─────────────────────────────────────────────────────┘
  ←──────────────── 100mm ────────────────────────────►

CONNECTOR SUMMARY:
  J-MAINS:    3-pin screw terminal, 6mm² capacity (L/N/E)
  J-MOTOR:    3-pin screw terminal (M+/M–/shunt)
  J-PHOTOEYE: JST 2-pin × 2 (TX and RX separately)
  J-HALL1/2:  JST 3-pin (VCC/GND/SIG)
  J-BATTERY:  JST 2-pin (12V SLA)
  J-RF:       2-pin header (DATA/GND)
  USB-C:      Programming and 5V input
  J-5V_OUT:   2-pin (for future expansion)

CRITICAL LAYOUT RULES:
  - Keep mains traces > 4mm from low-voltage traces
  - Motor driver (BTS7960) module at edge for heat dissipation
  - Bypass caps (100nF) on each IC VCC pin, within 3mm
  - TVS diodes on all external signal lines (at connector entry)
  - Ground plane on bottom layer, stitching vias at 10mm grid
```

---

## 7. DRAWING STATUS

| Drawing No.   | Title                          | Status      | Owner    | Due Date   |
|---------------|--------------------------------|-------------|----------|------------|
| GD-DRW-001    | Overall assembly               | SKETCH      | Mech Eng | Week 1     |
| GD-DRW-002    | Panel cross-section            | SKETCH      | Mech Eng | Week 1     |
| GD-DRW-003    | Vertical track detail          | SKETCH      | Mech Eng | Week 1     |
| GD-DRW-004    | Horizontal track detail        | To do       | Mech Eng | Week 2     |
| GD-DRW-005    | Spring + drum assembly         | SKETCH      | Mech Eng | Week 2     |
| GD-DRW-006    | Bottom bracket                 | To do       | Mech Eng | Week 2     |
| GD-DRW-007    | Header/center bracket          | SKETCH      | Mech Eng | Week 1     |
| GD-DRW-008    | Trolley + arm                  | To do       | Mech Eng | Week 3     |
| GD-DRW-009    | Control enclosure layout       | SKETCH      | Elec Eng | Week 2     |
| GD-DRW-010    | PCB layout (KiCad)             | SKETCH      | Elec Eng | Week 2     |
| GD-DRW-011    | Wiring diagram                 | To do       | Elec Eng | Week 2     |
| GD-DXF-003    | Wall bracket flat blank (DXF)  | To do       | Mech Eng | Week 1     |
| GD-DXF-004    | Header bracket flat blank (DXF)| To do       | Mech Eng | Week 1     |

---

*Document GD-DRW-REG-001 Rev A — SmartLift Pro — Prototype Phase*
