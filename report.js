/*
 * Portal Lift Tester Software - PDF report generator
 *
 * Builds a multi-page PDF using jsPDF, embedding the four ride graphs
 * (acceleration / velocity / displacement / jerk) as PNG images
 * captured from the Chart.js canvases on the results screen.
 */

function fmt(n, digits = 3) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 100) digits = Math.min(digits, 2);
  return Number(n).toFixed(digits);
}

function generatePdfReport(meta, result, charts) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  // --- Header band ---
  doc.setFillColor(11, 61, 145);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Portal Lift Tester Software", margin, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Ride quality test report — EN 81-20 / EN 81-50", margin, 52);

  y = 90;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Test details", margin, y);
  y += 6;
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const details = [
    ["Site / Building",   meta.site || "—"],
    ["Lift / Car ID",     meta.liftId || "—"],
    ["Tester",            meta.tester || "—"],
    ["Date & time",       new Date(meta.timestamp).toLocaleString()],
    ["Rated speed",       meta.ratedSpeed ? `${meta.ratedSpeed} m/s` : "—"],
    ["Rated load",        meta.ratedLoad ? `${meta.ratedLoad} kg` : "—"],
    ["Direction (input)", meta.directionInput || "—"],
    ["Direction (meas.)", result.kpi.direction || "—"],
  ];
  const colW = (pageW - 2 * margin) / 2;
  details.forEach((row, i) => {
    const col = i % 2;
    const line = Math.floor(i / 2);
    const x = margin + col * colW;
    const yy = y + line * 16;
    doc.setFont("helvetica", "bold");
    doc.text(row[0] + ":", x, yy);
    doc.setFont("helvetica", "normal");
    doc.text(String(row[1]), x + 110, yy);
  });
  y += Math.ceil(details.length / 2) * 16 + 12;

  // --- KPI table ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Ride parameters", margin, y);
  y += 6;
  doc.line(margin, y, pageW - margin, y);
  y += 14;

  const k = result.kpi;
  const kpis = [
    ["Total ride duration",        `${fmt(k.duration_s, 2)} s`],
    ["Sample rate (mean)",         `${fmt(k.sample_rate_hz, 1)} Hz`],
    ["Sample count",               String(k.sample_count)],
    ["Net travel distance",        `${fmt(k.net_displacement_m, 2)} m`],
    ["Maximum velocity",           `${fmt(k.max_velocity_mps, 3)} m/s`],
    ["Maximum acceleration",       `${fmt(k.max_acceleration_mps2, 3)} m/s²`],
    ["Maximum deceleration",       `${fmt(k.max_deceleration_mps2, 3)} m/s²`],
    ["Maximum jerk",               `${fmt(k.max_jerk_mps3, 3)} m/s³`],
    ["Vertical vibration (P-P)",   `${fmt(k.vert_vibration_pp_mps2, 3)} m/s²`],
    ["Vertical vibration A95",     `${fmt(k.vert_vibration_a95_mps2, 3)} m/s²`],
    ["Horizontal vibration (P-P)", `${fmt(k.horiz_vibration_pp_mps2, 3)} m/s²`],
    ["Horizontal vibration A95",   `${fmt(k.horiz_vibration_a95_mps2, 3)} m/s²`],
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  kpis.forEach((row, i) => {
    const col = i % 2;
    const line = Math.floor(i / 2);
    const x = margin + col * colW;
    const yy = y + line * 16;
    doc.setDrawColor(220);
    doc.rect(x, yy - 11, colW - 8, 15, "S");
    doc.setFont("helvetica", "bold");
    doc.text(row[0], x + 4, yy);
    doc.setFont("helvetica", "normal");
    doc.text(row[1], x + colW - 14, yy, { align: "right" });
  });
  y += Math.ceil(kpis.length / 2) * 16 + 14;

  // --- Compliance summary ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("EN 81-20 / EN 81-50 conformity", margin, y);
  y += 6;
  doc.line(margin, y, pageW - margin, y);
  y += 14;

  doc.setFontSize(10);
  const tableCols = [
    { key: "name",     label: "Parameter",   x: margin,        w: 200 },
    { key: "measured", label: "Measured",    x: margin + 200,  w: 90  },
    { key: "limit",    label: "Limit",       x: margin + 290,  w: 80  },
    { key: "result",   label: "Result",      x: margin + 370,  w: 60  },
    { key: "ref",      label: "Reference",   x: margin + 430,  w: pageW - margin - (margin + 430) },
  ];
  doc.setFillColor(240, 242, 247);
  doc.rect(margin, y - 11, pageW - 2 * margin, 16, "F");
  doc.setFont("helvetica", "bold");
  tableCols.forEach(c => doc.text(c.label, c.x + 2, y));
  y += 8;
  doc.setFont("helvetica", "normal");

  result.complianceRows.forEach(r => {
    if (y > pageH - margin - 30) { doc.addPage(); y = margin; }
    y += 14;
    doc.setDrawColor(230);
    doc.line(margin, y + 2, pageW - margin, y + 2);

    tableCols.forEach(c => {
      let val = "";
      if (c.key === "measured") val = r.measured === null ? "—" : `${fmt(r.measured, 3)} ${r.unit || ""}`.trim();
      else if (c.key === "limit") val = r.limit === null ? "—" : `${fmt(r.limit, 3)} ${r.unit || ""}`.trim();
      else if (c.key === "result") val = r.result;
      else val = String(r[c.key] || "");
      if (c.key === "result") {
        if (r.result === "PASS") doc.setTextColor(46, 125, 50);
        else if (r.result === "FAIL") doc.setTextColor(193, 18, 31);
        else doc.setTextColor(11, 61, 145);
        doc.setFont("helvetica", "bold");
      } else {
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
      }
      const lines = doc.splitTextToSize(val, c.w - 4);
      doc.text(lines, c.x + 2, y);
    });
  });
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  // --- Graphs page(s) ---
  doc.addPage();
  y = margin;
  doc.setFillColor(11, 61, 145);
  doc.rect(0, 0, pageW, 50, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Portal Lift Tester Software — Graphs", margin, 30);
  doc.setTextColor(0, 0, 0);
  y = 70;

  const chartList = [
    { title: "Vertical acceleration vs time",   id: "chartAccel" },
    { title: "Velocity vs time",                 id: "chartVel" },
    { title: "Displacement vs time",             id: "chartDisp" },
    { title: "Jerk vs time",                     id: "chartJerk" },
    { title: "Horizontal vibration (peak-to-peak windowed)", id: "chartHoriz" },
  ];
  const chartW = pageW - 2 * margin;
  const chartH = 160;

  chartList.forEach(c => {
    const canvas = document.getElementById(c.id);
    if (!canvas) return;
    if (y + chartH + 28 > pageH - margin) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(c.title, margin, y);
    y += 6;
    const dataUrl = canvas.toDataURL("image/png", 1.0);
    doc.addImage(dataUrl, "PNG", margin, y, chartW, chartH);
    y += chartH + 18;
  });

  // --- Footer on every page ---
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Portal Lift Tester Software  •  Confirmed per EN 81-20 / EN 81-50  •  Page ${p} of ${pages}`,
      pageW / 2, pageH - 16, { align: "center" }
    );
  }

  const fname = `PortalLiftTester_${(meta.liftId || "lift").replace(/\s+/g, "_")}_${new Date(meta.timestamp).toISOString().replace(/[:.]/g, "-")}.pdf`;
  doc.save(fname);
}

window.PortalReport = { generatePdfReport };
