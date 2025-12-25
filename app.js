// MACROW THE GOAT APP!!! :)))

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}

// ---------------- Utilities (Functions) ----------------
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;

const qs = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));

function deepCopy(x){ return JSON.parse(JSON.stringify(x)); }
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}
function expEaseIn(t, k=6){
  const num = Math.exp(k * t) - 1;
  const den = Math.exp(k) - 1;
  return num / den;
}

// ---------------- Graph  Fixing ----------------
const GRAPH = {
  Ymin: 40, Ymax: 180,
  Pmin: 20, Pmax: 120,

  // REMEBER: AD: P = adIntercept - adSlope*(Y - (pivotY + shift))
  adIntercept: 80,
  adSlope: 0.75,
  adPivotY: 120,

  //  AS (keynesian!)
  pFlat: 55,
  yFeBase: 120,
  kinkGap: 20,
  curveRise: 25
};

// ---------------- Start-up Setting for graph ----------------
const defaults = {
  params: {
    govSpending: 50,
    taxRate: 25,
    interestRate: 3.5,
    productionCosts: 50,
    productivity: 50
  }
};

// persisted settings
const settings = {
  showAxisNumbers: (localStorage.getItem("macrow_show_axis_numbers") ?? "1") === "1"
};

let state = {
  tab: "policies",
  params: deepCopy(defaults.params),
  adShiftY: 0,
  asShiftP: 0,
  yFe: GRAPH.yFeBase
};

// ---------------- Parameters ----------------
function computeFromParams(p){
  const g = (p.govSpending - 50) * 0.60;
  const t = (25 - p.taxRate) * 0.90;
  const i = (3.5 - p.interestRate) * 4.00;

  const adShiftY = clamp(g + t + i, -60, 60);
  const asShiftP = clamp((p.productionCosts - 50) * 0.60, -22, 22);
  const yFe = clamp(GRAPH.yFeBase + (p.productivity - 50) * 1.00, 70, 160);

  return { adShiftY, asShiftP, yFe };
}

// ---------------- AD  ----------------
function AD(Y, adShiftY){
  const Y0 = GRAPH.adPivotY + adShiftY;
  return GRAPH.adIntercept - GRAPH.adSlope * (Y - Y0);
}
function invertAD_Y(P, adShiftY){
  const Y0 = GRAPH.adPivotY + adShiftY;
  return Y0 + (GRAPH.adIntercept - P) / GRAPH.adSlope;
}

// ---------------- Keynesian AS 2 ----------------
function ASshape({ asShiftP, yFe }){
  const pFlat = clamp(GRAPH.pFlat + asShiftP, GRAPH.Pmin + 6, GRAPH.Pmax - 40);
  const yKink = clamp(yFe - GRAPH.kinkGap, GRAPH.Ymin + 8, yFe - 10);
  const pEnd = clamp(pFlat + GRAPH.curveRise, GRAPH.Pmin + 10, GRAPH.Pmax - 10);

  const pts = [];
  pts.push([GRAPH.Ymin, pFlat]);
  pts.push([yKink, pFlat]);

  const steps = 60;
  for (let i = 1; i <= steps; i++){
    const t = i / steps;
    const y = lerp(yKink, yFe, t);
    const e = expEaseIn(t, 6);
    const p = pFlat + e * (pEnd - pFlat);
    pts.push([y, p]);
  }

  // Perfectly inelastic portion of AS
  pts.push([yFe, pEnd]);
  pts.push([yFe, GRAPH.Pmax - 6]);

  return { pts, yKink, yFe, pFlat, pEnd };
}

// ---------------- Eq ----------------
function equilibrium({ adShiftY, asShiftP, yFe }){
  const as = ASshape({ asShiftP, yFe });

  const asP = (Y) => {
    if (Y <= as.yKink) return as.pFlat;
    if (Y >= as.yFe) return as.pEnd;
    const t = clamp((Y - as.yKink) / (as.yFe - as.yKink), 0, 1);
    const e = expEaseIn(t, 6);
    return as.pFlat + e * (as.pEnd - as.pFlat);
  };

  const yMin = GRAPH.Ymin;
  const yMax = as.yFe;
  const h = (Y) => AD(Y, adShiftY) - asP(Y);

  const N = 420;
  let prevY = yMin;
  let prevH = h(prevY);

  for (let i = 1; i <= N; i++){
    const Y = lerp(yMin, yMax, i / N);
    const curH = h(Y);

    if (Number.isFinite(prevH) && Number.isFinite(curH) && prevH * curH < 0){
      let lo = prevY, hi = Y;
      for (let k = 0; k < 56; k++){
        const mid = (lo + hi) / 2;
        const hm = h(mid);
        if (h(lo) * hm < 0) hi = mid; else lo = mid;
      }
      const yStar = (lo + hi) / 2;
      return { y: yStar, p: AD(yStar, adShiftY), mode: "curve" };
    }

    prevY = Y;
    prevH = curH;
  }

  // demand-pull: vertical at Yf
  return { y: yFe, p: AD(yFe, adShiftY), mode: "vertical" };
}

