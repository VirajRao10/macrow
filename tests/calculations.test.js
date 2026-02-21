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

  it('Yf marker is at kink point (not midpoint of curved section)', () => {
    const params = computeFromParams(defaults.params);
    const as = ASshape(params);
    // Yf (yFe) should equal the kink point yKink
    expect(as.yFe).toBe(as.yKink);
  });

  it('Yf price level equals pFlat at kink point', () => {
    const params = computeFromParams(defaults.params);
    const as = ASshape(params);
    // At the kink point, price should equal pFlat (55 in default graph)
    expect(as.pFlat).toBe(GRAPH.pFlat);
    // The AS curve at yKink should have price = pFlat
    expect(as.pFlat).toBe(55);
  });

  it('equilibrium uses Yf at kink point', () => {
    const params = computeFromParams(defaults.params);
    const as = ASshape(params);
    const eq = equilibrium(params);
    // Equilibrium should be between Ymin and the kink point (yFe)
    expect(eq.y).toBeLessThanOrEqual(as.yFe);
  });
});
