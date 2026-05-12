# Recording Tool — Phase 2 Plan

A build-ready spec for the **Phase 2** expansion of the recording tool. Same architecture, same privacy model, same look-and-feel as Phase 1. Adds the data structures and UI Phase 2 of the training plan actually demands.

**Status: design only. No code yet.** Mirrors the format of [`recording-tool-phase1-plan.md`](recording-tool-phase1-plan.md). Reference: Phase 2 spec lives at `src/vgc-training-plan.md` lines 165–233.

---

## Why a Phase 2 expansion

Phase 1's recording tool was about *capturing what happened* (game logs, error types, lessons). Phase 2 is about *building reference data and drills*. The activities Phase 2 demands aren't game logs — they're persistent team-reference artifacts (speed map, defensive benchmarks) plus per-session structured exercises (prediction drills, replay drills, reading). Trying to cram those into the existing game logger would force-fit them.

The Phase 1 tool also already exists and works. Don't break it. Extend it.

---

## What Phase 2 actually demands (mapped from the training plan)

Pulled directly from `src/vgc-training-plan.md` lines 165–233. Anything below this list is out of scope for V1.

### Persistent reference data (build once, edit occasionally)

1. **Relative speed map** — per mon on the current team:
   - Base speed stat
   - What it outspeeds at +0 in the current meta
   - What it outspeeds under your speed control (Tailwind 2x, Trick Room reverse, Scarf 1.5x, Quash)
   - What common meta mons outspeed it (at +0 / under their Tailwind / under their Scarf)

2. **Defensive benchmarks** — per defensive mon on the current team:
   - Can it survive the strongest realistic hit from the meta's top 5 attackers? At full HP / 75% / 50%?
   - What item/EV change pushes a "barely dies" matchup into "lives one hit"?

### Per-session and per-game new structured exercises

3. **Pre-session calc lookups** — 5-minute drill before each ladder session:
   - Top 3 likely opp attackers from Pikalytics usage
   - What each does to your team

4. **Mid-game prediction drill** (the Phase 2 hard test) — for at least 5 games:
   - Per turn, predict opp's move + expected damage range
   - After turn: how many right (move + damage within ~10%)?
   - Pass = ≥3/5 games with ≥1 correct turn-level prediction per game

5. **Replay drill log** — one per week:
   - YouTube tournament replay watched
   - 3 turns predicted before unpausing
   - Hits/misses + caster's reasoning vs. yours

### Per-game new tags (extending the Phase 1 logger)

