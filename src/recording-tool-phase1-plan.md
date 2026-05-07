# Recording Tool — Phase 1 Plan

A build-ready spec for the **Phase 1-only** recording tool. This is a tight subset of the broader plan in [`recording-tool-plan.md`](recording-tool-plan.md) — same architecture, same privacy model, but limited to what Phase 1 of the training plan actually demands.

**Status: design only. No code yet.**

---

## Why Phase 1 only

Phase 1 of the training plan ("Baseline diagnostic + pilot, don't build") is the longest self-contained section, runs 3–5 weeks, and demands the most journaling discipline of any phase. If the recording tool only ever supports Phase 1, the user already gets ~80% of the journaling value of the full plan, because the per-game log carries forward unchanged into every later phase.

Building Phase 1 first also de-risks the bigger build: if localStorage / backup / export all work for Phase 1, V2 just adds new screens on the same foundation.

---

## What Phase 1 actually requires recording

Pulled directly from the training plan, Phase 1 section. Anything below this list is out of scope for this build.

### Per-game log (the most-used field)
Filled once per game. ~30 seconds.

**Pre-game protocol** (filled at team preview, before turn 1):
- My win condition (1 sentence)
- Their win condition guess (1 sentence)
- My lead pair (2 mons)
- Their lead pair (2 mons, free text since opponent picks vary)
- My 4 of 6 (4 mons from my team)

