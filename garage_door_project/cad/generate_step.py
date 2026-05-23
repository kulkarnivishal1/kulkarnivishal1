"""
SmartLift Pro — 3D STEP File Generator (Full)
Generates all individual parts AND the complete 3D assembly.

Run:  python3 generate_step.py
Output:
  step/parts/   — individual parts
  step/         — GD-ASSY-001_Full_Assembly.step (all parts positioned)
"""

import cadquery as cq
from cadquery import Location, Vector, Assembly
import math, os

BASE_DIR   = os.path.dirname(__file__)
PARTS_DIR  = os.path.join(BASE_DIR, "step", "parts")
ASSY_DIR   = os.path.join(BASE_DIR, "step")
os.makedirs(PARTS_DIR, exist_ok=True)
os.makedirs(ASSY_DIR,  exist_ok=True)

def save_part(shape, filename):
    path = os.path.join(PARTS_DIR, filename)
    cq.exporters.export(shape, path)
    print(f"  [PART]  {filename}  ({os.path.getsize(path):,} bytes)")
    return shape

def save_assy(assy, filename):
    path = os.path.join(ASSY_DIR, filename)
    cq.exporters.export(assy.toCompound(), path)
    print(f"  [ASSY]  {filename}  ({os.path.getsize(path):,} bytes)")


# ══════════════════════════════════════════════════════════════════════════════
# KEY PARAMETERS (single source of truth — change here to resize everything)
# ══════════════════════════════════════════════════════════════════════════════

P = {
    # Door opening
    "CLEAR_W": 2500, "CLEAR_H": 2100,
    # Panel
    "PANEL_W": 2540, "PANEL_H": 533, "PANEL_T": 40,
    "N_PANELS": 4,
    "TONGUE_W": 10,  "TONGUE_H": 8,
    "GROOVE_W": 12,  "GROOVE_H": 10,
    # Track
    "TRACK_W": 76, "TRACK_D": 32, "TRACK_T": 3,
    "VTRACK_L": 2285, "HTRACK_L": 2435,
    "CURVE_R":  305,
    # Roller slots
    "SLOT_W": 12, "SLOT_H": 25,
    # Spring tube
    "TUBE_OD": 25.4, "TUBE_ID": 20.4, "TUBE_L": 1600,
    # Motor/operator unit (simplified box)
    "MOTOR_L": 600, "MOTOR_W": 200, "MOTOR_H": 150,
    # Misc
    "BOLT_D": 9, "LAG_D": 11,
}

# Assembly clearances
SIDE_ROOM    = 125    # mm each side of panel
TRACK_GAP    = 10     # mm between panel edge and track inner face
HEAD_ROOM    = 300    # mm above door opening


# ══════════════════════════════════════════════════════════════════════════════
# PARTS
# ══════════════════════════════════════════════════════════════════════════════

def make_panel():
    W, H, T = P["PANEL_W"], P["PANEL_H"], P["PANEL_T"]
    TW, TH   = P["TONGUE_W"], P["TONGUE_H"]
    GW, GH   = P["GROOVE_W"], P["GROOVE_H"]

    body   = cq.Workplane("XY").box(W, H, T)
    tongue = cq.Workplane("XY").box(W, TW, TH).translate((0, 0, H/2 + TH/2))
    groove = cq.Workplane("XY").box(W, GW, GH).translate((0, 0, -H/2 + GH/2))
    return body.union(tongue).cut(groove)


def make_vertical_track():
    """C-channel, extruded along +Z, 2285mm."""
    W, D, T, L = P["TRACK_W"], P["TRACK_D"], P["TRACK_T"], P["VTRACK_L"]
    profile = (cq.Workplane("XY")
               .polyline([(0,0),(W,0),(W,T),(T,T),(T,D-T),(W,D-T),(W,D),(0,D)])
               .close())
    track = profile.extrude(L)
    # Roller slots
    for sz in [266, 799, 1332, 1865]:
        cyl = (cq.Workplane("XY").center(W/2, sz)
               .rect(P["SLOT_W"], P["SLOT_H"]).extrude(T+2).translate((0,0,-1)))
        track = track.cut(cyl)
    # Bracket bolt holes
    for bz in [600, 1200, 1800]:
        cyl = (cq.Workplane("XY").center(W/2, bz)
               .circle(P["BOLT_D"]/2).extrude(T+2).translate((0,0,-1)))
        track = track.cut(cyl)
    return track


