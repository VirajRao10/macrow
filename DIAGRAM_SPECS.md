# Macrow diagram specs — for a higher-quality image model

These are the 15 lesson diagrams. Each spec describes exactly what the diagram
should show, in the same way a textbook illustrator's brief would read. The
current PNGs in `assets/diagrams/` are AI-generated placeholders; the goal is
to replace them with sharper, more pedagogically precise versions.

## Global style guide (apply to every diagram)

- **Format:** 1600 × 1200 px PNG, 4:3 aspect ratio. Light cream background
  (`#FAF8F4` exact), no gradients, no 3D, no shadows on chart elements.
- **Typography:** Use a clean sans-serif for axis labels and curve labels
  (Inter, Source Sans, or similar). Use the SAME serif as macrow's headings
  (Source Serif 4 or fallback `ui-serif, Georgia`) for the **diagram title only**.
- **Color palette** (locked, use these exact hex values):
  - AD (aggregate demand) curve: `#B91C1C` (deep red)
  - SRAS (short-run aggregate supply) curve: `#1D4ED8` (deep blue)
  - LRAS / Yf marker: `#15803D` (deep green)
  - SRPC (short-run Phillips curve): `#1D4ED8` (blue)
  - LRPC (long-run Phillips curve): `#C2410C` (burnt orange)
  - Shaded "shift" indicator: dashed version of the parent curve, 60% opacity
  - Equilibrium point / dot: `#0F172A` (near-black)
  - Dashed reference lines (gridlines, projection lines): `#94A3B8` (slate)
  - Axis lines: `#334155` (dark slate), 1.4 px
  - Tick marks on axes: `#334155`, 0.8 px
  - Annotation text: `#334155`
  - Inequality-area shading (Lorenz): `#FED7AA` at 60% opacity (warm amber)
- **Arrowheads:** All flow arrows (circular flow, money flows) MUST have
  proper triangular arrowheads, not just lines. Arrowhead size: 8–10 px wide.
- **Curve labels:** Position the label NEAR the curve end (not floating in
  empty space). Use the curve's own color, weight 600, size 14–16 px.
- **Equilibrium points:** Black filled circle, 5 px diameter. Optionally
  labelled "E", "E₀", "E₁" right next to the dot.
- **Axis labels:** Sans-serif, 14 px, weight 500, color `#0F172A`. Pluralise
  ("Real GDP" not "Real GDP (Y)"; the (Y) goes in the symbol legend if needed).
- **Tick numbers:** 12 px, color `#64748B`.
- **No emoji.** No decorative flourishes. No "I love economics" watermarks.
- **Title:** Top-centre, serif, 22 px, weight 600. Either a short label
  (e.g. "Circular Flow of Income") OR a figure number ("Figure 3.2") — not
  both. Add a thin horizontal rule under the title.
- **Captions live in the app, not in the image** — keep the image pure
  diagram, no extra explanatory text below the chart. The web app shows
  the caption separately below the image.

---

## 1. Circular Flow of Income (lesson 3.1.1)

**Title:** Circular Flow of Income

**What to draw (4-sector open economy):**

Four boxes arranged in a roughly circular layout (NOT a row):
- **Households** — bottom centre
- **Firms** — top centre
- **Government** — top-left or middle-left
- **Foreign sector (overseas)** — middle-right (label as "Overseas sector" or "Foreign sector")

**Arrows (with proper triangular heads):**
- **Households → Firms:** "Goods and services" (real flow, dashed line, sage green)
- **Firms → Households:** "Wages, rent, profit" (money flow, solid line, terracotta)
- **Households → Government:** "Taxes (T)" (money flow, terracotta, going up-left)
- **Government → Households:** "Government spending (G)" or "Transfers" (money flow, terracotta, going down-right)
- **Government → Firms:** "Government spending (G)" (money flow, terracotta, going right)
- **Firms → Government:** "Indirect taxes" (money flow, terracotta, going left)
- **Households → Foreign:** "Imports (M)" (money flow, terracotta, going right)
- **Foreign → Households:** "Imports" reverse, label as "Spending on imports"
- **Firms → Foreign:** "Exports (X)" (money flow, terracotta, going right)
- **Foreign → Firms:** "Imports of goods" (real flow, dashed sage)

**Visual hierarchy:** Real flows (goods, labour, services) as dashed sage
green lines. Money flows (wages, taxes, spending, exports, imports) as solid
terracotta lines. Each arrow has a label on or near it.

**Bottom of diagram:** Small text "Injections (I + G + X) = Leakages (S + T + M) at equilibrium."

---

## 2. Business Cycle (lesson 3.1.4)

**Title:** Business Cycle

