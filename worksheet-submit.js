/*
 * worksheet-submit.js — HOS International Learning Portal
 * VERSION 4 — student saving + teacher marking on same worksheet
 *
 * URL parameters:
 *   ?student=jessica          → student mode, load/save Jessica's answers
 *   ?student=jessica&teacher=1 → teacher mode, load Jessica's answers (read-only)
 *                                + show marking overlay to add marks/remarks
 *
 * Student sees: their own answers + teacher marks/remarks when marked
 * Teacher sees: student answers (read-only) + marking fields
 */

const WorksheetSubmit = (() => {

  const SUPABASE_URL = 'https://ldftwnsixhgpfldhlkyq.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZnR3bnNpeGhncGZsZGhsa3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDM4NjMsImV4cCI6MjA5NjkxOTg2M30.EhShFmJgcsbrLqoZwA0nYfHRcCAzlS7mTkv4xHGAk_k';
  const DEVICE_STUDENT_KEY = 'hos_device_student';

  const SB_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates,return=minimal'
  };

  let worksheetId  = '';
  let studentName  = '';
  let isTeacher    = false;
  let saveData     = {};   // student answers
  let markData     = {};   // teacher marks & remarks
  let saveTimer    = null;
  let markTimer    = null;

  // ── Resolve identity from URL ────────────────────────────────
  function resolveFromURL() {
    try {
      const p = new URLSearchParams(window.location.search);
      const student = (p.get('student') || '').toLowerCase().trim();
      const teacher = p.get('teacher') === '1';
      return { student, teacher };
    } catch(e) { return { student: '', teacher: false }; }
  }

  function resolveStudent() {
    const { student, teacher } = resolveFromURL();
    isTeacher = teacher;

    if (student) {
      if (!teacher) {
        // Store on device so same student is recognised next visit
        try { localStorage.setItem(DEVICE_STUDENT_KEY, student); } catch(e) {}
      }
      return student;
    }
    // Fallback: device memory
    try {
      const stored = localStorage.getItem(DEVICE_STUDENT_KEY);
      if (stored) return stored.toLowerCase().trim();
    } catch(e) {}
    return '';
  }

  // ── Supabase ─────────────────────────────────────────────────
  async function sbSave(payload) {
    await fetch(`${SUPABASE_URL}/rest/v1/worksheet_submissions`, {
      method: 'POST', headers: SB_HEADERS, body: JSON.stringify(payload)
    });
  }

  async function sbLoad() {
    if (!worksheetId || !studentName) return null;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/worksheet_submissions` +
        `?worksheet_id=eq.${encodeURIComponent(worksheetId)}` +
        `&student_name=eq.${encodeURIComponent(studentName)}` +
        `&select=answers,feedback,teacher_notes&limit=1`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
      );
      const rows = await res.json();
      return (rows && rows[0]) ? rows[0] : null;
    } catch(e) { return null; }
  }

  // ── Local storage ────────────────────────────────────────────
  function localKey()  { return 'hos_ws_' + worksheetId + '_' + studentName; }
  function markKey()   { return 'hos_mk_' + worksheetId + '_' + studentName; }

  function saveToLocal()  { try { localStorage.setItem(localKey(), JSON.stringify(saveData)); } catch(e) {} }
  function loadFromLocal(){ try { const r = localStorage.getItem(localKey()); if(r) saveData = JSON.parse(r); } catch(e) {} }

  // ── Schedule saves ───────────────────────────────────────────
  function scheduleSave() {
    saveToLocal();
    setSaveStatus('pending');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      await sbSave({ worksheet_id: worksheetId, student_name: studentName, answers: saveData, submitted_at: new Date().toISOString() });
      setSaveStatus('saved');
    }, 1500);
  }

  function scheduleMarkSave() {
    clearTimeout(markTimer);
    setMarkStatus('pending');
    markTimer = setTimeout(async () => {
      await sbSave({
        worksheet_id: worksheetId, student_name: studentName,
        feedback: markData,
        teacher_notes: Object.values(markData).map(m => m.remark).filter(Boolean).join(' | ')
      });
      setMarkStatus('saved');
    }, 1500);
  }

  function record(key, value)     { saveData[key] = value; scheduleSave(); }
  function recordMark(key, value) { if (!markData[key]) markData[key] = {}; markData[key] = Object.assign(markData[key], value); scheduleMarkSave(); }

  // ── Status indicators ────────────────────────────────────────
  function addSaveIndicator() {
    if (document.getElementById('hos-save-dot')) return;

    // Student tag
    if (studentName) {
      const tag = document.createElement('div');
      tag.id = 'hos-student-tag';
      const display = studentName.charAt(0).toUpperCase() + studentName.slice(1);
      const label = isTeacher ? '📋 Teacher — viewing ' + display : '👤 ' + display;
      Object.assign(tag.style, {
        position:'fixed', bottom:'14px', left:'14px', zIndex:'99999',
        background: isTeacher ? 'rgba(92,20,20,0.95)' : 'rgba(122,28,28,0.9)',
        borderRadius:'99px', padding:'5px 14px', fontSize:'0.75rem',
        color:'#FAF7F2', fontFamily:'sans-serif', fontWeight:'700',
        boxShadow:'0 2px 8px rgba(0,0,0,0.3)',
        border: isTeacher ? '2px solid #C49A3C' : 'none'
      });
      tag.textContent = label;
      document.body.appendChild(tag);
    }

    // Save dot
    const dot = document.createElement('div');
    dot.id = 'hos-save-dot';
    Object.assign(dot.style, {
      position:'fixed', bottom:'14px', right:'14px', zIndex:'99999',
      display:'flex', alignItems:'center', gap:'6px',
      background:'rgba(0,0,0,0.75)', borderRadius:'99px',
      padding:'5px 12px 5px 8px', fontSize:'0.75rem',
      color:'white', fontFamily:'sans-serif',
      boxShadow:'0 2px 8px rgba(0,0,0,0.4)'
    });
    dot.innerHTML =
      '<span id="hos-dot-circle" style="width:9px;height:9px;border-radius:50%;background:#F59E0B;display:inline-block;transition:background 0.4s;flex-shrink:0"></span>' +
      '<span id="hos-dot-label">Loading…</span>';
    document.body.appendChild(dot);

    // Teacher: mark save indicator
    if (isTeacher) {
      const mdot = document.createElement('div');
      mdot.id = 'hos-mark-dot';
      Object.assign(mdot.style, {
        position:'fixed', bottom:'50px', right:'14px', zIndex:'99999',
        display:'flex', alignItems:'center', gap:'6px',
        background:'rgba(122,28,28,0.9)', borderRadius:'99px',
        padding:'5px 12px 5px 8px', fontSize:'0.75rem',
        color:'white', fontFamily:'sans-serif',
        boxShadow:'0 2px 8px rgba(0,0,0,0.4)'
      });
      mdot.innerHTML =
        '<span id="hos-mark-circle" style="width:9px;height:9px;border-radius:50%;background:#C49A3C;display:inline-block;flex-shrink:0"></span>' +
        '<span id="hos-mark-label">Marks ready</span>';
      document.body.appendChild(mdot);
    }
  }

  function setSaveStatus(s) {
    const c = document.getElementById('hos-dot-circle');
    const l = document.getElementById('hos-dot-label');
    if (!c||!l) return;
    c.style.background = s==='saved' ? '#10B981' : '#F59E0B';
    l.textContent = s==='saved' ? 'Saved ✓' : 'Saving…';
  }

  function setMarkStatus(s) {
    const c = document.getElementById('hos-mark-circle');
    const l = document.getElementById('hos-mark-label');
    if (!c||!l) return;
    c.style.background = s==='saved' ? '#10B981' : '#F59E0B';
    l.textContent = s==='saved' ? 'Marks saved ✓' : 'Saving marks…';
  }

  // ── Field indexing ───────────────────────────────────────────
  function fieldKey(el) {
    if (el.id) return 'id_' + el.id;
    const all = Array.from(document.querySelectorAll('textarea,input'));
    return 'pos_' + all.indexOf(el);
  }

  // ── Watch & restore text fields ──────────────────────────────
  function watchTextInputs() {
    if (isTeacher) return; // teacher never edits student fields
    document.addEventListener('input', e => {
      const el = e.target;
      if ((el.tagName==='TEXTAREA'||el.tagName==='INPUT') && !el.readOnly && !el.dataset.teacherField) {
        record(fieldKey(el), el.value);
      }
    });
  }

  function restoreTextInputs() {
    document.querySelectorAll('textarea,input[type="text"],input[type="number"],input:not([type])').forEach(el => {
      if (el.dataset.teacherField) return;
      const k = fieldKey(el);
      if (saveData[k] !== undefined) {
        el.value = saveData[k];
        if (isTeacher) {
          el.readOnly = true;
          el.style.background = '#F0EBE1';
          el.style.cursor = 'default';
        }
      } else if (isTeacher) {
        el.readOnly = true;
        el.style.background = '#F9F6F2';
        el.style.cursor = 'default';
      }
    });
  }

  // ── MCQ & TF ─────────────────────────────────────────────────
  function btnKey(btn) {
    const all = Array.from(document.querySelectorAll('.quiz-opt,.option-btn,[data-option],.mcq-btn'));
    return 'mcq_' + all.indexOf(btn);
  }
  function lockGroup(siblings, chosen) {
    siblings.forEach(b => {
      b.dataset.hosLocked = '1';
      b.style.pointerEvents = 'none'; b.style.cursor = 'default';
      if (b!==chosen) b.style.opacity='0.4';
      else { b.style.outline='3px solid currentColor'; b.style.fontWeight='bold'; }
    });
  }
  function watchMCQ() {
    if (isTeacher) return;
    document.addEventListener('click', e => {
      const btn = e.target.closest('.quiz-opt,.option-btn,[data-option],.mcq-btn');
      if (!btn||btn.dataset.hosLocked) return;
      const parent = btn.closest('.quiz-options,.options,.quiz-box,.question-box')||btn.parentElement;
      const siblings = Array.from(parent.querySelectorAll('.quiz-opt,.option-btn,[data-option],.mcq-btn'));
      if (!siblings.length||siblings.some(b=>b.dataset.hosLocked)) return;
      record(btnKey(btn), btn.textContent.trim());
      lockGroup(siblings, btn);
    }, true);
  }
  function restoreMCQ() {
    const all = Array.from(document.querySelectorAll('.quiz-opt,.option-btn,[data-option],.mcq-btn'));
    Object.entries(saveData).forEach(([k,val]) => {
      if (!k.startsWith('mcq_')) return;
      const chosen = all[parseInt(k.replace('mcq_',''))];
      if (!chosen||chosen.dataset.hosLocked) return;
      const parent = chosen.closest('.quiz-options,.options,.quiz-box,.question-box')||chosen.parentElement;
      const siblings = Array.from(parent.querySelectorAll('.quiz-opt,.option-btn,[data-option],.mcq-btn'));
      lockGroup(siblings, chosen);
    });
  }
  function watchTF() {
    if (isTeacher) return;
    document.addEventListener('click', e => {
      const btn = e.target.closest('.tf-btn,.true-btn,.false-btn,[data-tf]');
      if (!btn) return;
      const row = btn.closest('.tf-row,.tf-question,.true-false-row')||btn.parentElement;
      if (row.dataset.hosLocked) return;
      row.dataset.hosLocked='1';
      const btns = Array.from(row.querySelectorAll('.tf-btn,.true-btn,.false-btn,[data-tf]'));
      btns.forEach(b=>{b.style.pointerEvents='none';if(b!==btn)b.style.opacity='0.4';else{b.style.outline='3px solid currentColor';b.style.fontWeight='bold';}});
      const rows = Array.from(document.querySelectorAll('.tf-row,.tf-question,.true-false-row'));
      record('tf_'+rows.indexOf(row), btn.textContent.trim());
    }, true);
  }
  function restoreTF() {
    const rows = Array.from(document.querySelectorAll('.tf-row,.tf-question,.true-false-row'));
    Object.entries(saveData).forEach(([k,val]) => {
      if (!k.startsWith('tf_')) return;
      const row = rows[parseInt(k.replace('tf_',''))];
      if (!row||row.dataset.hosLocked) return;
      row.dataset.hosLocked='1';
      const btns = Array.from(row.querySelectorAll('.tf-btn,.true-btn,.false-btn,[data-tf]'));
      const chosen = btns.find(b=>b.textContent.trim()===val);
      btns.forEach(b=>{b.style.pointerEvents='none';if(b!==chosen)b.style.opacity='0.4';});
      if (chosen){chosen.style.outline='3px solid currentColor';chosen.style.fontWeight='bold';}
    });
  }

  // ── Teacher marking overlay ───────────────────────────────────
  function addTeacherBanner() {
    const banner = document.createElement('div');
    const display = studentName.charAt(0).toUpperCase() + studentName.slice(1);
    Object.assign(banner.style, {
      background:'#7A1C1C', color:'#FAF7F2', padding:'14px 24px',
      fontFamily:'sans-serif', display:'flex', alignItems:'center',
      gap:'16px', flexWrap:'wrap', position:'sticky', top:'0', zIndex:'500',
      boxShadow:'0 2px 12px rgba(0,0,0,0.3)'
    });
    banner.innerHTML = `
      <span style="font-size:1.1rem;font-weight:900;font-family:serif">📋 Teacher Mode</span>
      <span style="font-size:0.85rem;opacity:0.85">Viewing <strong>${display}</strong>'s answers — fields are read-only</span>
      <span style="margin-left:auto;font-size:0.8rem;background:rgba(196,154,60,0.25);border:1px solid #C49A3C;border-radius:99px;padding:4px 14px;color:#F0D98A">
        Marks & remarks save automatically
      </span>`;
    document.body.insertBefore(banner, document.body.firstChild);
  }

  function injectMarkingFields() {
    // Find all input/textarea fields and inject a mark+remark row after each
    const fields = Array.from(document.querySelectorAll('textarea, input[type="text"], input[type="number"], input:not([type])'));
    fields.forEach((el, idx) => {
      if (el.dataset.teacherField || el.dataset.markInjected) return;
      el.dataset.markInjected = '1';

      const fk = 'mark_' + idx;
      const existing = markData[fk] || {};

      const wrap = document.createElement('div');
      Object.assign(wrap.style, {
        display:'flex', gap:'6px', marginTop:'4px', alignItems:'center', flexWrap:'wrap'
      });

      wrap.innerHTML = `
        <input data-teacher-field="1" data-mark-key="${fk}" data-mark-type="score"
          type="number" min="0" max="100" placeholder="Mark /100"
          value="${existing.score||''}"
          style="width:90px;padding:5px 8px;border:1.5px solid #DDD0BC;border-radius:7px;
                 font-family:sans-serif;font-size:0.78rem;background:#FEF3C7;color:#2C1A0E">
        <input data-teacher-field="1" data-mark-key="${fk}" data-mark-type="remark"
          type="text" placeholder="Remark for this question…"
          value="${existing.remark||''}"
          style="flex:1;min-width:160px;padding:5px 10px;border:1.5px solid #DDD0BC;border-radius:7px;
                 font-family:sans-serif;font-size:0.78rem;background:#FEF3C7;color:#2C1A0E">`;

      el.parentNode.insertBefore(wrap, el.nextSibling);
    });

    // Watch teacher fields
    document.addEventListener('input', e => {
      const el = e.target;
      if (!el.dataset.teacherField) return;
      const fk   = el.dataset.markKey;
      const type = el.dataset.markType;
      recordMark(fk, { [type]: el.value });
    });
  }

  function showStudentMarks() {
    // Student view: show teacher marks/remarks as coloured callouts
    const fields = Array.from(document.querySelectorAll('textarea,input[type="text"],input[type="number"],input:not([type])'));
    fields.forEach((el, idx) => {
      if (el.dataset.markInjected) return;
      const fk = 'mark_' + idx;
      const m  = markData[fk];
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

  // ── Prefill name ─────────────────────────────────────────────
  function prefillNameFields() {
    if (!studentName) return;
    const display = studentName.charAt(0).toUpperCase() + studentName.slice(1);
    document.querySelectorAll('input[type="text"],input:not([type])').forEach(el => {
      if (el.dataset.teacherField) return;
      const ph = (el.placeholder||'').toLowerCase();
      if (ph.includes('name')||ph.includes('your name')) {
        if (!el.value) el.value = display;
        el.readOnly = true;
      }
    });
  }

  // ── Restore all ──────────────────────────────────────────────
  function restoreAll() {
    prefillNameFields();
    restoreTextInputs();
    restoreTF();
    setTimeout(restoreMCQ, 300);
    setTimeout(() => {
      if (isTeacher) injectMarkingFields();
      else showStudentMarks();
    }, 500);
  }

  // ── Init ─────────────────────────────────────────────────────
  function init(id) {
    worksheetId = id;
    studentName = resolveStudent();
    if (studentName) loadFromLocal();

    function setup() {
      addSaveIndicator();
      if (isTeacher) addTeacherBanner();

      if (studentName) {
        restoreAll();
        sbLoad().then(row => {
          if (row) {
            if (row.answers) {
              saveData = Object.assign({}, row.answers, isTeacher ? {} : saveData);
              restoreAll();
            }
            if (row.feedback) {
              markData = row.feedback;
              setTimeout(() => {
                if (isTeacher) injectMarkingFields();
                else showStudentMarks();
              }, 600);
            }
          }
          setSaveStatus('saved');
        });
      } else {
        setSaveStatus('pending');
      }

      watchTextInputs();
      watchMCQ();
      watchTF();

      window.addEventListener('beforeunload', () => {
        saveToLocal();
        if (studentName && !isTeacher) sbSave({ worksheet_id:worksheetId, student_name:studentName, answers:saveData, submitted_at:new Date().toISOString() });
      });

      console.log('[HOS v4] Worksheet:', worksheetId, '| Student:', studentName, '| Teacher mode:', isTeacher);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setup);
    } else {
      setup();
    }
  }

  return { init };
})();
