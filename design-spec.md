# Macrow redesign — design & IA spec

## 1. Brand & visual system

### 1.1 Logo & header
- Logo `assets/macrow-logo.png` (a friendly "M" crow/raven) sits in the top-left of the
  header at all times. 36×36px on desktop, 28×28px on mobile.
- Wordmark "macrow" uses serif (Source Serif 4 → ui-serif fallback). Tagline:
  "AD–AS, simplified and interactive" (slightly trimmed from "IB Keynesian AD–AS…").
- Header height: 64px desktop, 56px mobile. White background with a 1px bottom border.
  No glassmorphism — too 2023, too AI-coded.
- Right side of header: scenario-manager button + theme toggle (sun/moon SVG, no emoji).

### 1.2 Color tokens
Two themes, light is default.

**Light (`:root`):**
| Token | Value | Use |
|---|---|---|
| `--bg` | `#FAF8F4` | page background (warm off-white) |
| `--surface` | `#FFFFFF` | card background |
| `--surface-2` | `#F1EDE5` | recessed surfaces (sidebar, code) |
| `--text` | `#0F172A` | primary text |
| `--text-2` | `#475569` | secondary text |
| `--muted` | `#64748B` | tertiary / hint |
| `--border` | `#E2E8F0` | dividers, card edges |
| `--border-strong` | `#CBD5E1` | input borders |
| `--accent` | `#B45309` | primary action (warm amber) |
| `--accent-soft` | `#FEF3C7` | accent tinted surface |
| `--accent-text` | `#7C2D12` | text on accent-soft |
| `--danger` | `#B91C1C` | destructive |
| `--success` | `#15803D` | positive state |
| `--chart-ad` | `#DC2626` | AD curve |
| `--chart-as` | `#2563EB` | SRAS curve |
| `--chart-lras` | `#16A34A` | LRAS / Yf marker |

**Dark (`[data-theme="dark"]`):**
| Token | Value |
|---|---|
| `--bg` | `#0B1220` |
| `--surface` | `#111827` |
| `--surface-2` | `#0F172A` |
| `--text` | `#E5E7EB` |
| `--text-2` | `#CBD5E1` |
| `--muted` | `#94A3B8` |
| `--border` | `#1F2937` |
| `--border-strong` | `#334155` |
| `--accent` | `#F59E0B` (brighter amber for dark bg) |
| `--accent-soft` | `#422006` |
| `--accent-text` | `#FDE68A` |
| `--danger` | `#F87171` |
| `--success` | `#4ADE80` |
| `--chart-ad` | `#F87171` |
| `--chart-as` | `#60A5FA` |
| `--chart-lras` | `#4ADE80` |

**Accent justification:** warm amber is editorial / academic. It's what serious
publishers (Economist magazine, FT, NYT) lean on for trust-signaling print work, and
it's rare in modern SaaS UI (where blue / indigo / purple dominate). Picking amber
gives macrow a distinct, non-AI-coded visual identity while staying warm enough for a
learning tool aimed at teenagers.

### 1.3 Typography
- Headings: `'Source Serif 4', ui-serif, Georgia, serif`. Weights 600 (h1–h2), 500
  (h3–h4). Generous line-height (1.2).
