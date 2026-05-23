# SmartLift Pro — SolidWorks Macro Run Order

## Prerequisites
- SolidWorks 2020 or later
- Create folder structure: `cad/solidworks_macros/parts/` and `cad/solidworks_macros/drawings/`

## Run Order

| Step | Macro File              | Creates                              | Output File                        |
|------|-------------------------|--------------------------------------|------------------------------------|
| 1    | SW_001_Panel_Part.swb   | Single door panel (4-feature solid)  | parts/GD-DP-001_Panel.SLDPRT      |
| 2    | SW_002_Vertical_Track.swb | C-channel track with slots/holes   | parts/GD-TR-001_Vertical_Track.SLDPRT |
| 3    | SW_003_Center_Bracket.swb | Header bracket with bearing pocket | parts/GD-SP-006_Center_Bracket.SLDPRT |
| 4    | SW_006_Wall_Bracket.swb | L-shaped wall mount bracket          | parts/GD-TR-004_Wall_Bracket.SLDPRT |
| 5    | SW_004_Assembly.swb     | Top-level assembly (insert + position)| GD-ASSY-001_SmartLift_Door.SLDASM |
| 6    | SW_005_Drawing_Template.swb | Auto-drawing from any open part  | drawings/<DWG_REF>_<PART>.SLDDRW  |

## How to Run a Macro in SolidWorks
1. `Tools` → `Macros` → `Run...`
2. Navigate to `garage_door_project/cad/solidworks_macros/`
3. Select the `.swb` file
4. Click `Open` — macro executes automatically

## Additional Parts to Model Manually (no macro — buy-out standard parts)
These are sourced as standard catalog items but should be modelled for assembly reference:
- Spring tube (25.4mm OD pipe): simple cylinder extrude
- Cable drum: revolve from profile
- Nylon roller: revolve, add bearing bore
- Drive belt + sprockets: use Toolbox gear library or supplier 3D model
- Motor + gearbox: download from supplier (Bonfiglioli 3D STEP available at bonfiglioli.com)
- ESP32 dev board: free STEP from SnapEDA / UltraLibrarian

## STEP Files from Suppliers
Download STEP files for bought-out parts from:
- Bonfiglioli gearbox: bonfiglioli.com → Products → 3D Models
- SKF bearing 6205: skf.com → Bearing 6205 → 3D download
- Mean Well DR-60-12: meanwell.com → Product page → 3D / STEP
- BTS7960 module: SnapEDA.com → search BTS7960B

Place downloaded STEP files in `cad/step/` and insert into SolidWorks assembly via:
`Insert` → `Component` → `From File...` → select `.step`

## Parametric Design Table
All key parameters are defined as constants at the top of each macro.
Modify them before running to resize the part:

| Macro | Key Parameters |
|-------|---------------|
| SW_001 (Panel) | PANEL_WIDTH, PANEL_HEIGHT, PANEL_THICK, SKIN_OUTER, SKIN_INNER |
| SW_002 (Track) | TRACK_LEN, TRACK_WIDTH, FLANGE_DEPTH, WALL_T, SLOT positions |
| SW_003 (Bracket) | BKT_W, BKT_H, BKT_T, TUBE_CLR_D, BEAR_D, BEAR_DEPTH |
| SW_006 (Wall bracket) | LEG_A_W, LEG_B_W, BKT_H, BKT_T |

## Drawing Export for Manufacturing
After running SW_005_Drawing_Template.swb:
1. Add Smart Dimensions (`D` key)
2. Add centrelines: `Insert` → `Annotations` → `Centerline`
3. Add GD&T: `Insert` → `Annotations` → `Geometric Tolerance`
4. Export DXF (for laser brackets): `File` → `Save As` → `.DXF`
5. Export PDF (for issue): `File` → `Save As` → `.PDF`
6. Export STEP (for machinist): `File` → `Save As` → `.STEP`
