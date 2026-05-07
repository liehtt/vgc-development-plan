# Recording Tool — Design Plan

A plan for adding a personal game-logging / journaling layer to the existing training-plan website. **Design only. Implementation after this is reviewed and approved.**

---

## Why this is needed

The training plan repeatedly asks the user to record things across sessions:

- **Per game**: pre-game protocol (5 fields), pivotal turn, error type, lesson, replay link, Tera intent + audit
- **Per team**: relative speed map, Core/Solvers/Enablers tagging, win condition, modes
- **Per format**: top-20 meta mon cards (moves/items/role)
- **Per week**: Victory Road archetype drift
- **Per iteration**: single-variable swap log (rationale + games-tested + result)
- **On plateau**: bucket last 10 losses into 3 buckets (preview / reads / construction)

Right now the plan tells the user to "open a notes file." That works in theory but in practice means most of the journaling never happens — friction kills it. A purpose-built logger reduces per-game logging to ~30 seconds and makes the dashboards (error distribution, plateau diagnostic) computable instead of manual.

---

## Hard constraints (these shape every decision below)

1. **Static site, no server.** GitHub Pages serves only HTML/CSS/JS. No databases, no backends, no auth services.
2. **Publicly hosted, possibly multi-user.** Other people may stumble on the site. Their data must not commingle with the user's, and vice versa.
3. **Hobbyist-paced.** The user has a job; logging must be sub-30-seconds per game or it gets skipped.
4. **No third-party signups.** Don't push the user toward Firebase / Supabase / Google accounts. Adds friction and fragility.
5. **Future-proof.** Plan must survive Pokémon format changes, since the user's goal is multi-format.

---

## Architecture choice: client-only + browser localStorage

**The recommendation: every user's data lives entirely in their own browser via `localStorage`. Nothing leaves their machine unless they manually export.**

Why this works for the constraints:

| Concern | How localStorage handles it |
|---|---|
| "Other people might use the site" | localStorage is **per-domain per-browser per-device**. Their data is automatically isolated from yours. There is no shared store; every visitor effectively has their own private database. |
| "No backend allowed" | No backend needed. JS reads/writes a single key in the browser. |
| "No accounts" | None required. The browser *is* the account. |
| "Privacy" | Data never travels over the network. No analytics, no tracking, no third parties. |
| "Recoverable" | One-click "Export to JSON file" downloads everything. One-click "Import" restores from a JSON file. |

### Trade-offs (call them out, don't hide them)

- **Cleared cache → data lost.** Mitigated by encouraging weekly export.
- **Per-browser only.** If the user wants the data on phone + laptop, they need to export/import manually (or use the optional Gist-sync described in V4 below).
- **Storage limit** ~5–10 MB per origin. Plenty for hundreds of game logs (~1 KB each), but not for replay video files.
- **No automatic backup.** A "remind me to export" nudge in the UI handles this.

### Privacy disclosure for other visitors

A small banner on the log page should say something like:
> *Everything you log here stays in your browser. It never leaves your device. If you clear your browser data, the log is gone — export to JSON regularly. If you're on a shared computer, export and clear when done.*

---

## Data model (the JSON that lives in localStorage)

One top-level key, one JSON blob. Versioned for future migrations.