- Body & UI: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica,
  Arial, sans-serif`. Weight 400; UI labels at 500. Line-height 1.55.
- Scale (clamp for fluid):
  - h1: clamp(1.75rem, 1.4rem + 1vw, 2.25rem)
  - h2: clamp(1.35rem, 1.1rem + 0.6vw, 1.6rem)
  - h3: 1.125rem
  - body: 0.9375rem (15px)
  - small: 0.8125rem
- No script fonts. Emoji allowed in body content, NOT as UI icons (nav, buttons).

### 1.4 Spacing, radius, shadow
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64
- Radius: 4 / 8 / 12 (small inputs / buttons / cards). No pill-shaped everything.
- Shadows: a single soft shadow for floating surfaces (`0 1px 2px rgba(0,0,0,0.04),
  0 8px 24px rgba(15,23,42,0.08)`). Dark mode: `0 1px 2px rgba(0,0,0,0.4), 0 8px
  24px rgba(0,0,0,0.4)`. No glassmorphism, no neon glows.

---

## 2. Navigation restructure

### 2.1 Sidebar items (in order)
1. **Diagram** — default landing. Shows the AD–AS chart + quick-action cards +
   scenario share panel. This replaces the "Policies tab" being default.
2. **Policies** — policy replay + compare toggles + history scrubber.
3. **Parameters** — sliders for AD/AS drivers.
4. **Scenarios** — opens the scenario manager modal (already exists).
5. **Learn** — modules, glossary, worksheet generator, classroom investigation.
6. **About** — author links + accessibility toggle + shortcuts button.

Removed entirely: Assess tab, Teacher tab.

### 2.2 Layout
```
Desktop (>= 900px):
┌─────────────┬──────────────────────────────────────────────┐
│             │  Header (logo, wordmark, theme toggle)       │
│  Sidebar    ├──────────────────────────────────────────────┤
│  220px      │                                              │
│             │   Main content area                          │
│  - Diagram  │   (one section visible at a time)            │
│  - Policies │                                              │
│  - Params   │                                              │
│  - Scenarios│                                              │
│  - Learn    │                                              │
│  - About    │                                              │
│             │                                              │
└─────────────┴──────────────────────────────────────────────┘
```

Mobile (< 900px):
- Sidebar hidden. Header shows hamburger + logo + theme toggle.
- Hamburger opens a full-height drawer (slides in from left) with backdrop.
- Drawer closes on: backdrop click, Escape, nav-item click.
- Focus is trapped while drawer is open (Tab cycles within drawer).

### 2.3 State
- Active item: `aria-current="page"` + accent left-border + accent-soft background.
- All other items: text-2 color, hover → text color + surface-2 background.
- Keyboard: Tab into sidebar, ArrowDown/Up moves selection (with auto-scroll into
  view), Enter/Space activates. Escape from inside drawer closes it.

---

## 3. Page-by-page

### 3.1 Diagram (default)
- Big chart card (full width within main area on desktop).
- Below chart: equilibrium stats row (Y, P, Yf), axis-numbers toggle, export PNG/SVG,
  the four quick-action cards (Recessionary gap, Demand-pull, Cost-push, Reset).
- "Share this scenario" button below the cards.
- Collapsible share panel (existing behavior).

### 3.2 Policies
- "Choose a policy" header.
- Compare toggle + replay back/forward.
- Replay history scrubber + history list.

### 3.3 Parameters
- "Explore drivers" header.
- Slider list (current sliders from existing app).
- AD formula block visible (was: only visible on Parameters tab).

### 3.4 Scenarios
- Triggers the existing scenario overlay modal. (We keep the modal, just navigate to
  it from the sidebar.)

### 3.5 Learn
- Existing learn hub content (modules, glossary, worksheet generator, etc.).
- Sections: Guidance, Labs, Resources, AI scenarios.

### 3.6 About
- Author links (LinkedIn, BuyMeACoffee, email).
- "Microw — Coming Soon" callout (kept).
- Accessibility toggle (was: "accessibility mode").
- Keyboard shortcuts button (opens existing shortcuts modal).

---

## 4. Component inventory

| Component | Purpose | States | Used in |
|---|---|---|---|
| `Button` (primary / ghost / danger / icon) | All actions | default / hover / focus / disabled / loading | every section |
| `Card` | Content surface | default / interactive (hover lift) | all sections |
| `Input` | Text input | default / focus / error | scenarios, learn |
| `Select` | Dropdown | default / focus | scenarios, scenario compare |
| `Slider` | Range input | default / focus / dragging | Parameters |
| `Modal` | Overlay | open / closed, focus-trapped | scenario, shortcuts |
| `Drawer` | Side panel (mobile nav) | open / closed, focus-trapped | mobile nav |
| `SidebarItem` | Nav row | default / hover / active (aria-current) | nav |
| `ThemeToggle` | Sun/moon switch | sun (light mode) / moon (dark mode) | header |
| `Chip` | Status indicator | default / dismissable | chart under-cards |
| `Toggle` | Checkbox row | on / off | settings |

---

## 5. Migration / cleanup checklist

### DELETE (files)
- `js/auth.js`
- `js/storage.js` (only used by auth — confirmed via reading: just session helpers)
- `js/teacher-analytics.js`
- `tests/auth.test.js`
- `tests/teacher-analytics.test.js`
- `tests/assess-default.test.js` (tied to Assess tab which is removed)
- `tests/assessments.test.js` (Assess tab removed)
- `PROFESSIONAL_POLISH.md` (stale)
- `marketing.html` (no longer linked from anywhere)

### DELETE (in-app code)
- `#welcomeOverlay` + welcome JS in `app.js`
- `#authOverlay` + auth JS in `app.js`
- `authStatus`, `btnAuthOpen`, `btnAuthSignOut` from header
- Topbar sign-in / sign-out / auth status UI
- All imports of auth.js, storage.js, teacher-analytics.js, assessments.js
  (assessments.js only used by Assess tab — confirmed via grep)
