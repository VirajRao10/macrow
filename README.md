# macrow improvements

Implemented:
- Scenario manager modal with save/load/delete, category tags, JSON import/export.
- Scenario sharing via URL + QR export (with center logo overlay) and mobile QR scan via WebRTC + jsQR.
- Learn tab with glossary + visible LEARN_TIPS, plus graph hover tooltips.
- Policy visualization upgrades: split-view compare, policy history replay, and extra supply-side tools.
- Mobile/touch optimizations: swipe-to-adjust sliders, touch-friendly controls, haptic feedback.
- Accessibility additions: accessibility mode, expanded keyboard shortcuts and help modal, stronger ARIA labels.

## QR scanner notes
- Scanner is mobile-focused (`pointer: coarse` check).
- Desktop users are prompted to use import/share fallback.

## Keyboard shortcuts
- `p` policies
- `r` parameters
- `l` learn
- `a` accessibility
- `s` scenario manager
- `x` reset
- `?` shortcuts help
