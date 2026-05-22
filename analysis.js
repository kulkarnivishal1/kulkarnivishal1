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
 * Resample a non-uniformly sampled signal to a uniform grid via linear
 * interpolation. Returns { fs, y } where fs is the resulting sample rate.
 */
function resampleUniform(t, y, startIdx, endIdx, targetFs) {
  const t0 = t[startIdx];
  const t1 = t[endIdx];
  const dur = t1 - t0;
  if (dur <= 0) return { fs: targetFs, y: new Float64Array(0) };
  const N = Math.max(4, Math.floor(dur * targetFs));
  const out = new Float64Array(N);
  const dt = dur / (N - 1);
  let j = startIdx;
  for (let i = 0; i < N; i++) {
    const tt = t0 + i * dt;
    while (j < endIdx && t[j + 1] < tt) j++;
    const t_a = t[j], t_b = t[j + 1];
    const y_a = y[j], y_b = y[j + 1];
    const w = (tt - t_a) / (t_b - t_a || 1e-9);
    out[i] = y_a + w * (y_b - y_a);
  }
  return { fs: (N - 1) / dur, y: out };
}

/**
 * In-place iterative radix-2 Cooley-Tukey FFT. Length must be a power of 2.
 */
function fftRadix2(re, im) {
  const N = re.length;
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let tmp = re[i]; re[i] = re[j]; re[j] = tmp;
      tmp = im[i]; im[i] = im[j]; im[j] = tmp;
    }
  }
  for (let size = 2; size <= N; size <<= 1) {
    const half = size >> 1;
    const angStep = -2 * Math.PI / size;
    for (let i = 0; i < N; i += size) {
      for (let k = 0; k < half; k++) {
        const ang = angStep * k;
        const wRe = Math.cos(ang), wIm = Math.sin(ang);
        const a = i + k, b = i + k + half;
        const tRe = wRe * re[b] - wIm * im[b];
        const tIm = wRe * im[b] + wIm * re[b];
        re[b] = re[a] - tRe;
        im[b] = im[a] - tIm;
        re[a] += tRe;
        im[a] += tIm;
      }
    }
  }
}

/**
 * One-sided amplitude spectrum (m/s² peak) of a real signal sampled at fs.
 * Applies a Hann window and zero-pads to the next power of 2.
 */
function magnitudeSpectrum(signal, fs) {
  const N0 = signal.length;
  if (N0 < 8) return { freqs: new Float64Array(0), mags: new Float64Array(0) };
  let N = 1; while (N < N0) N <<= 1;
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  let mean = 0;
  for (let i = 0; i < N0; i++) mean += signal[i];
  mean /= N0;
  // Hann window + DC removal.
  let winSum = 0;
  for (let i = 0; i < N0; i++) {
    const w = 0.5 * (1 - Math.cos(2 * Math.PI * i / (N0 - 1)));
    re[i] = (signal[i] - mean) * w;
    winSum += w;
  }
  fftRadix2(re, im);
  const half = N / 2;
  const freqs = new Float64Array(half);
  const mags  = new Float64Array(half);
  // Amplitude correction: divide by sum-of-window, multiply by 2 (one-sided).
  const norm = 2 / (winSum || 1);
  for (let k = 0; k < half; k++) {
    freqs[k] = k * fs / N;
    mags[k] = Math.hypot(re[k], im[k]) * norm;
  }
  return { freqs, mags };
}

/** Return the top-K local maxima of a magnitude spectrum above `minFreq`. */
function topPeaks(freqs, mags, k = 3, minFreq = 0.5) {
  const peaks = [];
  for (let i = 1; i < mags.length - 1; i++) {
    if (freqs[i] < minFreq) continue;
    if (mags[i] > mags[i - 1] && mags[i] > mags[i + 1]) {
      peaks.push({ f: freqs[i], m: mags[i] });
    }
  }
  peaks.sort((a, b) => b.m - a.m);
  return peaks.slice(0, k);
}

/**
 * Detect the canonical 9-segment lift ride profile (matching the textbook
 * diagram: pre-start, jerk-in accel, constant accel, jerk-out accel,
 * constant velocity, jerk-in decel, constant decel, jerk-out decel,
 * levelling/stop). Returns transition times and a labelled phase list.
 *
 *   aVertSigned : signed vertical acceleration (positive = motion in
 *                 ride direction). For an UP ride this is +ve at start,
 *                 -ve at end. For a DOWN ride the analyser flips the
 *                 sign so the same logic applies.
 *   velSigned   : signed velocity (always non-negative once flipped).
 */
