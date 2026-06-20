// Lesson-specific diagram renderers. Each accepts a container element and
// renders an SVG diagram appropriate for the lesson. Diagrams are intentionally
// simple and clear — they are teaching tools, not simulations.

const NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  for (const c of children) e.appendChild(c);
  return e;
}

function text(svg, x, y, str, opts = {}) {
  const t = svgEl('text', {
    x, y, 'text-anchor': opts.anchor || 'start',
    'font-family': 'var(--font-sans)',
    'font-size': opts.size || 12,
    'font-weight': opts.weight || 400,
    fill: opts.fill || 'currentColor',
  });
  t.textContent = str;
  svg.appendChild(t);
  return t;
}

function line(svg, x1, y1, x2, y2, stroke = 'currentColor', width = 1) {
  return svg.appendChild(svgEl('line', { x1, y1, x2, y2, stroke, 'stroke-width': width, 'stroke-linecap': 'round' }));
}

function path(svg, d, stroke = 'currentColor', width = 1, opts = {}) {
  return svg.appendChild(svgEl('path', { d, fill: 'none', stroke, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...opts }));
}

function rect(svg, x, y, w, h, fill = 'none', stroke = 'currentColor', width = 1, rx = 4) {
  return svg.appendChild(svgEl('rect', { x, y, width: w, height: h, fill, stroke, 'stroke-width': width, rx }));
}

function dot(svg, x, y, r = 3, fill = 'currentColor') {
  return svg.appendChild(svgEl('circle', { cx: x, cy: y, r, fill }));
}

function label(svg, x, y, str, fill = 'currentColor') {
  text(svg, x, y, str, { weight: 700, fill });
}