// CLine Clipping
function clipLineToBox(m, b, box){
  const { Ymin, Ymax, Pmin, Pmax } = box;
  const pts = [];

  // Intersections with Y = Ymin, Ymax
  {
    const Y = Ymin;
    const P = m * Y + b;
    if (P >= Pmin && P <= Pmax) pts.push([Y, P]);
  }
  {
    const Y = Ymax;
    const P = m * Y + b;
    if (P >= Pmin && P <= Pmax) pts.push([Y, P]);
  }

  // Intersections with P = Pmin, Pmax
  if (Math.abs(m) > 1e-9){
    const Y1 = (Pmin - b) / m;
    if (Y1 >= Ymin && Y1 <= Ymax) pts.push([Y1, Pmin]);

    const Y2 = (Pmax - b) / m;
    if (Y2 >= Ymin && Y2 <= Ymax) pts.push([Y2, Pmax]);
  }

  // Fix close points
  const uniq = [];
  for (const p of pts){
    if (!uniq.some(q => Math.hypot(q[0]-p[0], q[1]-p[1]) < 1e-6)) uniq.push(p);
  }

  if (uniq.length < 2) return null;

  // Choosing furthest points
  let best = [uniq[0], uniq[1]];
  let bestD = -1;
  for (let i=0;i<uniq.length;i++){
    for (let j=i+1;j<uniq.length;j++){
      const d = (uniq[i][0]-uniq[j][0])**2 + (uniq[i][1]-uniq[j][1])**2;
      if (d > bestD){ bestD = d; best = [uniq[i], uniq[j]]; }
    }
  }
  return best;
}

function adLineSegment(adShiftY){
  // AD: P = -s*Y + (intercept + s*(pivot+shift))
  const s = GRAPH.adSlope;
  const m = -s;
  const bb = GRAPH.adIntercept + s * (GRAPH.adPivotY + adShiftY);
  const seg = clipLineToBox(m, bb, GRAPH);
  return { m, b: bb, seg };
}

// ---------------- Tabs + formula toggle ----------------
const navButtons = qsa(".navBtn");
navButtons.forEach(b => b.addEventListener("click", () => setTab(b.dataset.tab)));

function setTab(tab){
  state.tab = tab;

  navButtons.forEach(b => b.classList.toggle("navBtn--active", b.dataset.tab === tab));
  qs("#panelPolicies").classList.toggle("hidden", tab !== "policies");
  qs("#panelParameters").classList.toggle("hidden", tab !== "parameters");
  qs("#panelAbout").classList.toggle("hidden", tab !== "about");

  qs("#panelTitle").textContent =
    tab === "policies" ? "Policies" :
    tab === "parameters" ? "Parameters" :
    "About";

  const f = qs("#underGraphFormula");
  if (f) f.classList.toggle("hidden", tab !== "parameters");
}

// ---------------- Welcome Card (modal) ----------------
function showWelcomeIfNeeded(){
  const key = "macrow_welcome_dismissed_v2";
  const dismissed = localStorage.getItem(key) === "1";
  if (dismissed) return;

  const overlay = qs("#welcomeOverlay");
  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");

  const close = () => {
    const dont = qs("#welcomeDontShow").checked;
    if (dont) localStorage.setItem(key, "1");
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
  };

  qs("#welcomeClose").addEventListener("click", close, { once: true });
  qs("#welcomeOk").addEventListener("click", close, { once: true });
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); }, { once: true });
}

