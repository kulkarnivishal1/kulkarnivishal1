# Portal Lift Tester Software

A mobile-friendly **web application** that turns any modern smartphone into a
lift (elevator) ride-quality tester. Place the phone flat on the lift car
floor, tap **Start**, run the lift through a cycle, tap **Stop**, and the app
generates a complete ride-parameter report with graphs — confirmed against
**EN 81-20 / EN 81-50** acceptance criteria.

A web app was chosen over a native mobile app because:

- **Zero install** — the inspector just opens a URL on the phone.
- **Cross-platform** — works on iOS Safari and Android Chrome.
- **Easy updates** — fix once, deployed for everyone instantly.
- Modern browsers expose the phone's accelerometer/gyroscope through the
  `DeviceMotion` API, which is sufficient for ride-quality measurement.

## Running it

Any static HTTP host works. Two quick options:

```bash
# 1. Python's built-in server, then open the LAN URL on your phone:
python3 -m http.server 8080

# 2. Or push this directory to GitHub Pages — that's it.
```

The phone and the server need to be on the same network. iOS requires HTTPS
for sensor access in some configurations; GitHub Pages serves over HTTPS.

> **iOS note:** Safari requires an explicit permission grant for motion
> sensors. The first time you tap *Start*, Safari will prompt for access.

## Procedure (exactly as in the UI)

1. Place the phone **flat on the lift floor**, screen up, near the centre of
   the car. Do not hold it.
2. Tap **Start recording**. Wait for the red *RECORDING* banner.
3. Initiate the lift cycle (single floor-to-floor run).
4. When the car stops and the doors begin to open, tap **Stop & analyse**.
5. Review the parameters, graphs and EN 81 compliance table.
6. Tap **Download PDF report** for the formal record, or **Download CSV** to
   keep the raw time-series for offline analysis.

## What gets measured

All readings are derived from the phone's accelerometer (gravity-included
channel) at the device's native sample rate (typically 50–100 Hz). After the
ride is captured, the analysis pipeline:

1. Estimates the gravity vector from the first ~1 s of still data.
2. Projects every sample onto / orthogonal to gravity to separate vertical
   and horizontal acceleration components.
3. Integrates the vertical signal (trapezoidal, with linear drift correction
   so both endpoints sit at rest) to obtain velocity, and again to obtain
   displacement.
4. Differentiates the smoothed vertical acceleration to obtain jerk.
5. Locates the constant-velocity plateau (longest interval with
   `|a| < 0.15 m/s²`) for vibration analysis.
6. Computes sliding 1-second peak-to-peak and A95 vibration metrics over the
   plateau.

### Parameters reported

| Parameter | Reference |
| --- | --- |
| Maximum acceleration | EN 81-20 §5.12.1.3 (≤ 1.5 m/s²) |
| Maximum deceleration | EN 81-20 §5.12.1.3 (≤ 1.5 m/s²) |
| Maximum jerk | ISO 18738 comfort (≤ 2.0 m/s³) |
| Vertical vibration P-P | ISO 18738 (≤ 0.20 m/s²) |
| Vertical vibration A95 | ISO 18738 (≤ 0.15 m/s²) |
| Horizontal vibration P-P | ISO 18738 (≤ 0.15 m/s²) |
| Horizontal vibration A95 | ISO 18738 (≤ 0.12 m/s²) |
| Speed conformity vs rated | EN 81-20 §5.12.1.1 (±5 %) |
| Net travel distance | informational |
| Total ride duration | informational |

The compliance limits above match the values most commonly cited under
EN 81-20 / ISO 18738 for passenger lifts; they are advisory and the
responsible engineer is expected to confirm the final pass/fail decision.

### Graphs

The Graphs tab plots:

- Vertical acceleration (a_v) vs time
- Velocity vs time
- Displacement vs time
- Jerk vs time
- Horizontal acceleration magnitude vs time

The same graphs are embedded in the PDF report.

## Files

```
index.html      Mobile-friendly single-page UI
styles.css      Theme & layout
app.js          UI controller, sensor capture
analysis.js     Signal processing, KPI & compliance computation
report.js      PDF report generator (jsPDF)
```

External libraries (loaded from a public CDN at runtime):

- [Chart.js](https://www.chartjs.org/) v4 — graphs
- [jsPDF](https://github.com/parallax/jsPDF) v2 — PDF export

## Caveats

- Phone accelerometers are consumer-grade. The numbers are good enough for
  routine ride-quality verification but a calibrated accelerometer is still
  the reference for certification work.
- The phone must be stationary on the floor before *Start*. The gravity
  estimate (first ~1 s) is used to define "vertical".
- Sample rate is bounded by the browser's `devicemotion` event delivery,
  typically 50–100 Hz. The mean rate is shown on the results screen.
