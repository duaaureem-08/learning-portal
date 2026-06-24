/* ============================================================
   HOS International — Worksheet Auto-Save
   Everything a student does is saved silently and instantly.
   Identity comes from the portal login (PIN) — no name entry needed.
   Works with:
     - Static day worksheets  → WorksheetSubmit.init('id')
     - Interactive lessons    → WorksheetSubmit.initDynamic('id')
   ============================================================ */
(function (global) {
  const SUPABASE_URL = 'https://ldftwnsixhgpfldhlkyq.supabase.co';
  const SUPABASE_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZnR3bnNpeGhncGZsZGhsa3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDM4NjMsImV4cCI6MjA5NjkxOTg2M30.EhShFmJgcsbrLqoZwA0nYfHRcCAzlS7mTkv4xHGAk_k';

  const DEBOUNCE_MS   = 1500;   // save 1.5s after last interaction
  const FALLBACK_MS   = 20000;  // hard fallback save every 20s

  // ── Who is logged in? ────────────────────────────────────────
  // index.html writes this key when a student enters their PIN.
  function getStudent() {
    return localStorage.getItem('hos_active_student') || null;
  }

  // ── Field selectors ─────────────────────────────────────────
  // Covers typed inputs, textareas, match letter boxes, order number boxes.
  // Excludes buttons, hidden, file, image, and readonly fields.
  const FIELD_SEL =
    'textarea,' +
    'input:not([type="radio"]):not([type="checkbox"]):not([type="button"])' +
    ':not([type="submit"]):not([type="file"]):not([type="hidden"])' +
    ':not([type="image"]):not([type="reset"]):not([readonly])';

  // ── Styles ───────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('ws-style')) return;
    const s = document.createElement('style');
    s.id = 'ws-style';
    s.textContent = `
      #ws-bar {
        position: fixed; bottom: 0; left: 0; right: 0;
        background: #1E1B4B; color: #fff;
        padding: 9px 16px;
        display: flex; align-items: center; gap: 10px;
        z-index: 99999; font-family: 'Nunito', sans-serif;
        box-shadow: 0 -2px 12px rgba(0,0,0,.3);
        font-size: 0.82rem; font-weight: 700;
      }
      #ws-who { font-weight: 900; color: #A5F3FC; font-size: 0.88rem; }
      #ws-indicator {
        margin-left: auto; font-size: 0.78rem; font-weight: 800;
        color: #6EE7B7; opacity: 0; transition: opacity 0.4s;
      }
      #ws-indicator.show { opacity: 1; }
      #ws-indicator.saving { color: #FCD34D; opacity: 1; }
      .ws-feedback {
        margin-top: 6px; padding: 8px 12px; border-radius: 10px;
        background: #ECFDF5; border-left: 4px solid #059669;
        font-size: 0.85rem; font-weight: 700; color: #065F46;
        font-family: 'Nunito', sans-serif;
      }
      #ws-teacher-banner {
        background: #FFFBEB; border: 2px solid #F59E0B; border-radius: 12px;
        padding: 12px 16px; margin: 12px auto; max-width: 960px;
        font-weight: 700; color: #92400E; font-family: 'Nunito', sans-serif;
      }
    `;
    document.head.appendChild(s);
  }

  function buildBar(studentName) {
    if (document.getElementById('ws-bar')) return;
    injectStyles();
    const bar = document.createElement('div');
    bar.id = 'ws-bar';
    bar.innerHTML = `
      <span>👤 Logged in as</span>
      <span id="ws-who">${studentName}</span>
      <span id="ws-indicator">💾 Saved</span>
    `;
    document.body.appendChild(bar);
    document.body.style.paddingBottom =
      (parseInt(getComputedStyle(document.body).paddingBottom) || 0) + 52 + 'px';
  }

  function flashSaved() {
    const el = document.getElementById('ws-indicator');
    if (!el) return;
    el.textContent = '💾 Saved';
    el.className = 'show';
    setTimeout(() => { el.className = ''; }, 2000);
  }

  function flashSaving() {
    const el = document.getElementById('ws-indicator');
    if (!el) return;
    el.textContent = '⏳ Saving…';
    el.className = 'saving';
  }

  // ── Label finder ─────────────────────────────────────────────
  function getLabel(el) {
    const containerSels = ['.q-block', '.analysis-box', '.fill-row', '.tf-row',
                           '.callout', '.ws-header', '.match-term', '.order-item',
                           '.card', '.step', '.blank-sentence'];
    const labelSels    = ['.q-text', '.analysis-q', 'label', '.callout-text',
                          '.tf-stmt', '.q-num', '.match-def', '.order-text'];
    for (const cs of containerSels) {
      const c = el.closest(cs);
      if (c) {
        for (const ls of labelSels) {
          const lbl = c.querySelector(ls);
          if (lbl) {
            const t = lbl.textContent.trim().replace(/\s+/g, ' ');
            if (t) return t.slice(0, 160);
          }
        }
        // fallback: use the container's own text (minus the input's value)
        const clone = c.cloneNode(true);
        clone.querySelectorAll('input,textarea,button').forEach(n => n.remove());
        const t = clone.textContent.trim().replace(/\s+/g, ' ');
        if (t) return t.slice(0, 160);
      }
    }
    if (el.placeholder) return el.placeholder.trim().slice(0, 160);
    if (el.id) return el.id;
    return null;
  }

  // ── Collect typed/written fields ─────────────────────────────
  function collectFields(root) {
    const scope = root || document;
    const fields = [];
    scope.querySelectorAll(FIELD_SEL).forEach((el, i) => {
      fields.push({
        key:   el.id || ('f_' + i),
        label: getLabel(el) || ('Field ' + (i + 1)),
        el,
      });
    });
    return fields;
  }

  // ── Collect MCQ button clicks ────────────────────────────────
  // buildQuiz() marks chosen option with .wrong or .correct class.
  function collectMCQ(root) {
    const scope = root || document;
    const items = [];
    scope.querySelectorAll('.quiz-box').forEach((box, qi) => {
      const opts = Array.from(box.querySelectorAll('.quiz-opt'));
      // options get disabled once answered
      const answered = opts.some(o => o.disabled || o.classList.contains('wrong') || o.classList.contains('correct'));
      if (!answered) return;
      const wrongBtn   = opts.find(o => o.classList.contains('wrong'));
      const correctBtn = opts.find(o => o.classList.contains('correct'));
      const chosen = wrongBtn || correctBtn;
      if (!chosen) return;
      const qText = (box.querySelector('.quiz-q') || {}).textContent || '';
      const container = box.closest('[id]');
      const key = 'mcq__' + (container ? container.id : 'box') + '__q' + qi;
      items.push({
        key,
        label: 'MCQ — ' + (qText.trim().slice(0, 160) || 'Question ' + (qi + 1)),
        value: chosen.textContent.trim() +
               (wrongBtn ? ' ✗ (incorrect)' : ' ✓ (correct)'),
      });
    });
    return items;
  }

  // ── Collect True/False button clicks ─────────────────────────
  // buildTF() marks chosen button with .selected-t or .selected-f.
  function collectTF(root) {
    const scope = root || document;
    const items = [];
    scope.querySelectorAll('.tf-item').forEach((item, ti) => {
      const tBtn = item.querySelector('.tf-btn.selected-t');
      const fBtn = item.querySelector('.tf-btn.selected-f');
      if (!tBtn && !fBtn) return;
      const stmt = (item.querySelector('.tf-statement, .tf-stmt') || {}).textContent || '';
      items.push({
        key:   'tf__' + (item.id || 'tfitem_' + ti),
        label: 'True/False — ' + (stmt.trim().slice(0, 160) || 'Statement ' + (ti + 1)),
        value: tBtn ? 'True' : 'False',
      });
    });
    return items;
  }

  // ── Collect sort/categorise game state ───────────────────────
  // sortWords game stores correct/incorrect in DOM after each card.
  function collectSortGame(root) {
    const scope = root || document;
    const items = [];
    scope.querySelectorAll('#sort-game .sort-result, #sort-game [data-word]').forEach((el, i) => {
      const word  = el.dataset.word || el.textContent.trim();
      const result = el.dataset.result || (el.classList.contains('correct') ? 'correct' : el.classList.contains('wrong') ? 'wrong' : null);
      if (!word || !result) return;
      items.push({
        key:   'sort__' + i,
        label: 'Sort — ' + word,
        value: result,
      });
    });
    return items;
  }

  // ── Build answers object ──────────────────────────────────────
  function buildAnswers(root) {
    const answers = {};
    collectFields(root).forEach(f => {
      answers[f.key] = { label: f.label, value: f.el.value };
    });
    collectMCQ(root).forEach(it => {
      answers[it.key] = { label: it.label, value: it.value };
    });
    collectTF(root).forEach(it => {
      answers[it.key] = { label: it.label, value: it.value };
    });
    collectSortGame(root).forEach(it => {
      answers[it.key] = { label: it.label, value: it.value };
    });
    return answers;
  }

  // ── Supabase ─────────────────────────────────────────────────
  const HEADERS = {
    apikey:        SUPABASE_KEY,
    Authorization: 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json',
  };

  async function dbFetch(studentName, worksheetId) {
    const url = SUPABASE_URL +
      '/rest/v1/worksheet_submissions?student_name=eq.' +
      encodeURIComponent(studentName) +
      '&worksheet_id=eq.' + encodeURIComponent(worksheetId) + '&select=*';
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) return null;
      const data = await res.json();
      return data[0] || null;
    } catch { return null; }
  }

  async function dbSave(studentName, worksheetId, answers) {
    const url = SUPABASE_URL +
      '/rest/v1/worksheet_submissions?on_conflict=student_name,worksheet_id';
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { ...HEADERS, Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify([{
          student_name:  studentName,
          worksheet_id:  worksheetId,
          answers,
          scores:        {},
          submitted_at:  new Date().toISOString(),
        }]),
      });
      return res.ok;
    } catch { return false; }
  }

  // ── Restore saved typed answers ───────────────────────────────
  function restoreFields(answers, root) {
    collectFields(root).forEach(f => {
      if (answers[f.key] && answers[f.key].value !== undefined) {
        f.el.value = answers[f.key].value;
      }
    });
  }

  // ── Teacher notes banner ─────────────────────────────────────
  function showTeacherNotes(notes) {
    const existing = document.getElementById('ws-teacher-banner');
    if (existing) existing.remove();
    if (!notes) return;
    const banner = document.createElement('div');
    banner.id = 'ws-teacher-banner';
    banner.innerHTML = '📋 <strong>Teacher note:</strong> ' + notes;
    document.body.prepend(banner);
  }

  // ── Feedback on individual fields ────────────────────────────
  function showFeedback(feedback, root) {
    const scope = root || document;
    scope.querySelectorAll('.ws-feedback').forEach(el => el.remove());
    Object.entries(feedback || {}).forEach(([key, text]) => {
      const el = scope.querySelector('#' + CSS.escape(key));
      if (el && text) {
        const note = document.createElement('div');
        note.className = 'ws-feedback';
        note.textContent = '📝 ' + text;
        el.insertAdjacentElement('afterend', note);
      }
    });
  }

  // ── Debounce ─────────────────────────────────────────────────
  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  // ════════════════════════════════════════════════════════════
  // init() — static day worksheets
  // ════════════════════════════════════════════════════════════
  function init(worksheetId) {
    const studentName = getStudent();
    if (!studentName) {
      // Not logged in — show a gentle nudge but don't break the page
      injectStyles();
      const bar = document.createElement('div');
      bar.id = 'ws-bar';
      bar.innerHTML = `<span style="color:#FCA5A5">⚠️ Please log in via the portal first so your work can be saved.</span>`;
      document.body.appendChild(bar);
      document.body.style.paddingBottom =
        (parseInt(getComputedStyle(document.body).paddingBottom) || 0) + 52 + 'px';
      return;
    }

    buildBar(studentName);
    const indicator = document.getElementById('ws-indicator');

    // Save function — always silent
    async function save() {
      flashSaving();
      const answers = buildAnswers();
      const ok = await dbSave(studentName, worksheetId, answers);
      if (ok) flashSaved();
      else if (indicator) { indicator.textContent = '⚠️ Save failed'; indicator.className = 'show'; }
    }

    const debouncedSave = debounce(save, DEBOUNCE_MS);

    // Attach input listeners to all typed fields
    function attachListeners() {
      document.querySelectorAll(FIELD_SEL).forEach(el => {
        if (!el._wsBound) {
          el.addEventListener('input', debouncedSave);
          el._wsBound = true;
        }
      });
    }
    attachListeners();

    // Catch MCQ, True/False, and any other button-based interactions
    document.body.addEventListener('click', e => {
      if (
        e.target.closest('.quiz-opt') ||
        e.target.closest('.tf-btn') ||
        e.target.closest('.sort-btn') ||
        e.target.closest('.circle-opt') ||
        e.target.closest('.match-check-btn')
      ) {
        // small delay so DOM state updates before we read it
        setTimeout(debouncedSave, 100);
      }
    });

    // Re-attach when DOM mutates (buildQuiz/buildTF re-render innerHTML)
    new MutationObserver(attachListeners)
      .observe(document.body, { childList: true, subtree: true });

    // Hard fallback every 20s
    setInterval(save, FALLBACK_MS);

    // Load previous work on open
    (async () => {
      const sub = await dbFetch(studentName, worksheetId);
      if (!sub) return;
      restoreFields(sub.answers || {});
      showTeacherNotes(sub.teacher_notes);
      showFeedback(sub.feedback || {});
      if (indicator) {
        indicator.textContent = '✅ Loaded';
        indicator.className = 'show';
        setTimeout(() => { indicator.className = ''; }, 3000);
      }
    })();
  }

  // ════════════════════════════════════════════════════════════
  // initDynamic() — interactive/writing lessons (multi-subject tabs)
  // ════════════════════════════════════════════════════════════
  function initDynamic(worksheetId) {
    const studentName = getStudent();
    if (!studentName) {
      injectStyles();
      const bar = document.createElement('div');
      bar.id = 'ws-bar';
      bar.innerHTML = `<span style="color:#FCA5A5">⚠️ Please log in via the portal first so your work can be saved.</span>`;
      document.body.appendChild(bar);
      document.body.style.paddingBottom =
        (parseInt(getComputedStyle(document.body).paddingBottom) || 0) + 52 + 'px';
      return;
    }

    buildBar(studentName);
    const indicator = document.getElementById('ws-indicator');

    global.__wsAnswers = global.__wsAnswers || {};

    function currentPageKey() {
      return (global.currentSubject || 'page') + '_' + ((global.currentWS && global.currentWS[global.currentSubject]) || '0');
    }

    let lastPageKey = currentPageKey();

    function capturePage(pageKey) {
      const pagesEl = document.getElementById('pages');
      const answers = buildAnswers(pagesEl);
      Object.entries(answers).forEach(([k, v]) => {
        global.__wsAnswers[pageKey + '__' + k] = v;
      });
    }

    function applyPage() {
      const pagesEl = document.getElementById('pages');
      if (!pagesEl) return;
      const prefix = currentPageKey() + '__';
      collectFields(pagesEl).forEach(f => {
        const saved = global.__wsAnswers[prefix + f.key];
        if (saved && saved.value !== undefined) f.el.value = saved.value;
      });
    }

    // Hook into renderAll so we capture before switching page
    const origRenderAll = global.renderAll;
    global.renderAll = function () {
      capturePage(lastPageKey);
      origRenderAll();
      lastPageKey = currentPageKey();
      applyPage();
      attachDynamicListeners();
    };

    async function save() {
      flashSaving();
      capturePage(lastPageKey);
      const ok = await dbSave(studentName, worksheetId, global.__wsAnswers);
      if (ok) flashSaved();
      else if (indicator) { indicator.textContent = '⚠️ Save failed'; indicator.className = 'show'; }
    }

    const debouncedSave = debounce(save, DEBOUNCE_MS);

    function attachDynamicListeners() {
      const pagesEl = document.getElementById('pages');
      if (!pagesEl) return;
      pagesEl.querySelectorAll(FIELD_SEL).forEach(el => {
        if (!el._wsBound) {
          el.addEventListener('input', debouncedSave);
          el._wsBound = true;
        }
      });
    }
    attachDynamicListeners();

    document.body.addEventListener('click', e => {
      if (
        e.target.closest('.quiz-opt') ||
        e.target.closest('.tf-btn') ||
        e.target.closest('.sort-btn') ||
        e.target.closest('.circle-opt') ||
        e.target.closest('.match-check-btn')
      ) {
        setTimeout(debouncedSave, 100);
      }
    });

    new MutationObserver(attachDynamicListeners)
      .observe(document.body, { childList: true, subtree: true });

    setInterval(save, FALLBACK_MS);

    // Load previous work on open
    (async () => {
      const sub = await dbFetch(studentName, worksheetId);
      if (!sub) return;
      global.__wsAnswers = sub.answers || {};
      showTeacherNotes(sub.teacher_notes);
      applyPage();
      if (indicator) {
        indicator.textContent = '✅ Loaded';
        indicator.className = 'show';
        setTimeout(() => { indicator.className = ''; }, 3000);
      }
    })();
  }

  // ── Public API ────────────────────────────────────────────────
  global.WorksheetSubmit = {
    init,
    initDynamic,
    collectFields,
    fetchSubmission: dbFetch,
    saveSubmission:  dbSave,
    restoreFields,
    showFeedback,
  };
})(window);