// ---------------- 6 Macro Policies ----------------
const policyCards = [
  {
    id: "fiscal_exp",
    name: "Fiscal expansionary",
    badge: { text: "AD → right", kind: "ad" },
    definition: "Increasing government spending and/or cutting tax rates to raise aggregate demand.",
    useWhen: "Recessionary gap (low output, rising unemployment).",
    apply: (p) => ({ ...p, govSpending: clamp(p.govSpending + 18, 0, 100), taxRate: clamp(p.taxRate - 8, 0, 50) }),
    eval: [
      "Higher inflation risk as output approaches Yf.",
      "Government debt may rise; possible crowding out.",
      "Time lags: decision + implementation."
    ],
    previewScenario: () => ({
      params: { ...defaults.params, govSpending: 15, taxRate: 45, interestRate: 8.5, productionCosts: 50, productivity: 50 },
      after: (p) => ({ ...p, govSpending: clamp(p.govSpending + 18, 0, 100), taxRate: clamp(p.taxRate - 8, 0, 50) }),
      caption: "Fix: recessionary gap",
      kind: "ad"
    })
  },
  {
    id: "fiscal_con",
    name: "Fiscal contractionary",
    badge: { text: "AD → left", kind: "ad" },
    definition: "Cutting government spending and/or raising tax rates to reduce aggregate demand.",
    useWhen: "Demand-pull inflation (excess demand).",
    apply: (p) => ({ ...p, govSpending: clamp(p.govSpending - 14, 0, 100), taxRate: clamp(p.taxRate + 6, 0, 50) }),
    eval: [
      "May reduce inflation but risk lower growth.",
      "Political difficulty: unpopular cuts/taxes.",
      "Time lags: policy may take time to work."
    ],
    previewScenario: () => ({
      params: { ...defaults.params, govSpending: 85, taxRate: 10, interestRate: 1.0, productionCosts: 50, productivity: 50 },
      after: (p) => ({ ...p, govSpending: clamp(p.govSpending - 14, 0, 100), taxRate: clamp(p.taxRate + 6, 0, 50) }),
      caption: "Fix: demand-pull inflation",
      kind: "ad"
    })
  },
  {
    id: "monetary_exp",
    name: "Monetary expansionary",
    badge: { text: "AD → right", kind: "ad" },
    definition: "Lowering interest rates to raise consumption and investment.",
    useWhen: "Recessionary gap (weak demand).",
    apply: (p) => ({ ...p, interestRate: clamp(p.interestRate - 1.3, 0, 10) }),
    eval: [
      "May increase inflation as output rises.",
      "Less effective if confidence is low.",
      "Exchange rate effects can change net exports."
    ],
    previewScenario: () => ({
      params: { ...defaults.params, govSpending: 20, taxRate: 44, interestRate: 9.0, productionCosts: 50, productivity: 50 },
      after: (p) => ({ ...p, interestRate: clamp(p.interestRate - 1.3, 0, 10) }),
      caption: "Fix: recessionary gap",
      kind: "ad"
    })
  },
  {
    id: "monetary_con",
    name: "Monetary contractionary",
    badge: { text: "AD → left", kind: "ad" },
    definition: "Raising interest rates to reduce consumption and investment.",
    useWhen: "Demand-pull inflation (excess demand).",
    apply: (p) => ({ ...p, interestRate: clamp(p.interestRate + 1.3, 0, 10) }),
    eval: [
      "Can reduce inflation but risk higher unemployment.",
      "Higher borrowing costs reduce spending.",
      "May appreciate currency; affects exports."
    ],
    previewScenario: () => ({
      params: { ...defaults.params, govSpending: 85, taxRate: 10, interestRate: 1.0, productionCosts: 50, productivity: 50 },
      after: (p) => ({ ...p, interestRate: clamp(p.interestRate + 1.3, 0, 10) }),
      caption: "Fix: demand-pull inflation",
      kind: "ad"
    })
  },
  {
    id: "ss_interv",
    name: "Supply-side interventionalist",
    badge: { text: "Yf → right", kind: "cap" },
    definition: "Government intervention to raise productive capacity (e.g., training, infrastructure).",
    useWhen: "Low long-run growth / low potential output.",
    apply: (p) => ({ ...p, productivity: clamp(p.productivity + 16, 0, 100) }),
    eval: [
      "Costly; opportunity cost for government budgets.",
      "Takes time; results are delayed.",
      "Risk of inefficiency / poor targeting."
    ],
    previewScenario: () => ({
      params: { ...defaults.params, productivity: 40, productionCosts: 50 },
      after: (p) => ({ ...p, productivity: clamp(p.productivity + 16, 0, 100) }),
      caption: "Increase potential output (Yf)",
      kind: "cap"
    })
  },
  {
    id: "ss_market",
    name: "Supply-side market-based",
    badge: { text: "Yf → right", kind: "cap" },
    definition: "Market reforms to increase efficiency (e.g., deregulation, competition).",
    useWhen: "Low productivity; long-run growth goals.",
    apply: (p) => ({ ...p, productivity: clamp(p.productivity + 12, 0, 100) }),
    eval: [
      "Transition costs: job losses in some sectors.",
      "Equity concerns and distributional impacts.",
      "Benefits depend on implementation and time."
    ],
    previewScenario: () => ({
      params: { ...defaults.params, productivity: 42, productionCosts: 50 },
      after: (p) => ({ ...p, productivity: clamp(p.productivity + 12, 0, 100) }),
      caption: "Increase potential output (Yf)",
      kind: "cap"
    })
  }
];

function impactSentence(kind, txt){
  if (kind === "ad" && txt.includes("right")) return "Higher output (if below Yf) and upward pressure on prices.";
  if (kind === "ad" && txt.includes("left")) return "Lower inflation pressure, but output may fall in the short run.";
  if (kind === "cap") return "Higher potential output (Yf shifts right).";
  return "Shifts the diagram in the expected direction.";
}

