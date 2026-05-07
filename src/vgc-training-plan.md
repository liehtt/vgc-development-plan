# VGC Training Plan: Noob → Ladder Competent

**Built from:** the full text of [vgcguide.com](https://www.vgcguide.com/) (Wolfe Glick, Aaron "Cybertron" Zheng, Aaron Traylor), plus principles pulled from interviews with Wolfe Glick, tournament reports from Markus "13Yoshi37" Stadter (3rd place 2016 Worlds, multiple regional champion), and content from VGC Corner / Brady Smith. Where any external source contradicts the local plan, the local plan wins by design (the user's goal is *ladder competence as a hobbyist*, not tournament play).

**Target outcome:** stable at **1400–1600 ELO** on Pokémon Showdown. Per Traylor, this is the bracket where games "make me think seriously" and represent tournament-quality practice. Beyond this is a steeper, more time-hungry climb you don't need.

**Not the goal:** Worlds, tournament play, regionals, top 100 ladder. If that ever changes, this plan is still a valid foundation — but the burnout-aware pacing here is sized for someone with a job who treats this as a hobby.

---

## How to use this document

- **Phases are ordered, not deadlined.** Move to the next phase when you pass that phase's checkpoint, not when a calendar tells you to.
- **Each phase has a *checkpoint*** — a self-administered test of *understanding*, not memorization. If you can't pass it honestly, the issue isn't grit — you skipped a concept. Loop back.
- **Skip what you already know.** If a phase says "read X" and you already understand X, skim and move on. The point is the *checkpoint*, not the reading.
- **Format-agnostic.** No specific Pokémon are named as "must use." Concepts here apply to any future VGC ruleset.
- **Time budget is yours.** Suggested cadences are written for ~3–5 hours/week. Halving it just means phases take ~2x longer, which is fine.

### Mental anchor: process over outcome

Before any tactics, this is the philosophical frame the entire plan is built on. It comes from **Wolfe Glick** (2016 World Champion) when asked the single most important factor for VGC success — his answer was *mentality*, not mechanics:

> "My goal is not to win the tournaments. My goal is to do my best. … If I win or I lose, to a certain extent that's out of my control. How well I do and how well I feel I did relative to my best — that's in my control."  
> — Wolfe Glick ([source](https://www.thegamer.com/wolfe-glick-reveals-what-it-takes-to-compete-in-pokemons-vgc-world-championships/))

Internalize the split: **outcome is partly out of your control; process is fully in your control.** A game where you played at your best and lost to a crit is a *successful* game by this measure. A game you won by gambling and getting lucky is a *failed* game. If you score yourself by outcome, variance will eventually break your motivation. If you score yourself by process — "did I follow my pre-game protocol; did I run the 3-question turn loop; did I review the loss?" — you keep improving regardless of the W/L column. Wolfe explicitly notes that "it's very easy for people to hit a plateau," and the way out isn't more games — it's better process.

### Burnout philosophy (read this once, then again when you feel it)

VGC has a brutal hidden cost: every loss is data and every win is also data. If you treat each loss as personal failure, you'll burn out at ~1300 and quit. Anti-burnout rules baked into this plan:

1. **A "session" ends after 3 games OR 1 hour, whichever is first.** Not "after the next win."
2. **Tilt protocol — stricter rule that overrides #1**: stop *immediately* after **3 consecutive losses**. No "just one more to break the streak." No frustration queueing. No revenge play. Tilt is a known phenomenon (Aaron Zheng's framing) and the next game played while tilted is statistically your worst. Walk away.
3. **Between-game reset**: when the next game starts, the previous one no longer exists. If you can't drop the previous game from your head, you're done for the session.
4. **You are allowed to skip a week.** Phases are not on a timer. The plan resumes exactly where you left off. The only rule: don't pause mid-checkpoint — finish the diagnostic so you actually know whether you passed.
5. **Score sessions by process, not result** (per Wolfe's frame above). At the end of each session ask: did I follow the protocol? Did I review losses? Did I avoid tilt-queueing? If yes, the session was successful, regardless of rating change.

### The error-type taxonomy (used throughout the plan)

When you log losses, classify the cause as one of three:

| Type | Description | Priority to address |
|---|---|---|
| **Knowledge gap** | Didn't know an interaction (move, ability, item, mechanic) | Low — fixes itself with exposure |
| **Positioning error** | Misplayed a known state (wrong target, bad switch, wrong Protect timing) | High — costs games at every level |
| **Planning failure** | No clear win condition; reactive play; lost the thread | Critical — invalidates all tactical skill |

You'll be classifying every loss this way starting in Phase 1. This taxonomy matters because the *fix is different per type*: knowledge gaps go away with games played; positioning errors go away with replay review; planning failures go away with team-preview discipline. Treating them all as "I played bad" wastes the fix.

---

## Your starting profile (as confirmed)

You **do** know: type chart, IVs/EVs, natures, abilities, weakness mechanics, Pokémon Showdown navigation, single-battle play.

You **don't yet** know: speed control, positioning, doubles-specific move math (spread damage), Protect timing, Fake Out tempo, redirection, team preview reading, replay analysis, post-battle self-critique.

The plan is built around that gap. Phase 1 covers the "everything you used to do in singles, that no longer works" gulf.

---

## Phase 0 — Pre-flight (1 week, ~2 hours total)

Goal: set up the environment + adopt the right baseline mindset before you press a single button.

**Do:**

1. Make a Pokémon Showdown account. Find the current VGC ladder (will be named after the current format, e.g. "VGC 2026 Reg X").
2. **Don't ladder yet.** Watch 2–3 recent VGC tournament finals on YouTube (search "VGC [current year] regional finals"). Don't try to understand. Just watch health bars, KO counts, and the announcer's analysis flowing past you.
3. Read these vgcguide.com pages, in this order:
   - [Preface](https://www.vgcguide.com/preface) — sets expectations.
   - [Coming from single battles](https://www.vgcguide.com/coming-from-single-battles) — the most important page for you specifically.
   - [Everyone is learning all the time](https://www.vgcguide.com/everyone-is-learning-all-the-time) — anti-perfectionism inoculation.
   - [Competitive Pokémon is less luck than you think](https://www.vgcguide.com/competitive-pokemon-is-less-luck-than-you-think) — sets the loss-attribution framing.
4. Bookmark these tools (you'll use them constantly later):
   - [Pikalytics](https://pikalytics.com) — usage stats by format.
   - [Pikalytics damage calc](https://pikalytics.com/calc) — for "would this OHKO?" questions.
   - [Victory Road](https://victoryroadvgc.com) — tournament results, archetype tracking.

**Checkpoint 0 (be honest with yourself):**

- [ ] Can you, in one sentence, describe what changes about offense when you go from singles to doubles? *(Expected: spread moves do 75%, double-targeting wins games, single counters aren't enough because partners can support.)*
- [ ] Do you accept that "luck is a skill"? Concretely: when you next lose to a crit, will you ask "did I leave my mon at a HP range where their crit mattered?" instead of "RNG fucked me"?

If yes to both, advance.

---

## Phase 1 — Baseline diagnostic + pilot don't build (3–5 weeks)

Goal: (a) discover *your specific* error patterns by playing 10 honestly-logged baseline games before doing anything else, then (b) get the doubles "feel" by playing real games on a real team you didn't build. Most of your improvement here is unlearning singles habits.

**Why baseline first:** every plan that prescribes the same fix to every player is wrong on average. By logging 10 games, you discover whether your bottleneck is knowledge gaps (read more), positioning errors (review more replays), or planning failures (slow down at team preview) — and the rest of this phase weighs accordingly.

**Why pilot, not build:** quoting the guide directly — *"you can't play competitive Pokémon without battling, but you can play without building."* Building a team simultaneously with learning to battle compounds the difficulty. With a borrowed team, when you lose, you can isolate: was that bad play, or bad team? You can't do that with your own creation yet.

**Do:**

1. **Pick a borrowed team.** Sources:
   - [VGC Pastes](https://docs.google.com/spreadsheets/d/1axlwmzPA49rYkqXh7zHvAtSP-TKbM0ijGYBPRflLSWw/edit#gid=1678642469) — community archive.
   - Victory Road's recent tournament Top 8 lists.
   - Any well-known YouTube VGC creator (e.g. Wolfe Glick, Aaron Zheng) usually pastes their team in the description.

   Pick one with **author commentary** — the *why* matters more than the team. Avoid teams older than the current format.

2. **Reverse-engineer it before laddering.** Open a notes file and write:
   - What's the "core" — the 2–4 mons whose synergy defines the team?
   - What "modes" or lead pairs does the author intend?
   - For each mon, what threats is it on the team to handle? What's its win condition?
   - What 2 mons do you usually expect to leave on the bench? Against what opponents would you bring them instead?

   You're not memorizing the author's plays. You're recreating their *thought process*.

3. **Run the 10-game baseline.** Before optimizing anything, play 10 ladder Bo1 games on the borrowed team. For each game, log only three things in a doc:
   - **Key turn** — the turn where the game swung.
   - **Error type** — Knowledge gap / Positioning error / Planning failure (use the taxonomy above).
   - **One lesson** — a single sentence.

   At the end of 10 games, count error types. The top 2 categories are your bottleneck. **You can't proceed past Phase 1 until you can name your top 3 recurring error types.**

   [+ Log a baseline game →](log.html#new)

4. **Pre-game protocol — every game from now on, fill these in before turn 1** (verbally / mentally is fine, written is better for the first 30 games):
   - My win condition this game is: ___
   - Their win condition (best guess) is: ___
   - My lead: ___
   - Their likely lead: ___
   - The 4 mons I'm bringing: ___

   If you can't fill any line, you don't yet have a game plan — finish team preview before queueing the move.

5. **Turn loop — every turn, ask 3 questions before locking moves**:
   1. What is my win condition?
   2. Does this turn's planned move *advance* it? (Not "does it look strong" — does it move me toward the WC?)
   3. What is my opponent's intent this turn?

   These three questions are the entire skill of doubles compressed. Most losses are "I forgot to ask question 1 and reflexively pressed a move that looked good."

6. **Read these vgcguide.com pages alongside playing:**
   - [How to use someone else's team](https://www.vgcguide.com/how-to-use-someone-elses-team) → [`pages/how-to-use-someone-elses-team.md`](pages/how-to-use-someone-elses-team.md)
   - [Speed control](https://www.vgcguide.com/speed-control) → [`pages/speed-control.md`](pages/speed-control.md) — the most concept-dense page for you.
   - [Protect](https://www.vgcguide.com/protect) → [`pages/protect.md`](pages/protect.md) and [Protect in battle](https://www.vgcguide.com/protect-in-battle) → [`pages/protect-in-battle.md`](pages/protect-in-battle.md).
   - [Utility moves](https://www.vgcguide.com/utility-moves) → [`pages/utility-moves.md`](pages/utility-moves.md) — the doubles vocabulary list.

7. **Ladder cadence: 2 sessions/week, 3 games per session.** ~6 games/week. Don't push past it for the first month, even if you're enjoying it. (If you have unusually high tolerance and want to grind harder, the upper end is ~40-60 games over Phase 1 total — but if you're hitting that, you should also be hitting checkpoint 1 sooner.)

8. **After every loss** (not "every game" — losses), before queuing again: open the replay (Showdown auto-saves on the battle screen — click "Save replay"). Watch the **last 3 turns**. Add to your log: Key turn / Error type / One lesson. 5 minutes max.

   [+ Log this game →](log.html#new)

**Checkpoint 1** (don't skip — this is the "did I really learn doubles?" gate):

- [ ] **Top 3 error types named.** From your 10-game baseline + Phase 1 logs, you can name your 3 most frequent error types. (e.g. "Planning failure: I keep entering games without a win condition" or "Positioning: I'm spamming Protect on the wrong mon.")
- [ ] **Spread damage check:** without a calculator, name 3 spread moves and explain why they hit harder in singles than doubles. *(Expected: spread moves are 0.75x in doubles when they hit 2 targets. Heat Wave, Earthquake, Rock Slide, Dazzling Gleam, Surf, etc.)*
- [ ] **Speed control inventory:** for your borrowed team, name your team's speed control method(s) and at least 2 ways an opponent could shut yours off.
- [ ] **Protect discrimination:** name 3 situations where pressing Protect is wrong even though you'd reflexively want to. *(Expected examples: when partner already covers the threat regardless; when opponent's only good play is to switch and Protect lets them do it free; consecutive Protect at ⅓ success rate; when you're slow and Protect doesn't change next turn's state.)*
- [ ] **Replay habit:** can you point to your last loss replay and identify the *pivotal turn* — not the last turn, but the turn where you lost the game-state lead?
- [ ] **Hard test — opponent prediction**: open a fresh ladder game. At team preview, write down (a) which 4 of their 6 you predict they'll bring, (b) their lead pair, (c) your win condition. After the game, score yourself: 4-of-4 right is a pass. 2-of-4 = back to Phase 1, more games.
- [ ] **Tilt test:** in your last 5 sessions, did you ever queue after 3 consecutive losses? If yes, the protocol isn't sticking. Cap it before advancing.

If you fail any checkpoint, the issue is concrete. Failed spread damage = re-read singles→doubles + watch one more tournament with the doubles math in mind. Failed Protect discrimination = re-read /protect-in-battle and pay attention to your next 5 Protect calls in replays. Failed prediction = your knowledge base is the gap; advance to Phase 2 anyway, since Phase 2 directly addresses it.

---

## Phase 2 — Information compression: speed, damage, positioning (4–6 weeks)

Goal: stop reacting, start anticipating. By the end of this phase, you should be choosing moves based on *what board state you want next turn*, not *what feels safe this turn*.

**Core principle for this phase: Position > Damage.** A weaker move that puts you in a winning position next turn beats a stronger move that leaves the board state unchanged. If you can't say *why* a move advances your position, don't press it.

**Why this phase is long:** speed control is the single highest-leverage skill in doubles. Wolfe Glick's framing: attacking before your opponent isn't an advantage, it's *the* advantage — if you KO their mon before it acts, their move never executes. The same is true in reverse. Your entire decision-making until now has been singles-style "I have a turn, what's my best move?" In doubles it becomes "given the speed order, what 2 of my possible 4 moves correlate to win states?"

**Do:**

1. **Read these pages:**
   - [What is pressure](https://www.vgcguide.com/what-is-pressure) → [`pages/what-is-pressure.md`](pages/what-is-pressure.md) — the missing word for what you've been feeling.
   - [Trick Room](https://www.vgcguide.com/trick-room) → [`pages/trick-room.md`](pages/trick-room.md) and [Battling against Trick Room](https://www.vgcguide.com/battling-against-trick-room) → [`pages/battling-against-trick-room.md`](pages/battling-against-trick-room.md).
   - [Switching](https://www.vgcguide.com/switching) → [`pages/switching.md`](pages/switching.md).
   - [1 HP is infinitely more than 0 HP](https://www.vgcguide.com/1-hp-is-infinitely-more-than-0-hp) → [`pages/1-hp-is-infinitely-more-than-0-hp.md`](pages/1-hp-is-infinitely-more-than-0-hp.md) — kills the singles instinct to write off chip-damaged mons.
   - [Items](https://www.vgcguide.com/items) → [`pages/items.md`](pages/items.md) — by now you should care.

2. **Build the relative speed map for your team.** Open a doc, list each of your 6 mons. For each, write three numbers:
   - Their actual speed stat (look it up).
   - What they outspeed at base speed (in the current meta — what common mon's speed do you sit just above?).
   - What they outspeed *under your team's speed control* (Tailwind doubles, Trick Room reverses, Choice Scarf 1.5x).

   Then list the **inverse**: what common meta mons outspeed your fastest mon? At +0? Under their Tailwind / Choice Scarf? This is a 30-minute exercise that pays back over hundreds of games. Update it any time you swap a team member.

3. **Upgrade your damage-calc framing.** Most beginners ask "Can I KO?" The better question is **"What does it take to survive their key threats?"** Use the [Pikalytics calc](https://pikalytics.com/calc) to answer, for each of your defensive mons:
   - Can it survive the strongest realistic hit from the meta's top 5 attackers? (At full HP, at 75%, at 50%?)
   - If not, what item / EV change would push it to "lives one hit"?

   The shift is from offensive math to **survival benchmarks**. Surviving one extra turn unlocks all your other plays.

4. **Make the damage calculator a habit, not a one-off design tool.** Pros use the calc *during* their workflow, not just before tournaments. The pattern:
   - **Before a session**: spend ~5 minutes pulling the top 3–5 likely opponent attackers from [Pikalytics usage stats](https://pikalytics.com), and on the calc check what they do to your team. You should *know*, not guess.
   - **Pre-game (team preview)**: when you see their 6, mentally pre-compute "if their X clicks Y on my Z, am I in OHKO range?" for the threats that matter. The calc is the source of truth that turns this from guessing into instinct over a few weeks.
   - **Post-game** (review): if you were surprised by a damage roll, drop it into the calc immediately. You're calibrating your intuition.

   Useful tools beyond Pikalytics calc: [VGC Multi Calc](https://vgcmulticalc.com/) (calc multiple mons at once, important for spread moves), [Showdown's calc](https://calc.pokemonshowdown.com/), and [Pikalytics Speed Tiers](https://www.pikalytics.com) for cross-referencing speed benchmarks. The calc is the *middle* of your workflow, not a separate task.

5. **Run drill-style sessions** in addition to ladder games. Once a week, instead of laddering, do this:

   - Pick a tournament replay (VGC 2024+ on YouTube — many casters do "VGC analysis" content). Pause **before each turn** and write down what you'd do, then watch what the player did and *why the caster says it was right or wrong*.
   - Do this for 3 turns of one game per drill session. That's it. 15 minutes.

   This builds the "what should I have done" muscle that ladder play alone won't teach you, because on ladder you don't get an explanation.

6. **Force yourself onto a different archetype.** Switch your borrowed team for one of a different archetype — if you've been on Tailwind offense, try a Trick Room team. If you've been on balance, try hyper-offense. Two reasons:
   - You learn faster against your own habits when forced to play differently.
   - You'll learn what playing *against* your previous archetype is like.

7. **Ladder cadence: still ~2 sessions/week, 3 games each.** Resist the urge to grind. Quality of post-game review > volume.

8. **After every game (win OR loss), apply the [How to analyze a battle](https://www.vgcguide.com/how-to-analyze-a-battle) → [`pages/how-to-analyze-a-battle.md`](pages/how-to-analyze-a-battle.md) framework:**
   1. Pivotal turn?
   2. Suboptimal turns?
   3. Was mon selection right?
   4. Was lead matchup actually winnable?
   5. Was the matchup itself losing regardless?

   Spend 5 minutes max. Write 1–2 sentences in a notes doc. The doc accumulates over weeks — patterns emerge.

**Checkpoint 2:**

- [ ] **Pressure articulation:** define "pressure" in your own words and give an example from your last 3 games. *(Expected: it's the threat of proactive action — what your opponent is afraid you'll do this turn shapes their move.)*
- [ ] **Switch reasoning:** name the 4 reasons to switch (survival, positioning, field condition, resource preservation) and a real example you executed of each from your replays.
- [ ] **The "1 HP" test:** in your last 5 games, did you ever protect or sacrifice a low-HP mon strategically (re-trigger Intimidate, eat a hit, stall TR) instead of just bringing it back to die?
- [ ] **Speed-tier awareness:** for the borrowed team you're piloting, name the speed of your fastest mon at +0 and under your speed control. Without checking the calc.
- [ ] **Trick Room counterplay:** if you lead into a Trick Room team and TR goes up, name the next 4 turns you'd play to neutralize as much of it as possible. *(Expected: Protect both turn 1 of TR (uses turn 1), defensive switch / Fake Out / status (turn 2), pressure their setter so they can't re-set, etc.)*
- [ ] **Hard test — mid-game prediction**: in your next 5 ladder games, before you click your move on each turn, write down (a) what you predict the opp's move will be, and (b) the approximate damage range you expect their hit to do to your active mon. Pass = ≥3/5 games where prediction matched within 1 move and ≥1 turn per game where damage was within ~10% of expected.

If you can't honestly check 4 of 6, loop. Don't ladder more — *review* more. The bottleneck at this stage is almost never "more games."

---

## Phase 3 — Team preview + positioning + Tera discipline (4–6 weeks)

Goal: turn the 90-second team preview window from a vibes check into a structured analysis. By this phase's end you should be writing a 3-sentence game plan in your head before turn 1, and most of the time it should still be relevant by turn 5. You'll also start treating Tera as a *resource* with rules, not a panic button.

**Do:**

1. **Read:**
   - [Team preview](https://www.vgcguide.com/team-preview) → [`pages/team-preview.md`](pages/team-preview.md) — the single most important page.
   - [What is a game plan](https://www.vgcguide.com/what-is-a-game-plan) → [`pages/what-is-a-game-plan.md`](pages/what-is-a-game-plan.md).
   - [Analyzing your opponent's teams](https://www.vgcguide.com/analyzing-your-opponents-teams) → [`pages/analyzing-your-opponents-teams.md`](pages/analyzing-your-opponents-teams.md) — the 8-category checklist.
   - [Predictions](https://www.vgcguide.com/predictions) → [`pages/predictions.md`](pages/predictions.md) — when to read vs. when to play safe.
   - [Approaching best-of-1 vs. best-of-3](https://www.vgcguide.com/approaching-best-of-1-vs-best-of-3) → [`pages/approaching-best-of-1-vs-best-of-3.md`](pages/approaching-best-of-1-vs-best-of-3.md) — ladder is Bo1, so the surprise/tempo bias matters for you specifically.
   - [Worked example — Tansley vs Dunlop, Worlds 2017](https://www.vgcguide.com/battling-example-will-tansley-vs-nils-dunlop-worlds-2017) → [`pages/battling-example-will-tansley-vs-nils-dunlop-worlds-2017.md`](pages/battling-example-will-tansley-vs-nils-dunlop-worlds-2017.md) — read at least one battle example end-to-end during this phase.

2. **Adopt the team-preview ritual.** Every time the team preview screen loads:
   1. **20 seconds — opponent inventory.** Tag each of their 6 mons mentally: which is the offensive carry? what's their speed control? what pairs are obvious leads? is anyone a 1-vs-4 threat?
   2. **20 seconds — eliminate.** Pick the 2 of yours to bench. Reasons: weak typing into their team, redundant role, weak when separated, bad speed dynamic.
   3. **20 seconds — leads.** Anticipate their lead pair. Pick a lead that has a play vs. their 2 most likely lead combos.
   4. **30 seconds — game plan.** Write (in your head) one sentence: "I win this game by X." E.g. "I win by getting Tailwind up turn 1 then double-targeting their TR setter before they can set up." If you can't fill in the X, revisit.

   This sounds like a lot for 90 seconds. After ~2 weeks it becomes one fluid pass.

3. **Always re-check the obvious assumption** — the "Stadter rule." Markus Stadter, in his Bochum Regional winning report, describes a near-mistake: "when I saw the 6 Pokémon, I almost went autopilot into an anti-Trick Room mode, but a closer look on the open teamsheet revealed that they didn't run Trick Room." ([source](https://victoryroad.pro/2023/03/13/markus-stadter-bochum-report/)). The takeaway: **when an opponent's team *looks like* an archetype you've prepped for, take 5 extra seconds to confirm the moves/items are actually there.** Modern VGC tournaments use Open Team Sheets (you see everything); Showdown ladder shows only species. On ladder you can't fully verify, but you *can* note when something is missing — e.g. a "Trick Room team" with no sleep enabler probably can't actually set TR safely. The cost of pattern-matching wrong is enormous; the cost of double-checking is 5 seconds.

4. **Board state classification — every turn, name the state out loud (or mentally).** One of three:

   | State | Meaning | What you should do |
   |---|---|---|
   | **Advantage** | You have a clear path; opp is reacting to you | Don't gamble. Play the highest-EV safe move. |
   | **Neutral** | No clear lead; both sides have plays | Set up your win condition. Avoid 50/50 reads. |
   | **Losing** | Opp's plan is on rails; you're reacting | This is the only state where reads are correct. Play to maximize variance — this is when you predict. |

   The most common ladder mistake is making **read-heavy plays in advantage**, which converts free wins into coin flips. The reverse mistake is **playing it safe in losing states**, which guarantees a slow defeat. Naming the state forces the right behavior.

5. **Forced sequences — recognize them and use them.** Some board states have only one good move for one or both players. Examples:
   - Their slow setter is in front of your priority attacker → they're forced to Protect or switch.
   - You're at -1 mons with a Choice-locked sweeper → you're forced to either preserve it or give it up.
   - They have one mon that beats yours and it's in the back → they're forced to bring it.

   When *you* are forced, accept it and play the optimal forced line. When *they* are forced, you can predict with very high confidence — this is the cleanest read in doubles.

6. **Tera discipline (current Gen 9 mechanic).** Terastallization is once-per-game; treat it like a saved item. Before every game, decide what your Tera intent is. Every Tera press should be classifiable as one of:

   | Type | Purpose | Example |
   |---|---|---|
   | **Offensive** | Secure a KO that wouldn't happen otherwise | Tera-Fairy on Garchomp into a setup'd Dragon-Dance Roaring Moon |
   | **Defensive** | Survive an otherwise-lethal hit | Tera-Steel on Iron Hands to flip the matchup vs Flutter Mane |
   | **Tempo** | Flip the board's pressure dynamic (resist a STAB, redirect targeting, enable speed) | Tera-Water on Garchomp into rain to flip switch incentives |

   **Post-game Tera audit (after every game you Tera'd in):** ask
   - Did the Tera contribute to the *win condition* or just feel cool?
   - Was it **too early** (panic — used before threat materialized)?
   - **Too late** (greed — saved past the moment it would've mattered)?
   - **Misused** (right type, wrong target — Tera'd the mon that wasn't going to convert)?

   Common failure modes: **Tera-greed** (saving for "later" until the game ends without using it), **panic-Tera** (firing on turn 2 because you got scared), **win-more Tera** (Tera-ing while already winning — you spent the resource for nothing).

   Note: this framework generalizes to any future "big resource decision" mechanic — Mega Evolution, Z-moves, Dynamax all worked the same way. The mechanic name will change; the discipline doesn't.

7. **Replay analysis becomes the priority practice**, not laddering. Spend 50% of your VGC time watching pro replays and pausing before turns to predict, and 50% playing. Pros are: PokéStats Live, Wolfe Glick, Aaron Zheng, Cybertron, etc. on YouTube. (See "External resources" at the bottom of this doc for a curated list.)

8. **Ladder cadence: still 2 sessions/week max.** Now you might add a **review-only "session"** that's just rewatching your week's replays.

**Checkpoint 3:**

- [ ] **8-category opp analysis under 90 seconds.** Open a random Pokémon Showdown VGC replay. Pause at team preview. Verbally fill in the 8 categories: offensive threats, speed control, pace, speed benchmarks, type coverage, pairings, support:offense ratio, item distribution. Time yourself. Under 90s = pass.
- [ ] **Pre-turn game plan.** Before reading what happened, predict the player's first 3 turns. If you'd have played them within ~80% the same, pass.
- [ ] **Loss diagnostic without RNG-blame.** Pick your 3 most recent losses. For each, name the cause without using "I got unlucky" or "they crit." If you genuinely can't, re-read [Competitive Pokémon is less luck than you think](https://www.vgcguide.com/competitive-pokemon-is-less-luck-than-you-think) before continuing.
- [ ] **Bo1 instinct:** in your team-preview routine, are you biasing toward risk-averse leads and tempo plays, vs. calculated reads? *(Expected for ladder: yes — Bo1 punishes reads, rewards consistency and tempo.)*
- [ ] **Hard test — find the losing turn.** Pick a recent loss replay. Identify the *exact* turn where the game became unwinnable (not "where I lost", but the last turn where I had a winning line). Then write out the corrected sequence: the move set you should have made on that turn. If you can't, you don't yet see board state — more replay drills.
- [ ] **Tera audit — for your last 5 Tera presses**: classify each as Offensive / Defensive / Tempo. Then mark each as "good", "too early", "too late", or "misused" by the post-game audit questions. Pass = ≥3/5 "good" + you can name *why* the bad ones were bad.
- [ ] **Ladder rating reality check:** where are you sitting? At this point, 1100–1300 is normal-and-fine. If you're already 1300+ on ladder with this much review work, you're tracking ahead of schedule.

---

## Phase 4 — Knowledge base + meta literacy (rolling, ~4–6 weeks, overlaps Phase 3)

Goal: stop being surprised. By the end of this phase, when an opponent reveals a move/item, ~70% of the time it should be the one you already expected.

**Do:**

1. Read [Building up a knowledge base](https://www.vgcguide.com/building-up-a-knowledge-base) and [Metagame](https://www.vgcguide.com/metagame).

2. **Make a personal "top 20" doc.** For the current format, list the 20 most-used non-restricted Pokémon (Pikalytics will tell you). For each:
   - Top 4 moves (>25% usage)
   - Top 2 items (>10% usage)
   - Typical role (carry / support / utility / pivot)
   - One "weird tech" set people occasionally run

   Don't try to do this in one sitting. 2 mons per week. After 10 weeks you have the entire core meta in your head, *and* you've seen each of them appear on ladder enough that the doc is grounded in real games.

3. **Once a week (15 min), check Victory Road.** Look at Top 8 from the last weekend's regional. Note: which archetypes won? Anything new? Cross-reference to your top 20 doc — anything spiking that you don't have notes on yet?

4. Read these supporting pages as you go:
   - [Context pt 1](https://www.vgcguide.com/context-pt1) and [Context pt 2](https://www.vgcguide.com/context-pt2)
   - [Typing](https://www.vgcguide.com/typing)
   - [Synergy](https://www.vgcguide.com/synergy)
   - [Cores and modes](https://www.vgcguide.com/cores-and-modes)
   - [Archetypes](https://www.vgcguide.com/archetypes)

**Checkpoint 4:**

- [ ] **Cold-call test:** randomly pick a meta Pokémon from Pikalytics' top 20. Write its top 4 moves and top 2 items from memory. Then check. Pass = ≥3/4 moves and ≥1/2 items right on average across 5 trials.
- [ ] **Lead prediction:** before the next 5 ladder games, write down what you predict their lead pair will be after team preview. Pass = right or near-right ≥3/5.
- [ ] **Archetype tagging:** your last 10 wins and 10 losses — can you name the archetype of each opponent's team? If half of them are "I dunno, balance?", more meta study.

---

## Phase 5 — Controlled teambuilding (4–8 weeks)

Goal: graduate from piloting to building, with a clear structural framework and one-variable-at-a-time iteration.

**Why now and not earlier:** without Phases 1–4 in your bones, your first team will fail in ways you can't diagnose, and the failure will demoralize you. With them, you can iterate intelligently.

**Do:**

1. **Read:**
   - [Teambuilding introduction](https://www.vgcguide.com/teambuilding-introduction) → [`pages/teambuilding-introduction.md`](pages/teambuilding-introduction.md)
   - [Intent](https://www.vgcguide.com/intent) → [`pages/intent.md`](pages/intent.md)
   - [What makes a Pokémon good](https://www.vgcguide.com/what-makes-a-pokemon-good) → [`pages/what-makes-a-pokemon-good.md`](pages/what-makes-a-pokemon-good.md)
   - [Consistency](https://www.vgcguide.com/consistency) → [`pages/consistency.md`](pages/consistency.md)
   - [Your team determines your luck](https://www.vgcguide.com/your-team-determines-your-luck) → [`pages/your-team-determines-your-luck.md`](pages/your-team-determines-your-luck.md)
   - [How to beat a Pokémon](https://www.vgcguide.com/how-to-beat-a-pokemon) → [`pages/how-to-beat-a-pokemon.md`](pages/how-to-beat-a-pokemon.md)
   - [6th Pokémon syndrome](https://www.vgcguide.com/6th-pokemon-syndrome) → [`pages/6th-pokemon-syndrome.md`](pages/6th-pokemon-syndrome.md) — read this *before* you run into it.
   - [How do you know if a team you've made is good](https://www.vgcguide.com/how-do-you-know-if-a-team-youve-made-is-good) → [`pages/how-do-you-know-if-a-team-youve-made-is-good.md`](pages/how-do-you-know-if-a-team-youve-made-is-good.md)

2. **Use the Core / Solvers / Enablers framework.** Every team you build (or modify) gets categorized into three buckets:

   | Bucket | Role | How many slots? |
   |---|---|---|
   | **Core** | The 2–3 mons that *define your win condition*. Without them, the team has no plan. | 2–3 |
   | **Solvers** | Mons whose job is to remove specific threats to your core. "I have a Steel here because Fairy types crush my core." | 1–2 |
   | **Enablers** | Mons that make the core's plan easier to execute: speed control, redirection, pivots, screens, Fake Out. | 1–2 |

   **Constraint rule (apply ruthlessly):** every Pokémon must either *advance* the win condition OR *protect* the win condition. If you can't categorize a slot as Core / Solver / Enabler, that slot is wasted. Cut it.

3. **Build minimally — single-swap iteration.** Don't start from scratch. Take the borrowed team you've been piloting and **swap one Pokémon**. Articulate the intent: "I'm replacing X because [specific weakness in last 20 games]. I'm adding Y because [specific role fill that addresses it]." Categorize the swap: Core / Solver / Enabler.

4. **Scientific testing — change one variable at a time, test for ≥10–20 games per change.** This is non-negotiable. If you swap a mon AND change EV spreads AND change items at once, you've made the team unmeasurable. Make one change, log results across 10+ games, decide to keep or revert, then make the next change. Slow is fast.

5. **After 3–4 successful swaps, you have a meaningfully different team** that's still anchored in proven structure.

6. **Now build from intent (optional — only if you want to).** Open a doc. Write a one-paragraph statement of the team you want: archetype, win condition, 2 modes, 2 threats it specifically counters. Categorize each slot as Core/Solver/Enabler before adding it. Then assemble. Then test (still one variable at a time).

7. **Apply the 4-question evaluation** from [How do you know if a team you've made is good](https://www.vgcguide.com/how-do-you-know-if-a-team-youve-made-is-good) → [`pages/how-do-you-know-if-a-team-youve-made-is-good.md`](pages/how-do-you-know-if-a-team-youve-made-is-good.md): fun, control, weakness profile, consistency. Be honest. If 2/4 fail, scrap and rebuild.

**Checkpoint 5:**

- [ ] **Slot-by-slot justification:** for each of your 6 mons, name its bucket (Core / Solver / Enabler) and one sentence on what it does for the team. If any slot's answer is fuzzy ("uh, it's good?"), that's a cut candidate.
- [ ] **Intent articulation:** write a 3-sentence pitch for your built team. Each sentence answers: what's it doing? how does it win? what does it specifically beat that the meta is full of? If the sentences feel forced, your intent is weak — go back to the drawing board.
- [ ] **Win-rate parity:** does your built team perform within ~5% win rate of the borrowed team you were piloting? Not the same rating — the same *win rate* against similar opponents.
- [ ] **Weakness map:** can you name your team's 3 worst matchups by archetype, and what your plan is for each? If the plan is "hope they don't bring it," the weakness profile fails the consistency test.
- [ ] **Sixth-mon test:** if you've been swapping the same slot 4+ times, you have 6th Pokémon syndrome. Re-read that page; the fix is usually structural, not a different mon.
- [ ] **One-variable discipline:** look at your iteration log. Did you ever change two things between test sessions? If yes, your data is contaminated; tighten up before the next iteration.

---

## Phase 6 — Sustainment + climb to 1400–1600

Goal: make this a stable habit instead of a project.

**Do:**

1. Drop ladder cadence to whatever you actually want — 1–4 sessions/week. The point is *not* maximum games; it's continued review per game.

2. Apply this loop forever:
   - Play a session.
   - Review the losses (and at least one win for blind spots).
   - Once a week: check Victory Road for meta drift.
   - Once a month: re-evaluate your team against your 4-indicator framework. Iterate or scrap.

3. As the meta shifts (new format, new restricted mons, etc.), you'll need to re-do parts of Phase 4 (knowledge base) and possibly Phase 5 (rebuild). That's the rhythm of VGC. Don't fight it — accept it as part of the hobby.

4. If you find yourself stuck at a rating for >4 weeks despite the review loop, the bottleneck is one of:
   - Team is meta-vulnerable (run the 4-indicator test).
   - You're burned out and going through motions (take 1–2 weeks off, no guilt).
   - There's a specific concept gap. Honest diagnostic: pick your last 10 losses, look for the pattern. If 7 of them are "their TR setter went up and I had no answer," the gap is structural and named — you go re-read TR counterplay and build accordingly.

**Final goal checkpoint — split across 5 dimensions:**

| Dimension | What it tests | Pass criteria |
|---|---|---|
| **Mechanical** | Knowledge gaps fixed | No major surprises — moves/items/abilities are familiar. Damage estimation within ~15% of calc. |
| **Strategic** | Win-condition discipline | You enter games with a plan; the plan is usually still relevant by mid-game. Position > Damage is a habit, not a slogan. |
| **Adaptive** | Loss diagnosis | When you lose, your first reaction is the replay, not RNG-blame. You can name *which* error type (Knowledge / Positioning / Planning) caused each loss. |
| **Resource** | Tera intentionality | For your last 5 Tera presses, you can name intent (Off / Def / Tempo) and audit (good / early / late / misused). |
| **Mental** | Habit stability | You can take a week off and resume cleanly. You stop after 3 consecutive losses without exception. |

When all five are true at **1400–1600 ELO on a self-built team**, you've hit the ceiling this plan was designed to reach.

**Beyond this**: if your win rate sustains 55%+ across hundreds of games and you're considering tournament play, you've grown past this plan's scope. The next layer is Bo3 skills (information exploitation between games, opponent modeling, lead pivots between games) and tournament prep (long-session mental endurance). That's a separate discipline — see "Optional next layer" below.

---

## When you plateau (and you will)

**This is not optional reading.** Wolfe Glick says directly: "it's very easy for people to hit a plateau." Every player hits one — usually around 1200–1400 on Showdown. The natural response is to play more games, which doesn't help, and then to blame the meta or the team, which also doesn't help.

The actual diagnostic comes from Brady Smith / VGC Corner, who frames Pokémon as "an information game — if you know more information than your opponent, you will probably win more times than them" ([source](https://x.com/vgccorner/status/1836859635581468682)). When you plateau, the information bottleneck is in one of three places. Pick your **most recent 10 losses** and classify each:

| Bucket | Symptom | Fix |
|---|---|---|
| **Team preview / planning** | "I fell apart in the lead matchup" or "My back 2 couldn't close the set" | Phase 3's team-preview ritual + game plan articulation. The win condition wasn't clear before turn 1. |
| **Plays / reads** | "I got the read wrong when I had to nail it" or "I went for an unnecessary read and gave them the game" | Phase 3's board-state classification. Reads in Advantage = bad. No-read in Losing = also bad. |
| **Team construction** | "Same archetype keeps killing me, no matter how I play" | Phase 5's 4-question evaluation + Core/Solvers/Enablers audit. The team has a structural hole. |

Whichever bucket holds the most losses is your bottleneck. **More games will not fix it** — you'll just generate more losses in the same bucket. Loop back to the relevant phase and grind that *concept* until your next 10 losses redistribute.

A second principle from Brady Smith that overlaps with vgcguide.com but is worth restating because it's *the* most common plateau cause: **avoid results-based analysis.** A play that worked isn't automatically right — you might have made a bad play and got lucky. Plateau-breaking comes from evaluating decision *quality*, not outcome.

A complementary lens from Markus Stadter (3rd at 2016 Worlds, multi-time regional champion): collaborative refinement beats solo grinding. In his Bochum Regional winning report he describes spending substantial time *with friends* (Wolfe Glick and Aaron Traylor among them) "to finalize the game plans, EV spreads, moves and Tera Types" ([source](https://victoryroad.pro/2023/03/13/markus-stadter-bochum-report/)). For a hobbyist this means: when stuck, post a recent loss replay to the [r/VGC subreddit](https://www.reddit.com/r/VGC/) or [VGC Discord servers](https://www.reddit.com/r/VGC/) and ask for one specific question ("did I play turn 6 right?"). One outside opinion from someone who isn't you is often the unblock.

---

## Ongoing routines (the actual habit loops)

These run perpetually, regardless of phase:

- **Per game:** save the replay if you lost, or if anything weird happened.
- **Per session (3 games):** spend 5 minutes on the replay of the loss you learned least from. Write 1–2 sentences in a running notes doc.
- **Per week:** 15 minutes on Victory Road; check tournament results and archetype trends.
- **Per month:** re-evaluate your team against the 4-indicator framework (fun, control, weakness profile, consistency). Iterate or scrap.

That's ~30 minutes/week of overhead beyond actually playing. Worth it.

---

## Anti-patterns (skim now, re-read when you feel any of them)

- **Autopilot laddering** — playing many games without pre-game protocol or post-game review. Volume without review is just confirmation of bad habits.
- **"Just one more game"** — you are tilted, the next game will be worse. Walk away.
- **"I lost because they crit"** — re-read /your-team-determines-your-luck. Maybe true, but probably your team gave them the chance.
- **Building before you can pilot** — Phase 5 exists late on purpose. Don't skip ahead.
- **Over-predicting (read-heavy play in advantage states)** — calling reads when you're already winning converts free wins into coin flips. Reads are for losing states, not winning ones.
- **Playing emotionally** — chasing the previous game's outcome (revenge play, win-streak preservation, "I need a clean session"). Each game is independent. The previous one is already over.
- **Following one streamer's "best team"** — single sources have blind spots. Cross-reference.
- **Chasing rating instead of understanding** — rating without understanding is a sandcastle. The next format reset washes it. Understanding compounds.
- **Excessive Protect ("Protect Extravaganza")** — if you Protect twice in a row and the board state hasn't changed, you wasted a turn. Reread /protect-in-battle.
- **6th Pokémon syndrome** — cycling the last slot endlessly. Almost always a structural problem in the other 5, not a "missing piece."
- **Tera-greed / panic-Tera / win-more Tera** — three flavors of using your Gen 9 resource wrong. Audit every Tera press.
- **Two-variable swaps** — changing two things between test sessions. Now your data is contaminated. One variable, ten games, decide.
- **Trying to memorize Pikalytics** — usage stats are descriptive, not prescriptive. They tell you what's common, not what's good for you.

---

## Quick reference: when to re-read which page

| Symptom | Re-read |
|---|---|
| Reflexively Protecting | [/protect-in-battle](https://www.vgcguide.com/protect-in-battle) |
| Losing to Trick Room repeatedly | [/battling-against-trick-room](https://www.vgcguide.com/battling-against-trick-room) |
| Losing turn 1 a lot | [/team-preview](https://www.vgcguide.com/team-preview) |
| Don't know what to do during team preview | [/team-preview](https://www.vgcguide.com/team-preview) + [/analyzing-your-opponents-teams](https://www.vgcguide.com/analyzing-your-opponents-teams) |
| Tilting after losses | [/everyone-is-learning-all-the-time](https://www.vgcguide.com/everyone-is-learning-all-the-time) + [/competitive-pokemon-is-less-luck-than-you-think](https://www.vgcguide.com/competitive-pokemon-is-less-luck-than-you-think) |
| Stuck cycling team slot 6 | [/6th-pokemon-syndrome](https://www.vgcguide.com/6th-pokemon-syndrome) |
| Don't know if your team is good | [/how-do-you-know-if-a-team-youve-made-is-good](https://www.vgcguide.com/how-do-you-know-if-a-team-youve-made-is-good) |
| Feel pressured / out of options every turn | [/what-is-pressure](https://www.vgcguide.com/what-is-pressure) |
| Can't predict opponents | [/predictions](https://www.vgcguide.com/predictions) + [/building-up-a-knowledge-base](https://www.vgcguide.com/building-up-a-knowledge-base) |
| Can't explain your own team to anyone | [/intent](https://www.vgcguide.com/intent) |
| Tera misuse | (no page exists; use the audit framework in Phase 3) |
| Iterating teams without progress | [/when-do-you-move-on-from-a-team](https://www.vgcguide.com/when-do-you-move-on-from-a-team) → [`pages/when-do-you-move-on-from-a-team.md`](pages/when-do-you-move-on-from-a-team.md) |

---

## Optional next layer — only if your goals shift to tournament play

You explicitly said you don't plan to compete. This section exists only so you have a roadmap if that ever changes. **Skip this entirely if your goal stays "ladder competent."**

If you ever decide to enter a regional or online tournament:

1. **Bo3 mindset shift.** Read [/approaching-best-of-1-vs-best-of-3](https://www.vgcguide.com/approaching-best-of-1-vs-best-of-3) → [`pages/approaching-best-of-1-vs-best-of-3.md`](pages/approaching-best-of-1-vs-best-of-3.md) again, this time with intent. Bo3 inverts much of the Bo1 advice: surprise becomes a *one-time* asset (game 1 only), consistency outweighs tempo, and *information exploitation between games* becomes the actual skill being tested.

2. **Open Team Sheets (OTS).** Modern VGC tournaments increasingly use OTS — both players see all 6 mons' moves/items/abilities at team preview. Showdown's ladder is more like Closed Team Sheets (you only see species). If you train only on Showdown's CTS-style inference, you'll be over-trained on guessing and under-trained on full-information teambuilding. Practice some games on tournament-format simulators or replay tournament games as exercises.

3. **Tournament simulation.** The bottleneck for tournament players isn't game skill — it's *decision quality across 5–7 sets in one day*. Simulate this by playing back-to-back Bo3 sets without breaks, on a single day, and observe where your decision quality degrades. Most players fall apart in set 4 from cognitive fatigue. Build the endurance separately.

4. **Skills the ladder doesn't teach you:**
   - **Game-2 lead pivots** — based on what you saw in game 1.
   - **Targeting adjustments** — focusing damage differently between games to address what hurt you.
   - **Opponent modeling** — "what does *this player* prefer" vs. "what does the meta prefer."
   - **Mental reset between sets** — disposing of the previous match completely before the next.

5. **Lead variation across games (the Stadter principle).** Markus Stadter, describing his Top 4 Bochum match: "I changed my pick for each game to be prepared for a potential adaptation from [opponent], and since I felt like I couldn't handle all different modes their team had with one pick" ([source](https://victoryroad.pro/2023/03/13/markus-stadter-bochum-report/)). Translation: in Bo3, a strong opponent will adapt to whatever you led with last game. Picking the same lead twice is *the* most predictable thing you can do. Even if your game-1 lead worked, consider varying it just to disrupt their prep.

6. **The thing that doesn't change:** Phases 1–4 of this plan are still your foundation. Don't restart fundamentals. Tournament play is a *layer on top*, not a replacement.

---

## External resources (curated)

These are the resources that came up repeatedly across pro tournament reports and interviews, organized by what they're good for. Bookmark them; you'll use them constantly.

### Daily/weekly tools

- **[Pikalytics](https://pikalytics.com)** — current-format usage stats (mons, moves, items, EV trends). The single most-cited tool in pro content. Check weekly for meta drift.
- **[Pikalytics damage calculator](https://pikalytics.com/calc)** — for the calc-as-habit workflow (Phase 2). Pre-set with current format defaults.
- **[VGC Multi Calc](https://vgcmulticalc.com/)** — calc against multiple defenders simultaneously. Essential for spread moves.
- **[Showdown's calculator](https://calc.pokemonshowdown.com/)** — full-feature classic calc.
- **[Porygon Labs](https://www.porygonlabs.com/)** — current-format calc + team builder, with Mega Evolution / Stat Points support.
- **[Victory Road](https://victoryroadvgc.com)** — tournament results database. Check Top 8 weekly for archetype shifts.
- **[Limitless VGC](https://limitlessvgc.com/)** — alternative tournament database with player profiles.
- **[Pokémon Showdown](https://play.pokemonshowdown.com/)** — the ladder itself.

### Content creators (use for replay-prediction drills + meta literacy)

These are the most-cited educational creators in pro circles. Spend time *with the video paused* between turns predicting plays — that's where the value is.

- **[Wolfey VGC](https://www.youtube.com/@WolfeyVGC)** — Wolfe Glick (2016 World Champion). Best for tournament breakdowns, mental-game content, and educational team analyses.
- **[CybertronVGC](https://www.youtube.com/channel/UCYoTO-akZCsiusTe4rBxfhA)** — Aaron Zheng. Best for daily team rentals + format coverage. Most prolific VGC educator.
- **[13Yoshi37](https://www.youtube.com/c/13Yoshi37/videos)** — Markus Stadter. Best for high-level European tournament play and team theory.
- **[VGC Corner / Brady Smith](https://x.com/vgccorner)** — focused replay-analysis / improvement content. The "information game" framing for plateau diagnosis.
- **PokéStats Live** — tournament casts with high-quality analysis (search YouTube).

### Community

- **[r/VGC](https://www.reddit.com/r/VGC/)** — the subreddit. Sticky threads link the active community Discord servers.
- **[VGC Pastes](https://docs.google.com/spreadsheets/d/1axlwmzPA49rYkqXh7zHvAtSP-TKbM0ijGYBPRflLSWw/edit#gid=1678642469)** — community-maintained archive of tournament-winning teams. Source for borrowed teams in Phase 1.
- **VGC subreddit Discord servers** — find them stickied on r/VGC. Best place to post a replay and ask "did I play this right?" when you plateau (per the Stadter / Brady Smith advice above).

### Reference

- **[vgcguide.com](https://www.vgcguide.com/)** — the original source for this plan. Full text also archived locally — see "Article library" in the navigation.
- **[Serebii Pokédex](https://www.serebii.net/pokedex-swsh/)** — quick lookup for moves, abilities, learnsets.

---

## Source-page index (full text saved locally)

You now have **the actual full articles** from vgcguide.com, not summaries:

- **`pages/`** — 61 markdown files, one per article, each with the complete original prose (headings, examples, quotes preserved). Open `pages/_INDEX.md` for the list with word counts.
- **`raw-html/`** — the raw HTML if you ever want to verify the extraction was faithful.
- **`notes-distilled.md`** — my condensed bullet-point notes (helpful as a quick refresher, but not a substitute for the originals).
- **`fetch.py`** — the script used to pull and extract everything, in case you want to re-run it later when the site adds new pages.

Every URL referenced in this plan also has a corresponding local file. For example, `https://www.vgcguide.com/speed-control` is at [`pages/speed-control.md`](pages/speed-control.md).

The 61 pages, grouped:

**Foundations (12):** preface, introduction-to-competitive-pokemon, coming-from-breeding-or-shiny-hunting, coming-from-single-battles, the-basics-of-watching-a-pokemon-match, what-are-the-rules-of-a-vgc-battle, base-stats, what-is-pokemon-showdown, everyone-is-learning-all-the-time, subjectivity, context-pt1, context-pt2

**Teambuilding (32):** teambuilding-introduction, intent, brainstorming-ideas-to-start-teams, you-dont-need-to-teambuild-to-play-pokemon, how-to-use-someone-elses-team, typing, utility-moves, speed-control, items, protect, trick-room, what-makes-a-pokemon-good, synergy, cores-and-modes, archetypes, consistency, your-team-determines-your-luck, accuracy-vs-power, surprise-factor, metagame, team-playstyle-and-pace, how-to-pull-it-all-together, how-to-win-sometimes-with-your-favorites, 6th-pokemon-syndrome, how-to-beat-a-pokemon, island-pokemon, when-do-you-move-on-from-a-team, why-you-should-keep-an-open-mind, bo1-vs-bo3, how-do-you-know-if-a-team-youve-made-is-good, how-do-you-know-which-team-to-take-to-a-tournament, what-to-do-when-time-is-running-out

**Battling (17):** competitive-pokemon-is-less-luck-than-you-think, building-up-a-knowledge-base, approaching-best-of-1-vs-best-of-3, analyzing-your-opponents-teams, team-preview, what-is-a-game-plan, what-is-pressure, predictions, protect-in-battle, switching, battling-against-trick-room, 1-hp-is-infinitely-more-than-0-hp, how-to-analyze-a-battle, battling-example-will-tansley-vs-nils-dunlop-worlds-2017, battling-examples-diana-bros-vs-paul-chua-naic-2019, battling-example-alister-sandover-vs-edoardo-giunipero-ferraris, what-is-a-good-ladder-rating

**Skipped (per your instructions):** EV-spread tutorials (eving-1/2/3) since you already know EVs, all SWSH in-game training pages (IV breeding, hyper training, natures, etc.), and all /circuit/ tournament-attendance pages.

