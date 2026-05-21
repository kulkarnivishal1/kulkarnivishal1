/*
 * Portal Lift Tester Software - analysis module
 *
 * Computes vertical acceleration, velocity, displacement, jerk and
 * vibration parameters from raw DeviceMotion samples. Limits referenced
 * to EN 81-20 / EN 81-50 ride-quality clauses and ISO 18738 practice
 * for passenger lifts.
 */

const G_STANDARD = 9.80665; // m/s^2

/**
 * Estimate the gravity vector from the first `windowSec` seconds of the
 * raw (gravity-included) signal while the car is still stationary.
 */
function estimateGravity(samples, windowSec = 1.0) {
  const t0 = samples[0].t;
  const tEnd = t0 + windowSec;
  let sx = 0, sy = 0, sz = 0, n = 0;
  for (const s of samples) {
    if (s.t > tEnd) break;
    sx += s.gx; sy += s.gy; sz += s.gz; n++;
  }
  if (n === 0) return { x: 0, y: 0, z: G_STANDARD, mag: G_STANDARD };
  const gx = sx / n, gy = sy / n, gz = sz / n;
  const mag = Math.hypot(gx, gy, gz);
  return { x: gx, y: gy, z: gz, mag: mag || G_STANDARD };
}

/**
 * Trapezoidal integration with non-uniform time steps.
 */
function integrate(t, y) {
  const out = new Float64Array(t.length);
  out[0] = 0;
  for (let i = 1; i < t.length; i++) {
    const dt = t[i] - t[i - 1];
    out[i] = out[i - 1] + 0.5 * (y[i] + y[i - 1]) * dt;
  }
  return out;
}

/**
 * Central-difference derivative with non-uniform time steps.
 */
function differentiate(t, y) {
  const out = new Float64Array(t.length);
  for (let i = 1; i < t.length - 1; i++) {
    out[i] = (y[i + 1] - y[i - 1]) / (t[i + 1] - t[i - 1] || 1e-9);
  }
  out[0] = out[1] || 0;
  out[t.length - 1] = out[t.length - 2] || 0;
  return out;
}

/** Simple causal moving-average filter, window length `w` samples. */
function movingAverage(arr, w) {
  if (w <= 1) return arr.slice();
  const out = new Float64Array(arr.length);
  let sum = 0;
  const half = Math.floor(w / 2);
  for (let i = 0; i < arr.length; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(arr.length - 1, i + half);
    let s = 0;
    for (let k = lo; k <= hi; k++) s += arr[k];
    out[i] = s / (hi - lo + 1);
  }
  return out;
}

/**
 * Locate the constant-velocity plateau: the longest contiguous interval
 * where |vertical acceleration| stays below a small threshold.
 */
function findConstantVelocityWindow(t, aVert, threshold = 0.15) {
  let bestStart = 0, bestEnd = 0, bestLen = 0;
  let curStart = -1;
  for (let i = 0; i < t.length; i++) {
    if (Math.abs(aVert[i]) < threshold) {
      if (curStart < 0) curStart = i;
    } else if (curStart >= 0) {
      const len = i - curStart;
      if (len > bestLen) { bestLen = len; bestStart = curStart; bestEnd = i; }
      curStart = -1;
    }
  }
  if (curStart >= 0) {
    const len = t.length - curStart;
    if (len > bestLen) { bestLen = len; bestStart = curStart; bestEnd = t.length - 1; }
  }
  if (bestLen < 4) return null;
  return { startIdx: bestStart, endIdx: bestEnd };
}

/**
 * Peak-to-peak in a sliding 1 s window over a slice of signal.
 * Returns the max peak-to-peak and the A95 (95th percentile).
 */
function slidingPeakToPeak(t, sig, startIdx, endIdx, windowSec = 1.0) {
  const peaks = [];
  let j = startIdx;
  for (let i = startIdx; i <= endIdx; i++) {
    while (j <= endIdx && t[j] - t[i] < windowSec) j++;
    if (j - 1 <= i) continue;
    let mn = Infinity, mx = -Infinity;
    for (let k = i; k < j; k++) {
      if (sig[k] < mn) mn = sig[k];
      if (sig[k] > mx) mx = sig[k];
    }
    peaks.push(mx - mn);
  }
  if (!peaks.length) return { max: 0, a95: 0 };
  peaks.sort((a, b) => a - b);
  const a95 = peaks[Math.floor(peaks.length * 0.95)] || peaks[peaks.length - 1];
  return { max: peaks[peaks.length - 1], a95 };
}

/**
 * Phase analysis: identify acceleration / constant / deceleration phases.
 */
