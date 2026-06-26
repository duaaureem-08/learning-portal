/*
 * worksheet-submit.js
 * HOS International Learning Portal
 *
 * HOW IT WORKS:
 *  - Every textarea / text input  → saves automatically as you type (debounced 800ms)
 *  - Every MCQ / quiz button click → locks immediately, answer cannot be changed
 *  - Every True/False button click → locks immediately
 *  - Every match item, word chip, order item → locks on interaction
 *  - All answers saved to localStorage instantly (works offline)
 *  - All answers also sent to Supabase (visible to teacher)
 *  - On page reload → every answer is restored exactly as left
 *
 * USAGE (already in every worksheet HTML, no changes needed):
 *   <script src="worksheet-submit.js"></script>
 *   <script>WorksheetSubmit.init('WORKSHEET_ID_HERE');</script>
 */

const WorksheetSubmit = (() => {

  /* ── Supabase config ── */
  const SUPABASE_URL = 'https://ldftwnsixhgpfldhlkyq.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZnR3bnNpeGhncGZsZGhsa3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDM4NjMsImV4cCI6MjA5NjkxOTg2M30.EhShFmJgcsbrLqoZwA0nYfHRcCAzlS7mTkv4xHGAk_k';

  let worksheetId = '';
  let saveData = {};      // { key: value } — everything the student has done
  let saveTimer = null;

  /* ══════════════════════════════════════════════
     STORAGE HELPERS
  ══════════════════════════════════════════════ */

  function localKey() {
    return 'hos_ws_' + worksheetId;
  }

  function loadFromLocal() {
    try {
      const raw = localStorage.getItem(localKey());
      return raw ? JSON.parse(raw) : {};
    } catch(e) { return {}; }
  }

  function saveToLocal() {
    try {
      localStorage.setItem(localKey(), JSON.stringify(saveData));
    } catch(e) {}
  }

  /* Send to Supabase — upsert so it works first time and every update */
  async function saveToSupabase() {
    const studentName = getStudentName();
    if (!studentName) return;   // don't save until name is entered
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/worksheet_submissions`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          worksheet_id: worksheetId,
          student_name: studentName,
          answers: saveData,
          submitted_at: new Date().toISOString()
        })
      });
    } catch(e) {
      /* silent fail — data is safe in localStorage */
    }
  }

  /* Save both places; debounced so rapid typing doesn't spam */
  function persist(debounceMs = 800) {
    saveToLocal();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveToSupabase, debounceMs);
  }

  /* Record a single answer and persist */
  function record(key, value) {
    saveData[key] = value;
    persist();
  }

  /* Get student name from any name field on the page */
  function getStudentName() {
    const el = document.querySelector(
      'input[placeholder*="name" i], input[placeholder*="Name" i], .name-field input'
    );
    return el ? (el.value || '').trim() : '';
  }


  /* ══════════════════════════════════════════════
     TEXT INPUTS & TEXTAREAS
     Auto-save as the student types.
     Restore value on load.
  ══════════════════════════════════════════════ */

  function watchTextInputs() {
    /* Watch all existing + future inputs via event delegation */
    document.addEventListener('input', e => {
      const el = e.target;
      if (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type !== 'button')) {
        const key = fieldKey(el);
        record(key, el.value);
      }
    });
  }

  function restoreTextInputs() {
    document.querySelectorAll('textarea, input[type="text"], input[type="number"]').forEach(el => {
      const key = fieldKey(el);
      if (saveData[key] !== undefined) {
        el.value = saveData[key];
      }
    });
  }

  /* Build a stable key from element position */
  function fieldKey(el) {
    if (el.id) return 'field_' + el.id;
    /* fallback: index among all inputs */
    const all = Array.from(document.querySelectorAll('textarea, input'));
    return 'field_idx_' + all.indexOf(el);
  }


  /* ══════════════════════════════════════════════
     MCQ BUTTONS  (quiz-opt class)
     Lock on first click. Restore colour + disabled on reload.
  ══════════════════════════════════════════════ */

  function watchMCQ() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('.quiz-opt');
      if (!btn) return;
      /* if any sibling is already locked, ignore */
      const container = btn.closest('.quiz-options, .quiz-box, div');
      const siblings = container ? container.querySelectorAll('.quiz-opt') : [btn];
      const alreadyLocked = Array.from(siblings).some(b => b.dataset.locked);
      if (alreadyLocked) return;

      /* lock all options in this question */
      const key = mcqKey(btn);
      record(key, btn.textContent.trim());
      lockMCQGroup(siblings, btn);
    }, true); /* capture so it fires before existing handlers */
  }

  function lockMCQGroup(siblings, chosen) {
    siblings.forEach(b => {
      b.dataset.locked = '1';
      b.style.pointerEvents = 'none';
      b.style.opacity = b === chosen ? '1' : '0.45';
      if (b === chosen) {
        b.style.outline = '3px solid currentColor';
        b.style.fontWeight = '900';
      }
    });
  }

  function mcqKey(btn) {
    const all = Array.from(document.querySelectorAll('.quiz-opt'));
    return 'mcq_' + all.indexOf(btn);
  }

  function restoreMCQ() {
    /* For each recorded MCQ answer, find the group and lock it */
    Object.entries(saveData).forEach(([key, val]) => {
      if (!key.startsWith('mcq_')) return;
      const idx = parseInt(key.replace('mcq_', ''));
      const allOpts = Array.from(document.querySelectorAll('.quiz-opt'));
      const chosen = allOpts[idx];
      if (!chosen) return;

      /* find siblings — walk up to find options in same question */
      const parent = chosen.closest('.quiz-options') ||
                     chosen.parentElement;
      const siblings = parent ? parent.querySelectorAll('.quiz-opt') : [chosen];
      lockMCQGroup(Array.from(siblings), chosen);
    });
  }


  /* ══════════════════════════════════════════════
     TRUE / FALSE BUTTONS  (tf-btn class)
     Lock the chosen answer immediately.
  ══════════════════════════════════════════════ */

  function watchTF() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('.tf-btn');
      if (!btn) return;
      const row = btn.closest('.tf-row');
      if (!row) return;
      if (row.dataset.locked) return;   /* already answered */

      row.dataset.locked = '1';
      const key = tfKey(row);
      const val = btn.classList.contains('t-btn') ? 'T' : 'F';
      record(key, val);

      /* visual lock */
      row.querySelectorAll('.tf-btn').forEach(b => {
        b.style.pointerEvents = 'none';
        if (b !== btn) b.style.opacity = '0.4';
      });
      btn.style.outline = '3px solid currentColor';
      btn.style.fontWeight = '900';
    }, true);
  }

  function tfKey(row) {
    const all = Array.from(document.querySelectorAll('.tf-row'));
    return 'tf_' + all.indexOf(row);
  }

  function restoreTF() {
    Object.entries(saveData).forEach(([key, val]) => {
      if (!key.startsWith('tf_')) return;
      const idx = parseInt(key.replace('tf_', ''));
      const row = document.querySelectorAll('.tf-row')[idx];
      if (!row || row.dataset.locked) return;

      row.dataset.locked = '1';
      const tBtn = row.querySelector('.t-btn');
      const fBtn = row.querySelector('.f-btn');
      const chosen = val === 'T' ? tBtn : fBtn;
      if (!chosen) return;

      row.querySelectorAll('.tf-btn').forEach(b => {
        b.style.pointerEvents = 'none';
        if (b !== chosen) b.style.opacity = '0.4';
      });
      chosen.classList.add('chosen');
      chosen.style.outline = '3px solid currentColor';
      chosen.style.fontWeight = '900';
    });
  }


  /* ══════════════════════════════════════════════
     MATCH ITEMS  (match-item class)
     Already lock themselves when matched; we just
     record state changes so teacher can see.
  ══════════════════════════════════════════════ */

  function watchMatch() {
    /* Observe DOM for class changes on match-item elements */
    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          const el = m.target;
          if (el.classList.contains('match-item') && el.classList.contains('matched')) {
            const key = 'match_' + (el.dataset.id || el.textContent.trim().slice(0,30));
            record(key, 'matched');
          }
        }
      });
    });
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
  }


  /* ══════════════════════════════════════════════
     WORD CHIPS  (word-chip class)
     Lock once used (they already get .used class).
     Record which word went where.
  ══════════════════════════════════════════════ */

  function watchWordChips() {
    /* Watch for .used being added */
    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          const el = m.target;
          if (el.classList.contains('word-chip') && el.classList.contains('used')) {
            const key = 'chip_' + el.textContent.trim().slice(0,40);
            record(key, 'used');
          }
        }
      });
    });
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });

    /* Also watch fill-in spans for placed words */
    const spanObserver = new MutationObserver(mutations => {
      mutations.forEach(m => {
        if (m.type === 'characterData' || m.type === 'childList') {
          const el = m.target.nodeType === 1 ? m.target : m.target.parentElement;
          if (el && el.id && el.dataset && el.dataset.placed) {
            record('placed_' + el.id, el.dataset.placed);
          }
        }
      });
    });
    spanObserver.observe(document.body, { subtree: true, childList: true, characterData: true });
  }

  /* Watch data-placed attribute being set on fill-in spans */
  function watchPlacedSpans() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        if (m.type === 'attributes' && m.attributeName === 'data-placed') {
          const el = m.target;
          if (el.id) {
            record('placed_' + el.id, el.dataset.placed || el.textContent.trim());
          }
        }
      });
    });
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['data-placed'] });
  }

  function restorePlacedSpans() {
    Object.entries(saveData).forEach(([key, val]) => {
      if (!key.startsWith('placed_')) return;
      const id = key.replace('placed_', '');
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = val;
      el.dataset.placed = val;
      el.style.borderBottom = 'none';
      el.style.fontWeight = '900';
    });
  }


  /* ══════════════════════════════════════════════
     ORDER ITEMS  (.order-num class)
     Lock once a number is set.
  ══════════════════════════════════════════════ */

  function watchOrderItems() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          const el = m.target;
          if (el.classList.contains('order-num') && el.classList.contains('set')) {
            const item = el.closest('.order-item');
            if (item) {
              const key = 'order_' + item.dataset.text?.slice(0,40);
              record(key, el.textContent.trim());
            }
          }
        }
      });
    });
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
  }

  function restoreOrderItems() {
    Object.entries(saveData).forEach(([key, val]) => {
      if (!key.startsWith('order_')) return;
      const text = key.replace('order_', '');
      document.querySelectorAll('.order-item').forEach(item => {
        if ((item.dataset.text || '').slice(0,40) === text) {
          const numEl = item.querySelector('.order-num');
          if (numEl && !numEl.classList.contains('set')) {
            numEl.textContent = val;
            numEl.classList.add('set');
            numEl.style.background = 'var(--accent, #7C3AED)';
            numEl.style.color = 'white';
            numEl.style.borderColor = 'var(--accent, #7C3AED)';
          }
        }
      });
    });
  }


  /* ══════════════════════════════════════════════
     SENTENCE TYPE BUTTONS  (inline style buttons
     in the sentence quiz — no class, use delegation)
  ══════════════════════════════════════════════ */

  function watchSentenceButtons() {
    document.addEventListener('click', e => {
      /* Sentence type buttons are inside #english-sent */
      const container = document.getElementById('english-sent');
      if (!container) return;
      const btn = e.target.closest('button');
      if (!btn || !container.contains(btn)) return;
      if (btn.dataset.locked) return;

      /* lock all buttons in that quiz-box */
      const box = btn.closest('.quiz-box') || container;
      box.querySelectorAll('button').forEach(b => {
        b.dataset.locked = '1';
        b.style.pointerEvents = 'none';
        if (b !== btn) b.style.opacity = '0.4';
      });
      btn.style.outline = '3px solid white';

      record('sentbtn_' + (container.dataset.qIdx || '0'), btn.textContent.trim());
    }, true);
  }


  /* ══════════════════════════════════════════════
     MEMORY VERSE WORDS  (word-chip onclick)
     Already handled by watchWordChips above.
     Also watch for mv span text changes.
  ══════════════════════════════════════════════ */

  function watchMemoryVerse() {
    ['mv1','mv2','mv3','mv4'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new MutationObserver(() => {
        if (el.textContent.trim() && el.textContent.trim() !== '______') {
          record('mv_' + id, el.textContent.trim());
        }
      });
      obs.observe(el, { characterData: true, childList: true, subtree: true });
    });
  }

  function restoreMemoryVerse() {
    ['mv1','mv2','mv3','mv4'].forEach(id => {
      const val = saveData['mv_' + id];
      if (!val) return;
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = val;
      el.style.borderBottom = 'none';
      el.style.fontWeight = '900';
      el.style.color = 'var(--bible-d, #5B21B6)';
    });
  }


  /* ══════════════════════════════════════════════
     NAME FIELD — trigger a Supabase save when
     the student finishes typing their name
  ══════════════════════════════════════════════ */

  function watchNameField() {
    document.addEventListener('blur', e => {
      const el = e.target;
      if (el.tagName === 'INPUT' &&
          (el.placeholder || '').toLowerCase().includes('name')) {
        /* name was just filled — push everything to Supabase now */
        clearTimeout(saveTimer);
        saveToSupabase();
      }
    }, true);
  }


  /* ══════════════════════════════════════════════
     SAVE STATUS INDICATOR
     Small floating dot — green when saved, orange when pending
  ══════════════════════════════════════════════ */

  function addSaveIndicator() {
    const dot = document.createElement('div');
    dot.id = 'hos-save-dot';
    dot.title = 'Saving…';
    dot.style.cssText = `
      position:fixed;bottom:14px;right:14px;z-index:9999;
      width:12px;height:12px;border-radius:50%;
      background:#F59E0B;transition:background 0.4s;
      box-shadow:0 2px 6px rgba(0,0,0,0.25);
    `;
    document.body.appendChild(dot);

    /* Hook into persist to show pending/saved state */
    const origPersist = persist;
    window._hosSaveDot = dot;
  }

  function setSaveStatus(status) {
    const dot = document.getElementById('hos-save-dot');
    if (!dot) return;
    if (status === 'saved') {
      dot.style.background = '#10B981'; /* green */
      dot.title = 'All answers saved ✓';
    } else {
      dot.style.background = '#F59E0B'; /* orange */
      dot.title = 'Saving…';
    }
  }


  /* ══════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════ */

  function init(id) {
    worksheetId = id;

    /* 1. Load whatever was already saved */
    saveData = loadFromLocal();

    /* 2. Wait for DOM to be ready, then restore + start watching */
    function setup() {
      /* Restore all saved state */
      restoreTextInputs();
      restoreTF();
      restoreOrderItems();
      restorePlacedSpans();
      restoreMemoryVerse();

      /* MCQ restore happens slightly later because quiz engines
         may render questions dynamically */
      setTimeout(restoreMCQ, 300);

      /* Start watching everything */
      watchTextInputs();
      watchMCQ();
      watchTF();
      watchMatch();
      watchWordChips();
      watchPlacedSpans();
      watchOrderItems();
      watchSentenceButtons();
      watchMemoryVerse();
      watchNameField();

      /* Patch persist to update indicator */
      const _orig = saveToSupabase;
      /* Add save indicator */
      addSaveIndicator();

      /* Override the save flow to update dot */
      const origRecord = record;

      /* Monkey-patch saveToLocal to turn dot orange */
      const _origSaveToLocal = saveToLocal;

      /* Simple approach: turn dot orange on any interaction,
         green 1.5s after last Supabase save */
      document.addEventListener('input', () => setSaveStatus('pending'), true);
      document.addEventListener('click', () => setSaveStatus('pending'), true);

      /* Patch saveToSupabase to turn dot green on success */
      const patchedSave = async () => {
        await _orig();
        setSaveStatus('saved');
      };
      /* replace the module-level function reference */
      window._hosSaveToSupabase = patchedSave;

      /* Re-do the timer to use patched version */
      document.addEventListener('input', () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(patchedSave, 800);
      }, true);
      document.addEventListener('click', () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(patchedSave, 800);
      }, true);

      console.log('[HOS] WorksheetSubmit ready for:', worksheetId, '— loaded', Object.keys(saveData).length, 'saved answers');
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setup);
    } else {
      setup();
    }
  }

  return { init };

})();