function detectRidePhases(t, aVertSigned, velSigned) {
  const N = t.length;
  if (N < 20) return { transitions: [], phases: [] };

  const motion = 0.08;  // m/s² threshold for "the car is no longer at rest"
  const plateau = 0.85; // fraction-of-peak used to delimit constant-accel band

  // Locate the maximum acceleration (positive) in the first 60 % of the run
  // and the maximum deceleration (negative) in the last 60 %.
  const midA = Math.floor(N * 0.6);
  const midD = Math.floor(N * 0.4);
  let aPeakIdx = 0, aPeakVal = 0;
  for (let i = 0; i < midA; i++) if (aVertSigned[i] > aPeakVal) { aPeakVal = aVertSigned[i]; aPeakIdx = i; }
  let dPeakIdx = N - 1, dPeakVal = 0;
  for (let i = midD; i < N; i++) if (aVertSigned[i] < dPeakVal) { dPeakVal = aVertSigned[i]; dPeakIdx = i; }

  const aThresh = plateau * aPeakVal;
  const dThresh = plateau * dPeakVal;

  // Walk the signal to identify each transition. We clamp every index so
  // that even partially-formed rides still yield a monotonic phase table.
  const clamp = i => Math.max(0, Math.min(N - 1, i));

  let i0 = 0; while (i0 < N && Math.abs(aVertSigned[i0]) < motion) i0++;
  let i1 = i0; while (i1 < aPeakIdx && aVertSigned[i1] < aThresh) i1++;
  let i2 = aPeakIdx; while (i2 < N && aVertSigned[i2] > aThresh) i2++;
  let i3 = i2; while (i3 < N && aVertSigned[i3] > motion) i3++;
  let i4 = i3; while (i4 < N && aVertSigned[i4] > -motion) i4++;
  let i5 = i4; while (i5 < dPeakIdx && aVertSigned[i5] > dThresh) i5++;
  let i6 = dPeakIdx; while (i6 < N && aVertSigned[i6] < dThresh) i6++;
  let i7 = i6; while (i7 < N && aVertSigned[i7] < -motion) i7++;

  const idx = [0, i0, i1, i2, i3, i4, i5, i6, i7, N - 1].map(clamp);
  // Enforce strictly non-decreasing transitions in case the heuristic
  // landed an out-of-order index on a noisy signal.
  for (let k = 1; k < idx.length; k++) if (idx[k] < idx[k - 1]) idx[k] = idx[k - 1];

  const meanV = (a, b) => {
    if (b <= a) return 0;
    let s = 0; for (let i = a; i <= b; i++) s += velSigned[i];
    return s / (b - a + 1);
  };
  const meanA = (a, b) => {
    if (b <= a) return 0;
    let s = 0; for (let i = a; i <= b; i++) s += aVertSigned[i];
    return s / (b - a + 1);
  };

  const labels = [
    "Pre-start (at rest)",
    "Acceleration jerk-in",
    "Constant acceleration",
    "Acceleration jerk-out",
    "Constant velocity",
    "Deceleration jerk-in",
    "Constant deceleration",
    "Deceleration jerk-out",
    "Levelling / stop",
  ];

  const phases = [];
  for (let k = 0; k < 9; k++) {
    const a = idx[k], b = idx[k + 1];
    phases.push({
      num: k + 1,
      label: labels[k],
      i_start: a,
      i_end: b,
      t_start: t[a],
      t_end: t[b],
      duration_s: t[b] - t[a],
      mean_velocity_mps: meanV(a, b),
      mean_acceleration_mps2: meanA(a, b),
    });
  }
  return { transitions: idx, phases };
}
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

  // Determine direction by net displacement, then build sign-normalised
  // velocity & acceleration so the ride-profile detector can use a single
  // (always positive) reference.
  const netDisp = displacement[displacement.length - 1];
  const direction = netDisp >= 0 ? "UP" : "DOWN";
  const sign = netDisp >= 0 ? 1 : -1;
  const aSigned = new Float64Array(t.length);
  const vSigned = new Float64Array(t.length);
  for (let i = 0; i < t.length; i++) {
    aSigned[i] = sign * aVert[i];
    vSigned[i] = sign * velocity[i];
  }
  const rideProfile = detectRidePhases(t, aSigned, vSigned);

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
  let spectrum = null;
  let dominantVert = [], dominantHoriz = [];
  if (cv) {
    cvStartT = t[cv.startIdx];
    cvEndT = t[cv.endIdx];
    const vert = slidingPeakToPeak(t, aVert,  cv.startIdx, cv.endIdx, 1.0);
    const hor  = slidingPeakToPeak(t, aHoriz, cv.startIdx, cv.endIdx, 1.0);
    vertVibPP = vert.max; vertVibA95 = vert.a95;
    horizVibPP = hor.max; horizVibA95 = hor.a95;

    // FFT spectrum over the constant-velocity plateau.
    const targetFs = Math.max(50, Math.min(200, Math.round(1 / Math.max(dtMean, 1e-3))));
    const rsV = resampleUniform(t, aVert,  cv.startIdx, cv.endIdx, targetFs);
    const rsH = resampleUniform(t, aHoriz, cv.startIdx, cv.endIdx, targetFs);
    if (rsV.y.length >= 32) {
      const specV = magnitudeSpectrum(rsV.y, rsV.fs);
      const specH = magnitudeSpectrum(rsH.y, rsH.fs);
      // Truncate to the most useful range (0.5 .. 40 Hz) for lift mechanics.
      const fMax = 40;
      let cut = specV.freqs.length;
      for (let i = 0; i < specV.freqs.length; i++) {
        if (specV.freqs[i] > fMax) { cut = i; break; }
      }
      spectrum = {
        fs: rsV.fs,
        freqs: Array.from(specV.freqs.slice(0, cut)),
        magsVert: Array.from(specV.mags.slice(0, cut)),
        magsHoriz: Array.from(specH.mags.slice(0, cut)),
      };
      dominantVert  = topPeaks(specV.freqs.slice(0, cut), specV.mags.slice(0, cut), 3, 0.5);
      dominantHoriz = topPeaks(specH.freqs.slice(0, cut), specH.mags.slice(0, cut), 3, 0.5);
    }
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
    aSigned, vSigned,
    samples,
    gravity,
    phases,
    rideProfile,
    spectrum,
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
      dominant_vert_hz: dominantVert,
      dominant_horiz_hz: dominantHoriz,
    }
  };
}

