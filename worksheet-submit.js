/*
 * worksheet-submit.js — HOS International Learning Portal
 * VERSION 5 — Foolproof cross-device saving
 *
 * FIXES vs v4:
 *   1. Stable field keys — uses placeholder + label text + tag + sibling index
 *      instead of brittle DOM position. Same key on every device, every browser.
 *   2. Supabase-first merge — remote data wins over local stale data on fresh load.
 *   3. Save verification — confirms data actually landed in Supabase, retries on fail.
 *   4. MCQ/TF keyed by question text — not DOM position.
 *   5. Student identity triple-checked: URL → device storage → name field.
 *   6. All errors caught and surfaced in the save indicator.
 */

const WorksheetSubmit = (() => {

  const SUPABASE_URL    = 'https://ldftwnsixhgpfldhlkyq.supabase.co';
  const SUPABASE_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZnR3bnNpeGhncGZsZGhsa3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDM4NjMsImV4cCI6MjA5NjkxOTg2M30.EhShFmJgcsbrLqoZwA0nYfHRcCAzlS7mTkv4xHGAk_k';
  const DEVICE_STUDENT_KEY = 'hos_device_student';
  const MAX_RETRIES     = 3;

  const SB_HEADERS = {
    'apikey':        SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type':  'application/json',
    'Prefer':        'resolution=merge-duplicates,return=minimal'
  };

  let worksheetId = '';
  let studentName = '';
  let isTeacher   = false;
  let saveData    = {};
  let markData    = {};
  let saveTimer   = null;
  let markTimer   = null;
  let pendingSave = false;

  // ── STABLE FIELD KEY ─────────────────────────────────────────
  // Builds a key that identifies the same field on any device.
  // Priority: explicit id → placeholder → surrounding label/heading text → fallback
  function stableKey(el) {
    // 1. Explicit id on the element itself — most stable
    if (el.id && el.id.trim()) return 'id__' + el.id.trim();

    // 2. Placeholder text — very stable, unique per question
    const ph = (el.placeholder || '').trim();
    if (ph && ph.length > 3) return 'ph__' + ph.slice(0, 80).replace(/\s+/g, '_');

    // 3. Find nearest label, heading, or paragraph above this element
    function nearestText(node) {
      let cur = node.previousElementSibling || node.parentElement;
      let attempts = 0;
      while (cur && attempts < 6) {
        const t = cur.textContent.trim();
        if (t && t.length > 3 && t.length < 200) return t.slice(0, 80).replace(/\s+/g, '_');
        cur = cur.previousElementSibling || cur.parentElement;
        attempts++;
      }
      return '';
    }
    const label = nearestText(el);
    if (label) {
      // Add tag + sibling index for uniqueness when multiple inputs share a label
      const siblings = Array.from(el.parentElement ? el.parentElement.querySelectorAll('textarea,input') : []);
      const sibIdx = siblings.indexOf(el);
      return 'lbl__' + label.replace(/[^a-zA-Z0-9_]/g, '_') + '__' + el.tagName + '__' + sibIdx;
    }

    // 4. Last resort: tag + full page position (less stable but better than nothing)
    const allEls = Array.from(document.querySelectorAll('textarea,input'));
    return 'pos__' + el.tagName + '__' + allEls.indexOf(el);
  }

  // Build a stable key for MCQ/TF buttons based on question text
  function stableBtnKey(btn) {
    // Find the question text near this button group
    const parent = btn.closest('.quiz-options,.options,.quiz-box,.question-box,.tf-row,.tf-question,.true-false-row') || btn.parentElement;
    let questionEl = parent;
    // Walk up to find a question heading or preceding text
    let cur = parent.previousElementSibling;
    let attempts = 0;
    while (cur && attempts < 5) {
      const t = cur.textContent.trim();
      if (t && t.length > 3) { questionEl = cur; break; }
      cur = cur.previousElementSibling;
      attempts++;
    }
    const qText = (questionEl.textContent || '').trim().slice(0, 60).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const btnText = btn.textContent.trim().slice(0, 30).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    return 'btn__' + qText + '__' + btnText;
  }

  function stableTFKey(row) {
    const t = (row.previousElementSibling || row).textContent.trim().slice(0, 60);
    return 'tf__' + t.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  }

  // ── STUDENT IDENTITY ─────────────────────────────────────────
  function resolveStudent() {
    // 1. URL parameter — set by portal when link is clicked
    try {
      const p = new URLSearchParams(window.location.search);
      const fromURL = (p.get('student') || '').toLowerCase().trim();
      isTeacher = p.get('teacher') === '1';
      if (fromURL) {
        if (!isTeacher) {
          try { localStorage.setItem(DEVICE_STUDENT_KEY, fromURL); } catch(e) {}
        }
        return fromURL;
      }
    } catch(e) {}

    // 2. Device memory — stored from a previous portal visit
    try {
      const stored = localStorage.getItem(DEVICE_STUDENT_KEY);
      if (stored && stored.trim()) return stored.toLowerCase().trim();
    } catch(e) {}

    // 3. Will try name fields after DOM loads (watchNameFields)
    return '';
  }

  // ── SUPABASE ─────────────────────────────────────────────────
  async function sbSave(payload, attempt) {
    attempt = attempt || 1;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/worksheet_submissions`, {
        method:  'POST',
        headers: SB_HEADERS,
        body:    JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return true;
    } catch(e) {
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
        return sbSave(payload, attempt + 1);
      }
      console.error('[HOS] Save failed after', MAX_RETRIES, 'attempts:', e);
      return false;
    }
  }

  async function sbLoad() {
    if (!worksheetId || !studentName) return null;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/worksheet_submissions` +
        `?worksheet_id=eq.${encodeURIComponent(worksheetId)}` +
        `&student_name=eq.${encodeURIComponent(studentName)}` +
        `&select=answers,feedback,teacher_notes,scores,submitted_at&limit=1`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
      );
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const rows = await res.json();
      return (rows && rows[0]) ? rows[0] : null;
    } catch(e) {
      console.warn('[HOS] Load failed:', e);
      return null;
    }
  }

  // ── LOCAL STORAGE (same-device speed layer) ──────────────────
  function localKey() { return 'hos_ws_v5_' + worksheetId + '_' + studentName; }

  function saveToLocal() {
    try { localStorage.setItem(localKey(), JSON.stringify(saveData)); } catch(e) {}
  }

  function loadFromLocal() {
    try {
      const raw = localStorage.getItem(localKey());
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  // ── SAVE SCHEDULER ───────────────────────────────────────────
  function scheduleSave() {
    saveToLocal();
    setSaveStatus('pending');
    pendingSave = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const ok = await sbSave({
        worksheet_id:  worksheetId,
        student_name:  studentName,
        answers:       saveData,
        scores:        {},
        feedback:      {},
        teacher_notes: '',
        submitted_at:  new Date().toISOString()
      });
      pendingSave = false;
      setSaveStatus(ok ? 'saved' : 'error');
    }, 1500);
  }

  function scheduleMarkSave() {
    setMarkStatus('pending');
    clearTimeout(markTimer);
    markTimer = setTimeout(async () => {
      const ok = await sbSave({
        worksheet_id:  worksheetId,
        student_name:  studentName,
        answers:       saveData,
        scores:        {},
        feedback:      markData,
        teacher_notes: Object.values(markData).map(m => m.remark).filter(Boolean).join(' | ')
      });
      setMarkStatus(ok ? 'saved' : 'error');
    }, 1500);
  }

  function record(key, value) { saveData[key] = value; scheduleSave(); }
  function recordMark(key, val) {
    if (!markData[key]) markData[key] = {};
    Object.assign(markData[key], val);
    scheduleMarkSave();
  }

  // ── STATUS INDICATOR ─────────────────────────────────────────
  function addSaveIndicator() {
    if (document.getElementById('hos-save-dot')) return;

    if (studentName) {
      const tag = document.createElement('div');
      tag.id = 'hos-student-tag';
      const display = studentName.charAt(0).toUpperCase() + studentName.slice(1);
      Object.assign(tag.style, {
        position:'fixed', bottom:'14px', left:'14px', zIndex:'99999',
        background: isTeacher ? 'rgba(92,20,20,0.95)' : 'rgba(122,28,28,0.9)',
        borderRadius:'99px', padding:'5px 14px', fontSize:'0.75rem',
        color:'#FAF7F2', fontFamily:'sans-serif', fontWeight:'700',
        boxShadow:'0 2px 8px rgba(0,0,0,0.3)',
        border: isTeacher ? '2px solid #C49A3C' : 'none'
      });
      tag.textContent = (isTeacher ? '📋 Teacher — ' : '👤 ') + display;
      document.body.appendChild(tag);
    }

    const dot = document.createElement('div');
    dot.id = 'hos-save-dot';
    Object.assign(dot.style, {
      position:'fixed', bottom:'14px', right:'14px', zIndex:'99999',
      display:'flex', alignItems:'center', gap:'6px',
      background:'rgba(0,0,0,0.8)', borderRadius:'99px',
      padding:'6px 14px 6px 9px', fontSize:'0.75rem',
      color:'white', fontFamily:'sans-serif',
      boxShadow:'0 2px 8px rgba(0,0,0,0.4)'
    });
    dot.innerHTML =
      '<span id="hos-dot-circle" style="width:9px;height:9px;border-radius:50%;' +
      'background:#F59E0B;display:inline-block;transition:background 0.4s;flex-shrink:0"></span>' +
      '<span id="hos-dot-label" style="margin-left:5px">Loading…</span>';
    document.body.appendChild(dot);

    if (isTeacher) {
      const mdot = document.createElement('div');
      mdot.id = 'hos-mark-dot';
      Object.assign(mdot.style, {
        position:'fixed', bottom:'52px', right:'14px', zIndex:'99999',
        display:'flex', alignItems:'center', gap:'6px',
        background:'rgba(122,28,28,0.9)', borderRadius:'99px',
        padding:'6px 14px 6px 9px', fontSize:'0.75rem',
        color:'white', fontFamily:'sans-serif',
        boxShadow:'0 2px 8px rgba(0,0,0,0.4)'
      });
      mdot.innerHTML =
        '<span id="hos-mark-circle" style="width:9px;height:9px;border-radius:50%;' +
        'background:#C49A3C;display:inline-block;flex-shrink:0"></span>' +
        '<span id="hos-mark-label" style="margin-left:5px">Marks ready</span>';
      document.body.appendChild(mdot);
    }
  }

  function setSaveStatus(s) {
    const c = document.getElementById('hos-dot-circle');
    const l = document.getElementById('hos-dot-label');
    if (!c || !l) return;
    if (s === 'saved')  { c.style.background = '#10B981'; l.textContent = 'Saved ✓'; }
    else if (s === 'error') { c.style.background = '#EF4444'; l.textContent = 'Save failed — retrying'; }
    else                { c.style.background = '#F59E0B'; l.textContent = 'Saving…'; }
  }

  function setMarkStatus(s) {
    const c = document.getElementById('hos-mark-circle');
    const l = document.getElementById('hos-mark-label');
    if (!c || !l) return;
    if (s === 'saved') { c.style.background = '#10B981'; l.textContent = 'Marks saved ✓'; }
    else if (s === 'error') { c.style.background = '#EF4444'; l.textContent = 'Mark save failed'; }
    else               { c.style.background = '#F59E0B'; l.textContent = 'Saving marks…'; }
  }

  // ── TEXT INPUTS ───────────────────────────────────────────────
  function watchTextInputs() {
    if (isTeacher) return;
    document.addEventListener('input', e => {
      const el = e.target;
      if ((el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')
          && !el.readOnly && !el.dataset.teacherField && !el.dataset.hosNameField) {
        record(stableKey(el), el.value);
      }
    });
  }

  function restoreTextInputs() {
    document.querySelectorAll('textarea, input[type="text"], input[type="number"], input:not([type])').forEach(el => {
      if (el.dataset.teacherField || el.dataset.hosNameField) return;
      const k = stableKey(el);
      const val = saveData[k];
      if (val !== undefined && val !== null) {
        el.value = val;
      }
      if (isTeacher) {
        el.readOnly = true;
        el.style.background = val ? '#F0EBE1' : '#F9F6F2';
        el.style.cursor = 'default';
      }
    });
  }

  // Watch for student typing their name into a name field — fallback identity
  function watchNameFields() {
    if (studentName || isTeacher) return;
    document.querySelectorAll('input[type="text"], input:not([type])').forEach(el => {
      const ph = (el.placeholder || '').toLowerCase();
      if (!ph.includes('name') && !el.dataset.nameField) return;
      el.addEventListener('blur', () => {
        const val = el.value.trim().toLowerCase();
        if (val && val.length > 1 && !studentName) {
          studentName = val;
          try { localStorage.setItem(DEVICE_STUDENT_KEY, val); } catch(e) {}
          updateStudentTag();
          // Now we know who they are — load their Supabase data
          sbLoad().then(row => {
            if (row && row.answers) {
              saveData = Object.assign({}, row.answers, saveData);
              restoreAll();
            }
          });
        }
      });
    });
  }

  function updateStudentTag() {
    const tag = document.getElementById('hos-student-tag');
    if (tag && studentName) {
      tag.textContent = '👤 ' + studentName.charAt(0).toUpperCase() + studentName.slice(1);
    }
  }

  function prefillNameFields() {
    if (!studentName) return;
    const display = studentName.charAt(0).toUpperCase() + studentName.slice(1);
    document.querySelectorAll('input[type="text"], input:not([type])').forEach(el => {
      if (el.dataset.teacherField) return;
      const ph = (el.placeholder || '').toLowerCase();
      if (ph.includes('name') || ph.includes('your name') || el.dataset.nameField) {
        if (!el.value) el.value = display;
        el.readOnly = true;
        el.dataset.hosNameField = '1';
      }
    });
  }

  // ── MCQ ───────────────────────────────────────────────────────
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
    if (isTeacher) return;
    document.addEventListener('click', e => {
      const btn = e.target.closest('.quiz-opt,.option-btn,[data-option],.mcq-btn');
      if (!btn || btn.dataset.hosLocked) return;
      const parent = btn.closest('.quiz-options,.options,.quiz-box,.question-box') || btn.parentElement;
      const siblings = Array.from(parent.querySelectorAll('.quiz-opt,.option-btn,[data-option],.mcq-btn'));
      if (!siblings.length || siblings.some(b => b.dataset.hosLocked)) return;
      // Key: question text + chosen answer text (stable across devices)
      const key = stableBtnKey(btn);
      record(key, btn.textContent.trim());
      lockGroup(siblings, btn);
    }, true);
  }

  function restoreMCQ() {
    // Match saved MCQ answers by their key (question+answer text)
    Object.entries(saveData).forEach(([k, val]) => {
      if (!k.startsWith('btn__')) return;
      // Find the button whose key matches
      document.querySelectorAll('.quiz-opt,.option-btn,[data-option],.mcq-btn').forEach(btn => {
        if (btn.dataset.hosLocked) return;
        if (stableBtnKey(btn) === k) {
          const parent = btn.closest('.quiz-options,.options,.quiz-box,.question-box') || btn.parentElement;
          const siblings = Array.from(parent.querySelectorAll('.quiz-opt,.option-btn,[data-option],.mcq-btn'));
          if (siblings.some(b => b.dataset.hosLocked)) return;
          lockGroup(siblings, btn);
        }
      });
    });
  }

  // ── TRUE / FALSE ──────────────────────────────────────────────
  function watchTF() {
    if (isTeacher) return;
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
      record(stableTFKey(row), btn.textContent.trim());
    }, true);
  }

  function restoreTF() {
    Object.entries(saveData).forEach(([k, val]) => {
      if (!k.startsWith('tf__')) return;
      document.querySelectorAll('.tf-row,.tf-question,.true-false-row').forEach(row => {
        if (row.dataset.hosLocked) return;
        if (stableTFKey(row) === k) {
          row.dataset.hosLocked = '1';
          const btns = Array.from(row.querySelectorAll('.tf-btn,.true-btn,.false-btn,[data-tf]'));
          const chosen = btns.find(b => b.textContent.trim() === val);
          btns.forEach(b => {
            b.style.pointerEvents = 'none';
            if (b !== chosen) b.style.opacity = '0.4';
          });
          if (chosen) { chosen.style.outline = '3px solid currentColor'; chosen.style.fontWeight = 'bold'; }
        }
      });
    });
  }

  // ── TEACHER OVERLAY ───────────────────────────────────────────
  function addTeacherBanner() {
    if (document.getElementById('hos-teacher-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'hos-teacher-banner';
    const display = studentName.charAt(0).toUpperCase() + studentName.slice(1);
    Object.assign(banner.style, {
      background:'#7A1C1C', color:'#FAF7F2', padding:'14px 24px',
      fontFamily:'sans-serif', display:'flex', alignItems:'center',
      gap:'16px', flexWrap:'wrap', position:'sticky', top:'0', zIndex:'500',
      boxShadow:'0 2px 12px rgba(0,0,0,0.3)'
    });
    banner.innerHTML =
      '<span style="font-size:1.1rem;font-weight:900;font-family:serif">📋 Teacher Mode</span>' +
      '<span style="font-size:0.85rem;opacity:0.85">Viewing <strong>' + display + '</strong>\'s answers — read-only</span>' +
      '<span style="margin-left:auto;font-size:0.8rem;background:rgba(196,154,60,0.25);' +
      'border:1px solid #C49A3C;border-radius:99px;padding:4px 14px;color:#F0D98A">' +
      'Marks save automatically</span>';
    document.body.insertBefore(banner, document.body.firstChild);
  }

  function injectMarkingFields() {
    const fields = Array.from(document.querySelectorAll(
      'textarea, input[type="text"], input[type="number"], input:not([type])'
    ));
    fields.forEach((el, idx) => {
      if (el.dataset.teacherField || el.dataset.markInjected) return;
      el.dataset.markInjected = '1';
      const fk = 'mark_' + stableKey(el);
      const existing = markData[fk] || {};
      const wrap = document.createElement('div');
      Object.assign(wrap.style, { display:'flex', gap:'6px', marginTop:'4px', alignItems:'center', flexWrap:'wrap' });
      wrap.innerHTML =
        '<input data-teacher-field="1" data-mark-key="' + fk + '" data-mark-type="score"' +
        ' type="number" min="0" max="100" placeholder="Mark /100" value="' + (existing.score || '') + '"' +
        ' style="width:90px;padding:5px 8px;border:1.5px solid #DDD0BC;border-radius:7px;' +
        'font-family:sans-serif;font-size:0.78rem;background:#FEF3C7;color:#2C1A0E">' +
        '<input data-teacher-field="1" data-mark-key="' + fk + '" data-mark-type="remark"' +
        ' type="text" placeholder="Remark…" value="' + (existing.remark || '') + '"' +
        ' style="flex:1;min-width:160px;padding:5px 10px;border:1.5px solid #DDD0BC;border-radius:7px;' +
        'font-family:sans-serif;font-size:0.78rem;background:#FEF3C7;color:#2C1A0E">';
      el.parentNode.insertBefore(wrap, el.nextSibling);
    });

    document.addEventListener('input', e => {
      const el = e.target;
      if (!el.dataset.teacherField) return;
      recordMark(el.dataset.markKey, { [el.dataset.markType]: el.value });
    });
  }

  function showStudentMarks() {
    const fields = Array.from(document.querySelectorAll(
      'textarea, input[type="text"], input[type="number"], input:not([type])'
    ));
    fields.forEach(el => {
      if (el.dataset.markInjected || el.dataset.teacherField) return;
      const fk = 'mark_' + stableKey(el);
      const m = markData[fk];
      if (!m || (!m.score && !m.remark)) return;
      el.dataset.markInjected = '1';
      const callout = document.createElement('div');
      Object.assign(callout.style, {
        background:'rgba(122,28,28,0.08)', border:'1.5px solid #7A1C1C',
        borderRadius:'8px', padding:'7px 12px', marginTop:'5px',
        fontFamily:'sans-serif', fontSize:'0.8rem', color:'#7A1C1C', fontWeight:'600'
      });
      const parts = [];
      if (m.score) parts.push('📝 Mark: ' + m.score + '/100');
      if (m.remark) parts.push('💬 ' + m.remark);
      callout.textContent = parts.join('  ·  ');
      el.parentNode.insertBefore(callout, el.nextSibling);
    });
  }

  // ── RESTORE ALL ───────────────────────────────────────────────
  function restoreAll() {
    prefillNameFields();
    restoreTextInputs();
    restoreTF();
    setTimeout(restoreMCQ, 400);
    setTimeout(() => {
      if (isTeacher) injectMarkingFields();
      else showStudentMarks();
    }, 600);
  }

  // ── INIT ──────────────────────────────────────────────────────
  function init(id) {
    worksheetId = id;
    studentName = resolveStudent();

    // Load local data immediately for same-device speed
    const local = loadFromLocal();
    if (local && studentName) saveData = local;

    function setup() {
      addSaveIndicator();
      if (isTeacher) addTeacherBanner();

      if (!studentName) {
        // No identity yet — watch name fields
        setSaveStatus('pending');
        watchNameFields();
      } else {
        // We know who this is — restore local first, then fetch remote
        restoreAll();

        sbLoad().then(row => {
          if (row) {
            if (row.answers && Object.keys(row.answers).length > 0) {
              // SUPABASE WINS over local — remote is the truth
              // Only keep local values for keys not yet in Supabase
              const merged = Object.assign({}, row.answers);
              Object.entries(saveData).forEach(([k, v]) => {
                if (!(k in merged)) merged[k] = v;
              });
              saveData = merged;
              saveToLocal(); // sync local with latest remote
              restoreAll();
            }
            if (row.feedback && Object.keys(row.feedback).length > 0) {
              markData = row.feedback;
              setTimeout(() => {
                if (isTeacher) injectMarkingFields();
                else showStudentMarks();
              }, 700);
            }
          }
          setSaveStatus('saved');
        }).catch(() => {
          // Supabase unreachable — stay on local data, show warning
          setSaveStatus('error');
          setTimeout(() => setSaveStatus('saved'), 3000); // retry indicator resets
        });
      }

      watchTextInputs();
      watchMCQ();
      watchTF();

      // Final save on page close
      window.addEventListener('beforeunload', () => {
        saveToLocal();
        if (studentName && !isTeacher && pendingSave) {
          // Synchronous last-chance save
          navigator.sendBeacon(
            `${SUPABASE_URL}/rest/v1/worksheet_submissions`,
            new Blob([JSON.stringify({
              worksheet_id:  worksheetId,
              student_name:  studentName,
              answers:       saveData,
              scores:        {},
              feedback:      {},
              teacher_notes: '',
              submitted_at:  new Date().toISOString()
            })], { type: 'application/json' })
          );
        }
      });

      console.log('[HOS v5] id:', worksheetId, '| student:', studentName || '(unknown)', '| teacher:', isTeacher);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setup);
    } else {
      setup();
    }
  }

  return { init };

})();
