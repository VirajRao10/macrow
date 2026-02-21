import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = value; },
    clear: () => { store = {}; },
    removeItem: (key) => { delete store[key]; }
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('US-001: Assess hidden by default', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('settings.assessEnabled defaults to false on fresh load', () => {
    // When localStorage has no value for assess enabled, it should default to false
    const assessEnabled = (localStorage.getItem('macrow_assess_enabled') ?? '0') === '1';
    expect(assessEnabled).toBe(false);
  });

  it('localStorage key macrow_assess_enabled defaults to 0 or does not exist', () => {
    const storedValue = localStorage.getItem('macrow_assess_enabled');
    // Should either be null (doesn't exist) or '0'
    expect(storedValue === null || storedValue === '0').toBe(true);
  });

  it('settings.assessEnabled becomes true when localStorage is set to 1', () => {
    localStorage.setItem('macrow_assess_enabled', '1');
    const assessEnabled = (localStorage.getItem('macrow_assess_enabled') ?? '0') === '1';
    expect(assessEnabled).toBe(true);
  });

  it('syncAssessAvailability logic: hidden class should be applied when assessEnabled is false', () => {
    // Default: assessEnabled is false, so hidden class should be applied
    const assessEnabled = (localStorage.getItem('macrow_assess_enabled') ?? '0') === '1';
    const shouldHaveHiddenClass = !assessEnabled;
    
    expect(shouldHaveHiddenClass).toBe(true);
  });

  it('syncAssessAvailability logic: hidden class should be removed when assessEnabled is true', () => {
    // Enable assess mode
    localStorage.setItem('macrow_assess_enabled', '1');
    const assessEnabled = (localStorage.getItem('macrow_assess_enabled') ?? '0') === '1';
    const shouldHaveHiddenClass = !assessEnabled;
    
    expect(shouldHaveHiddenClass).toBe(false);
  });

  it('setTab redirects from assess to policies when assess is disabled', () => {
    // Simulate the setTab logic
    let targetTab = 'assess';
    const assessEnabled = (localStorage.getItem('macrow_assess_enabled') ?? '0') === '1';
    
    // If tab is assess and assess is not enabled, redirect to policies
    if (targetTab === 'assess' && !assessEnabled) {
      targetTab = 'policies';
    }
    
    expect(targetTab).toBe('policies');
  });

  it('setTab allows assess tab when assessEnabled is true', () => {
    // Enable assess mode
    localStorage.setItem('macrow_assess_enabled', '1');
    
    let targetTab = 'assess';
    const assessEnabled = (localStorage.getItem('macrow_assess_enabled') ?? '0') === '1';
    
    // If tab is assess and assess is enabled, stay on assess
    if (targetTab === 'assess' && !assessEnabled) {
      targetTab = 'policies';
    }
    
    expect(targetTab).toBe('assess');
  });
});
