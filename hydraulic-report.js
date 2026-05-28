/*
 * Portal Engineering Limited — Hydraulic Cylinder Datasheet PDF Generator
 * Produces an IS 17900 (Part 2): 2022 design datasheet using jsPDF.
 */

function generateHydraulicPDF(meta, inp, res) {
  const { jsPDF } = window.jspdf;
  const doc  = new jsPDF({ unit: 'pt', format: 'a4' });
  const PW   = doc.internal.pageSize.getWidth();
  const PH   = doc.internal.pageSize.getHeight();
  const ML   = 45;   // left margin
  const MR   = PW - 45;
  const BLUE = [11, 61, 145];
  const DKGRAY = [40, 40, 40];

  let y = 0;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function f(n, d = 3) {
    if (n === null || n === undefined || isNaN(n)) return '-';
    return (+n).toFixed(d);
  }
  function fkN(n) { return f(n / 1000, 2) + ' kN'; }
  function fMPa(n) { return f(n, 3) + ' MPa'; }

  function hline(yy, color = [200, 200, 200]) {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.5);
    doc.line(ML, yy, MR, yy);
  }

  function sectionTitle(title) {
    y += 14;
    doc.setFillColor(230, 237, 255);
    doc.rect(ML, y - 11, MR - ML, 16, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BLUE);
    doc.text(title.toUpperCase(), ML + 4, y);
    y += 8;
    doc.setTextColor(...DKGRAY);
  }

  function row(label, value, status) {
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...DKGRAY);
    doc.text(label, ML + 4, y);
    doc.setFont('helvetica', 'bold');
    doc.text(value, ML + 230, y);
    if (status !== undefined) {
      const ok = (status === true || status === 'PASS');
      doc.setFillColor(...(ok ? [22, 163, 74] : [220, 38, 38]));
      doc.roundedRect(MR - 68, y - 9, 58, 12, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text(ok ? 'PASS' : 'FAIL', MR - 39, y - 1, { align: 'center' });
      doc.setFontSize(9);
      doc.setTextColor(...DKGRAY);
    }
    doc.setFont('helvetica', 'normal');
  }

  function twoCol(label, value) {
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...DKGRAY);
    doc.text(label, ML + 4, y);
    doc.setFont('helvetica', 'bold');
    doc.text(value, ML + 230, y);
    doc.setFont('helvetica', 'normal');
  }

  function newPage() {
    doc.addPage();
    drawFooter();
    y = 55;
    hline(y - 5, BLUE);
  }

  function drawFooter() {
    const pg   = doc.internal.getCurrentPageInfo().pageNumber;
    const tot  = '{TOTAL}';
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(130, 130, 130);
    doc.text('Portal Engineering Private Limited  -  IS 17900 (Part 2): 2022', ML, PH - 20);
    doc.text(`Page ${pg}`, MR, PH - 20, { align: 'right' });
    doc.text('CONFIDENTIAL — For design verification purposes only.', PW / 2, PH - 20, { align: 'center' });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — Header + Project details + Inputs + Pressure
  // ══════════════════════════════════════════════════════════════════════════

  // Header band
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, PW, 68, 'F');

  // Logo circle
  doc.setFillColor(255, 255, 255);
  doc.circle(ML + 18, 34, 18, 'F');
  doc.setTextColor(...BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('P', ML + 18, 40, { align: 'center' });

  // Company name & title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Portal Engineering Private Limited', ML + 44, 28);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('Hydraulic Cylinder Design Datasheet  ·  IS 17900 (Part 2): 2022', ML + 44, 44);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, ML + 44, 58);

  // Overall pass/fail badge
  const badgeColor = res.all_pass ? [22, 163, 74] : [220, 38, 38];
  const badgeText  = res.all_pass ? 'DESIGN SAFE' : 'DESIGN UNSAFE';
  doc.setFillColor(...badgeColor);
  doc.roundedRect(MR - 105, 20, 100, 28, 5, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(badgeText, MR - 55, 40, { align: 'center' });

  y = 85;

  // ── Project details ──────────────────────────────────────────────────────
  sectionTitle('Project Details');
  const details = [
    ['Project Name',    meta.project || '-'],
    ['Project Number',  meta.projNo  || '-'],
    ['Client',          meta.client  || '-'],
    ['Engineer',        meta.engineer || '-'],
    ['Date',            meta.date    || new Date().toLocaleDateString('en-IN')],
    ['Standard',        'IS 17900 (Part 2): 2022'],
  ];
  details.forEach(([l, v]) => twoCol(l, v));

  // ── Input parameters ──────────────────────────────────────────────────────
  sectionTitle('Input Parameters');
  twoCol('Cylinder outer diameter  (D_o)',  `${inp.D_o_cyl} mm`);
  twoCol('Cylinder wall thickness  (e_wall)', `${inp.e_wall_cyl} mm`);
  twoCol('Cylinder bore (D_i)',             `${f(res.D_i, 1)} mm`);
  twoCol('Ram outer diameter  (d)',          `${inp.d_ram} mm`);
  twoCol('Ram type',                         res.solid ? 'Solid' : 'Hollow');
  if (!res.solid) twoCol('Ram wall thickness  (e_wall_ram)', `${inp.e_wall_ram} mm`);
  twoCol('Cabin travel  (l)',                `${inp.cabin_travel} mm`);
  twoCol('Empty car mass  (P)',              `${inp.P_car} kg`);
  twoCol('Rated load  (Q)',                  `${inp.Q_rated} kg`);
  twoCol('Material',                         inp.materialLabel || '-');
  twoCol('Proof stress  R_p0.2',            `${inp.Rp02} N/mm2`);
  twoCol('Tensile strength  R_m',           `${inp.Rm} N/mm2`);

  // ── Pressure analysis ──────────────────────────────────────────────────────
  sectionTitle('Pressure Analysis');
  twoCol('Bore area  (A)',                       `${f(res.A_bore, 0)} mm2`);
  twoCol('Static working pressure  (p)',          fMPa(res.p_static));
  twoCol('Max pressure  (1.4 x p)  [Formula 53]', fMPa(res.p_max));
  twoCol('Burst pressure - Barlow  (2 x R_m x e / D_i)', fMPa(res.p_burst_cyl));
  twoCol('Burst ratio  (p_burst / p_max)',
         `${f(res.burst_ratio, 2)}  ${res.burst_ok ? '[>= 2.5 OK]' : '[< 2.5 FAIL]'}`);

  drawFooter();

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 2 — Wall thickness + Buckling + Summary
  // ══════════════════════════════════════════════════════════════════════════
  newPage();

  // ── Cylinder wall thickness ────────────────────────────────────────────────
  sectionTitle('Cylinder Wall Thickness Check  [IS 17900 Formula 37]');
  twoCol('Formula',  'e_wall >= (2.3 x 1.7 x p / R_p0.2) x (D_i / 2) + e0');
  twoCol('e0 (corrosion allowance)', '1.0 mm');
  twoCol('Required wall thickness  (e_req)', `${f(res.e_cyl_req, 2)} mm`);
  row   ('Provided wall thickness  (e_wall)', `${inp.e_wall_cyl} mm`, res.cyl_wall_ok);

  if (!res.solid) {
    // ── Ram wall thickness ─────────────────────────────────────────────────
    sectionTitle('Ram Wall Thickness Check  [IS 17900 Formula 37]');
    twoCol('e0 (corrosion allowance for rams)', '0.5 mm');
    twoCol('Required ram wall  (e_req)', `${f(res.e_ram_req, 2)} mm`);
    row   ('Provided ram wall  (e_wall_ram)', `${inp.e_wall_ram} mm`, res.ram_wall_ok);
  }

  // ── Buckling analysis ────────────────────────────────────────────────────
  sectionTitle(`Buckling Analysis  [IS 17900 §5.13.2, Formula ${res.buck_formula} & 53]`);
  twoCol('Ram cross-section area  (A_n)',        `${f(res.A_ram, 1)} mm2`);
  twoCol('Second moment of area  (J_n)',          `${f(res.J_ram / 1e6, 4)} x 10^6 mm4`);
  twoCol('Radius of gyration  (i_n)',             `${f(res.i_ram, 2)} mm`);
  twoCol('Free buckling length  (l)',             `${res.l} mm`);
  twoCol('Slenderness ratio  (lambda_n = l / i_n)', `${f(res.lambda_n, 1)}`);
  twoCol('Applicable formula',                    res.lambda_n >= 100
    ? 'Formula 51 (Euler: lambda_n >= 100)'
    : 'Formula 52 (Johnson parabolic: lambda_n < 100)');
  twoCol('Ram mass estimate  (P_t)',              `${f(res.m_ram, 1)} kg`);
  twoCol('Allowable buckling force  (F_s_allow)', fkN(res.F_s_allow));
  row   ('Actual buckling force  (F_s — Formula 53)', fkN(res.F_s_actual), res.buck_ok);
  twoCol('Safety factor  (F_s_allow / F_s_actual)', `${f(res.SF_buck, 2)}  (required >= 2.0)`);

  // ── Overall summary ───────────────────────────────────────────────────────
  y += 20;
  const BOX_H = 70;
  doc.setFillColor(...(res.all_pass ? [240, 253, 244] : [254, 242, 242]));
  doc.setDrawColor(...(res.all_pass ? [22, 163, 74] : [220, 38, 38]));
  doc.setLineWidth(1.5);
  doc.roundedRect(ML, y, MR - ML, BOX_H, 6, 6, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...(res.all_pass ? [22, 163, 74] : [220, 38, 38]));
  doc.text(
    res.all_pass
      ? 'DESIGN IS SAFE AS PER IS 17900 (PART 2): 2022'
      : 'DESIGN DOES NOT SATISFY IS 17900 (PART 2): 2022 REQUIREMENTS',
    PW / 2, y + 24, { align: 'center' }
  );

  // check items — coloured pill badges
  doc.setFontSize(8);
  const checks = [
    { label: 'Cylinder Wall',   ok: res.cyl_wall_ok },
    { label: 'Ram Wall',        ok: res.ram_wall_ok, skip: res.solid },
    { label: 'Buckling',        ok: res.buck_ok },
    { label: 'Burst Ratio',     ok: res.burst_ok },
  ].filter(c => !c.skip);

  const spacing = (MR - ML) / checks.length;
  checks.forEach((c, i) => {
    const cx = ML + spacing * i + spacing / 2;
    doc.setFillColor(...(c.ok ? [22, 163, 74] : [220, 38, 38]));
    doc.roundedRect(cx - 40, y + 34, 80, 14, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text((c.ok ? '[PASS] ' : '[FAIL] ') + c.label, cx, y + 44, { align: 'center' });
    doc.setTextColor(...DKGRAY);
  });

  y += BOX_H + 16;

  // ── Notes ─────────────────────────────────────────────────────────────────
  sectionTitle('Notes');
  const notes = [
    '1. Ram mass is estimated using cabin travel as the extended length; actual ram length may differ.',
    '2. Buckling effective length l = cabin travel (conservative; pin-pin end conditions assumed).',
    '3. Fig. 10 graphical safety factor (S1 vs Dt/dr) should be verified separately.',
    '4. Welding seam stress-relief conditions (Formulae 38-43) apply where seams are present.',
    '5. Material properties assume uniform quality throughout; mill certificates should be verified.',
    '6. This datasheet is generated by Portal Engineering Pvt. Ltd. software and must be reviewed',
    '   by a qualified engineer before use in construction or certification.',
  ];
  notes.forEach(n => {
    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(n, ML + 4, y);
  });

  // ── Signature block ───────────────────────────────────────────────────────
  y += 30;
  hline(y, [180, 180, 180]);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...DKGRAY);
  doc.text('Prepared by:', ML + 4, y);
  doc.text('Checked by:', ML + 180, y);
  doc.text('Approved by:', ML + 360, y);
  y += 28;
  doc.text('_____________________', ML + 4, y);
  doc.text('_____________________', ML + 180, y);
  doc.text('_____________________', ML + 360, y);
  y += 12;
  doc.text(meta.engineer || '—', ML + 4, y);
  doc.text('Date: _____________', ML + 180, y);
  doc.text('Date: _____________', ML + 360, y);

  drawFooter();

  // Finalise: update page total (jsPDF doesn't do automatic total in text)
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    // (footer already written; updating total count requires re-write)
  }

  const filename = `HC_Datasheet_${(meta.project || 'Project').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(filename);
}