function renderPoliciesPanel(){
  const root = qs("#panelPolicies");
  root.innerHTML = `
    <div>
      <div class="sectionTitle">Choose a policy</div>
      <div class="sectionHint">Each card shows the original curve (faint) and the shifted curve (solid), with a clear shift arrow.</div>
    </div>
  `;

  policyCards.forEach(pc => {
    const el = document.createElement("div");
    el.className = "policy";

    const badgeClass =
      pc.badge.kind === "ad" ? "badge badge--ad" :
      pc.badge.kind === "cap" ? "badge badge--cap" :
      "badge badge--as";

    el.innerHTML = `
      <div class="policy__top">
        <div>
          <div class="policy__name">${escapeHtml(pc.name)}</div>
          <div class="badges" style="margin-top:8px;">
            <span class="${badgeClass}">${escapeHtml(pc.badge.text)}</span>
          </div>
        </div>
        <button class="btn btn--primary" data-apply="${pc.id}">Apply</button>
      </div>

      <div class="policy__mini">
        <svg data-mini="${pc.id}" viewBox="0 0 300 190" width="100%" height="190"></svg>
      </div>

      <div class="policy__text">
        <div><b>IB definition:</b> ${escapeHtml(pc.definition)}</div>
        <div style="margin-top:6px;"><b>Use when:</b> ${escapeHtml(pc.useWhen)}</div>
        <div style="margin-top:6px;"><b>Impact (typical):</b> ${impactSentence(pc.badge.kind, pc.badge.text)}</div>
        <ul class="eval">${pc.eval.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
      </div>
    `;
    root.appendChild(el);
  });

  policyCards.forEach(pc => {
    const svg = qs(`svg[data-mini="${pc.id}"]`);
    const scenario = pc.previewScenario();
    const base = computeFromParams(scenario.params);
    const after = computeFromParams(scenario.after(scenario.params));
    renderMiniPolicy(svg, { caption: scenario.caption, base, after, kind: scenario.kind });
  });

  root.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-apply]");
    if (!btn) return;
    const id = btn.getAttribute("data-apply");
    const pc = policyCards.find(p => p.id === id);
    if (!pc) return;
    state.params = pc.apply(state.params);
    onParamsChanged();
  });
}

// ---------------- Parameters dump ----------------
const paramDefs = [
  { key: "govSpending", label: "Government spending (G)", hint: "Higher G shifts AD right.", min: 0, max: 100, step: 1, format: (v) => `${v}` },
  { key: "taxRate", label: "Tax rate (T)", hint: "Higher T shifts AD left.", min: 0, max: 50, step: 1, format: (v) => `${v}%` },
  { key: "interestRate", label: "Interest rate (i)", hint: "Lower i shifts AD right.", min: 0, max: 10, step: 0.1, format: (v) => `${v.toFixed(1)}%` },
  { key: "productionCosts", label: "Production costs", hint: "Higher costs shift AS upward (cost-push).", min: 0, max: 100, step: 1, format: (v) => `${v}` },
  { key: "productivity", label: "Productivity (capacity / Yf)", hint: "Shifts Yf and the vertical part left/right.", min: 0, max: 100, step: 1, format: (v) => `${v}` }
];

function renderParametersPanel(){
  const root = qs("#panelParameters");
  root.innerHTML = `
    <div>
      <div class="sectionTitle">Explore the drivers</div>
      <div class="sectionHint">Use the sliders, then export the graph if you want to paste it into notes.</div>
    </div>
  `;

  paramDefs.forEach(d => {
    const wrap = document.createElement("div");
    wrap.className = "slider";
    wrap.innerHTML = `
      <div class="slider__top">
        <div>
          <div class="slider__label">${escapeHtml(d.label)}</div>
          <div class="slider__hint">${escapeHtml(d.hint)}</div>
        </div>
        <div class="slider__value" id="val_${d.key}">—</div>
      </div>
      <input type="range" id="rng_${d.key}" min="${d.min}" max="${d.max}" step="${d.step}">
    `;
    root.appendChild(wrap);
  });

  paramDefs.forEach(d => {
    const rng = qs(`#rng_${d.key}`);
    rng.value = state.params[d.key];
    rng.addEventListener("input", () => {
      state.params[d.key] = Number(rng.value);
      onParamsChanged();
    });
  });

  syncParamReadouts();
}

// ---------------- About panel (links - ) ----------------
//To-do: Add an embed button for coffee and linkedn

function renderAboutPanel(){
  const root = qs("#panelAbout");
  root.innerHTML = `
    <div>
      <div class="sectionTitle">About macrow</div>
      <div class="sectionHint">
        macrow is simplified for the IB Keynesian AD–AS diagram. Further individual exploration of these concepts is always recommended. This product is an early prototype, your feedback via e-mail is appreciated!. Good luck with your nomics! 
      </div>
    </div>

    <div class="policy">
      <div class="policy__name">Links</div>
      <div class="policy__text" style="margin-top:8px;">
        LinkedIn: <a class="link" href="https://linkedin.com/in/virajrao1" target="_blank" rel="noopener">linkedin.com/in/virajrao1</a><br/>
        Inquiries: <a class="link" href="mailto:raoco@virajrao.com">raoco@virajrao.com</a><br/>
        BuyMeACoffee: <a class="link" href="https://buymeacoffee.com/virajrao" target="_blank" rel="noopener">https://buymeacoffee.com/virajrao</a><br/>

      </div>
    </div>
  `;
}

// ---------------- Readouts and resetting ----------------
function syncParamReadouts(){
  paramDefs.forEach(d => {
    const el = qs(`#val_${d.key}`);
    const rng = qs(`#rng_${d.key}`);
    if (rng) rng.value = state.params[d.key];
    if (el) el.textContent = d.format(state.params[d.key]);
  });
}

qs("#btnReset").addEventListener("click", () => {
  state.params = deepCopy(defaults.params);
  onParamsChanged();
});

// Scenario buttons
qs("#btnMakeRecession").addEventListener("click", () => {
  state.params = { ...state.params, govSpending: 15, taxRate: 45, interestRate: 8.5, productionCosts: 50, productivity: 50 };
  onParamsChanged();
});
qs("#btnMakeDemandPull").addEventListener("click", () => {
  state.params = { ...state.params, govSpending: 85, taxRate: 10, interestRate: 1.0, productionCosts: 50, productivity: 50 };
  onParamsChanged();
});
qs("#btnClearGap").addEventListener("click", () => {
  state.params = deepCopy(defaults.params);
  onParamsChanged();
});