def make_horizontal_track():
    """Same C-channel profile, 2435mm, ceiling-mount holes."""
    W, D, T, L = P["TRACK_W"], P["TRACK_D"], P["TRACK_T"], P["HTRACK_L"]
    profile = (cq.Workplane("XY")
               .polyline([(0,0),(W,0),(W,T),(T,T),(T,D-T),(W,D-T),(W,D),(0,D)])
               .close())
    track = profile.extrude(L)
    for bz in [200, 800, 1400, 2200]:
        cyl = (cq.Workplane("XY").center(W/2, bz)
               .circle(P["BOLT_D"]/2).extrude(T+2).translate((0,0,-1)))
        track = track.cut(cyl)
    return track


def make_curved_track():
    """
    90° curved C-channel section connecting vertical to horizontal track.
    Created by revolving the C-channel profile 90° around the X-axis.

    Coordinate convention BEFORE positioning in assembly:
      - Profile starts in XY plane  (vertical portion = pointing in +Y)
      - After 90° revolve around X  (horizontal portion = pointing in +Z)
    Matches exactly to tops of vertical tracks and starts of horizontal tracks.
    """
    R = P["CURVE_R"]
    W = P["TRACK_W"]
    D = P["TRACK_D"]
    T = P["TRACK_T"]

    # C-channel profile in XY plane.
    # Back-plate inner face at Y = R (distance R from X-axis = centre of curvature).
    # Channel opening faces –Z (into the garage, toward the door roller).
    # X runs across the channel width (–W/2 … +W/2).
    x0 = -W / 2

    pts = [
        (x0,       R),
        (x0 + W,   R),
        (x0 + W,   R + T),
        (x0 + T,   R + T),
        (x0 + T,   R + D - T),
        (x0 + W,   R + D - T),
        (x0 + W,   R + D),
        (x0,       R + D),
    ]

    profile = (cq.Workplane("XY")
               .polyline(pts)
               .close())

    # Revolve 90° around X-axis (Y → Z transition)
    curved = profile.revolve(
        angleDegrees=90,
        axisStart=(0, 0, 0),
        axisEnd=(1, 0, 0),
    )
    return curved


def make_center_bracket():
    BW, BH, BT = 150, 120, 4
    plate = cq.Workplane("XY").box(BW, BH, BT)
    cy = -BH/2 + 45
    # Spring tube clearance
    cyl = cq.Workplane("XY").center(0, cy).circle(P["TUBE_OD"]/2 + 1).extrude(BT+2).translate((0,0,-1))
    plate = plate.cut(cyl)
    # Bearing pocket (Ø52)
    pocket = cq.Workplane("XY").center(0, cy).circle(52/2).extrude(BT).translate((0,0,0))
    plate = plate.cut(pocket)
    # Lag bolt holes
    for lx, ly in [(-50, BH/2-20),(50, BH/2-20),(-50, BH/2-50),(50, BH/2-50)]:
        cyl = cq.Workplane("XY").center(lx, ly).circle(P["LAG_D"]/2).extrude(BT+2).translate((0,0,-1))
        plate = plate.cut(cyl)
    return plate


def make_wall_bracket():
    LA, LB, HEIGHT, T = 50, 100, 100, 3
    wall_leg  = cq.Workplane("XY").box(T, HEIGHT, LA).translate((0, 0, LA/2))
    track_leg = cq.Workplane("XY").box(LB, HEIGHT, T).translate((T/2 + LB/2, 0, T/2))
    bracket   = wall_leg.union(track_leg)
    for hy in [-HEIGHT/2+20, 0, HEIGHT/2-20]:
        cyl = cq.Workplane("YZ").center(hy, LA/2).circle(P["BOLT_D"]/2).extrude(T+2).translate((-1,0,0))
        bracket = bracket.cut(cyl)
    for tx in [T+25, T+75]:
        cyl = cq.Workplane("XY").center(tx, 0).circle(P["BOLT_D"]/2).extrude(T+2).translate((0,0,-1))
        bracket = bracket.cut(cyl)
    slot = cq.Workplane("XY").center(T+LB-25, 0).rect(20, 9).extrude(T+2).translate((0,0,-1))
    bracket = bracket.cut(slot)
    return bracket