// Circular flow of income
export function renderCircularFlow(container) {
  container.innerHTML = '';
  const W = 560, H = 320;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'diagramSvg' });
  container.appendChild(svg);

  const cy = H / 2;
  const hhX = 80, hhY = cy, hhW = 120, hhH = 56;
  const fmX = 230, fmY = cy, fmW = 120, fmH = 56;
  // Top: gov
  const govX = W / 2 - 60, govY = 30, govW = 120, govH = 44;
  // Right: foreign
  const fxX = W - 150, fxY = cy, fxW = 120, fxH = 56;

  // Boxes
  rect(svg, hhX, hhY - hhH / 2, hhW, hhH, 'var(--surface-2)', 'var(--border-strong)', 1, 8);
  label(svg, hhX + hhW / 2, hhY - 2, 'Households', 'currentColor');
  svg.appendChild(el('text', { x: hhX + hhW / 2, y: hhY + 16, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--muted)' }, [document.createTextNode('consumption C, saving S, taxes T')]));

  rect(svg, fmX, fmY - fmH / 2, fmW, fmH, 'var(--surface-2)', 'var(--border-strong)', 1, 8);
  label(svg, fmX + fmW / 2, fmY - 2, 'Firms', 'currentColor');
  svg.appendChild(el('text', { x: fmX + fmW / 2, y: fmY + 16, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--muted)' }, [document.createTextNode('output, investment I')]));

  rect(svg, govX, govY, govW, govH, 'var(--surface-2)', 'var(--border-strong)', 1, 8);
  label(svg, govX + govW / 2, govY + govH / 2 + 4, 'Government', 'currentColor');
  svg.appendChild(el('text', { x: govX + govW / 2, y: govY + govH + 14, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--muted)' }, [document.createTextNode('spending G, taxes T')]));

  rect(svg, fxX, fxY - fxH / 2, fxW, fxH, 'var(--surface-2)', 'var(--border-strong)', 1, 8);
  label(svg, fxX + fxW / 2, fxY - 2, 'Foreign', 'currentColor');
  svg.appendChild(el('text', { x: fxX + fxW / 2, y: fxY + 16, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--muted)' }, [document.createTextNode('exports / imports')]));

  // Arrows HH <-> Firms: labour, goods, money
  // Top: labour/services from HH to Firms
  path(svg, `M ${hhX + hhW} ${hhY - 12} Q ${(hhX + hhW + fmX) / 2} ${hhY - 40} ${fmX} ${fmY - 12}`, 'var(--chart-as)', 1.6);
  text(svg, (hhX + hhW + fmX) / 2 - 50, hhY - 46, 'labour', { size: 11, fill: 'var(--chart-as)' });
  // Bottom: money back
  path(svg, `M ${fmX} ${fmY + 12} Q ${(hhX + hhW + fmX) / 2} ${hhY + 40} ${hhX + hhW} ${hhY + 12}`, 'var(--accent)', 1.6);
  text(svg, (hhX + hhW + fmX) / 2 - 50, hhY + 52, 'wages, profit', { size: 11, fill: 'var(--accent)' });

  // Government arrows
  path(svg, `M ${hhX + 30} ${hhY - hhH / 2} L ${govX + 20} ${govY + govH}`, 'var(--chart-ad)', 1.2);
  text(svg, hhX + 4, hhY - hhH / 2 - 6, 'T', { size: 10, fill: 'var(--chart-ad)' });
  path(svg, `M ${govX + govW - 20} ${govY + govH} L ${fmX + 30} ${fmY + fmH / 2}`, 'var(--chart-ad)', 1.2);
  text(svg, fmX + 30, fmY + fmH / 2 + 14, 'G', { size: 10, fill: 'var(--chart-ad)' });

  // Foreign sector arrows
  path(svg, `M ${fmX + fmW} ${fmY - 10} L ${fxX} ${fxY - 10}`, 'var(--chart-lras)', 1.2);
  text(svg, (fmX + fmW + fxX) / 2 - 10, fmY - 14, 'X', { size: 10, fill: 'var(--chart-lras)' });
  path(svg, `M ${fxX} ${fxY + 10} L ${fmX + fmW} ${fmY + 10}`, 'var(--chart-lras)', 1.2);
  text(svg, (fmX + fmW + fxX) / 2 - 10, fmY + 22, 'M', { size: 10, fill: 'var(--chart-lras)' });

  // Injections / leakages hint at bottom
  text(svg, W / 2 - 90, H - 18, 'Injections I + G + X = Leakages S + T + M', { anchor: 'middle', weight: 700, fill: 'var(--text)' });
}

// Business cycle
export function renderBusinessCycle(container) {
  container.innerHTML = '';
  const W = 520, H = 240;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'diagramSvg' });
  container.appendChild(svg);

  const left = 50, right = W - 20, top = 30, bottom = H - 50;
  // Axes
  line(svg, left, bottom, right, bottom, 'var(--border-strong)', 1);
  line(svg, left, top, left, bottom, 'var(--border-strong)', 1);
  text(svg, W / 2, H - 8, 'Time', { anchor: 'middle', weight: 600, fill: 'var(--muted)' });
  text(svg, 14, H / 2, 'Real GDP', { size: 11, fill: 'var(--muted)' });

  // Trend line (LRAS path)
  path(svg, `M ${left} ${bottom - 30} L ${right} ${top + 30}`, 'var(--accent)', 1.6);
  text(svg, right - 56, top + 18, 'Long-run trend', { size: 11, fill: 'var(--accent)', weight: 700 });

  // Business cycle: a sinusoid around the trend
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const x = left + t * (right - left);
    const trendY = (bottom - 30) + t * ((top + 30) - (bottom - 30));
    const wobble = Math.sin(t * Math.PI * 4) * 30;
    pts.push([x, trendY - wobble]);
  }
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  path(svg, d, 'var(--chart-as)', 2.2);

  // Phase labels
  text(svg, left + 50, top + 30, 'Peak', { size: 10, fill: 'var(--chart-ad)', weight: 700 });
  text(svg, left + 110, top + 90, 'Recession', { size: 10, fill: 'var(--chart-ad)', weight: 700 });
  text(svg, left + 220, top + 30, 'Peak', { size: 10, fill: 'var(--chart-ad)', weight: 700 });
  text(svg, left + 290, top + 90, 'Recession', { size: 10, fill: 'var(--chart-ad)', weight: 700 });
  text(svg, left + 70, top + 60, 'Expansion', { size: 10, fill: 'var(--success)', weight: 700 });
  text(svg, left + 170, top + 120, 'Trough', { size: 10, fill: 'var(--chart-as)', weight: 700 });

  // Yf line (potential output)
  path(svg, `M ${left} ${bottom - 30} L ${right} ${top + 30}`, 'var(--accent)', 1.6, { 'stroke-dasharray': '4 4', opacity: 0.5 });
  text(svg, right - 70, bottom - 32, 'Yf (potential)', { size: 10, fill: 'var(--accent)', weight: 700 });
}

// AD diagram (price level vs real GDP)
export function renderAd(container) {
  container.innerHTML = '';
  const W = 520, H = 300;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'diagramSvg' });
  container.appendChild(svg);

  const left = 60, right = W - 20, top = 20, bottom = H - 50;
  const AD = (Y) => 110 - 0.4 * Y; // arbitrary downward slope

  // Axes
  line(svg, left, bottom, right, bottom, 'var(--border-strong)', 1);
  line(svg, left, top, left, bottom, 'var(--border-strong)', 1);
  text(svg, W / 2, H - 12, 'Real GDP (Y)', { anchor: 'middle', weight: 600, fill: 'var(--muted)' });
  text(svg, 14, H / 2, 'Price level (P)', { size: 11, fill: 'var(--muted)' });
  text(svg, right - 30, bottom - 6, 'Yf', { size: 11, weight: 700, fill: 'var(--accent)' });

  // Yf vertical
  const YfX = left + 220;
  path(svg, `M ${YfX} ${top} L ${YfX} ${bottom}`, 'var(--accent)', 1.2, { 'stroke-dasharray': '4 4' });

  // AD curve
  const pts = [];
  for (let i = 0; i <= 50; i++) {
    const t = i / 50;
    const Y = 20 + t * 280;
    const P = AD(Y);
    const x = left + (Y - 20) / 280 * (right - left - 20);
    const y = bottom - (P - 0) / 110 * (bottom - top);
    pts.push([x, y]);
  }
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  path(svg, d, 'var(--chart-ad)', 2.4);
  text(svg, right - 40, top + 28, 'AD', { size: 12, weight: 700, fill: 'var(--chart-ad)' });

  // Rightward shift (dotted)
  const AD2 = (Y) => 130 - 0.4 * Y;
  const pts2 = [];
  for (let i = 0; i <= 50; i++) {
    const t = i / 50;
    const Y = 20 + t * 280;
    const P = AD2(Y);
    const x = left + (Y - 20) / 280 * (right - left - 20);
    const y = bottom - (P - 0) / 130 * (bottom - top);
    pts2.push([x, y]);
  }
  const d2 = pts2.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  path(svg, d2, 'var(--chart-ad)', 1.6, { 'stroke-dasharray': '4 3', opacity: 0.6 });
  text(svg, right - 60, top + 4, 'AD →', { size: 11, weight: 700, fill: 'var(--chart-ad)' });
}

// SRAS diagram
export function renderSras(container) {
  container.innerHTML = '';
  const W = 520, H = 300;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'diagramSvg' });
  container.appendChild(svg);

  const left = 60, right = W - 20, top = 20, bottom = H - 50;
  line(svg, left, bottom, right, bottom, 'var(--border-strong)', 1);
  line(svg, left, top, left, bottom, 'var(--border-strong)', 1);
  text(svg, W / 2, H - 12, 'Real GDP (Y)', { anchor: 'middle', weight: 600, fill: 'var(--muted)' });
  text(svg, 14, H / 2, 'Price level (P)', { size: 11, fill: 'var(--muted)' });

  // SRAS — flat then upward then vertical
  const YfX = left + 220;
  const yKinkX = YfX - 80;
  const yKinkY = top + 60;
  const yFlatY = yKinkY;
  path(svg, `M ${left} ${yFlatY} L ${yKinkX} ${yKinkY} L ${YfX} ${top + 30} L ${YfX} ${bottom}`, 'var(--chart-as)', 2.4);

  text(svg, right - 30, bottom - 6, 'Yf', { size: 11, weight: 700, fill: 'var(--accent)' });
  text(svg, yKinkX - 30, yKinkY - 8, 'SRAS', { size: 12, weight: 700, fill: 'var(--chart-as)' });
  text(svg, YfX - 4, bottom - 6, 'Yf', { size: 11, weight: 700, fill: 'var(--accent)' });
  path(svg, `M ${YfX} ${top} L ${YfX} ${bottom}`, 'var(--accent)', 1.2, { 'stroke-dasharray': '4 4' });
}