// Axis numbers toggle
const axisToggle = qs("#toggleAxisNumbers");
if (axisToggle){
  axisToggle.checked = settings.showAxisNumbers;
  axisToggle.addEventListener("change", () => {
    settings.showAxisNumbers = !!axisToggle.checked;
    localStorage.setItem("macrow_show_axis_numbers", settings.showAxisNumbers ? "1" : "0");
    renderMainChart();
  });
}

// Exporting as PNG
qs("#btnExportPng").addEventListener("click", () => exportChartPng());

// ---------------- Main render pipeline ----------------
function onParamsChanged(){
  const c = computeFromParams(state.params);
  state.adShiftY = c.adShiftY;
  state.asShiftP = c.asShiftP;
  state.yFe = c.yFe;

  syncParamReadouts();
  renderMainChart();
}

// ---------------- Chart rendering ----------------
function renderMainChart(){
  const svg = qs("#chartSvg");
  svg.innerHTML = "";

  const W = 860, H = 560;
  const pad = { l: 86, r: 28, t: 20, b: 78 };

  const xScale = (Y) => pad.l + ((Y - GRAPH.Ymin) / (GRAPH.Ymax - GRAPH.Ymin)) * (W - pad.l - pad.r);
  const yScale = (P) => pad.t + (1 - (P - GRAPH.Pmin) / (GRAPH.Pmax - GRAPH.Pmin)) * (H - pad.t - pad.b);

  rect(svg, 0, 0, W, H, 18, "rgba(255,255,255,0.02)");

  // Grid + ticks
  const yTicks = [30, 50, 70, 90, 110];
  const xTicks = [60, 90, 120, 150, 180];

  yTicks.forEach(P => {
    line(svg, pad.l, yScale(P), W - pad.r, yScale(P), "rgba(148,163,184,0.10)", 1);
    if (settings.showAxisNumbers){
      text(svg, pad.l - 10, yScale(P) + 4, String(P), "end", "rgba(148,163,184,0.70)", 12);
    }
  });

  xTicks.forEach(Y => {
    line(svg, xScale(Y), pad.t, xScale(Y), H - pad.b, "rgba(148,163,184,0.08)", 1);
    if (settings.showAxisNumbers){
      text(svg, xScale(Y), H - pad.b + 22, String(Y), "middle", "rgba(148,163,184,0.70)", 12);
    }
  });

  // Axes
  line(svg, pad.l, pad.t, pad.l, H - pad.b, "rgba(226,232,240,0.70)", 3);
  line(svg, pad.l, H - pad.b, W - pad.r, H - pad.b, "rgba(226,232,240,0.70)", 3);

  // Axis labels
  text(svg, (pad.l + (W - pad.r)) / 2, H - 18, "Real GDP ($)", "middle", "rgba(226,232,240,0.92)", 15, true);
  textRot(svg, 22, (pad.t + (H - pad.b))/2, "Average Price Level ($)", -90, "middle", "rgba(226,232,240,0.92)", 15, true);

  const base = computeFromParams(defaults.params);
  const cur  = { adShiftY: state.adShiftY, asShiftP: state.asShiftP, yFe: state.yFe };

  // LRAS
  drawLRAS(svg, xScale, base.yFe, pad, H, "rgba(34,197,94,0.18)", "6 8");
  drawLRAS(svg, xScale, cur.yFe,  pad, H, "rgba(34,197,94,0.70)", "6 6");

  // AD (properly clipped line segment => no “flat” kink)
  const adBase = adLineSegment(base.adShiftY).seg;
  const adCur  = adLineSegment(cur.adShiftY).seg;

  if (adBase){
    strokePath(svg, pathFromModelSegment(xScale, yScale, adBase), "rgba(239,68,68,0.22)", 5, "6 8");
  }
  if (adCur){
    strokePath(svg, pathFromModelSegment(xScale, yScale, adCur), "rgba(239,68,68,0.95)", 6);
  }

  // AS (smooth + vertical)
  const asBase = ASshape({ asShiftP: base.asShiftP, yFe: base.yFe });
  const asCur  = ASshape({ asShiftP: cur.asShiftP,  yFe: cur.yFe });

  strokePath(svg, pathFromPoints(xScale, yScale, asBase.pts), "rgba(59,130,246,0.22)", 5, "6 8");
  strokePath(svg, pathFromPoints(xScale, yScale, asCur.pts),  "rgba(59,130,246,0.95)", 6);

  // Shift arrows
  drawADShiftArrow(svg, xScale, yScale, base, cur);
  drawYfShiftArrow(svg, xScale, base.yFe, cur.yFe);

  // Labels
  labelOnAD(svg, xScale, yScale, cur.adShiftY);
  labelOnAS(svg, xScale, yScale, asCur);
  labelOnLRAS(svg, xScale, cur.yFe);

  renderStateAndChips(base, cur);
}