```json
{
  "schemaVersion": 1,
  "settings": {
    "currentTeamId": "team-2026-05-01",
    "lastExportedAt": "2026-05-04T18:00:00Z"
  },
  "teams": [
    {
      "id": "team-2026-05-01",
      "name": "Borrowed: WolfeyVGC May 2026",
      "source": "https://www.youtube.com/watch?v=...",
      "format": "VGC 2026 Reg X",
      "createdAt": "2026-05-01",
      "winCondition": "Tailwind + double-target their TR setter before turn 4",
      "core": ["MonA", "MonB"],
      "solvers": ["MonC"],
      "enablers": ["MonD", "MonE"],
      "sixthSlot": "MonF",
      "speedMap": [
        {
          "mon": "MonA",
          "baseSpeed": 95,
          "atTailwind": 190,
          "atScarf": null,
          "outspeeds": ["X", "Y"],
          "outspeedBy": ["Z"]
        }
      ],
      "modes": ["Mode 1: lead AB for tempo", "Mode 2: lead CE vs slow teams"],
      "knownWeakArchetypes": ["Hard TR with 2 setters", "Sun"]
    }
  ],
  "games": [
    {
      "id": "g-uuid-1",
      "playedAt": "2026-05-04T20:30:00Z",
      "teamId": "team-2026-05-01",
      "format": "VGC 2026 Reg X",
      "result": "L",
      "ladderRating": 1247,
      "preGame": {
        "myWinCondition": "Get TW up T1, double-target their Calyrex",
        "theirWinCondition": "TR turn 1 with Indeedee + Armarouge",
        "myLead": ["MonA", "MonD"],
        "theirLead": ["Indeedee-F", "Armarouge"],
        "myFour": ["MonA", "MonB", "MonD", "MonE"]
      },
      "replayUrl": "https://replay.pokemonshowdown.com/...",
      "pivotalTurn": 4,
      "boardStateAtPivotal": "neutral",
      "errorType": "planning",
      "errorTypeDetail": "Didn't have a plan for if TR went up turn 1",
      "lesson": "Always pre-decide the TR-up branch before turn 1",
      "teraUsed": true,
      "teraIntent": "defensive",
      "teraAudit": "too-late",
      "tags": ["TR-matchup", "lead-mistake"]
    }
  ],
  "metaCards": [
    {
      "mon": "Iron Hands",
      "format": "VGC 2026 Reg X",
      "topMoves": ["Drain Punch", "Wild Charge", "Fake Out", "Heavy Slam"],
      "topItems": ["Assault Vest", "Sitrus Berry"],
      "role": "Bulky physical attacker / Fake Out support",
      "weirdTech": "Sometimes runs Belly Drum + Salac Berry",
      "updatedAt": "2026-05-03"
    }
  ],
  "weeklyMetaNotes": [
    {
      "weekOf": "2026-05-04",
      "winningArchetypes": ["Standard Calyrex-S", "Miraidon HO"],
      "trendObserved": "Tornadus support rising",
      "myWeeklyGameCount": 6,
      "myWeeklyWR": 0.5,
      "notes": "Faced 3 sun teams this week, prep for it"
    }
  ],
  "iterationLog": [
    {
      "id": "iter-1",
      "date": "2026-05-10",
      "teamId": "team-2026-05-01",
      "swap": "Out: MonF, In: MonG",
      "category": "solver",
      "rationale": "MonF couldn't handle the rising sun trend",
      "gamesAfter": 12,
      "winRateBefore": 0.42,
      "winRateAfter": 0.58,
      "decision": "kept"
    }
  ]
}
```

**Why this shape:** every entity in the plan maps to exactly one collection (teams, games, metaCards, weeklyMetaNotes, iterationLog). All linked by `teamId`. The plan's phase checkpoints can be answered programmatically — e.g., "name your top 3 error types" = `groupBy(games, errorType) order by count desc limit 3`.

---

## UI components / screens

Each is a self-contained card in the dashboard. Aim: every common action is ≤2 clicks from the dashboard home.