// LRAS / Keynesian AS comparison
export function renderLras(container) {
  container.innerHTML = '';
  const W = 520, H = 300;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'diagramSvg' });
  container.appendChild(svg);

  const left = 60, right = W - 20, top = 20, bottom = H - 50;
  const YfX = left + 220;

  // Axes
  line(svg, left, bottom, right, bottom, 'var(--border-strong)', 1);
  line(svg, left, top, left, bottom, 'var(--border-strong)', 1);
  text(svg, W / 2, H - 12, 'Real GDP (Y)', { anchor: 'middle', weight: 600, fill: 'var(--muted)' });
  text(svg, 14, H / 2, 'Price level (P)', { size: 11, fill: 'var(--muted)' });

  // LRAS vertical
  path(svg, `M ${YfX} ${top} L ${YfX} ${bottom}`, 'var(--accent)', 2.2);
  text(svg, YfX + 6, top + 14, 'LRAS (monetarist)', { size: 11, weight: 700, fill: 'var(--accent)' });
  text(svg, YfX - 6, bottom - 6, 'Yf', { size: 11, weight: 700, fill: 'var(--accent)' });

  // Keynesian AS — three upward curves approaching Yf
  const drawKeynesian = (offset, label) => {
    const yStart = bottom - 40;
    const ctrlX1 = left + 80, ctrlY1 = yStart - 30;
    const ctrlX2 = YfX - 30, ctrlY2 = yStart - 80;
    const endX = YfX - 4, endY = top + 60;
    path(svg, `M ${left + offset} ${yStart} C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${endX} ${endY}`, 'var(--chart-as)', 1.4, { 'stroke-dasharray': '4 3' });
  };
  drawKeynesian(20, '');
  text(svg, left + 30, bottom - 24, 'Keynesian AS (long-term)', { size: 11, fill: 'var(--chart-as)' });
}

