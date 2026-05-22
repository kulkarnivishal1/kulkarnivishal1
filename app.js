/*
 * Portal Lift Tester Software - main controller
 *
 * Wires the UI, manages DeviceMotion subscription, records samples,
 * triggers analysis on stop, renders results / graphs / report.
 */

(() => {
  const $ = sel => document.querySelector(sel);

  const setupPanel   = $("#setupPanel");
  const livePanel    = $("#livePanel");
  const resultsPanel = $("#resultsPanel");

  const startBtn = $("#startBtn");
  const stopBtn  = $("#stopBtn");
  const stopFloating = $("#stopFloating");
  const pdfBtn   = $("#pdfBtn");
  const csvBtn   = $("#csvBtn");
  const newBtn   = $("#newBtn");

  const sensorDot  = $("#sensorDot");
  const sensorText = $("#sensorText");

  const liveClock = $("#liveClock");
  const liveRate  = $("#liveRate");
  const liveAz    = $("#liveAz");
  const liveVel   = $("#liveVel");
  const liveCount = $("#liveCount");

  const state = {
    recording: false,
    samples: [],
    startMs: 0,
    sensorReady: false,
    chart: {},
    result: null,
    meta: null,
  };

  // ---------- Sensor handling ----------

  function setSensorStatus(level, msg) {
    sensorDot.className = "dot";
    if (level) sensorDot.classList.add(level);
    sensorText.textContent = msg;
  }

  function onMotion(e) {
    if (!state.recording) return;
    const now = performance.now();
    const t = (now - state.startMs) / 1000;
    const aG = e.accelerationIncludingGravity;
    const aN = e.acceleration;
    let gx, gy, gz, source;
    if (aG && aG.x !== null && aG.x !== undefined) {
      gx = aG.x; gy = aG.y ?? 0; gz = aG.z ?? 0; source = "gIncl";
    } else if (aN && aN.x !== null && aN.x !== undefined) {
      // Some Android browsers expose only the gravity-removed channel.
      // The user is instructed to place the phone flat on the floor,
      // so gravity is along +Z in the device frame -> add 9.80665 to z.
      gx = aN.x; gy = aN.y ?? 0; gz = (aN.z ?? 0) + 9.80665; source = "gSynth";
    } else {
      return;
    }
    state.lastSource = source;
    const rot = e.rotationRate || {};
    state.samples.push({
      t,
      gx, gy, gz,
      rx: rot.alpha ?? 0, ry: rot.beta ?? 0, rz: rot.gamma ?? 0,
    });

    // Live preview, updated every sample so the user can see data is flowing.
    const n = state.samples.length;
    liveCount.textContent = n;
    if (n % 3 === 0) {
      liveAz.textContent = (gz || 0).toFixed(2);
      liveRate.textContent = (n / Math.max(t, 0.05)).toFixed(0);
    }
  }

  async function requestMotionPermission() {
    // iOS 13+ requires explicit permission.
    if (typeof DeviceMotionEvent !== "undefined" &&
        typeof DeviceMotionEvent.requestPermission === "function") {
      try {
        const r = await DeviceMotionEvent.requestPermission();
        if (r !== "granted") {
          setSensorStatus("err", "Motion permission denied.");
          return false;
        }
      } catch (err) {
        setSensorStatus("err", "Cannot request motion permission: " + err.message);
        return false;
      }
    }
    return true;
  }

  function checkSensorOnce() {
    if (typeof DeviceMotionEvent === "undefined") {
      setSensorStatus("err", "DeviceMotion API not available on this device.");
      return;
    }
    let received = false;
    const probe = e => {
      if ((e.accelerationIncludingGravity?.x ?? null) !== null) {
        received = true;
        window.removeEventListener("devicemotion", probe);
        setSensorStatus("ok", "Sensors detected — ready to record.");
        state.sensorReady = true;
      }
    };
    window.addEventListener("devicemotion", probe);
    setTimeout(() => {
      if (!received) {
        window.removeEventListener("devicemotion", probe);
        setSensorStatus("warn", "Tap Start to grant motion access (iOS) or to begin streaming sensor data.");
      }
    }, 1200);
  }

  // ---------- Recording control ----------

  async function startRecording() {
    if (state.recording) return;
    const ok = await requestMotionPermission();
    if (!ok) return;

    state.samples = [];
    state.startMs = performance.now();
    state.recording = true;
    state.lastSource = null;
    clearError();

    window.addEventListener("devicemotion", onMotion);

    setupPanel.classList.add("hidden");
    resultsPanel.classList.add("hidden");
    livePanel.classList.remove("hidden");
    stopFloating.classList.remove("hidden");
    stopBtn.disabled = false;
    startBtn.disabled = true;

    // After 2 s with no samples, warn the inspector so they're not waiting in vain.
    state.noDataTimer = setTimeout(() => {
      if (state.recording && state.samples.length === 0) {
        showLiveWarning(
          "No sensor data has arrived yet. On iOS, make sure you tapped 'Allow' on the motion prompt. " +
          "Open the page over HTTPS (e.g. the GitHub Pages URL) — motion sensors are blocked on plain HTTP."
        );
      }
    }, 2000);

    // Live clock.
    state.clockTimer = setInterval(() => {
      const t = (performance.now() - state.startMs) / 1000;
      const mm = String(Math.floor(t / 60)).padStart(2, "0");
      const ss = String(Math.floor(t % 60)).padStart(2, "0");
      const d = String(Math.floor((t * 10) % 10));
      liveClock.textContent = `${mm}:${ss}.${d}`;

      // Rolling-window velocity estimate. We can't know the true gravity
      // direction live (the phone may be tilted), so we centre the rolling
      // window's vertical-axis mean to zero before integrating. This keeps
      // the display sensible without claiming high accuracy.
      if (state.samples.length > 20) {
        const tail = state.samples.slice(-Math.min(state.samples.length, 120));
        const gx0 = tail.reduce((s, x) => s + x.gx, 0) / tail.length;
        const gy0 = tail.reduce((s, x) => s + x.gy, 0) / tail.length;
        const gz0 = tail.reduce((s, x) => s + x.gz, 0) / tail.length;
        const mag = Math.hypot(gx0, gy0, gz0) || 9.80665;
        const ux = gx0 / mag, uy = gy0 / mag, uz = gz0 / mag;
        let v = 0;
        for (let i = 1; i < tail.length; i++) {
          const dt = tail[i].t - tail[i - 1].t;
          const dotA = tail[i].gx * ux + tail[i].gy * uy + tail[i].gz * uz;
          const dotB = tail[i - 1].gx * ux + tail[i - 1].gy * uy + tail[i - 1].gz * uz;
          const aProj = -(((dotA + dotB) / 2) - mag);
          v += aProj * dt;
        }
        liveVel.textContent = Math.abs(v).toFixed(2);
      }
    }, 100);
  }

  function stopRecording() {
    if (!state.recording) return;
    state.recording = false;
    window.removeEventListener("devicemotion", onMotion);
    clearInterval(state.clockTimer);
    clearTimeout(state.noDataTimer);
    stopBtn.disabled = true;
    startBtn.disabled = false;
    stopFloating.classList.add("hidden");

    if (state.samples.length < 20) {
      livePanel.classList.add("hidden");
      setupPanel.classList.remove("hidden");
      showSetupError(
        `Stop pressed but only ${state.samples.length} sensor sample(s) were captured. ` +
        "The phone's motion sensors didn't produce data during the recording. " +
        "Checklist: (1) open the app over HTTPS (the GitHub Pages URL — plain http:// is blocked on iOS); " +
        "(2) on the first tap of Start, allow motion access when iOS prompts; " +
        "(3) verify the device is a phone (desktop browsers usually don't expose DeviceMotion); " +
        "(4) on Android, enable 'Motion sensors' for the site in Chrome's site settings."
      );
      return;
    }

    try {
      runAnalysis();
    } catch (err) {
      livePanel.classList.add("hidden");
      setupPanel.classList.remove("hidden");
      showSetupError("Analysis failed: " + err.message);
      console.error(err);
    }
  }

  function showLiveWarning(msg) {
    let el = document.getElementById("liveWarn");
    if (!el) {
      el = document.createElement("div");
      el.id = "liveWarn";
      el.className = "warn-banner";
      livePanel.appendChild(el);
    }
    el.textContent = msg;
  }

  function showSetupError(msg) {
    let el = document.getElementById("setupErr");
    if (!el) {
      el = document.createElement("div");
      el.id = "setupErr";
      el.className = "error-banner";
      setupPanel.insertBefore(el, setupPanel.firstChild.nextSibling);
    }
    el.textContent = msg;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearError() {
    const e1 = document.getElementById("setupErr"); if (e1) e1.remove();
    const e2 = document.getElementById("liveWarn"); if (e2) e2.remove();
  }

  // ---------- Results rendering ----------

  function runAnalysis() {
    const result = window.PortalAnalysis.analyseRide(state.samples);
    const meta = {
      site: $("#siteName").value.trim(),
      liftId: $("#liftId").value.trim(),
      tester: $("#testerName").value.trim(),
      ratedSpeed: parseFloat($("#ratedSpeed").value) || null,
      ratedLoad: parseFloat($("#ratedLoad").value) || null,
      directionInput: $("#direction").value,
      liftType: $("#liftType") ? $("#liftType").value : "hydraulic",
      timestamp: Date.now(),
    };
    result.meta = meta;
    result.complianceRows = window.PortalAnalysis.buildComplianceRows(result.kpi, meta.ratedSpeed, meta.liftType);
    result.limits = window.PortalAnalysis.getAcceptanceLimits(meta.liftType);
    state.result = result;
    state.meta = meta;

    livePanel.classList.add("hidden");
    resultsPanel.classList.remove("hidden");

    renderKPIs(result);
    renderCompliance(result);
    renderCharts(result);
    $("#rawCount").textContent = result.kpi.sample_count;
    $("#rawRate").textContent = result.kpi.sample_rate_hz.toFixed(1);
  }

  function renderKPIs(result) {
    const k = result.kpi;
    const L = result.limits || window.PortalAnalysis.getAcceptanceLimits("hydraulic");
    const fmtPeak = peaks => (peaks && peaks.length)
      ? peaks.map(p => `${p.f.toFixed(1)} Hz`).join(", ")
      : "—";
    const kpis = [
      { label: "Lift type",               value: (result.meta && result.meta.liftType) ? result.meta.liftType.toUpperCase() : "HYDRAULIC", unit: "", d: 0 },
      { label: "Duration",                value: k.duration_s,              unit: "s",   d: 2 },
      { label: "Travel distance",         value: k.net_displacement_m,      unit: "m",   d: 2 },
      { label: "Max velocity",            value: k.max_velocity_mps,        unit: "m/s", d: 3 },
      { label: "Max acceleration",        value: k.max_acceleration_mps2,   unit: "m/s²", d: 3, limit: L.maxAccel },
      { label: "Max deceleration",        value: k.max_deceleration_mps2,   unit: "m/s²", d: 3, limit: L.maxDecel },
      { label: "Max jerk",                value: k.max_jerk_mps3,           unit: "m/s³", d: 3, limit: L.maxJerk },
      { label: "Vert. vibration P-P",     value: k.vert_vibration_pp_mps2,  unit: "m/s²", d: 3, limit: L.vertPP },
      { label: "Horiz. vibration P-P",    value: k.horiz_vibration_pp_mps2, unit: "m/s²", d: 3, limit: L.horizPP },
      { label: "Dominant vert. freq.",    value: fmtPeak(k.dominant_vert_hz),  unit: "", d: 0 },
      { label: "Dominant horiz. freq.",   value: fmtPeak(k.dominant_horiz_hz), unit: "", d: 0 },
      { label: "Direction",               value: k.direction,               unit: "",     d: 0 },
      { label: "Sample rate",             value: k.sample_rate_hz,          unit: "Hz",   d: 1 },
    ];
    const grid = $("#kpiGrid");
    grid.innerHTML = "";
    kpis.forEach(k => {
      const el = document.createElement("div");
      el.className = "kpi";
      if (typeof k.limit === "number" && typeof k.value === "number") {
        el.classList.add(k.value <= k.limit ? "pass" : "fail");
      }
      const valStr = typeof k.value === "number"
        ? k.value.toFixed(k.d)
        : (k.value || "—");
      el.innerHTML = `
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-value">${valStr}<span class="kpi-unit">${k.unit}</span></div>
      `;
      grid.appendChild(el);
    });
  }

  function renderCompliance(result) {
    const tbody = $("#complianceTable tbody");
    tbody.innerHTML = "";
    result.complianceRows.forEach(r => {
      const tr = document.createElement("tr");
      const measured = (r.measured === null || Number.isNaN(r.measured))
        ? "—" : `${Number(r.measured).toFixed(3)} ${r.unit || ""}`.trim();
      const limit = (r.limit === null) ? "—" : `${Number(r.limit).toFixed(3)} ${r.unit || ""}`.trim();
      tr.innerHTML = `
        <td><strong>${r.name}</strong><br><span style="color:#5b6473;font-size:12px">${r.ref}</span></td>
        <td>${measured}</td>
        <td>${limit}</td>
        <td><span class="result-pill ${r.cls}">${r.result}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function downsample(t, y, maxPoints = 600) {
    if (t.length <= maxPoints) {
      return { t: Array.from(t), y: Array.from(y) };
    }
    const step = Math.ceil(t.length / maxPoints);
    const tt = [], yy = [];
    for (let i = 0; i < t.length; i += step) { tt.push(t[i]); yy.push(y[i]); }
    return { t: tt, y: yy };
  }

  function destroyCharts() {
    Object.values(state.chart).forEach(c => { try { c.destroy(); } catch {} });
    state.chart = {};
  }

  function makeChart(canvasId, label, t, y, color, yLabel) {
    const ds = downsample(t, y);
    const ctx = document.getElementById(canvasId).getContext("2d");
    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: ds.t.map(v => v.toFixed(2)),
        datasets: [{
          label,
          data: ds.y,
          borderColor: color,
          borderWidth: 1.4,
          pointRadius: 0,
          tension: 0.1,
          fill: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: true, position: "top" } },
        scales: {
          x: { title: { display: true, text: "Time (s)" }, ticks: { maxTicksLimit: 10 } },
          y: { title: { display: true, text: yLabel } },
        },
      },
    });
    state.chart[canvasId] = chart;
  }

  function makeSpectrumChart(spectrum) {
    const note = document.getElementById("spectrumNote");
    const ctx = document.getElementById("chartSpectrum").getContext("2d");
    if (!spectrum) {
      if (note) note.textContent = "No constant-velocity plateau detected — spectrum unavailable.";
      const empty = new Chart(ctx, {
        type: "line",
        data: { labels: [], datasets: [] },
        options: { responsive: true, maintainAspectRatio: false, animation: false },
      });
      state.chart.chartSpectrum = empty;
      return;
    }
    if (note) {
      note.textContent = `Plateau sample rate: ${spectrum.fs.toFixed(1)} Hz · resolution: ${(spectrum.fs / (spectrum.freqs.length * 2)).toFixed(2)} Hz`;
    }
    const labels = spectrum.freqs.map(f => f.toFixed(1));
    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Vertical (m/s²)",   data: spectrum.magsVert,  borderColor: "#0b3d91", borderWidth: 1.2, pointRadius: 0, tension: 0.1, fill: false },
          { label: "Horizontal (m/s²)", data: spectrum.magsHoriz, borderColor: "#5b21b6", borderWidth: 1.2, pointRadius: 0, tension: 0.1, fill: false },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: true, position: "top" } },
        scales: {
          x: { title: { display: true, text: "Frequency (Hz)" }, ticks: { maxTicksLimit: 10 } },
          y: { title: { display: true, text: "Amplitude (m/s²)" } },
        },
      },
    });
    state.chart.chartSpectrum = chart;
  }

  function makeRideProfileChart(result) {
    const ctx = document.getElementById("chartProfile").getContext("2d");
    const profile = result.rideProfile;
    const tArr = result.t, vArr = result.vSigned;

    // Downsample to {x, y} points so the x-axis can be linear (annotations
    // land at exact times rather than snapping to category labels).
    const maxPoints = 600;
    const step = tArr.length <= maxPoints ? 1 : Math.ceil(tArr.length / maxPoints);
    const lineData = [];
    for (let i = 0; i < tArr.length; i += step) lineData.push({ x: tArr[i], y: vArr[i] });

    const annotations = {};
    let peakV = 0;
    for (const p of lineData) if (p.y > peakV) peakV = p.y;

    if (profile && profile.phases.length === 9) {
      const phases = profile.phases;

      // Numbered phase boundary markers (1-9) at every phase start.
      phases.forEach((p, k) => {
        annotations["phase" + k] = {
          type: "line",
          xMin: p.t_start, xMax: p.t_start,
          borderColor: "rgba(91, 100, 115, 0.5)",
          borderWidth: 1,
          borderDash: [4, 4],
          label: {
            display: true,
            content: String(p.num),
            position: "start",
            backgroundColor: "#0b3d91",
            color: "#fff",
            font: { weight: "bold", size: 10 },
            padding: { x: 5, y: 2 },
            borderRadius: 4,
            yAdjust: -2,
          },
        };
      });
      const last = phases[phases.length - 1];
      annotations.phaseEnd = {
        type: "line",
        xMin: last.t_end, xMax: last.t_end,
        borderColor: "rgba(91, 100, 115, 0.5)",
        borderWidth: 1,
        borderDash: [4, 4],
      };

      // A / B / C / D — corner markers of the trapezoidal velocity envelope.
      //   A = start of acceleration (motion command issued)
      //   B = end of acceleration   (rated velocity reached)
      //   C = start of deceleration (rated velocity ends)
      //   D = end of deceleration   (car at rest)
      const corners = [
        { id: "A", t: phases[1].t_start, v: vArr[phases[1].i_start], yAdj:  22 },
        { id: "B", t: phases[4].t_start, v: vArr[phases[4].i_start], yAdj: -22 },
        { id: "C", t: phases[5].t_start, v: vArr[phases[5].i_start], yAdj: -22 },
        { id: "D", t: phases[8].t_start, v: vArr[phases[8].i_start], yAdj:  22 },
      ];
      corners.forEach(c => {
        annotations["point" + c.id] = {
          type: "point",
          xValue: c.t,
          yValue: Math.max(0, c.v),
          backgroundColor: "#ffb703",
          borderColor: "#0b3d91",
          borderWidth: 2,
          radius: 5,
        };
        annotations["label" + c.id] = {
          type: "label",
          xValue: c.t,
          yValue: Math.max(0, c.v),
          content: [c.id],
          color: "#082b66",
          backgroundColor: "#ffb703",
          font: { weight: "bold", size: 13 },
          padding: 5,
          borderRadius: 6,
          borderColor: "#0b3d91",
          borderWidth: 1.5,
          yAdjust: c.yAdj,
        };
      });

      // UP/DOWN direction indicator, centred above the constant-velocity plateau.
      const midT = (phases[4].t_start + phases[5].t_start) / 2;
      annotations.directionLabel = {
        type: "label",
        xValue: midT,
        yValue: peakV,
        content: [result.kpi.direction === "UP" ? "↑ UP" : "↓ DOWN"],
        color: "#fff",
        font: { weight: "bold", size: 14 },
        backgroundColor: "rgba(46, 125, 50, 0.92)",
        borderRadius: 6,
        padding: 6,
        yAdjust: -22,
      };

      // MOTOR label on the left side (vertical text), echoing the textbook diagram.
      annotations.motorLabel = {
        type: "label",
        xValue: tArr[0],
        yValue: peakV * 0.5,
        content: ["MOTOR"],
        color: "#082b66",
        font: { weight: "bold", size: 11 },
        backgroundColor: "rgba(255, 183, 3, 0.92)",
        borderColor: "#0b3d91",
        borderWidth: 1,
        borderRadius: 4,
        padding: 4,
        rotation: -90,
        xAdjust: 22,
      };
    }

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        datasets: [{
          label: `Velocity (m/s) — ${result.kpi.direction}`,
          data: lineData,
          borderColor: "#0b3d91",
          backgroundColor: "rgba(11, 61, 145, 0.10)",
          borderWidth: 1.8,
          pointRadius: 0,
          tension: 0.15,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: true, position: "top" },
          annotation: { annotations },
        },
        scales: {
          x: { type: "linear", title: { display: true, text: "Time (s)" }, ticks: { maxTicksLimit: 12 } },
          y: { title: { display: true, text: "Velocity (m/s)" }, beginAtZero: true },
        },
      },
    });
    state.chart.chartProfile = chart;
  }

  function renderPhaseTable(result) {
    const tbody = document.querySelector("#phaseTable tbody");
    tbody.innerHTML = "";
    const profile = result.rideProfile;
    if (!profile || !profile.phases.length) return;
    profile.phases.forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.num}</td>
        <td>${p.label}</td>
        <td>${p.t_start.toFixed(2)}</td>
        <td>${p.duration_s.toFixed(2)}</td>
        <td>${p.mean_acceleration_mps2.toFixed(3)}</td>
        <td>${Math.abs(p.mean_velocity_mps).toFixed(3)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderCharts(result) {
    destroyCharts();
    const { t, aVert, velocity, displacement, jerk, aHoriz, spectrum } = result;
    makeRideProfileChart(result);
    renderPhaseTable(result);
    makeChart("chartAccel", "a_vertical (m/s²)", t, aVert,        "#0b3d91", "Acceleration (m/s²)");
    makeChart("chartVel",   "Velocity (m/s)",    t, velocity,     "#2e7d32", "Velocity (m/s)");
    makeChart("chartDisp",  "Displacement (m)",  t, displacement, "#ed6c02", "Displacement (m)");
    makeChart("chartJerk",  "Jerk (m/s³)",       t, jerk,         "#c1121f", "Jerk (m/s³)");
    makeChart("chartHoriz", "|a_horizontal| (m/s²)", t, aHoriz,   "#5b21b6", "Horizontal accel (m/s²)");
    makeSpectrumChart(spectrum);
  }

  // ---------- Exports ----------

  function downloadCsv() {
    if (!state.result) return;
    const { samples, t, aVert, velocity, displacement, jerk, aHoriz } = state.result;
    const header = "t_s,ax_raw_mps2,ay_raw_mps2,az_raw_mps2,a_vert_mps2,velocity_mps,displacement_m,jerk_mps3,a_horiz_mps2\n";
    const lines = [header];
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      lines.push([
        t[i].toFixed(4),
        s.gx.toFixed(4), s.gy.toFixed(4), s.gz.toFixed(4),
        aVert[i].toFixed(4),
        velocity[i].toFixed(4),
        displacement[i].toFixed(4),
        jerk[i].toFixed(4),
        aHoriz[i].toFixed(4),
      ].join(",") + "\n");
    }
    const blob = new Blob(lines, { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PortalLiftTester_raw_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
  }

  function downloadPdf() {
    if (!state.result || !state.meta) return;
    window.PortalReport.generatePdfReport(state.meta, state.result, state.chart);
  }

  function newTest() {
    destroyCharts();
    state.samples = [];
    state.result = null;
    state.meta = null;
    resultsPanel.classList.add("hidden");
    setupPanel.classList.remove("hidden");
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }

  // ---------- Tabs ----------

  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
    });
  });

  // ---------- Wire up ----------

  startBtn.addEventListener("click", startRecording);
  stopBtn.addEventListener("click", stopRecording);
  stopFloating.addEventListener("click", stopRecording);
  pdfBtn.addEventListener("click", downloadPdf);
  csvBtn.addEventListener("click", downloadCsv);
  newBtn.addEventListener("click", newTest);

  // Initial sensor probe (does not request permission yet).
  checkSensorOnce();

  // Prevent accidental swipe-to-refresh / pinch zoom during a ride.
  document.addEventListener("gesturestart", e => e.preventDefault());
})();
