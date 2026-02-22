# macrow

Interactive **IBDP Economics** learning tool for Keynesian **AD–AS** analysis.

macrow helps students and teachers:
- visualize AD, SRAS, and potential output (Yf)
- test fiscal, monetary, and supply-side policies
- compare baseline vs policy outcomes
- practice exam-ready evaluation with structured prompts
- save/share scenarios using URL, JSON, and QR

## What’s included

- Policy cards with replay history and compare mode
- Parameter sliders for core macro drivers
- Learn Hub with exam roadmap, glossary, and classroom investigation generator
- Assessment tab: formative quizzes + competency progression + practice prompts (local storage)
- Teacher tab: class list, assignment creation from current scenario, local analytics
- Scenario manager (save/load/delete/import/export/share)
- Export any diagram (AD–AS, Phillips, Money market) as PNG
- Keyboard shortcuts and accessibility mode
- Better resilience: loading states, status notifications, global error handling
- Low-bandwidth optimization: lazy-loaded QR libraries + reduced visual mode on data-saver/2G
- PWA support (installable + offline cache via service worker)

## Run locally

Because this is a static web app, run a local server from the repository root:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173
```

## Keyboard shortcuts

- `p` → Policies tab
- `r` → Parameters tab
- `l` → Learn tab
- `q` → Assess tab
- `t` → Teacher tab
- `a` → About tab
- `s` → Scenario manager
- `x` → Reset parameters
- `?` → Shortcuts modal
- `Esc` → Close overlays

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
