import { describe, it, expect } from 'vitest';
import { ASshape, computeFromParams, defaults, equilibrium } from '../js/calculations.js';

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

  it('AS right kink (Yf marker point) remains to the right and above the flat segment kink', () => {
    const base = computeFromParams(defaults.params);
    const as = ASshape(base);
    expect(as.yFe).toBeGreaterThan(as.yKink);
    expect(as.pEnd).toBeGreaterThan(as.pFlat);
  });
});
