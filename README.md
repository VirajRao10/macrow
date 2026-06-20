# macrow

Interactive **IBDP Economics** learning tool for Keynesian **AD–AS** analysis.

macrow helps students:
- visualize AD, SRAS, and potential output (Yf)
- test fiscal, monetary, and supply-side policies
- compare baseline vs policy outcomes
- practice exam-ready evaluation with structured prompts
- save/share scenarios using URL, JSON, and QR

## What's included

- **Diagram view** (default landing) — interactive AD–AS chart with equilibrium
  stats, axis-number toggle, PNG/SVG export, and one-tap scenario cards
  (recessionary gap, demand-pull inflation, cost-push inflation, reset).
- **Policies** — policy replay + compare toggle + history scrubber.
- **Parameters** — sliders for the core macro drivers (gov spending, tax,
  interest rate, production costs, productivity, supply-side reform).
- **Scenarios** — save / load / delete / import JSON / export JSON / share URL /
  export QR / scan QR (camera-based, with graceful fallback).
- **Learn** — exam roadmap, glossary, classroom investigation generator,
  topic quizzes, flashcards, and additional diagrams (Phillips, money market,
  loanable funds, circular flow, PPF, Laffer, long-run equilibrium).
- **About** — author links, accessibility toggle, keyboard shortcuts.

## Layout & navigation

The app uses a **left sidebar** with six items:

1. Diagram (home)
2. Policies
3. Parameters
4. Scenarios
5. Learn
6. About

On desktop the sidebar is fixed. On screens narrower than 980px it collapses
into a hamburger-triggered drawer with a focus trap. Keyboard users can
navigate with Tab + Arrow keys; Enter activates the focused item.

## Theme

Light mode is the default. A toggle in the header switches to dark mode and
the choice is persisted in `localStorage.macrow_theme_mode_v1`. The first
visit respects `prefers-color-scheme` but every subsequent visit honors the
saved choice.

## Run locally

Because this is a static web app, run a local server from the repository root:

```bash
python3 -m http.server 4173
```

Then open:

```
http://127.0.0.1:4173
```

## Keyboard shortcuts

- `d` → Diagram (home)
- `p` → Policies section
- `r` → Parameters section
- `l` → Learn section
- `a` → About section
- `s` → Open scenario manager
- `x` → Reset parameters
- `?` → Shortcuts modal
- `Esc` → Close overlays / drawer

## Tests

```bash
npm install
npm test
```

## Educational intent

macrow is designed to support IBDP-style reasoning:

1. Identify initial equilibrium (Y and P)
2. Explain curve shift direction and transmission mechanism
3. Describe new short-run equilibrium
4. Evaluate with assumptions, time lags, and trade-offs