function detectPhases(t, aVert, velocity, threshold = 0.15) {
  const accelMask = aVert.map(a => Math.abs(a) >= threshold);
  let accelStart = -1, accelEnd = -1, decelStart = -1, decelEnd = -1;
  for (let i = 0; i < t.length; i++) {
    if (accelMask[i] && accelStart < 0) { accelStart = i; }
    if (accelMask[i]) accelEnd = i;
  }
  // First continuous block from accelStart is acceleration, last is deceleration.
  // Find end of first contiguous block:
  if (accelStart >= 0) {
    for (let i = accelStart; i < t.length; i++) {
      if (!accelMask[i]) { accelEnd = i - 1; break; }
    }
  }
  // Find start of last contiguous block (deceleration):
  for (let i = t.length - 1; i >= 0; i--) {
    if (accelMask[i] && decelEnd < 0) decelEnd = i;
    if (decelEnd >= 0 && !accelMask[i]) { decelStart = i + 1; break; }
  }
  return { accelStart, accelEnd, decelStart, decelEnd };
}

/**
 * Run the full analysis pipeline on captured DeviceMotion samples.
 *
 * samples: array of { t (s), gx, gy, gz, rx, ry, rz }
 *   where gx/gy/gz = accelerationIncludingGravity components (m/s^2)
 *         rx/ry/rz = rotationRate components (deg/s, optional)
 */
function analyseRide(samples) {
  if (!samples || samples.length < 20) {
    throw new Error("Not enough samples (need at least ~20).");
  }

  // Re-base time to start at 0.
  const t0 = samples[0].t;
  const t = new Float64Array(samples.length);
  for (let i = 0; i < samples.length; i++) t[i] = samples[i].t - t0;

  // Estimate gravity from the first 1 s window.
  const gravity = estimateGravity(samples, Math.min(1.0, t[t.length - 1] / 4));
  const gMag = gravity.mag || G_STANDARD;
  const gHat = { x: gravity.x / gMag, y: gravity.y / gMag, z: gravity.z / gMag };

  // Project each sample onto / orthogonal to gravity.
  const aVertRaw = new Float64Array(samples.length);
  const aHoriz   = new Float64Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const dot = s.gx * gHat.x + s.gy * gHat.y + s.gz * gHat.z;
    // Vertical component (gravity-removed). Up = positive movement against gravity.
    // Note: gHat points along gravity (i.e. downward in world). To make upward motion positive,
    // we flip sign so that motion against gravity registers as positive vertical acceleration.
    aVertRaw[i] = -(dot - gMag);
    const hx = s.gx - dot * gHat.x;
    const hy = s.gy - dot * gHat.y;
    const hz = s.gz - dot * gHat.z;
    aHoriz[i] = Math.hypot(hx, hy, hz);
  }

  // Light smoothing of vertical acceleration (sample-rate aware ~80 ms).
  const dtMean = t[t.length - 1] / (t.length - 1);
  const smoothW = Math.max(3, Math.round(0.08 / Math.max(dtMean, 1e-3)));
  const aVert = movingAverage(aVertRaw, smoothW);

  // Velocity (integrate vertical accel). Apply linear drift removal so
  // both endpoints are at rest.
  let velocity = integrate(t, aVert);
  const vEnd = velocity[velocity.length - 1];
  const tEnd = t[t.length - 1] || 1;
  for (let i = 0; i < velocity.length; i++) velocity[i] -= (vEnd * t[i]) / tEnd;

  // Displacement.
  const displacement = integrate(t, velocity);

  // Jerk.
  const jerk = differentiate(t, aVert);

  // Phase detection.
  const phases = detectPhases(t, aVert, velocity, 0.15);

  // Determine direction by net displacement.
  const netDisp = displacement[displacement.length - 1];
  const direction = netDisp >= 0 ? "UP" : "DOWN";

  // KPI computations.
  const maxAccel  = Math.max(...aVert);
  const minAccel  = Math.min(...aVert);
  const maxAbsAcc = Math.max(Math.abs(maxAccel), Math.abs(minAccel));

  const maxVel = Math.max(...velocity.map(Math.abs));
  const maxJerk = Math.max(...jerk.map(Math.abs));

  // Constant velocity window for vibration analysis.
  const cv = findConstantVelocityWindow(t, aVert, 0.15);
  let vertVibPP = 0, vertVibA95 = 0, horizVibPP = 0, horizVibA95 = 0;
  let cvStartT = null, cvEndT = null;
  if (cv) {
    cvStartT = t[cv.startIdx];
    cvEndT = t[cv.endIdx];
    const vert = slidingPeakToPeak(t, aVert,  cv.startIdx, cv.endIdx, 1.0);
    const hor  = slidingPeakToPeak(t, aHoriz, cv.startIdx, cv.endIdx, 1.0);
    vertVibPP = vert.max; vertVibA95 = vert.a95;
    horizVibPP = hor.max; horizVibA95 = hor.a95;
  }

  // Acceleration / deceleration magnitudes.
  let accelMag = 0, decelMag = 0;
  if (phases.accelStart >= 0 && phases.accelEnd > phases.accelStart) {
    for (let i = phases.accelStart; i <= phases.accelEnd; i++) {
      accelMag = Math.max(accelMag, Math.abs(aVert[i]));
    }
  }
  if (phases.decelStart >= 0 && phases.decelEnd > phases.decelStart) {
    for (let i = phases.decelStart; i <= phases.decelEnd; i++) {
      decelMag = Math.max(decelMag, Math.abs(aVert[i]));
    }
  }

  const durationS = t[t.length - 1];
  const sampleRate = samples.length / (durationS || 1);

  return {
    t, aVert, velocity, displacement, jerk, aHoriz,
    samples,
    gravity,
    phases,
    kpi: {
      duration_s: durationS,
      sample_rate_hz: sampleRate,
      sample_count: samples.length,
      direction,
      net_displacement_m: Math.abs(netDisp),
      max_velocity_mps: maxVel,
      max_acceleration_mps2: accelMag || maxAbsAcc,
      max_deceleration_mps2: decelMag || maxAbsAcc,
      max_jerk_mps3: maxJerk,
      vert_vibration_pp_mps2: vertVibPP,
      vert_vibration_a95_mps2: vertVibA95,
      horiz_vibration_pp_mps2: horizVibPP,
      horiz_vibration_a95_mps2: horizVibA95,
      constant_velocity_start_s: cvStartT,
      constant_velocity_end_s: cvEndT,
    }
  };
}

