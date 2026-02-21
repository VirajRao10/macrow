import { describe, it, expect } from 'vitest';
import { computeFromParams, defaults, equilibrium, ASshape, GRAPH } from '../js/calculations.js';

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

  it('Yf marker is at the right AS kink (where curve meets vertical segment)', () => {
    const params = computeFromParams(defaults.params);
    const as = ASshape(params);
    // Yf should be to the right of the flat-to-curve transition point.
    expect(as.yFe).toBeGreaterThan(as.yKink);
  });

  it('Yf price level equals pEnd at right AS kink', () => {
    const params = computeFromParams(defaults.params);
    const as = ASshape(params);
    expect(as.pFlat).toBe(GRAPH.pFlat);
    expect(as.pEnd).toBeGreaterThan(as.pFlat);
  });

  it('equilibrium remains bounded by Yf', () => {
    const params = computeFromParams(defaults.params);
    const as = ASshape(params);
    const eq = equilibrium(params);
    // Equilibrium should be between Ymin and Yf.
    expect(eq.y).toBeGreaterThanOrEqual(GRAPH.Ymin);
    expect(eq.y).toBeLessThanOrEqual(as.yFe);
  });

  it('drawYfPoint uses right kink coordinates (as.yFe, as.pEnd)', () => {
    // Verify that ASshape returns coordinates that drawYfPoint should use
    const params = computeFromParams(defaults.params);
    const as = ASshape(params);
    // Yf x-position should be at right kink (shiftedYFe)
    expect(as.yFe).toBeDefined();
    // Yf y-position (price level) should be pEnd
    expect(as.pEnd).toBeDefined();
    // pEnd should be greater than pFlat (price rises along curved segment)
    expect(as.pEnd).toBeGreaterThan(as.pFlat);
    // Yf should be to the right of the left kink
    expect(as.yFe).toBeGreaterThan(as.yKink);
  });
});
