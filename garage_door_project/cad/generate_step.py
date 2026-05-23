"""
SmartLift Pro — 3D STEP File Generator
Uses CadQuery to create parametric 3D models and export as STEP files.
STEP files open directly in SolidWorks (File > Open) and AutoCAD (Insert > Import).

Run:  python3 generate_step.py
Output: ./step/*.step
"""

import cadquery as cq
import os

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "step")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def save(shape, filename):
    path = os.path.join(OUTPUT_DIR, filename)
    cq.exporters.export(shape, path)
    size = os.path.getsize(path)
    print(f"  {filename}  ({size:,} bytes)")


# ═════════════════════════════════════════════════════════════════════════════
# PART 1 — DOOR PANEL  (GD-DP-001)
# 2540 × 533 × 40mm insulated sandwich panel
# Modelled as solid with tongue on top edge, groove on bottom edge
# ═════════════════════════════════════════════════════════════════════════════

def make_panel():
    W, H, T = 2540, 533, 40        # overall dims
    TONGUE_W, TONGUE_H = 10, 8     # tongue protrusion on top
    GROOVE_W, GROOVE_H = 12, 10    # groove on bottom

    # Main body
    panel = (
        cq.Workplane("XY")
        .box(W, T, H)
    )

    # Tongue on top edge (protrudes +Z)
    tongue = (
        cq.Workplane("XY")
        .box(W, TONGUE_W, TONGUE_H)
        .translate((0, 0, H/2 + TONGUE_H/2))
    )

    # Groove on bottom edge (cut into body)
    groove_cut = (
        cq.Workplane("XY")
        .box(W, GROOVE_W, GROOVE_H)
        .translate((0, 0, -H/2 + GROOVE_H/2))
    )

    result = panel.union(tongue).cut(groove_cut)
    return result


# ═════════════════════════════════════════════════════════════════════════════
# PART 2 — VERTICAL TRACK  (GD-TR-001)
# 76 × 32 × 3mm C-channel, 2285mm long, HDG steel
# Roller slots at 266, 799, 1332, 1865mm from bottom
# Wall bolt holes at 600, 1200, 1800mm
# ═════════════════════════════════════════════════════════════════════════════

def make_vertical_track():
    L  = 2285   # length (Z)
    W  = 76     # back-plate width (X)
    D  = 32     # flange depth (Y)
    T  = 3      # wall thickness

    SLOT_W, SLOT_H = 12, 25        # roller slots
    BOLT_D = 9                      # M8 clearance holes

    slot_z  = [266, 799, 1332, 1865]
    bolt_z  = [600, 1200, 1800]

    # C-channel cross-section profile (in XY plane, extrude along Z)
    profile = (
        cq.Workplane("XY")
        .polyline([
            (0,   0),
            (W,   0),
            (W,   T),
            (T,   T),
            (T,   D-T),
            (W,   D-T),
            (W,   D),
            (0,   D),
        ])
        .close()
    )

    track = profile.extrude(L)

    # Roller slots (in back-plate face: Y=0 plane, elongated hole)
    for sz in slot_z:
        track = (
            track
            .faces("<Y")
            .workplane()
            .center(W/2, sz)
            .slot2D(SLOT_H, SLOT_W, 90)
            .cutThruAll()
        )

    # Wall bracket bolt holes (through back plate + flanges)
    for bz in bolt_z:
        track = (
            track
            .faces("<Y")
            .workplane()
            .center(W/2, bz)
            .circle(BOLT_D / 2)
            .cutThruAll()
        )

    return track


# ═════════════════════════════════════════════════════════════════════════════
# PART 3 — HORIZONTAL TRACK  (GD-TR-002)
# Same C-channel profile as vertical, 2435mm long
# ═════════════════════════════════════════════════════════════════════════════

def make_horizontal_track():
    L  = 2435
    W  = 76
    D  = 32
    T  = 3
    BOLT_D = 9
    bolt_positions = [200, 800, 1400, 2200]

    profile = (
        cq.Workplane("XY")
        .polyline([
            (0, 0), (W, 0), (W, T),
            (T, T), (T, D-T), (W, D-T),
            (W, D), (0, D),
        ])
        .close()
    )
    track = profile.extrude(L)

    for bz in bolt_positions:
        track = (
            track
            .faces("<Y")
            .workplane()
            .center(W/2, bz)
            .circle(BOLT_D / 2)
            .cutThruAll()
        )
    return track


