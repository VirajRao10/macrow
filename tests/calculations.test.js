import { describe, it, expect } from 'vitest';
import { ASshape, computeFromParams, defaults, equilibrium, SRAS_VIEWS, asPolyline } from '../js/calculations.js';

describe('economic calculations', () => {
  it('baseline params are stable around potential output', () => {
    const baseline = computeFromParams(defaults.params);
    const eq = equilibrium(baseline);
    expect(eq.y).toBeGreaterThan(90);
    expect(eq.y).toBeLessThan(150);
    expect(eq.p).toBeGreaterThan(30);
  });

  it('expansionary demand increases AD shift', () => {
    const base = computeFromParams(defaults.params);
    const exp = computeFromParams({ ...defaults.params, govSpending: 80, taxRate: 10, interestRate: 1 });
    expect(exp.adShiftY).toBeGreaterThan(base.adShiftY);
  });

  it('cost push increases AS pressure', () => {
    const base = computeFromParams(defaults.params);
    const costPush = computeFromParams({ ...defaults.params, productionCosts: 90 });
    expect(costPush.asShiftP).toBeGreaterThan(base.asShiftP);
  });

  it('cost-push shock shifts AS upward and contracts potential output', () => {
    const base = ASshape(computeFromParams(defaults.params));
    const costPush = ASshape(computeFromParams({ ...defaults.params, productionCosts: 90 }));
    expect(costPush.pFlat).toBeGreaterThan(base.pFlat);
    expect(costPush.pEnd).toBeGreaterThan(base.pEnd);
    expect(costPush.yFe).toBeLessThan(base.yFe);
  });

  it('AS right kink (Yf marker point) remains to the right and above the flat segment kink', () => {
    const base = computeFromParams(defaults.params);
    const as = ASshape(base);
    expect(as.yFe).toBeGreaterThan(as.yKink);
    expect(as.pEnd).toBeGreaterThan(as.pFlat);
  });

  it('equilibrium remains finite under an extreme inflationary demand shock', () => {
    const extreme = computeFromParams({ ...defaults.params, govSpending: 100, taxRate: 0, interestRate: 0 });
    const eq = equilibrium(extreme);
    expect(Number.isFinite(eq.y)).toBe(true);
    expect(Number.isFinite(eq.p)).toBe(true);
  });

  it('Keynesian SRAS polyline has flat, rising and vertical regions', () => {
    const as = asPolyline({ asShiftP: 0, yFe: 120, view: SRAS_VIEWS.KEYNESIAN });
    // First two points share the same price (flat bottom)
    expect(as.pts[0][1]).toBeCloseTo(as.pts[1][1], 5);
    // The polyline ends with a vertical segment (same Y, different P)
    const last = as.pts[as.pts.length - 1];
    const prev = as.pts[as.pts.length - 2];
    expect(last[0]).toBeCloseTo(prev[0], 5);
    expect(last[1]).toBeGreaterThan(prev[1]);
    // There is a clear rising middle (price moves up as Y moves up between kink and Yf)
    expect(as.pEnd).toBeGreaterThan(as.pFlat);
  });

  it('Monetarist SRAS is a single vertical line at Yf', () => {
    const yFe = 115;
    const as = asPolyline({ asShiftP: 5, yFe, view: SRAS_VIEWS.MONETARIST });
    expect(as.pts).toHaveLength(2);
    expect(as.pts[0][0]).toBe(yFe);
    expect(as.pts[1][0]).toBe(yFe);
    expect(as.pts[0][1]).toBeLessThan(as.pts[1][1]);
  });

  it('Monetarist equilibrium output is pinned to Yf regardless of AD', () => {
    const base = computeFromParams(defaults.params);
    const deflation = computeFromParams({ ...defaults.params, govSpending: 0, taxRate: 50, interestRate: 8 });
    const eqA = equilibrium({ ...base, view: SRAS_VIEWS.MONETARIST });
    const eqB = equilibrium({ ...deflation, view: SRAS_VIEWS.MONETARIST });
    expect(eqA.y).toBeCloseTo(eqB.y, 5);
    // But the price level moves with AD
    expect(eqA.p).not.toBeCloseTo(eqB.p, 1);
  });

  it('Keynesian equilibrium output responds to AD shifts', () => {
    const base = computeFromParams(defaults.params);
    // Contraction shifts AD left, equilibrium slides down the flat part of SRAS
    const contraction = computeFromParams({ ...defaults.params, govSpending: 10, taxRate: 45, interestRate: 7 });
    const eqA = equilibrium({ ...base, view: SRAS_VIEWS.KEYNESIAN });
    const eqB = equilibrium({ ...contraction, view: SRAS_VIEWS.KEYNESIAN });
    // Output and price both fall with a contraction in the Keynesian view
    expect(eqB.y).toBeLessThan(eqA.y);
    expect(eqB.p).toBeLessThan(eqA.p);
  });
});