/**
 * EN 81-20 / ISO 18738 acceptance limits for passenger lifts.
 * Returns one row per parameter for the compliance table.
 */
function buildComplianceRows(kpi, ratedSpeed) {
  const rows = [];
  const add = (name, measured, unit, limit, comparator, ref) => {
    let result = "INFO", cls = "info";
    if (limit !== null && measured !== null && !Number.isNaN(measured)) {
      const ok = comparator(measured, limit);
      result = ok ? "PASS" : "FAIL";
      cls = ok ? "pass" : "fail";
    }
    rows.push({ name, measured, unit, limit, result, cls, ref });
  };

  // Max acceleration (EN 81-20 5.12.1.3): <= 1.5 m/s^2 nominal, hard limit per emergency stops.
  add("Maximum acceleration", kpi.max_acceleration_mps2, "m/s²", 1.5,
      (m, l) => m <= l, "EN 81-20 §5.12.1.3");
  add("Maximum deceleration", kpi.max_deceleration_mps2, "m/s²", 1.5,
      (m, l) => m <= l, "EN 81-20 §5.12.1.3");

  // Max jerk (commonly accepted comfort criterion, EN 81 informative / ISO 18738).
  add("Maximum jerk", kpi.max_jerk_mps3, "m/s³", 2.0,
      (m, l) => m <= l, "ISO 18738 (comfort)");

  // Vertical vibration peak-to-peak during constant velocity (ISO 18738 < 0.20 m/s^2 PP).
  add("Vertical vibration (peak-to-peak)", kpi.vert_vibration_pp_mps2, "m/s²", 0.20,
      (m, l) => m <= l, "ISO 18738");
  add("Vertical vibration A95", kpi.vert_vibration_a95_mps2, "m/s²", 0.15,
      (m, l) => m <= l, "ISO 18738");

  // Horizontal vibration peak-to-peak (ISO 18738 < 0.15 m/s^2 PP).
  add("Horizontal vibration (peak-to-peak)", kpi.horiz_vibration_pp_mps2, "m/s²", 0.15,
      (m, l) => m <= l, "ISO 18738");
  add("Horizontal vibration A95", kpi.horiz_vibration_a95_mps2, "m/s²", 0.12,
      (m, l) => m <= l, "ISO 18738");

  // Rated speed conformity (within ±5% of rated, EN 81-20 §5.12.1.1).
  if (ratedSpeed && ratedSpeed > 0) {
    const dev = Math.abs(kpi.max_velocity_mps - ratedSpeed) / ratedSpeed;
    add("Speed conformity vs rated", dev * 100, "%", 5.0,
        (m, l) => m <= l, "EN 81-20 §5.12.1.1 (±5%)");
  }

  // Net travel distance and duration are informational.
  add("Travel distance (measured)", kpi.net_displacement_m, "m", null, null, "Informational");
  add("Total ride duration", kpi.duration_s, "s", null, null, "Informational");
  add("Mean sample rate", kpi.sample_rate_hz, "Hz", null, null, "Informational");

  return rows;
}

window.PortalAnalysis = { analyseRide, buildComplianceRows, G_STANDARD };
