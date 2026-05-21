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
    const a = e.accelerationIncludingGravity || {};
    // If the device only exposes `acceleration` (gravity removed) and no
    // gravity-included field, reconstruct by adding a nominal gravity later.
    const gx = (a.x ?? null), gy = (a.y ?? null), gz = (a.z ?? null);
    if (gx === null || gy === null || gz === null) return;
    const rot = e.rotationRate || {};
    state.samples.push({
      t,
      gx, gy, gz,
      rx: rot.alpha ?? 0, ry: rot.beta ?? 0, rz: rot.gamma ?? 0,
    });

    // Live preview (cheap).
    if (state.samples.length % 5 === 0) {
      const n = state.samples.length;
      liveCount.textContent = n;
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

    window.addEventListener("devicemotion", onMotion);

    setupPanel.classList.add("hidden");
    resultsPanel.classList.add("hidden");
    livePanel.classList.remove("hidden");
    stopBtn.disabled = false;
    startBtn.disabled = true;

    // Live clock.
    state.clockTimer = setInterval(() => {
      const t = (performance.now() - state.startMs) / 1000;
      const mm = String(Math.floor(t / 60)).padStart(2, "0");
      const ss = String(Math.floor(t % 60)).padStart(2, "0");
      const d = String(Math.floor((t * 10) % 10));
      liveClock.textContent = `${mm}:${ss}.${d}`;

      // Velocity estimate via cheap rolling integration of last 1s of vertical samples.
      if (state.samples.length > 10) {
        const tail = state.samples.slice(-Math.min(state.samples.length, 200));
        let v = 0;
        for (let i = 1; i < tail.length; i++) {
          const dt = tail[i].t - tail[i - 1].t;
          const az = ((tail[i].gz + tail[i - 1].gz) / 2) - 9.80665;
          v += az * dt;
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
    stopBtn.disabled = true;
    startBtn.disabled = false;

    try {
      runAnalysis();
    } catch (err) {
      alert("Analysis failed: " + err.message);
      console.error(err);
      // Show setup again so the user can retry.
      livePanel.classList.add("hidden");
      setupPanel.classList.remove("hidden");
    }
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
      timestamp: Date.now(),
    };
    result.complianceRows = window.PortalAnalysis.buildComplianceRows(result.kpi, meta.ratedSpeed);
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
    const kpis = [
      { label: "Duration",                value: k.duration_s,              unit: "s",   d: 2 },
      { label: "Travel distance",         value: k.net_displacement_m,      unit: "m",   d: 2 },
      { label: "Max velocity",            value: k.max_velocity_mps,        unit: "m/s", d: 3 },
      { label: "Max acceleration",        value: k.max_acceleration_mps2,   unit: "m/s²", d: 3, limit: 1.5 },
      { label: "Max deceleration",        value: k.max_deceleration_mps2,   unit: "m/s²", d: 3, limit: 1.5 },
      { label: "Max jerk",                value: k.max_jerk_mps3,           unit: "m/s³", d: 3, limit: 2.0 },
      { label: "Vert. vibration P-P",     value: k.vert_vibration_pp_mps2,  unit: "m/s²", d: 3, limit: 0.20 },
      { label: "Horiz. vibration P-P",    value: k.horiz_vibration_pp_mps2, unit: "m/s²", d: 3, limit: 0.15 },
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

  function renderCharts(result) {
    destroyCharts();
    const { t, aVert, velocity, displacement, jerk, aHoriz } = result;
    makeChart("chartAccel", "a_vertical (m/s²)", t, aVert,        "#0b3d91", "Acceleration (m/s²)");
    makeChart("chartVel",   "Velocity (m/s)",    t, velocity,     "#2e7d32", "Velocity (m/s)");
    makeChart("chartDisp",  "Displacement (m)",  t, displacement, "#ed6c02", "Displacement (m)");
    makeChart("chartJerk",  "Jerk (m/s³)",       t, jerk,         "#c1121f", "Jerk (m/s³)");
    makeChart("chartHoriz", "|a_horizontal| (m/s²)", t, aHoriz,   "#5b21b6", "Horizontal accel (m/s²)");
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
  pdfBtn.addEventListener("click", downloadPdf);
  csvBtn.addEventListener("click", downloadCsv);
  newBtn.addEventListener("click", newTest);

  // Initial sensor probe (does not request permission yet).
  checkSensorOnce();

  // Prevent accidental swipe-to-refresh / pinch zoom during a ride.
  document.addEventListener("gesturestart", e => e.preventDefault());
})();
