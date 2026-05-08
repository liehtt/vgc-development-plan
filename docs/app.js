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
  const SCHEMA_VERSION = 2;
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
  // Schema migration: v1 → v2 promotes single `errorType` string to
  // an `errorTypes` array. Runs once on load, on the in-memory state,
  // before persist() is ever called. Safe to re-run.
  // ---------------------------------------------------------------
  function migrate(s) {
    s = s || {};
    s.games = s.games || [];
    const v = s.schemaVersion || 1;
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
      };

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
      state.currentTeam = {
        name: $('#tf-name').value.trim(),
        sourceUrl: $('#tf-source').value.trim(),
        format: $('#tf-format').value.trim(),
        mons,
        reverseEngineeringNotes: $('#tf-notes').value,
      };
      persist();
      toast.success('Team saved.');
      Dashboard.render();
    },
    attach() {
      $('#tf-save').addEventListener('click', e => { e.preventDefault(); this.save(); });
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
      if (name === 'team') TeamForm.populate();
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
    lines.push('> A human/AI-readable summary of all games logged in the VGC training tool.');
    lines.push('> Drop this into ChatGPT, Claude, or Gemini and ask for analysis (suggested prompt at the bottom).');
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
      lines.push('');
    }

    // Suggested AI prompt at the bottom
    lines.push('---');
    lines.push('');
    lines.push('## Suggested AI analysis prompt');
    lines.push('');
    lines.push('Copy and paste this above the log file when handing it to an AI:');
    lines.push('');
    lines.push('```');
    lines.push('This is my VGC training log. Each game has:');
    lines.push('- pre-game: my win condition, my guess of opponent\'s WC, my leads, the 4 I brought');
    lines.push('- post-game: pivotal turn (when the game swung), self-diagnosed error types, lesson');
    lines.push('- error types are a LIST — a single game can be tagged with multiple');
    lines.push('  (knowledge gap, positioning error, planning failure). Empty list = clean game.');
    lines.push('- WC and Lesson can be multi-paragraph (block-quoted in this export).');
    lines.push('  Some are AI-refined from earlier analysis sessions.');
    lines.push('- Some games have a Showdown replay URL or "Embedded log: present" note.');
    lines.push('');
    lines.push('Analyze and tell me:');
    lines.push('1. Recurring patterns in my error types across games — including which');
    lines.push('   types tend to co-occur (e.g. "planning failures usually drag positioning');
    lines.push('   errors with them").');
    lines.push('2. Whether my self-diagnosed error types seem internally consistent with my');
    lines.push('   own lessons. Am I misjudging my own mistakes? Where?');
    lines.push('3. Any lead matchups (mine vs. theirs) where I systematically underperform.');
    lines.push('4. If you can read the embedded battle logs (Showdown protocol format,');
    lines.push('   "|move|...", "|-damage|..."), point out specific positioning mistakes I');
    lines.push('   didn\'t flag in my "lesson" field.');
    lines.push('5. One concrete drill I should focus on next based on this data.');
    lines.push('6. The single most actionable change I could make for the next 10 games.');
    lines.push('7. **When you are confident a decision was wrong, prescribe the correction.**');
    lines.push('   Apply this at every level:');
    lines.push('   - Pre-game (bad lead choice, unrealistic win condition, brought wrong 4)');
    lines.push('   - Turn-level (wrong target, mistimed Protect, premature/late Tera, bad switch)');
    lines.push('   - Game plan (the WC I described was never reachable from the position I was in)');
    lines.push('   Do NOT hedge with "you might have considered" — when the evidence is clear,');
    lines.push('   state plainly what I should have done instead, and why. Cite specific turn');
    lines.push('   numbers when commenting on embedded battle logs. Where you\'re only');
    lines.push('   speculating, say so explicitly so I know which feedback to weight.');
    lines.push('');
    lines.push("Be specific. Reference game IDs. Don't soften — I want honest review.");
    lines.push('```');
    lines.push('');

    return lines.join('\n');
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
      const action = t.dataset.action || (t.closest('[data-action]') && t.closest('[data-action]').dataset.action);
      if (!action) return;
      if (action === 'new-game') GameForm.open();
      else if (action === 'export') exportData();
      else if (action === 'export-md') exportMarkdown();
      else if (action === 'import') importData();
      else if (action === 'set-team') Tabs.switchTo('team');
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
    if (['dashboard', 'log-game', 'team'].includes(hashTarget)) {
      Tabs.switchTo(hashTarget);
    } else if (hashTarget === 'new') {
      GameForm.open();
    } else {
      Tabs.switchTo('dashboard');
    }

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
