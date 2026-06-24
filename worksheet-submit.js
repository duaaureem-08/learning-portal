/* ============================================================
   HOS International — Worksheet Auto-Save  v3
   Captures EVERYTHING silently: typed answers, MCQ, True/False,
   match pairs, ordering, word-fill blanks.
   Identity comes from portal PIN login — no name entry needed.
   If not logged in, falls back to asking for a name.
   ============================================================ */
(function (global) {
  const SUPABASE_URL = 'https://ldftwnsixhgpfldhlkyq.supabase.co';
  const SUPABASE_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZnR3bnNpeGhncGZsZGhsa3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDM4NjMsImV4cCI6MjA5NjkxOTg2M30.EhShFmJgcsbrLqoZwA0nYfHRcCAzlS7mTkv4xHGAk_k';

  const DEBOUNCE_MS  = 1500;
  const FALLBACK_MS  = 20000;

  /* ── Identity ─────────────────────────────────────────────── */
  function getStudent() {
    return localStorage.getItem('hos_active_student')
        || localStorage.getItem('hos_student_name')
        || null;
  }

  /* ── Styles ───────────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('ws-style')) return;
    const s = document.createElement('style');
    s.id = 'ws-style';
    s.textContent = `
      #ws-bar{position:fixed;bottom:0;left:0;right:0;background:#1E1B4B;color:#fff;
        padding:9px 16px;display:flex;align-items:center;gap:10px;z-index:99999;
        font-family:'Nunito',sans-serif;box-shadow:0 -2px 12px rgba(0,0,0,.3);font-size:0.82rem;font-weight:700;}
      #ws-who{font-weight:900;color:#A5F3FC;font-size:0.88rem;}
      #ws-name-input{padding:6px 10px;border-radius:8px;border:none;font-weight:700;
        font-family:'Nunito',sans-serif;font-size:0.82rem;min-width:150px;}
      #ws-name-btn{padding:6px 14px;border-radius:50px;background:#059669;border:none;
        color:white;font-weight:800;cursor:pointer;font-family:'Nunito',sans-serif;font-size:0.82rem;}
      #ws-indicator{margin-left:auto;font-size:0.78rem;font-weight:800;
        color:#6EE7B7;opacity:0;transition:opacity 0.4s;}
      #ws-indicator.show{opacity:1;}
      #ws-indicator.saving{color:#FCD34D;opacity:1;}
      #ws-indicator.error{color:#FCA5A5;opacity:1;}
      .ws-feedback{margin-top:6px;padding:8px 12px;border-radius:10px;background:#ECFDF5;
        border-left:4px solid #059669;font-size:0.85rem;font-weight:700;color:#065F46;font-family:'Nunito',sans-serif;}
      #ws-teacher-banner{background:#FFFBEB;border:2px solid #F59E0B;border-radius:12px;
        padding:12px 16px;margin:12px auto;max-width:960px;font-weight:700;color:#92400E;font-family:'Nunito',sans-serif;}
    `;
    document.head.appendChild(s);
  }

  function buildBar(studentName) {
    if (document.getElementById('ws-bar')) return;
    injectStyles();
    const bar = document.createElement('div');
    bar.id = 'ws-bar';
    if (studentName) {
      bar.innerHTML = `
        <span>👤</span>
        <span id="ws-who">${studentName}</span>
        <span id="ws-indicator">💾 Saved</span>`;
    } else {
      bar.innerHTML = `
        <span>👤 Who are you?</span>
        <input id="ws-name-input" placeholder="Type your name" />
        <button id="ws-name-btn">Start saving ✓</button>
        <span id="ws-indicator">💾 Saved</span>`;
    }
    document.body.appendChild(bar);
    document.body.style.paddingBottom =
      (parseInt(getComputedStyle(document.body).paddingBottom) || 0) + 52 + 'px';
  }

  function setIndicator(text, cls) {
    const el = document.getElementById('ws-indicator');
    if (!el) return;
    el.textContent = text;
    el.className = cls || 'show';
    if (cls !== 'saving') setTimeout(() => { if (el.className !== 'saving') el.className = ''; }, 2500);
  }

  /* ── Supabase ─────────────────────────────────────────────── */
  const HDR = {
    apikey: SUPABASE_KEY,
    Authorization: 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json',
  };

  async function dbFetch(name, wsId) {
    try {
      const res = await fetch(
        SUPABASE_URL + '/rest/v1/worksheet_submissions?student_name=eq.' +
        encodeURIComponent(name) + '&worksheet_id=eq.' + encodeURIComponent(wsId) + '&select=*',
        { headers: HDR }
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data[0] || null;
    } catch { return null; }
  }

  async function dbSave(name, wsId, answers) {
    try {
      const res = await fetch(
        SUPABASE_URL + '/rest/v1/worksheet_submissions?on_conflict=student_name,worksheet_id',
        {
          method: 'POST',
          headers: { ...HDR, Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify([{
            student_name: name,
            worksheet_id: wsId,
            answers,
            scores: {},
            submitted_at: new Date().toISOString(),
          }]),
        }
      );
      return res.ok;
    } catch { return false; }
  }

  /* ── Collect: typed inputs & textareas ────────────────────── */
  const FIELD_SEL =
    'textarea,' +
    'input:not([type="radio"]):not([type="checkbox"]):not([type="button"])' +
    ':not([type="submit"]):not([type="file"]):not([type="hidden"])' +
    ':not([type="image"]):not([type="reset"]):not([readonly])';

  function nearestLabel(el) {
    const containers = ['.q-block','.analysis-box','.fill-row','.tf-row','.callout',
                        '.ws-header','.match-term','.order-item','.card','.step',
                        '.blank-sentence','.score-bar'];
    for (const cs of containers) {
      const c = el.closest(cs);
      if (c) {
        const clone = c.cloneNode(true);
        clone.querySelectorAll('input,textarea,button').forEach(n => n.remove());
        const t = clone.textContent.trim().replace(/\s+/g,' ');
        if (t) return t.slice(0,160);
      }
    }
    return el.placeholder || el.id || null;
  }

  function collectTyped(root) {
    const scope = root || document;
    const out = {};
    scope.querySelectorAll(FIELD_SEL).forEach((el, i) => {
      const k = el.id || ('f_' + i);
      out['typed__' + k] = { label: nearestLabel(el) || ('Field ' + (i+1)), value: el.value };
    });
    return out;
  }

  /* ── Collect: MCQ (quiz-opt buttons) ─────────────────────── */
  // answerQ() disables all options and adds .correct / .wrong.
  // advanceQuiz() wipes the container innerHTML for the next Q,
  // so we can only capture the CURRENT question if it's been answered.
  // We save per-question history via a hook (see attachQuizHook below).
  function collectMCQ(root) {
    const scope = root || document;
    const out = {};
    scope.querySelectorAll('.quiz-box').forEach((box, qi) => {
      const opts = Array.from(box.querySelectorAll('.quiz-opt'));
      const answered = opts.some(o => o.disabled || o.classList.contains('wrong') || o.classList.contains('correct'));
      if (!answered) return;
      const chosen = opts.find(o => o.classList.contains('wrong')) || opts.find(o => o.classList.contains('correct'));
      if (!chosen) return;
      const qText = (box.querySelector('.quiz-q') || {}).textContent || '';
      const isWrong = chosen.classList.contains('wrong');
      const container = box.closest('[id]');
      const k = 'mcq__' + (container ? container.id : 'box') + '__q' + qi;
      out[k] = {
        label: 'MCQ — ' + (qText.trim().slice(0,160) || 'Q' + (qi+1)),
        value: chosen.textContent.trim() + (isWrong ? ' ✗' : ' ✓'),
      };
    });
    return out;
  }

  /* ── Collect: True/False (.tf-btn.chosen) ─────────────────── */
  function collectTF(root) {
    const scope = root || document;
    const out = {};
    scope.querySelectorAll('.tf-row').forEach((row, i) => {
      const chosen = row.querySelector('.tf-btn.chosen');
      if (!chosen) return;
      const stmt = (row.querySelector('.tf-stmt') || {}).textContent || '';
      const isTrueBtn = chosen.classList.contains('t-btn');
      out['tf__row_' + i] = {
        label: 'T/F — ' + (stmt.trim().slice(0,160) || 'Statement ' + (i+1)),
        value: isTrueBtn ? 'True' : 'False',
      };
    });
    return out;
  }

  /* ── Collect: Match pairs (.match-item.matched) ────────────── */
  function collectMatch(root) {
    const scope = root || document;
    const out = {};
    // Collect only 'term' side to avoid duplicates (each pair has 2 matched items)
    scope.querySelectorAll('.match-item.matched[data-type="term"]').forEach((el, i) => {
      out['match__' + (el.dataset.id || i)] = {
        label: 'Match — ' + el.textContent.trim().slice(0,80),
        value: el.textContent.trim() + ' → matched ✓',
      };
    });
    return out;
  }

  /* ── Collect: Order game (.order-num.set) ─────────────────── */
  function collectOrder(root) {
    const scope = root || document;
    const out = {};
    scope.querySelectorAll('.order-item').forEach((item, i) => {
      const numEl = item.querySelector('.order-num.set');
      if (!numEl) return;
      const text = (item.querySelector('.order-text') || {}).textContent || '';
      out['order__' + i] = {
        label: 'Order — ' + text.trim().slice(0,140),
        value: 'Numbered ' + numEl.textContent.trim(),
      };
    });
    return out;
  }

  /* ── Collect: Word-fill blanks (spans with data-placed) ───── */
  // placeSciWord / placeHumWord / fillMV all write dataset.placed on the span.
  function collectWordFill(root) {
    const scope = root || document;
    const out = {};
    scope.querySelectorAll('[data-placed]').forEach(span => {
      if (!span.dataset.placed) return;
      const label = (span.closest('.fill-row') || span.closest('label') || {}).textContent || span.id;
      out['wordfill__' + (span.id || 'span')] = {
        label: 'Fill — ' + label.trim().replace(/\s+/g,' ').slice(0,140),
        value: span.dataset.placed,
      };
    });
    // Memory verse spans (mv1, mv2…) may not have data-placed; check textContent
    scope.querySelectorAll('[id^="mv"]').forEach(span => {
      if (span.textContent.trim() && span.textContent.trim() !== '______') {
        out['wordfill__' + span.id] = {
          label: 'Memory verse blank — ' + span.id,
          value: span.textContent.trim(),
        };
      }
    });
    return out;
  }

  /* ── Master collect ───────────────────────────────────────── */
  function collectAll(root) {
    return Object.assign(
      {},
      collectTyped(root),
      collectMCQ(root),
      collectTF(root),
      collectMatch(root),
      collectOrder(root),
      collectWordFill(root),
    );
  }

  /* ── Restore: typed fields ────────────────────────────────── */
  function restoreTyped(saved, root) {
    const scope = root || document;
    scope.querySelectorAll(FIELD_SEL).forEach((el, i) => {
      const k = 'typed__' + (el.id || ('f_' + i));
      if (saved[k] !== undefined) el.value = saved[k].value ?? saved[k];
    });
  }

  /* ── Restore: TF buttons ──────────────────────────────────── */
  function restoreTF(saved, root) {
    const scope = root || document;
    scope.querySelectorAll('.tf-row').forEach((row, i) => {
      const entry = saved['tf__row_' + i];
      if (!entry) return;
      const wantTrue = (entry.value || entry) === 'True';
      const btn = row.querySelector(wantTrue ? '.t-btn' : '.f-btn');
      if (btn) btn.click();
    });
  }

  /* ── Restore: Match pairs ─────────────────────────────────── */
  function restoreMatch(saved, root) {
    const scope = root || document;
    Object.keys(saved).forEach(k => {
      if (!k.startsWith('match__')) return;
      const pairId = k.replace('match__', '');
      // find the two items for this pair and mark them matched
      const items = scope.querySelectorAll('.match-item[data-id="' + pairId + '"]');
      items.forEach(el => {
        if (!el.classList.contains('matched')) {
          el.classList.remove('selected', 'wrong-match');
          el.classList.add('matched');
          el.style.pointerEvents = 'none';
        }
      });
    });
    // Update score display for each match game
    scope.querySelectorAll('[id$="-terms"]').forEach(termsDiv => {
      const containerId = termsDiv.id.replace('-terms', '');
      const scoreId = containerId.replace('-match-area', '-match-score');
      const matched = termsDiv.querySelectorAll('.match-item.matched').length;
      const total = termsDiv.querySelectorAll('.match-item').length;
      const scoreEl = scope.querySelector('#' + scoreId);
      if (scoreEl && matched > 0) scoreEl.textContent = '✅ ' + matched + '/' + total + ' matched!';
    });
  }

  /* ── Restore: Order numbers ───────────────────────────────── */
  function restoreOrder(saved, root) {
    const scope = root || document;
    // Build a map of order-text → assigned number from saved data
    const textToNum = {};
    Object.values(saved).forEach(entry => {
      if (!entry || !entry.label || !entry.label.startsWith('Order — ')) return;
      const text = entry.label.replace('Order — ', '').trim();
      const num = (entry.value || '').replace('Numbered ', '').trim();
      if (text && num) textToNum[text] = num;
    });
    scope.querySelectorAll('.order-item').forEach(item => {
      const text = (item.querySelector('.order-text') || {}).textContent || '';
      const num = textToNum[text.trim()];
      if (num) {
        const numEl = item.querySelector('.order-num');
        if (numEl && !numEl.classList.contains('set')) {
          numEl.textContent = num;
          numEl.classList.add('set');
          numEl.style.background = numEl.closest('[style*="--bible"]') ? 'var(--bible)' :
                                    numEl.closest('[style*="--english"]') ? 'var(--english)' :
                                    numEl.closest('[style*="--maths"]') ? 'var(--maths)' :
                                    numEl.closest('[style*="--science"]') ? 'var(--science)' :
                                    numEl.closest('[style*="--humanities"]') ? 'var(--humanities)' : '#7C3AED';
        }
      }
    });
  }

  /* ── Restore: Word fills ──────────────────────────────────── */
  function restoreWordFill(saved, root) {
    const scope = root || document;
    Object.entries(saved).forEach(([k, entry]) => {
      if (!k.startsWith('wordfill__')) return;
      const spanId = k.replace('wordfill__', '');
      const span = scope.querySelector('#' + spanId);
      if (!span) return;
      const word = entry.value ?? entry;
      span.textContent = word;
      span.dataset.placed = word;
      span.style.borderBottom = 'none';
      span.style.fontWeight = '900';
    });
  }

  /* ── Restore all ──────────────────────────────────────────── */
  function restoreAll(answers, root) {
    if (!answers) return;
    restoreTyped(answers, root);
    // TF, Match, Order, WordFill need a tick for dynamic content to render
    setTimeout(() => {
      restoreTF(answers, root);
      restoreMatch(answers, root);
      restoreOrder(answers, root);
      restoreWordFill(answers, root);
    }, 300);
  }

  /* ── Teacher notes & feedback ─────────────────────────────── */
  function showTeacherNotes(notes) {
    document.getElementById('ws-teacher-banner') && document.getElementById('ws-teacher-banner').remove();
    if (!notes) return;
    const d = document.createElement('div');
    d.id = 'ws-teacher-banner';
    d.innerHTML = '📋 <strong>Teacher note:</strong> ' + notes;
    document.body.prepend(d);
  }

  function showFeedback(feedback, root) {
    const scope = root || document;
    scope.querySelectorAll('.ws-feedback').forEach(e => e.remove());
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

  /* ── Debounce ─────────────────────────────────────────────── */
  function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  /* ── Hook quiz advancement to capture per-question answers ── */
  // advanceQuiz() replaces the innerHTML so the answered state is lost.
  // We hook it so each answer is merged into the running answers object.
  function attachQuizHook(getAnswersFn, mergeAnswersFn) {
    if (global.__wsQuizHooked) return;
    global.__wsQuizHooked = true;
    const origAdvance = global.advanceQuiz;
    if (!origAdvance) return;
    global.advanceQuiz = function(key) {
      // capture current question's answer before the DOM is wiped
      const currentAnswers = collectMCQ();
      mergeAnswersFn(currentAnswers);
      origAdvance(key);
    };
    // Also hook answerSent (sentence type game)
    const origAnswerSent = global.answerSent;
    if (origAnswerSent) {
      global.answerSent = function(t) {
        origAnswerSent(t);
        setTimeout(() => mergeAnswersFn(collectMCQ()), 50);
      };
    }
  }

  /* ╔══════════════════════════════════════════════════════════╗
     ║  init()  —  static day worksheets                        ║
     ╚══════════════════════════════════════════════════════════╝ */
  function init(worksheetId) {
    let studentName = getStudent();
    buildBar(studentName);

    // If not logged in, wait for name entry
    if (!studentName) {
      const btn = document.getElementById('ws-name-btn');
      const inp = document.getElementById('ws-name-input');
      if (btn && inp) {
        btn.addEventListener('click', () => {
          const n = inp.value.trim();
          if (!n) return;
          localStorage.setItem('hos_student_name', n);
          studentName = n;
          const bar = document.getElementById('ws-bar');
          if (bar) {
            bar.innerHTML = `<span>👤</span><span id="ws-who">${n}</span><span id="ws-indicator">💾 Saved</span>`;
          }
          loadAndStart();
        });
      }
      return;
    }
    loadAndStart();

    // Running answers cache (persists across quiz advances)
    const cachedAnswers = {};

    function mergeInto(obj) { Object.assign(cachedAnswers, obj); }

    function loadAndStart() {
      attachQuizHook(() => cachedAnswers, mergeInto);

      async function save() {
        if (!studentName) return;
        setIndicator('⏳', 'saving');
        const live = collectAll();
        const answers = Object.assign({}, cachedAnswers, live);
        const ok = await dbSave(studentName, worksheetId, answers);
        setIndicator(ok ? '💾 Saved' : '⚠️ Save failed', ok ? 'show' : 'error');
      }

      const debouncedSave = debounce(save, DEBOUNCE_MS);

      function attachListeners() {
        document.querySelectorAll(FIELD_SEL).forEach(el => {
          if (!el._wsBound) { el.addEventListener('input', debouncedSave); el._wsBound = true; }
        });
      }
      attachListeners();

      // Catch every clickable game interaction
      document.body.addEventListener('click', e => {
        const t = e.target;
        if (t.closest('.quiz-opt') || t.closest('.tf-btn') ||
            t.closest('.match-item') || t.closest('.order-item') ||
            t.closest('.word-chip') || t.closest('[onclick*="place"]') ||
            t.closest('[onclick*="fill"]') || t.closest('[onclick*="select"]') ||
            t.closest('.sort-btn') || t.closest('.circle-opt')) {
          setTimeout(debouncedSave, 150); // short delay so DOM updates first
        }
      });

      new MutationObserver(attachListeners).observe(document.body, { childList: true, subtree: true });
      setInterval(save, FALLBACK_MS);

      // Load previous work
      (async () => {
        const sub = await dbFetch(studentName, worksheetId);
        if (!sub || !sub.answers) return;
        Object.assign(cachedAnswers, sub.answers);
        restoreAll(sub.answers);
        showTeacherNotes(sub.teacher_notes);
        showFeedback(sub.feedback || {});
        setIndicator('✅ Loaded', 'show');
      })();
    }

    if (studentName) loadAndStart();
  }

  /* ╔══════════════════════════════════════════════════════════╗
     ║  initDynamic()  —  interactive multi-subject lessons      ║
     ╚══════════════════════════════════════════════════════════╝ */
  function initDynamic(worksheetId) {
    let studentName = getStudent();
    buildBar(studentName);

    global.__wsAnswers = global.__wsAnswers || {};

    function currentPageKey() {
      return (global.currentSubject || 'page') + '_' +
             ((global.currentWS && global.currentWS[global.currentSubject]) || '0');
    }

    let lastPageKey = currentPageKey();

    function capturePage(pageKey) {
      const pagesEl = document.getElementById('pages');
      const live = collectAll(pagesEl);
      Object.entries(live).forEach(([k, v]) => {
        global.__wsAnswers[pageKey + '__' + k] = v;
      });
    }

    function applyPage() {
      const pagesEl = document.getElementById('pages');
      if (!pagesEl) return;
      const prefix = currentPageKey() + '__';
      const scoped = {};
      Object.entries(global.__wsAnswers).forEach(([k, v]) => {
        if (k.startsWith(prefix)) scoped[k.replace(prefix, '')] = v;
      });
      restoreAll(scoped, pagesEl);
    }

    const origRenderAll = global.renderAll;
    if (origRenderAll) {
      global.renderAll = function () {
        capturePage(lastPageKey);
        origRenderAll();
        lastPageKey = currentPageKey();
        applyPage();
        attachDynListeners();
      };
    }

    async function save() {
      if (!studentName) return;
      setIndicator('⏳', 'saving');
      capturePage(lastPageKey);
      const ok = await dbSave(studentName, worksheetId, global.__wsAnswers);
      setIndicator(ok ? '💾 Saved' : '⚠️ Save failed', ok ? 'show' : 'error');
    }

    const debouncedSave = debounce(save, DEBOUNCE_MS);

    function attachDynListeners() {
      const pagesEl = document.getElementById('pages');
      if (!pagesEl) return;
      pagesEl.querySelectorAll(FIELD_SEL).forEach(el => {
        if (!el._wsBound) { el.addEventListener('input', debouncedSave); el._wsBound = true; }
      });
    }
    attachDynListeners();

    document.body.addEventListener('click', e => {
      const t = e.target;
      if (t.closest('.quiz-opt') || t.closest('.tf-btn') ||
          t.closest('.match-item') || t.closest('.order-item') ||
          t.closest('.word-chip') || t.closest('[onclick*="place"]') ||
          t.closest('[onclick*="fill"]') || t.closest('[onclick*="select"]') ||
          t.closest('.sort-btn') || t.closest('.circle-opt')) {
        setTimeout(debouncedSave, 150);
      }
    });

    new MutationObserver(attachDynListeners).observe(document.body, { childList: true, subtree: true });
    setInterval(save, FALLBACK_MS);

    if (!studentName) {
      const btn = document.getElementById('ws-name-btn');
      const inp = document.getElementById('ws-name-input');
      if (btn && inp) {
        btn.addEventListener('click', () => {
          const n = inp.value.trim();
          if (!n) return;
          localStorage.setItem('hos_student_name', n);
          studentName = n;
          const bar = document.getElementById('ws-bar');
          if (bar) bar.innerHTML = `<span>👤</span><span id="ws-who">${n}</span><span id="ws-indicator">💾 Saved</span>`;
          loadPrev();
        });
      }
    } else {
      loadPrev();
    }

    function loadPrev() {
      (async () => {
        const sub = await dbFetch(studentName, worksheetId);
        if (!sub || !sub.answers) return;
        global.__wsAnswers = sub.answers;
        showTeacherNotes(sub.teacher_notes);
        applyPage();
        setIndicator('✅ Loaded', 'show');
      })();
    }
  }

  /* ── Public API ───────────────────────────────────────────── */
  global.WorksheetSubmit = { init, initDynamic, collectAll, dbFetch, dbSave, restoreAll, showFeedback };
})(window);