**Layout:** Time-series chart.
- X-axis: "Time" (no specific years, just a generic timeline)
- Y-axis: "Real GDP" (with a horizontal dashed line for "Yf" = potential output, OR a "Long-run growth trend" diagonal line)

**What to draw:**
- A long-run growth trend: a smooth diagonal line going from bottom-left to top-right (slight upward slope, dashed grey).
- A wavy/sinusoidal line oscillating around the trend. Should complete at least 2 full cycles.
- Mark the **four phases** clearly with shaded background bands or labels:
  - **Expansion** (rising portion of cycle)
  - **Peak** (top of cycle)
  - **Recession / Contraction** (falling portion)
  - **Trough** (bottom of cycle)
- Use small dots or markers on the wave at each phase transition.
- Yf line: a horizontal dashed line through the middle of the wave amplitude (representing potential output), OR a separate "long-run growth trend" that the wave oscillates around.

**Labels:** "Peak", "Recession", "Trough", "Expansion" — placed directly above/below the wave at the relevant points.

---

## 3. AD curve (lesson 3.2.1)

**Title:** Aggregate Demand Curve

**Layout:** Standard price-quantity chart.
- X-axis: "Real GDP (Y)"
- Y-axis: "Price level (P)"

**What to draw:**
- A single AD curve: downward-sloping straight line (or very slightly curved), drawn in deep red (`#B91C1C`), 2.5 px stroke.
- The line should be clipped to the chart box (only the relevant portion shown).
- Label "AD" at the right end of the curve, in deep red, weight 600.
- Optional: a second AD curve dashed, shifted slightly to the right, labelled "AD →" to indicate a rightward shift. Keep the shift subtle so the primary AD is the focus.

**No gridlines, no annotations of determinants** — this diagram just shows the
curve and its downward slope. Determinant shifts are covered in a separate
diagram.

---

## 4. SRAS curve (lesson 3.2.2)

**Title:** Short-Run Aggregate Supply Curve

**Layout:** Standard price-quantity chart.
- X-axis: "Real GDP (Y)"
- Y-axis: "Price level (P)"

**What to draw:**
- A vertical dashed line at Yf (potential output), labelled "Yf" at the bottom, in deep green (`#15803D`).
- The SRAS curve in deep blue (`#1D4ED8`), 2.5 px stroke, three segments:
  1. Horizontal at low Y (the "Keynesian" flat region, far left)
  2. Upward-sloping in the middle (the "intermediate" region)
  3. Vertical at Yf (the "classical" region)
- Label "SRAS" at the top right end of the curve, in deep blue.

**This shape MUST be exact:** flat → upward slope → vertical. The transition
points (where the slope changes) should be smooth, not sharp corners.

---

## 5. LRAS / Keynesian AS comparison (lesson 3.2.3)

**Title:** Long-Run Aggregate Supply: Monetarist vs Keynesian

**Layout:** Two side-by-side panels in a single image.

**Left panel — "Monetarist / New classical view":**
- X-axis: "Real GDP (Y)"
- Y-axis: "Price level (P)"
- A single vertical line at Yf, in deep green, labelled "LRAS" at the top.
- Caption under panel: "LRAS is vertical at the natural rate of unemployment."

**Right panel — "Keynesian view":**
- Same axes.
- A line that starts horizontal at low Y and slopes upward, ending near Yf but NOT going vertical. Use deep green or deep blue for this line. Label "AS" at the top.
- Caption: "AS slopes upward over the long run; prices and output are flexible."

Both panels should be the same size, side by side, with a thin separator
between them.

---

## 6. Macroeconomic equilibrium (lesson 3.2.4)

**Title:** Macroeconomic Equilibrium and Self-Correction

**Layout:** Standard price-quantity chart.
- X-axis: "Real GDP (Y)"
- Y-axis: "Price level (P)"

**What to draw:**
- LRAS: vertical dashed line at Yf, deep green, labelled "LRAS" at the top.
- AD: downward-sloping curve in deep red, labelled "AD" at the right end.
- SRAS₀: upward-then-vertical curve in deep blue (flat, slope up, vertical at Yf), labelled "SRAS₀" at the top right.
- **Equilibrium E₀:** black dot where AD intersects SRAS₀ — should be to the RIGHT of Yf (inflationary gap). Label "E₀" next to the dot.
- SRAS₁: a second SRAS curve dashed (60% opacity blue), shifted LEFT from SRAS₀. This is the post-self-correction curve. Label "SRAS₁" at the top right (dashed).
- **New equilibrium E:** black dot at the intersection of AD with SRAS₁ — should be exactly on Yf. Label "E" next to the dot.
- Dashed projection lines from E₀ down to X-axis and left to Y-axis, both in slate grey. Same for E.
- A small arrow showing the direction of the SRAS shift (left, with "Self-correction" label).

