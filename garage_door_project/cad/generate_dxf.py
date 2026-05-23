"""
SmartLift Pro — Garage Door DXF Generator
Generates all production-ready AutoCAD DXF drawings for the SmartLift Pro
sectional overhead garage door project.

Run:  python3 generate_dxf.py
Output: ./dxf/*.dxf  (open directly in AutoCAD 2018+)
"""

import ezdxf
from ezdxf import units
from ezdxf.enums import TextEntityAlignment
import math
import os

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "dxf")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── Shared helpers ────────────────────────────────────────────────────────────

def new_doc(title):
    doc = ezdxf.new("R2018", setup=True)
    doc.units = units.MM
    doc.header["$INSUNITS"] = 4  # mm
    msp = doc.modelspace()

    # Layers
    doc.layers.add("OUTLINE",    color=7)   # white/black
    doc.layers.add("HIDDEN",     color=3,  linetype="DASHED")
    doc.layers.add("CENTER",     color=1,  linetype="CENTER")
    doc.layers.add("DIM",        color=2)
    doc.layers.add("HATCH",      color=8)
    doc.layers.add("TITLE",      color=6)
    doc.layers.add("NOTES",      color=3)
    doc.layers.add("ANNOTATION", color=5)

    # Dimension style
    dimstyle = doc.dimstyles.get("Standard")
    dimstyle.dxf.dimtxt  = 3.5
    dimstyle.dxf.dimasz  = 3.0
    dimstyle.dxf.dimexo  = 1.5
    dimstyle.dxf.dimexe  = 2.5
    dimstyle.dxf.dimgap  = 1.0

    return doc, msp


def title_block(msp, dwg_no, title, scale, rev="A", sheet="1/1"):
    """ISO A1 title block at origin (841 × 594mm border)"""
    # Border
    msp.add_lwpolyline(
        [(0,0),(841,0),(841,594),(0,594),(0,0)],
        dxfattribs={"layer":"TITLE", "lineweight":50}
    )
    # Inner border
    msp.add_lwpolyline(
        [(10,10),(831,10),(831,584),(10,584),(10,10)],
        dxfattribs={"layer":"TITLE", "lineweight":25}
    )
    # Title box (bottom right)
    bx, by = 531, 10
    for y in [10,30,50,70,90]:
        msp.add_line((bx,y),(831,y), dxfattribs={"layer":"TITLE"})
    msp.add_line((bx,10),(bx,90),  dxfattribs={"layer":"TITLE"})
    msp.add_line((681,10),(681,90), dxfattribs={"layer":"TITLE"})

    def tb(txt, x, y, h=3.5, align=TextEntityAlignment.MIDDLE_LEFT):
        msp.add_text(txt, dxfattribs={"layer":"TITLE","height":h}).set_placement(
            (x,y), align=align)

    tb("SmartLift Pro — Motorized Sectional Garage Door", 535, 82, h=3.5)
    tb(title, 535, 65, h=5.0)
    tb(f"DWG No: {dwg_no}", 535, 48, h=3.5)
    tb(f"Scale: {scale}",   535, 33, h=3.5)
    tb(f"Rev: {rev}",       535, 18, h=3.5)
    tb(f"Sheet: {sheet}",   683, 48, h=3.5)
    tb("Date: 2026-05-23",  683, 33, h=3.5)
    tb("Units: mm",         683, 18, h=3.5)


def dim_h(msp, x1, x2, y, text=None, layer="DIM"):
    """Horizontal dimension line at height y."""
    d = msp.add_linear_dim(
        base=(x1, y), p1=(x1, y-5), p2=(x2, y-5),
        angle=0, dimstyle="Standard",
        dxfattribs={"layer": layer}
    )
    if text:
        d.dxf.dimpost = f"{text}"
    d.render()


def dim_v(msp, x, y1, y2, text=None, layer="DIM"):
    """Vertical dimension line at x."""
    d = msp.add_linear_dim(
        base=(x, y1), p1=(x-5, y1), p2=(x-5, y2),
        angle=90, dimstyle="Standard",
        dxfattribs={"layer": layer}
    )
    if text:
        d.dxf.dimpost = f"{text}"
    d.render()


def note(msp, text, x, y, h=3.0):
    msp.add_text(text, dxfattribs={"layer":"NOTES","height":h}).set_placement(
        (x,y), align=TextEntityAlignment.MIDDLE_LEFT)


def label(msp, text, x, y, h=4.0):
    msp.add_text(text, dxfattribs={"layer":"ANNOTATION","height":h}).set_placement(
        (x,y), align=TextEntityAlignment.MIDDLE_CENTER)


def centerline_h(msp, x1, x2, y):
    msp.add_line((x1,y),(x2,y), dxfattribs={"layer":"CENTER"})


def centerline_v(msp, x, y1, y2):
    msp.add_line((x,y1),(x,y2), dxfattribs={"layer":"CENTER"})


def hatch_rect(msp, x, y, w, h, pattern="ANSI31", scale=2.0):
    hatch = msp.add_hatch(color=8, dxfattribs={"layer":"HATCH"})
    hatch.set_pattern_fill(pattern, scale=scale, angle=45)
    hatch.paths.add_polyline_path(
        [(x,y),(x+w,y),(x+w,y+h),(x,y+h)], is_closed=True)


# ═════════════════════════════════════════════════════════════════════════════
# DWG-001 — OVERALL ASSEMBLY FRONT VIEW
# ═════════════════════════════════════════════════════════════════════════════

