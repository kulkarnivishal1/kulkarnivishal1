# SmartLift Pro — Cost Analysis
## Document No.: GD-CA-001 | Rev: A | Date: 2026-05-23

---

## 1. BOM COST SUMMARY (Prototype — 1 unit)

### Category Breakdown

| Category                     | USD      | INR         |
|------------------------------|----------|-------------|
| Door Panel Assembly          | $378     | ₹31,570     |
| Track System                 | $218     | ₹18,205     |
| Hinge & Roller System        | $138     | ₹11,530     |
| Torsion Spring System        | $110     | ₹9,190      |
| Cable Drum & Lift Cable      | $52      | ₹4,342      |
| Belt-Drive Operator Unit     | $264     | ₹22,070     |
| Control System (Electronics) | $199     | ₹16,625     |
| Fasteners & Hardware         | $56      | ₹4,677      |
| Consumables / Misc           | $20      | ₹1,673      |
| **TOTAL BOM (Materials)**    | **$1,435**| **₹1,19,882**|

> Exchange rate used: 1 USD = 83.5 INR (May 2026 reference)

---

## 2. FABRICATION LABOR — PROTOTYPE

| Task                                  | Hours | Rate (USD/hr) | Cost USD | Cost INR |
|---------------------------------------|-------|---------------|----------|----------|
| Track cutting, drilling, bending      | 4 hrs | $20/hr        | $80      | ₹6,680   |
| PCB assembly (hand soldering, testing)| 6 hrs | $20/hr        | $120     | ₹10,020  |
| Wiring harness fabrication            | 3 hrs | $20/hr        | $60      | ₹5,010   |
| Mechanical assembly + alignment       | 10 hrs| $20/hr        | $200     | ₹16,700  |
| Spring winding / tensioning           | 2 hrs | $25/hr        | $50      | ₹4,175   |
| Electrical installation + wiring      | 4 hrs | $20/hr        | $80      | ₹6,680   |
| System commissioning + testing        | 4 hrs | $20/hr        | $80      | ₹6,680   |
| Rework / snag fixes                   | 3 hrs | $20/hr        | $60      | ₹5,010   |
| **TOTAL LABOR**                       | **36 hrs** |          | **$730** | **₹60,955** |

---

## 3. ENGINEERING & DEVELOPMENT (ONE-TIME)

| Activity                          | Hours | Rate (USD/hr) | Cost USD | Cost INR |
|-----------------------------------|-------|---------------|----------|----------|
| Mechanical design (CAD drawings)  | 20 hrs| $40/hr        | $800     | ₹66,800  |
| Track + bracket fabrication DXF   | 8 hrs | $35/hr        | $280     | ₹23,380  |
| PCB schematic + layout (KiCad)    | 15 hrs| $40/hr        | $600     | ₹50,100  |
| Firmware (ESP32 Arduino)          | 30 hrs| $45/hr        | $1,350   | ₹1,12,725|
| Mobile app (Flutter basic)        | 40 hrs| $40/hr        | $1,600   | ₹1,33,600|
| MQTT broker setup + cloud config  | 8 hrs | $35/hr        | $280     | ₹23,380  |
| Testing & validation protocol     | 10 hrs| $35/hr        | $350     | ₹29,225  |
| Documentation (this package)      | 15 hrs| $30/hr        | $450     | ₹37,575  |
| **TOTAL ENGINEERING**             | **146 hrs** |        | **$5,710** | **₹4,76,785** |

> Note: Engineering cost is one-time (amortized across production units)

---

## 4. PROTOTYPE TOTAL COST

| Element                           | USD       | INR          |
|-----------------------------------|-----------|--------------|
| Materials (BOM)                   | $1,435    | ₹1,19,882    |
| Fabrication labor                 | $730      | ₹60,955      |
| Engineering & development         | $5,710    | ₹4,76,785    |
| Tooling (jigs, fixtures, drill templates) | $200 | ₹16,700   |
| Shipping & logistics (components) | $100      | ₹8,350       |
| Contingency (10%)                 | $797      | ₹66,567      |
| **PROTOTYPE TOTAL**               | **$8,972**| **₹7,49,239**|

---

## 5. PRODUCTION COST MODEL (Volume)

Engineering cost is amortized. BOM costs reduce at volume due to MOQ discounts.

| Volume           | BOM / unit | Labor / unit | Eng (amort.) | **Unit Cost** | **Unit Cost INR** |
|------------------|------------|--------------|--------------|---------------|-------------------|
| 1 (prototype)    | $1,435     | $730         | $5,710       | $7,875        | ₹6,57,563         |
| 10 units         | $1,100     | $500         | $571         | $2,171        | ₹1,81,279         |
| 50 units         | $900       | $380         | $114         | $1,394        | ₹1,16,399         |
| 100 units        | $780       | $300         | $57          | $1,137        | ₹94,940           |
| 500 units        | $650       | $220         | $12          | $882          | ₹73,647           |

**Key volume levers:**
- Panels: sheet metal press tooling saves 30% at 100+ units
- PCB: PCBA factory assembly vs. hand-solder saves 60% on CS items
- Motor: Bulk OEM purchase from motor manufacturer
- Tracks: In-house roll-forming line at 1,000+ units

---

## 6. SUGGESTED RETAIL PRICE (SRP) ANALYSIS

| Segment               | Unit Cost | Target Margin | SRP (USD) | SRP (INR) |
|-----------------------|-----------|---------------|-----------|-----------|
| Prototype sell-through| $7,875    | –             | $9,500    | ₹7,93,250 |
| Small batch (10 units)| $2,171    | 40%           | $3,618    | ₹3,02,103 |
| Mid-volume (100 units)| $1,137    | 50%           | $2,274    | ₹1,89,879 |
| Mass production       | $882      | 55%           | $1,960    | ₹1,63,660 |

> Comparable market products (Hörmann, LiftMaster sectional door + operator): $1,500–$3,500 USD installed.

---

## 7. COST REDUCTION ROADMAP (Post-MVP)

| Action                                  | Savings Estimate  | Timeline    |
|-----------------------------------------|-------------------|-------------|
| Panel buy from local Indian OEM vs. import | $120/unit     | Immediate   |
| Replace BLDC with PSC AC motor          | $30/unit          | Prototype   |
| PCB PCBA at factory (10-up) vs. hand    | $80/unit          | 10+ units   |
| In-house track bending jig              | $40/unit labor    | 20+ units   |
| Rolling code IC replaced with ESP32 RMT | $6/unit           | Firmware    |
| Dual-source spring supplier (India)     | $15/unit          | 50+ units   |
| Die-cast trolley replaced with machined | +$25 (quality)    | 20+ units   |

---

## 8. CAPEX — TOOLING & EQUIPMENT (FOR SMALL PRODUCTION)

| Equipment / Tooling               | Est. Cost USD | Est. Cost INR | Notes                  |
|-----------------------------------|---------------|---------------|------------------------|
| Press brake (or outsource)        | $0 (outsource)| ₹0            | Outsource for <50 units|
| Track drilling jig                | $200          | ₹16,700       | Simple steel jig       |
| Panel assembly jig                | $300          | ₹25,050       | Hold panels for glue   |
| PCB test fixture                  | $150          | ₹12,525       | Bed-of-nails or pogo   |
| Spring winding tool               | $80           | ₹6,680        | Torque wrench + socket |
| Basic workbench + hand tools      | $500          | ₹41,750       | One-time setup         |
| **Total Capex (small setup)**     | **$1,230**    | **₹1,02,705** |                        |

---

*Document GD-CA-001 Rev A — SmartLift Pro — Prototype Phase*