function renderStateAndChips(base, cur){
  const chipRoot = qs("#changeChips");
  const gapRoot = qs("#gapLabel");

  const eqBase = equilibrium(base);
  const eqCur  = equilibrium(cur);
  const asCur  = ASshape({ asShiftP: cur.asShiftP, yFe: cur.yFe });

  const dY = eqCur.y - eqBase.y;
  const dP = eqCur.p - eqBase.p;

  chipRoot.innerHTML = "";
  chipRoot.appendChild(chip(dY, "Output"));
  chipRoot.appendChild(chip(dP, "Prices"));

  const epsY = 2.0;
  const onFlat = eqCur.y <= (asCur.yKink + 1.5);
  const nearYf = Math.abs(eqCur.y - cur.yFe) <= epsY;

  if (onFlat) {
    gapRoot.textContent = "State: recessionary gap (output below Yf)";
    return;
  }
  if (nearYf) {
    if (eqCur.p > asCur.pEnd + 2) gapRoot.textContent = "State: demand-pull inflation (up the vertical Keynesian AS)";
    else gapRoot.textContent = "State: full employment (at Yf)";
    return;
  }
  gapRoot.textContent = "State: approaching full employment";
}

function chip(delta, label){
  const el = document.createElement("div");
  let cls = "chip chip--flat";
  let arrow = "→";
  if (delta > 1.2) { cls = "chip chip--up"; arrow = "↑"; }
  if (delta < -1.2){ cls = "chip chip--down"; arrow = "↓"; }
  el.className = cls;
  el.textContent = `${label} ${arrow}`;
  return el;
}

// ---------------- Mini previews (also clipped AD) ----------------
function renderMiniPolicy(svg, { caption, base, after, kind }){
  svg.innerHTML = "";

  const W = 300, H = 190;
  const pad = { l: 34, r: 10, t: 12, b: 22 };

  const xScale = (Y) => pad.l + ((Y - GRAPH.Ymin) / (GRAPH.Ymax - GRAPH.Ymin)) * (W - pad.l - pad.r);
  const yScale = (P) => pad.t + (1 - (P - GRAPH.Pmin) / (GRAPH.Pmax - GRAPH.Pmin)) * (H - pad.t - pad.b);

  miniRect(svg, 0, 0, W, H, 12, "rgba(255,255,255,0.02)");
  miniLine(svg, pad.l, pad.t, pad.l, H - pad.b, "rgba(226,232,240,0.40)", 2);
  miniLine(svg, pad.l, H - pad.b, W - pad.r, H - pad.b, "rgba(226,232,240,0.40)", 2);

  miniLine(svg, xScale(base.yFe), pad.t, xScale(base.yFe), H - pad.b, "rgba(34,197,94,0.25)", 2, "5 6");
  miniLine(svg, xScale(after.yFe), pad.t, xScale(after.yFe), H - pad.b, "rgba(34,197,94,0.55)", 2, "5 6");

  const adB = adLineSegment(base.adShiftY).seg;
  const adA = adLineSegment(after.adShiftY).seg;

  if (adB) miniStroke(svg, miniPathFromModelSegment(xScale, yScale, adB), "rgba(239,68,68,0.25)", 4, "6 7");
  if (adA) miniStroke(svg, miniPathFromModelSegment(xScale, yScale, adA), "rgba(239,68,68,0.95)", 4);

  const asBase  = ASshape({ asShiftP: base.asShiftP,  yFe: base.yFe });
  const asAfter = ASshape({ asShiftP: after.asShiftP, yFe: after.yFe });

  miniStroke(svg, miniPathFromPoints(xScale, yScale, asBase.pts),  "rgba(59,130,246,0.25)", 4, "6 7");
  miniStroke(svg, miniPathFromPoints(xScale, yScale, asAfter.pts), "rgba(59,130,246,0.95)", 4);

  if (kind === "ad") {
    const P = 78;
    const y1 = clamp(invertAD_Y(P, base.adShiftY), GRAPH.Ymin, GRAPH.Ymax);
    const y2 = clamp(invertAD_Y(P, after.adShiftY), GRAPH.Ymin, GRAPH.Ymax);
    miniArrow(svg, xScale(y1), yScale(P), xScale(y2), yScale(P), "rgba(239,68,68,0.95)");
  } else if (kind === "cap") {
    miniArrow(svg, xScale(base.yFe), pad.t + 16, xScale(after.yFe), pad.t + 16, "rgba(34,197,94,0.90)");
  }

  miniText(svg, 10, 18, caption, "start", "rgba(226,232,240,0.85)", 12, true);
}

// ---------------- Shift arrows ----------------
function drawADShiftArrow(svg, xScale, yScale, base, cur){
  const d = cur.adShiftY - base.adShiftY;
  if (Math.abs(d) < 1.8) return;

  const P = 78;
  const y1 = clamp(invertAD_Y(P, base.adShiftY), GRAPH.Ymin + 2, GRAPH.Ymax - 2);
  const y2 = clamp(invertAD_Y(P, cur.adShiftY),  GRAPH.Ymin + 2, GRAPH.Ymax - 2);

  arrow(svg, xScale(y1), yScale(P), xScale(y2), yScale(P), "rgba(239,68,68,0.90)");
}