def make_dwg001_assembly():
    doc, msp = new_doc("GD-DWG-001")
    OX, OY = 30, 110  # door origin

    # ── Door outline (4 sections) ──────────────────────────────────────────
    W, H_sec = 2540, 533
    for i in range(4):
        y0 = OY + i * H_sec
        rect = [(OX, y0),(OX+W, y0),(OX+W, y0+H_sec),(OX, y0+H_sec),(OX, y0)]
        msp.add_lwpolyline(rect, dxfattribs={"layer":"OUTLINE","lineweight":50})
        # Emboss lines (decorative panel ribs, 3 per section)
        for r in [1,2,3]:
            ry = y0 + r * H_sec / 4
            msp.add_line((OX+20, ry),(OX+W-20, ry),
                         dxfattribs={"layer":"OUTLINE","lineweight":13})
        # Section label
        label(msp, f"SECTION {i+1}", OX + W/2, y0 + H_sec/2, h=6)

    # ── Section joint lines (heavier) ─────────────────────────────────────
    for i in range(1,4):
        y = OY + i * H_sec
        msp.add_line((OX,y),(OX+W,y),
                     dxfattribs={"layer":"OUTLINE","lineweight":70})

    # ── Hinge markers ─────────────────────────────────────────────────────
    hinge_x = [OX + 150, OX + W//2 - 75, OX + W//2 + 75, OX + W - 150]
    for i in range(1,4):
        y = OY + i * H_sec
        for hx in [hinge_x[0], hinge_x[-1]]:
            msp.add_circle((hx, y), 8, dxfattribs={"layer":"OUTLINE"})
    note(msp, "SECTION HINGE (TYP)", OX + 155, OY + H_sec, h=3)

    # ── Bottom seal ───────────────────────────────────────────────────────
    msp.add_lwpolyline(
        [(OX, OY-12),(OX+W, OY-12),(OX+W, OY),(OX, OY)],
        close=True, dxfattribs={"layer":"OUTLINE","lineweight":35})
    hatch_rect(msp, OX, OY-12, W, 12, "ANSI31", 1.5)
    note(msp, "EPDM BOTTOM SEAL", OX + W/2, OY - 6, h=3)

    # ── Overall dimensions ─────────────────────────────────────────────────
    # Width
    d = msp.add_linear_dim(
        base=(OX, OY + 4*H_sec + 30),
        p1=(OX, OY + 4*H_sec + 20), p2=(OX+W, OY + 4*H_sec + 20),
        angle=0, dimstyle="Standard", dxfattribs={"layer":"DIM"}
    )
    d.render()
    # Height
    d = msp.add_linear_dim(
        base=(OX - 50, OY),
        p1=(OX - 40, OY), p2=(OX - 40, OY + 4*H_sec),
        angle=90, dimstyle="Standard", dxfattribs={"layer":"DIM"}
    )
    d.render()
    # Section height
    d = msp.add_linear_dim(
        base=(OX + W + 30, OY),
        p1=(OX + W + 20, OY), p2=(OX + W + 20, OY + H_sec),
        angle=90, dimstyle="Standard", dxfattribs={"layer":"DIM"}
    )
    d.render()

    # ── Centreline ────────────────────────────────────────────────────────
    cx = OX + W / 2
    centerline_v(msp, cx, OY - 30, OY + 4*H_sec + 50)
    note(msp, "CL", cx + 5, OY + 4*H_sec + 55, h=3.5)

    # ── Notes ─────────────────────────────────────────────────────────────
    nx, ny = OX, OY - 50
    note(msp, "NOTES:", nx, ny, h=4)
    notes = [
        "1. ALL DIMENSIONS IN MILLIMETRES UNLESS OTHERWISE STATED.",
        "2. DOOR CLEAR OPENING: 2500 W × 2100 H (mm).",
        "3. 4 SECTIONS, EACH 2540 × 533 × 40mm INSULATED PANEL.",
        "4. PANEL: 0.45mm PPGI OUTER + 0.40mm GI INNER + 40mm PU FOAM CORE.",
        "5. FINISH: RAL 7016 ANTHRACITE GREY, EMBOSSED WOOD-GRAIN TEXTURE.",
        "6. SECTION JOINTS: TONGUE-AND-GROOVE WITH EPDM CO-EXTRUDED SEAL.",
        "7. BOTTOM SEAL: EPDM D-SECTION IN AL ASTRAGAL, SCREW-FIXED.",
        "8. SIDE + TOP SEALS: EPDM BRUSH/BULB STRIPS (SEE DWG-003).",
    ]
    for i, n in enumerate(notes):
        note(msp, n, nx, ny - 8*(i+1), h=2.8)

    title_block(msp, "GD-DWG-001",
                "OVERALL ASSEMBLY — DOOR FRONT VIEW", "1:20")
    doc.saveas(os.path.join(OUTPUT_DIR, "GD-DWG-001_Overall_Assembly.dxf"))
    print("  GD-DWG-001 saved")


# ═════════════════════════════════════════════════════════════════════════════
# DWG-002 — PANEL CROSS-SECTION (scale 1:1 at 5× displayed)
# ═════════════════════════════════════════════════════════════════════════════

def make_dwg002_panel_section():
    doc, msp = new_doc("GD-DWG-002")
    # Draw at 5:1 (multiply dims × 5)
    S = 5
    OX, OY = 100, 280

    # ── Horizontal cross-section (end view of panel thickness = 40mm) ─────
    # Outer skin 0.45mm (drawn as 2.25mm at 5:1)
    t_outer = round(0.45 * S, 2)  # 2.25
    t_inner = round(0.40 * S, 2)  # 2.00
    t_foam  = round(36 * S)        # 180
    total_w = t_outer + t_foam + t_inner  # 184.25

    # Outer skin
    hatch_rect(msp, OX, OY, t_outer, 100*S, "SOLID", 1)
    msp.add_lwpolyline(
        [(OX,OY),(OX+t_outer,OY),(OX+t_outer,OY+100*S),(OX,OY+100*S),(OX,OY)],
        dxfattribs={"layer":"OUTLINE","lineweight":50}
    )
    # Foam core
    hatch_rect(msp, OX+t_outer, OY, t_foam, 100*S, "ANSI37", 3)
    msp.add_lwpolyline(
        [(OX+t_outer,OY),(OX+t_outer+t_foam,OY),
         (OX+t_outer+t_foam,OY+100*S),(OX+t_outer,OY+100*S),(OX+t_outer,OY)],
        dxfattribs={"layer":"OUTLINE","lineweight":25}
    )
    # Inner skin
    hatch_rect(msp, OX+t_outer+t_foam, OY, t_inner, 100*S, "SOLID", 1)
    msp.add_lwpolyline(
        [(OX+t_outer+t_foam,OY),(OX+total_w,OY),
         (OX+total_w,OY+100*S),(OX+t_outer+t_foam,OY+100*S),
         (OX+t_outer+t_foam,OY)],
        dxfattribs={"layer":"OUTLINE","lineweight":50}
    )

    # ── Dimensions ────────────────────────────────────────────────────────
    # Total thickness
    d = msp.add_linear_dim(
        base=(OX, OY - 20),
        p1=(OX, OY-10), p2=(OX+total_w, OY-10),
        angle=0, dimstyle="Standard", dxfattribs={"layer":"DIM"}
    )
    d.render()
    note(msp, "40.0 (ACTUAL)", OX + total_w/2, OY - 30, h=3)

    # Outer skin thickness
    d2 = msp.add_linear_dim(
        base=(OX, OY + 100*S + 20),
        p1=(OX, OY + 100*S + 10), p2=(OX + t_outer, OY + 100*S + 10),
        angle=0, dimstyle="Standard", dxfattribs={"layer":"DIM"}
    )
    d2.render()
    note(msp, "0.45 ACTUAL", OX + t_outer/2, OY + 100*S + 35, h=3)

    # ── Labels ────────────────────────────────────────────────────────────
    label(msp, "OUTER SKIN\n0.45mm PPGI\nRAL 7016",
          OX + t_outer/2, OY + 100*S/2 + 50, h=3)
    label(msp, "PU FOAM CORE\n36mm CFC-FREE\nρ=40 kg/m³",
          OX + t_outer + t_foam/2, OY + 100*S/2, h=4)
    label(msp, "INNER SKIN\n0.40mm GI\nZ200",
          OX + t_outer + t_foam + t_inner/2, OY + 100*S/2 - 50, h=3)

    # ── Tongue-and-groove joint detail (below) ───────────────────────────
    jx, jy = OX + 350, OY
    groove_w = 12 * S
    tongue_w = 10 * S
    tongue_h = 8 * S

    # Lower panel top edge
    msp.add_lwpolyline(
        [(jx, jy), (jx + 200, jy)], dxfattribs={"layer":"OUTLINE","lineweight":50}
    )
    # Groove in lower panel
    msp.add_lwpolyline(
        [(jx + 70, jy), (jx + 70, jy + tongue_h),
         (jx + 70 + groove_w, jy + tongue_h), (jx + 70 + groove_w, jy)],
        dxfattribs={"layer":"OUTLINE","lineweight":25}
    )
    # Upper panel bottom edge
    msp.add_lwpolyline(
        [(jx, jy + tongue_h + 4), (jx + 200, jy + tongue_h + 4)],
        dxfattribs={"layer":"OUTLINE","lineweight":50}
    )
    # Tongue in upper panel
    msp.add_lwpolyline(
        [(jx + 71, jy + tongue_h + 4),
         (jx + 71, jy + 2),
         (jx + 71 + tongue_w, jy + 2),
         (jx + 71 + tongue_w, jy + tongue_h + 4)],
        dxfattribs={"layer":"OUTLINE","lineweight":25}
    )
    # EPDM seal
    msp.add_circle((jx + 71 + tongue_w/2, jy + tongue_h/2 + 2), 3,
                   dxfattribs={"layer":"OUTLINE"})
    label(msp, "SECTION JOINT DETAIL\n(TONGUE & GROOVE + EPDM)\nSCALE 5:1",
          jx + 100, jy + tongue_h + 60, h=4)

    # Dims on joint
    d3 = msp.add_linear_dim(
        base=(jx + 70, jy - 15),
        p1=(jx + 70, jy - 8), p2=(jx + 70 + groove_w, jy - 8),
        angle=0, dimstyle="Standard", dxfattribs={"layer":"DIM"}
    )
    d3.render()
    note(msp, "12.0 ACTUAL (GROOVE)", jx + 70 + groove_w/2, jy - 25, h=2.8)

    # ── Notes ────────────────────────────────────────────────────────────
    nx, ny = 30, 80
    note(msp, "NOTES:", nx, ny, h=4)
    notes = [
        "1. CROSS-SECTION DRAWN AT 5:1 — ALL CALLOUT DIMENSIONS ARE ACTUAL.",
        "2. OUTER SKIN: 0.45mm PPGI Z275, PRE-PAINTED RAL 7016 PVDF COAT.",
        "3. INNER SKIN: 0.40mm GALVANISED STEEL Z200.",
        "4. CORE: 40mm RIGID POLYURETHANE FOAM, CFC-FREE, ρ = 40 kg/m³.",
        "5. TONGUE-AND-GROOVE JOINT WITH CO-EXTRUDED EPDM SEAL (INTEGRAL).",
        "6. U-VALUE: 1.5 W/m²K (CALCULATED PER EN ISO 6946).",
        "7. PANEL WEIGHT: ≈ 18 kg EACH (4 PANELS TOTAL ≈ 72 kg).",
        "8. SURFACE EMBOSSING: WOOD-GRAIN PATTERN, DEPTH 0.3mm.",
    ]
    for i, n in enumerate(notes):
        note(msp, n, nx, ny - 8*(i+1), h=2.8)

    title_block(msp, "GD-DWG-002",
                "DOOR PANEL — CROSS-SECTION A-A", "5:1")
    doc.saveas(os.path.join(OUTPUT_DIR, "GD-DWG-002_Panel_CrossSection.dxf"))
    print("  GD-DWG-002 saved")


# ═════════════════════════════════════════════════════════════════════════════
# DWG-003 — VERTICAL TRACK DETAIL
# ═════════════════════════════════════════════════════════════════════════════

def make_dwg003_vertical_track():
    doc, msp = new_doc("GD-DWG-003")
    OX, OY = 60, 100
    S = 2  # 2:1 scale

    # ── Front view (long elevation) ───────────────────────────────────────
    TL = 2285  # track length
    TW = 76    # track width (face)

    # Front face of channel
    msp.add_lwpolyline(
        [(OX, OY),(OX + TW*S, OY),(OX + TW*S, OY + TL),
         (OX, OY + TL),(OX, OY)],
        dxfattribs={"layer":"OUTLINE","lineweight":50}
    )

    # Wall bracket bolt holes (at 600, 1200, 1800mm from bottom)
    for by in [600, 1200, 1800]:
        msp.add_circle((OX + TW*S/2, OY + by), 9/2*S,
                       dxfattribs={"layer":"OUTLINE"})
        centerline_h(msp, OX - 15, OX + TW*S + 15, OY + by)
        note(msp, f"Ø9 BOLT HOLE @ {by}", OX + TW*S + 20, OY + by, h=2.8)

    # Roller slots (at mid-height of each section: 266, 799, 1332, 1865)
    slot_y = [266, 799, 1332, 1865]
    for sy in slot_y:
        # 12×25mm slot
        sx = OX + TW*S/2 - 6*S
        msp.add_lwpolyline(
            [(sx, OY+sy-12*S),(sx+12*S, OY+sy-12*S),
             (sx+12*S, OY+sy+12*S),(sx, OY+sy+12*S),(sx, OY+sy-12*S)],
            dxfattribs={"layer":"OUTLINE","lineweight":25}
        )
        centerline_h(msp, OX - 10, OX + TW*S + 10, OY + sy)
        note(msp, f"12×25 ROLLER SLOT @ {sy}", OX + TW*S + 20, OY + sy, h=2.8)

    # Top roller hole (at 2235mm)
    msp.add_circle((OX + TW*S/2, OY + 2235), 6*S,
                   dxfattribs={"layer":"OUTLINE"})
    centerline_h(msp, OX - 10, OX + TW*S + 10, OY + 2235)
    note(msp, "Ø12 TOP ROLLER @ 2235", OX + TW*S + 20, OY + 2235, h=2.8)

    # ── Overall dim ───────────────────────────────────────────────────────
    d = msp.add_linear_dim(
        base=(OX - 35, OY),
        p1=(OX - 25, OY), p2=(OX - 25, OY + TL),
        angle=90, dimstyle="Standard", dxfattribs={"layer":"DIM"}
    )
    d.render()
    d2 = msp.add_linear_dim(
        base=(OX, OY + TL + 20),
        p1=(OX, OY + TL + 12), p2=(OX + TW*S, OY + TL + 12),
        angle=0, dimstyle="Standard", dxfattribs={"layer":"DIM"}
    )
    d2.render()

    # ── Channel cross-section (end view, right of front view) ─────────────
    ex = OX + TW*S + 200
    ey = OY + TL/2
    CW = 76 * S   # channel width
    CH = 32 * S   # channel depth
    t  = 3 * S    # wall thickness

    # Channel outline (C-section, opening facing left)
    pts = [
        (ex, ey - CW/2),
        (ex + CH, ey - CW/2),
        (ex + CH, ey - CW/2 + t),
        (ex + t,  ey - CW/2 + t),
        (ex + t,  ey + CW/2 - t),
        (ex + CH, ey + CW/2 - t),
        (ex + CH, ey + CW/2),
        (ex, ey + CW/2),
        (ex, ey - CW/2),
    ]
    msp.add_lwpolyline(pts, dxfattribs={"layer":"OUTLINE","lineweight":50})
    hatch_rect(msp, ex, ey - CW/2, t, CW, "SOLID", 1)           # back wall
    hatch_rect(msp, ex+t, ey - CW/2, CH-t, t, "SOLID", 1)       # bottom flange
    hatch_rect(msp, ex+t, ey + CW/2 - t, CH-t, t, "SOLID", 1)   # top flange
    centerline_h(msp, ex - 10, ex + CH + 10, ey)
    centerline_v(msp, ex + CH/2, ey - CW/2 - 10, ey + CW/2 + 10)

    # Cross-section dims
    d3 = msp.add_linear_dim(
        base=(ex, ey - CW/2 - 20),
        p1=(ex, ey - CW/2 - 12), p2=(ex + CH, ey - CW/2 - 12),
        angle=0, dimstyle="Standard", dxfattribs={"layer":"DIM"}
    )
    d3.render()
    d4 = msp.add_linear_dim(
        base=(ex + CH + 20, ey - CW/2),
        p1=(ex + CH + 12, ey - CW/2), p2=(ex + CH + 12, ey + CW/2),
        angle=90, dimstyle="Standard", dxfattribs={"layer":"DIM"}
    )
    d4.render()
    note(msp, "SECTION B-B (END VIEW)\nSCALE 2:1",
         ex + CH/2, ey + CW/2 + 30, h=3.5)
    note(msp, "MATERIAL: 3mm HDG STEEL Z450",
         ex - 20, ey - CW/2 - 50, h=3)

    # ── Notes ─────────────────────────────────────────────────────────────
    nx, ny = 30, 80
    note(msp, "NOTES:", nx, ny, h=4)
    notes = [
        "1. ALL DIMS IN MILLIMETRES. DRAWING SCALE 2:1.",
        "2. MATERIAL: 3mm THICK HOT-DIP GALVANIZED STEEL, Z450 COATING.",
        "3. CHANNEL SECTION: 76mm × 32mm (2-INCH STANDARD TRACK PROFILE).",
        "4. ROLLER SLOTS: 12 × 25mm ELONGATED. DEBURR ALL EDGES AFTER CUTTING.",
        "5. BOLT HOLES: Ø9mm FOR M8 BOLTS, THROUGH BOTH FLANGES.",
        "6. WALL BRACKET BOLT HOLES AT 600, 1200, 1800mm FROM TRACK BASE.",
        "7. TRACK LENGTH: 2285mm (= DOOR HEIGHT + 150mm FLOOR CLEARANCE).",
        "8. TWO IDENTICAL TRACKS REQUIRED (LH AND RH — SAME PART, MIRROR INSTALL).",
        "9. TOLERANCE: LENGTH ±2mm, SLOT POSITION ±1mm, SQUARENESS ±0.5°/m.",
    ]
    for i, n in enumerate(notes):
        note(msp, n, nx, ny - 8*(i+1), h=2.8)

    title_block(msp, "GD-DWG-003", "VERTICAL TRACK — DETAIL", "2:1")
    doc.saveas(os.path.join(OUTPUT_DIR, "GD-DWG-003_Vertical_Track.dxf"))
    print("  GD-DWG-003 saved")


# ═════════════════════════════════════════════════════════════════════════════
# DXF-003 — WALL ANGLE BRACKET (flat blank for laser cutting, 1:1)
# ═════════════════════════════════════════════════════════════════════════════

def make_dxf003_wall_bracket():
    doc, msp = new_doc("GD-DXF-003")
    OX, OY = 80, 150

    # Flat blank: 150mm × 100mm, 3mm thick
    W, H = 150, 100

    # Outer profile
    msp.add_lwpolyline(
        [(OX,OY),(OX+W,OY),(OX+W,OY+H),(OX,OY+H),(OX,OY)],
        dxfattribs={"layer":"OUTLINE","lineweight":70}
    )

    # Leg A holes (vertical leg, 3× Ø9mm for M8 bolts, lag screws):
    leg_a_holes = [(OX + 25, OY + 20), (OX + 25, OY + 50), (OX + 25, OY + 80)]
    for hx, hy in leg_a_holes:
        msp.add_circle((hx, hy), 4.5, dxfattribs={"layer":"OUTLINE"})

    # Leg B holes (horizontal leg, 2× Ø9 + 1× 9×20 slot):
    msp.add_circle((OX + 110, OY + 25), 4.5, dxfattribs={"layer":"OUTLINE"})
    msp.add_circle((OX + 110, OY + 75), 4.5, dxfattribs={"layer":"OUTLINE"})
    # Adjustment slot
    sx, sy = OX + 125, OY + 45
    msp.add_lwpolyline(
        [(sx, sy),(sx+20, sy),(sx+20, sy+10),(sx, sy+10),(sx, sy)],
        dxfattribs={"layer":"OUTLINE"}
    )

    # Bend line (90° bend at 50mm from left)
    bend_x = OX + 50
    msp.add_line((bend_x, OY), (bend_x, OY + H),
                 dxfattribs={"layer":"CENTER"})
    note(msp, "BEND LINE — 90° DOWN", bend_x + 5, OY + H/2, h=3)

    # Dimensions
    d = msp.add_linear_dim(
        base=(OX, OY - 20), p1=(OX, OY - 12), p2=(OX+W, OY - 12),
        angle=0, dimstyle="Standard", dxfattribs={"layer":"DIM"}
    )
    d.render()
    d2 = msp.add_linear_dim(
        base=(OX - 25, OY), p1=(OX - 15, OY), p2=(OX - 15, OY+H),
        angle=90, dimstyle="Standard", dxfattribs={"layer":"DIM"}
    )
    d2.render()
    d3 = msp.add_linear_dim(
        base=(OX, OY - 35), p1=(OX, OY - 27), p2=(bend_x, OY - 27),
        angle=0, dimstyle="Standard", dxfattribs={"layer":"DIM"}
    )
    d3.render()

    # Notes
    nx, ny = 30, 100
    note(msp, "NOTES:", nx, ny, h=4)
    notes = [
        "1. MATERIAL: 3mm HOT-DIP GALVANIZED MILD STEEL (Z450).",
        "2. SCALE 1:1 — ISSUE AS DXF TO LASER CUTTER.",
        "3. BEND AT BEND LINE 90° (UP) — INSIDE RADIUS 3mm.",
        "4. HOLES: Ø9mm THROUGH — DRILL OR PUNCH.",
        "5. SLOT: 9×20mm ELONGATED (LASER CUT).",
        "6. DEBURR ALL EDGES. MAX BURR HEIGHT 0.2mm.",
        "7. QTY PER DOOR: 8 OFF (4 PER SIDE, BOTH IDENTICAL).",
    ]
    for i, n in enumerate(notes):
        note(msp, n, nx, ny - 8*(i+1), h=2.8)

    title_block(msp, "GD-DXF-003",
                "WALL ANGLE BRACKET — LASER CUT FLAT BLANK", "1:1")
    doc.saveas(os.path.join(OUTPUT_DIR, "GD-DXF-003_Wall_Bracket.dxf"))
    print("  GD-DXF-003 saved")


# ═════════════════════════════════════════════════════════════════════════════
# DXF-004 — HEADER / CENTER BRACKET (flat blank, 1:1)
# ═════════════════════════════════════════════════════════════════════════════

def make_dxf004_header_bracket():
    doc, msp = new_doc("GD-DXF-004")
    OX, OY = 80, 200

    # Flat blank: 150mm × 120mm, 4mm plate
    W, H = 150, 120

    msp.add_lwpolyline(
        [(OX,OY),(OX+W,OY),(OX+W,OY+H),(OX,OY+H),(OX,OY)],
        dxfattribs={"layer":"OUTLINE","lineweight":70}
    )

    # 4× lag bolt holes (M10, Ø11mm) in top portion
    for bx in [OX+25, OX+125]:
        for by in [OY + H - 20, OY + H - 50]:
            msp.add_circle((bx, by), 5.5, dxfattribs={"layer":"OUTLINE"})

    # Spring tube clearance hole (Ø26.5mm, center of bracket)
    cx, cy = OX + W/2, OY + 45
    msp.add_circle((cx, cy), 26.5/2, dxfattribs={"layer":"OUTLINE"})
    centerline_h(msp, cx - 25, cx + 25, cy)
    centerline_v(msp, cx, cy - 25, cy + 25)

    # Bearing pocket (Ø52mm for 6205, center of bracket lower)
    bpx, bpy = OX + W/2, OY + 45
    msp.add_circle((bpx, bpy), 52/2, dxfattribs={"layer":"HIDDEN"})
    note(msp, "Ø52 BEARING POCKET\n6205-2RS PRESS FIT\nDEPTH 18mm", bpx + 35, bpy, h=3)
    note(msp, "Ø26.5 SPRING TUBE\nCLEARANCE", cx - 35, cy + 20, h=3)

    # Dims
    d = msp.add_linear_dim(
        base=(OX, OY - 20), p1=(OX, OY - 12), p2=(OX+W, OY - 12),
        angle=0, dimstyle="Standard", dxfattribs={"layer":"DIM"}
    )
    d.render()
    d2 = msp.add_linear_dim(
        base=(OX - 25, OY), p1=(OX-15, OY), p2=(OX-15, OY+H),
        angle=90, dimstyle="Standard", dxfattribs={"layer":"DIM"}
    )
    d2.render()

    # Notes
    nx, ny = 30, 140
    note(msp, "NOTES:", nx, ny, h=4)
    notes = [
        "1. MATERIAL: 4mm HOT-DIP GALVANIZED MILD STEEL (Z450).",
        "2. SCALE 1:1 — ISSUE AS DXF TO LASER CUTTER.",
        "3. Ø26.5 CLEARANCE HOLE: DRILL OR LASER. ±0.2mm TOLERANCE.",
        "4. Ø52 BEARING POCKET: MACHINE TO H7 FIT FOR 6205-2RS BEARING.",
        "5. Ø11 LAG BOLT HOLES: 4 OFF FOR M10 × 80mm STRUCTURAL LAG SCREWS.",
        "6. DEBURR ALL EDGES. BREAK CORNERS 0.5mm × 45°.",
        "7. QTY PER DOOR: 1 OFF (CENTER BRACKET ABOVE DOOR).",
        "8. WELD STIFFENER PLATE (4mm × 50mm) IF HEADER IS TIMBER — SEE DWG-007.",
    ]
    for i, n in enumerate(notes):
        note(msp, n, nx, ny - 8*(i+1), h=2.8)

    title_block(msp, "GD-DXF-004",
                "CENTER / HEADER BRACKET — LASER CUT FLAT BLANK", "1:1")
    doc.saveas(os.path.join(OUTPUT_DIR, "GD-DXF-004_Header_Bracket.dxf"))
    print("  GD-DXF-004 saved")


# ═════════════════════════════════════════════════════════════════════════════
# DWG-005 — SPRING & CABLE DRUM ASSEMBLY
# ═════════════════════════════════════════════════════════════════════════════

def make_dwg005_spring_assembly():
    doc, msp = new_doc("GD-DWG-005")
    OX, OY = 50, 300
    S = 2  # 2:1

    # Spring tube (25.4mm OD, 1600mm long)
    tube_od = 25.4 * S
    tube_id = 20.4 * S
    tube_L  = 1600

    msp.add_lwpolyline(
        [(OX, OY - tube_od/2),(OX + tube_L, OY - tube_od/2),
         (OX + tube_L, OY + tube_od/2),(OX, OY + tube_od/2),(OX, OY - tube_od/2)],
        dxfattribs={"layer":"OUTLINE","lineweight":50}
    )
    centerline_h(msp, OX - 20, OX + tube_L + 20, OY)

    # RH spring (right half of tube)
    sx = OX + tube_L/2 + 20
    spring_L = 965
    # Draw spring as coil symbol
    for i in range(30):
        phase = i / 30 * spring_L
        msp.add_line(
            (sx + phase, OY - 50*S),
            (sx + phase + spring_L/30, OY + 50*S),
            dxfattribs={"layer":"OUTLINE","lineweight":13}
        )
    msp.add_line((sx, OY - 50*S),(sx + spring_L, OY - 50*S),
                 dxfattribs={"layer":"OUTLINE","lineweight":25})
    msp.add_line((sx, OY + 50*S),(sx + spring_L, OY + 50*S),
                 dxfattribs={"layer":"OUTLINE","lineweight":25})
    note(msp, "RH SPRING (RIGHT-WOUND)", sx + spring_L/2, OY + 60*S, h=3.5)

    # LH spring (left half)
    lx = OX + 30
    for i in range(30):
        phase = i / 30 * spring_L
        msp.add_line(
            (lx + phase, OY + 50*S),
            (lx + phase + spring_L/30, OY - 50*S),
            dxfattribs={"layer":"OUTLINE","lineweight":13}
        )
    msp.add_line((lx, OY - 50*S),(lx + spring_L, OY - 50*S),
                 dxfattribs={"layer":"OUTLINE","lineweight":25})
    msp.add_line((lx, OY + 50*S),(lx + spring_L, OY + 50*S),
                 dxfattribs={"layer":"OUTLINE","lineweight":25})
    note(msp, "LH SPRING (LEFT-WOUND)", lx + spring_L/2, OY - 70*S, h=3.5)

    # Cable drums at tube ends
    drum_w = 100  # mm
    drum_od = 76  # pitch OD mm
    for dx in [OX, OX + tube_L - drum_w]:
        msp.add_lwpolyline(
            [(dx, OY - drum_od/2),(dx + drum_w, OY - drum_od/2),
             (dx + drum_w, OY + drum_od/2),(dx, OY + drum_od/2),(dx, OY - drum_od/2)],
            dxfattribs={"layer":"OUTLINE","lineweight":35}
        )
        hatch_rect(msp, dx, OY - drum_od/2, drum_w, drum_od, "ANSI31", 2)
    note(msp, "CABLE DRUM LH\nAl ADC12, Ø76mm PITCH",
         OX + drum_w/2, OY + drum_od/2 + 20, h=3)
    note(msp, "CABLE DRUM RH\n(MIRROR OF LH)",
         OX + tube_L - drum_w/2, OY + drum_od/2 + 20, h=3)

    # Center bracket
    cbx = OX + tube_L/2 - 30
    msp.add_lwpolyline(
        [(cbx, OY - 80),(cbx + 60, OY - 80),
         (cbx + 60, OY + 80),(cbx, OY + 80),(cbx, OY - 80)],
        dxfattribs={"layer":"OUTLINE","lineweight":50}
    )
    note(msp, "CENTER\nBRACKET", cbx + 30, OY - 100, h=3)

    # Safety cable line
    msp.add_line((OX, OY), (OX + tube_L/2 - 30, OY),
                 dxfattribs={"layer":"HIDDEN"})
    msp.add_line((OX + tube_L/2 + 30, OY), (OX + tube_L, OY),
                 dxfattribs={"layer":"HIDDEN"})
    note(msp, "SAFETY CABLE Ø6mm\n7×7 GALV. (INSIDE SPRING)",
         OX + 200, OY + 10, h=3)

    # Overall dim
    d = msp.add_linear_dim(
        base=(OX, OY - 120),
        p1=(OX, OY - 110), p2=(OX + tube_L, OY - 110),
        angle=0, dimstyle="Standard", dxfattribs={"layer":"DIM"}
    )
    d.render()
    d2 = msp.add_linear_dim(
        base=(sx, OY - 100),
        p1=(sx, OY - 92), p2=(sx + spring_L, OY - 92),
        angle=0, dimstyle="Standard", dxfattribs={"layer":"DIM"}
    )
    d2.render()

    # Spring specification table
    nx, ny = 30, 160
    note(msp, "SPRING SPECIFICATION:", nx, ny, h=4)
    specs = [
        "WIRE DIAMETER:     6.5mm",
        "INSIDE DIAMETER:  102mm",
        "LENGTH (FREE):    965mm",
        "TOTAL TURNS:       30",
        "MATERIAL: HIGH-CARBON STEEL ASTM A227, SHOT-PEENED",
        "WIND:   LH (LEFT) + RH (RIGHT) — ONE EACH",
        "RATED CYCLES: 10,000 MINIMUM",
        "IPPT: ≈ 38 in-lb/turn (CALCULATED FOR 72 kg DOOR)",
    ]
    for i, s in enumerate(specs):
        note(msp, s, nx, ny - 9*(i+1), h=3)

    nx2, ny2 = 30, 80
    note(msp, "⚠ SPRING WINDING — TRAINED INSTALLER ONLY.", nx2, ny2, h=4)
    note(msp, "   USE PROPER WINDING BAR (Ø10mm × 600mm SOLID STEEL).", nx2, ny2 - 10, h=3)
    note(msp, "   WIND LH SPRING: 8.75 TURNS CCW. WIND RH SPRING: 8.75 TURNS CW.", nx2, ny2 - 20, h=3)
    note(msp, "   LOCK SET SCREWS TO 30 Nm + THREAD LOCKER (LOCTITE 243).", nx2, ny2 - 30, h=3)

    title_block(msp, "GD-DWG-005",
                "TORSION SPRING & CABLE DRUM ASSEMBLY", "2:1")
    doc.saveas(os.path.join(OUTPUT_DIR, "GD-DWG-005_Spring_Assembly.dxf"))
    print("  GD-DWG-005 saved")


# ═════════════════════════════════════════════════════════════════════════════
# DWG-009 — CONTROL ENCLOSURE LAYOUT
# ═════════════════════════════════════════════════════════════════════════════

def make_dwg009_enclosure():
    doc, msp = new_doc("GD-DWG-009")
    OX, OY = 60, 150
    # Enclosure: 160 × 120 × 60mm — draw internal layout at 2:1
    S = 2
    EW, EH = 160*S, 120*S

    # Enclosure outline
    msp.add_lwpolyline(
        [(OX,OY),(OX+EW,OY),(OX+EW,OY+EH),(OX,OY+EH),(OX,OY)],
        dxfattribs={"layer":"OUTLINE","lineweight":70}
    )
    # DIN rail (at bottom third)
    msp.add_line((OX+10,OY+40*S),(OX+EW-10,OY+40*S),
                 dxfattribs={"layer":"OUTLINE","lineweight":35})
    note(msp, "DIN RAIL", OX + EW/2, OY + 42*S, h=3)

    # SMPS block on DIN rail
    smps_x, smps_y = OX + 20, OY + 42*S
    msp.add_lwpolyline(
        [(smps_x,smps_y),(smps_x+50*S,smps_y),
         (smps_x+50*S,smps_y+30*S),(smps_x,smps_y+30*S),(smps_x,smps_y)],
        dxfattribs={"layer":"OUTLINE","lineweight":25}
    )
    label(msp, "SMPS\n12V/5A\nMW DR-60-12",
          smps_x + 25*S, smps_y + 15*S, h=3.5)

    # PCB block
    pcb_x, pcb_y = OX + 15*S, OY + 75*S
    msp.add_lwpolyline(
        [(pcb_x,pcb_y),(pcb_x+100,pcb_y),
         (pcb_x+100,pcb_y+80),(pcb_x,pcb_y+80),(pcb_x,pcb_y)],
        dxfattribs={"layer":"OUTLINE","lineweight":25}
    )
    label(msp, "CONTROL PCB\n100×80mm\n(ESP32+BTS7960)",
          pcb_x + 50, pcb_y + 40, h=3.5)

    # SLA battery
    bat_x, bat_y = OX + EW - 80, OY + 45*S
    msp.add_lwpolyline(
        [(bat_x,bat_y),(bat_x+60,bat_y),
         (bat_x+60,bat_y+50),(bat_x,bat_y+50),(bat_x,bat_y)],
        dxfattribs={"layer":"OUTLINE","lineweight":25}
    )
    label(msp, "SLA BATT\n12V 7AH", bat_x + 30, bat_y + 25, h=3.5)

    # Cable entries (bottom)
    entries = [("MAINS IN", OX+20), ("MOTOR OUT", OX+60),
               ("SENSORS", OX+100), ("HALL SW.", OX+140),
               ("PHOTO-EYE", OX+180), ("REMOTE ANT.", OX+220)]
    for label_t, ex in entries:
        msp.add_circle((ex, OY + 8), 6, dxfattribs={"layer":"OUTLINE"})
        note(msp, label_t, ex - 10, OY - 10, h=2.5)

    # Status LED panel
    led_x, led_y = OX + EW - 30, OY + EH - 30
    for i, (color, name) in enumerate([("R","FAULT"),("G","READY"),("B","WIFI")]):
        msp.add_circle((led_x, led_y - i*15), 4, dxfattribs={"layer":"OUTLINE"})
        note(msp, f"{color}-LED: {name}", led_x + 8, led_y - i*15, h=2.8)

    # Dims
    d = msp.add_linear_dim(
        base=(OX, OY - 20),
        p1=(OX, OY - 12), p2=(OX+EW, OY - 12),
        angle=0, dimstyle="Standard", dxfattribs={"layer":"DIM"}
    )
    d.render()
    d2 = msp.add_linear_dim(
        base=(OX - 25, OY),
        p1=(OX - 15, OY), p2=(OX - 15, OY + EH),
        angle=90, dimstyle="Standard", dxfattribs={"layer":"DIM"}
    )
    d2.render()

    # Notes
    nx, ny = 30, 100
    note(msp, "NOTES:", nx, ny, h=4)
    notes = [
        "1. DRAWING SCALE 2:1. ALL DIMS ACTUAL (mm).",
        "2. ENCLOSURE: ABS IP54, 160×120×60mm — HAMMOND 1554 OR EQUIV.",
        "3. DRILL CABLE GLAND HOLES PER ENTRY LIST (BOTTOM FACE).",
        "4. FIT PG11 CABLE GLANDS FOR 4-10mm CABLE OD.",
        "5. EARTH BOND: M4 STUD ON ENCLOSURE TO MAINS EARTH.",
        "6. PCB MOUNTED ON 4× M3×10mm BRASS STANDOFFS.",
        "7. SMPS CLIPPED TO 35mm DIN RAIL.",
        "8. SLA BATTERY STRAPPED TO BASE WITH CABLE TIE.",
        "9. ALL INTERNAL WIRING ROUTED IN CABLE DUCT (PANDUIT OR EQUIV.).",
    ]
    for i, n in enumerate(notes):
        note(msp, n, nx, ny - 8*(i+1), h=2.8)

    title_block(msp, "GD-DWG-009",
                "CONTROL ENCLOSURE — INTERNAL LAYOUT", "2:1")
    doc.saveas(os.path.join(OUTPUT_DIR, "GD-DWG-009_Control_Enclosure.dxf"))
    print("  GD-DWG-009 saved")


# ═════════════════════════════════════════════════════════════════════════════
# DWG-011 — WIRING DIAGRAM (schematic style)
# ═════════════════════════════════════════════════════════════════════════════

def make_dwg011_wiring():
    doc, msp = new_doc("GD-DWG-011")

    def box(x, y, w, h, txt, layer="OUTLINE"):
        msp.add_lwpolyline(
            [(x,y),(x+w,y),(x+w,y+h),(x,y+h),(x,y)],
            dxfattribs={"layer":layer,"lineweight":35}
        )
        label(msp, txt, x+w/2, y+h/2, h=3.5)

    def wire(x1,y1,x2,y2,color=7,lw=13):
        msp.add_line((x1,y1),(x2,y2),
                     dxfattribs={"layer":"OUTLINE","lineweight":lw,"color":color})

    def conn_note(x,y,txt):
        note(msp, txt, x, y, h=2.8)

    # MAINS supply
    box(30, 480, 80, 40, "230V AC\nMAINS\nL / N / E")
    # SMPS
    box(160, 480, 80, 40, "SMPS\nMean Well\nDR-60-12\n12V 5A")
    wire(110,500, 160,500)  # L to SMPS
    conn_note(130, 505, "L (BRN)")
    conn_note(130, 495, "N (BLU)")
    conn_note(130, 515, "E (G/Y)")

    # 12V bus
    wire(240,500, 380,500, color=1)  # red = 12V
    conn_note(300, 505, "12V (RED)")
    wire(240,492, 380,492, color=5)  # black = GND
    conn_note(300, 487, "GND (BLK)")

    # ESP32
    box(380, 450, 100, 80, "ESP32\nWROOM-32\n(MCU + WiFi\n+ 433 RX)")
    wire(380,490, 240+140,490)

    # BTS7960
    box(380, 360, 100, 60, "BTS7960\n43A H-Bridge\nMotor Driver")
    wire(430,450, 430,420)  # ESP32 → driver (PWM/DIR)
    conn_note(435, 435, "RPWM/LPWM/EN")

    # Motor
    box(530, 360, 80, 60, "BLDC MOTOR\n375W 24V\n(in operator)")
    wire(480,390, 530,390)
    conn_note(497, 395, "M+ (ORG)")
    conn_note(497, 383, "M- (YLW)")

    # SLA battery
    box(530, 450, 80, 50, "SLA BATT\n12V 7AH\nBACKUP")
    wire(380,480, 240+140,480)  # bat to 12V rail via relay
    note(msp,"RELAY (auto\nswitch on\nmains fail)", 350, 470, h=3)

    # Hall sensors
    box(160, 360, 90, 50, "HALL SENSOR\nOPEN LIMIT\n(AH49E)")
    wire(250,385, 380,385)
    conn_note(300, 390, "SIG (GRN)")
    box(160, 290, 90, 50, "HALL SENSOR\nCLOSE LIMIT\n(AH49E)")
    wire(250,315, 380,315)

    # Photo-eye
    box(30, 360, 90, 50, "PHOTO-EYE\nTX (IR emit)\n@ 150mm flr")
    box(30, 290, 90, 50, "PHOTO-EYE\nRX (IR recv)\n@ 150mm flr")
    wire(120,385, 160,385)
    wire(120,315, 160,315)
    conn_note(138, 390, "TX PWR")
    conn_note(138, 320, "RX SIG")

    # RF module
    box(530, 300, 80, 50, "433MHz RF\nRX MODULE\n(RXB6)")
    wire(430,450, 530,325)
    conn_note(475, 385, "DATA (GRN)")

    # LEDs + buzzer
    box(530, 230, 80, 50, "STATUS LEDs\nR/G/B\n+ BUZZER")
    wire(430,450, 530,255)

    # Power path note
    note(msp, "── 12V POWER ──►  RED",    30, 570, h=3)
    note(msp, "── GND  ─────►  BLACK",   30, 560, h=3)
    note(msp, "── SIGNAL ───►  VARIES",  30, 550, h=3)
    note(msp, "── 230V AC ──►  BROWN/BLUE", 30, 540, h=3)

    # Notes
    nx, ny = 30, 220
    note(msp, "NOTES:", nx, ny, h=4)
    notes = [
        "1. ALL LOW-VOLTAGE WIRING: 18AWG (POWER) / 22AWG (SIGNAL).",
        "2. MAINS WIRING (230V): 1.5mm² (16AWG) MINIMUM, RATED 300V.",
        "3. ALL SIGNAL CABLES TO SENSORS: SHIELDED 2-CORE (SHIELD TO GND AT PCB END ONLY).",
        "4. MOTOR CABLE: 18AWG, 4-CORE, ROUTED AWAY FROM SIGNAL CABLES.",
        "5. EARTH ALL METAL ENCLOSURES AND MOTOR FRAME (GREEN/YELLOW).",
        "6. FUSE ON 12V MOTOR RAIL: 5A GLASS FUSE IN PANEL HOLDER.",
        "7. MAINS SUPPLY TO INCLUDE RCD PROTECTION (30mA) AT DISTRIBUTION BOARD.",
        "8. TVS DIODES ON ALL SENSOR INPUTS AT PCB CONNECTOR — SEE PCB LAYOUT GD-DWG-010.",
    ]
    for i, n in enumerate(notes):
        note(msp, n, nx, ny - 8*(i+1), h=2.8)

    title_block(msp, "GD-DWG-011", "ELECTRICAL WIRING DIAGRAM", "NTS")
    doc.saveas(os.path.join(OUTPUT_DIR, "GD-DWG-011_Wiring_Diagram.dxf"))
    print("  GD-DWG-011 saved")


# ═════════════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("SmartLift Pro — Generating DXF Drawings...")
    make_dwg001_assembly()
    make_dwg002_panel_section()
    make_dwg003_vertical_track()
    make_dxf003_wall_bracket()
    make_dxf004_header_bracket()
    make_dwg005_spring_assembly()
    make_dwg009_enclosure()
    make_dwg011_wiring()
    print(f"\nAll DXF files written to: {OUTPUT_DIR}/")
    import os
    for f in sorted(os.listdir(OUTPUT_DIR)):
        size = os.path.getsize(os.path.join(OUTPUT_DIR, f))
        print(f"  {f}  ({size:,} bytes)")
