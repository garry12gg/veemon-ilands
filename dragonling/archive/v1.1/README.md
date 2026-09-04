# Dragonling v1.1 — "Dragonling, fixed"

Snapshot of the exact shipped source. Restored from git commit ba7cf25.

- Published: 2026-09-03, content 353957132590125056 "Dragonling, fixed"
- Files: index.html + manifest.json (the bundle as uploaded) + click-test.js (DOM-stub click harness, first test tool)

## The fix
`el.stage()` → `el.stageEl.appendChild(...)` in both spawnBerry and spawnZ (2 lines, lines 349 and 508 of index.html). Feed and rest now work; harness: 6 PASS, tummy 70 → 87.

Lesson filed: test interaction paths, not just the front door.

Superseded by v1.2 "the nap that counts" (content 354015441787555840, live source in ../.. — the nap at spark 96–98 cheated the 2s credit line; v1.2 floors it).
