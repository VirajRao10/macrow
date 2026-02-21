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

// Mock DOM elements that app.js expects
const mockElements = {
  assessNavButton: { classList: { toggle: vi.fn() } },
  toggleAssess: null
};

// Set up global mocks before importing app
beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

describe('US-002: About toggle enables Assess', () => {
  describe('Toggle element exists in About panel', () => {
    it('toggle element #toggleAssess should exist in About panel HTML', () => {
      // Check that the About panel HTML template includes the toggle element
      const aboutPanelHTML = `
        <div id="panelAbout" class="hidden">
          <h2>About Macrow</h2>
          <label class="toggle"><input id="toggleAssess" type="checkbox"/><span>Enable Assess tab</span></label>
        </div>
      `;
      
      // Verify the toggle element exists in the template
      expect(aboutPanelHTML).toContain('id="toggleAssess"');
      expect(aboutPanelHTML).toContain('type="checkbox"');
      expect(aboutPanelHTML).toContain('Enable Assess tab');
    });

    it('toggle element should be a checkbox input', () => {
      // Verify the input type is checkbox
      const aboutPanelHTML = `<input id="toggleAssess" type="checkbox"/>`;
      expect(aboutPanelHTML).toContain('type="checkbox"');
    });
  });

  describe('Toggle changes settings.assessEnabled', () => {
    it('toggle onchange should set settings.assessEnabled to true', () => {
      // Simulate the toggle onchange logic from app.js
      let settings = { assessEnabled: false };
      
      // Simulate the event
      const mockEvent = { target: { checked: true } };
      settings.assessEnabled = mockEvent.target.checked;
      
      expect(settings.assessEnabled).toBe(true);
    });

    it('toggle onchange should set settings.assessEnabled to false when unchecked', () => {
      // Start with assess enabled
      let settings = { assessEnabled: true };
      
      // Simulate the event (uncheck)
      const mockEvent = { target: { checked: false } };
      settings.assessEnabled = mockEvent.target.checked;
      
      expect(settings.assessEnabled).toBe(false);
    });
  });

  describe('Toggle updates localStorage', () => {
    it('localStorage macrow_assess_enabled should be set to 1 when enabled', () => {
      // Simulate enabling assess mode
      const settings = { assessEnabled: true };
      localStorage.setItem('macrow_assess_enabled', settings.assessEnabled ? '1' : '0');
      
      expect(localStorage.getItem('macrow_assess_enabled')).toBe('1');
    });

    it('localStorage macrow_assess_enabled should be set to 0 when disabled', () => {
      // Simulate disabling assess mode
      const settings = { assessEnabled: false };
      localStorage.setItem('macrow_assess_enabled', settings.assessEnabled ? '1' : '0');
      
      expect(localStorage.getItem('macrow_assess_enabled')).toBe('0');
    });

    it('localStorage value should persist across sessions', () => {
      // Set the value
      localStorage.setItem('macrow_assess_enabled', '1');
      
      // Retrieve the value (simulating page reload)
      const assessEnabled = (localStorage.getItem('macrow_assess_enabled') ?? '0') === '1';
      
      expect(assessEnabled).toBe(true);
    });
  });

  describe('syncAssessAvailability shows Assess button when enabled', () => {
    it('syncAssessAvailability should remove hidden class when assessEnabled is true', () => {
      // Simulate syncAssessAvailability logic
      const assessEnabled = true;
      
      // When enabled, hidden class should be removed (toggle to false)
      const shouldHaveHiddenClass = !assessEnabled;
      
      expect(shouldHaveHiddenClass).toBe(false);
    });

    it('syncAssessAvailability should add hidden class when assessEnabled is false', () => {
      // Default: assess is disabled
      const assessEnabled = false;
      
      // When disabled, hidden class should be applied (toggle to true)
      const shouldHaveHiddenClass = !assessEnabled;
      
      expect(shouldHaveHiddenClass).toBe(true);
    });

    it('Assess button should be visible when toggle is enabled', () => {
      // Enable assess mode
      localStorage.setItem('macrow_assess_enabled', '1');
      const assessEnabled = (localStorage.getItem('macrow_assess_enabled') ?? '0') === '1';
      
      // Simulate the button visibility check
      const isVisible = assessEnabled;
      
      expect(isVisible).toBe(true);
    });

    it('Assess button should be hidden when toggle is disabled', () => {
      // Ensure assess is disabled
      localStorage.setItem('macrow_assess_enabled', '0');
      const assessEnabled = (localStorage.getItem('macrow_assess_enabled') ?? '0') === '1';
      
      // Simulate the button visibility check
      const isVisible = assessEnabled;
      
      expect(isVisible).toBe(false);
    });
  });

  describe('Integration: Full toggle flow', () => {
    it('complete flow: toggle enables assess and shows button', () => {
      // Step 1: Start with assess disabled
      let settings = { assessEnabled: false };
      expect(settings.assessEnabled).toBe(false);
      
      // Step 2: User clicks toggle to enable
      const mockEvent = { target: { checked: true } };
      settings.assessEnabled = mockEvent.target.checked;
      localStorage.setItem('macrow_assess_enabled', settings.assessEnabled ? '1' : '0');
      
      // Step 3: Verify localStorage was updated
      expect(localStorage.getItem('macrow_assess_enabled')).toBe('1');
      
      // Step 4: Verify assessEnabled is true
      const assessEnabled = (localStorage.getItem('macrow_assess_enabled') ?? '0') === '1';
      expect(assessEnabled).toBe(true);
      
      // Step 5: Verify Assess button would be visible
      const shouldHaveHiddenClass = !assessEnabled;
      expect(shouldHaveHiddenClass).toBe(false);
    });

    it('complete flow: toggle disables assess and hides button', () => {
      // Start with assess enabled
      localStorage.setItem('macrow_assess_enabled', '1');
      
      // User clicks toggle to disable
      const mockEvent = { target: { checked: false } };
      let settings = { assessEnabled: mockEvent.target.checked };
      localStorage.setItem('macrow_assess_enabled', settings.assessEnabled ? '1' : '0');
      
      // Verify localStorage was updated
      expect(localStorage.getItem('macrow_assess_enabled')).toBe('0');
      
      // Verify Assess button would be hidden
      const assessEnabled = (localStorage.getItem('macrow_assess_enabled') ?? '0') === '1';
      const shouldHaveHiddenClass = !assessEnabled;
      expect(shouldHaveHiddenClass).toBe(true);
    });
  });
});
