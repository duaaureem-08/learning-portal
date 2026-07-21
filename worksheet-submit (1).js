/*
 * worksheet-submit.js — HOS International Learning Portal
 * VERSION 3 — bulletproof cross-device saving
 *
 * Student identity priority:
 *   1. ?student= URL parameter (set by portal when link is clicked)
 *   2. Previously stored identity on this device (localStorage)
 *   3. Name typed into any name field on the page
 *
 * This means it works whether the worksheet is old or new,
 * opened via portal or directly, on any device.
 */

const WorksheetSubmit = (() => {

  const SUPABASE_URL = 'https://ldftwnsixhgpfldhlkyq.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZnR3bnNpeGhncGZsZGhsa3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDM4NjMsImV4cCI6MjA5NjkxOTg2M30.EhShFmJgcsbrLqoZwA0nYfHRcCAzlS7mTkv4xHGAk_k';
  const DEVICE_STUDENT_KEY = 'hos_device_student'; // persists across sessions on same device

  let worksheetId = '';
  let studentName = '';
  let saveData    = {};
  let saveTimer   = null;

  // ── Resolve student identity ─────────────────────────────────
  function resolveStudent() {
    // 1. URL parameter — most reliable, set by portal
    try {
      const p = new URLSearchParams(window.location.search);
      const fromURL = (p.get('student') || '').toLowerCase().trim();
      if (fromURL) {
        // Store on device so next visit without URL param still works
        try { localStorage.setItem(DEVICE_STUDENT_KEY, fromURL); } catch(e) {}
        return fromURL;
      }
    } catch(e) {}

    // 2. Previously stored on this device
    try {
      const stored = localStorage.getItem(DEVICE_STUDENT_KEY);
      if (stored) return stored.toLowerCase().trim();
    } catch(e) {}

    // 3. Will fall back to name field input — handled after DOM loads
    return '';
  }

  // ── Local storage helpers ────────────────────────────────────
  function localKey() {
    return 'hos_ws_' + worksheetId + '_' + studentName;
  }
  function saveToLocal() {
    if (!studentName) return;
    try { localStorage.setItem(localKey(), JSON.stringify(saveData)); } catch(e) {}
  }
  function loadFromLocal() {
    if (!studentName) return;
    try {
      const raw = localStorage.getItem(localKey());
      if (raw) saveData = JSON.parse(raw);
    } catch(e) {}
  }

  // ── Supabase helpers ─────────────────────────────────────────
  const SB_HEADERS = {
    'apikey':        SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type':  'application/json',
    'Prefer':        'resolution=merge-duplicates,return=minimal'
  };

  async function saveToSupabase() {
    if (!worksheetId || !studentName) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/worksheet_submissions`, {
        method:  'POST',
        headers: SB_HEADERS,
        body: JSON.stringify({
          worksheet_id: worksheetId,
          student_name: studentName,
          answers:      saveData,
          submitted_at: new Date().toISOString()
        })
      });
      setSaveStatus('saved');
    } catch(e) {
      setSaveStatus('pending');
    }
  }

  async function loadFromSupabase() {
    if (!worksheetId || !studentName) return;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/worksheet_submissions` +
        `?worksheet_id=eq.${encodeURIComponent(worksheetId)}` +
        `&student_name=eq.${encodeURIComponent(studentName)}` +
        `&select=answers&limit=1`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
      );
      const rows = await res.json();
      if (rows && rows[0] && rows[0].answers) {
        // Merge: local (more recent edits) wins over Supabase
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
    saveTimer = setTimeout(saveToSupabase, 1500);
  }

  function record(key, value) {
    saveData[key] = value;
    scheduleSave();
  }

  // ── Save status indicator ────────────────────────────────────
  function addSaveIndicator() {
    if (document.getElementById('hos-save-dot')) return;

    // Student tag (bottom left)
    if (studentName) {
      const tag = document.createElement('div');
      tag.id = 'hos-student-tag';
      Object.assign(tag.style, {
        position:'fixed', bottom:'14px', left:'14px', zIndex:'99999',
        background:'rgba(122,28,28,0.9)', borderRadius:'99px',
        padding:'5px 14px', fontSize:'0.75rem', color:'#FAF7F2',
        fontFamily:'sans-serif', fontWeight:'700',
        boxShadow:'0 2px 8px rgba(0,0,0,0.3)'
      });
      const display = studentName.charAt(0).toUpperCase() + studentName.slice(1);
      tag.textContent = '👤 ' + display;
      document.body.appendChild(tag);
    }

    // Save dot (bottom right)
    const dot = document.createElement('div');
    dot.id = 'hos-save-dot';
    Object.assign(dot.style, {
      position:'fixed', bottom:'14px', right:'14px', zIndex:'99999',
      display:'flex', alignItems:'center', gap:'6px',
      background:'rgba(0,0,0,0.75)', borderRadius:'99px',
      padding:'5px 12px 5px 8px', fontSize:'0.75rem',
      color:'white', fontFamily:'sans-serif',
      boxShadow:'0 2px 8px rgba(0,0,0,0.4)', transition:'opacity 0.3s'
    });
    dot.innerHTML =
      '<span id="hos-dot-circle" style="width:9px;height:9px;border-radius:50%;background:#F59E0B;display:inline-block;transition:background 0.4s;flex-shrink:0"></span>' +
      '<span id="hos-dot-label">Loading…</span>';
    document.body.appendChild(dot);
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

  // ── Field indexing ───────────────────────────────────────────
  function fieldKey(el) {
    if (el.id) return 'id_' + el.id;
    const all = Array.from(document.querySelectorAll('textarea, input'));
    return 'pos_' + all.indexOf(el);
  }

  // ── Watch & restore text inputs / textareas ──────────────────
  function watchTextInputs() {
    document.addEventListener('input', e => {
      const el = e.target;
      if (el.tagName !== 'TEXTAREA' && el.tagName !== 'INPUT') return;
      if (el.readOnly || el.disabled) return;

      // If student not yet known, check if this is a name field being filled
      if (!studentName) {
        const ph = (el.placeholder || '').toLowerCase();
        if (ph.includes('name') || el.dataset.nameField) {
          const val = el.value.trim().toLowerCase();
          if (val.length > 1) {
            studentName = val;
            try { localStorage.setItem(DEVICE_STUDENT_KEY, val); } catch(e) {}
            updateStudentTag();
            loadFromLocal();
            loadFromSupabase();
          }
        }
      }

      record(fieldKey(el), el.value);
    });
  }

  function restoreTextInputs() {
    document.querySelectorAll('textarea, input[type="text"], input[type="number"], input:not([type])').forEach(el => {
      if (el.readOnly || el.disabled) return;
      const k = fieldKey(el);
      if (saveData[k] !== undefined) el.value = saveData[k];
    });
  }

  function updateStudentTag() {
    const tag = document.getElementById('hos-student-tag');
    if (tag && studentName) {
      const display = studentName.charAt(0).toUpperCase() + studentName.slice(1);
      tag.textContent = '👤 ' + display;
    }
  }

  // ── Watch & restore MCQ buttons ──────────────────────────────
  function btnKey(btn) {
    const all = Array.from(document.querySelectorAll('.quiz-opt,.option-btn,[data-option],.mcq-btn'));
    return 'mcq_' + all.indexOf(btn);
  }

  function lockGroup(siblings, chosen) {
    siblings.forEach(b => {
      b.dataset.hosLocked = '1';
      b.style.pointerEvents = 'none';
      b.style.cursor = 'default';
      if (b !== chosen) b.style.opacity = '0.4';
      else { b.style.outline = '3px solid currentColor'; b.style.fontWeight = 'bold'; }
    });
  }

  function watchMCQ() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('.quiz-opt,.option-btn,[data-option],.mcq-btn');
      if (!btn || btn.dataset.hosLocked) return;
      const parent = btn.closest('.quiz-options,.options,.quiz-box,.question-box') || btn.parentElement;
      const siblings = Array.from(parent.querySelectorAll('.quiz-opt,.option-btn,[data-option],.mcq-btn'));
      if (!siblings.length || siblings.some(b => b.dataset.hosLocked)) return;
      record(btnKey(btn), btn.textContent.trim());
      lockGroup(siblings, btn);
    }, true);
  }

  function restoreMCQ() {
    const all = Array.from(document.querySelectorAll('.quiz-opt,.option-btn,[data-option],.mcq-btn'));
    Object.entries(saveData).forEach(([k, val]) => {
      if (!k.startsWith('mcq_')) return;
      const idx = parseInt(k.replace('mcq_', ''));
      const chosen = all[idx];
      if (!chosen || chosen.dataset.hosLocked) return;
      const parent = chosen.closest('.quiz-options,.options,.quiz-box,.question-box') || chosen.parentElement;
      const siblings = Array.from(parent.querySelectorAll('.quiz-opt,.option-btn,[data-option],.mcq-btn'));
      lockGroup(siblings, chosen);
    });
  }

  // ── Watch & restore True/False ───────────────────────────────
  function watchTF() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('.tf-btn,.true-btn,.false-btn,[data-tf]');
      if (!btn) return;
      const row = btn.closest('.tf-row,.tf-question,.true-false-row') || btn.parentElement;
      if (row.dataset.hosLocked) return;
      row.dataset.hosLocked = '1';
      const btns = Array.from(row.querySelectorAll('.tf-btn,.true-btn,.false-btn,[data-tf]'));
      btns.forEach(b => {
        b.style.pointerEvents = 'none';
        if (b !== btn) b.style.opacity = '0.4';
        else { b.style.outline = '3px solid currentColor'; b.style.fontWeight = 'bold'; }
      });
      const rows = Array.from(document.querySelectorAll('.tf-row,.tf-question,.true-false-row'));
      record('tf_' + rows.indexOf(row), btn.textContent.trim());
    }, true);
  }

  function restoreTF() {
    const rows = Array.from(document.querySelectorAll('.tf-row,.tf-question,.true-false-row'));
    Object.entries(saveData).forEach(([k, val]) => {
      if (!k.startsWith('tf_')) return;
      const row = rows[parseInt(k.replace('tf_', ''))];
      if (!row || row.dataset.hosLocked) return;
      row.dataset.hosLocked = '1';
      const btns = Array.from(row.querySelectorAll('.tf-btn,.true-btn,.false-btn,[data-tf]'));
      const chosen = btns.find(b => b.textContent.trim() === val);
      btns.forEach(b => {
        b.style.pointerEvents = 'none';
        if (b !== chosen) b.style.opacity = '0.4';
      });
      if (chosen) { chosen.style.outline = '3px solid currentColor'; chosen.style.fontWeight = 'bold'; }
    });
  }

  // ── Prefill name fields ──────────────────────────────────────
  function prefillNameFields() {
    if (!studentName) return;
    const display = studentName.charAt(0).toUpperCase() + studentName.slice(1);
    document.querySelectorAll('input[type="text"], input:not([type])').forEach(el => {
      const ph = (el.placeholder || '').toLowerCase();
      if (ph.includes('name') || ph.includes('your name') || el.dataset.nameField) {
        if (!el.value) el.value = display;
        el.readOnly = true;
      }
    });
  }

  // ── Restore everything ───────────────────────────────────────
  function restoreAll() {
    prefillNameFields();
    restoreTextInputs();
    restoreTF();
    setTimeout(restoreMCQ, 300);
  }

  // ── Init ─────────────────────────────────────────────────────
  function init(id) {
    worksheetId = id;
    studentName = resolveStudent();

    // Load local data immediately (fast)
    if (studentName) loadFromLocal();

    function setup() {
      addSaveIndicator();

      if (studentName) {
        restoreAll();
        // Load from Supabase in background (slow, merges with local)
        loadFromSupabase().then(() => setSaveStatus('saved'));
      } else {
        setSaveStatus('pending');
      }

      watchTextInputs();
      watchMCQ();
      watchTF();

      window.addEventListener('beforeunload', () => {
        saveToLocal();
        if (studentName) saveToSupabase();
      });

      console.log('[HOS v3] Worksheet:', worksheetId, '| Student:', studentName || 'unknown (waiting for name field)');
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setup);
    } else {
      setup();
    }
  }

  return { init };

})();