// Macroeconomic equilibrium (SR + LR with self-correction)
export function renderEquilibrium(container) {
  container.innerHTML = '';
  const W = 520, H = 300;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'diagramSvg' });
  container.appendChild(svg);

  const left = 60, right = W - 20, top = 20, bottom = H - 50;
  const YfX = left + 220;

  line(svg, left, bottom, right, bottom, 'var(--border-strong)', 1);
  line(svg, left, top, left, bottom, 'var(--border-strong)', 1);
  text(svg, W / 2, H - 12, 'Real GDP (Y)', { anchor: 'middle', weight: 600, fill: 'var(--muted)' });
  text(svg, 14, H / 2, 'Price level (P)', { size: 11, fill: 'var(--muted)' });

  // LRAS
  path(svg, `M ${YfX} ${top} L ${YfX} ${bottom}`, 'var(--accent)', 1.6, { 'stroke-dasharray': '4 4' });
  text(svg, YfX - 6, bottom - 6, 'Yf', { size: 11, weight: 700, fill: 'var(--accent)' });

  // AD
  const AD = (Y) => 130 - 0.4 * Y;
  const pts = [];
  for (let i = 0; i <= 50; i++) {
    const t = i / 50;
    const Y = 20 + t * 280;
    const P = AD(Y);
    const x = left + (Y - 20) / 280 * (right - left - 20);
    const y = bottom - P / 130 * (bottom - top);
    pts.push([x, y]);
  }
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  path(svg, d, 'var(--chart-ad)', 2.2);
  text(svg, right - 50, top + 18, 'AD', { size: 11, weight: 700, fill: 'var(--chart-ad)' });

  // SRAS
  const yKinkX = left + 130, yKinkY = top + 80;
  path(svg, `M ${left} ${yKinkY} L ${yKinkX} ${yKinkY} L ${YfX} ${top + 20} L ${YfX} ${bottom}`, 'var(--chart-as)', 2.2);
  text(svg, yKinkX + 6, yKinkY + 14, 'SRAS', { size: 11, weight: 700, fill: 'var(--chart-as)' });

  // SR equilibrium point
  const srx = yKinkX + 50, sry = top + 50;
  dot(svg, srx, sry, 4, 'var(--text)');
  text(svg, srx + 6, sry - 6, 'E (short run)', { size: 10, weight: 700, fill: 'var(--text)' });
  line(svg, srx, sry, srx, bottom, 'var(--text)', 1, 0.4);
  path(svg, `M ${left} ${sry} L ${srx} ${sry}`, 'var(--text)', 0.6);

  // Long-run arrow showing self-correction (SRAS shifts left)
  const newKinkX = srx + 30;
  path(svg, `M ${yKinkX} ${yKinkY} L ${newKinkX} ${yKinkY - 22}`, 'var(--accent)', 1.2, { 'stroke-dasharray': '3 2' });
  text(svg, newKinkX - 8, yKinkY - 28, 'SRAS →', { size: 10, fill: 'var(--accent)', weight: 700 });
}

// Growth (AD/AS + LRAS shifts)
export function renderGrowth(container) {
  container.innerHTML = '';
  const W = 520, H = 300;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'diagramSvg' });
  container.appendChild(svg);

  const left = 60, right = W - 20, top = 20, bottom = H - 50;
  const Yf1 = left + 180, Yf2 = left + 280;

  line(svg, left, bottom, right, bottom, 'var(--border-strong)', 1);
  line(svg, left, top, left, bottom, 'var(--border-strong)', 1);
  text(svg, W / 2, H - 12, 'Real GDP (Y)', { anchor: 'middle', weight: 600, fill: 'var(--muted)' });
  text(svg, 14, H / 2, 'Price level (P)', { size: 11, fill: 'var(--muted)' });

  // LRAS 1
  path(svg, `M ${Yf1} ${top} L ${Yf1} ${bottom}`, 'var(--accent)', 1.4, { 'stroke-dasharray': '4 4' });
  text(svg, Yf1 - 6, bottom - 6, 'Yf₀', { size: 10, weight: 700, fill: 'var(--accent)' });
  // LRAS 2
  path(svg, `M ${Yf2} ${top} L ${Yf2} ${bottom}`, 'var(--accent)', 1.6);
  text(svg, Yf2 - 6, bottom - 6, 'Yf₁', { size: 10, weight: 700, fill: 'var(--accent)' });

  // SRAS
  const yKinkX = Yf1 - 50, yKinkY = top + 80;
  path(svg, `M ${left} ${yKinkY} L ${yKinkX} ${yKinkY} L ${Yf1} ${top + 20} L ${Yf1} ${bottom}`, 'var(--chart-as)', 1.4, { opacity: 0.5 });
  path(svg, `M ${left} ${yKinkY - 20} L ${yKinkX + 30} ${yKinkY - 20} L ${Yf2} ${top + 10} L ${Yf2} ${bottom}`, 'var(--chart-as)', 1.8);

  // AD
  const AD = (Y) => 130 - 0.4 * Y;
  const pts = [];
  for (let i = 0; i <= 50; i++) {
    const t = i / 50;
    const Y = 20 + t * 280;
    const P = AD(Y);
    const x = left + (Y - 20) / 280 * (right - left - 20);
    const y = bottom - P / 130 * (bottom - top);
    pts.push([x, y]);
  }
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  path(svg, d, 'var(--chart-ad)', 1.8);
  text(svg, right - 40, top + 30, 'AD', { size: 11, weight: 700, fill: 'var(--chart-ad)' });

  text(svg, Yf1 + 30, top + 16, 'Long-term growth →', { size: 11, weight: 700, fill: 'var(--accent)' });
}