# ═════════════════════════════════════════════════════════════════════════════
# PART 4 — CENTER / HEADER BRACKET  (GD-SP-006)
# 150 × 120 × 4mm flat plate, HDG steel
# Ø26.5 spring tube clearance, Ø52 H7 bearing pocket (depth 18mm)
# 4× Ø11mm lag bolt holes
# ═════════════════════════════════════════════════════════════════════════════

def make_center_bracket():
    BW, BH, BT = 150, 120, 4
    TUBE_D  = 26.5      # spring tube clearance
    BEAR_D  = 52.0      # 6205-2RS bearing OD
    BEAR_DP = 18.0      # bearing pocket depth
    LAG_D   = 11.0      # M10 lag bolt hole

    # centre of spring tube hole: 45mm from bottom, centred L/R
    cy = -BH/2 + 45     # in local coords (origin at centroid)

    plate = (
        cq.Workplane("XY")
        .box(BW, BH, BT)
    )

    # Spring tube clearance (through)
    plate = (
        plate
        .faces(">Z")
        .workplane()
        .center(0, cy)
        .circle(TUBE_D / 2)
        .cutThruAll()
    )

    # Bearing pocket (blind, from top face, depth 18mm into 4mm plate → through)
    # Pocket is larger than tube hole, centred same
    plate = (
        plate
        .faces(">Z")
        .workplane()
        .center(0, cy)
        .circle(BEAR_D / 2)
        .cutBlind(-BT)    # full depth (pocket is same as plate thickness here)
    )

    # 4× lag bolt holes: (±50, top_y-20) and (±50, top_y-50)
    top_y = BH/2
    lag_positions = [
        (-50,  top_y - 20),
        ( 50,  top_y - 20),
        (-50,  top_y - 50),
        ( 50,  top_y - 50),
    ]
    for lx, ly in lag_positions:
        plate = (
            plate
            .faces(">Z")
            .workplane()
            .center(lx, ly)
            .circle(LAG_D / 2)
            .cutThruAll()
        )

    return plate


# ═════════════════════════════════════════════════════════════════════════════
# PART 5 — WALL ANGLE BRACKET  (GD-TR-004)
# 150 × 100 × 3mm, L-shaped, HDG steel
# 3× Ø9 wall holes, 2× Ø9 track holes, 9×20mm adjustment slot
# ═════════════════════════════════════════════════════════════════════════════

def make_wall_bracket():
    LEG_A = 50      # wall leg (vertical, mounted to wall)
    LEG_B = 100     # track leg (horizontal, holds track)
    HEIGHT = 100    # bracket height
    T = 3           # plate thickness
    BOLT_D = 9      # M8 hole diameter
    SLOT_W = 9
    SLOT_L = 20

    # Two flat plates joined at right angle (L-bracket)
    wall_leg  = cq.Workplane("XY").box(T, HEIGHT, LEG_A).translate((0, 0, LEG_A/2))
    track_leg = cq.Workplane("XY").box(LEG_B, HEIGHT, T).translate((T/2 + LEG_B/2, 0, T/2))
    bracket   = wall_leg.union(track_leg)

    # 3× M8 bolt holes through wall leg (X direction)
    for hy in [-HEIGHT/2 + 20, 0, HEIGHT/2 - 20]:
        cyl = (cq.Workplane("YZ")
               .center(hy, LEG_A/2)
               .circle(BOLT_D/2)
               .extrude(T + 2)
               .translate((-1, 0, 0)))
        bracket = bracket.cut(cyl)

    # 2× M8 bolt holes through track leg (Z direction)
    for tx in [T + 25, T + 75]:
        cyl = (cq.Workplane("XY")
               .center(tx, 0)
               .circle(BOLT_D/2)
               .extrude(T + 2)
               .translate((0, 0, -1)))
        bracket = bracket.cut(cyl)

    # Adjustment slot in track leg (elongated hole, Z direction)
    slot_box = (cq.Workplane("XY")
                .center(T + LEG_B - 25, 0)
                .rect(SLOT_L, SLOT_W)
                .extrude(T + 2)
                .translate((0, 0, -1)))
    bracket = bracket.cut(slot_box)

    return bracket


# ═════════════════════════════════════════════════════════════════════════════
# PART 6 — SPRING TUBE  (GD-SP-003)
# 25.4mm OD × 2.5mm wall × 1600mm long ERW steel tube
# ═════════════════════════════════════════════════════════════════════════════

def make_spring_tube():
    OD = 25.4
    ID = OD - 2 * 2.5   # = 20.4mm ID
    L  = 1600

    tube = (
        cq.Workplane("XY")
        .circle(OD / 2)
        .circle(ID / 2)
        .extrude(L)
    )
    return tube