### 1. Dashboard (home)
Default view. Shows:
- Current team name + 1-line win condition + W/L last 10 games
- Quick-action buttons: **Log a game** (most-used), **New iteration**, **Weekly meta note**
- Stats strip: total games this week, W/L, error-type distribution sparkline
- Plateau alert banner (only shown if conditions met — see #6)
- Reminder strip: "It's been 9 days since last export. [Export now]"

### 2. Game logger (the most-used screen)
A short form with the plan's pre-game protocol fields + post-game fields. ~30 sec to fill.

Pre-game (filled at team preview):
- My win condition (1 sentence, free text)
- Their win condition (1 sentence, free text)
- My lead (2 dropdowns from current team's mons)
- Their lead (2 free-text or dropdowns from a "seen mons" autocomplete)
- My 4 (4 dropdowns from current team)

Post-game (filled after match):
- Result: W / L (radio)
- Replay URL (paste; auto-validate it looks like a Showdown replay link)
- Pivotal turn (number)
- Board state at pivotal turn: Advantage / Neutral / Losing (radio)
- Error type: Knowledge / Positioning / Planning / None (radio)
- Lesson (1 sentence)
- Tera used? Y/N → if Y: intent (Off/Def/Tempo) + audit (good/early/late/misused)

Save button writes to localStorage and bumps the dashboard counters.

**Friction features**: form remembers your team between sessions; result auto-fills from URL parsing if the user pastes a Showdown replay link with `_w` or `_l` patterns; lead dropdowns are pre-populated from current team.

### 3. Team profile manager
- List of teams (with create/clone/archive)
- Per team: name + source link + format + intent + Core/Solvers/Enablers tagging + win condition
- Speed map editor: row per mon, columns for base/scarf/tailwind/comments, "outspeeds" and "outspeedBy" lists
- "Set as current" button (so the game logger uses this team's mons)

### 4. Meta knowledge cards
- Top-20 grid for current format
- Per card: mon, top 4 moves, top 2 items, role, weird tech, last-updated date
- "Stale" warning if `updatedAt` is >30 days old

### 5. Weekly meta notes
- Simple list view, one entry per week
- Form: winning archetypes (multi-tag), one-line trend, my weekly game count + WR (auto-computed from `games` collection)
- Past entries collapsed by default

### 6. Plateau diagnostic
- Triggered manually, OR auto-suggested if: rating change in last 4 weeks is <±50 AND game count >30
- Pulls **last 10 losses**, counts errorTypes, displays as a 3-bucket bar chart (Knowledge / Positioning / Planning) — but per Brady Smith's framework, also re-buckets via heuristic into Team-preview / Reads / Construction
- Surfaces the dominant bucket with a "Most likely fix:" banner that links to the relevant phase in the plan
- Saves the diagnostic snapshot so the user can compare next time

### 7. Iteration log
- Table view of all swaps, columns: date / team / swap / category / WR before / WR after / decision
- "New iteration" button opens a form
- Auto-computes WR-before / WR-after from `games` collection (date-bounded)

### 8. Export / Import
- **Export** button: downloads `vgc-log-YYYY-MM-DD.json`
- **Import** button: file picker, merges-or-replaces (with a "are you sure" if replace would delete existing data)
- Auto-prompt to export if `lastExportedAt` is >7 days old

---

## Integration with the existing training plan

The recording tool is an *augmentation* of the plan, not a replacement. People should be able to use the plan without ever touching the recorder.

Concrete integration points:

1. **New top-level page**: `docs/log.html` — the dashboard described above.
2. **New header nav link**: `📊 My log` → `log.html`. Goes between "Training plan" and "Article library."
3. **Inline "Log a game" buttons** in the plan, placed where the plan tells the user to record. Specifically:
   - In Phase 1, near "After every loss…": a button that opens the game logger pre-filled.
   - In Phase 2, near the relative speed map exercise: a button that jumps to the team profile speed map editor.
   - In Phase 3, near the Tera audit checkpoint: a button to view your last 5 Tera audits in a list.
   - In the "When you plateau" section: a button "Run plateau diagnostic" that opens the plateau view.
4. **Read-only mode for non-loggers**: people who never click "Log a game" never see anything change — the plan reads exactly as it does today.

The integration uses progressive enhancement: links work without JS (they go to log.html which says "you have no data yet, want to start?"), with JS the buttons can pre-populate forms.

---

## Phased build (so you can ship value fast and stop early)

Each phase delivers a usable product. You can stop after any of them and the plan is still better off than today.

### V0 — Markdown receipt (1–2 hours)
**Scope**: the game logger form *only*, with no persistence. Output is a markdown block the user copies into their own notes app (Obsidian, Notion, Apple Notes, whatever).

**Why ship this first**: gets a usable artifact in front of the user in one session, validates the form fields are right, and works for users who already have a notes system they like.

### V1 — localStorage MVP (4–6 hours)
- Persist games + current team in localStorage
- Game logger fully wired
- Dashboard home with W/L last 10 + error-type counts
- Export / Import JSON

This is the smallest version that's actually *useful*. Plateau diagnostic, team manager, meta cards, etc. are all V2+.

### V2 — Team profiles + plateau diagnostic (3–4 hours)
- Team profile manager (full CRUD)
- Speed map editor
- Plateau diagnostic auto-bucketization
- Inline plan integration (the buttons described above)

This is the version that fulfills the plan's promises end-to-end.

### V3 — Meta cards + iteration log + weekly notes (3–4 hours)
- The remaining components (#4, #5, #7 above)
- Stale-card warnings
- WR-before/after auto-compute on iterations

### V4 — Optional GitHub Gist sync (advanced, 4–6 hours)
For users who want cross-device sync without leaving GitHub. The user generates a personal access token, the app stores their log as a private Gist, syncs on open/save. **Skip unless explicitly requested** — adds significant complexity.

**Total estimate**: V1 alone is ~half a day. Full V1+V2+V3 is ~2 weekends.

---

## Privacy story (what to put on the log page)

A short, plain banner on `log.html`:

> **Your log lives only in your browser.** This site has no server — everything you record is stored in your browser's localStorage and never leaves your device. Other visitors to this site have their own separate logs in their own browsers; your data is invisible to them. If you clear your browser data or use a different device, your log doesn't follow you automatically. **Export to JSON weekly** to keep a backup. The export button is in the top-right.

---

## Tech stack (when implementation starts)

- **No framework.** Vanilla JS + the existing CSS. The site is small enough that React/Vue would be overkill and would balloon the bundle.
- **One JS file**: `docs/app.js`. Hand-written ES2020.
- **One additional CSS file**: `docs/app.css` for the new UI components, importing variables from existing `style.css`.
- **One new HTML page**: `docs/log.html`.
- **No build step.** All vanilla. Convert.py just copies app.js + app.css if needed.
- **Form validation**: native HTML5 (`required`, `pattern`, `type="url"`).
- **Charts**: small inline SVG sparklines and bar charts, no Chart.js dependency.
- **Date handling**: native `Date` + `Intl.DateTimeFormat`.

The convert.py script needs no changes for V0/V1 — the new HTML/JS/CSS files are static and don't need markdown processing.

---

## Open decisions (please answer before I implement anything)

1. **Phase to ship first**: V0 (markdown copy-paste, fastest), V1 (localStorage MVP, most value), or skip ahead to V2 (full feature)? **Recommendation: V1.**
2. **Design**: should it use the existing Pokémon-cheerful palette (red header, cream background, etc.) or a more "tool-like" minimal palette? **Recommendation: same palette for cohesion.**
3. **Mobile-first?** You mentioned hobbyist with a job — will you log games on phone after a Showdown match, or always on desktop? **Recommendation: design for desktop primary, phone secondary** (since logging happens after a Showdown match, which is desktop).
4. **Replay link auto-parse**: should pasting a Showdown replay URL auto-extract format / result / opponent? **Recommendation: yes for V1**, since it removes 3 form fields.
5. **Multi-team in V1**: should V1 support more than one team, or just "current team" with no historical teams? **Recommendation: V1 has one current team only, V2 adds team CRUD.** Iteration log in V2 handles "I changed my team" anyway.
6. **Should this plan doc be added to the website?** Currently it's only in `src/`. Could convert to HTML and add a `🛠️ Tool plan` link in the header. **Recommendation: keep it as `src/`-only for now**; once V1 ships, retire this doc.

---

## What "done with V1" looks like (acceptance criteria)

- [ ] User opens `log.html` from the header nav, sees a dashboard.
- [ ] User can log a game in <30 seconds: 5 pre-game fields + 5 post-game fields, save.
- [ ] Dashboard shows last-10-games W/L and error-type distribution.
- [ ] User can export everything to JSON. Closes browser, opens fresh, imports JSON, sees all data restored.
- [ ] Visiting the site in a different browser shows zero data (proves isolation).
- [ ] Privacy banner is visible on first visit.
- [ ] No third-party network requests (verifiable with browser devtools).

When all six are checked, V1 ships.