// Unemployment (labour market)
export function renderUnemployment(container) {
  container.innerHTML = '';
  const W = 520, H = 280;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'diagramSvg' });
  container.appendChild(svg);

  const left = 60, right = W - 20, top = 20, bottom = H - 50;
  // Axes
  line(svg, left, bottom, right, bottom, 'var(--border-strong)', 1);
  line(svg, left, top, left, bottom, 'var(--border-strong)', 1);
  text(svg, W / 2, H - 12, 'Quantity of labour', { anchor: 'middle', weight: 600, fill: 'var(--muted)' });
  text(svg, 14, H / 2, 'Wage rate (W)', { size: 11, fill: 'var(--muted)' });

  // Labour demand
  path(svg, `M ${left} ${top + 30} L ${right} ${bottom - 20}`, 'var(--chart-ad)', 2.2);
  text(svg, right - 80, bottom - 8, 'Labour demand D_L', { size: 11, fill: 'var(--chart-ad)', weight: 700 });
  // Labour supply
  path(svg, `M ${left} ${bottom - 30} L ${right} ${top + 60}`, 'var(--chart-as)', 2.2);
  text(svg, right - 80, top + 70, 'Labour supply S_L', { size: 11, fill: 'var(--chart-as)', weight: 700 });
  // Equilibrium marker
  const eqX = left + 200, eqY = top + 110;
  dot(svg, eqX, eqY, 4, 'var(--text)');
  text(svg, eqX + 6, eqY - 6, 'We', { size: 10, weight: 700, fill: 'var(--text)' });

  // Min wage
  const wMin = top + 60;
  path(svg, `M ${left} ${wMin} L ${right - 30} ${wMin}`, 'var(--accent)', 1.6, { 'stroke-dasharray': '4 3' });
  text(svg, right - 70, wMin - 6, 'Minimum wage', { size: 10, weight: 700, fill: 'var(--accent)' });
  // Unemployment bracket
  const dL_atWmin_X = left + ((top + 30) - wMin) / ((top + 30) - (bottom - 20)) * (right - left);
  // Demanded labour at wMin: interpolate D_L
  // D_L: y = 30 + (W - top) * slope. Solve for X given wMin.
  // simpler: D_L at wMin is where D_L crosses wMin; we know D_L endpoints
  const dL_xAtWmin = left + (wMin - (top + 30)) * ((right - left) / ((bottom - 20) - (top + 30)));
  const sL_xAtWmin = left + (wMin - (bottom - 30)) * ((right - left) / ((top + 60) - (bottom - 30)));
  // Unemployment bracket
  if (sL_xAtWmin > dL_xAtWmin) {
    path(svg, `M ${dL_xAtWmin} ${wMin - 10} L ${sL_xAtWmin} ${wMin - 10}`, 'var(--accent)', 1.2);
    text(svg, (dL_xAtWmin + sL_xAtWmin) / 2 - 30, wMin - 14, 'Unemployment', { size: 10, weight: 700, fill: 'var(--accent)' });
  }
}