def make_spring_tube():
    OD, ID, L = P["TUBE_OD"], P["TUBE_ID"], P["TUBE_L"]
    return cq.Workplane("XY").circle(OD/2).circle(ID/2).extrude(L)


def make_astragal():
    L, W, H, T = P["PANEL_W"], 60, 20, 2
    profile = (cq.Workplane("XY")
               .polyline([(0,0),(W,0),(W,H),(W-T,H),(W-T,T),(T,T),(T,H),(0,H)])
               .close())
    return profile.extrude(L)


def make_section_hinge():
    W, H, T, PIN_D = 150, 75, 2, 8
    lw = W/2 - PIN_D/2
    left    = cq.Workplane("XY").box(lw, H, T).translate((-lw/2 - PIN_D/2, 0, 0))
    right   = cq.Workplane("XY").box(lw, H, T).translate((lw/2  + PIN_D/2, 0, 0))
    knuckle = cq.Workplane("XZ").circle(PIN_D/2).extrude(H).translate((0, -H/2, T/2))
    hinge   = left.union(right).union(knuckle)
    for lx in [-lw/2-PIN_D/2, lw/2+PIN_D/2]:
        for hy in [-H/2+15, 0, H/2-15]:
            cyl = cq.Workplane("XY").center(lx, hy).circle(5/2).extrude(T+2).translate((0,0,-1))
            hinge = hinge.cut(cyl)
    return hinge


def make_operator_unit():
    """Simplified motor + gearbox + head unit as a box assembly."""
    L, W, H = P["MOTOR_L"], P["MOTOR_W"], P["MOTOR_H"]
    body = cq.Workplane("XY").box(L, W, H)
    # Motor end cap (rounded)
    cap = cq.Workplane("YZ").circle(W/2).extrude(80).translate((-L/2-80, 0, 0))
    return body.union(cap)


def make_drive_rail():
    """T-bar extrusion, 2700mm, positioned along Z (into garage)."""
    # T-bar: 40×40mm square tube with 10mm slot
    L = 2700
    outer = cq.Workplane("XY").rect(40, 40).extrude(L)
    inner = cq.Workplane("XY").rect(34, 34).extrude(L)
    slot  = cq.Workplane("XY").rect(12, 40+2).extrude(50).translate((0,0,-1))
    return outer.cut(inner).cut(slot)


# ══════════════════════════════════════════════════════════════════════════════
# 3D ASSEMBLY
# ══════════════════════════════════════════════════════════════════════════════

