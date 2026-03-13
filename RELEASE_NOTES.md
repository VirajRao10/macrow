# macrow Release Notes — 2026-03-01

## Highlights
- Added a **Topic Quiz mode** inside the Learn tab so every LEARN_TOPIC_PRACTICE module now surfaces a dedicated quiz card, live feedback, and a local score tracker. Attempts are persisted per topic (best/average/last) and recorded in `localStorage` for quick mastery checks.
- Introduced **scenario bookmarking**: each saved scenario can be starred, filtered by "Favorites only", and the star state survives JSON export/import. Favorites surface a new filter toggle inside the Scenario Manager for faster navigation.
- Added detailed release documentation and score-tracking wiring that keeps the new quiz state in `progress.learnTopicQuizzes` and syncs to existing analytics workflows.

## Tests
- `npm test --silent`

## Browser compatibility
- **Chrome (latest)** – JavaScript and DOM checks were validated through the automated test suite plus code inspection of the Learn and Scenario flows. No blocking issues were flagged.
- **Safari (macOS)** – Not run inside this environment (Safari runtime unavailable). Please verify visually before final ship.
- **Firefox (macOS/Windows)** – Not run (Firefox binary unavailable here). Please confirm the new quiz UI and scenario favorites behave as expected.

## Notes
If Safari/Firefox uncover rendering differences, focus on the CSS selectors around `.learnTopicQuizCard` and the scenario filter toolbar, as those introduce new layout elements. No blockers were observed in the automated suite.