# ═════════════════════════════════════════════════════════════════════════════
# PART 7 — BOTTOM ASTRAGAL  (GD-DP-002)
# Extruded Al 6063-T5, 2540mm long, 20×60mm section
# Slot for EPDM D-section seal, screw holes at 300mm c/c
# ═════════════════════════════════════════════════════════════════════════════

def make_astragal():
    L  = 2540
    W  = 60     # width (horizontal)
    H  = 20     # height (vertical)
    T  = 2      # wall thickness
    SEAL_W, SEAL_H = 12, 10    # EPDM slot
    SCREW_D = 4.5              # M4 screw holes

    # U-channel profile with seal slot
    profile = (
        cq.Workplane("XY")
        .polyline([
            (0, 0), (W, 0), (W, H),
            (W - T, H), (W - T, T),
            (T, T), (T, H), (0, H),
        ])
        .close()
    )

    astragal = profile.extrude(L)

    # Seal slot (centred, open at bottom)
    seal_x = W/2 - SEAL_W/2
    astragal = (
        astragal
        .faces("<Z")
        .workplane()
        .rect(SEAL_W, L, centered=True)
        .cutBlind(-SEAL_H)
    )

    # Screw holes every 300mm along length
    n_holes = int(L / 300)
    for i in range(n_holes):
        hz = 150 + i * 300
        astragal = (
            astragal
            .faces(">Y")
            .workplane()
            .center(0, hz - L/2)
            .circle(SCREW_D / 2)
            .cutThruAll()
        )

    return astragal


# ═════════════════════════════════════════════════════════════════════════════
# PART 8 — SECTION HINGE  (GD-HN-001)
# 150mm wide, 14ga (2mm) stamped steel, zinc-plated
# ═════════════════════════════════════════════════════════════════════════════

def make_section_hinge():
    W  = 150    # total width across both leaves
    H  = 75     # leaf height
    T  = 2      # 14ga = 2mm
    PIN_D = 8   # hinge pin diameter
    HOLE_D = 5  # bolt hole diameter

    leaf_w = W/2 - PIN_D/2

    # Left leaf
    left = cq.Workplane("XY").box(leaf_w, H, T).translate((-leaf_w/2 - PIN_D/2, 0, 0))
    # Right leaf
    right = cq.Workplane("XY").box(leaf_w, H, T).translate((leaf_w/2 + PIN_D/2, 0, 0))
    # Knuckle (cylindrical pin barrel, upright along Y)
    knuckle = cq.Workplane("XZ").circle(PIN_D/2).extrude(H).translate((0, -H/2, T/2))

    hinge = left.union(right).union(knuckle)

    # Bolt holes — cut cylinders directly (avoid face-selection issues)
    for leaf_x in [-leaf_w/2 - PIN_D/2, leaf_w/2 + PIN_D/2]:
        for hy in [-H/2 + 15, 0, H/2 - 15]:
            cyl = (cq.Workplane("XY")
                   .center(leaf_x, hy)
                   .circle(HOLE_D/2)
                   .extrude(T + 2)
                   .translate((0, 0, -1)))
            hinge = hinge.cut(cyl)

    return hinge


# ═════════════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("SmartLift Pro — Generating STEP files (CadQuery)...\n")

    parts = [
        ("GD-DP-001_Panel_2540x533x40mm.step",      make_panel),
        ("GD-TR-001_Vertical_Track_2285mm.step",     make_vertical_track),
        ("GD-TR-002_Horizontal_Track_2435mm.step",   make_horizontal_track),
        ("GD-SP-006_Center_Bracket_150x120x4mm.step",make_center_bracket),
        ("GD-TR-004_Wall_Bracket_L150x100x3mm.step", make_wall_bracket),
        ("GD-SP-003_Spring_Tube_25.4OD_1600mm.step", make_spring_tube),
        ("GD-DP-002_Bottom_Astragal_2540mm.step",    make_astragal),
        ("GD-HN-001_Section_Hinge_150mm.step",       make_section_hinge),
    ]

    errors = []
    for filename, make_fn in parts:
        try:
            shape = make_fn()
            save(shape, filename)
        except Exception as e:
            print(f"  ERROR — {filename}: {e}")
            errors.append((filename, str(e)))

    print(f"\n{'─'*55}")
    print(f"Generated {len(parts) - len(errors)}/{len(parts)} STEP files")
    print(f"Output folder: {OUTPUT_DIR}")
    if errors:
        print("\nErrors (review geometry):")
        for fn, err in errors:
            print(f"  {fn}: {err}")
    print("\nOpen STEP files in SolidWorks: File > Open > select .step")
    print("Open STEP files in AutoCAD:    Insert > Import > ACIS/STEP")
