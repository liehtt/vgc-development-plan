/* =====================================================================
   VGC Recording Tool — Phase 1 V1
   =====================================================================

   All-vanilla JS. No backend. No third-party libraries. No network calls.
   All data lives in localStorage under the key 'vgc-recording-v1'.
   Each browser maintains its own isolated copy — visitors to this site
   never see each other's data. Export to JSON to back up.
   ===================================================================== */

(() => {
  'use strict';

  // ---------------------------------------------------------------
  // Constants & defaults
  // ---------------------------------------------------------------
  const STORAGE_KEY = 'vgc-recording-v1';
  const SCHEMA_VERSION = 3;
  const SESSION_GAP_HOURS = 2;        // games within 2 hours = same session
  const TILT_LOSS_THRESHOLD = 3;      // 3 consecutive losses = tilt session
  const TILT_LOOKBACK_DAYS = 14;      // only check sessions in last 14 days
  const BACKUP_NUDGE_DAYS = 7;
  const ERROR_TYPES = {
    knowledge: 'Knowledge gap',
    positioning: 'Positioning error',
    planning: 'Planning failure',
    none: 'None',
  };
  // Real (non-"none") error types, used by checkbox UI and dashboard counts.
  const REAL_ERROR_TYPES = ['knowledge', 'positioning', 'planning'];

  // ---------------------------------------------------------------
  // Phase 2 constants
  // ---------------------------------------------------------------
  const PHASE2_READING = [
    { slug: 'what-is-pressure', title: 'What is Pressure', url: 'pages/what-is-pressure.html' },
    { slug: 'trick-room', title: 'Trick Room', url: 'pages/trick-room.html' },
    { slug: 'battling-against-trick-room', title: 'Battling against Trick Room', url: 'pages/battling-against-trick-room.html' },
    { slug: 'switching', title: 'Switching', url: 'pages/switching.html' },
    { slug: '1-hp-is-infinitely-more-than-0-hp', title: '1 HP is Infinitely More Than 0 HP', url: 'pages/1-hp-is-infinitely-more-than-0-hp.html' },
    { slug: 'items', title: 'Items', url: 'pages/items.html' },
  ];

  const PHASE2_CHECKPOINT = [
    { key: 'pressureArticulation', label: 'Pressure articulation', help: 'Define "pressure" in your own words and give an example from your last 3 games.' },
    { key: 'switchReasoning', label: 'Switch reasoning', help: 'Name the 4 reasons to switch (survival / positioning / field condition / resource preservation) + a real executed example of each.' },
    { key: 'onehpTest', label: '"1 HP" test', help: 'In your last 5 games, did you ever use a low-HP mon strategically (re-trigger Intimidate, eat a hit, stall TR) instead of just bringing it back to die?' },
    { key: 'speedTierAwareness', label: 'Speed-tier awareness', help: 'Name your fastest mon\'s speed at +0 and under your speed control — without checking a calc.' },
    { key: 'trickRoomCounterplay', label: 'Trick Room counterplay', help: 'If you lead into a TR team and TR goes up, name the next 4 turns to neutralize as much of it as possible.' },
    { key: 'midGamePredictionTest', label: 'Mid-game prediction hard test', help: '≥3 of 5 ladder games where you predicted opp\'s move + damage range correctly on at least one turn.' },
  ];

  const SWITCH_REASONS = {
    survival: '🛟 Survival',
    positioning: '🎯 Positioning',
    'field-condition': '🌤️ Field condition',
    'resource-preservation': '💎 Resource preservation',
  };

  function emptyPhase2Tags() {
    return {
      threatChecklistDone: false,
      commitmentSentence: '',
      supportFirstMoveAuditDone: false,
      strategic1HpUsed: false,
      strategic1HpNote: '',
      switchReasons: [],
    };
  }

  function emptyPhase2() {
    const readingProgress = {};
    for (const r of PHASE2_READING) {
      readingProgress[r.slug] = { read: false, readAt: null, notes: '' };
    }
    const checkpoint = {};
    for (const c of PHASE2_CHECKPOINT) {
      checkpoint[c.key] = { passed: false, evidence: '' };
    }
    return {
      readingProgress,
      predictionDrills: [],
      replayDrills: [],
      checkpoint,
      uiState: { phase2TagsExpanded: false },
    };
  }

  // ---------------------------------------------------------------
  // Schema migration. Runs once on load. Each step is idempotent.
  //   v1 → v2: errorType (string) → errorTypes (array)
  //   v2 → v3: Phase 2 expansion — add `phase2` top-level, add
  //            speedMap / defensiveBenchmarks to currentTeam, add
  //            phase2Tags to existing games. All additive.
  // ---------------------------------------------------------------
  function migrate(s) {
    s = s || {};
    s.games = s.games || [];
    const v = s.schemaVersion || 1;

    // v1 → v2
    if (v < 2) {
      for (const g of s.games) {
        if (!g.errorTypes) {
          if (g.errorType && g.errorType !== 'none' && REAL_ERROR_TYPES.includes(g.errorType)) {
            g.errorTypes = [g.errorType];
          } else {
            g.errorTypes = [];
          }
        }
        delete g.errorType;
      }
      s.schemaVersion = 2;
    }

    // v2 → v3
    if ((s.schemaVersion || 1) < 3) {
      // Add phase2 if missing
      if (!s.phase2) {
        s.phase2 = emptyPhase2();
      } else {
        // Defensively merge any missing reading or checkpoint keys
        const defaults = emptyPhase2();
        s.phase2.readingProgress = Object.assign(defaults.readingProgress, s.phase2.readingProgress || {});
        s.phase2.checkpoint = Object.assign(defaults.checkpoint, s.phase2.checkpoint || {});
        s.phase2.predictionDrills = s.phase2.predictionDrills || [];
        s.phase2.replayDrills = s.phase2.replayDrills || [];
        s.phase2.uiState = Object.assign({ phase2TagsExpanded: false }, s.phase2.uiState || {});
      }
      // Add speedMap and defensiveBenchmarks to team
      if (s.currentTeam) {
        if (!Array.isArray(s.currentTeam.speedMap)) s.currentTeam.speedMap = [];
        if (!Array.isArray(s.currentTeam.defensiveBenchmarks)) s.currentTeam.defensiveBenchmarks = [];
      }
      // Add phase2Tags to existing games
      for (const g of s.games) {
        if (!g.phase2Tags) g.phase2Tags = emptyPhase2Tags();
      }
      s.schemaVersion = 3;
    }

    return s;
  }

  function emptyState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      settings: {
        lastExportedAt: null,
        privacyBannerDismissed: false,
      },
      currentTeam: null,
      games: [],
      phase2: emptyPhase2(),
    };
  }

  // ---------------------------------------------------------------
  // Storage layer
  // ---------------------------------------------------------------
  const Store = {
    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return emptyState();
        const parsed = JSON.parse(raw);
        // Defensive: if missing keys, fill from defaults
        const merged = Object.assign(emptyState(), parsed, {
          settings: Object.assign(emptyState().settings, parsed.settings || {}),
        });
        return migrate(merged);
      } catch (err) {
        console.warn('Could not parse stored data, starting fresh:', err);
        return emptyState();
      }
    },
    save(state) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return true;
      } catch (err) {
        console.error('Storage write failed:', err);
        toast.error('Could not save. Browser storage may be full or disabled.');
        return false;
      }
    },
    healthCheck() {
      // Try a small write to confirm storage actually persists.
      const probeKey = STORAGE_KEY + ':probe';
      try {
        localStorage.setItem(probeKey, '1');
        const ok = localStorage.getItem(probeKey) === '1';
        localStorage.removeItem(probeKey);
        return ok;
      } catch (err) {
        return false;
      }
    },
  };

  let state = Store.load();

  function persist() {
    Store.save(state);
  }

  // ---------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function uid(prefix = 'g') {
    return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatRelativeTime(isoString) {
    if (!isoString) return 'never';
    const t = new Date(isoString).getTime();
    const now = Date.now();
    const diffMs = now - t;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return diffDays + ' days ago';
    if (diffDays < 30) return Math.floor(diffDays / 7) + ' weeks ago';
    return Math.floor(diffDays / 30) + ' months ago';
  }

  function formatGameDate(isoString) {
    const d = new Date(isoString);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    if (sameDay) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function isoToInputLocal(iso) {
    // Convert ISO to "YYYY-MM-DDTHH:MM" for datetime-local input
    const d = new Date(iso);
    const tz = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - tz);
    return local.toISOString().slice(0, 16);
  }
  function inputLocalToIso(local) {
    if (!local) return new Date().toISOString();
    return new Date(local).toISOString();
  }

  // ---------------------------------------------------------------
  // Toast notifications
  // ---------------------------------------------------------------
  const toast = {
    show(message, opts = {}) {
      const area = $('#toast-area') || (() => {
        const el = document.createElement('div');
        el.id = 'toast-area';
        el.className = 'toast-area';
        document.body.appendChild(el);
        return el;
      })();
      const el = document.createElement('div');
      el.className = 'toast' + (opts.type ? ' ' + opts.type : '');
      el.innerHTML = `<span>${escapeHtml(message)}</span>`;
      if (opts.action) {
        const btn = document.createElement('button');
        btn.textContent = opts.action.label;
        btn.onclick = () => { opts.action.fn(); el.remove(); };
        el.appendChild(btn);
      }
      const close = document.createElement('button');
      close.className = 'close-x';
      close.textContent = '×';
      close.onclick = () => el.remove();
      el.appendChild(close);
      area.appendChild(el);
      if (!opts.sticky) {
        setTimeout(() => el.remove(), opts.duration || 5000);
      }
    },
    success(msg, opts) { this.show(msg, Object.assign({ type: 'success' }, opts || {})); },
    warn(msg, opts) { this.show(msg, Object.assign({ type: 'warn' }, opts || {})); },
    error(msg, opts) { this.show(msg, Object.assign({ type: 'warn', duration: 7000 }, opts || {})); },
  };

  // ---------------------------------------------------------------
  // Showdown HTML replay parser
  // Extracts only the <script class="battle-log-data"> contents.
  // ---------------------------------------------------------------
  function parseReplayHtml(htmlText) {
    // Defensive: try multiple strategies in case Showdown changes markup.
    // Strategy 1: regex on the script tag (works without DOMParser quirks)
    const scriptMatch = htmlText.match(
      /<script[^>]*class=["']battle-log-data["'][^>]*>([\s\S]*?)<\/script>/i
    );
    if (scriptMatch && scriptMatch[1]) {
      const log = scriptMatch[1].trim();
      if (log.length > 50) return log;
    }
    // Strategy 2: DOMParser for any <script class="battle-log-data">
    try {
      const doc = new DOMParser().parseFromString(htmlText, 'text/html');
      const node = doc.querySelector('script.battle-log-data');
      if (node) return node.textContent.trim();
    } catch (e) { /* ignore */ }
    return null;
  }

  function isShowdownReplayUrl(url) {
    if (!url) return false;
    try {
      const u = new URL(url);
      return /(^|\.)pokemonshowdown\.com$/.test(u.hostname) && u.pathname.length > 1;
    } catch (e) { return false; }
  }

  // ---------------------------------------------------------------
  // Computations for dashboard widgets
  // ---------------------------------------------------------------
  function getSessions(games) {
    // Sort ascending by playedAt, group into sessions where adjacent games
    // are within SESSION_GAP_HOURS of each other.
    const sorted = [...games].sort((a, b) =>
      new Date(a.playedAt) - new Date(b.playedAt));
    const sessions = [];
    const gapMs = SESSION_GAP_HOURS * 3600000;
    let cur = null;
    for (const g of sorted) {
      const t = new Date(g.playedAt).getTime();
      if (cur && (t - cur.lastTime) <= gapMs) {
        cur.games.push(g);
        cur.lastTime = t;
      } else {
        cur = { games: [g], firstTime: t, lastTime: t };
        sessions.push(cur);
      }
    }
    return sessions;
  }

  // Helper: get the error types array for a game, normalizing across
  // schema versions. Always returns an array of valid REAL_ERROR_TYPES strings.
  function gameErrorTypes(g) {
    if (Array.isArray(g.errorTypes)) {
      return g.errorTypes.filter(t => REAL_ERROR_TYPES.includes(t));
    }
    if (g.errorType && REAL_ERROR_TYPES.includes(g.errorType)) {
      return [g.errorType];
    }
    return [];
  }

  function topErrorTypesInLastNLosses(games, n = 10) {
    const losses = games
      .filter(g => g.result === 'L')
      .sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt))
      .slice(0, n);
    const counts = { knowledge: 0, positioning: 0, planning: 0 };
    // A game with multiple error types contributes to each — that's intentional
    // per the multi-error model. So a single loss can add to all three buckets.
    for (const g of losses) {
      for (const t of gameErrorTypes(g)) counts[t]++;
    }
    const rows = Object.entries(counts)
      .filter(([, c]) => c > 0)
      .sort((a, b) => b[1] - a[1]);
    return { rows, lossesAnalyzed: losses.length };
  }

  function tiltStatus(games) {
    const cutoff = Date.now() - TILT_LOOKBACK_DAYS * 86400000;
    const recentSessions = getSessions(games)
      .filter(s => s.lastTime >= cutoff);
    let tiltCount = 0;
    for (const s of recentSessions) {
      let streak = 0, maxStreak = 0;
      for (const g of s.games) {
        if (g.result === 'L') { streak++; if (streak > maxStreak) maxStreak = streak; }
        else streak = 0;
      }
      if (maxStreak >= TILT_LOSS_THRESHOLD) tiltCount++;
    }
    return { sessionsExamined: recentSessions.length, tiltSessions: tiltCount };
  }

  function lastNGames(games, n = 10) {
    return [...games]
      .sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt))
      .slice(0, n)
      .reverse();
  }

  // ---------------------------------------------------------------
  // Dashboard rendering
  // ---------------------------------------------------------------
  const Dashboard = {
    render() {
      const games = state.games || [];
      const team = state.currentTeam;

      // Quick toolbar
      const toolbarEl = $('#dashboard-toolbar');
      if (toolbarEl) {
        toolbarEl.innerHTML = `
          <button class="btn-big-primary" data-action="new-game">
            <span>+</span> Log a game
          </button>
          ${team
            ? `<span style="color:var(--fg-muted);font-size:0.95em;">on <strong>${escapeHtml(team.name || 'Unnamed team')}</strong></span>`
            : ''}
        `;
      }

      // Top-level empty state (no team, no games)
      const emptyEl = $('#dashboard-empty');
      if (!team && games.length === 0) {
        if (emptyEl) emptyEl.style.display = 'block';
        const grid = $('#dashboard-grid');
        if (grid) grid.style.display = 'none';
        const recent = $('#recent-games-section');
        if (recent) recent.style.display = 'none';
        return;
      }
      if (emptyEl) emptyEl.style.display = 'none';
      const grid = $('#dashboard-grid');
      if (grid) grid.style.display = 'grid';

      // Last 10 games strip
      const recent10 = lastNGames(games, 10);
      const stripCells = [];
      for (let i = 0; i < 10; i++) {
        const g = recent10[i];
        if (!g) {
          stripCells.push('<div class="last-10-cell empty"></div>');
        } else {
          const cls = g.result === 'W' ? 'win' : 'loss';
          const letter = g.result;
          stripCells.push(`<div class="last-10-cell ${cls}" title="${escapeHtml(formatGameDate(g.playedAt))}">${letter}</div>`);
        }
      }
      const wins = recent10.filter(g => g.result === 'W').length;
      const losses = recent10.filter(g => g.result === 'L').length;
      const wlEl = $('#dash-last-10');
      if (wlEl) {
        wlEl.innerHTML = `
          <h3>Last ${recent10.length || 10} games</h3>
          <div class="last-10-strip">${stripCells.join('')}</div>
          <div class="stat-summary">
            ${recent10.length === 0
              ? '<span class="muted">No games logged yet</span>'
              : `${wins}–${losses} <span class="muted">(${recent10.length === 10 ? 'last 10' : 'so far'})</span>`}
          </div>
        `;
      }

      // Top error types
      const errEl = $('#dash-errors');
      if (errEl) {
        const { rows, lossesAnalyzed } = topErrorTypesInLastNLosses(games, 10);
        if (lossesAnalyzed === 0) {
          errEl.innerHTML = `
            <h3>Top error types in losses</h3>
            <div class="empty-state">No losses logged yet.<br>Top error types will appear here once you log some.</div>
          `;
        } else {
          const max = Math.max(...rows.map(r => r[1]), 1);
          const bars = rows.map(([type, count]) => `
            <div class="error-bar-row">
              <span class="label">${escapeHtml(ERROR_TYPES[type])}</span>
              <span class="bar-track"><span class="bar-fill ${type}" style="width:${(count / max * 100).toFixed(0)}%;"></span></span>
              <span class="count">${count}×</span>
            </div>
          `).join('');
          errEl.innerHTML = `
            <h3>Top error types in last ${lossesAnalyzed} losses</h3>
            ${bars || '<div class="empty-state">All recent losses logged with error type "None" — re-evaluate?</div>'}
          `;
        }
      }

      // Tilt status
      const tiltEl = $('#dash-tilt');
      if (tiltEl) {
        const { sessionsExamined, tiltSessions } = tiltStatus(games);
        if (sessionsExamined === 0) {
          tiltEl.innerHTML = `
            <h3>Tilt protocol (last ${TILT_LOOKBACK_DAYS} days)</h3>
            <div class="empty-state">No recent sessions to evaluate.</div>
          `;
        } else {
          const ok = tiltSessions === 0;
          tiltEl.innerHTML = `
            <h3>Tilt protocol (last ${TILT_LOOKBACK_DAYS} days)</h3>
            <div class="tilt-row">
              <span class="tilt-icon">${ok ? '✅' : '⚠️'}</span>
              <span class="tilt-text">
                ${ok
                  ? `<strong>Clean.</strong> ${sessionsExamined} session${sessionsExamined === 1 ? '' : 's'}, no tilt-queueing detected.`
                  : `<strong>${tiltSessions} of ${sessionsExamined}</strong> sessions had ${TILT_LOSS_THRESHOLD}+ consecutive losses. The protocol says stop after 3.`}
              </span>
            </div>
          `;
        }
      }

      // Backup status
      const backupEl = $('#dash-backup');
      if (backupEl) {
        const last = state.settings.lastExportedAt;
        const ageDays = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : null;
        const stale = !last || ageDays >= BACKUP_NUDGE_DAYS;
        backupEl.className = 'stat-card backup-card ' + (stale ? 'stale' : 'fresh');
        backupEl.innerHTML = `
          <h3>Backup &amp; export</h3>
          <div class="backup-status">
            ${last
              ? `Last backup: <strong>${formatRelativeTime(last)}</strong>${ageDays >= BACKUP_NUDGE_DAYS ? ' — time to back up' : ''}`
              : '<strong>No backup yet.</strong> Download one to be safe.'}
          </div>
          <div class="backup-actions">
            <button class="btn-secondary" data-action="export" title="Full backup (.json) — restore later, includes embedded replay logs">⬇ Backup (.json)</button>
            <button class="btn-secondary" data-action="import" title="Restore from a previously downloaded backup file">⬆ Restore</button>
            <button class="btn-secondary" data-action="export-md" title="Lighter, human-readable export with summary stats and a suggested AI prompt — drop into ChatGPT/Claude for analysis">📋 AI summary (.md)</button>
          </div>
        `;
      }

      // Recent games table
      const tableEl = $('#recent-games-table');
      const sectionEl = $('#recent-games-section');
      if (tableEl && sectionEl) {
        if (games.length === 0) {
          sectionEl.style.display = 'none';
        } else {
          sectionEl.style.display = 'block';
          const recent20 = lastNGames(games, 20).reverse();
          tableEl.innerHTML = `
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Result</th>
                  <th>My lead</th>
                  <th>Their lead</th>
                  <th>Error</th>
                  <th>Lesson</th>
                </tr>
              </thead>
              <tbody>
                ${recent20.map(g => {
                  const myLead = (g.preGame?.myLead || []).join(' + ');
                  const theirLead = (g.preGame?.theirLeadGuess || []).join(' + ');
                  const lesson = (g.lesson || '').replace(/\s+/g, ' ').trim();
                  const types = gameErrorTypes(g);
                  const tagsHtml = types.length === 0
                    ? `<span class="error-tag none">—</span>`
                    : types.map(t => `<span class="error-tag ${t}">${escapeHtml(ERROR_TYPES[t])}</span>`).join(' ');
                  return `
                    <tr class="game-row" data-game-id="${escapeHtml(g.id)}">
                      <td>${escapeHtml(formatGameDate(g.playedAt))}</td>
                      <td><span class="result-pill ${g.result}">${g.result}</span></td>
                      <td>${escapeHtml(myLead)}</td>
                      <td>${escapeHtml(theirLead)}</td>
                      <td class="error-cell">${tagsHtml}</td>
                      <td class="lesson-cell">${escapeHtml(lesson.length > 80 ? lesson.slice(0, 80) + '…' : lesson)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `;
        }
      }

      // Phase 2 progress card — always rendered so it stays in sync with game logger updates
      Phase2.renderDashboardCard();
    },
  };

  // ---------------------------------------------------------------
  // Game logger form
  // ---------------------------------------------------------------
  const GameForm = {
    editingId: null,
    pendingReplayLog: null,

    open(prefilled) {
      this.editingId = null;
      this.pendingReplayLog = null;
      this.populate(prefilled || null);
      Tabs.switchTo('log-game');
      const el = $('#game-form-title');
      if (el) el.textContent = 'Log a game';
    },

    openEdit(gameId) {
      const g = state.games.find(x => x.id === gameId);
      if (!g) return;
      this.editingId = gameId;
      this.pendingReplayLog = g.replay?.embeddedLog || null;
      this.populate(g);
      Tabs.switchTo('log-game');
      const el = $('#game-form-title');
      if (el) el.textContent = 'Edit game';
    },

    populate(g) {
      const team = state.currentTeam;
      const myMons = team?.mons || [];
      const monsOptions = ['<option value="">—</option>']
        .concat(myMons.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`))
        .join('');

      const lead0 = g?.preGame?.myLead?.[0] || '';
      const lead1 = g?.preGame?.myLead?.[1] || '';
      const four = g?.preGame?.myFour || ['', '', '', ''];
      const playedAt = g?.playedAt || new Date().toISOString();

      $('#gf-played-at').value = isoToInputLocal(playedAt);
      $('#gf-my-wc').value = g?.preGame?.myWinCondition || '';
      $('#gf-their-wc').value = g?.preGame?.theirWinConditionGuess || '';

      // Lead dropdowns from team mons
      $('#gf-my-lead-0').innerHTML = monsOptions; $('#gf-my-lead-0').value = lead0;
      $('#gf-my-lead-1').innerHTML = monsOptions; $('#gf-my-lead-1').value = lead1;
      $('#gf-my-four-0').innerHTML = monsOptions; $('#gf-my-four-0').value = four[0] || '';
      $('#gf-my-four-1').innerHTML = monsOptions; $('#gf-my-four-1').value = four[1] || '';
      $('#gf-my-four-2').innerHTML = monsOptions; $('#gf-my-four-2').value = four[2] || '';
      $('#gf-my-four-3').innerHTML = monsOptions; $('#gf-my-four-3').value = four[3] || '';

      $('#gf-their-lead-0').value = g?.preGame?.theirLeadGuess?.[0] || '';
      $('#gf-their-lead-1').value = g?.preGame?.theirLeadGuess?.[1] || '';

      $('#gf-replay-url').value = g?.replay?.url || '';
      $('#gf-pivotal-turn').value = g?.pivotalTurn ?? '';
      $('#gf-lesson').value = g?.lesson || '';
      this.updateLessonCounter();

      this.setRadioPill('result', g?.result || '');
      this.setCheckPills('errorTypes', gameErrorTypes(g || {}));

      // Phase 2 tags
      const p2 = (g?.phase2Tags) || emptyPhase2Tags();
      const setCheckbox = (id, value) => { const el = $('#' + id); if (el) el.checked = !!value; };
      const setVal = (id, value) => { const el = $('#' + id); if (el) el.value = value || ''; };
      setCheckbox('gf-p2-threat-checklist', p2.threatChecklistDone);
      setCheckbox('gf-p2-support-audit', p2.supportFirstMoveAuditDone);
      setCheckbox('gf-p2-1hp-used', p2.strategic1HpUsed);
      setVal('gf-p2-1hp-note', p2.strategic1HpNote);
      setVal('gf-p2-commitment', p2.commitmentSentence);
      this.setCheckPills('switchReasons', p2.switchReasons || []);
      // Show/hide the 1HP note textarea
      const noteWrap = $('#gf-p2-1hp-note-wrapper');
      if (noteWrap) noteWrap.style.display = p2.strategic1HpUsed ? 'block' : 'none';
      // Restore expand/collapse state from settings
      const tagsBlock = $('#gf-phase2-tags');
      if (tagsBlock) {
        const wantOpen = !!(state.phase2?.uiState?.phase2TagsExpanded);
        const hasAnyP2 = p2.threatChecklistDone || p2.supportFirstMoveAuditDone || p2.strategic1HpUsed || p2.commitmentSentence || (p2.switchReasons || []).length;
        if (wantOpen || hasAnyP2) tagsBlock.setAttribute('open', '');
        else tagsBlock.removeAttribute('open');
      }

      const dz = $('#gf-replay-dropzone');
      if (dz) {
        if (g?.replay?.embeddedLog) {
          dz.classList.add('success');
          dz.innerHTML = `✅ Battle log embedded (${g.replay.embeddedLog.length.toLocaleString()} chars). <button class="btn-secondary" type="button" data-action="clear-log" style="margin-left:8px;">Clear</button>`;
        } else {
          dz.classList.remove('success');
          dz.innerHTML = `<strong>Drop saved replay HTML here</strong><br><span style="font-size:0.9em;">(or click to choose a file)</span>`;
        }
      }

      // Empty-team warning
      const warning = $('#gf-no-team-warning');
      if (warning) warning.style.display = myMons.length === 0 ? 'block' : 'none';
    },

    setRadioPill(group, value) {
      $$(`.radio-pill[data-group="${group}"]`).forEach(pill => {
        const checked = pill.dataset.value === value;
        pill.classList.toggle('checked', checked);
        const input = pill.querySelector('input[type="radio"]');
        if (input) input.checked = checked;
      });
    },

    getRadioPill(group) {
      const checked = $(`.radio-pill[data-group="${group}"].checked`);
      return checked ? checked.dataset.value : '';
    },

    // Checkbox-style: multiple values can be selected.
    setCheckPills(group, values) {
      const set = new Set(values || []);
      $$(`.radio-pill[data-group="${group}"]`).forEach(pill => {
        const checked = set.has(pill.dataset.value);
        pill.classList.toggle('checked', checked);
        const input = pill.querySelector('input[type="checkbox"]');
        if (input) input.checked = checked;
      });
    },

    getCheckPills(group) {
      return $$(`.radio-pill[data-group="${group}"].checked`).map(p => p.dataset.value);
    },

    updateLessonCounter() {
      const el = $('#gf-lesson');
      const counter = $('#gf-lesson-counter');
      if (!el || !counter) return;
      const len = el.value.length;
      counter.textContent = `${len.toLocaleString()} chars`;
      // Soft visual nudge only if extremely long (~AI-output sized)
      counter.classList.toggle('warn', len > 1500);
    },

    save(saveAndAnother) {
      const result = this.getRadioPill('result');
      const errorTypes = this.getCheckPills('errorTypes');

      if (!result) {
        toast.error('Pick a result (W or L) before saving.');
        return false;
      }

      const myLead = [$('#gf-my-lead-0').value, $('#gf-my-lead-1').value].filter(Boolean);
      const myFour = [
        $('#gf-my-four-0').value, $('#gf-my-four-1').value,
        $('#gf-my-four-2').value, $('#gf-my-four-3').value,
      ].filter(Boolean);
      const theirLeadGuess = [
        $('#gf-their-lead-0').value.trim(),
        $('#gf-their-lead-1').value.trim(),
      ].filter(Boolean);

      const replayUrl = $('#gf-replay-url').value.trim();
      let replayObj = null;
      if (replayUrl || this.pendingReplayLog) {
        replayObj = {
          url: replayUrl || null,
          embeddedLog: this.pendingReplayLog || null,
          savedAt: new Date().toISOString(),
        };
      }
      if (replayUrl && !isShowdownReplayUrl(replayUrl)) {
        const proceed = confirm(
          'That URL doesn\'t look like a Pokémon Showdown replay link. Save anyway?'
        );
        if (!proceed) return false;
      }

      const phase2Tags = {
        threatChecklistDone: $('#gf-p2-threat-checklist')?.checked || false,
        commitmentSentence: ($('#gf-p2-commitment')?.value || '').trim(),
        supportFirstMoveAuditDone: $('#gf-p2-support-audit')?.checked || false,
        strategic1HpUsed: $('#gf-p2-1hp-used')?.checked || false,
        strategic1HpNote: ($('#gf-p2-1hp-note')?.value || '').trim(),
        switchReasons: this.getCheckPills('switchReasons'),
      };

      const game = {
        id: this.editingId || uid('g'),
        playedAt: inputLocalToIso($('#gf-played-at').value),
        result,
        preGame: {
          myWinCondition: $('#gf-my-wc').value.trim(),
          theirWinConditionGuess: $('#gf-their-wc').value.trim(),
          myLead,
          theirLeadGuess,
          myFour,
        },
        replay: replayObj,
        pivotalTurn: parseInt($('#gf-pivotal-turn').value, 10) || null,
        errorTypes,
        lesson: $('#gf-lesson').value.trim(),
        phase2Tags,
      };

      // Remember the expand state of the Phase 2 tags block per user preference
      const tagsBlock = $('#gf-phase2-tags');
      if (tagsBlock && state.phase2 && state.phase2.uiState) {
        state.phase2.uiState.phase2TagsExpanded = tagsBlock.hasAttribute('open');
      }

      if (this.editingId) {
        const idx = state.games.findIndex(g => g.id === this.editingId);
        if (idx !== -1) state.games[idx] = game;
        toast.success('Game updated.');
      } else {
        state.games.push(game);
        toast.success(`Game logged. (${state.games.length} total)`);
      }
      persist();
      Dashboard.render();

      if (saveAndAnother) {
        this.editingId = null;
        this.pendingReplayLog = null;
        this.populate(null);
        const wcEl = $('#gf-my-wc');
        if (wcEl) wcEl.focus();
      } else {
        Tabs.switchTo('dashboard');
      }
      // Backup nudge after every 5 games
      if (state.games.length > 0 && state.games.length % 5 === 0) {
        const last = state.settings.lastExportedAt;
        const ageDays = last ? (Date.now() - new Date(last).getTime()) / 86400000 : Infinity;
        if (ageDays >= BACKUP_NUDGE_DAYS) {
          toast.warn(`${state.games.length} games logged, last backup ${formatRelativeTime(last)}. Back up now?`,
            { sticky: true, action: { label: 'Download', fn: exportData } });
        }
      }
      return true;
    },

    attach() {
      // Pill click — multi-select if the parent has data-multi="true",
      // single-select otherwise.
      $$('.radio-pill').forEach(pill => {
        pill.addEventListener('click', e => {
          // Don't double-handle when the click was on the inner input itself.
          if (e.target instanceof HTMLInputElement) return;
          e.preventDefault();
          const parent = pill.closest('.radio-pills');
          const isMulti = parent && parent.dataset.multi === 'true';
          if (isMulti) {
            const wasChecked = pill.classList.contains('checked');
            pill.classList.toggle('checked', !wasChecked);
            const input = pill.querySelector('input[type="checkbox"]');
            if (input) input.checked = !wasChecked;
          } else {
            this.setRadioPill(pill.dataset.group, pill.dataset.value);
          }
        });
      });

      // Lesson counter
      const lesson = $('#gf-lesson');
      if (lesson) lesson.addEventListener('input', () => this.updateLessonCounter());

      // Now button
      const nowBtn = $('#gf-played-at-now');
      if (nowBtn) {
        nowBtn.addEventListener('click', () => {
          $('#gf-played-at').value = isoToInputLocal(new Date().toISOString());
        });
      }

      // Save buttons
      $('#gf-save').addEventListener('click', e => { e.preventDefault(); this.save(false); });
      $('#gf-save-another').addEventListener('click', e => { e.preventDefault(); this.save(true); });
      $('#gf-cancel').addEventListener('click', e => {
        e.preventDefault();
        Tabs.switchTo('dashboard');
      });

      // Phase 2 1-HP-used toggle reveals the note textarea
      const oneHp = $('#gf-p2-1hp-used');
      if (oneHp) {
        oneHp.addEventListener('change', () => {
          const noteWrap = $('#gf-p2-1hp-note-wrapper');
          if (noteWrap) noteWrap.style.display = oneHp.checked ? 'block' : 'none';
        });
      }

      // Replay file drop / pick
      const dz = $('#gf-replay-dropzone');
      const fileInput = $('#gf-replay-file');
      if (dz && fileInput) {
        dz.addEventListener('click', e => {
          const target = e.target;
          if (target instanceof HTMLElement && target.dataset.action === 'clear-log') {
            this.pendingReplayLog = null;
            dz.classList.remove('success');
            dz.innerHTML = `<strong>Drop saved replay HTML here</strong><br><span style="font-size:0.9em;">(or click to choose a file)</span>`;
            e.stopPropagation();
            return;
          }
          fileInput.click();
        });
        dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
        dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
        dz.addEventListener('drop', e => {
          e.preventDefault();
          dz.classList.remove('dragover');
          const file = e.dataTransfer.files[0];
          if (file) this.loadReplayFile(file);
        });
        fileInput.addEventListener('change', e => {
          const file = e.target.files[0];
          if (file) this.loadReplayFile(file);
        });
      }
    },

    loadReplayFile(file) {
      if (!/\.html?$/i.test(file.name)) {
        toast.error('That doesn\'t look like an HTML replay file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const log = parseReplayHtml(reader.result);
        if (!log) {
          toast.error('Could not find a battle log inside that file. Was it saved from Showdown?');
          return;
        }
        this.pendingReplayLog = log;
        const dz = $('#gf-replay-dropzone');
        if (dz) {
          dz.classList.add('success');
          dz.innerHTML = `✅ Battle log embedded (${log.length.toLocaleString()} chars). <button class="btn-secondary" type="button" data-action="clear-log" style="margin-left:8px;">Clear</button>`;
        }
        toast.success('Replay log captured.');
      };
      reader.onerror = () => toast.error('Could not read that file.');
      reader.readAsText(file);
    },
  };

  // ---------------------------------------------------------------
  // Team profile form
  // ---------------------------------------------------------------
  const TeamForm = {
    populate() {
      const t = state.currentTeam || { name: '', sourceUrl: '', format: '', mons: [], reverseEngineeringNotes: '' };
      $('#tf-name').value = t.name || '';
      $('#tf-source').value = t.sourceUrl || '';
      $('#tf-format').value = t.format || '';
      $('#tf-notes').value = t.reverseEngineeringNotes || '';
      for (let i = 0; i < 6; i++) {
        const el = $('#tf-mon-' + i);
        if (el) el.value = (t.mons && t.mons[i]) || '';
      }
    },
    save() {
      const mons = [];
      for (let i = 0; i < 6; i++) {
        const v = $('#tf-mon-' + i).value.trim();
        if (v) mons.push(v);
      }
      // Preserve Phase 2 fields (speedMap, defensiveBenchmarks) when re-saving the team basics.
      const existing = state.currentTeam || {};
      state.currentTeam = {
        name: $('#tf-name').value.trim(),
        sourceUrl: $('#tf-source').value.trim(),
        format: $('#tf-format').value.trim(),
        mons,
        reverseEngineeringNotes: $('#tf-notes').value,
        speedMap: existing.speedMap || [],
        defensiveBenchmarks: existing.defensiveBenchmarks || [],
      };
      persist();
      toast.success('Team saved.');
      Dashboard.render();
      Phase2.renderAll();
    },
    attach() {
      $('#tf-save').addEventListener('click', e => { e.preventDefault(); this.save(); });
    },
  };

  // ===============================================================
  // PHASE 2 MODULE
  // Renders + handles: reading checklist, checkpoint self-attest,
  // speed map editor, defensive benchmarks editor, prediction drills,
  // replay drills, dashboard Phase 2 card.
  // ===============================================================
  const Phase2 = {
    renderAll() {
      this.renderReading();
      this.renderCheckpoint();
      this.renderSpeedMap();
      this.renderBenchmarks();
      this.renderPredictionDrills();
      this.renderReplayDrills();
      this.renderDashboardCard();
    },

    // -----------------------------------------------------------
    // Reading checklist
    // -----------------------------------------------------------
    renderReading() {
      const list = $('#reading-list');
      const badge = $('#reading-badge');
      if (!list) return;
      const progress = state.phase2.readingProgress;
      const totalRead = PHASE2_READING.filter(r => progress[r.slug]?.read).length;
      if (badge) {
        badge.textContent = `${totalRead} / ${PHASE2_READING.length} read`;
        badge.classList.toggle('complete', totalRead === PHASE2_READING.length);
      }
      list.innerHTML = PHASE2_READING.map(r => {
        const entry = progress[r.slug] || { read: false, readAt: null, notes: '' };
        const checkClass = entry.read ? 'reading-check checked' : 'reading-check';
        const checkMark = entry.read ? '✓' : '';
        const dateLabel = entry.readAt ? formatRelativeTime(entry.readAt) : '';
        return `
          <li class="reading-row-wrapper">
            <div class="reading-row-main">
              <span class="${checkClass}" data-action="reading-toggle" data-slug="${escapeHtml(r.slug)}">${checkMark}</span>
              <span class="reading-title"><a href="${escapeHtml(r.url)}" target="_blank" rel="noopener">${escapeHtml(r.title)}</a></span>
              <span class="reading-date">${entry.read ? `Read ${escapeHtml(dateLabel)}` : ''}</span>
            </div>
            <textarea data-action="reading-notes" data-slug="${escapeHtml(r.slug)}" placeholder="Optional notes — what stuck...">${escapeHtml(entry.notes || '')}</textarea>
          </li>
        `;
      }).join('');
    },

    toggleReading(slug) {
      const p = state.phase2.readingProgress;
      if (!p[slug]) p[slug] = { read: false, readAt: null, notes: '' };
      p[slug].read = !p[slug].read;
      p[slug].readAt = p[slug].read ? new Date().toISOString() : null;
      persist();
      this.renderReading();
      this.renderDashboardCard();
    },

    updateReadingNotes(slug, notes) {
      const p = state.phase2.readingProgress;
      if (!p[slug]) p[slug] = { read: false, readAt: null, notes: '' };
      p[slug].notes = notes;
      // Debounced persist on textarea typing handled by event listener
      persist();
    },

    markAllRead() {
      const now = new Date().toISOString();
      for (const r of PHASE2_READING) {
        if (!state.phase2.readingProgress[r.slug]) {
          state.phase2.readingProgress[r.slug] = { read: false, readAt: null, notes: '' };
        }
        const e = state.phase2.readingProgress[r.slug];
        e.read = true;
        if (!e.readAt) e.readAt = now;
      }
      persist();
      this.renderReading();
      this.renderDashboardCard();
      toast.success('All Phase 2 reading marked as read.');
    },

    // -----------------------------------------------------------
    // Checkpoint self-attest
    // -----------------------------------------------------------
    renderCheckpoint() {
      const list = $('#checkpoint-list');
      const badge = $('#checkpoint-badge');
      const summary = $('#checkpoint-summary');
      if (!list) return;
      const cp = state.phase2.checkpoint;
      const passed = PHASE2_CHECKPOINT.filter(c => cp[c.key]?.passed).length;
      if (badge) {
        badge.textContent = `${passed} / ${PHASE2_CHECKPOINT.length} verified`;
        badge.classList.toggle('complete', passed >= 4);
      }
      if (summary) {
        if (passed >= 4) {
          summary.innerHTML = `<div class="checkpoint-summary ready">✅ ${passed} of 6 honestly verified — you can advance to Phase 3.</div>`;
        } else {
          summary.innerHTML = `<div class="checkpoint-summary">${passed} of 6 honestly verified — keep going. Need 4 to advance.</div>`;
        }
      }
      list.innerHTML = PHASE2_CHECKPOINT.map(c => {
        const entry = cp[c.key] || { passed: false, evidence: '' };
        const status = entry.passed ? 'passed' : (entry.evidence ? 'failed' : 'untested');
        const evidenceRequired = !entry.evidence && status !== 'untested';
        return `
          <li class="checkpoint-item" data-key="${escapeHtml(c.key)}">
            <div class="checkpoint-item-head">
              <div class="checkpoint-item-label">
                <div class="label-title">${escapeHtml(c.label)}</div>
                <div class="label-help">${escapeHtml(c.help)}</div>
              </div>
              <div class="tri-pill-group">
                <button class="tri-pill ${status === 'untested' ? 'active untested' : ''}" type="button" data-action="cp-status" data-key="${escapeHtml(c.key)}" data-value="untested">Untested</button>
                <button class="tri-pill ${status === 'failed' ? 'active failed' : ''}" type="button" data-action="cp-status" data-key="${escapeHtml(c.key)}" data-value="failed">Failed</button>
                <button class="tri-pill ${status === 'passed' ? 'active passed' : ''}" type="button" data-action="cp-status" data-key="${escapeHtml(c.key)}" data-value="passed">Passed</button>
              </div>
            </div>
            <textarea class="checkpoint-evidence${evidenceRequired ? ' required' : ''}" data-action="cp-evidence" data-key="${escapeHtml(c.key)}" placeholder="Evidence — describe what you know / can do, with an example. Required to mark passed.">${escapeHtml(entry.evidence || '')}</textarea>
            ${status === 'passed' && !entry.evidence ? '<div class="checkpoint-evidence-hint">⚠️ Evidence is required to keep "passed" status. Add a note or it will revert.</div>' : ''}
          </li>
        `;
      }).join('');
    },

    setCheckpointStatus(key, value) {
      const cp = state.phase2.checkpoint;
      if (!cp[key]) cp[key] = { passed: false, evidence: '' };
      if (value === 'passed' && !cp[key].evidence.trim()) {
        toast.warn('Add evidence in the textarea before marking this passed.');
        cp[key].passed = false;
        this.renderCheckpoint();
        return;
      }
      cp[key].passed = (value === 'passed');
      // 'failed' and 'untested' both set passed=false; the difference is whether evidence exists.
      if (value === 'untested') cp[key].evidence = '';
      persist();
      this.renderCheckpoint();
      this.renderDashboardCard();
    },

    updateCheckpointEvidence(key, text) {
      const cp = state.phase2.checkpoint;
      if (!cp[key]) cp[key] = { passed: false, evidence: '' };
      cp[key].evidence = text;
      persist();
    },

    // -----------------------------------------------------------
    // Speed map editor
    // -----------------------------------------------------------
    renderSpeedMap() {
      const editor = $('#speedmap-editor');
      const badge = $('#speedmap-badge');
      if (!editor) return;
      const team = state.currentTeam;
      const map = (team && team.speedMap) || [];
      const mapped = map.filter(r => r.mon && r.baseSpeed != null && (r.outspeedsAt0 || r.outspeedsUnderControl || r.outspeedBy)).length;
      const teamCount = (team?.mons?.length) || 6;
      if (badge) {
        badge.textContent = `${mapped} / ${teamCount} mapped`;
        badge.classList.toggle('complete', mapped >= teamCount && teamCount > 0);
      }
      const header = `
        <div class="speedmap-row">
          <div data-tooltip="Pokémon name. Auto-fills from your team if you use the 'Fill from team' button.">Mon <span class="tip-icon">i</span></div>
          <div data-tooltip="Base speed stat at level 50, IVs maxed, neutral nature. Look it up on Serebii/Pikalytics.">Base spd <span class="tip-icon">i</span></div>
          <div data-tooltip="Common meta Pokémon this mon outspeeds at neutral speed (no Tailwind, no Scarf). Free-form — list the actual names you see often.">Outspeeds (+0) <span class="tip-icon">i</span></div>
          <div data-tooltip="What this mon outspeeds when your team's speed control is up: Tailwind (×2), Trick Room (reversed), Choice Scarf (×1.5), Quash. Different speed-control modes can be listed separately.">Outspeeds (under control) <span class="tip-icon">i</span></div>
          <div data-tooltip="What common meta mons outspeed THIS mon. At +0 OR under their Tailwind / Scarf / etc. The threat-identification axis: knowing what you can't outpace is more important than knowing what you can.">Outspeed by <span class="tip-icon">i</span></div>
          <div></div>
        </div>
      `;
      const rows = map.map((row, i) => `
        <div class="speedmap-row" data-idx="${i}">
          <input type="text" data-field="mon" value="${escapeHtml(row.mon || '')}" placeholder="Mon">
          <input type="number" data-field="baseSpeed" value="${row.baseSpeed ?? ''}" placeholder="Speed">
          <textarea data-field="outspeedsAt0" placeholder="Common mons you beat at +0">${escapeHtml(row.outspeedsAt0 || '')}</textarea>
          <textarea data-field="outspeedsUnderControl" placeholder="Under Tailwind / TR / Scarf">${escapeHtml(row.outspeedsUnderControl || '')}</textarea>
          <textarea data-field="outspeedBy" placeholder="What outspeeds this mon">${escapeHtml(row.outspeedBy || '')}</textarea>
          <div class="row-actions"><button type="button" class="delete-btn" data-action="speedmap-delete" data-idx="${i}" title="Delete row">×</button></div>
        </div>
      `).join('');

      // Computed snapshot
      let snapshot = '';
      if (map.length) {
        const speeds = map.filter(r => r.baseSpeed != null && r.mon).map(r => ({ mon: r.mon, spd: Number(r.baseSpeed) }));
        if (speeds.length) {
          const fastest = speeds.reduce((a, b) => a.spd > b.spd ? a : b);
          const slowest = speeds.reduce((a, b) => a.spd < b.spd ? a : b);
          snapshot = `
            <div class="speedmap-snapshot">
              <strong>Snapshot:</strong>
              fastest = ${escapeHtml(fastest.mon)} (${fastest.spd})
              · slowest = ${escapeHtml(slowest.mon)} (${slowest.spd})
              · under Tailwind, fastest reaches ${fastest.spd * 2}
              · under TR, ${escapeHtml(slowest.mon)} moves first
            </div>
          `;
        }
      }
      editor.innerHTML = header + rows + snapshot;
    },

    fillSpeedMapFromTeam() {
      const team = state.currentTeam;
      if (!team || !team.mons || team.mons.length === 0) {
        toast.warn('Set up the team first (mons list).');
        return;
      }
      if (!Array.isArray(team.speedMap)) team.speedMap = [];
      const existing = new Set(team.speedMap.map(r => r.mon));
      for (const m of team.mons) {
        if (!existing.has(m)) {
          team.speedMap.push({ mon: m, baseSpeed: null, outspeedsAt0: '', outspeedsUnderControl: '', outspeedBy: '' });
        }
      }
      persist();
      this.renderSpeedMap();
      this.renderDashboardCard();
    },

    addSpeedMapRow() {
      const team = state.currentTeam;
      if (!team) { toast.warn('Set up the team first.'); return; }
      if (!Array.isArray(team.speedMap)) team.speedMap = [];
      team.speedMap.push({ mon: '', baseSpeed: null, outspeedsAt0: '', outspeedsUnderControl: '', outspeedBy: '' });
      persist();
      this.renderSpeedMap();
    },

    deleteSpeedMapRow(idx) {
      const team = state.currentTeam;
      if (!team || !Array.isArray(team.speedMap)) return;
      team.speedMap.splice(idx, 1);
      persist();
      this.renderSpeedMap();
      this.renderDashboardCard();
    },

    updateSpeedMapField(idx, field, value) {
      const team = state.currentTeam;
      if (!team || !Array.isArray(team.speedMap) || !team.speedMap[idx]) return;
      if (field === 'baseSpeed') {
        team.speedMap[idx][field] = value === '' ? null : Number(value);
      } else {
        team.speedMap[idx][field] = value;
      }
      persist();
      // Don't re-render on every keystroke; only the snapshot would change.
      // Re-render only the snapshot? For now, skip — change will show on next render.
    },

    // -----------------------------------------------------------
    // Defensive benchmarks editor
    // -----------------------------------------------------------
    renderBenchmarks() {
      const editor = $('#benchmarks-editor');
      const badge = $('#benchmarks-badge');
      if (!editor) return;
      const team = state.currentTeam;
      const bms = (team && team.defensiveBenchmarks) || [];
      const benchmarkedCount = bms.filter(b => b.mon && (b.vsThreats?.length || 0) > 0).length;
      if (badge) {
        badge.textContent = `${benchmarkedCount} mon${benchmarkedCount === 1 ? '' : 's'} benchmarked`;
        badge.classList.toggle('complete', benchmarkedCount >= 3);
      }
      if (bms.length === 0) {
        editor.innerHTML = `<div class="empty-state">No defensive mons benchmarked yet. Click "Add defensive mon" below.</div>`;
        return;
      }
      editor.innerHTML = bms.map((b, monIdx) => {
        const threats = b.vsThreats || [];
        const threatHeader = `
          <div class="benchmark-attacker-row">
            <div data-tooltip="Opposing Pokémon you're benchmarking against. Pick the top 3-5 meta attackers your team will actually face.">Attacker <span class="tip-icon">i</span></div>
            <div data-tooltip="Their most threatening move against this defensive mon. If they have multiple dangerous moves, add a row per move.">Move <span class="tip-icon">i</span></div>
            <div data-tooltip="Damage range from Pikalytics calc, like '44-52%'. Use the calc — don't guess.">Damage% <span class="tip-icon">i</span></div>
            <div data-tooltip="Does this mon survive that attacker's strongest hit at 100% HP? Click to toggle ✓/✗.">@100% <span class="tip-icon">i</span></div>
            <div data-tooltip="Does it survive at 75% HP? Important because by mid-game your mon is rarely at full.">@75% <span class="tip-icon">i</span></div>
            <div data-tooltip="Does it survive at 50% HP? The 'is this mon still useful late-game' threshold.">@50% <span class="tip-icon">i</span></div>
            <div data-tooltip="What item / EV / type change would push 'barely dies' into 'lives one hit'? Notes go here, e.g. '+12 SpD' or 'Tera Steel saves it'.">Fix if fails <span class="tip-icon">i</span></div>
            <div></div>
          </div>
        `;
        const threatRows = threats.map((t, tIdx) => `
          <div class="benchmark-attacker-row" data-mon-idx="${monIdx}" data-threat-idx="${tIdx}">
            <input type="text" data-field="attacker" value="${escapeHtml(t.attacker || '')}" placeholder="e.g. Calyrex-S">
            <input type="text" data-field="move" value="${escapeHtml(t.move || '')}" placeholder="e.g. Astral Barrage">
            <input type="text" data-field="damagePct" value="${escapeHtml(t.damagePct || '')}" placeholder="e.g. 44-52%">
            <div class="survives-cell"><button type="button" class="survives-toggle ${t.survivesAtFull ? 'yes' : 'no'}" data-action="benchmark-survives" data-mon-idx="${monIdx}" data-threat-idx="${tIdx}" data-survives-key="survivesAtFull">${t.survivesAtFull ? '✓' : '✗'}</button></div>
            <div class="survives-cell"><button type="button" class="survives-toggle ${t.survivesAt75 ? 'yes' : 'no'}" data-action="benchmark-survives" data-mon-idx="${monIdx}" data-threat-idx="${tIdx}" data-survives-key="survivesAt75">${t.survivesAt75 ? '✓' : '✗'}</button></div>
            <div class="survives-cell"><button type="button" class="survives-toggle ${t.survivesAt50 ? 'yes' : 'no'}" data-action="benchmark-survives" data-mon-idx="${monIdx}" data-threat-idx="${tIdx}" data-survives-key="survivesAt50">${t.survivesAt50 ? '✓' : '✗'}</button></div>
            <textarea data-field="fixIfFails" placeholder="e.g. +EV Def / Tera Steel">${escapeHtml(t.fixIfFails || '')}</textarea>
            <div class="row-actions"><button type="button" class="delete-btn" data-action="benchmark-delete-threat" data-mon-idx="${monIdx}" data-threat-idx="${tIdx}" title="Delete attacker row">×</button></div>
          </div>
        `).join('');
        return `
          <div class="benchmark-mon-block" data-mon-idx="${monIdx}">
            <div class="benchmark-mon-head">
              <input type="text" data-field="mon" value="${escapeHtml(b.mon || '')}" placeholder="Defensive mon name" data-mon-idx="${monIdx}">
              <input type="text" data-field="spread" value="${escapeHtml(b.spread || '')}" placeholder='Spread / item, e.g. "252 HP / 252 Def, Bold, AV"' style="flex:2;" data-mon-idx="${monIdx}">
              <button type="button" class="delete-btn" data-action="benchmark-delete-mon" data-mon-idx="${monIdx}">Remove mon</button>
            </div>
            ${threatHeader}
            ${threatRows || '<div class="empty-state">No attackers added yet.</div>'}
            <div style="margin-top:10px;"><button type="button" class="btn-secondary" data-action="benchmark-add-threat" data-mon-idx="${monIdx}">+ Add attacker</button></div>
          </div>
        `;
      }).join('');
    },

    addBenchmarkMon() {
      const team = state.currentTeam;
      if (!team) { toast.warn('Set up the team first.'); return; }
      if (!Array.isArray(team.defensiveBenchmarks)) team.defensiveBenchmarks = [];
      team.defensiveBenchmarks.push({ mon: '', spread: '', vsThreats: [] });
      persist();
      this.renderBenchmarks();
    },

    deleteBenchmarkMon(monIdx) {
      const team = state.currentTeam;
      if (!team || !Array.isArray(team.defensiveBenchmarks)) return;
      team.defensiveBenchmarks.splice(monIdx, 1);
      persist();
      this.renderBenchmarks();
      this.renderDashboardCard();
    },

    addBenchmarkThreat(monIdx) {
      const team = state.currentTeam;
      if (!team || !team.defensiveBenchmarks[monIdx]) return;
      if (!Array.isArray(team.defensiveBenchmarks[monIdx].vsThreats)) team.defensiveBenchmarks[monIdx].vsThreats = [];
      team.defensiveBenchmarks[monIdx].vsThreats.push({
        attacker: '', move: '', damagePct: '',
        survivesAtFull: false, survivesAt75: false, survivesAt50: false,
        fixIfFails: '',
      });
      persist();
      this.renderBenchmarks();
    },

    deleteBenchmarkThreat(monIdx, threatIdx) {
      const team = state.currentTeam;
      if (!team || !team.defensiveBenchmarks[monIdx]) return;
      team.defensiveBenchmarks[monIdx].vsThreats.splice(threatIdx, 1);
      persist();
      this.renderBenchmarks();
    },

    toggleBenchmarkSurvives(monIdx, threatIdx, key) {
      const team = state.currentTeam;
      if (!team || !team.defensiveBenchmarks[monIdx]?.vsThreats[threatIdx]) return;
      const t = team.defensiveBenchmarks[monIdx].vsThreats[threatIdx];
      t[key] = !t[key];
      persist();
      this.renderBenchmarks();
    },

    updateBenchmarkMonField(monIdx, field, value) {
      const team = state.currentTeam;
      if (!team || !team.defensiveBenchmarks[monIdx]) return;
      team.defensiveBenchmarks[monIdx][field] = value;
      persist();
    },

    updateBenchmarkThreatField(monIdx, threatIdx, field, value) {
      const team = state.currentTeam;
      if (!team || !team.defensiveBenchmarks[monIdx]?.vsThreats[threatIdx]) return;
      team.defensiveBenchmarks[monIdx].vsThreats[threatIdx][field] = value;
      persist();
    },

    // -----------------------------------------------------------
    // Prediction drills
    // -----------------------------------------------------------
    renderPredictionDrills() {
      const list = $('#prediction-drills-list');
      const badge = $('#prediction-badge');
      if (!list) return;
      const drills = state.phase2.predictionDrills || [];
      const passed = drills.filter(d => d.summary?.passed).length;
      if (badge) {
        badge.textContent = `${passed} / ${drills.length || 0} passed${drills.length >= 5 ? ' ✅' : ''}`;
        badge.classList.toggle('complete', passed >= 3);
      }
      if (drills.length === 0) {
        list.innerHTML = `<div class="empty-state">No prediction sessions logged yet. Click "+ New prediction session" below.</div>`;
        return;
      }
      const sorted = [...drills].sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt));
      list.innerHTML = sorted.map(d => {
        const total = d.summary?.totalTurns || (d.turns?.length || 0);
        const correct = d.summary?.correctTurns || 0;
        const passClass = d.summary?.passed ? '' : 'failed';
        const passLabel = d.summary?.passed ? 'PASS' : 'FAIL';
        const gameLink = d.gameId ? `<span class="drill-game-id">${escapeHtml(d.gameId)}</span>` : '';
        const turnsTable = (d.turns && d.turns.length) ? `
          <table class="drill-turns-table">
            <thead><tr><th>Turn</th><th>Predicted move</th><th>Predicted damage</th><th>Move?</th><th>Dmg?</th></tr></thead>
            <tbody>
              ${d.turns.map(t => `
                <tr>
                  <td>${t.turn}</td>
                  <td>${escapeHtml(t.predictedMove || '—')}</td>
                  <td>${escapeHtml(t.predictedDamage || '—')}</td>
                  <td class="${t.moveCorrect ? 'correct-yes' : 'correct-no'}">${t.moveCorrect ? '✓' : '✗'}</td>
                  <td class="${t.damageCorrect ? 'correct-yes' : 'correct-no'}">${t.damageCorrect ? '✓' : '✗'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '';
        return `
          <div class="drill-entry-card">
            <div class="drill-entry-head">
              <span class="drill-date">${escapeHtml(formatGameDate(d.playedAt))}</span>
              ${gameLink}
              <span class="pass-badge ${passClass}">${passLabel}</span>
              <span class="drill-accuracy">${correct}/${total} turns fully right</span>
              <button type="button" class="btn-secondary" data-action="prediction-delete" data-id="${escapeHtml(d.id)}" style="margin-left:8px;">Delete</button>
            </div>
            ${turnsTable}
          </div>
        `;
      }).join('');
    },

    newPredictionDrill() {
      // Modal-style form using existing modal infrastructure
      const games = [...state.games].sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt));
      const gameOptions = games.slice(0, 30).map(g =>
        `<option value="${escapeHtml(g.id)}">${escapeHtml(formatGameDate(g.playedAt))} — ${g.result} — ${escapeHtml((g.preGame?.myLead || []).join('+') || '?')}</option>`
      ).join('');
      $('#modal-content').innerHTML = `
        <h2>New prediction session</h2>
        <p style="color:var(--fg-muted);font-size:0.95em;">For each turn you predicted, fill in what you guessed and whether you were right after the turn played out.</p>
        <div class="form-field">
          <label>Linked game</label>
          <select id="pd-game-select"><option value="">— None / freeform —</option>${gameOptions}</select>
        </div>
        <div class="form-field">
          <label>How many turns will you log?</label>
          <input type="number" id="pd-turn-count" min="1" max="20" value="5">
          <button class="btn-secondary" type="button" data-action="pd-rebuild-turns">Build turn rows</button>
        </div>
        <div id="pd-turns-container"></div>
        <div class="modal-actions">
          <button class="btn-secondary" data-action="close-modal">Cancel</button>
          <button class="btn-big-primary" data-action="pd-save">💾 Save session</button>
        </div>
      `;
      $('#modal-overlay').classList.add('visible');
      // Build initial 5 turns
      this.rebuildPredictionTurnRows(5);
    },

    rebuildPredictionTurnRows(count) {
      count = Math.max(1, Math.min(20, parseInt(count, 10) || 5));
      const container = $('#pd-turns-container');
      if (!container) return;
      const header = `
        <div class="drill-form-turn-row">
          <div>Turn</div>
          <div>Predicted move</div>
          <div>Predicted damage</div>
          <div>Move right?</div>
          <div>Dmg right?</div>
        </div>
      `;
      const rows = [];
      for (let i = 1; i <= count; i++) {
        rows.push(`
          <div class="drill-form-turn-row" data-turn="${i}">
            <div class="turn-num">${i}</div>
            <input type="text" data-pd-field="predictedMove" placeholder="e.g. Astral Barrage spread">
            <input type="text" data-pd-field="predictedDamage" placeholder="e.g. ~50% on Sableye, OHKO Tornadus">
            <label class="compact-check"><input type="checkbox" data-pd-field="moveCorrect"></label>
            <label class="compact-check"><input type="checkbox" data-pd-field="damageCorrect"></label>
          </div>
        `);
      }
      container.innerHTML = header + rows.join('');
    },

    savePredictionDrill() {
      const gameId = $('#pd-game-select')?.value || null;
      const rows = $$('#pd-turns-container .drill-form-turn-row[data-turn]');
      const turns = rows.map(row => {
        const turn = parseInt(row.dataset.turn, 10);
        const move = row.querySelector('[data-pd-field="predictedMove"]').value.trim();
        const damage = row.querySelector('[data-pd-field="predictedDamage"]').value.trim();
        const moveCorrect = row.querySelector('[data-pd-field="moveCorrect"]').checked;
        const damageCorrect = row.querySelector('[data-pd-field="damageCorrect"]').checked;
        return { turn, predictedMove: move, predictedDamage: damage, moveCorrect, damageCorrect };
      }).filter(t => t.predictedMove || t.predictedDamage);
      const correctTurns = turns.filter(t => t.moveCorrect && t.damageCorrect).length;
      const drill = {
        id: uid('pd'),
        gameId,
        playedAt: gameId ? (state.games.find(g => g.id === gameId)?.playedAt) : new Date().toISOString(),
        turns,
        summary: { totalTurns: turns.length, correctTurns, passed: correctTurns >= 1 },
      };
      state.phase2.predictionDrills.push(drill);
      persist();
      $('#modal-overlay').classList.remove('visible');
      this.renderPredictionDrills();
      this.renderDashboardCard();
      toast.success('Prediction session saved.');
    },

    deletePredictionDrill(id) {
      if (!confirm('Delete this prediction session?')) return;
      state.phase2.predictionDrills = state.phase2.predictionDrills.filter(d => d.id !== id);
      persist();
      this.renderPredictionDrills();
      this.renderDashboardCard();
    },

    // -----------------------------------------------------------
    // Replay drills
    // -----------------------------------------------------------
    renderReplayDrills() {
      const list = $('#replay-drills-list');
      const badge = $('#replay-badge');
      if (!list) return;
      const drills = state.phase2.replayDrills || [];
      const weekAgo = Date.now() - 7 * 86400000;
      const thisWeek = drills.filter(d => new Date(d.date).getTime() >= weekAgo).length;
      if (badge) {
        badge.textContent = `${drills.length} total · ${thisWeek} this week`;
        badge.classList.toggle('complete', thisWeek >= 1);
      }
      if (drills.length === 0) {
        list.innerHTML = `<div class="empty-state">No replay drills logged yet. Aim for 1/week.</div>`;
        return;
      }
      const sorted = [...drills].sort((a, b) => new Date(b.date) - new Date(a.date));
      list.innerHTML = sorted.map(d => {
        const correct = (d.turns || []).filter(t => t.correct).length;
        const total = (d.turns || []).length;
        return `
          <div class="replay-drill-card">
            <div class="replay-drill-head">
              <span class="replay-date">${escapeHtml(formatGameDate(d.date))}</span>
              ${d.replayUrl ? `<a href="${escapeHtml(d.replayUrl)}" target="_blank" rel="noopener">Open replay ↗</a>` : ''}
              <span class="replay-accuracy">${correct}/${total} turns correct</span>
              <button type="button" class="btn-secondary" data-action="replay-delete" data-id="${escapeHtml(d.id)}" style="margin-left:8px;">Delete</button>
            </div>
            ${d.replayTitle ? `<div class="replay-title">${escapeHtml(d.replayTitle)}</div>` : ''}
            ${(d.turns || []).map((t, i) => `
              <div style="display:flex;gap:8px;align-items:baseline;padding:4px 0;font-size:0.9em;">
                <strong style="flex:0 0 60px;">Turn ${i + 1}:</strong>
                <span style="flex:2;"><strong>Predicted:</strong> ${escapeHtml(t.predicted || '—')}</span>
                <span style="flex:0 0 60px;" class="${t.correct ? 'correct-yes' : 'correct-no'}">${t.correct ? '✓' : '✗'}</span>
                <span style="flex:2;"><strong>Caster's reason:</strong> ${escapeHtml(t.casterReason || '—')}</span>
              </div>
            `).join('')}
            ${d.lesson ? `<div class="replay-lesson"><strong>Lesson:</strong> ${escapeHtml(d.lesson)}</div>` : ''}
          </div>
        `;
      }).join('');
    },

    newReplayDrill() {
      $('#modal-content').innerHTML = `
        <h2>Log replay drill</h2>
        <p style="color:var(--fg-muted);font-size:0.95em;">3 turns from one replay is the standard cadence. ~15 min.</p>
        <div class="form-field">
          <label for="rd-url">Replay URL</label>
          <input type="url" id="rd-url" placeholder="YouTube or Showdown URL">
        </div>
        <div class="form-field">
          <label for="rd-title">Replay title (optional)</label>
          <input type="text" id="rd-title" placeholder="e.g. VGC 2026 Bochum Top 8">
        </div>
        ${[1, 2, 3].map(i => `
          <div class="form-field" style="border-top:1px dashed var(--border);padding-top:14px;">
            <label>Turn ${i}</label>
            <input type="text" id="rd-t${i}-predicted" placeholder="What you predicted" style="margin-bottom:6px;">
            <label class="compact-check"><input type="checkbox" id="rd-t${i}-correct"> <span>Was correct?</span></label>
            <input type="text" id="rd-t${i}-caster" placeholder="What the caster said the actual move was / why" style="margin-top:6px;">
          </div>
        `).join('')}
        <div class="form-field">
          <label for="rd-lesson">Lesson</label>
          <textarea id="rd-lesson" rows="3" placeholder="What did you learn?"></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" data-action="close-modal">Cancel</button>
          <button class="btn-big-primary" data-action="rd-save">💾 Save drill</button>
        </div>
      `;
      $('#modal-overlay').classList.add('visible');
    },

    saveReplayDrill() {
      const turns = [1, 2, 3].map(i => ({
        predicted: $(`#rd-t${i}-predicted`).value.trim(),
        correct: $(`#rd-t${i}-correct`).checked,
        casterReason: $(`#rd-t${i}-caster`).value.trim(),
      })).filter(t => t.predicted || t.casterReason);
      const drill = {
        id: uid('rd'),
        date: new Date().toISOString(),
        replayUrl: $('#rd-url').value.trim(),
        replayTitle: $('#rd-title').value.trim(),
        turns,
        turnsAnalyzed: turns.length,
        turnsCorrect: turns.filter(t => t.correct).length,
        lesson: $('#rd-lesson').value.trim(),
      };
      state.phase2.replayDrills.push(drill);
      persist();
      $('#modal-overlay').classList.remove('visible');
      this.renderReplayDrills();
      this.renderDashboardCard();
      toast.success('Replay drill saved.');
    },

    deleteReplayDrill(id) {
      if (!confirm('Delete this replay drill?')) return;
      state.phase2.replayDrills = state.phase2.replayDrills.filter(d => d.id !== id);
      persist();
      this.renderReplayDrills();
      this.renderDashboardCard();
    },

    // -----------------------------------------------------------
    // Dashboard Phase 2 card
    // -----------------------------------------------------------
    renderDashboardCard() {
      const card = $('#dash-phase2');
      if (!card) return;
      const p2 = state.phase2 || emptyPhase2();
      const team = state.currentTeam;

      const reading = PHASE2_READING.filter(r => p2.readingProgress[r.slug]?.read).length;
      const speedMapped = ((team?.speedMap) || []).filter(r => r.mon && r.baseSpeed != null).length;
      const teamCount = (team?.mons?.length) || 6;
      const benchmarked = ((team?.defensiveBenchmarks) || []).filter(b => b.mon && (b.vsThreats?.length || 0) > 0).length;
      const predDrills = p2.predictionDrills || [];
      const predPassed = predDrills.filter(d => d.summary?.passed).length;
      const weekAgo = Date.now() - 7 * 86400000;
      const replayWeek = (p2.replayDrills || []).filter(d => new Date(d.date).getTime() >= weekAgo).length;
      const checkpointPassed = PHASE2_CHECKPOINT.filter(c => p2.checkpoint[c.key]?.passed).length;

      // Readiness: 4/6 thresholds met → green
      const ready = (
        reading >= PHASE2_READING.length &&
        speedMapped >= teamCount &&
        benchmarked >= 3 &&
        predPassed >= 3 &&
        replayWeek >= 1 &&
        checkpointPassed >= 4
      );
      card.classList.toggle('ready', ready);

      const item = (label, val, total, tooltip) => {
        const isDone = total ? val >= total : val > 0;
        const valStr = total ? `${val} / ${total}` : `${val}`;
        const tipAttr = tooltip ? ` data-tooltip="${escapeHtml(tooltip)}"` : '';
        return `<li><span class="label"${tipAttr}>${label} <span class="tip-icon">i</span></span><span class="value ${isDone ? 'done' : ''}">${valStr}${isDone ? ' ✓' : ''}</span></li>`;
      };

      card.innerHTML = `
        <h3>Phase 2 progress${ready ? ' — ready for Phase 3 ✅' : ''}</h3>
        <ul class="phase2-progress-list">
          ${item('Reading', reading, PHASE2_READING.length, '6 Phase 2 articles to read. Mark off as you finish in Drills tab → Reading progress. Notes textarea per article for what stuck.')}
          ${item('Speed map', speedMapped, teamCount, 'Per-mon table of base speed + what each mon outspeeds + what outspeeds it. Fill once per team in Team tab → ⚡ Speed map. ~30 min exercise.')}
          ${item('Benchmarks', benchmarked, 3, 'Per-defensive-mon table: top meta attackers + damage% + does it survive at full/75/50% HP. Fill once per team in Team tab → 🛡️ Defensive benchmarks. Target: at least 3 mons. ~45 min exercise.')}
          ${item('Prediction drills (pass)', predPassed, 3, 'Phase 2 hard test: log 5 sessions where you predict the opponent\'s move + damage per turn. A session passes if ≥1 turn was fully right (move AND damage). Need 3 of 5 sessions passing to clear the checkpoint.')}
          ${item('Replay drills this week', replayWeek, 1, 'Weekly 15-min drill: pause a pro replay before each turn, write what you would do, watch what the player did + caster\'s reasoning. Log in Drills tab → 📺 Replay drill log.')}
          ${item('Checkpoint verified', checkpointPassed, 4, '6 self-attest checkpoint items. Evidence textarea required to mark "passed" — forces actual articulation. Need 4 of 6 passed to advance to Phase 3.')}
        </ul>
        <button class="btn-secondary" data-action="goto-drills">Open Drills →</button>
      `;
    },
  };

  // ---------------------------------------------------------------
  // Game detail modal (click row)
  // ---------------------------------------------------------------
  function openGameModal(gameId) {
    const g = state.games.find(x => x.id === gameId);
    if (!g) return;
    const myLead = (g.preGame?.myLead || []).join(' + ');
    const theirLead = (g.preGame?.theirLeadGuess || []).join(' + ');
    const myFour = (g.preGame?.myFour || []).join(', ');
    const replayLink = g.replay?.url
      ? `<a href="${escapeHtml(g.replay.url)}" target="_blank" rel="noopener">Open on Showdown ↗</a>`
      : (g.replay?.embeddedLog ? '<em>HTML log embedded</em>' : '<span style="color:var(--fg-muted);">none</span>');
    const rawLogBtn = g.replay?.embeddedLog
      ? `<button class="btn-secondary" data-action="show-log">View raw log</button>`
      : '';

    const types = gameErrorTypes(g);
    const errorTypesHtml = types.length === 0
      ? `<span class="error-tag none">No error</span>`
      : types.map(t => `<span class="error-tag ${t}">${escapeHtml(ERROR_TYPES[t])}</span>`).join(' ');

    // Helper to render long text fields with preserved line breaks.
    // If the value is short (<60 chars, no newlines), render inline.
    // Otherwise stack the label above the value as a "block" row.
    function renderField(label, raw, opts = {}) {
      const value = (raw == null || raw === '') ? '' : String(raw);
      const isEmpty = !value;
      const display = isEmpty ? '—' : escapeHtml(value);
      const isLong = value.length > 60 || /\n/.test(value);
      if (isLong && !opts.forceInline) {
        return `<li class="kv-block">
          <div class="k">${escapeHtml(label)}</div>
          <div class="v text-block">${display}</div>
        </li>`;
      }
      return `<li><span class="k">${escapeHtml(label)}</span><span class="v">${opts.html || display}</span></li>`;
    }

    $('#modal-content').innerHTML = `
      <h2>Game on ${escapeHtml(formatGameDate(g.playedAt))} — <span class="result-pill ${g.result}">${g.result}</span></h2>
      <ul class="kv-list">
        ${renderField('My WC', g.preGame?.myWinCondition)}
        ${renderField('Their WC (guess)', g.preGame?.theirWinConditionGuess)}
        ${renderField('My lead', myLead, { forceInline: true })}
        ${renderField('Their lead', theirLead, { forceInline: true })}
        ${renderField('My 4', myFour, { forceInline: true })}
        ${renderField('Pivotal turn', g.pivotalTurn || '—', { forceInline: true })}
        <li><span class="k">Error types</span><span class="v">${errorTypesHtml}</span></li>
        ${renderField('Lesson', g.lesson)}
        <li><span class="k">Replay</span><span class="v">${replayLink} ${rawLogBtn}</span></li>
      </ul>
      <div class="modal-actions">
        <button class="btn-secondary" data-action="delete-game">Delete</button>
        <button class="btn-secondary" data-action="edit-game">Edit</button>
        <button class="btn-big-primary" data-action="close-modal">Close</button>
      </div>
    `;
    $('#modal-overlay').classList.add('visible');

    $('#modal-content').addEventListener('click', e => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const action = t.dataset.action;
      if (action === 'show-log') {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay visible';
        overlay.innerHTML = `
          <div class="modal">
            <h2>Raw battle log</h2>
            <pre>${escapeHtml(g.replay.embeddedLog)}</pre>
            <div class="modal-actions">
              <button class="btn-big-primary" data-action="close-overlay">Close</button>
            </div>
          </div>
        `;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', ev => {
          if (ev.target === overlay || (ev.target instanceof HTMLElement && ev.target.dataset.action === 'close-overlay')) {
            overlay.remove();
          }
        });
      } else if (action === 'edit-game') {
        $('#modal-overlay').classList.remove('visible');
        GameForm.openEdit(g.id);
      } else if (action === 'delete-game') {
        if (confirm('Delete this game? Cannot be undone (unless you re-import a backup).')) {
          state.games = state.games.filter(x => x.id !== g.id);
          persist();
          $('#modal-overlay').classList.remove('visible');
          Dashboard.render();
          toast.success('Game deleted.');
        }
      } else if (action === 'close-modal') {
        $('#modal-overlay').classList.remove('visible');
      }
    }, { once: true });
  }

  // ---------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------
  const Tabs = {
    switchTo(name) {
      $$('.tab-button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
      $$('.tab-panel').forEach(p => p.classList.toggle('active', p.dataset.tab === name));
      if (name === 'dashboard') Dashboard.render();
      if (name === 'log-game') {
        // populate fresh if not editing
        if (!GameForm.editingId) GameForm.populate(null);
      }
      if (name === 'team') {
        TeamForm.populate();
        Phase2.renderSpeedMap();
        Phase2.renderBenchmarks();
      }
      if (name === 'drills') {
        Phase2.renderReading();
        Phase2.renderCheckpoint();
        Phase2.renderPredictionDrills();
        Phase2.renderReplayDrills();
      }
      // Update URL hash without scrolling
      const newHash = '#' + name;
      if (location.hash !== newHash) {
        history.replaceState(null, '', location.pathname + newHash);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  };

  // ---------------------------------------------------------------
  // Export / import
  // ---------------------------------------------------------------
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vgc-log-${today}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    state.settings.lastExportedAt = new Date().toISOString();
    persist();
    Dashboard.render();
    toast.success('Backup downloaded.');
  }

  // ---------------------------------------------------------------
  // Markdown export (for AI analysis)
  // Lighter than full JSON: drops embeddedLog, keeps all structured fields,
  // adds summary stats. Easy to paste into ChatGPT / Claude / Gemini.
  // ---------------------------------------------------------------
  function buildMarkdown() {
    const team = state.currentTeam;
    const games = [...state.games].sort((a, b) =>
      new Date(a.playedAt) - new Date(b.playedAt));
    const today = new Date().toISOString().slice(0, 10);

    const wins = games.filter(g => g.result === 'W').length;
    const losses = games.filter(g => g.result === 'L').length;
    const wr = games.length ? Math.round(wins / games.length * 100) : 0;
    // Per-game distribution: count "no error" games separately from each error type.
    // A game with multiple error types contributes to each of its types.
    const errorCounts = { knowledge: 0, positioning: 0, planning: 0 };
    let cleanGames = 0;
    for (const g of games) {
      const types = gameErrorTypes(g);
      if (types.length === 0) cleanGames++;
      for (const t of types) errorCounts[t]++;
    }

    const period = games.length
      ? `${games[0].playedAt.slice(0, 10)} → ${games[games.length - 1].playedAt.slice(0, 10)}`
      : '(no games yet)';

    const lines = [];
    lines.push(`# VGC Training Log — exported ${today}`);
    lines.push('');
    lines.push(`> A human/AI-readable summary of all games logged in the VGC training tool. Schema v${SCHEMA_VERSION}.`);
    lines.push('> Drop this into ChatGPT, Claude, or Gemini and ask for analysis (suggested prompt at the bottom).');
    lines.push('> If a `## Phase 2 progress` section is present below, the player is working through Phase 2 — see prompt Mode C for an audit-style review of that work.');
    lines.push('> Embedded battle logs are *not* included to keep this file small — see the JSON backup if you need them.');
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Period covered**: ${period}`);
    lines.push(`- **Total games**: ${games.length}`);
    lines.push(`- **Record**: ${wins}W – ${losses}L (${wr}% win rate)`);
    lines.push('- **Error type distribution** (each game can count toward multiple types):');
    for (const [k, v] of Object.entries(errorCounts)) {
      if (v > 0) lines.push(`  - ${ERROR_TYPES[k]}: ${v} game${v === 1 ? '' : 's'} (${Math.round(v / games.length * 100)}%)`);
    }
    if (cleanGames > 0) {
      lines.push(`  - No error flagged: ${cleanGames} game${cleanGames === 1 ? '' : 's'} (${Math.round(cleanGames / games.length * 100)}%)`);
    }
    lines.push('');

    // Top error types in losses (Phase 1 checkpoint)
    const { rows: topErrors, lossesAnalyzed } = topErrorTypesInLastNLosses(games, 10);
    if (lossesAnalyzed > 0) {
      lines.push(`### Top error types in last ${lossesAnalyzed} losses`);
      lines.push('');
      topErrors.forEach(([type, count], i) => {
        lines.push(`${i + 1}. ${ERROR_TYPES[type]} — ${count}×`);
      });
      lines.push('');
    }

    // Tilt
    const { sessionsExamined, tiltSessions } = tiltStatus(games);
    if (sessionsExamined > 0) {
      lines.push('### Tilt protocol (last 14 days)');
      lines.push('');
      lines.push(`- Sessions examined: ${sessionsExamined}`);
      lines.push(`- Sessions with 3+ consecutive losses: ${tiltSessions} ${tiltSessions === 0 ? '✅' : '⚠️'}`);
      lines.push('');
    }

    // Team
    if (team) {
      lines.push('## Current team');
      lines.push('');
      lines.push(`- **Name**: ${team.name || '—'}`);
      lines.push(`- **Format**: ${team.format || '—'}`);
      if (team.sourceUrl) lines.push(`- **Source**: ${team.sourceUrl}`);
      if (team.mons?.length) lines.push(`- **Mons**: ${team.mons.join(', ')}`);
      lines.push('');
      if (team.reverseEngineeringNotes) {
        lines.push('### Reverse-engineering notes');
        lines.push('');
        lines.push(team.reverseEngineeringNotes);
        lines.push('');
      }
    }

    // Games (chronological)
    lines.push('## Games (chronological)');
    lines.push('');
    if (games.length === 0) {
      lines.push('_No games logged yet._');
      lines.push('');
    }
    for (const g of games) {
      const date = new Date(g.playedAt).toISOString().replace('T', ' ').slice(0, 16);
      const myLead = (g.preGame?.myLead || []).join(' + ') || '—';
      const theirLead = (g.preGame?.theirLeadGuess || []).join(' + ') || '—';
      const myFour = (g.preGame?.myFour || []).join(', ') || '—';
      const resultIcon = g.result === 'W' ? '🏆 Win' : '💀 Loss';

      // Multi-line text helper: render long fields as their own block to keep
      // markdown clean and readable for AI ingestion.
      function fieldBlock(label, raw) {
        const value = (raw == null || raw === '') ? '—' : String(raw);
        const isLong = value.length > 80 || /\n/.test(value);
        if (isLong) {
          // Use blockquote so multi-paragraph content is visually grouped.
          const indented = value.split('\n').map(line => '  > ' + line).join('\n');
          return `- **${label}**:\n${indented}`;
        }
        return `- **${label}**: ${value}`;
      }

      const types = gameErrorTypes(g);
      const errorLabel = types.length === 0
        ? 'None / clean game'
        : types.map(t => ERROR_TYPES[t]).join(', ');

      lines.push(`### ${date} — ${resultIcon} (${g.id})`);
      lines.push('');
      lines.push(fieldBlock('My WC', g.preGame?.myWinCondition));
      lines.push(fieldBlock('Their WC (guess)', g.preGame?.theirWinConditionGuess));
      lines.push(`- **My lead**: ${myLead}`);
      lines.push(`- **Their lead**: ${theirLead}`);
      lines.push(`- **My 4**: ${myFour}`);
      if (g.pivotalTurn) lines.push(`- **Pivotal turn**: ${g.pivotalTurn}`);
      lines.push(`- **Error type${types.length > 1 ? 's' : ''}**: ${errorLabel}`);
      if (g.lesson) lines.push(fieldBlock('Lesson', g.lesson));
      if (g.replay?.url) lines.push(`- **Replay URL**: ${g.replay.url}`);
      if (g.replay?.embeddedLog) lines.push(`- **Embedded log**: present (${g.replay.embeddedLog.length.toLocaleString()} chars; not included in this export — see JSON backup)`);

      // Phase 2 tags (only emit if any are set, to keep Phase 1-only exports clean)
      const p2tags = g.phase2Tags;
      if (p2tags && (p2tags.threatChecklistDone || p2tags.supportFirstMoveAuditDone || p2tags.strategic1HpUsed || p2tags.commitmentSentence || (p2tags.switchReasons || []).length)) {
        lines.push('- **Phase 2 tags**:');
        if (p2tags.commitmentSentence) lines.push(`  - Pre-T1 commitment: ${p2tags.commitmentSentence}`);
        if (p2tags.threatChecklistDone) lines.push('  - ✓ Threat-type checklist done');
        if (p2tags.supportFirstMoveAuditDone) lines.push('  - ✓ Support-mon first-move audit done');
        if (p2tags.strategic1HpUsed) lines.push(`  - ✓ Used a low-HP mon strategically${p2tags.strategic1HpNote ? `: ${p2tags.strategic1HpNote}` : ''}`);
        if ((p2tags.switchReasons || []).length) lines.push(`  - Switch reasons triggered: ${p2tags.switchReasons.map(r => SWITCH_REASONS[r] || r).join(', ')}`);
      }
      lines.push('');
    }

    // ---- Phase 2 section (only if there's anything to show) ----
    const p2 = state.phase2 || emptyPhase2();
    const hasPhase2Content = (
      Object.values(p2.readingProgress || {}).some(r => r?.read) ||
      ((state.currentTeam?.speedMap) || []).length > 0 ||
      ((state.currentTeam?.defensiveBenchmarks) || []).length > 0 ||
      (p2.predictionDrills || []).length > 0 ||
      (p2.replayDrills || []).length > 0 ||
      Object.values(p2.checkpoint || {}).some(c => c?.passed || c?.evidence)
    );
    if (hasPhase2Content) {
      lines.push('## Phase 2 progress');
      lines.push('');

      // Reading progress
      const readEntries = PHASE2_READING.filter(r => p2.readingProgress[r.slug]?.read);
      if (readEntries.length) {
        lines.push(`### Reading progress: ${readEntries.length} / ${PHASE2_READING.length} read`);
        lines.push('');
        for (const r of PHASE2_READING) {
          const entry = p2.readingProgress[r.slug];
          const mark = entry?.read ? '✓' : '☐';
          const when = entry?.readAt ? ` (${entry.readAt.slice(0, 10)})` : '';
          const notes = entry?.notes ? ` — _${entry.notes}_` : '';
          lines.push(`- ${mark} **${r.title}**${when}${notes}`);
        }
        lines.push('');
      }

      // Speed map
      const speedMap = state.currentTeam?.speedMap || [];
      if (speedMap.length) {
        lines.push(`### Speed map (${speedMap.filter(r => r.baseSpeed != null).length} mapped)`);
        lines.push('');
        for (const row of speedMap) {
          lines.push(`#### ${row.mon || '(unnamed)'} — base ${row.baseSpeed ?? '?'}`);
          if (row.outspeedsAt0) lines.push(`- **Outspeeds at +0**: ${row.outspeedsAt0}`);
          if (row.outspeedsUnderControl) lines.push(`- **Outspeeds under control**: ${row.outspeedsUnderControl}`);
          if (row.outspeedBy) lines.push(`- **Outspeed by**: ${row.outspeedBy}`);
          lines.push('');
        }
      }

      // Defensive benchmarks
      const bms = state.currentTeam?.defensiveBenchmarks || [];
      if (bms.length) {
        lines.push(`### Defensive benchmarks (${bms.length} mons)`);
        lines.push('');
        for (const b of bms) {
          lines.push(`#### ${b.mon || '(unnamed)'}${b.spread ? ` — ${b.spread}` : ''}`);
          if ((b.vsThreats || []).length === 0) {
            lines.push('- (no attackers benchmarked yet)');
          } else {
            lines.push('| Attacker | Move | Damage | @Full | @75% | @50% | Fix if fails |');
            lines.push('|---|---|---|---|---|---|---|');
            for (const t of b.vsThreats) {
              const f = t.survivesAtFull ? '✓' : '✗';
              const s75 = t.survivesAt75 ? '✓' : '✗';
              const s50 = t.survivesAt50 ? '✓' : '✗';
              lines.push(`| ${t.attacker || '?'} | ${t.move || '?'} | ${t.damagePct || '?'} | ${f} | ${s75} | ${s50} | ${t.fixIfFails || ''} |`);
            }
          }
          lines.push('');
        }
      }

      // Prediction drills
      const predDrills = p2.predictionDrills || [];
      if (predDrills.length) {
        const passed = predDrills.filter(d => d.summary?.passed).length;
        lines.push(`### Prediction drills: ${passed} / ${predDrills.length} passed (need 3/5 to pass Phase 2 hard test)`);
        lines.push('');
        for (const d of [...predDrills].sort((a, b) => new Date(a.playedAt) - new Date(b.playedAt))) {
          lines.push(`#### ${d.playedAt.slice(0, 10)} — ${d.summary?.passed ? 'PASS' : 'FAIL'} (${d.summary?.correctTurns || 0}/${d.summary?.totalTurns || 0} fully right)${d.gameId ? ` — linked to game \`${d.gameId}\`` : ''}`);
          for (const t of d.turns || []) {
            const m = t.moveCorrect ? '✓' : '✗';
            const dmg = t.damageCorrect ? '✓' : '✗';
            lines.push(`- Turn ${t.turn}: predicted move "${t.predictedMove || '?'}" [move:${m}] · damage "${t.predictedDamage || '?'}" [dmg:${dmg}]`);
          }
          lines.push('');
        }
      }

      // Replay drills
      const replayDrills = p2.replayDrills || [];
      if (replayDrills.length) {
        lines.push(`### Replay drills: ${replayDrills.length} total`);
        lines.push('');
        for (const d of [...replayDrills].sort((a, b) => new Date(a.date) - new Date(b.date))) {
          lines.push(`#### ${d.date.slice(0, 10)}${d.replayTitle ? ` — ${d.replayTitle}` : ''}`);
          if (d.replayUrl) lines.push(`- URL: ${d.replayUrl}`);
          for (let i = 0; i < (d.turns || []).length; i++) {
            const t = d.turns[i];
            lines.push(`- Turn ${i + 1}: predicted "${t.predicted || '?'}" — ${t.correct ? '✓' : '✗'} — caster's reason: ${t.casterReason || '—'}`);
          }
          if (d.lesson) lines.push(`- **Lesson**: ${d.lesson}`);
          lines.push('');
        }
      }

      // Checkpoint
      const cpAny = Object.values(p2.checkpoint || {}).some(c => c?.passed || c?.evidence);
      if (cpAny) {
        const passedCount = PHASE2_CHECKPOINT.filter(c => p2.checkpoint[c.key]?.passed).length;
        lines.push(`### Phase 2 checkpoint: ${passedCount} / 6 verified${passedCount >= 4 ? ' — ready for Phase 3' : ''}`);
        lines.push('');
        for (const c of PHASE2_CHECKPOINT) {
          const entry = p2.checkpoint[c.key];
          const status = entry?.passed ? '✅ PASSED' : (entry?.evidence ? '❌ failed' : '☐ untested');
          lines.push(`#### ${c.label} — ${status}`);
          if (entry?.evidence) lines.push(`> ${entry.evidence.split('\n').join('\n> ')}`);
          lines.push('');
        }
      }
    }

    // Suggested AI prompt at the bottom — persona-driven structured review.
    // Designed to force depth: an AI dropped just a flat question list will
    // answer at the surface level. A persona + required output structure +
    // explicit framework vocabulary pushes them to coach, not summarize.
    lines.push('---');
    lines.push('');
    lines.push('## Suggested AI analysis prompt');
    lines.push('');
    lines.push('Paste this above the log file when handing it to an AI (Claude, ChatGPT, Gemini, etc.):');
    lines.push('');
    lines.push('```');
    lines.push(buildAiPrompt());
    lines.push('```');
    lines.push('');

    return lines.join('\n');
  }

  function buildAiPrompt() {
    return `PERSONA
You are reviewing this VGC training log with the standards of a high-level VGC player — combine the styles of Wolfe Glick (2016 World Champion, known for process-driven mentality and high-level strategic theory) and Aaron "Cybertron" Zheng (multi-time regional/national champion, prolific VGC educator known for systematic teaching). Be principle-driven AND concrete. You are a coach, not a cheerleader. The user is paying for scrutiny, not validation.

FRAMEWORKS YOU SHOULD ACTIVELY APPLY (use this vocabulary)
- Process over outcome: score by decision quality, not result. A clean loss is a successful game; a sloppy win is a failed game.
- "Pokémon is an information game": plateaus come from information gaps, not effort gaps.
- Position > Damage: prescribe moves that advance the position next turn, not raw damage this turn.
- Error type taxonomy: Knowledge gap (didn't know an interaction) / Positioning error (misplayed a known state) / Planning failure (no clear win condition, reactive play).
- Board state per turn: Advantage / Neutral / Losing — reads belong only in Losing states; Advantage demands safety; Neutral demands setting up the win condition.
- Core / Solvers / Enablers: every team slot must advance OR protect the win condition.
- Resource-management audit (regulation-agnostic): if the current format provides any once-per-battle high-leverage mechanic, each use is a saved resource. Classify intent as Offensive (secure a KO) / Defensive (prevent loss) / Tempo (flip board pressure). Audit each use as good / too-early / too-late / misused. Common failure modes across mechanics: greed (saved past usefulness), panic (used before threat materialized), win-more (used while already winning).
- Format-agnostic fundamentals: speed control, redirection, Fake Out tempo, double-targeting, spread-move math (75% per target when hitting two), switch reads, Protect timing, status conditions, priority moves. These survive every regulation change — anchor your analysis on them.

DO NOT assume any specific format mechanic. Don't reference any current or past mechanic by name (Terastallization, Dynamax, Mega Evolution, Z-Moves, etc.) unless the user explicitly mentions it first. Speak about "the format's once-per-battle resource" generically. The frameworks above are intentionally regulation-agnostic.

DATA SHAPE OF THIS LOG
- Each game has: pre-game (my WC, my guess of opp WC, my lead, opp lead, my 4), post-game (pivotal turn, errorTypes LIST, lesson).
- errorTypes is a list — a single game can be tagged with multiple types simultaneously (Knowledge AND Positioning, etc.). Empty list = clean game.
- WC and Lesson can be multi-paragraph (block-quoted). Some are AI-refined from earlier sessions.
- Some games have a Showdown replay URL or "Embedded log: present" note. If embedded logs are included, they're in Showdown protocol format ("|move|...", "|-damage|...", "|-status|...", "|switch|...") — read them line by line and cite turn numbers.

============================================================
CHOOSE YOUR MODE BASED ON WHAT I ASK
============================================================

If I'm asking for an overall review (patterns across all games, "where am I plateauing", "what should I work on") → use MODE A.

If I'm asking about ONE specific game (by game ID like "g-abc123", or "the loss on May 4", or "this game"), or I've pasted just one game's data → use MODE B.

If I'm asking about my Phase 2 readiness specifically — "am I ready for Phase 3", "audit my speed map", "audit my benchmarks", "did I do the Phase 2 work right", or the log contains a "## Phase 2 progress" section that's the focus of my question → use MODE C.

If unclear, ask me which mode I want before producing output.

============================================================
MODE A — FULL LOG REVIEW (multi-game patterns)
============================================================

Produce this exact 5-section review:

### 1. VERDICT (3-5 sentences)
Where I am right now, what's working, what's broken. Reference rate of progress across the games shown. No softening.

### 2. TEAM SCRUTINY
Audit the current team via Core / Solvers / Enablers:
- Is the core actually expressing a clear win condition, or is it 6 strong mons with no plan?
- Are the solvers solving real meta threats, or theoretical ones?
- Speed control inventory: what does the team rely on? What kills it?
- Single biggest structural weakness — name it directly.

### 3. PRE-GAME DISCIPLINE (across all logged games)
- Are my stated WCs reachable from the leads I picked, or aspirational?
- Patterns where my opp-WC guess was wrong in the same direction (consistent direction = a Knowledge gap to close).
- Lead matchups I systematically lose. Name specific lead pairs.

### 4. TURN-LEVEL EXECUTION PATTERNS (where battle logs are present)
Look across games for repeating turn-level mistakes:
- Targeting errors (focused wrong mon, ignored a 1-vs-4 threat)
- Protect timing (over-Protect, missed Protect, consecutive-Protect at 1/3 success)
- Resource-mechanic uses — intent + audit per press, by turn number (use generic phrasing as instructed above)
- Switching errors (stayed when should have switched, or vice versa)
- When confident, prescribe the BETTER MOVE at the specific game/turn. Mark each [CONFIDENT] or [SPECULATION].

### 5. PRESCRIPTION (close with this)
- **Top 3 habits to drill** before the next 10 games, ranked by impact.
- **One specific knowledge gap** to close this week (specific mon / move / item / interaction).
- **One mental or process change** (tilt patterns, results-based reasoning, autopilot, etc.).
- **The single most actionable thing** if I did nothing else.

============================================================
MODE B — SINGLE-GAME DEEP DIVE (one game, granular)
============================================================

When I want one game scrutinized, produce a thorough breakdown — aim for at least 3–5x the depth of a Mode A turn-level pass. Spend more tokens here. The point is to extract maximum learning from the single game.

Produce this exact 7-section breakdown:

### 1. PRE-GAME AUDIT
- Did my stated WC actually fit the opponent's team composition? If not, what was a realistic WC given the matchup?
- Was my lead choice correct? List the 2–3 best lead options against their team and explain why each is better/worse than what I picked.
- Did I bring the right 4? If not, which of my 2 benched mons should have come instead, and what would have changed?
- If I missed an "obvious combination" on the opponent's team (Fake Out + setup, redirection + sweeper, weather + abusers, speed control + nuke, etc.), name it.

### 2. TURN-BY-TURN WALKTHROUGH (only if embedded log is present) — COMPLETENESS IS MANDATORY

**Step 1 — count the turns.** Before producing any turn analysis, scan the embedded log for "|turn|N" markers (or count "|move|" pairs if turn markers are absent) and state the count explicitly as the first line of this section. Format: "This game has N turns."

**Step 2 — produce exactly N blocks, numbered 1 through N.** Use this exact format for each:

> **Turn N — Board state: [Advantage / Neutral / Losing]**
> - **Information available going in**: what I knew + what was just revealed last turn
> - **Optimal play given that information**: the move(s) that maximize EV
> - **My actual play**: what the log shows I did
> - **Diff**: same / different / worse / wrong. If different and you're confident, prescribe the better play and explain in one sentence.
> - **Information bits revealed this turn**: opp moves, items shown (e.g. Sitrus trigger), abilities triggered, speed tier confirmations — flag the ones I likely missed.
> - **Tag**: [CONFIDENT] or [SPECULATION] for any prescription.

**Step 3 — close the section.** After Turn N's block, write this literal line on its own:

> END OF WALKTHROUGH — N turns analyzed.

Do NOT write that line until every turn from 1 to N has its own block.

**HARD RULES — VIOLATIONS BREAK THIS REVIEW**
- Do NOT skip, abbreviate, batch, or summarize any turn. A 25-turn game gets 25 separate blocks. A 40-turn game gets 40 separate blocks.
- Do NOT write phrases like "turns 5–10 followed similar patterns," "the rest of the game played out predictably," "I'll skip the obvious turns," or any other shortcut. Every turn earns its own complete block, even if patterns repeat across turns. Repetition is itself signal.
- Do NOT condense the format (e.g. dropping bullet points to save space). Every block must include all six bullets above.
- The user explicitly chose Mode B because they want maximum depth on this single game. Token budget is not a concern — thoroughness is the deliverable.

**IF YOUR RESPONSE WOULD HIT A LENGTH LIMIT before reaching turn N**: do NOT shorten earlier turns. Instead, output complete blocks for as many turns as fit, then end the message with:

> CONTINUE FROM TURN K — please reply "continue" to resume the walkthrough.

The user will reply "continue" and you produce the remaining blocks (and only the remaining blocks) starting at Turn K, then proceed with §3 onward.

**IF NO EMBEDDED LOG IS PRESENT**: write "No embedded log present — skipping turn-by-turn walkthrough." on a single line. Do not fabricate a walkthrough from the structured fields. Move to §3.

### 3. PIVOTAL TURN CHECK
- I marked turn N as the pivotal one. Do you agree?
- If yes: was my response on that turn the right one?
- If no: what was the actual pivotal turn, and why?
- Be specific about the precise move/decision that swung the game.

### 4. ERROR TYPE CHECK
- I self-tagged this game with these error types: [list them].
- Do you agree, partially agree, or disagree?
- If a type I tagged isn't supported by the log, say so. If a type I missed IS supported, name it (most often: I tagged "Positioning" when the actual root cause was "Planning failure" — no clear WC driving plays).

### 5. CORRECTED LINE
From the actual pivotal turn forward, walk through the corrected sequence in this format:
> **Turn N**: do X because Y.
> **Turn N+1**: do Z because W.
> ...

Stop when the game would have been won, or when you reach a fork that can't be reasoned through without more info — at which point say what info was needed.

### 6. UPGRADED LESSON
Rewrite my "Lesson" field as a 1–3 sentence takeaway that's more precise than what I wrote. Format it as a copy-pasteable block I can drop directly into the log to replace the original. Anchor it to a transferable principle (one of the frameworks above) so it generalizes beyond this matchup.

### 7. KNOWLEDGE GAPS REVEALED
List any moves, items, abilities, speed tiers, or interactions I appear not to have known going into this game. These become study targets for the next session. Format as a bulleted list with one line per gap.

============================================================
MODE C — PHASE 2 READINESS AUDIT
============================================================

Use when I'm asking specifically about my Phase 2 work — am I ready to move to Phase 3? Is my speed map any good? Are my benchmarks sane? Are my drill habits actually building anticipation, or just being filled in for show? The log contains a "## Phase 2 progress" section when this is relevant — that's where the data is.

This is a coach-grade audit. Be skeptical. Most people fill in Phase 2 deliverables superficially the first time. Tell me where I did the work and where I did the form.

Produce this exact 6-section audit:

### 1. SPEED MAP AUDIT
Look at the "Speed map" subsection. For each mon:
- Is the "Outspeeds at +0" field actually populated with real, current-meta mons, or is it vague ("most things", "fast threats")?
- Is the "Outspeeds under control" field different from "+0" in a meaningful way?
- Is the "Outspeed by" field listing actual threats the player should fear?
- Flag any mons where the speed map looks like form-fill rather than real thinking.
- If you can spot a missing common meta threat that absolutely belongs in the "Outspeed by" column for one of these mons, name it.

### 2. DEFENSIVE BENCHMARKS AUDIT
- Are the attackers listed actually the top meta attackers for the current format, or are they a random spread?
- Is the damage% column populated with realistic ranges (e.g. "44-52%") or hand-wavy ("around half")?
- Are the @Full / @75% / @50% columns answered consistently, or marked randomly?
- Flag any top-5 meta attacker that's missing from a benchmarked mon. (If you can't be sure of the current meta, say so — don't guess.)
- Identify the single biggest defensive gap exposed by these benchmarks.

### 3. PREDICTION DRILLS AUDIT
- Look at the prediction drill entries. Are the predicted moves specific ("Astral Barrage spread on Sableye + Wide Guard") or generic ("an attack")?
- Are damage predictions falsifiable ("~50% on my AV Iron Hands") or unfalsifiable ("a lot")?
- Trend: is the accuracy improving over the sessions logged, or flat?
- If accuracy is high but the predictions are vague, that's a red flag — the prediction got "right" because it was unfalsifiable.

### 4. REPLAY DRILLS AUDIT
- Quality check the lessons. Are they transferable principles or game-specific anecdotes?
- Is the player drilling diverse archetypes, or always watching the same kind of team?
- One concrete drill-diversity suggestion for next week.

### 5. CHECKPOINT EVIDENCE AUDIT
For each of the 6 checkpoint items marked "passed":
- Does the evidence textarea actually demonstrate the skill, or is it a hand-wave?
- Examples of weak evidence to call out: "I get this concept" / "yes I do this" / a one-line definition with no example.
- Examples of strong evidence: a concrete game ID with a specific turn where the skill was demonstrated, a four-step plan written out, a speed number stated without checking a calc.
- For each "passed" item with weak evidence, prescribe what would strengthen it.

### 6. VERDICT
- Ready / not yet / very close.
- If not yet: name the single most-impactful gap to close before Phase 3.
- If very close: name the 1-2 items that would tip it over.
- If ready: confirm and tell me what Phase 3's first focus should be based on what my Phase 2 work suggests about my style.

============================================================
UNIVERSAL RULES (ALL MODES)
============================================================
- Reference game IDs (the "g-..." identifiers) explicitly when speaking about specific games.
- Cite turn numbers when commenting on embedded battle logs.
- Where the evidence is clear, prescribe directly. Never hedge with "you might consider X" if X is obviously the right call.
- Where you're speculating, label the line [SPECULATION] explicitly so I know which feedback to weight.
- Don't soften. Don't pad. Don't repeat my own self-diagnosis unless you're contradicting it.
- If a section doesn't apply (e.g. no embedded log in Mode B §2, or no Phase 2 data for Mode C), say so in one line and move on. Don't fabricate.
- Don't reference current/past format-specific mechanics by name (see DO NOT rule above).
- End with one sentence: what you would tell me at this stage in a single line.`;
  }

  function exportMarkdown() {
    const md = buildMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vgc-log-${today}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Markdown summary downloaded — ready for AI analysis.');
  }

  function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        let data;
        try {
          data = JSON.parse(reader.result);
        } catch (err) {
          toast.error('That file is not valid JSON.');
          return;
        }
        if (!data || typeof data !== 'object') {
          toast.error('That file does not contain a valid backup.');
          return;
        }
        // Schema sanity check
        if (data.schemaVersion !== SCHEMA_VERSION) {
          if (!confirm(`Backup schema version is ${data.schemaVersion}, this app expects ${SCHEMA_VERSION}. Try to import anyway?`)) return;
        }

        const choice = state.games.length > 0
          ? prompt(`You currently have ${state.games.length} games and ${state.currentTeam ? '1 team' : '0 teams'} stored.\n\nType "replace" to wipe and load the file.\nType "merge" to add the file's games to existing.\nAnything else cancels.`)
          : 'replace';

        if (choice === 'replace') {
          state = Object.assign(emptyState(), data, {
            settings: Object.assign(emptyState().settings, data.settings || {}),
          });
          persist();
          Dashboard.render();
          toast.success(`Restored ${state.games.length} games.`);
        } else if (choice === 'merge') {
          const existingIds = new Set(state.games.map(g => g.id));
          const newGames = (data.games || []).filter(g => !existingIds.has(g.id));
          state.games = state.games.concat(newGames);
          if (!state.currentTeam && data.currentTeam) state.currentTeam = data.currentTeam;
          persist();
          Dashboard.render();
          toast.success(`Merged: ${newGames.length} new games added.`);
        } else {
          toast.show('Import cancelled.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // ---------------------------------------------------------------
  // Privacy banner
  // ---------------------------------------------------------------
  function maybeShowPrivacyBanner() {
    if (state.settings.privacyBannerDismissed) return;
    const el = $('#privacy-banner');
    if (el) el.style.display = 'block';
  }
  function dismissPrivacyBanner() {
    state.settings.privacyBannerDismissed = true;
    persist();
    const el = $('#privacy-banner');
    if (el) el.style.display = 'none';
  }

  // ---------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------
  function init() {
    // Storage health
    if (!Store.healthCheck()) {
      const w = $('#storage-warning');
      if (w) {
        w.classList.add('visible');
        w.innerHTML = `
          <strong>⚠️ Your browser isn't saving data.</strong>
          You may be in private/incognito mode, or storage is disabled.
          Anything you log here will be lost when you close this tab.
        `;
      }
    }

    maybeShowPrivacyBanner();

    // Privacy banner dismiss
    const dismiss = $('#privacy-dismiss');
    if (dismiss) dismiss.addEventListener('click', dismissPrivacyBanner);

    // Tab buttons
    $$('.tab-button').forEach(b => {
      b.addEventListener('click', () => Tabs.switchTo(b.dataset.tab));
    });

    // Wire up action delegate (for buttons inside dynamic HTML)
    document.addEventListener('click', e => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const actionEl = t.dataset.action ? t : t.closest('[data-action]');
      if (!actionEl) return;
      const action = actionEl.dataset.action;
      const d = actionEl.dataset;
      switch (action) {
        // Phase 1 actions
        case 'new-game': GameForm.open(); return;
        case 'export': exportData(); return;
        case 'export-md': exportMarkdown(); return;
        case 'import': importData(); return;
        case 'set-team': Tabs.switchTo('team'); return;
        case 'goto-drills': Tabs.switchTo('drills'); return;
        // Reading checklist
        case 'reading-toggle': Phase2.toggleReading(d.slug); return;
        case 'reading-mark-all': Phase2.markAllRead(); return;
        // Checkpoint
        case 'cp-status': Phase2.setCheckpointStatus(d.key, d.value); return;
        // Speed map
        case 'speedmap-fill-from-team': Phase2.fillSpeedMapFromTeam(); return;
        case 'speedmap-add-row': Phase2.addSpeedMapRow(); return;
        case 'speedmap-delete': Phase2.deleteSpeedMapRow(parseInt(d.idx, 10)); return;
        // Benchmarks
        case 'benchmark-add-mon': Phase2.addBenchmarkMon(); return;
        case 'benchmark-delete-mon': Phase2.deleteBenchmarkMon(parseInt(d.monIdx, 10)); return;
        case 'benchmark-add-threat': Phase2.addBenchmarkThreat(parseInt(d.monIdx, 10)); return;
        case 'benchmark-delete-threat': Phase2.deleteBenchmarkThreat(parseInt(d.monIdx, 10), parseInt(d.threatIdx, 10)); return;
        case 'benchmark-survives': Phase2.toggleBenchmarkSurvives(parseInt(d.monIdx, 10), parseInt(d.threatIdx, 10), d.survivesKey); return;
        // Prediction drills
        case 'new-prediction-drill': Phase2.newPredictionDrill(); return;
        case 'pd-rebuild-turns': Phase2.rebuildPredictionTurnRows($('#pd-turn-count')?.value || 5); return;
        case 'pd-save': Phase2.savePredictionDrill(); return;
        case 'prediction-delete': Phase2.deletePredictionDrill(d.id); return;
        // Replay drills
        case 'new-replay-drill': Phase2.newReplayDrill(); return;
        case 'rd-save': Phase2.saveReplayDrill(); return;
        case 'replay-delete': Phase2.deleteReplayDrill(d.id); return;
      }
    });

    // Wire up live-text-input handlers for Phase 2 fields that don't fit click-action pattern.
    // Speed map: any input/textarea inside .speedmap-row[data-idx] updates the model on change.
    document.addEventListener('input', e => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      // Reading notes textarea
      const readingNotes = t.closest('textarea[data-action="reading-notes"]');
      if (readingNotes) {
        Phase2.updateReadingNotes(readingNotes.dataset.slug, readingNotes.value);
        return;
      }
      // Checkpoint evidence textarea
      const cpEvidence = t.closest('textarea[data-action="cp-evidence"]');
      if (cpEvidence) {
        Phase2.updateCheckpointEvidence(cpEvidence.dataset.key, cpEvidence.value);
        return;
      }
      // Speed map fields
      const smRow = t.closest('.speedmap-row[data-idx]');
      if (smRow && t.dataset.field) {
        Phase2.updateSpeedMapField(parseInt(smRow.dataset.idx, 10), t.dataset.field, t.value);
        return;
      }
      // Benchmark fields — mon-level
      const bmMonInput = t.closest('.benchmark-mon-head [data-mon-idx]');
      if (bmMonInput && t.dataset.field) {
        Phase2.updateBenchmarkMonField(parseInt(bmMonInput.dataset.monIdx, 10), t.dataset.field, t.value);
        return;
      }
      // Benchmark fields — attacker-level (on .benchmark-attacker-row[data-mon-idx][data-threat-idx])
      const bmThreatRow = t.closest('.benchmark-attacker-row[data-threat-idx]');
      if (bmThreatRow && t.dataset.field) {
        Phase2.updateBenchmarkThreatField(
          parseInt(bmThreatRow.dataset.monIdx, 10),
          parseInt(bmThreatRow.dataset.threatIdx, 10),
          t.dataset.field,
          t.value,
        );
        return;
      }
    });

    // Game row click → modal
    document.addEventListener('click', e => {
      const row = e.target.closest && e.target.closest('.game-row');
      if (row && row.dataset.gameId) openGameModal(row.dataset.gameId);
    });

    // Modal overlay click-outside-to-close
    const overlay = $('#modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('visible');
      });
    }

    // Forms
    GameForm.attach();
    TeamForm.attach();

    // Initial tab from hash
    const hashTarget = (location.hash || '').replace(/^#/, '');
    if (['dashboard', 'log-game', 'team', 'drills'].includes(hashTarget)) {
      Tabs.switchTo(hashTarget);
    } else if (hashTarget === 'new') {
      GameForm.open();
    } else {
      Tabs.switchTo('dashboard');
    }

    // Initial Phase 2 render so the dashboard card has data on first paint
    Phase2.renderDashboardCard();

    // Keyboard: 'g' shortcut to log a new game from anywhere (when not focused on input)
    document.addEventListener('keydown', e => {
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        GameForm.open();
      }
    });

    // First render
    Dashboard.render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