function drawYfShiftArrow(svg, xScale, yFeBase, yFeCur){
  const d = yFeCur - yFeBase;
  if (Math.abs(d) < 1.2) return;

  const y = 44;
  arrow(svg, xScale(yFeBase), y, xScale(yFeCur), y, "rgba(34,197,94,0.85)");
}

// ---------------- Labels ----------------
function labelOnLRAS(svg, xScale, yFe){
  boxedLabel(svg, xScale(yFe) + 54, 72, "LRAS", "rgba(34,197,94,0.90)");
}

function labelOnAD(svg, xScale, yScale, adShiftY){
  const seg = adLineSegment(adShiftY).seg;
  if (!seg) return;

  // place label near the right-half of the line segment
  const p1 = seg[0], p2 = seg[1];
  const t = 0.72;
  const Y = lerp(p1[0], p2[0], t);
  const P = lerp(p1[1], p2[1], t);

  boxedLabel(svg, xScale(Y) + 20, yScale(P) - 20, "AD", "rgba(239,68,68,0.95)");
}

function labelOnAS(svg, xScale, yScale, asCur){
  const Y = asCur.yKink + 10;
  const P = asCur.pFlat + 5;
  boxedLabel(svg, xScale(Y) + 44, yScale(P) - 18, "AS", "rgba(59,130,246,0.95)");
}

// ---------------- Export PNG ----------------
async function exportChartPng(){
  const svg = qs("#chartSvg");
  if (!svg) return;

  // clone + add background
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", "860");
  clone.setAttribute("height", "560");

  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("x", "0");
  bg.setAttribute("y", "0");
  bg.setAttribute("width", "860");
  bg.setAttribute("height", "560");
  bg.setAttribute("fill", "#0b1220");
  clone.insertBefore(bg, clone.firstChild);

  const serializer = new XMLSerializer();
  const svgText = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.decoding = "async";

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });

  const scale = 2; // sharper export
  const canvas = document.createElement("canvas");
  canvas.width = 860 * scale;
  canvas.height = 560 * scale;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  URL.revokeObjectURL(url);

  const pngUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = pngUrl;
  a.download = `macrow-graph-${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ---------------- SVG helpers ----------------
function rect(svg, x, y, w, h, r, fill){
  const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  el.setAttribute("x", x);
  el.setAttribute("y", y);
  el.setAttribute("width", w);
  el.setAttribute("height", h);
  el.setAttribute("rx", r);
  el.setAttribute("fill", fill);
  svg.appendChild(el);
}

function line(svg, x1, y1, x2, y2, stroke, strokeWidth, dash){
  const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
  el.setAttribute("x1", x1); el.setAttribute("y1", y1);
  el.setAttribute("x2", x2); el.setAttribute("y2", y2);
  el.setAttribute("stroke", stroke);
  el.setAttribute("stroke-width", strokeWidth);
  el.setAttribute("stroke-linecap", "round");
  if (dash) el.setAttribute("stroke-dasharray", dash);
  svg.appendChild(el);
}

function text(svg, x, y, s, anchor, fill, size, bold=false){
  const el = document.createElementNS("http://www.w3.org/2000/svg", "text");
  el.setAttribute("x", x); el.setAttribute("y", y);
  el.setAttribute("text-anchor", anchor);
  el.setAttribute("fill", fill);
  el.setAttribute("font-size", size);
  el.setAttribute("font-family", "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial");
  if (bold) el.setAttribute("font-weight", "900");
  el.textContent = s;
  svg.appendChild(el);
}

function textRot(svg, x, y, s, deg, anchor, fill, size, bold=false){
  const el = document.createElementNS("http://www.w3.org/2000/svg", "text");
  el.setAttribute("x", x); el.setAttribute("y", y);
  el.setAttribute("text-anchor", anchor);
  el.setAttribute("fill", fill);
  el.setAttribute("font-size", size);
  el.setAttribute("font-family", "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial");
  if (bold) el.setAttribute("font-weight", "900");
  el.setAttribute("transform", `rotate(${deg} ${x} ${y})`);
  el.textContent = s;
  svg.appendChild(el);
}

function strokePath(svg, d, stroke, width, dash){
  const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
  el.setAttribute("d", d);
  el.setAttribute("fill", "none");
  el.setAttribute("stroke", stroke);
  el.setAttribute("stroke-width", width);
  el.setAttribute("stroke-linecap", "round");
  el.setAttribute("stroke-linejoin", "round");
  if (dash) el.setAttribute("stroke-dasharray", dash);
  svg.appendChild(el);
}

function pathFromPoints(xScale, yScale, pts){
  const pix = pts.map(([Y, P]) => [xScale(Y), yScale(P)]);
  return pathFromPixelPoints(pix);
}

function pathFromModelSegment(xScale, yScale, seg){
  const p1 = seg[0], p2 = seg[1];
  const pix = [[xScale(p1[0]), yScale(p1[1])], [xScale(p2[0]), yScale(p2[1])]];
  return pathFromPixelPoints(pix);
}

function pathFromPixelPoints(pts){
  if (!pts.length) return "";
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)} `;
  for (let i=1;i<pts.length;i++){
    d += `L ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)} `;
  }
  return d;
}