// Inflation (AD/AS demand-pull and cost-push side by side)
export function renderInflation(container) {
  container.innerHTML = '';
  const W = 520, H = 300;
  const wrap = el('div', { class: 'diagramSplit' });
  container.appendChild(wrap);

  const draw = (parent, title, adShift, srasShift) => {
    const block = el('div', { class: 'diagramSplit__cell' });
    parent.appendChild(block);
    const titleEl = el('div', { class: 'diagramSplit__title' }, [document.createTextNode(title)]);
    block.appendChild(titleEl);
    const W2 = 240, H2 = 220;
    const svg = svgEl('svg', { viewBox: `0 0 ${W2} ${H2}`, class: 'diagramSvg' });
    block.appendChild(svg);
    const left = 40, right = W2 - 10, top = 10, bottom = H2 - 30;
    const YfX = left + 130;
    line(svg, left, bottom, right, bottom, 'var(--border-strong)', 1);
    line(svg, left, top, left, bottom, 'var(--border-strong)', 1);
    path(svg, `M ${YfX} ${top} L ${YfX} ${bottom}`, 'var(--accent)', 1, { 'stroke-dasharray': '3 3' });

    const AD = (Y) => (srasShift ? 110 - 0.4 * Y : 110 - 0.4 * Y + adShift * 5);
    const yKinkX = YfX - 40, yKinkY = top + 50;
    path(svg, `M ${left} ${yKinkY} L ${yKinkX} ${yKinkY} L ${YfX} ${top + 10} L ${YfX} ${bottom}`, 'var(--chart-as)', 1.6);
    if (srasShift < 0) {
      path(svg, `M ${left} ${yKinkY - 25} L ${yKinkX - 10} ${yKinkY - 25} L ${YfX - 4} ${top - 2} L ${YfX - 4} ${bottom}`, 'var(--chart-as)', 1.4, { 'stroke-dasharray': '3 2' });
    }
    const pts = [];
    for (let i = 0; i <= 50; i++) {
      const t = i / 50;
      const Y = 20 + t * 200;
      const P = AD(Y);
      const x = left + (Y - 20) / 200 * (right - left - 20);
      const y = bottom - P / 130 * (bottom - top);
      pts.push([x, y]);
    }
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
    path(svg, d, 'var(--chart-ad)', 1.6);
    if (adShift > 0) {
      const AD2 = (Y) => AD(Y) + adShift * 5;
      const pts2 = [];
      for (let i = 0; i <= 50; i++) {
        const t = i / 50;
        const Y = 20 + t * 200;
        const P = AD2(Y);
        const x = left + (Y - 20) / 200 * (right - left - 20);
        const y = bottom - P / 130 * (bottom - top);
        pts2.push([x, y]);
      }
      const d2 = pts2.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
      path(svg, d2, 'var(--chart-ad)', 1.2, { 'stroke-dasharray': '3 2' });
    }
    text(svg, left + 4, H2 - 10, 'Y', { size: 9, fill: 'var(--muted)' });
    text(svg, 6, top + 10, 'P', { size: 9, fill: 'var(--muted)' });
  };

  draw(wrap, 'Demand-pull (AD → right)', 1, 0);
  draw(wrap, 'Cost-push (SRAS → left)', 0, -1);
}

// Phillips curve
export function renderPhillips(container) {
  container.innerHTML = '';
  const W = 520, H = 280;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'diagramSvg' });
  container.appendChild(svg);

  const left = 50, right = W - 20, top = 20, bottom = H - 50;
  line(svg, left, bottom, right, bottom, 'var(--border-strong)', 1);
  line(svg, left, top, left, bottom, 'var(--border-strong)', 1);
  text(svg, W / 2, H - 12, 'Unemployment rate (U)', { anchor: 'middle', weight: 600, fill: 'var(--muted)' });
  text(svg, 14, H / 2, 'Inflation rate (π)', { size: 11, fill: 'var(--muted)' });

  // SRPC
  path(svg, `M ${left} ${top + 30} L ${right} ${bottom - 30}`, 'var(--chart-as)', 2.2);
  text(svg, left + 80, top + 30, 'SRPC', { size: 12, weight: 700, fill: 'var(--chart-as)' });

  // LRPC vertical at the natural rate
  const UnX = left + 220;
  path(svg, `M ${UnX} ${top} L ${UnX} ${bottom}`, 'var(--accent)', 1.6, { 'stroke-dasharray': '4 3' });
  text(svg, UnX - 6, bottom - 6, 'Un', { size: 11, weight: 700, fill: 'var(--accent)' });
  text(svg, UnX + 4, top + 14, 'LRPC', { size: 11, weight: 700, fill: 'var(--accent)' });

  // SRPC2 (shifted up — expectations-augmented)
  path(svg, `M ${left} ${top + 60} L ${right} ${bottom - 0}`, 'var(--chart-as)', 1.4, { 'stroke-dasharray': '4 3', opacity: 0.6 });
  text(svg, left + 80, top + 60, 'SRPC (after expectations ↑)', { size: 10, fill: 'var(--chart-as)' });
}

