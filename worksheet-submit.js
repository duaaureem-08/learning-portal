/*
 * worksheet-submit.js  —  HOS International Learning Portal
 *
 * DROP-IN REPLACEMENT: just upload this file to GitHub, replaces the old one.
 *
 * WHAT IT DOES:
 *  - Text boxes     → saves automatically as student types
 *  - MCQ buttons    → locks immediately on click, cannot be changed
 *  - True/False     → locks immediately on click
 *  - All answers    → saved to localStorage instantly (works offline)
 *  - All answers    → saved to Supabase so teacher can see them
 *  - Page reload    → everything restores exactly as left
 *  - Works for ALL students, ALL weeks, ALL future worksheets automatically
 *
 * USAGE (already in every worksheet, no changes needed):
 *   <script src="worksheet-submit.js"></script>
 *   <script>WorksheetSubmit.init('KS3_L6_Week4_Day3');</script>
 */

const WorksheetSubmit = (() => {

  const SUPABASE_URL = 'https://ldftwnsixhgpfldhlkyq.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZnR3bnNpeGhncGZsZGhsa3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDM4NjMsImV4cCI6MjA5NjkxOTg2M30.EhShFmJgcsbrLqoZwA0nYfHRcCAzlS7mTkv4xHGAk_k';

  let worksheetId = '';
  let saveData = {};
  let saveTimer = null;
  let studentName = '';

  /* ── localStorage ── */
  function localKey() { return 'hos_ws_' + worksheetId; }
  function saveToLocal() {
    try { localStorage.setItem(localKey(), JSON.stringify({ name: studentName, answers: saveData })); } catch(e) {}
  }
  function loadFromLocal() {
    try {
      const raw = localStorage.getItem(localKey());
      if (!raw) return;
      const parsed = JSON.parse(raw);
      saveData = parsed.answers || {};
      studentName = parsed.name || '';
    } catch(e) {}
  }

  /* ── Supabase ── */
  async function saveToSupabase() {
    /* need at least a worksheet id */
    if (!worksheetId) return;
    const name = studentName || getNameFromPage() || 'unknown';
    try {
      /* First try to update existing row */
      const updateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/worksheet_submissions?worksheet_id=eq.${encodeURIComponent(worksheetId)}&student_name=eq.${encodeURIComponent(name)}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ answers: saveData, submitted_at: new Date().toISOString() })
        }
      );
      /* If no row existed (nothing was updated), insert a new one */
      if (updateRes.ok) {
        const count = updateRes.headers.get('content-range');
        if (count === '*/0' || count === null) {
          await fetch(`${SUPABASE_URL}/rest/v1/worksheet_submissions`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': 'Bearer ' + SUPABASE_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              worksheet_id: worksheetId,
              student_name: name,
              answers: saveData,
              submitted_at: new Date().toISOString()
            })
          });
        }
      }
      setSaveStatus('saved');
    } catch(e) {
      setSaveStatus('pending');
    }
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

  /* ── Get student name from the page ── */
  function getNameFromPage() {
    /* look for any input that looks like a name field */
    const candidates = document.querySelectorAll('input[type="text"], input:not([type])');
    for (const el of candidates) {
      const ph = (el.placeholder || '').toLowerCase();
      const label = (el.id || el.name || '').toLowerCase();
      if (ph.includes('name') || label.includes('name')) {
        return el.value.trim() || '';
      }
    }
    /* fallback: bottom-left student name display */
    const nameEl = document.querySelector('.student-name, #student-name, .name-tag');
    return nameEl ? nameEl.textContent.trim() : '';
  }

  /* ── Save status dot ── */
  function addSaveIndicator() {
    if (document.getElementById('hos-save-dot')) return;
    const dot = document.createElement('div');
    dot.id = 'hos-save-dot';
    Object.assign(dot.style, {
      position: 'fixed', bottom: '14px', right: '14px', zIndex: '99999',
      width: '12px', height: '12px', borderRadius: '50%',
      background: '#F59E0B', transition: 'background 0.4s',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)', cursor: 'default'
    });
    dot.title = 'Saving…';
    document.body.appendChild(dot);
  }

  function setSaveStatus(status) {
    const dot = document.getElementById('hos-save-dot');
    if (!dot) return;
    if (status === 'saved') {
      dot.style.background = '#10B981';
      dot.title = 'All answers saved ✓';
    } else {
      dot.style.background = '#F59E0B';
      dot.title = 'Saving…';
    }
  }

  /* ── TEXT INPUTS & TEXTAREAS ── */
  function watchTextInputs() {
    document.addEventListener('input', e => {
      const el = e.target;
      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
        /* if it looks like the name field, capture it */
        const ph = (el.placeholder || '').toLowerCase();
        if (ph.includes('name')) { studentName = el.value.trim(); }
        record('field_' + fieldIndex(el), el.value);
      }
    });
  }

  function fieldIndex(el) {
    if (el.id) return el.id;
    const all = Array.from(document.querySelectorAll('textarea, input'));
    return 'i' + all.indexOf(el);
  }

  function restoreTextInputs() {
    document.querySelectorAll('textarea, input[type="text"], input[type="number"], input:not([type])').forEach(el => {
      const key = 'field_' + fieldIndex(el);
      if (saveData[key] !== undefined) {
        el.value = saveData[key];
        /* trigger any listeners the page has */
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  /* ── MCQ BUTTONS ── */
  function watchMCQ() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('.quiz-opt, .option-btn, [data-option]');
      if (!btn) return;
      /* find sibling options */
      const parent = btn.closest('.quiz-options, .options, .quiz-box, .question-box') || btn.parentElement;
      const siblings = Array.from(parent.querySelectorAll('.quiz-opt, .option-btn, [data-option]'));
      if (!siblings.length) return;
      /* already locked? */
      if (siblings.some(b => b.dataset.hosLocked)) return;

      const key = 'mcq_' + mcqIndex(btn);
      record(key, btn.textContent.trim());
      lockGroup(siblings, btn);
    }, true);
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

  function mcqIndex(btn) {
    const all = Array.from(document.querySelectorAll('.quiz-opt, .option-btn, [data-option]'));
    return all.indexOf(btn);
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

  /* ── INIT ── */
  function init(id) {
    worksheetId = id;
    loadFromLocal();

    function setup() {
      addSaveIndicator();
      restoreTextInputs();
      restoreTF();
      setTimeout(restoreMCQ, 400);
      watchTextInputs();
      watchMCQ();
      watchTF();

      /* watch name field changes */
      document.addEventListener('blur', e => {
        const el = e.target;
        if (el.tagName === 'INPUT') {
          const ph = (el.placeholder || '').toLowerCase();
          if (ph.includes('name') && el.value.trim()) {
            studentName = el.value.trim();
            scheduleSave();
          }
        }
      }, true);

      /* save when page is about to close */
      window.addEventListener('beforeunload', () => {
        saveToLocal();
        saveToSupabase();
      });

      console.log('[HOS] Worksheet ready:', worksheetId, '| Loaded', Object.keys(saveData).length, 'saved answers');
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setup);
    } else {
      setup();
    }
  }

  return { init };

})();
