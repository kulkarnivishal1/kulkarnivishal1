# SmartLift Pro — Project Schedule (Prototype Phase)
## Document No.: GD-SCH-001 | Rev: A | Date: 2026-05-23

---

## MASTER SCHEDULE — 10 WEEK PROTOTYPE PLAN

```
WEEK    │  1  │  2  │  3  │  4  │  5  │  6  │  7  │  8  │  9  │ 10  │
────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
        │     DESIGN & PROCUREMENT    │    FABRICATION    │   TEST     │
────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
CAD     │████ │████ │     │     │     │     │     │     │     │     │
Mech    │     │     │     │     │     │     │     │     │     │     │
────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
PCB     │████ │████ │Fab  │     │     │     │     │     │     │     │
Design  │     │     │JLCPC│     │     │     │     │     │     │     │
────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
Firmware│████ │████ │████ │████ │████ │     │     │     │     │     │
Dev     │     │     │     │     │     │     │     │     │     │     │
────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
Panel   │Ord. │Wait │Wait │Wait │Recv.│     │     │     │     │     │
Order   │     │     │     │     │     │     │     │     │     │     │
────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
Spring/ │Ord. │Wait │Recv.│     │     │     │     │     │     │     │
Motor   │     │     │     │     │     │     │     │     │     │     │
────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
Track   │Ord. │Fab  │Recv.│     │     │     │     │     │     │     │
Fabr.   │     │     │     │     │     │     │     │     │     │     │
────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
PCB     │     │     │     │Assy │Test │     │     │     │     │     │
Assy    │     │     │     │     │     │     │     │     │     │     │
────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
Mechan. │     │     │     │     │████ │████ │     │     │     │     │
Assy    │     │     │     │     │     │     │     │     │     │     │
────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
Elec.   │     │     │     │     │     │████ │     │     │     │     │
Install │     │     │     │     │     │     │     │     │     │     │
────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
System  │     │     │     │     │     │     │████ │████ │     │     │
Test    │     │     │     │     │     │     │     │     │     │     │
────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
Snag /  │     │     │     │     │     │     │     │     │████ │     │
Rework  │     │     │     │     │     │     │     │     │     │     │
────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
Demo &  │     │     │     │     │     │     │     │     │     │████ │
Sign-off│     │     │     │     │     │     │     │     │     │     │
```

---

## MILESTONE LIST

| # | Milestone                         | Week | Owner     |
|---|-----------------------------------|------|-----------|
| M1| CAD drawings released to fab      | W2   | Mech Eng  |
| M2| PCB Gerbers sent to JLCPCB        | W2   | Elec Eng  |
| M3| All BOM items ordered             | W1   | Procurement|
| M4| PCBs received + assembled         | W4   | Elec Eng  |
| M5| PCB electrical test pass         | W5   | Elec Eng  |
| M6| Firmware alpha (serial control)   | W4   | SW Eng    |
| M7| All hardware received (panels, springs, motor) | W5 | Procurement |
| M8| Mechanical assembly complete      | W6   | Mech Eng  |
| M9| Electrical installation complete  | W6   | Elec Eng  |
| M10| Firmware beta (WiFi + RF)        | W6   | SW Eng    |
| M11| System integration test begin   | W7   | All       |
| M12| Safety test pass (obstruction, auto-reverse) | W8 | QC |
| M13| Snag list closed                 | W9   | All       |
| M14| Final demo + stakeholder sign-off | W10  | PM        |

---

## TEAM ROLES (SUGGESTED)

| Role                  | Responsibility                                     |
|-----------------------|----------------------------------------------------|
| Mechanical Engineer   | CAD, track fabrication, panel + hardware assembly |
| Electrical Engineer   | PCB design, wiring, electrical install             |
| Software Engineer     | ESP32 firmware, MQTT, app integration             |
| Procurement           | BOM ordering, supplier management, lead time tracking |
| Project Manager       | Schedule, budget, risk, coordination              |
| QC Technician         | Test execution, QC checklist, sign-off            |

---

## RISKS & MITIGATIONS

| Risk                              | Probability | Impact | Mitigation                       |
|-----------------------------------|-------------|--------|----------------------------------|
| Panel lead time > 4 weeks         | Medium      | High   | Order week 1; use local OEM      |
| Spring sizing incorrect           | Low         | High   | Calculate + validate with supplier before order |
| WiFi connectivity issues          | Low         | Medium | Test on bench before installation |
| Motor gearbox underpowered        | Low         | Medium | Test door weight + spring balance first |
| PCB fabrication defects           | Low         | Medium | Order 5 boards; test all before solder |
| Firmware RF decode fails          | Medium      | Low    | Use proven rc-switch library     |
| Budget overrun                    | Medium      | Medium | 10% contingency built in         |

---

*Document GD-SCH-001 Rev A — SmartLift Pro — Prototype Phase*