// Lorenz curve
export function renderLorenz(container) {
  container.innerHTML = '';
  const W = 380, H = 280;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'diagramSvg' });
  container.appendChild(svg);

  const left = 50, right = W - 20, top = 20, bottom = H - 50;
  line(svg, left, bottom, right, bottom, 'var(--border-strong)', 1);
  line(svg, left, top, left, bottom, 'var(--border-strong)', 1);
  text(svg, W / 2, H - 12, 'Cumulative % of population', { anchor: 'middle', weight: 600, fill: 'var(--muted)' });
  text(svg, 14, H / 2, 'Cumulative % of income', { size: 11, fill: 'var(--muted)' });

  // Line of equality
  path(svg, `M ${left} ${bottom} L ${right} ${top}`, 'var(--border-strong)', 1, { 'stroke-dasharray': '3 3' });
  text(svg, right - 100, top + 14, 'Line of equality', { size: 10, fill: 'var(--muted)' });

  // Lorenz curve (bowed)
  path(svg, `M ${left} ${bottom} C ${left + 60} ${bottom - 10}, ${left + 100} ${bottom - 90}, ${right - 40} ${top + 20} L ${right} ${top + 30}`, 'var(--accent)', 2.2);
  text(svg, right - 80, top + 60, 'Lorenz curve', { size: 11, weight: 700, fill: 'var(--accent)' });

  // Gini area shading (hatched)
  const id = 'gini-pattern';
  const defs = svgEl('defs');
  const pat = svgEl('pattern', { id, patternUnits: 'userSpaceOnUse', width: 6, height: 6 });
  pat.appendChild(svgEl('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: 'var(--accent)', 'stroke-width': 1, opacity: 0.25 }));
  defs.appendChild(pat);
  svg.appendChild(defs);
  // Area between equality and Lorenz — approximate with a polygon
  path(svg, `M ${left} ${bottom} L ${left + 60} ${bottom - 10} L ${left + 100} ${bottom - 90} L ${right - 40} ${top + 20} L ${right} ${top + 30} L ${right} ${top} L ${left} ${bottom} Z`, 'url(#' + id + ')', 'none', 0, { fill: 'url(#' + id + ')' });

  text(svg, W - 90, H - 40, 'A = area between', { size: 10, fill: 'var(--text)' });
  text(svg, W - 90, H - 28, 'A + B = total area', { size: 10, fill: 'var(--text)' });
  text(svg, W - 90, H - 16, 'Gini = A / (A+B)', { size: 10, weight: 700, fill: 'var(--accent)' });
}

// AD/AS policy diagram (used for both monetary and fiscal policy lessons)
export function renderAdasPolicy(container) {
  container.innerHTML = '';
  const W = 520, H = 280;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'diagramSvg' });
  container.appendChild(svg);

  const left = 60, right = W - 20, top = 20, bottom = H - 50;
  const YfX = left + 220;
  line(svg, left, bottom, right, bottom, 'var(--border-strong)', 1);
  line(svg, left, top, left, bottom, 'var(--border-strong)', 1);
  text(svg, W / 2, H - 12, 'Real GDP (Y)', { anchor: 'middle', weight: 600, fill: 'var(--muted)' });
  text(svg, 14, H / 2, 'Price level (P)', { size: 11, fill: 'var(--muted)' });

  // LRAS, SRAS
  path(svg, `M ${YfX} ${top} L ${YfX} ${bottom}`, 'var(--accent)', 1.2, { 'stroke-dasharray': '4 4' });
  text(svg, YfX - 6, bottom - 6, 'Yf', { size: 11, weight: 700, fill: 'var(--accent)' });
  const yKinkX = left + 140, yKinkY = top + 80;
  path(svg, `M ${left} ${yKinkY} L ${yKinkX} ${yKinkY} L ${YfX} ${top + 20} L ${YfX} ${bottom}`, 'var(--chart-as)', 2);
  text(svg, yKinkX + 4, yKinkY + 14, 'SRAS', { size: 10, weight: 700, fill: 'var(--chart-as)' });

  // AD₀
  const AD0 = (Y) => 110 - 0.4 * Y;
  const drawAD = (fn, colour, dash) => {
    const pts = [];
    for (let i = 0; i <= 50; i++) {
      const t = i / 50;
      const Y = 20 + t * 280;
      const P = fn(Y);
      const x = left + (Y - 20) / 280 * (right - left - 20);
      const y = bottom - P / 130 * (bottom - top);
      pts.push([x, y]);
    }
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
    path(svg, d, colour, 2, dash ? { 'stroke-dasharray': '3 2' } : {});
  };
  drawAD(AD0, 'var(--chart-ad)', false);
  text(svg, right - 50, top + 30, 'AD₀', { size: 11, weight: 700, fill: 'var(--chart-ad)' });
  drawAD((Y) => AD0(Y) + 22, 'var(--chart-ad)', true);
  text(svg, right - 80, top + 4, 'AD₁ (expansionary)', { size: 11, weight: 700, fill: 'var(--chart-ad)' });

  // E₀ and E₁
  const ex0 = yKinkX + 60, ey0 = top + 60;
  dot(svg, ex0, ey0, 4, 'var(--text)');
  text(svg, ex0 + 6, ey0 - 4, 'E₀', { size: 10, weight: 700, fill: 'var(--text)' });
  const ex1 = yKinkX + 90, ey1 = top + 30;
  dot(svg, ex1, ey1, 4, 'var(--text)');
  text(svg, ex1 + 6, ey1 - 4, 'E₁', { size: 10, weight: 700, fill: 'var(--text)' });
}