6. **Threat-type classification done pre-Turn 1?** — Y/N
7. **Single-sentence commitment** — "The Pokémon I must not allow free turns is ___ because ___" (free text)
8. **Support-mon first-move audit done?** — Y/N (generalized version of the Sableye-specific audit)
9. **Strategic 1-HP usage** — did I deliberately use a low-HP mon (Intimidate reset, hit-eat, stall) instead of letting it die uselessly? Y/N + brief note
10. **Switch reason categories triggered this game** — multi-select: survival / positioning / field-condition / resource-preservation (maps to Checkpoint 2's "4 reasons to switch")

### Reading progress

11. **Phase 2 reading checklist** — 5 pages, with read-state + optional notes:
    - `what-is-pressure`
    - `trick-room`
    - `battling-against-trick-room`
    - `switching`
    - `1-hp-is-infinitely-more-than-0-hp`
    - `items`

### Phase 2 checkpoint self-attestation

12. **Six checkpoint items** — each with checkbox + evidence textarea (the textarea forces you to actually verbalize the answer, not just check the box):
    - Pressure articulation
    - Switch reasoning (4 reasons + examples)
    - "1 HP" test
    - Speed-tier awareness
    - Trick Room counterplay
    - Mid-game prediction hard test

---

## Hard constraints (unchanged from Phase 1)

1. Static site only (GitHub Pages, no backend)
2. Publicly hosted — every visitor has isolated `localStorage`
3. Hobbyist-paced — all forms must feel like sub-30-second additions to existing flows
4. No third-party signups
5. No data leaves the browser unless the user explicitly exports

The Phase 1 architectural decision (`localStorage` + JSON export/import) carries forward unchanged. Phase 2 just expands what gets stored in the same blob.

---

## Architecture: extend, don't fork

**One coherent app, more tabs.** Don't make a separate `phase2.html`. The Phase 1 tool's tabs (`Dashboard` / `Log a game` / `Team`) get extended:

- **Team** tab gets two new sub-sections (accordions): **Speed map** and **Defensive benchmarks**.
- A **new top-level tab `Drills`** is added containing four sub-sections:
  - Reading progress
  - Prediction drill log
  - Replay drill log
  - Phase 2 checkpoint
- The **Log a game form** gets a new collapsed-by-default section: **Phase 2 tags** (the 5 new per-game fields).
- The **Dashboard** gets one new card: **Phase 2 progress** showing completion percentages for each Phase 2 deliverable.

Why one app: navigation stays single-context, schema stays in one place, export still bundles everything, no duplicate tabs/UI primitives.

---

## Data model (schema v2 → v3 migration)

One `localStorage` key, same as Phase 1: `vgc-recording-v1`. Bump `schemaVersion` from 2 → 3. Migration is additive only — no existing fields are renamed or deleted.

New top-level shape:

```json
{
  "schemaVersion": 3,
  "settings": { ... existing ... },
  "currentTeam": {
    ...existing fields...,
    "speedMap": [
      {
        "mon": "Archaludon",
        "baseSpeed": 85,
        "underControl": { "tailwind": false, "scarf": false, "quashTarget": false, "trickRoom": true },
        "effectiveSpeed": 85,
        "outspeedsAt0": ["Iron Hands", "Dondozo", "Snorlax"],
        "outspeedsUnderControl": ["…with TR up, beats most fast"],
        "outspeedBy": ["most everything at +0; Scarf users always"]
      }
    ],
    "defensiveBenchmarks": [
      {
        "mon": "Archaludon",
        "spread": "252 HP / 252 Def / 4 SpD, Bold, Assault Vest",
        "vsThreats": [
          {
            "attacker": "Calyrex-Shadow",
            "move": "Astral Barrage",
            "damagePct": "44-52%",
            "survivesAtFull": true,
            "survivesAt75": true,
            "survivesAt50": false,
            "fixIfFails": "Tera Dark would survive at 50%"
          }
        ]
      }
    ]
  },
  "games": [
    {
      ...existing fields...,
      "phase2Tags": {
        "threatChecklistDone": true,
        "commitmentSentence": "Don't let Orthworm get free Iron Defense turns.",
        "supportFirstMoveAuditDone": true,
        "strategic1HpUsed": false,
        "strategic1HpNote": "",
        "switchReasons": ["survival", "positioning"]
      }
    }
  ],
  "phase2": {
    "readingProgress": {
      "what-is-pressure": { "read": true, "readAt": "2026-05-08", "notes": "..." },
      "trick-room": { "read": false, "readAt": null, "notes": "" },
      "battling-against-trick-room": { "read": false, "readAt": null, "notes": "" },
      "switching": { "read": false, "readAt": null, "notes": "" },
      "1-hp-is-infinitely-more-than-0-hp": { "read": false, "readAt": null, "notes": "" },
      "items": { "read": false, "readAt": null, "notes": "" }
    },
    "preSessionCalcs": [
      {
        "id": "psc-…",
        "date": "2026-05-08",
        "topThreats": [
          { "attacker": "Iron Hands", "move": "Wild Charge", "vsMyMon": "Archaludon", "damage": "30-36%" }
        ]
      }
    ],
    "predictionDrills": [
      {
        "id": "pd-…",
        "gameId": "g-…",
        "playedAt": "2026-05-08",
        "turns": [
          { "turn": 1, "predictedMove": "Astral Barrage on Sableye", "predictedDamage": "100% KO",
            "actualMove": "Astral Barrage on Sableye", "actualDamage": "100% KO", "moveCorrect": true, "damageCorrect": true }
        ],
        "summary": { "totalTurns": 5, "correctTurns": 3, "passed": true }
      }
    ],
    "replayDrills": [
      {
        "id": "rd-…",
        "date": "2026-05-08",
        "replayUrl": "https://www.youtube.com/...",
        "replayTitle": "VGC 2026 Bochum Regionals Top 8",
        "turnsAnalyzed": 3,
        "turnsCorrect": 2,
        "lesson": "I always predict Protect first; pros sometimes click damage into expected Protect."
      }
    ],
    "checkpoint": {
      "pressureArticulation": { "passed": false, "evidence": "" },
      "switchReasoning": { "passed": false, "evidence": "" },
      "onehpTest": { "passed": false, "evidence": "" },
      "speedTierAwareness": { "passed": false, "evidence": "" },
      "trickRoomCounterplay": { "passed": false, "evidence": "" },
      "midGamePredictionTest": { "passed": false, "evidence": "" }
    }
  }
}
```

That's the complete v3 shape. Existing games get an empty `phase2Tags` object on first load (filled if/when the user edits them). Existing teams get an empty `speedMap` and `defensiveBenchmarks` array. Migration is non-destructive.

---

## UI components

All new UI uses the existing Pokémon-cheerful palette and CSS variables from `style.css` / `app.css`. No new design tokens needed.

### 1. Team tab — new "Speed map" sub-section (accordion)

Triggered by clicking a "Speed map" header below the existing team fields. Expands to show a 6-row editable table:

| Mon | Base spd | Outspeeds at +0 (free text) | Outspeeds under control (free text) | Outspeed by (free text) | Notes |
|---|---|---|---|---|---|

A small "+ Add mon from current team" auto-populates rows from `currentTeam.mons`. Rows can be reordered. Each text cell is a `<textarea>` so multi-line is OK.

A small **"Computed speed snapshot"** strip at the bottom shows the team's fastest/slowest at +0 and under each speed-control mode for quick reference.

### 2. Team tab — new "Defensive benchmarks" sub-section (accordion)

Same pattern. Per defensive mon:

- Header row: mon name + spread (free text: `"252 HP / 252 Def / 4 SpD, Bold, AV"`)
- Below: a sub-table of attackers:

| Attacker | Move | Damage% | Survives @ full | @75% | @50% | Fix if fails |
|---|---|---|---|---|---|---|

Each survives column is a check that flips to ✅/❌. The "Fix" column is free text for "Tera X / +X EV / different item" notes.

Click "+ Add attacker" to add a row. Click "+ Add benchmark mon" to add a new defensive mon block.

### 3. New "Drills" top-level tab

Four sub-section accordions, each independently expandable:

#### 3a. Reading progress
Six rows, one per Phase 2 reading page. Each row:
- Checkbox (read state) — toggling sets `readAt` to today
- Link to the article page (deployed URL)
- "Notes" textarea (collapsed when read state is false)
- Date badge shown when read

Quick action: **"Mark all read"** if the user prefers paper or already finished offline.

#### 3b. Prediction drill log
Header: explanatory text linking to Phase 2 spec's "Hard test — mid-game prediction."

List of past drill sessions (collapsed). One **"+ Log a new prediction session"** button opens a sub-form:
- Pick a logged game (dropdown of recent games from the existing log)
- Auto-detects turn count if `embeddedLog` is present (else free-input)
- Per turn: predicted move (free text) + predicted damage (free text) → after the game, mark "move correct?" + "damage correct?" checkboxes
- Auto-calculates summary: correct turns / total, pass/fail at ≥3/5 threshold

Saved sessions show in a compact list view: date / game ID / pass-fail badge / accuracy %.

#### 3c. Replay drill log
List of past replay drills. **"+ Log a new replay drill"** opens a sub-form:
- Replay URL (YouTube or Showdown)
- Title (optional)
- 3 turns × (predicted move, was correct?, caster's actual reason)
- Lesson (textarea)

#### 3d. Phase 2 checkpoint
Six rows, one per checkpoint item from `src/vgc-training-plan.md` lines 226–231:

| Item | Status | Evidence (textarea — forced) |
|---|---|---|

The "Status" column is a 3-state pill: **untested / failed / passed**. Marking "passed" requires non-empty evidence — the textarea expands when you click "passed" and "save" is disabled until it has content. This forces honest self-attestation rather than reflexive ticking.

A summary line at the top: **"3 of 6 honestly verified — keep going."** When 4/6 hits, a banner appears: **"You can advance to Phase 3."**

### 4. Game logger — new "Phase 2 tags" section (collapsed by default)

Inside the existing game logger form, below the existing Post-game fields, add a collapsed `<details>` block:

> ▶ Phase 2 tags (optional)

Expanded contents:

- ☐ Threat-type checklist done pre-Turn 1?
- ☐ Support-mon first-move audit done?
- ☐ Used a low-HP mon strategically this game?
  - (textarea: brief note, shown when checked)
- Single-sentence commitment (textarea): "The Pokémon I must not allow free turns is ___ because ___"
- Switch reasons triggered (multi-select checkbox pills): survival / positioning / field-condition / resource-preservation

This block stays collapsed for Phase 1 users — never required. For Phase 2 users, expand once, then click-through fields stay quick.

### 5. Dashboard — new "Phase 2 progress" card

Sits in the existing card grid alongside Last-10, Top errors, Tilt, Backup. Shows:

- Reading: **N / 6 pages**
- Speed map: **N / 6 mons mapped** (mapped = has both base speed and at least one outspeed entry)
- Benchmarks: **N defensive mons benchmarked**
- Prediction drills: **N / 5 passed** (toward Phase 2 hard test)
- Replay drills this week: **N**
- Checkpoint: **N / 6 honestly verified**

Click the card → jump to Drills tab.

When all six metrics hit thresholds, the card flips green with **"Ready for Phase 3 ✅"**.

---

## AI prompt updates

The embedded prompt in `.md` export already handles Mode A (full log) and Mode B (single game). Phase 2 work warrants a **Mode C**: a Phase 2 readiness review.

Mode C (when triggered by user asking "am I ready for Phase 3" or pasting their full backup including `phase2` data):

1. Audit the speed map — is it complete? Are the entries accurate-looking? Common mons missing?
2. Audit defensive benchmarks — does the threat list reflect the current meta? Any obvious top-5 attacker missing?
3. Audit prediction drill data — accuracy trend? Are predictions getting better over time, flat, or worse?
4. Audit checkpoint evidence — does the textarea evidence actually demonstrate the skill, or is it a hand-wave?
5. Verdict: ready / not yet / very close.

Mode C is additive — Modes A and B keep working unchanged. The trigger is a sentence in the prompt explaining when to use each.

Also: the markdown export needs to include `phase2` data (speed map, benchmarks, drill counts, checkpoint state). This makes the AI's review possible.

---

## Phased build (so we can ship value fast and stop early)

### V1 — Minimum useful Phase 2 layer (~3 hours)
- Schema migration v2 → v3
- Reading progress checklist
- Phase 2 checkpoint self-attestation (6 items with evidence textareas)
- Phase 2 progress card on dashboard
- New "Drills" tab structure (sub-sections present but only Reading + Checkpoint populated)

Stopping here gives the user the **honest accountability** layer of Phase 2: they can mark reading done and self-attest checkpoint items. Speed map / benchmarks / drills are still notebook-based.

### V2 — Reference data tools (~3 hours)
- Speed map editor (Team tab accordion)
- Defensive benchmarks editor (Team tab accordion)
- Markdown export includes speed map + benchmarks

This is the **structured-data** layer. After V2, the speed map and benchmarks live in the same backup as the rest of the log.

### V3 — Drill log tools (~3 hours)
- Prediction drill log (per-game per-turn tracker)
- Replay drill log (weekly entries)
- New game-logger Phase 2 tags section
- Markdown export includes drill data + Phase 2 tags
- AI prompt Mode C (Phase 2 readiness audit)

After V3, the AI can give Phase 2 readiness reviews and the per-game Phase 2 habits are tracked.

**Total estimate: ~9 hours, splittable. V1 is the minimum to feel "I'm tracking Phase 2."** V2 is where the team-reference value lives. V3 is the drill/habit layer.

---

## Acceptance criteria (V1+V2+V3 combined)

The build is complete when:

- [ ] Schema v2→v3 migration runs silently on first load; existing Phase 1 data is untouched.
- [ ] Reading progress: 6 toggles work, dates auto-stamp, notes save, "mark all read" button works.
- [ ] Phase 2 checkpoint: 6 items, evidence textareas force-required on "pass," summary line updates live, "Ready for Phase 3" banner appears at 4/6 passed.
- [ ] Speed map editor: 6 rows visible from the team, base speed + free-text fields save, "Add mon from team" works, computed snapshot updates.
- [ ] Defensive benchmarks editor: per-mon attacker tables save and edit correctly.
- [ ] Phase 2 progress dashboard card: shows live counts that match underlying data, click navigates to Drills tab.
- [ ] Prediction drill log: link to existing game, per-turn entries save, summary auto-computes, pass-fail badge correct.
- [ ] Replay drill log: form saves, list view shows past entries.
- [ ] Game logger: Phase 2 tags section collapsed by default, fully saves when expanded.
- [ ] Markdown export includes a new "Phase 2" section with speed map, benchmarks, drill stats, checkpoint state.
- [ ] AI prompt: Mode A / Mode B unchanged, Mode C section added with triggers.
- [ ] All UI follows existing Pokémon-cheerful palette.
- [ ] Mobile responsive (Phase 2 forms work on phone).
- [ ] No third-party network requests (verifiable in DevTools).

---

## What this plan deliberately does NOT include

Same scope-creep guards as Phase 1:

- ❌ Auto-fill speed map from a stored mon-speed database (would need offline data; skip until requested)
- ❌ Auto-fetch top-attacker list from Pikalytics (their site isn't a friendly API; skip)
- ❌ Markdown-rendered text inside modals (still plain text with line breaks)
- ❌ Multi-team support (still one current team)
- ❌ Game-by-game speed-map snapshots (single snapshot per team only)
- ❌ Damage calc integration (calc is still pikalytics.com/calc — we just log the results)
- ❌ Cross-device sync (still manual export/import)
- ❌ Auto-detection of game phase (user is in Phase 2 because they say they are; no enforced gates)

These are explicit non-goals. If a future need surfaces, we re-plan.

---

## Open decisions (need your call before code starts)

1. **Build all of V1+V2+V3, or ship V1 first and decide?** My rec: **build V1+V2 together as one commit, then V3 as a second commit.** V1 alone leaves the user without the team-reference value, which is the biggest single payoff of the Phase 2 tool. V2 adds it. V3 is more incremental.

2. **Single new "Drills" tab vs. spreading across existing tabs?** My rec: **single Drills tab.** Keeps Phase 2 work mentally grouped; Team-reference data (speed map, benchmarks) reasonably lives under Team tab; Drills tab holds the activity-based content. Open to one consolidated Phase 2 tab if you prefer fewer tabs.

3. **Phase 2 tags in game logger — collapsed by default forever, or auto-expand once the user has started Phase 2?** My rec: **collapsed by default; remember the user's expand/collapse state across sessions.** Phase 1-only users never see it; Phase 2 users expand once and it stays expanded.

4. **Checkpoint evidence textareas: required to mark "passed"?** My rec: **yes, required.** This is the whole point — force you to articulate the skill, not just tick a box. Saving with empty evidence flips back to "untested."

5. **Markdown export: include `phase2` data always, or only if non-empty?** My rec: **only if non-empty.** Phase 1-only users shouldn't have a 50-line "Phase 2: empty" section in their AI exports.

6. **AI prompt Mode C: build alongside V3, or defer to a V4?** My rec: **alongside V3.** The drill data exists, the AI should review it. Defer adds friction.

If you accept all 6 recommendations, I'll start with V1+V2 (~6 hours), commit, push, then V3 + Mode C (~3 hours) as a follow-up.

---

## How this connects to your actual training right now

Your immediate next 10–15 games will live in:

- **Reading progress card** (mark off each of the 6 pages as you read them this week)
- **Speed map editor** (~30 min one-time fill, then reference during games)
- **Defensive benchmarks editor** (~45 min one-time fill)
- **Game logger Phase 2 tags** (~10 extra seconds per game)
- **Prediction drill log** (only for the 5 games you formally hard-test on)
- **Checkpoint card** (you'll fill this at the end of Phase 2, not at the start)

The dashboard's Phase 2 progress card is the at-a-glance "where am I in Phase 2?" answer. The training plan's "When you plateau" diagnostic is unchanged — you still hit Mode A on the AI every 10 games. The new piece is that the export now contains structured Phase 2 data, so the AI can audit your speed map and benchmarks too, not just your game logs.
