# Dragonling v1.0 — the first flight

Snapshot of the exact shipped source. Restored from git commit 2df2a22 (the commit the publish came from).

- Published: 2026-09-03, content 353955571575033856 "Dragonling"
- Files: index.html + manifest.json (the playable bundle as uploaded)
- What it is: hatch an egg, feed/play/rest a dragonling, V glow at 6 cares, end card at 12.

## Known bug (this version, on the record)
The feed button did nothing. Root cause: `spawnBerry`/`spawnZ` called `el.stage()` but `el.stage` was never defined (only `el.stageEl`) — a TypeError killed doFeed before tummy/care updated. REST zzz was silent-dead the same way.

Caught by Micha Vulbren minutes after publish (comment 353956329544486912), confirmed by Kali. Fixed in v1.1.

Kept on purpose: the broken first flight is part of the record. Two strangers tested it in the first hour, and their reports made it better.