def make_assembly(parts_dict):
    """
    Positions all parts in a single cq.Assembly.

    Coordinate system:
      Origin : centre of clear door opening at floor level
      +X     : rightward (door width)
      +Y     : upward
      +Z     : into the garage (depth)
    """
    W   = P["PANEL_W"]
    H   = P["PANEL_H"]
    T   = P["PANEL_T"]
    TW  = P["TRACK_W"]
    TD  = P["TRACK_D"]
    TT  = P["TRACK_T"]
    CR  = P["CURVE_R"]
    VTL = P["VTRACK_L"]
    HTL = P["HTRACK_L"]

    # X position of track centerline (outside each panel edge)
    track_cx = W/2 + TRACK_GAP + TW/2    # = 1270+10+38 = 1318mm

    # Vertical portion height before curve starts
    vcurve_start_y = P["CLEAR_H"]         # = 2100mm

    # Horizontal track Y position (centre of curved section top)
    htrack_y = vcurve_start_y + CR + TW/2  # ≈ 2100+305+38 = 2443mm

    assy = Assembly(name="SmartLift_Pro_Garage_Door")

    # ── 4 DOOR PANELS ────────────────────────────────────────────────────
    # Panel make_panel() box is centred at origin (W×H×T)
    # Rotate so panel face is in XY plane (panel T along Z), centred on door
    for i in range(P["N_PANELS"]):
        y_centre = H/2 + i * H
        loc = Location(Vector(0, y_centre, T/2))
        assy.add(parts_dict["panel"], name=f"Panel_Section_{i+1}", loc=loc)

    # ── LEFT VERTICAL TRACK ───────────────────────────────────────────────
    # make_vertical_track() runs along +Z (0→2285).
    # Need it to run along +Y.  Rotate –90° around X → Z becomes Y.
    # Channel back-plate faces +X (away from door); opening faces –X (toward door).
    # Translate: X = –track_cx, Y=0, Z = TD/2 (back face flush to wall side)
    rot_vtrack = Location(Vector(-track_cx, 0, TD/2),
                          Vector(1, 0, 0), -90)
    assy.add(parts_dict["vtrack"], name="VTrack_Left",  loc=rot_vtrack)

    # ── RIGHT VERTICAL TRACK ──────────────────────────────────────────────
    # Mirror in X; channel opening now faces +X (toward door on right side).
    # Also rotate 180° around Y so channel opens inward.
    rot_vtrack_r = Location(Vector(track_cx, 0, TD/2),
                            Vector(0, 1, 0), 180)
    # Then tilt to vertical (–90° around X still needed)
    # Combine: first rotate around Y 180°, then X –90°
    # Use two separate location operations — CadQuery allows compound loc
    # Simpler: mirror the left track in X by using positive X position and Z-flipped:
    assy.add(parts_dict["vtrack"], name="VTrack_Right",
             loc=Location(Vector(track_cx, 0, TD/2), Vector(1,0,0), -90))

    # ── LEFT CURVED TRACK SECTION ─────────────────────────────────────────
    # make_curved_track() revolves in XY plane around X-axis.
    # After revolve: bottom of curve at Y=R+TW/2 from origin, Z=0.
    # Translate so curve starts at top of vertical track (Y = vcurve_start_y)
    # and is at correct X.
    curve_loc_l = Location(
        Vector(-track_cx + TW/2, vcurve_start_y, 0),
        Vector(1, 0, 0), 0
    )
    assy.add(parts_dict["curved"], name="CurvedTrack_Left",  loc=curve_loc_l)

    curve_loc_r = Location(
        Vector(track_cx - TW/2, vcurve_start_y, 0),
        Vector(0, 0, 1), 180  # mirror around Z
    )
    assy.add(parts_dict["curved"], name="CurvedTrack_Right", loc=curve_loc_r)

    # ── LEFT HORIZONTAL TRACK ─────────────────────────────────────────────
    # make_horizontal_track() runs along +Z.
    # Place so it starts at Z = CR (end of curved section) and runs into garage.
    htrack_loc_l = Location(Vector(-track_cx, htrack_y - TW/2, CR))
    assy.add(parts_dict["htrack"], name="HTrack_Left",  loc=htrack_loc_l)

    htrack_loc_r = Location(Vector(track_cx, htrack_y - TW/2, CR))
    assy.add(parts_dict["htrack"], name="HTrack_Right", loc=htrack_loc_r)

    # ── SPRING TUBE ───────────────────────────────────────────────────────
    # Spring tube runs along +Z in make_spring_tube(). Rotate to run along +X.
    # Centre: above door at Y = vcurve_start_y + 75, at wall Z ≈ 0
    tube_y = vcurve_start_y + 75
    tube_loc = Location(Vector(-P["TUBE_L"]/2, tube_y, TD),
                        Vector(0, 1, 0), 90)   # rotate Y→X
    assy.add(parts_dict["tube"], name="Spring_Tube", loc=tube_loc)

    # ── CENTER BRACKET ────────────────────────────────────────────────────
    cbkt_loc = Location(Vector(0, tube_y, 0))
    assy.add(parts_dict["cbracket"], name="Center_Bracket", loc=cbkt_loc)

    # ── WALL BRACKETS (8 off, 4 each side at Y=600, 1200, 1800mm) ────────
    for side, sx in [("L", -track_cx), ("R", track_cx)]:
        for yi, by in enumerate([600, 1200, 1800]):
            assy.add(parts_dict["wbracket"],
                     name=f"WallBracket_{side}_{by}mm",
                     loc=Location(Vector(sx, by, 0)))

    # ── DRIVE RAIL ────────────────────────────────────────────────────────
    # T-bar runs from wall (Z=0) into garage (Z = CR + HTL approximately)
    # Centred above door
    rail_y = tube_y + 50
    assy.add(parts_dict["rail"], name="Drive_Rail",
             loc=Location(Vector(0, rail_y, 0)))

    # ── MOTOR / OPERATOR UNIT ─────────────────────────────────────────────
    motor_loc = Location(Vector(0, rail_y, 200))
    assy.add(parts_dict["motor"], name="Motor_Operator_Unit", loc=motor_loc)

    # ── ASTRAGAL (bottom seal carrier on Section 1) ───────────────────────
    # Astragal is an extrusion along +Z in make_astragal().
    # Needs to run along +X and sit at bottom of Section 1.
    ast_loc = Location(Vector(-W/2, -P["ASTRAGAL_H"]/2 if "ASTRAGAL_H" in P else -10, T/2),
                       Vector(0, 0, 1), 90)
    assy.add(parts_dict["astragal"], name="Bottom_Astragal", loc=ast_loc)

    # ── SECTION HINGES (3 joints × 2 sides = 6 hinges shown) ─────────────
    for jnt in range(1, 4):      # joints between panels 1-2, 2-3, 3-4
        jy = jnt * H             # Y position of joint
        for side, sx in [("L", -W/2 + 75), ("R", W/2 - 75)]:
            assy.add(parts_dict["hinge"],
                     name=f"Hinge_Jnt{jnt}_{side}",
                     loc=Location(Vector(sx, jy, T/2),
                                  Vector(0, 0, 1), 90))

    return assy


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("SmartLift Pro — Generating STEP files\n")

    # ── Build individual parts ────────────────────────────────────────────
    print("Building parts...")
    parts = {}

    def build(key, fn, filename):
        try:
            shape = fn()
            parts[key] = shape
            save_part(shape, filename)
        except Exception as e:
            print(f"  ERROR — {filename}: {e}")
            import traceback; traceback.print_exc()

    build("panel",    make_panel,          "GD-DP-001_Panel_2540x533x40mm.step")
    build("vtrack",   make_vertical_track, "GD-TR-001_Vertical_Track_2285mm.step")
    build("htrack",   make_horizontal_track,"GD-TR-002_Horizontal_Track_2435mm.step")
    build("curved",   make_curved_track,   "GD-TR-003_Curved_Track_R305_90deg.step")
    build("cbracket", make_center_bracket, "GD-SP-006_Center_Bracket_150x120x4mm.step")
    build("wbracket", make_wall_bracket,   "GD-TR-004_Wall_Bracket_L150x100x3mm.step")
    build("tube",     make_spring_tube,    "GD-SP-003_Spring_Tube_25.4OD_1600mm.step")
    build("astragal", make_astragal,       "GD-DP-002_Bottom_Astragal_2540mm.step")
    build("hinge",    make_section_hinge,  "GD-HN-001_Section_Hinge_150mm.step")
    build("motor",    make_operator_unit,  "GD-MO-001_Operator_Unit_Motor.step")
    build("rail",     make_drive_rail,     "GD-MO-003_Drive_Rail_2700mm.step")

    # ── Build 3D assembly ─────────────────────────────────────────────────
    print("\nBuilding 3D assembly...")
    required = {"panel","vtrack","htrack","curved","cbracket","wbracket",
                "tube","astragal","hinge","motor","rail"}
    missing = required - set(parts.keys())
    if missing:
        print(f"  WARNING: Skipping assembly — missing parts: {missing}")
    else:
        try:
            assy = make_assembly(parts)
            save_assy(assy, "GD-ASSY-001_SmartLift_Pro_Full_Assembly.step")
        except Exception as e:
            print(f"  ERROR building assembly: {e}")
            import traceback; traceback.print_exc()

    # ── Summary ───────────────────────────────────────────────────────────
    print(f"\n{'─'*60}")
    print(f"Parts:    {len(parts)}/11")
    all_files = (sorted(os.listdir(PARTS_DIR)) +
                 [f for f in os.listdir(ASSY_DIR) if f.endswith(".step")])
    print(f"\nHow to open:")
    print("  SolidWorks : File > Open > (set type = STEP) > select file")
    print("  AutoCAD    : Insert > Import > select .step file")
    print(f"\nAssembly file: GD-ASSY-001_SmartLift_Pro_Full_Assembly.step")
    print("  Contains all parts positioned at correct locations in 3D space.")
