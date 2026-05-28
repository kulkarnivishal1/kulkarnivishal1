/*
 * IS 17900 (Part 2): 2022 — Hydraulic Cylinder Design Calculator
 * Implements wall thickness (Formula 37), buckling (Formulae 51–53)
 * and burst pressure checks for elevator hydraulic cylinders.
 */

const HC = (() => {
  const G_N           = 9.81;      // m/s² — standard gravity
  const E_STEEL       = 210000;    // N/mm² — modulus of elasticity (IS: 2.1×10⁵)
  const RHO_STEEL     = 7.85e-6;   // kg/mm³ — steel density
  const FRIC_PEAK     = 2.3;       // IS factor: friction losses (1.15) × pressure peaks (2)
  const SF_PROOF      = 1.7;       // IS safety factor on proof stress
  const OVERP_FACTOR  = 1.4;       // IS overpressure factor (Formula 53)
  const BUCK_SF       = 2.0;       // IS safety factor against buckling (divisor in Formulae 51/52)
  const E0_CYLINDER   = 1.0;       // mm — corrosion allowance for cylinder walls
  const E0_RAM        = 0.5;       // mm — corrosion allowance for rams

  // Material grades (R_p0.2 in N/mm², R_m in N/mm²)
  const MATERIALS = {
    'IS2062-E250': { label: 'IS 2062 E250 (Fe410)',  Rp02: 250, Rm: 410 },
    'IS2062-E350': { label: 'IS 2062 E350 (Fe490)',  Rp02: 350, Rm: 490 },
    'IS2062-E410': { label: 'IS 2062 E410 (Fe540)',  Rp02: 410, Rm: 540 },
    'Custom':      { label: 'Custom',                 Rp02: null, Rm: null },
  };

  function calculate(inp) {
    const {
      d_ram,          // mm — ram outer diameter
      e_wall_ram,     // mm — ram wall thickness (0 = solid)
      D_o_cyl,        // mm — cylinder outer diameter
      e_wall_cyl,     // mm — cylinder wall thickness
      cabin_travel,   // mm — cabin travel (= ram free length for buckling)
      P_car,          // kg — empty car + cables mass
      Q_rated,        // kg — rated load
      Rp02,           // N/mm² — proof stress
      Rm,             // N/mm² — tensile strength
    } = inp;

    const solid = (e_wall_ram === 0 || e_wall_ram >= d_ram / 2);

    // ── Derived dimensions ─────────────────────────────────────────────────
    const D_i      = D_o_cyl - 2 * e_wall_cyl;          // cylinder bore
    const d_i_ram  = solid ? 0 : d_ram - 2 * e_wall_ram; // ram inner dia

    // ── Cross-section properties ────────────────────────────────────────────
    const A_bore = Math.PI / 4 * D_i ** 2;              // cylinder bore area (mm²)
    const A_ram  = solid
      ? Math.PI / 4 * d_ram ** 2
      : Math.PI / 4 * (d_ram ** 2 - d_i_ram ** 2);
    const J_ram  = solid
      ? Math.PI / 64 * d_ram ** 4
      : Math.PI / 64 * (d_ram ** 4 - d_i_ram ** 4);
    const i_ram  = Math.sqrt(J_ram / A_ram);             // radius of gyration (mm)

    // ── Pressure analysis ──────────────────────────────────────────────────
    // Formula: p = F / A_bore  (N/mm² = MPa)
    const p_static = (P_car + Q_rated) * G_N / A_bore;  // MPa — working pressure
    const p_max    = OVERP_FACTOR * p_static;            // MPa — max with overpressure (IS §1.4)

    // Burst pressure — Barlow thin-wall formula: p_burst = 2·R_m·e / D_i
    const p_burst_cyl = (2 * Rm * e_wall_cyl) / D_i;   // MPa

    // ── Wall thickness check — Formula (37) ────────────────────────────────
    // e_wall ≥ (2.3 × 1.7 × p / R_p0.2) × (D_i / 2) + e_0
    const e_cyl_req = (FRIC_PEAK * SF_PROOF * p_static / Rp02) * (D_i / 2) + E0_CYLINDER;
    const cyl_wall_ok = e_wall_cyl >= e_cyl_req;

    // Ram wall check (hollow only)
    let e_ram_req = null;
    let ram_wall_ok = true;
    if (!solid) {
      // Pressure acts on inner bore of hollow ram; use d_i_ram as D_i equivalent
      e_ram_req   = (FRIC_PEAK * SF_PROOF * p_static / Rp02) * (d_i_ram / 2) + E0_RAM;
      ram_wall_ok = e_wall_ram >= e_ram_req;
    }

    // ── Ram mass (using cabin travel as extended length) ───────────────────
    const m_ram = A_ram * cabin_travel * RHO_STEEL;     // kg

    // ── Buckling analysis — Section 5.13.2 ────────────────────────────────
    const l        = cabin_travel;                       // mm — free buckling length
    const lambda_n = l / i_ram;                          // slenderness ratio

    let F_s_allow;
    let buck_formula;
    if (lambda_n >= 100) {
      // Euler buckling — Formula (51)
      F_s_allow   = (Math.PI ** 2 * E_STEEL * J_ram) / (BUCK_SF * l ** 2);
      buck_formula = 51;
    } else {
      // Johnson parabolic — Formula (52)
      F_s_allow   = (A_ram / BUCK_SF) * (Rm - (Rm - 210) * (lambda_n / 100) ** 2);
      buck_formula = 52;
    }

    // Actual buckling force — Formula (53): c_m=1 (direct), P_m=0
    // F_s = 1.4 × g_n × [c_m×(P+Q) + 0.64×P_t + P_m]
    const F_s_actual = OVERP_FACTOR * G_N * ((P_car + Q_rated) + 0.64 * m_ram);  // N
    const SF_buck    = F_s_allow / F_s_actual;
    const buck_ok    = F_s_actual <= F_s_allow;

    // Burst ratio (burst / max operating; typically expect ≥ 2.5 per practice)
    const burst_ratio = p_burst_cyl / p_max;
    const burst_ok    = burst_ratio >= 2.5;

    const all_pass = cyl_wall_ok && ram_wall_ok && buck_ok;

    return {
      // Inputs echoed
      solid, D_i, d_i_ram,
      // Areas / sections
      A_bore, A_ram, J_ram, i_ram,
      // Pressures
      p_static, p_max, p_burst_cyl, burst_ratio,
      // Wall thickness
      e_cyl_req, cyl_wall_ok,
      e_ram_req,  ram_wall_ok,
      // Buckling
      m_ram, l, lambda_n, buck_formula,
      F_s_allow, F_s_actual, SF_buck, buck_ok,
      // Summary
      burst_ok, all_pass,
    };
  }

  return { calculate, MATERIALS };
})();
