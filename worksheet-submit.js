/* ============================================================
   HOS International — Worksheet Submission Helper
   Saves student answers to Supabase so the teacher can review
   them and leave corrections/feedback. Works with:
   - Static worksheets (Day1/Day2/Day3 style: all subject pages
     exist in the DOM at once, toggled with .active)
   - Dynamic worksheets (Interactive Lessons style: content for
     the current subject/lesson is rebuilt on every tab click)
   ============================================================ */
(function (global) {
  const SUPABASE_URL = 'https://ldftwnsixhgpfldhlkyq.supabase.co';
  const SUPABASE_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZnR3bnNpeGhncGZsZGhsa3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDM4NjMsImV4cCI6MjA5NjkxOTg2M30.EhShFmJgcsbrLqoZwA0nYfHRcCAzlS7mTkv4xHGAk_k';

  const FIELD_SELECTOR =
    'textarea, input.ans-line, input.inline-ans, input.ans-box, input.name-line, ' +
    'input[type="text"]:not([readonly]), input[type="number"]:not([readonly])';
  const SCORE_SELECTOR = '[id$="-score"], [id$="-pct"], [id$="-fb"]';

  /* ---------- styling + UI bar ---------- */
  function injectStyles() {
    if (document.getElementById('ws-style')) return;
    const style = document.createElement('style');
    style.id = 'ws-style';
    style.textContent = `
      #ws-submit-bar{position:fixed;bottom:0;left:0;right:0;background:#1E1B4B;color:#fff;
        padding:10px 14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;z-index:99999;
        font-family:'Nunito',sans-serif;box-shadow:0 -2px 12px rgba(0,0,0,0.25);}
      #ws-submit-bar .ws-label{font-weight:800;font-size:0.85rem;}
      #ws-submit-bar input{padding:8px 12px;border-radius:8px;border:none;font-weight:700;
        font-family:'Nunito',sans-serif;min-width:170px;font-size:0.85rem;}
      #ws-submit-bar .ws-btn{padding:8px 14px;border-radius:50px;border:none;color:#fff;
        font-weight:800;cursor:pointer;font-family:'Nunito',sans-serif;font-size:0.85rem;}
      #ws-submit-bar .ws-btn:hover{filter:brightness(1.12);}
      #ws-load-btn{background:#0891B2;}
      #ws-submit-btn{background:#059669;}
      #ws-status{font-weight:700;font-size:0.82rem;}
      .ws-feedback{margin-top:6px;padding:8px 12px;border-radius:10px;background:#ECFDF5;
        border-left:4px solid #059669;font-size:0.85rem;font-weight:700;color:#065F46;
        font-family:'Nunito',sans-serif;}
      #ws-teacher-banner{background:#FFFBEB;border:2px solid #F59E0B;border-radius:12px;
        padding:12px 16px;margin:12px auto;max-width:960px;font-weight:700;color:#92400E;
        font-family:'Nunito',sans-serif;}
    `;
    document.head.appendChild(style);
  }

  function buildBar() {
    if (document.getElementById('ws-submit-bar')) return;
    injectStyles();
    const bar = document.createElement('div');
    bar.id = 'ws-submit-bar';
    bar.innerHTML = `
      <span class="ws-label">👤 Your name:</span>
      <input id="ws-student-name" placeholder="Type your full name" />
      <button id="ws-load-btn" class="ws-btn">📥 Load my saved work</button>
      <button id="ws-submit-btn" class="ws-btn">✅ Submit my work</button>
      <span id="ws-status"></span>
    `;
    document.body.appendChild(bar);
    document.body.style.paddingBottom =
      (parseInt(getComputedStyle(document.body).paddingBottom) || 0) + 70 + 'px';
  }

  /* ---------- label + field helpers ---------- */
  function getLabel(el) {
    const containerSelectors = ['.analysis-box', '.q-block', '.fill-row', '.tf-row', '.callout', '.ws-header'];
    for (const sel of containerSelectors) {
      const c = el.closest(sel);
      if (c) {
        const lbl = c.querySelector('.analysis-q, .q-text, .q-num, label, .callout-text, .tf-stmt');
        if (lbl) {
          const t = lbl.textContent.trim().replace(/\s+/g, ' ');
          if (t) return t.slice(0, 160);
        }
      }
    }
    if (el.placeholder) return el.placeholder.trim().slice(0, 160);
    return null;
  }

  function collectFields(root) {
    const scope = root || document;
    const fields = [];
    scope.querySelectorAll(FIELD_SELECTOR).forEach((el, i) => {
      const key = el.id || ('f' + i);
      const label = getLabel(el) || ('Answer ' + (i + 1));
      fields.push({ key, label, el });
    });
    return fields;
  }

  function collectScores() {
    const scores = {};
    document.querySelectorAll(SCORE_SELECTOR).forEach((el) => {
      const t = el.textContent.trim();
      if (t) scores[el.id] = t;
    });
    return scores;
  }

  /* ---------- Supabase calls ---------- */
  async function fetchSubmission(name, worksheetId) {
    const url = `${SUPABASE_URL}/rest/v1/worksheet_submissions?student_name=eq.${encodeURIComponent(
      name
    )}&worksheet_id=eq.${encodeURIComponent(worksheetId)}&select=*`;
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data[0] || null;
  }

  async function saveSubmission(name, worksheetId, answers, scores) {
    const url = `${SUPABASE_URL}/rest/v1/worksheet_submissions?on_conflict=student_name,worksheet_id`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify([
        {
          student_name: name,
          worksheet_id: worksheetId,
          answers: answers,
          scores: scores,
          submitted_at: new Date().toISOString(),
        },
      ]),
    });
    return res.ok;
  }

  /* ---------- restore + feedback ---------- */
  function restoreFields(answers, root) {
    const fields = collectFields(root);
    fields.forEach((f) => {
      if (answers && answers[f.key] && answers[f.key].value !== undefined) {
        f.el.value = answers[f.key].value;
      }
    });
  }

  function showTeacherNotes(teacherNotes) {
    const existing = document.getElementById('ws-teacher-banner');
    if (existing) existing.remove();
    if (teacherNotes) {
      const banner = document.createElement('div');
      banner.id = 'ws-teacher-banner';
      banner.innerHTML = `📝 <strong>Note from your teacher:</strong> ${teacherNotes}`;
      document.body.insertBefore(banner, document.body.firstChild);
    }
  }

  function showFeedback(feedback, root) {
    const scope = root || document;
    scope.querySelectorAll('.ws-feedback').forEach((e) => e.remove());
    const fields = collectFields(root);
    fields.forEach((f) => {
      if (feedback && feedback[f.key]) {
        const note = document.createElement('div');
        note.className = 'ws-feedback';
        note.textContent = '📝 Teacher: ' + feedback[f.key];
        f.el.insertAdjacentElement('afterend', note);
      }
    });
  }

  /* ---------- init: static worksheets (Day1/Day2/Day3 style) ---------- */
  function init(worksheetId) {
    buildBar();
    const nameInput = document.getElementById('ws-student-name');
    nameInput.value = localStorage.getItem('hos_student_name') || '';
    const statusEl = document.getElementById('ws-status');

    async function doLoad(silent) {
      const name = nameInput.value.trim();
      if (!name) {
        if (!silent) statusEl.textContent = '⚠️ Type your name first';
        return;
      }
      localStorage.setItem('hos_student_name', name);
      if (!silent) statusEl.textContent = 'Loading…';
      const sub = await fetchSubmission(name, worksheetId);
      if (!sub) {
        if (!silent) statusEl.textContent = 'No saved work found yet — start filling it in!';
        return;
      }
      restoreFields(sub.answers || {});
      showTeacherNotes(sub.teacher_notes);
      showFeedback(sub.feedback || {});
      statusEl.textContent =
        '✅ Loaded your saved work (last submitted ' +
        new Date(sub.submitted_at).toLocaleString() +
        ')';
    }

    document.getElementById('ws-load-btn').onclick = () => doLoad(false);

    document.getElementById('ws-submit-btn').onclick = async () => {
      const name = nameInput.value.trim();
      if (!name) {
        statusEl.textContent = '⚠️ Type your name first';
        return;
      }
      localStorage.setItem('hos_student_name', name);
      statusEl.textContent = 'Saving…';
      const fields = collectFields();
      const answers = {};
      fields.forEach((f) => {
        answers[f.key] = { label: f.label, value: f.el.value };
      });
      const scores = collectScores();
      const ok = await saveSubmission(name, worksheetId, answers, scores);
      statusEl.textContent = ok
        ? '✅ Submitted! Your teacher can now see your work.'
        : '❌ Something went wrong — please try again.';
    };

    // Auto-load saved work for returning students
    if (nameInput.value) doLoad(true);
  }

  /* ---------- init: dynamic worksheets (Interactive Lessons style) ---------- */
  function initDynamic(worksheetId) {
    buildBar();
    const nameInput = document.getElementById('ws-student-name');
    nameInput.value = localStorage.getItem('hos_student_name') || '';
    const statusEl = document.getElementById('ws-status');

    global.__wsAnswers = global.__wsAnswers || {};
    let __wsFeedback = {};

    function currentPageKey() {
      // currentSubject / currentWS are declared with `let` in the page's own
      // script, so they live in the shared global lexical scope rather than
      // on `window` — reference them as bare identifiers here.
      return currentSubject + '_' + currentWS[currentSubject];
    }

    // The page's own onclick handlers update currentSubject/currentWS
    // *before* calling renderAll(), so by the time our wrapper runs we can
    // no longer tell which page was on screen. Track it ourselves instead.
    let lastPageKey = currentPageKey();

    function capturePage(pageKey) {
      const fields = collectFields(document.getElementById('pages'));
      fields.forEach((f) => {
        const k = pageKey + '__' + f.key;
        global.__wsAnswers[k] = { label: f.label, value: f.el.value };
      });
    }

    function applyPage() {
      const pagesEl = document.getElementById('pages');
      const fields = collectFields(pagesEl);
      const prefix = currentPageKey() + '__';
      const fb = {};
      fields.forEach((f) => {
        const k = prefix + f.key;
        if (global.__wsAnswers[k] && global.__wsAnswers[k].value !== undefined) {
          f.el.value = global.__wsAnswers[k].value;
        }
        if (__wsFeedback[k]) fb[f.key] = __wsFeedback[k];
      });
      showFeedback(fb, pagesEl);
    }

    const origRenderAll = global.renderAll;
    global.renderAll = function () {
      capturePage(lastPageKey);
      origRenderAll();
      lastPageKey = currentPageKey();
      applyPage();
    };

    async function doLoad(silent) {
      const name = nameInput.value.trim();
      if (!name) {
        if (!silent) statusEl.textContent = '⚠️ Type your name first';
        return;
      }
      localStorage.setItem('hos_student_name', name);
      if (!silent) statusEl.textContent = 'Loading…';
      const sub = await fetchSubmission(name, worksheetId);
      if (!sub) {
        if (!silent) statusEl.textContent = 'No saved work found yet — start filling it in!';
        return;
      }
      global.__wsAnswers = sub.answers || {};
      __wsFeedback = sub.feedback || {};
      showTeacherNotes(sub.teacher_notes);
      applyPage();
      statusEl.textContent =
        '✅ Loaded your saved work (last submitted ' +
        new Date(sub.submitted_at).toLocaleString() +
        '). Switch between subjects/lessons to see all of it.';
    }

    document.getElementById('ws-load-btn').onclick = () => doLoad(false);

    document.getElementById('ws-submit-btn').onclick = async () => {
      const name = nameInput.value.trim();
      if (!name) {
        statusEl.textContent = '⚠️ Type your name first';
        return;
      }
      localStorage.setItem('hos_student_name', name);
      statusEl.textContent = 'Saving…';
      capturePage(lastPageKey);
      const ok = await saveSubmission(name, worksheetId, global.__wsAnswers, {});
      statusEl.textContent = ok
        ? '✅ Submitted! Your teacher can now see your work from every subject and lesson you visited.'
        : '❌ Something went wrong — please try again.';
    };

    if (nameInput.value) doLoad(true);
  }

  global.WorksheetSubmit = {
    init,
    initDynamic,
    collectFields,
    collectScores,
    fetchSubmission,
    saveSubmission,
    restoreFields,
    showFeedback,
  };
})(window);
