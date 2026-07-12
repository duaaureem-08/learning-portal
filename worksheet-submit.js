/*
 * worksheet-submit.js  —  HOS International Learning Portal
 * VERSION 2 — cross-device fix
 *
 * The student identity now comes from the URL parameter ?student=jessica
 * set by the portal when the link is clicked. This means answers are tied
 * to the student PIN, not to whatever they type in a name field, so
 * loading on any device/browser works correctly.
 *
 * USAGE (same as before, no changes needed in worksheet files):
 *   <script src="worksheet-submit.js"></script>
 *   <script>WorksheetSubmit.init('KS3_L6_Week6_Day1');</script>
 */

const WorksheetSubmit = (() => {

  const SUPABASE_URL = 'https://ldftwnsixhgpfldhlkyq.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZnR3bnNpeGhncGZsZGhsa3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDM4NjMsImV4cCI6MjA5NjkxOTg2M30.EhShFmJgcsbrLqoZwA0nYfHRcCAzlS7mTkv4xHGAk_k';

  let worksheetId = '';
  let saveData    = {};
  let saveTimer   = null;

  /* ── Student identity from URL (?student=jessica) ── */
  function getStudentFromURL() {
    try {
      const p = new URLSearchParams(window.location.search);
      return (p.get('student') || '').toLowerCase().trim();
    } catch(e) { return ''; }
  }

  let studentName = getStudentFromURL() || 'unknown';

  /* Pre-fill the name field on the page so the student sees their name */
  function prefillNameFields() {
    if (!studentName || studentName === 'unknown') return;
    const display = studentName.charAt(0).toUpperCase() + studentName.slice(1);
    document.querySelectorAll('input[type="text"], input:not([type])').forEach(el => {
      const ph = (el.placeholder || '').toLowerCase();
      if (ph.includes('name') || ph.includes('your name')) {
        el.value = display;
        el.readOnly = true; /* name is set by portal — no manual editing */
      }
    });
  }

  /* ── localStorage (same-device instant restore) ── */
  function localKey() { return 'hos_ws_' + worksheetId + '_' + studentName; }
  function saveToLocal() {
    try { localStorage.setItem(localKey(), JSON.stringify(saveData)); } catch(e) {}
  }
  function loadFromLocal() {
    try {
      const raw = localStorage.getItem(localKey());
      if (raw) saveData = JSON.parse(raw);
    } catch(e) {}
  }

  /* ── Supabase ── */
  async function saveToSupabase() {
    if (!worksheetId || !studentName) return;
    const body = {
      worksheet_id:  worksheetId,
      student_name:  studentName,
      answers:       saveData,
      submitted_at:  new Date().toISOString()
    };
    try {
      /* upsert: update if exists, insert if not */
      await fetch(`${SUPABASE_URL}/rest/v1/worksheet_submissions`, {
        method: 'POST',
        headers: {
          'apikey':        SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type':  'application/json',
          'Prefer':        'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify(body)
      });
      setSaveStatus('saved');
    } catch(e) {
      setSaveStatus('pending');
    }
  }

  async function loadFromSupabase() {
    if (!worksheetId || !studentName || studentName === 'unknown') return;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/worksheet_submissions` +
        `?worksheet_id=eq.${encodeURIComponent(worksheetId)}` +
        `&student_name=eq.${encodeURIComponent(studentName)}` +
        `&select=answers&limit=1`,
        {
          headers: {
            'apikey':        SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY
          }
        }
      );
      const rows = await res.json();
      if (rows && rows[0] && rows[0].answers) {
        /* merge with localStorage (local is usually newer) */
        saveData = Object.assign({}, rows[0].answers, saveData);
        restoreAll();
        setSaveStatus('saved');
      }
    } catch(e) {}
  }

  function scheduleSave() {
    saveToLocal();
    setSaveStatus('pending');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveToSupabase, 1200);
  }

  function record(key, value) {
    saveData[key] = value;
    scheduleSave();
  }

  /* ── Save status dot ── */
  function addSaveIndicator() {
    if (document.getElementById('hos-save-dot')) return;
    const dot = document.createElement('div');
    dot.id = 'hos-save-dot';
    Object.assign(dot.style, {
      position: 'fixed', bottom: '14px', right: '14px', zIndex: '99999',
      display: 'flex', alignItems: 'center', gap: '6px',
      background: 'rgba(0,0,0,0.7)', borderRadius: '99px',
      padding: '5px 12px 5px 8px', fontSize: '0.75rem',
      color: 'white', fontFamily: 'sans-serif', cursor: 'default',
      boxShadow: '0 2px 8px rgba(0,0,0,0.4)', transition: 'opacity 0.3s'
    });
    dot.innerHTML = '<span id="hos-dot-circle" style="width:9px;height:9px;border-radius:50%;background:#F59E0B;display:inline-block;transition:background 0.4s;flex-shrink:0"></span>' +
                    '<span id="hos-dot-label">Saving…</span>';
    document.body.appendChild(dot);

    /* show who is logged in */
    if (studentName && studentName !== 'unknown') {
      const name = studentName.charAt(0).toUpperCase() + studentName.slice(1);
      const tag = document.createElement('div');
      Object.assign(tag.style, {
        position: 'fixed', bottom: '14px', left: '14px', zIndex: '99999',
        background: 'rgba(0,0,0,0.7)', borderRadius: '99px',
        padding: '5px 14px', fontSize: '0.75rem', color: '#A78BFA',
        fontFamily: 'sans-serif', fontWeight: '700'
      });
      tag.textContent = '👤 ' + name;
      document.body.appendChild(tag);
    }
  }

  function setSaveStatus(status) {
    const circle = document.getElementById('hos-dot-circle');
    const label  = document.getElementById('hos-dot-label');
    if (!circle || !label) return;
    if (status === 'saved') {
      circle.style.background = '#10B981';
      label.textContent = 'Saved ✓';
    } else {
      circle.style.background = '#F59E0B';
      label.textContent = 'Saving…';
    }
  }

  /* ── TEXT INPUTS & TEXTAREAS ── */
  function fieldIndex(el) {
    if (el.id) return el.id;
    const all = Array.from(document.querySelectorAll('textarea, input'));
    return 'i' + all.indexOf(el);
  }

  function watchTextInputs() {
    document.addEventListener('input', e => {
      const el = e.target;
      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
        if (el.readOnly) return; /* skip locked name fields */
        record('field_' + fieldIndex(el), el.value);
      }
    });
  }

  function restoreTextInputs() {
    document.querySelectorAll('textarea, input[type="text"], input[type="number"], input:not([type])').forEach(el => {
      if (el.readOnly) return;
      const key = 'field_' + fieldIndex(el);
      if (saveData[key] !== undefined) {
        el.value = saveData[key];
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  /* ── MCQ BUTTONS ── */
  function mcqIndex(btn) {
    const all = Array.from(document.querySelectorAll('.quiz-opt, .option-btn, [data-option]'));
    return all.indexOf(btn);
  }

  function lockGroup(siblings, chosen) {
    siblings.forEach(b => {
      b.dataset.hosLocked = '1';
      b.style.pointerEvents = 'none';
      b.style.cursor = 'default';
      if (b !== chosen) {
        b.style.opacity = '0.4';
      } else {
        b.style.outline = '3px solid currentColor';
        b.style.fontWeight = 'bold';
      }
    });
  }

  function watchMCQ() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('.quiz-opt, .option-btn, [data-option]');
      if (!btn) return;
      const parent = btn.closest('.quiz-options, .options, .quiz-box, .question-box') || btn.parentElement;
      const siblings = Array.from(parent.querySelectorAll('.quiz-opt, .option-btn, [data-option]'));
      if (!siblings.length) return;
      if (siblings.some(b => b.dataset.hosLocked)) return;
      const key = 'mcq_' + mcqIndex(btn);
      record(key, btn.textContent.trim());
      lockGroup(siblings, btn);
    }, true);
  }

  function restoreMCQ() {
    const all = Array.from(document.querySelectorAll('.quiz-opt, .option-btn, [data-option]'));
    Object.entries(saveData).forEach(([key, val]) => {
      if (!key.startsWith('mcq_')) return;
      const idx = parseInt(key.replace('mcq_', ''));
      const chosen = all[idx];
      if (!chosen || chosen.dataset.hosLocked) return;
      const parent = chosen.closest('.quiz-options, .options, .quiz-box, .question-box') || chosen.parentElement;
      const siblings = Array.from(parent.querySelectorAll('.quiz-opt, .option-btn, [data-option]'));
      lockGroup(siblings, chosen);
    });
  }

  /* ── TRUE / FALSE ── */
  function watchTF() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('.tf-btn, .true-btn, .false-btn, [data-tf]');
      if (!btn) return;
      const row = btn.closest('.tf-row, .tf-question, .true-false-row') || btn.parentElement;
      if (row.dataset.hosLocked) return;
      row.dataset.hosLocked = '1';
      const allBtns = Array.from(row.querySelectorAll('.tf-btn, .true-btn, .false-btn, [data-tf]'));
      allBtns.forEach(b => {
        b.style.pointerEvents = 'none';
        b.style.cursor = 'default';
        if (b !== btn) b.style.opacity = '0.4';
      });
      btn.style.outline = '3px solid currentColor';
      btn.style.fontWeight = 'bold';
      const rows = Array.from(document.querySelectorAll('.tf-row, .tf-question, .true-false-row'));
      record('tf_' + rows.indexOf(row), btn.textContent.trim());
    }, true);
  }

  function restoreTF() {
    const rows = Array.from(document.querySelectorAll('.tf-row, .tf-question, .true-false-row'));
    Object.entries(saveData).forEach(([key, val]) => {
      if (!key.startsWith('tf_')) return;
      const idx = parseInt(key.replace('tf_', ''));
      const row = rows[idx];
      if (!row || row.dataset.hosLocked) return;
      row.dataset.hosLocked = '1';
      const allBtns = Array.from(row.querySelectorAll('.tf-btn, .true-btn, .false-btn, [data-tf]'));
      const chosen = allBtns.find(b => b.textContent.trim() === val) || allBtns[0];
      allBtns.forEach(b => {
        b.style.pointerEvents = 'none';
        if (b !== chosen) b.style.opacity = '0.4';
      });
      if (chosen) { chosen.style.outline = '3px solid currentColor'; chosen.style.fontWeight = 'bold'; }
    });
  }

  /* ── RESTORE ALL ── */
  function restoreAll() {
    prefillNameFields();
    restoreTextInputs();
    restoreTF();
    setTimeout(restoreMCQ, 400);
  }

  /* ── INIT ── */
  function init(id) {
    worksheetId = id;
    loadFromLocal();

    function setup() {
      addSaveIndicator();
      restoreAll();
      watchTextInputs();
      watchMCQ();
      watchTF();

      /* load from Supabase in background — merges with local */
      loadFromSupabase();

      window.addEventListener('beforeunload', () => {
        saveToLocal();
        saveToSupabase();
      });

      console.log('[HOS] Worksheet ready:', worksheetId, '| Student:', studentName, '| Loaded', Object.keys(saveData).length, 'answers');
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setup);
    } else {
      setup();
    }
  }

  return { init };

})();