---

## 7. Long-run growth (lesson 3.3.1)

**Title:** Long-Run Economic Growth (LRAS Shift)

**Layout:** Standard price-quantity chart.
- X-axis: "Real GDP (Y)"
- Y-axis: "Price level (P)"

**What to draw:**
- LRAS₀: vertical dashed line at Yf₀, deep green, labelled "LRAS₀ / Yf₀" at the bottom.
- LRAS₁: vertical solid line at Yf₁ (further right), deep green, labelled "LRAS₁ / Yf₁" at the bottom.
- A big rightward arrow between them (or between the labels), labelled "Long-run growth →".
- AD: downward-sloping curve in deep red.
- SRAS: upward-then-vertical curve in deep blue, ending at the new Yf₁ position.
- A small label/annotation: "Growth = more/better factors, technology, efficiency."

---

## 8. Unemployment / Minimum wage (lesson 3.3.2)

**Title:** Minimum Wage and Unemployment

**Layout:** Standard labour-market chart.
- X-axis: "Quantity of labour"
- Y-axis: "Wage rate (W)"

**What to draw:**
- Labour demand (D_L): downward-sloping line in deep blue.
- Labour supply (S_L): upward-sloping line in deep red.
- Equilibrium point **We**: black dot at the intersection. Project dashed lines down to X-axis (Qe) and left to Y-axis (We). Both labels.
- A horizontal dashed line ABOVE We, in deep amber, labelled "Minimum wage" (left side).
- The vertical gap between this minimum-wage line and the demand curve = Qd (labour demanded at the minimum wage).
- The vertical gap between this minimum-wage line and the supply curve = Qs (labour supplied at the minimum wage).
- A horizontal bracket between Qd and Qs, labelled "Unemployment" above.
- Both Qd and Qs labelled on the X-axis.

---

## 9. Demand-pull vs Cost-push inflation (lesson 3.3.3)

**Title:** Demand-Pull and Cost-Push Inflation

**Layout:** Two side-by-side AD/AS panels.

**Left panel — "Demand-pull inflation":**
- X-axis: "Real GDP (Y)"
- Y-axis: "Price level (P)"
- AD₀: downward-sloping curve in deep red, labelled.
- AD₁: dashed deep red, shifted RIGHT. A rightward arrow between them.
- SRAS: upward-then-vertical curve in deep blue.
- LRAS: vertical dashed line at Yf in deep green.
- Equilibrium E₀ at the original intersection.
- Equilibrium E₁ at the new intersection (higher Y, higher P).
- Dashed projection lines to axes for both E₀ and E₁, labelled P₀/P₁ and Y₀/Y₁ (or Yf).

**Right panel — "Cost-push inflation (stagflation)":**
- Same axes.
- AD: downward-sloping curve in deep red (only one AD curve here, no shift).
- SRAS₀: upward-then-vertical curve in deep blue, labelled.
- SRAS₁: dashed deep blue, shifted LEFT. A leftward arrow between them.
- LRAS: vertical dashed line at Yf in deep green.
- Equilibrium E₀ at the original intersection.
- Equilibrium E₁ at the new intersection (LOWER Y, higher P — stagflation).
- Dashed projection lines for E₀ and E₁, labelled P₀/P₁ and Y₀/Y₁.

---

## 10. Phillips curve (lesson 3.3.4)

**Title:** The Phillips Curve (Short-Run and Long-Run)

**Layout:** Standard Phillips-curve chart.
- X-axis: "Unemployment rate (U)"
- Y-axis: "Inflation rate (π)"

**What to draw:**
- SRPC: downward-sloping curve in deep blue, labelled "SRPC" at the lower-right end.
- LRPC: vertical solid line in burnt orange, positioned at Un (the natural rate of unemployment), labelled "LRPC" at the top.
- X-axis: "Un" labelled at the point where LRPC meets the X-axis.
- No gridlines. Just the two curves.

**Keep it minimal.** The lesson explains the dynamics; the diagram just
shows the two curves and their relative positions.

---

## 11. Phillips curve shifts / stagflation (lesson 3.3.4 alternative)

**Title:** Stagflation and the Phillips Curve Shift

**Layout:** Same as diagram 10, plus a shifted SRPC.

**What to draw:**
- SRPC₁: original SRPC in deep blue.
- SRPC₂: shifted SRPC in deep blue, dashed (60% opacity), moved UP and to the RIGHT. Multiple arrows showing the rightward shift.
- LRPC: same vertical line in burnt orange.
- A shaded "stagflation zone" or annotation in the upper-right area where the new SRPC₂ crosses LRPC at high inflation and the natural rate of unemployment.
- An arrow pointing to that intersection labelled "Stagflation (high π, high U)" or just an annotation.