function boxedLabel(svg, x, y, label, color){
  const paddingX = 10, paddingY = 7;
  const fontSize = 13;
  const approxW = Math.max(36, label.length * 7.2);
  const w = approxW + paddingX * 2;
  const h = fontSize + paddingY * 2;
  const rx = 12;

  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("x", (x - w/2).toFixed(2));
  bg.setAttribute("y", (y - h/2).toFixed(2));
  bg.setAttribute("width", w.toFixed(2));
  bg.setAttribute("height", h.toFixed(2));
  bg.setAttribute("rx", rx);
  bg.setAttribute("fill", "rgba(11,18,32,0.70)");
  bg.setAttribute("stroke", color);
  bg.setAttribute("stroke-width", "2");
  svg.appendChild(bg);

  const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
  t.setAttribute("x", x.toFixed(2));
  t.setAttribute("y", (y + fontSize/3).toFixed(2));
  t.setAttribute("text-anchor", "middle");
  t.setAttribute("fill", "rgba(226,232,240,0.95)");
  t.setAttribute("font-size", fontSize);
  t.setAttribute("font-weight", "950");
  t.setAttribute("font-family", "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial");
  t.textContent = label;
  svg.appendChild(t);
}

function drawLRAS(svg, xScale, yFe, pad, H, stroke, dash){
  const x = xScale(yFe);
  line(svg, x, pad.t, x, H - pad.b, stroke, 3.5, dash);
}

function arrow(svg, x1, y1, x2, y2, color){
  line(svg, x1, y1, x2, y2, color, 3.5);
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const len = 12;
  const a1 = ang + Math.PI * 0.85;
  const a2 = ang - Math.PI * 0.85;

  line(svg, x2, y2, x2 + Math.cos(a1) * len, y2 + Math.sin(a1) * len, color, 3.5);
  line(svg, x2, y2, x2 + Math.cos(a2) * len, y2 + Math.sin(a2) * len, color, 3.5);
}

// ---------------- Mini SVG helpers ----------------
function miniRect(svg, x, y, w, h, r, fill){
  const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  el.setAttribute("x", x);
  el.setAttribute("y", y);
  el.setAttribute("width", w);
  el.setAttribute("height", h);
  el.setAttribute("rx", r);
  el.setAttribute("fill", fill);
  svg.appendChild(el);
}
function miniLine(svg, x1, y1, x2, y2, stroke, strokeWidth, dash){
  const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
  el.setAttribute("x1", x1); el.setAttribute("y1", y1);
  el.setAttribute("x2", x2); el.setAttribute("y2", y2);
  el.setAttribute("stroke", stroke);
  el.setAttribute("stroke-width", strokeWidth);
  el.setAttribute("stroke-linecap", "round");
  if (dash) el.setAttribute("stroke-dasharray", dash);
  svg.appendChild(el);
}
function miniText(svg, x, y, s, anchor, fill, size, bold=false){
  const el = document.createElementNS("http://www.w3.org/2000/svg", "text");
  el.setAttribute("x", x); el.setAttribute("y", y);
  el.setAttribute("text-anchor", anchor);
  el.setAttribute("fill", fill);
  el.setAttribute("font-size", size);
  el.setAttribute("font-family", "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial");
  if (bold) el.setAttribute("font-weight", "900");
  el.textContent = s;
  svg.appendChild(el);
}
function miniStroke(svg, d, stroke, width, dash){
  const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
  el.setAttribute("d", d);
  el.setAttribute("fill", "none");
  el.setAttribute("stroke", stroke);
  el.setAttribute("stroke-width", width);
  el.setAttribute("stroke-linecap", "round");
  el.setAttribute("stroke-linejoin", "round");
  if (dash) el.setAttribute("stroke-dasharray", dash);
  svg.appendChild(el);
}
function miniPathFromPoints(xScale, yScale, pts){
  const pix = pts.map(([Y, P]) => [xScale(Y), yScale(P)]);
  return pathFromPixelPoints(pix);
}
function miniPathFromModelSegment(xScale, yScale, seg){
  const p1 = seg[0], p2 = seg[1];
  return pathFromPixelPoints([[xScale(p1[0]), yScale(p1[1])], [xScale(p2[0]), yScale(p2[1])]]);
}
function miniArrow(svg, x1, y1, x2, y2, color){
  miniLine(svg, x1, y1, x2, y2, color, 2.8);
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const len = 9;
  const a1 = ang + Math.PI * 0.85;
  const a2 = ang - Math.PI * 0.85;
  miniLine(svg, x2, y2, x2 + Math.cos(a1)*len, y2 + Math.sin(a1)*len, color, 2.8);
  miniLine(svg, x2, y2, x2 + Math.cos(a2)*len, y2 + Math.sin(a2)*len, color, 2.8);
}

// ---------------- Init Function ---------------
function init(){
  renderPoliciesPanel();
  renderParametersPanel();
  renderAboutPanel();

  setTab("policies");
  showWelcomeIfNeeded();

  // Default at Yf
  state.params = deepCopy(defaults.params);
  onParamsChanged();
}

init();