/**
 * EN 81-20 / ISO 18738 acceptance limits.
 *
 * `liftType` is "hydraulic" or "traction". Hydraulic lifts run at lower
 * speeds and are normally specified to tighter acceleration / jerk limits
 * for ride comfort; vibration limits per ISO 18738 are the same for both.
 */
function getAcceptanceLimits(liftType = "hydraulic") {
  if (liftType === "hydraulic") {
    return {
      maxAccel: 1.0,
      maxDecel: 1.0,
      maxJerk:  1.3,
      vertPP:   0.20,
      vertA95:  0.15,
      horizPP:  0.15,
      horizA95: 0.12,
      ratedSpeedCap: 1.0,
      maxAccelRef: "EN 81-20 §5.12.1.3 (hydraulic, ≤ 1.0 m/s²)",
      maxJerkRef:  "ISO 18738 / hydraulic comfort (≤ 1.3 m/s³)",
    };
  }
  // traction
  return {
    maxAccel: 1.5,
    maxDecel: 1.5,
    maxJerk:  2.0,
    vertPP:   0.20,
    vertA95:  0.15,
    horizPP:  0.15,
    horizA95: 0.12,
    ratedSpeedCap: null,
    maxAccelRef: "EN 81-20 §5.12.1.3 (traction, ≤ 1.5 m/s²)",
    maxJerkRef:  "ISO 18738 comfort (≤ 2.0 m/s³)",
  };
}

function buildComplianceRows(kpi, ratedSpeed, liftType = "hydraulic") {
  const L = getAcceptanceLimits(liftType);
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

  add("Maximum acceleration", kpi.max_acceleration_mps2, "m/s²", L.maxAccel,
      (m, l) => m <= l, L.maxAccelRef);
  add("Maximum deceleration", kpi.max_deceleration_mps2, "m/s²", L.maxDecel,
      (m, l) => m <= l, L.maxAccelRef);
  add("Maximum jerk",         kpi.max_jerk_mps3,          "m/s³", L.maxJerk,
      (m, l) => m <= l, L.maxJerkRef);

  add("Vertical vibration (peak-to-peak)", kpi.vert_vibration_pp_mps2, "m/s²", L.vertPP,
      (m, l) => m <= l, "ISO 18738");
  add("Vertical vibration A95",            kpi.vert_vibration_a95_mps2, "m/s²", L.vertA95,
      (m, l) => m <= l, "ISO 18738");
  add("Horizontal vibration (peak-to-peak)", kpi.horiz_vibration_pp_mps2, "m/s²", L.horizPP,
      (m, l) => m <= l, "ISO 18738");
  add("Horizontal vibration A95",            kpi.horiz_vibration_a95_mps2, "m/s²", L.horizA95,
      (m, l) => m <= l, "ISO 18738");

  if (ratedSpeed && ratedSpeed > 0) {
    const dev = Math.abs(kpi.max_velocity_mps - ratedSpeed) / ratedSpeed;
    add("Speed conformity vs rated", dev * 100, "%", 5.0,
        (m, l) => m <= l, "EN 81-20 §5.12.1.1 (±5 %)");
  }
  if (liftType === "hydraulic" && L.ratedSpeedCap !== null) {
    add("Rated-speed cap (hydraulic)", kpi.max_velocity_mps, "m/s", L.ratedSpeedCap,
        (m, l) => m <= l, "EN 81-20 (hydraulic ≤ 1.0 m/s)");
  }

  add("Travel distance (measured)", kpi.net_displacement_m, "m", null, null, "Informational");
  add("Total ride duration",        kpi.duration_s,        "s", null, null, "Informational");
  add("Mean sample rate",           kpi.sample_rate_hz,   "Hz", null, null, "Informational");

  return rows;
}

window.PortalAnalysis = { analyseRide, buildComplianceRows, getAcceptanceLimits, G_STANDARD };