---

## 12. Lorenz curve (lesson 3.4.1)

**Title:** Lorenz Curve and Income Inequality

**Layout:** Standard Lorenz-curve chart.
- X-axis: "Cumulative % of population" (from 0% to 100%, ticks at 20/40/60/80/100)
- Y-axis: "Cumulative % of income" (same range and ticks)

**What to draw:**
- A 45° dashed line from origin to (100%, 100%), labelled "Line of perfect equality" near the top.
- A bowed curve below it (the Lorenz curve), starting at (0%, 0%) and ending at (100%, 100%), passing through approximately (40%, 20%) and (80%, 60%) or similar to convey clear inequality.
- The area BETWEEN the line of equality and the Lorenz curve shaded in light amber (`#FED7AA` at 60% opacity), labelled "Inequality area" or "A".
- A small label on the Lorenz curve itself: "Lorenz curve".
- The area BELOW the Lorenz curve, between it and the X-axis, can be labelled "B" or left unlabelled. The Gini ratio is A / (A + B).

---

## 13. AD/AS with policy (lessons 3.5.4, 3.6.2 — used for both fiscal and monetary policy)

**Title:** Expansionary Policy in the AD–AS Model

**Layout:** Standard price-quantity chart.
- X-axis: "Real GDP (Y)"
- Y-axis: "Price level (P)"

**What to draw:**
- LRAS: vertical dashed line at Yf in deep green, labelled.
- SRAS: upward-then-vertical curve in deep blue, ending at Yf, labelled.
- AD₀: downward-sloping curve in deep red, labelled.
- AD₁: shifted AD curve, dashed (60% opacity red), shifted RIGHT relative to AD₀. A rightward arrow between them.
- Equilibrium E₀ at the original intersection (AD₀ ∩ SRAS). Dashed projection lines to both axes.
- Equilibrium E₁ at the new intersection (AD₁ ∩ SRAS). Dashed projection lines to both axes. E₁ should be at higher Y AND higher P than E₀.
- Both E₀ and E₁ labelled.
- A small annotation: "Expansionary policy → higher Y, higher P."

---

## 14. Crowding out (lesson 3.6.5)

**Title:** Crowding Out in the Loanable Funds Market

**Layout:** Standard loanable-funds chart.
- X-axis: "Quantity of loanable funds"
- Y-axis: "Real interest rate (r)"

**What to draw:**
- Supply of loanable funds: upward-sloping line in deep blue, labelled.
- Demand D₀: downward-sloping line in deep red, labelled.
- Demand D₁: shifted demand, dashed deep red (60% opacity), shifted RIGHT. A rightward arrow labelled "G ↑ (deficit)".
- Original equilibrium: r₀ at the intersection of D₀ and supply. Dashed projection lines to both axes, labelled.
- New equilibrium: r₁ at the intersection of D₁ and supply, with r₁ > r₀. Dashed projection lines, labelled.
- An arrow showing "I ↓" (private investment falls) — could be a small downward arrow near the X-axis labelled "Crowding out".

---

## 15. Money market (lessons 3.5.2, 3.5.3)

**Title:** The Money Market and Equilibrium Interest Rate

**Layout:** Standard money-market chart.
- X-axis: "Quantity of money (M)"
- Y-axis: "Nominal interest rate (i)"

**What to draw:**
- Money demand (M_d): downward-sloping curve in deep blue, labelled.
- Money supply (M_s): vertical line in deep red, labelled.
- A second money supply line, dashed (60% opacity red), shifted RIGHT. A rightward arrow between them labelled "M_s ↑ (e.g. open market operation)".
- Original equilibrium i₀ at the intersection of M_d and M_s. Dashed projection lines to both axes, labelled "i₀" and "M*".
- New equilibrium i₁ at the intersection of M_d and M_s₂ (the shifted supply). Should be LOWER than i₀. Dashed projection lines, labelled "i₁".
- A small annotation: "Expansionary monetary policy → lower interest rate."

---

## What to avoid

- **Don't** use bright primary colours (red, blue, green) for fills — only for curve strokes.
- **Don't** add 3D effects, shadows, or gradients to chart elements.
- **Don't** put watermark text or "preview" stamps.
- **Don't** show both curve labels AND line-endings in tiny text — use one consistent style.
- **Don't** use emoji in the diagram.
- **Don't** add gridlines unless they aid reading the equilibrium point.
- **Don't** make the title huge — 22 px is enough.
- **Don't** add extra explanations as text inside the image — the app shows those separately.