// Crowding out (loanable funds market)
export function renderCrowdingOut(container) {
  container.innerHTML = '';
  const W = 520, H = 260;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'diagramSvg' });
  container.appendChild(svg);

  const left = 60, right = W - 20, top = 20, bottom = H - 50;
  line(svg, left, bottom, right, bottom, 'var(--border-strong)', 1);
  line(svg, left, top, left, bottom, 'var(--border-strong)', 1);
  text(svg, W / 2, H - 12, 'Quantity of loanable funds', { anchor: 'middle', weight: 600, fill: 'var(--muted)' });
  text(svg, 14, H / 2, 'Real interest rate (r)', { size: 11, fill: 'var(--muted)' });

  // Supply (upward)
  path(svg, `M ${left + 40} ${bottom - 30} L ${right - 20} ${top + 30}`, 'var(--chart-as)', 2);
  text(svg, right - 110, top + 28, 'Supply of funds S', { size: 11, fill: 'var(--chart-as)', weight: 700 });
  // Demand₀
  path(svg, `M ${left} ${top + 60} L ${right} ${top + 120}`, 'var(--chart-ad)', 2);
  text(svg, right - 110, top + 120, 'Demand D₀', { size: 11, fill: 'var(--chart-ad)', weight: 700 });
  // Demand₁ (shifted right — government borrowing)
  path(svg, `M ${left} ${top + 30} L ${right} ${top + 90}`, 'var(--chart-ad)', 1.6, { 'stroke-dasharray': '3 2' });
  text(svg, right - 130, top + 90, 'Demand D₁ (with deficit)', { size: 10, fill: 'var(--chart-ad)' });

  // Equilibrium points
  const e0X = left + 200, e0Y = top + 95;
  dot(svg, e0X, e0Y, 4, 'var(--text)');
  text(svg, e0X + 6, e0Y - 4, 'r₀', { size: 10, weight: 700, fill: 'var(--text)' });
  const e1X = left + 220, e1Y = top + 75;
  dot(svg, e1X, e1Y, 4, 'var(--text)');
  text(svg, e1X + 6, e1Y - 4, 'r₁', { size: 10, weight: 700, fill: 'var(--text)' });

  text(svg, W / 2 - 60, H - 14, 'Higher G → r up → I down', { size: 11, weight: 700, fill: 'var(--accent)' });
}

// Money market (used in 3.5.2 and 3.5.3 — there is already a renderer, but this is a cleaner simple version)
export function renderMoneyMarket(container) {
  container.innerHTML = '';
  const W = 520, H = 280;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'diagramSvg' });
  container.appendChild(svg);

  const left = 60, right = W - 20, top = 20, bottom = H - 50;
  line(svg, left, bottom, right, bottom, 'var(--border-strong)', 1);
  line(svg, left, top, left, bottom, 'var(--border-strong)', 1);
  text(svg, W / 2, H - 12, 'Quantity of money', { anchor: 'middle', weight: 600, fill: 'var(--muted)' });
  text(svg, 14, H / 2, 'Nominal interest rate (i)', { size: 11, fill: 'var(--muted)' });

  // Money demand (downward)
  path(svg, `M ${left + 30} ${top + 30} L ${right} ${bottom - 20}`, 'var(--chart-ad)', 2);
  text(svg, right - 100, bottom - 22, 'Money demand M_d', { size: 11, fill: 'var(--chart-ad)', weight: 700 });
  // Money supply (vertical) and shifted supply
  path(svg, `M ${left + 180} ${top} L ${left + 180} ${bottom}`, 'var(--chart-as)', 2);
  text(svg, left + 186, top + 14, 'M_s', { size: 11, fill: 'var(--chart-as)', weight: 700 });
  path(svg, `M ${left + 230} ${top} L ${left + 230} ${bottom}`, 'var(--chart-as)', 1.4, { 'stroke-dasharray': '3 2' });
  text(svg, left + 236, top + 28, 'M_s↑', { size: 10, fill: 'var(--chart-as)' });

  // Equilibrium
  const eX = left + 180, eY = top + 100;
  dot(svg, eX, eY, 4, 'var(--text)');
  text(svg, eX + 6, eY - 4, 'i₀', { size: 10, weight: 700, fill: 'var(--text)' });
  const e2X = left + 230, e2Y = top + 130;
  dot(svg, e2X, e2Y, 4, 'var(--text)');
  text(svg, e2X + 6, e2Y - 4, 'i₁', { size: 10, weight: 700, fill: 'var(--text)' });
}

// Diagram registry — maps the `diagram` string in a lesson to a renderer.
export const DIAGRAMS = {
  circularFlow: renderCircularFlow,
  businessCycle: renderBusinessCycle,
  ad: renderAd,
  sras: renderSras,
  lras: renderLras,
  equilibrium: renderEquilibrium,
  growth: renderGrowth,
  unemployment: renderUnemployment,
  inflation: renderInflation,
  phillips: renderPhillips,
  lorenz: renderLorenz,
  adas: renderAdasPolicy,
  crowdingOut: renderCrowdingOut,
  moneyMarket: renderMoneyMarket,
};