- `renderAssessPanel` function and its call from `init()`
- `renderTeacherPanel` function and its call from `init()`
- `setTab` calls that mention "teacher" / "assess"
- The teacher-only branch inside `setTab`
- `syncAssessAvailability` (assess tab removed)
- Bottom-nav (`.bottomNav`, `navBtn` buttons) in `index.html` + the JS that wires them
- `KEYBOARD_SHORTCUTS` entries for `q` (assess), `t` (teacher) — keep the rest

### REWRITE
- `index.html` — new structure: header + sidebar + main area, no bottom nav, no
  onboarding/auth/teacher markup
- `styles.css` — full token-based system per Section 1; sidebar layout, drawer,
  mobile breakpoints, light + dark
- `app.js` — delete wiring, prune imports, update `setTab` (or rename to `setSection`)
  to operate on sidebar items, default landing to "diagram"

### KEEP (as-is, just verify after refactor)
- `js/calculations.js`
- `js/scenario-share.js`
- `js/scenario-comments.js`
- `js/learn-practice.js`
- `js/local-storage.js`
- `manifest.webmanifest` (update `theme_color` + `background_color` to `#FAF8F4` /
  `#B45309` for light default; keep dark fallbacks)
- `sw.js` (PWA service worker)
- `offline.html`
- `tests/about-toggle.test.js`, `tests/calculations.test.js`,
  `tests/learn-practice.test.js`, `tests/scenario-comments.test.js`,
  `tests/scenario-share.test.js`

---

## 6. Acceptance criteria

### Static
- [ ] `git grep -nE "authOverlay|btnAuthOpen|authForm|teacher-analytics|welcomeOverlay|navAssessTab|navTeacherTab|panelAssess|panelTeacher|renderAssessPanel|renderTeacherPanel"` returns zero hits in source.
- [ ] `js/auth.js`, `js/storage.js`, `js/teacher-analytics.js`, `js/assessments.js`,
      `marketing.html`, `tests/auth.test.js`, `tests/teacher-analytics.test.js`,
      `tests/assess-default.test.js`, `tests/assessments.test.js` no longer exist.

### Theme
- [ ] Light mode is the default on first visit.
- [ ] Theme toggle in header switches light/dark. `data-theme` attribute set on
      `<html>` (not body — to avoid FOUC, set it via a tiny inline script before CSS
      loads).
- [ ] Theme choice persists across reload via `localStorage.macrow.theme`.
- [ ] No flash of wrong theme on reload.

### Navigation
- [ ] Sidebar visible on >= 900px, drawer on < 900px.
- [ ] Sidebar items in order: Diagram, Policies, Parameters, Scenarios, Learn, About.
- [ ] Active item has `aria-current="page"` and visible accent indicator.
- [ ] Hamburger on mobile opens drawer; backdrop closes it; Escape closes it.
- [ ] Keyboard: Tab to sidebar, ArrowDown/Up moves selection, Enter activates.
- [ ] Drawer traps focus while open.

### Chart + features
- [ ] AD–AS chart renders with default state.
- [ ] Axis-numbers toggle works.
- [ ] All 4 quick-action cards (Recessionary gap, Demand-pull, Cost-push, Reset)
      shift the chart and update Y/P/Yf values + state label.
- [ ] Export PNG and Export SVG download files (PNG > 1KB, opens as image).
- [ ] Parameters: every slider mutates state and chart updates.
- [ ] Scenarios: save / load / delete / import JSON / export JSON / share URL / export
      QR / scan QR all work.
- [ ] Learn hub: glossary entries render, roadmap items present, classroom
      investigation generator produces output.
- [ ] Share URL: copy link, open in new tab — same scenario loads.
- [ ] Malformed share URL shows a graceful fallback, not a blank screen.

### Quality
- [ ] Logo visible in header on every page state.
- [ ] No 404s in console. No uncaught errors. No "TODO" / placeholder text.
- [ ] `npm test` passes for kept tests.
- [ ] README.md updated (no teacher/auth/onboarding mentions, sidebar nav described).

### Accessibility
- [ ] All interactive elements keyboard-reachable.
- [ ] Focus visible on all controls.
- [ ] Color contrast WCAG AA in both themes.
- [ ] Mobile touch targets >= 44px.
- [ ] `prefers-reduced-motion` respected for any transitions.
