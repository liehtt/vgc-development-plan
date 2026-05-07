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
  const SCHEMA_VERSION = 1;
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
        return Object.assign(emptyState(), parsed, {
          settings: Object.assign(emptyState().settings, parsed.settings || {}),
        });
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

  function topErrorTypesInLastNLosses(games, n = 10) {
    const losses = games
      .filter(g => g.result === 'L')
      .sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt))
      .slice(0, n);
    const counts = { knowledge: 0, positioning: 0, planning: 0 };
    for (const g of losses) {
      if (counts.hasOwnProperty(g.errorType)) counts[g.errorType]++;
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
          <h3>Backup</h3>
          <div class="backup-status">
            ${last
              ? `Last backup: <strong>${formatRelativeTime(last)}</strong>${ageDays >= BACKUP_NUDGE_DAYS ? ' — time to back up' : ''}`
              : '<strong>No backup yet.</strong> Download one to be safe.'}
          </div>
          <div class="backup-actions">
            <button class="btn-secondary" data-action="export">⬇ Download backup</button>
            <button class="btn-secondary" data-action="import">⬆ Restore from file</button>
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
                  const lesson = g.lesson || '';
                  return `
                    <tr class="game-row" data-game-id="${escapeHtml(g.id)}">
                      <td>${escapeHtml(formatGameDate(g.playedAt))}</td>
                      <td><span class="result-pill ${g.result}">${g.result}</span></td>
                      <td>${escapeHtml(myLead)}</td>
                      <td>${escapeHtml(theirLead)}</td>
                      <td><span class="error-tag ${g.errorType || 'none'}">${escapeHtml(ERROR_TYPES[g.errorType] || '—')}</span></td>
                      <td style="max-width:300px;">${escapeHtml(lesson.length > 80 ? lesson.slice(0, 80) + '…' : lesson)}</td>
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
      this.setRadioPill('errorType', g?.errorType || '');

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

    updateLessonCounter() {
      const el = $('#gf-lesson');
      const counter = $('#gf-lesson-counter');
      if (!el || !counter) return;
      const len = el.value.length;
      counter.textContent = `${len} / 200 (soft limit)`;
      counter.classList.toggle('warn', len > 200);
    },

    save(saveAndAnother) {
      const result = this.getRadioPill('result');
      const errorType = this.getRadioPill('errorType') || 'none';

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
        errorType,
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
      // Radio pill click
      $$('.radio-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          this.setRadioPill(pill.dataset.group, pill.dataset.value);
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

    $('#modal-content').innerHTML = `
      <h2>Game on ${escapeHtml(formatGameDate(g.playedAt))} — <span class="result-pill ${g.result}">${g.result}</span></h2>
      <ul class="kv-list">
        <li><span class="k">My WC</span><span class="v">${escapeHtml(g.preGame?.myWinCondition || '—')}</span></li>
        <li><span class="k">Their WC (guess)</span><span class="v">${escapeHtml(g.preGame?.theirWinConditionGuess || '—')}</span></li>
        <li><span class="k">My lead</span><span class="v">${escapeHtml(myLead || '—')}</span></li>
        <li><span class="k">Their lead</span><span class="v">${escapeHtml(theirLead || '—')}</span></li>
        <li><span class="k">My 4</span><span class="v">${escapeHtml(myFour || '—')}</span></li>
        <li><span class="k">Pivotal turn</span><span class="v">${g.pivotalTurn || '—'}</span></li>
        <li><span class="k">Error type</span><span class="v"><span class="error-tag ${g.errorType || 'none'}">${escapeHtml(ERROR_TYPES[g.errorType] || '—')}</span></span></li>
        <li><span class="k">Lesson</span><span class="v">${escapeHtml(g.lesson || '—')}</span></li>
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