**Post-game (filled after match):**
- Result: W / L
- Replay (URL paste *or* drag-drop saved HTML — see "Replay handling" below)
- Pivotal turn (turn number)
- Error type: **Knowledge gap / Positioning error / Planning failure / None** (the plan's taxonomy)
- One-sentence lesson

That's all. No Tera audit yet (Phase 3), no board-state classification yet (Phase 3), no Core/Solver/Enabler tagging (Phase 5). Keep it minimal so the user actually fills it in.

### Current team profile (one team only in V1)
Filled once when adopting a borrowed team, edited rarely. Free-text-heavy.

- Team name + source link (Pastes / VGC YouTube / Victory Road)
- Format (e.g., "VGC 2026 Reg X")
- Reverse-engineering notes (free text, multi-paragraph):
  - "What's the core?"
  - "What modes / lead pairs does the author intend?"
  - "Per-mon: threats it handles, win condition"
  - "Which 2 do I usually bench? When would I bring them instead?"
- 6 mon names (used as the dropdown source for the game logger's "my lead" / "my 4")

That's it. No speed map (Phase 2). No Core/Solver/Enabler tags (Phase 5). The reverse-engineering is just a textarea — no fancy structure needed.

### Phase 1 checkpoint readouts (computed from the log)
The plan's checkpoint asks "name your top 3 error types." This becomes a one-line readout on the dashboard that *computes itself* from the log:

> Top error types in your last 10 losses: 1. Planning failure (5×), 2. Positioning (3×), 3. Knowledge gap (2×).

Plus a tilt-protocol indicator:

> Last 5 sessions: 0 sessions where you queued after 3 consecutive losses. ✅

(A "session" defined as games within ~2 hours of each other, computed from `playedAt` timestamps.)

That's the full computation needed for Phase 1. Nothing else.

---

## Replay handling: URL vs HTML

You raised this — both options have real uses, and supporting both is cheap.

### Option A — Showdown replay URL (default)
**How**: Click "Save replay" on the battle screen. Paste the resulting URL (e.g. `https://replay.pokemonshowdown.com/gen9vgc2026regm-12345`) into the form.

- **Pros**: zero extra steps, tiny to store (one string), watchable from any device, easy to share with someone if you want feedback.
- **Cons**: relies on Showdown's servers being up forever (they don't currently delete replays, but no guarantee). Link can technically leak — Showdown replays are public by URL.

### Option B — Saved HTML file
**How**: On a Showdown replay page, browser → Save Page As… → HTML. Drag-drop the file into the logger.

- **Pros**: fully self-contained record. Survives Showdown going down or deleting old replays. Embedded in your JSON export.
- **Cons**: extra step (save the file). Larger storage cost — but only the *battle log* matters, not the whole HTML.

### Recommended approach: support both, store the compact form in either case

When the user uploads an HTML file, the app extracts only the actual battle log (Showdown stores it inside `<script class="battle-log-data" type="text/plain">…</script>`) and persists *that* — typically 5–20 KB of plain text. The rest of the HTML (CSS, JS, page chrome) is discarded.

Data model field:

```json
"replay": {
  "url": "https://replay.pokemonshowdown.com/gen9vgc2026regm-12345",   // optional
  "embeddedLog": "|player|p1|...\n|move|...\n",                         // optional, ~5-20 KB
  "savedAt": "2026-05-04T20:31:00Z"
}
```

A game can have URL only, embedded log only, or both. The logger UI:
- Default: paste URL field
- "Save offline backup" toggle (collapsed): drag-drop or file-picker for the HTML

A "View replay" button on the game entry: if URL exists, opens it in a new tab (Showdown's player). If only embedded log exists, opens a basic raw-log viewer (`<pre>` block in a modal — no fancy renderer needed for V1; users can read it linearly).

**My recommendation**: most users only paste URLs. The HTML upload is for **the loss you're going to study seriously** — usually 1 in 10 games. The friction of saving HTML matches the importance.

---

## Backup story (this is the answer to "make sure it's easy to back up")

Backup is not optional — `localStorage` evaporates if the user clears cache, switches browsers, or uses incognito. Three layers:

### Layer 1 — Manual export (always available)
- "Download backup" button visible in the dashboard's header at all times
- Click → instant download of `vgc-log-YYYY-MM-DD.json`
- Filename includes date so multiple backups don't overwrite each other
- File is fully self-contained: contains all games, current team, and any embedded replay logs

### Layer 2 — Manual import (the "I switched devices" path)
- "Restore from backup" button next to Download
- File picker → load JSON
- Mode: **Replace** (wipe current localStorage and load the file) or **Merge** (combine — newer entries from file win on conflict)
- Confirmation prompt before any destructive action ("This will replace 14 games with 23 games from the file. Continue?")

### Layer 3 — Nudges so the user actually does it
- **Toast on session end**: "It's been 9 days since your last backup. [Download now]" — appears if `lastExportedAt` > 7 days
- **First-visit banner** explaining the privacy + backup story (described below)
- **Storage health check**: on app load, attempt a small write to `localStorage`. If it fails (private/incognito mode, full quota), show a red banner: "Your browser isn't saving data. Logs will be lost when you close this tab."
- **Backup-on-shutdown helper**: optional checkbox in settings, "Remind me to back up when I close the tab" — uses `beforeunload` to flash a "backup first?" prompt

### Layer 4 — Future, optional
- GitHub Gist sync (V4 in the broader plan, **out of scope for Phase 1**) — user supplies their own personal access token, app syncs JSON to a private Gist on every save. Cross-device with zero third-party servers. Skip until requested.

---

## Privacy banner (shown once on first visit, dismissible)

> **Your log lives only in your browser.** This site is hosted on GitHub Pages and has no server — everything you record stays in your browser's localStorage and never leaves your device. Other visitors to this site have their own separate logs in their own browsers; your data is invisible to them. **However**: if you clear your browser data, switch to incognito mode, or use a different device, your log doesn't follow you automatically. **Download a backup at least weekly** — the button is in the top-right.

Banner is dismissible (sets a flag in localStorage). Re-shown on hard reset.

---

## Architecture (unchanged from broader plan, restated for completeness)

- **No backend.** GitHub Pages is static-only.
- **localStorage**, single key `vgc-recording-v1`, JSON-serialized blob (schema described next).
- **Vanilla JS, no framework.** One file: `docs/app.js`.
- **One new HTML page**: `docs/log.html`.
- **One new CSS file**: `docs/app.css`, importing CSS variables from existing `style.css` so theming stays consistent (the cheerful Pokémon palette).
- **No build step.** `convert.py` already copies all files in `docs/`; no changes needed.

### Why the choice protects multi-user privacy

Two visitors to your site each have their own localStorage scoped to `liehtt.github.io` (or wherever it's hosted). Browser sandboxing guarantees these are isolated — there is no shared state. No accounts, so no auth bugs to leak data. The HTML/JS source is public, but data isn't transmitted anywhere.

---

## Data model (Phase 1 only)

One key in localStorage: `vgc-recording-v1`. Value is JSON:

```json
{
  "schemaVersion": 1,
  "settings": {
    "lastExportedAt": "2026-05-04T18:00:00Z",
    "privacyBannerDismissed": true
  },
  "currentTeam": {
    "name": "Borrowed: WolfeyVGC May 2026",
    "sourceUrl": "https://www.youtube.com/watch?v=...",
    "format": "VGC 2026 Reg X",
    "mons": ["Calyrex-S", "Urshifu-R", "Incineroar", "Rillaboom", "Tornadus", "Iron Hands"],
    "reverseEngineeringNotes": "Free text, can include markdown. Sections: core, modes, per-mon notes, bench reasoning."
  },
  "games": [
    {
      "id": "g-1",
      "playedAt": "2026-05-04T20:30:00Z",
      "result": "L",
      "preGame": {
        "myWinCondition": "Get TW up T1 then double-target their Calyrex",
        "theirWinConditionGuess": "TR turn 1 with Indeedee + Armarouge",
        "myLead": ["Tornadus", "Incineroar"],
        "theirLeadGuess": ["Indeedee-F", "Armarouge"],
        "myFour": ["Tornadus", "Incineroar", "Calyrex-S", "Urshifu-R"]
      },
      "replay": {
        "url": "https://replay.pokemonshowdown.com/...",
        "embeddedLog": null,
        "savedAt": "2026-05-04T20:31:00Z"
      },
      "pivotalTurn": 4,
      "errorType": "planning",
      "lesson": "Always pre-decide the TR-up branch before turn 1"
    }
  ]
}
```

That's the entire schema for V1.

---

## UI scope (Phase 1)

Three screens. All on `docs/log.html`, navigated via a top tab strip.

### Screen 1: Dashboard (default tab)
Above the fold:
- **Quick action**: a big "+ Log a game" button that opens Screen 2.
- **Last-10-games strip**: 10 colored squares (green = win, red = loss), with W-L count and current ladder rating if logged.
- **Top error types in last 10 losses**: 3 lines, computed live. (Per the Phase 1 checkpoint.)
- **Tilt protocol indicator**: ✅ or ⚠️ — based on whether any session in the last 2 weeks had ≥4 games or ≥3 consecutive losses.
- **Backup status**: "Last backed up 9 days ago — [Download now]" or "Backed up 2 days ago ✅".

Below the fold:
- **Recent games table**: date / result / lead pair / error type / lesson (truncated). Click to expand; click again to edit.
- **Export / Import buttons** (also pinned in the header at all times).

### Screen 2: Log a game (form)
A single-column form, all fields visible at once (no wizard / multi-step — adds friction).

Section A — Pre-game (collapsed by default if all fields empty):
- 5 inputs as listed above. Lead and "my 4" are dropdowns sourced from `currentTeam.mons`.

Section B — Post-game:
- Result (W/L radio)
- Replay URL (paste, validated against `replay.pokemonshowdown.com`)
- "Or upload saved HTML" (collapsible drag-drop zone)
- Pivotal turn (number)
- Error type (4 radio buttons: Knowledge / Positioning / Planning / None — with hover tooltips explaining each)
- Lesson (textarea, soft 200-char limit)

Buttons: **Save** (validates required fields, writes to localStorage) / **Save and log another** / **Cancel**.

### Screen 3: Current team
A single-column form for the current team. All free-text + a 6-mon list (autocomplete from a static common-mons list helps, but isn't required for V1 — typing is fine).

If no team set yet, the form replaces a banner: "You haven't set up a team yet. Without a team, the game logger can't pre-fill mon dropdowns. [Set up team]"

---

## Integration with existing training plan

Two touch points:

1. **Header nav**: add a `📊 My log` link to `index.html`, `library.html`, every article page. Goes between "Training plan" and "Article library."
2. **Inline button in Phase 1 of the plan**: at the end of step 3 ("Run the 10-game baseline"), add a button: **[+ Log a baseline game →]** that links to `log.html#new`. The hash makes the form auto-open. Same button is added at the end of step 8 ("After every loss…").

The plan reads exactly the same for users who never click those buttons. Purely additive.

---

## Phase 1 acceptance criteria

The build is complete when **all** of these pass:

- [ ] User opens `log.html` from header nav. Sees dashboard. First visit shows privacy banner.
- [ ] User can fill the team form once, save, see their 6 mons stored.
- [ ] User can log a game in <30 seconds: 5 pre-game fields + 5 post-game fields + Save.
- [ ] Logged game appears in the recent-games table on dashboard.
- [ ] After 10 logged games, dashboard shows "Top error types: …" computed from data.
- [ ] After ≥1 logged session with 3+ consecutive losses, tilt indicator shows ⚠️.
- [ ] Replay URL paste: link is clickable from the game entry, opens Showdown replay in new tab.
- [ ] Replay HTML drag-drop: app extracts the battle-log-data, stores it, "View raw log" button shows it as `<pre>` text.
- [ ] Download backup button → JSON file named `vgc-log-YYYY-MM-DD.json` downloads successfully.
- [ ] Restore from backup → data fully restored after a fresh browser session (verified by clearing localStorage manually and re-importing).
- [ ] Open the site in a different browser → zero data shown (proves isolation).
- [ ] Browser devtools → Network tab → no third-party requests on any action.
- [ ] Open in incognito mode → red warning banner appears about non-persistent storage.
- [ ] If `lastExportedAt` is >7 days, dashboard shows the "back up now" nudge.
- [ ] All UI uses the existing Pokémon-cheerful palette (red header bar, cream background, etc.).

---

## Effort estimate

Narrower scope than the V1 in the broader plan because:
- Only one team, no team CRUD
- No Tera audit / no Core-Solver-Enabler tagging
- No plateau diagnostic (Phase 6)
- No iteration log (Phase 5)
- No meta cards (Phase 4)

**Estimated build time: 4–5 hours of focused dev work.** Roughly:
- HTML scaffolding + privacy banner + tab navigation: 30 min
- Game logger form + validation: 60 min
- Team form: 30 min
- localStorage read/write + schema: 30 min
- Dashboard widgets (recent strip, error counts, tilt indicator, backup status): 60 min
- Replay HTML parsing + drag-drop: 45 min
- Export / Import / nudges: 45 min
- Polish, edge cases, mobile responsiveness: 30 min

Splittable across two focused sessions if needed.

---

## What this plan deliberately does NOT include

These are explicit non-goals for Phase 1, so we don't scope-creep:

- ❌ Team CRUD beyond a single current team
- ❌ Core / Solver / Enabler tagging
- ❌ Speed map editor
- ❌ Tera intent + audit recording (will be added in Phase 3 build)
- ❌ Board state classification per turn
- ❌ Plateau diagnostic auto-bucketization
- ❌ Iteration log
- ❌ Meta cards / top-20 mon notes
- ❌ Weekly meta drift notes
- ❌ Cross-device sync (Gist or otherwise)
- ❌ Any rendering of the replay battle (just a raw-text viewer)
- ❌ Auto-population from Showdown replay URLs (could be added later — parsing replay JSON to get format / opponent name / damage rolls is doable but not in V1)

When you finish Phase 1 of the *training* plan, we revisit and design the Phase 2 build (which adds team profiles + speed map). Each tool-build phase tracks the corresponding training-plan phase.

---

## Open decisions (need your call before I write code)

1. **Replay default**: paste URL only by default, with HTML upload behind a "show options" disclosure → fewer fields cluttering the form. **Recommendation: yes.**

2. **Lesson char limit**: hard limit at 200 (forces brevity, matches "1 sentence") or soft (warn but allow more)? **Recommendation: soft — show a counter, no hard block.**

3. **Auto-populate `playedAt` to "now" or let user override?** Override is occasionally useful (logged a game from yesterday). **Recommendation: default to now, show a small "Edit time" link.**

4. **Mobile**: phone-friendly form, or desktop-only V1 with mobile in a later pass? **Recommendation: phone-friendly form (it's the same form, just CSS), but no mobile-specific dashboard polish.**

5. **First-game UX**: when the user has 0 games, the dashboard's last-10-strip and error-type widget will be empty. Show empty states with "Log your first baseline game →" CTA, or hide those widgets until ≥1 game? **Recommendation: empty state with CTA — keeps the dashboard layout stable.**

6. **Schema migrations**: V1 ships `schemaVersion: 1`. When V2 ships and adds team CRUD, we'll need a migration. Plan to write a `migrations[]` system now or wing it later? **Recommendation: wing it for V1, formalize when adding V2.**

Once you answer these (or accept the recommendations), I'll start the V1 build.
