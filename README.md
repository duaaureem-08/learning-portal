# learning-portal 
HOS International Learning Portal
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HOS International — Learning Portal</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:#0D0D12;color:#F0EFF8;min-height:100vh;overflow-x:hidden}

/* ── NAV ── */
.nav{
  background:rgba(13,13,18,0.96);backdrop-filter:blur(20px);
  border-bottom:1px solid #2E2E3E;padding:0 24px;height:64px;
  display:flex;align-items:center;justify-content:space-between;
  position:sticky;top:0;z-index:300;
}
.nav-logo{display:flex;align-items:center;gap:12px}
.nav-mark{width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#7C3AED,#3B82F6);
  display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-weight:900;font-size:1.1rem;color:white}
.nav-brand{font-family:'Playfair Display',serif;font-weight:700;font-size:1.05rem;color:white}
.nav-brand span{color:#6B7280;font-weight:400;font-size:0.78rem;display:block;margin-top:-2px}
.nav-motto{font-size:0.7rem;color:#4B5563;font-style:italic;display:none}
@media(min-width:900px){.nav-motto{display:block}}

/* ── HERO ── */
.hero{padding:72px 24px 52px;text-align:center;
  background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(124,58,237,0.1) 0%,transparent 70%)}
.hero-badge{display:inline-flex;align-items:center;gap:8px;
  background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.3);
  border-radius:99px;padding:6px 16px;font-size:0.78rem;font-weight:600;color:#C4B5FD;margin-bottom:18px}
.hero h1{font-family:'Playfair Display',serif;font-size:clamp(2rem,5vw,3.4rem);
  font-weight:900;letter-spacing:-0.03em;line-height:1.1;color:white;margin-bottom:14px}
.hero h1 span{background:linear-gradient(135deg,#A78BFA,#60A5FA);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero-sub{font-size:1rem;color:#9090A8;max-width:480px;margin:0 auto 36px;line-height:1.6}
.hero-stats{display:flex;gap:28px;justify-content:center;flex-wrap:wrap}
.stat-num{font-family:'Playfair Display',serif;font-size:1.8rem;font-weight:900;color:white;display:block}
.stat-label{font-size:0.75rem;color:#6B7280;margin-top:1px}

/* ── STUDENT SELECTOR ── */
.selector{padding:36px 24px 0;max-width:960px;margin:0 auto}
.selector-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
@media(max-width:700px){.selector-grid{grid-template-columns:1fr 1fr}}
@media(max-width:440px){.selector-grid{grid-template-columns:1fr}}

.stu-btn{
  border-radius:16px;padding:22px 16px;cursor:pointer;border:2px solid transparent;
  transition:all 0.22s;text-align:left;position:relative;overflow:hidden;
}
.stu-btn:hover{transform:translateY(-3px)}
.stu-btn.locked::after{content:'🔒';position:absolute;top:12px;right:12px;font-size:1rem;opacity:0.5}
.stu-btn.unlocked::after{content:'✅';position:absolute;top:12px;right:12px;font-size:1rem}

/* individual student colours */
.stu-abrish  {background:linear-gradient(135deg,#FEF3C7,#FFF7ED);border-color:#FCD34D}
.stu-abrish:hover,.stu-abrish.active{border-color:#F59E0B;box-shadow:0 0 0 3px rgba(245,158,11,0.2)}
.stu-jessica {background:linear-gradient(135deg,#1E1B2E,#1a1730);border-color:#4C1D95}
.stu-jessica:hover,.stu-jessica.active{border-color:#7C3AED;box-shadow:0 0 0 3px rgba(124,58,237,0.3)}
.stu-areej   {background:linear-gradient(135deg,#0F1F2E,#0c1a27);border-color:#1E3A8A}
.stu-areej:hover,.stu-areej.active{border-color:#3B82F6;box-shadow:0 0 0 3px rgba(59,130,246,0.3)}
.stu-teacher {background:linear-gradient(135deg,#0F1F18,#0a1f14);border-color:#065F46}
.stu-teacher:hover,.stu-teacher.active{border-color:#10B981;box-shadow:0 0 0 3px rgba(16,185,129,0.3)}

.stu-level{font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:5px}
.stu-abrish  .stu-level{color:#92400E}
.stu-jessica .stu-level{color:#A78BFA}
.stu-areej   .stu-level{color:#93C5FD}
.stu-teacher .stu-level{color:#6EE7B7}
.stu-name{font-family:'Playfair Display',serif;font-size:1.35rem;font-weight:900;margin-bottom:3px}
.stu-abrish  .stu-name{color:#1C1917}
.stu-jessica .stu-name,.stu-areej .stu-name,.stu-teacher .stu-name{color:white}
.stu-desc{font-size:0.75rem}
.stu-abrish  .stu-desc{color:#78716C}
.stu-jessica .stu-desc,.stu-areej .stu-desc,.stu-teacher .stu-desc{color:#9090A8}

/* ── PASSWORD MODAL ── */
.modal-overlay{
  display:none;position:fixed;inset:0;z-index:500;
  background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);
  align-items:center;justify-content:center;
}
.modal-overlay.show{display:flex}
.modal{
  background:#18181F;border:1px solid #2E2E3E;border-radius:20px;
  padding:36px 32px;width:100%;max-width:380px;text-align:center;
  animation:popIn 0.3s cubic-bezier(0.22,0.68,0,1.2) both;
}
@keyframes popIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}
.modal-avatar{font-size:3rem;margin-bottom:12px}
.modal-title{font-family:'Playfair Display',serif;font-size:1.5rem;font-weight:900;color:white;margin-bottom:6px}
.modal-sub{font-size:0.85rem;color:#9090A8;margin-bottom:24px}
.pin-dots{display:flex;gap:12px;justify-content:center;margin-bottom:20px}
.pin-dot{
  width:48px;height:56px;border-radius:12px;
  background:#111118;border:2px solid #2E2E3E;
  display:flex;align-items:center;justify-content:center;
  font-size:1.6rem;font-weight:900;color:white;
  transition:border-color 0.2s;
}
.pin-dot.filled{border-color:#7C3AED}
.pin-dot.error{border-color:#EF4444;animation:shake 0.4s ease}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
.keypad{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:260px;margin:0 auto 20px}
.key{
  padding:16px;border-radius:12px;border:1px solid #2E2E3E;
  background:#111118;color:white;font-size:1.2rem;font-weight:700;
  cursor:pointer;transition:all 0.15s;font-family:'DM Sans',sans-serif;
}
.key:hover{background:#1E1B2E;border-color:#7C3AED}
.key:active{transform:scale(0.95)}
.key.del{color:#9090A8;font-size:0.9rem}
.modal-error{color:#FCA5A5;font-size:0.82rem;min-height:20px;margin-bottom:8px}
.modal-cancel{
  background:transparent;border:1px solid #2E2E3E;color:#9090A8;
  padding:10px 24px;border-radius:8px;cursor:pointer;font-size:0.85rem;
  font-family:'DM Sans',sans-serif;transition:all 0.2s;
}
.modal-cancel:hover{border-color:#6B7280;color:white}

/* ── PANELS ── */
.panel{display:none;padding:0 24px 60px;max-width:960px;margin:0 auto;animation:fadeUp 0.4s ease both}
.panel.active{display:block}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}

.panel-header{border-radius:20px;padding:28px 32px;margin:24px 0;display:flex;align-items:center;gap:18px}
.panel-header.ks2{background:linear-gradient(135deg,#F59E0B,#EF4444)}
.panel-header.ks3-j{background:linear-gradient(135deg,#1E1B4B,#4C1D95);border:1px solid rgba(124,58,237,0.3)}
.panel-header.ks3-a{background:linear-gradient(135deg,#0F172A,#1E3A8A);border:1px solid rgba(59,130,246,0.3)}
.panel-header.teacher{background:linear-gradient(135deg,#022C22,#065F46);border:1px solid rgba(16,185,129,0.3)}
.panel-avatar{width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.2);
  display:flex;align-items:center;justify-content:center;font-size:1.8rem;flex-shrink:0}
.panel-header h2{font-family:'Playfair Display',serif;font-size:1.5rem;font-weight:900;color:white}
.panel-header p{color:rgba(255,255,255,0.75);font-size:0.85rem;margin-top:3px}
.lock-btn{
  margin-left:auto;padding:8px 16px;border-radius:8px;
  background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.2);
  color:rgba(255,255,255,0.8);font-size:0.8rem;font-weight:600;
  cursor:pointer;transition:all 0.2s;font-family:'DM Sans',sans-serif;
}
.lock-btn:hover{background:rgba(0,0,0,0.35)}

/* ── WEEK ACCORDION ── */
.week-section{margin-bottom:10px}
.week-hd{
  border-radius:14px;padding:16px 20px;cursor:pointer;
  display:flex;align-items:center;justify-content:space-between;
  transition:all 0.2s;user-select:none;
}
/* KS2 accordion */
.ks2-acc .week-hd{background:#FFF7ED;border:2px solid #FED7AA}
.ks2-acc .week-hd:hover,.ks2-acc .week-hd.open{border-color:#F59E0B;background:#FEF3C7}
.ks2-acc .week-hd.open{border-radius:14px 14px 0 0}
.ks2-acc .week-num{background:#F59E0B;color:white}
.ks2-acc .week-title{color:#1C1917}
.ks2-acc .week-topics{color:#92400E}
/* KS3-J accordion */
.ks3j-acc .week-hd{background:#18181F;border:1px solid #2E2E3E}
.ks3j-acc .week-hd:hover,.ks3j-acc .week-hd.open{border-color:#7C3AED;background:#1E1B2E}
.ks3j-acc .week-hd.open{border-radius:14px 14px 0 0}
.ks3j-acc .week-num{background:#7C3AED;color:white}
.ks3j-acc .week-title{color:white}
.ks3j-acc .week-topics{color:#A78BFA}
/* KS3-A accordion */
.ks3a-acc .week-hd{background:#0F172A;border:1px solid #1E3A8A}
.ks3a-acc .week-hd:hover,.ks3a-acc .week-hd.open{border-color:#3B82F6;background:#0F1F35}
.ks3a-acc .week-hd.open{border-radius:14px 14px 0 0}
.ks3a-acc .week-num{background:#3B82F6;color:white}
.ks3a-acc .week-title{color:white}
.ks3a-acc .week-topics{color:#93C5FD}
/* Teacher accordion */
.teach-acc .week-hd{background:#0A1F14;border:1px solid #065F46}
.teach-acc .week-hd:hover,.teach-acc .week-hd.open{border-color:#10B981;background:#0F2A1C}
.teach-acc .week-hd.open{border-radius:14px 14px 0 0}
.teach-acc .week-num{background:#10B981;color:white}
.teach-acc .week-title{color:white}
.teach-acc .week-topics{color:#6EE7B7}

.week-hd-left{display:flex;align-items:center;gap:12px}
.week-num{width:38px;height:38px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:0.95rem;flex-shrink:0}
.week-title{font-weight:700;font-size:0.95rem}
.week-topics{font-size:0.73rem;margin-top:2px}
.week-chevron{font-size:1.1rem;transition:transform 0.25s;color:#9090A8}
.week-hd.open .week-chevron{transform:rotate(180deg)}
.week-status{padding:3px 10px;border-radius:99px;font-size:0.68rem;font-weight:700}
.s-complete{background:#D1FAE5;color:#065F46}
.s-partial{background:#FEF3C7;color:#92400E}
.s-pending{background:#1F2937;color:#6B7280}

.week-body{border-radius:0 0 14px 14px;padding:18px;display:none}
.week-body.open{display:block}
.ks2-acc .week-body{background:#FFFBF5;border:2px solid #F59E0B;border-top:none}
.ks3j-acc .week-body{background:#0D0D12;border:1px solid #7C3AED;border-top:none}
.ks3a-acc .week-body{background:#060B14;border:1px solid #3B82F6;border-top:none}
.teach-acc .week-body{background:#060F0A;border:1px solid #10B981;border-top:none}

/* ── SUBJECT CARDS ── */
.subjects-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}
.subj-card{border-radius:12px;padding:16px;position:relative;overflow:hidden}
/* KS2 cards */
.ks2-acc .subj-card{background:white;border:1.5px solid #E7E5E4}
/* KS3 cards */
.ks3j-acc .subj-card,.ks3a-acc .subj-card,.teach-acc .subj-card{background:#18181F;border:1px solid #2E2E3E}

.subj-top{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.subj-icon{width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0}
.subj-name{font-weight:700;font-size:0.9rem}
.ks2-acc .subj-name{color:#1C1917}
.ks3j-acc .subj-name,.ks3a-acc .subj-name,.teach-acc .subj-name{color:white}
.subj-topic{font-size:0.72rem;color:#9CA3AF;margin-top:1px}

.resources{display:flex;flex-direction:column;gap:7px}
.res{display:flex;align-items:center;justify-content:space-between;
  padding:8px 11px;border-radius:8px;text-decoration:none;transition:all 0.18s}
.ks2-acc .res{background:#F9FAFB;border:1px solid #E5E7EB}
.ks3j-acc .res,.ks3a-acc .res,.teach-acc .res{background:#111118;border:1px solid #2E2E3E}
.res:hover{transform:translateX(3px)}
.res-left{display:flex;align-items:center;gap:7px}
.res-label{font-size:0.8rem;font-weight:600}
.ks2-acc .res-label{color:#374151}
.ks3j-acc .res-label,.ks3a-acc .res-label,.teach-acc .res-label{color:#D1D5DB}
.badge{font-size:0.65rem;font-weight:700;padding:2px 7px;border-radius:99px}
.b-pdf{background:#EEF2FF;color:#4338CA}
.b-html{background:#ECFDF5;color:#065F46}
.b-tbd{background:#1F2937;color:#6B7280}
.res-arr{color:#9090A8;font-size:0.8rem}

/* placeholder */
.ph-overlay{position:absolute;inset:0;border-radius:12px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:6px;text-align:center;padding:16px}
.ks2-acc .ph-overlay{background:rgba(255,255,255,0.93)}
.ks3j-acc .ph-overlay,.ks3a-acc .ph-overlay,.teach-acc .ph-overlay{background:rgba(24,24,31,0.95)}
.ph-icon{font-size:1.8rem;opacity:0.4}
.ph-text{font-size:0.8rem;font-weight:700;color:#9CA3AF}
.ph-path{font-size:0.68rem;color:#6B7280;font-family:monospace;background:#1F2937;padding:2px 6px;border-radius:4px;color:#D1FAE5}

/* teacher overview */
.teacher-overview{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:28px}
@media(max-width:600px){.teacher-overview{grid-template-columns:1fr}}
.ov-card{border-radius:14px;padding:20px;border:1px solid #2E2E3E;cursor:pointer;transition:all 0.2s}
.ov-card:hover{transform:translateY(-2px)}
.ov-card.ov-abrish{background:linear-gradient(135deg,#FEF3C7,#FFF7ED);border-color:#FCD34D}
.ov-card.ov-jessica{background:linear-gradient(135deg,#1E1B2E,#1a1730);border-color:#4C1D95}
.ov-card.ov-areej{background:linear-gradient(135deg,#0F1F2E,#0c1a27);border-color:#1E3A8A}
.ov-name{font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:900}
.ov-abrish .ov-name{color:#1C1917}
.ov-jessica .ov-name,.ov-areej .ov-name{color:white}
.ov-detail{font-size:0.78rem;margin-top:3px}
.ov-abrish .ov-detail{color:#78716C}
.ov-jessica .ov-detail,.ov-areej .ov-detail{color:#9090A8}
.ov-go{font-size:0.75rem;font-weight:700;margin-top:12px;display:inline-block;padding:5px 12px;border-radius:99px}
.ov-abrish .ov-go{background:#F59E0B;color:white}
.ov-jessica .ov-go{background:#7C3AED;color:white}
.ov-areej .ov-go{background:#3B82F6;color:white}

footer{border-top:1px solid #2E2E3E;padding:28px 24px;text-align:center;color:#4B5563;font-size:0.8rem}
footer strong{color:#6B7280}
code{background:#1F2937;padding:2px 6px;border-radius:4px;color:#D1FAE5;font-size:0.78rem}
</style>
</head>
<body>

<!-- NAV -->
<nav class="nav">
  <div class="nav-logo">
    <div class="nav-mark">H</div>
    <div class="nav-brand">HOS International <span>Learning Portal</span></div>
  </div>
  <div class="nav-motto">"I can do all things through Christ who strengthens me." — Philippians 4:13</div>
</nav>

<!-- HERO -->
<section class="hero">
  <div class="hero-badge">🎓 HOS International · 2025–2026</div>
  <h1>Your <span>Learning</span> Portal</h1>
  <p class="hero-sub">Select your name to access your lessons, worksheets and resources.</p>
  <div class="hero-stats">
    <div class="stat"><span class="stat-num">3</span><div class="stat-label">Students</div></div>
    <div class="stat"><span class="stat-num">24</span><div class="stat-label">Weeks</div></div>
    <div class="stat"><span class="stat-num">5</span><div class="stat-label">Subjects</div></div>
    <div class="stat"><span class="stat-num">4</span><div class="stat-label">Resources / Week</div></div>
  </div>
</section>

<!-- STUDENT SELECTOR -->
<div class="selector" id="selector">
  <div class="selector-grid">
    <div class="stu-btn stu-abrish locked" onclick="requestAccess('abrish')">
      <div class="stu-level">KS2 · Level 3</div>
      <div class="stu-name">🌟 Abrish</div>
      <div class="stu-desc">Ages 7–9 · 5 Subjects</div>
    </div>
    <div class="stu-btn stu-jessica locked" onclick="requestAccess('jessica')">
      <div class="stu-level">KS3 · Level 6</div>
      <div class="stu-name">✨ Jessica</div>
      <div class="stu-desc">Ages 12–14 · 5 Subjects</div>
    </div>
    <div class="stu-btn stu-areej locked" onclick="requestAccess('areej')">
      <div class="stu-level">KS3 · Level 6</div>
      <div class="stu-name">🌙 Areej</div>
      <div class="stu-desc">Ages 12–14 · 5 Subjects</div>
    </div>
    <div class="stu-btn stu-teacher locked" onclick="requestAccess('teacher')">
      <div class="stu-level">Teacher · All Access</div>
      <div class="stu-name">📋 Teacher</div>
      <div class="stu-desc">View all students</div>
    </div>
  </div>
</div>

<!-- PASSWORD MODAL -->
<div class="modal-overlay" id="modal">
  <div class="modal">
    <div class="modal-avatar" id="modal-avatar">🌟</div>
    <div class="modal-title" id="modal-title">Enter your PIN</div>
    <div class="modal-sub" id="modal-sub">Enter your 4-digit PIN to access your portal.</div>
    <div class="pin-dots" id="pin-dots">
      <div class="pin-dot" id="dot0"></div>
      <div class="pin-dot" id="dot1"></div>
      <div class="pin-dot" id="dot2"></div>
      <div class="pin-dot" id="dot3"></div>
    </div>
    <div class="modal-error" id="modal-error"></div>
    <div class="keypad">
      <button class="key" onclick="keyPress('1')">1</button>
      <button class="key" onclick="keyPress('2')">2</button>
      <button class="key" onclick="keyPress('3')">3</button>
      <button class="key" onclick="keyPress('4')">4</button>
      <button class="key" onclick="keyPress('5')">5</button>
      <button class="key" onclick="keyPress('6')">6</button>
      <button class="key" onclick="keyPress('7')">7</button>
      <button class="key" onclick="keyPress('8')">8</button>
      <button class="key" onclick="keyPress('9')">9</button>
      <button class="key del" onclick="keyPress('clear')">CLR</button>
      <button class="key" onclick="keyPress('0')">0</button>
      <button class="key del" onclick="keyPress('del')">⌫</button>
    </div>
    <button class="modal-cancel" onclick="closeModal()">Cancel</button>
  </div>
</div>

<!-- ══════════════════════════════════
     PANEL: ABRISH (KS2)
══════════════════════════════════ -->
<div class="panel" id="panel-abrish">
  <div class="panel-header ks2">
    <div class="panel-avatar">🌟</div>
    <div><h2>Abrish</h2><p>KS2 Level 3 · Ages 7–9 · 24-Week Programme</p></div>
    <button class="lock-btn" onclick="lockPanel('abrish')">🔒 Lock</button>
  </div>
  <div id="weeks-abrish" class="ks2-acc"></div>
</div>

<!-- ══════════════════════════════════
     PANEL: JESSICA (KS3)
══════════════════════════════════ -->
<div class="panel" id="panel-jessica">
  <div class="panel-header ks3-j">
    <div class="panel-avatar">✨</div>
    <div><h2>Jessica</h2><p>KS3 Level 6 · Ages 12–14 · 24-Week Programme</p></div>
    <button class="lock-btn" onclick="lockPanel('jessica')">🔒 Lock</button>
  </div>
  <div id="weeks-jessica" class="ks3j-acc"></div>
</div>

<!-- ══════════════════════════════════
     PANEL: AREEJ (KS3)
══════════════════════════════════ -->
<div class="panel" id="panel-areej">
  <div class="panel-header ks3-a">
    <div class="panel-avatar">🌙</div>
    <div><h2>Areej</h2><p>KS3 Level 6 · Ages 12–14 · 24-Week Programme</p></div>
    <button class="lock-btn" onclick="lockPanel('areej')">🔒 Lock</button>
  </div>
  <div id="weeks-areej" class="ks3a-acc"></div>
</div>

<!-- ══════════════════════════════════
     PANEL: TEACHER
══════════════════════════════════ -->
<div class="panel" id="panel-teacher">
  <div class="panel-header teacher">
    <div class="panel-avatar">📋</div>
    <div><h2>Teacher Overview</h2><p>All students · All weeks · Full access</p></div>
    <button class="lock-btn" onclick="lockPanel('teacher')">🔒 Lock</button>
  </div>
  <!-- Teacher sees overview cards for each student -->
  <div class="teacher-overview">
    <div class="ov-card ov-abrish" onclick="teacherGoTo('abrish')">
      <div class="ov-name">🌟 Abrish</div>
      <div class="ov-detail">KS2 Level 3 · 5 subjects</div>
      <div><span class="ov-go">View Abrish →</span></div>
    </div>
    <div class="ov-card ov-jessica" onclick="teacherGoTo('jessica')">
      <div class="ov-name">✨ Jessica</div>
      <div class="ov-detail">KS3 Level 6 · 5 subjects</div>
      <div><span class="ov-go">View Jessica →</span></div>
    </div>
    <div class="ov-card ov-areej" onclick="teacherGoTo('areej')">
      <div class="ov-name">🌙 Areej</div>
      <div class="ov-detail">KS3 Level 6 · 5 subjects</div>
      <div><span class="ov-go">View Areej →</span></div>
    </div>
  </div>
  <!-- Teacher also sees full weeks for all students inline -->
  <p style="color:#6EE7B7;font-weight:700;margin-bottom:12px;">📋 All Students — Week View</p>
  <div id="weeks-teacher" class="teach-acc"></div>
</div>

<footer>
  <p><strong>HOS International Learning Portal</strong></p>
  <p style="margin-top:8px">"I can do all things through Christ who strengthens me." — Philippians 4:13</p>
  <p style="margin-top:12px">File path: <code>student/weekN/subject/filename</code> — upload files to GitHub to activate cards.</p>
</footer>

<script>
// ════════════════════════════════════════════════════════════════
// PASSWORDS — change these to whatever you like
// ════════════════════════════════════════════════════════════════
const PINS = {
  abrish:  '1234',   // change to Abrish's PIN
  jessica: '5678',   // change to Jessica's PIN
  areej:   '9012',   // change to Areej's PIN
  teacher: '0000',   // change to teacher's PIN
};

const AVATARS = { abrish:'🌟', jessica:'✨', areej:'🌙', teacher:'📋' };
const NAMES   = { abrish:'Abrish', jessica:'Jessica', areej:'Areej', teacher:'Teacher' };

// track unlocked sessions (resets on page refresh)
const unlocked = { abrish:false, jessica:false, areej:false, teacher:false };

let currentTarget = null;
let currentPin    = '';

// ── Modal logic ───────────────────────────────────────────────
function requestAccess(who) {
  if (unlocked[who]) { openPanel(who); return; }
  currentTarget = who;
  currentPin    = '';
  updateDots();
  document.getElementById('modal-avatar').textContent = AVATARS[who];
  document.getElementById('modal-title').textContent  = `Hi ${NAMES[who]} 👋`;
  document.getElementById('modal-sub').textContent    = 'Enter your 4-digit PIN to access your portal.';
  document.getElementById('modal-error').textContent  = '';
  document.getElementById('modal').classList.add('show');
}

function closeModal() {
  document.getElementById('modal').classList.remove('show');
  currentPin = ''; updateDots();
}

function keyPress(k) {
  if (k === 'del')   { currentPin = currentPin.slice(0,-1); }
  else if (k === 'clear') { currentPin = ''; }
  else if (currentPin.length < 4) { currentPin += k; }

  updateDots();
  document.getElementById('modal-error').textContent = '';

  if (currentPin.length === 4) {
    setTimeout(() => checkPin(), 120);
  }
}

function updateDots() {
  for (let i=0;i<4;i++) {
    const d = document.getElementById('dot'+i);
    d.textContent   = i < currentPin.length ? '●' : '';
    d.classList.toggle('filled', i < currentPin.length);
    d.classList.remove('error');
  }
}

function checkPin() {
  if (currentPin === PINS[currentTarget]) {
    unlocked[currentTarget] = true;
    // mark button as unlocked
    const btn = document.querySelector('.stu-'+currentTarget);
    if (btn) { btn.classList.remove('locked'); btn.classList.add('unlocked'); }
    closeModal();
    openPanel(currentTarget);
  } else {
    // wrong PIN — shake dots
    for (let i=0;i<4;i++) document.getElementById('dot'+i).classList.add('error');
    document.getElementById('modal-error').textContent = '❌ Wrong PIN — try again';
    currentPin = '';
    setTimeout(updateDots, 600);
  }
}

// ── Panel logic ───────────────────────────────────────────────
function openPanel(who) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.stu-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-'+who).classList.add('active');
  const btn = document.querySelector('.stu-'+who);
  if (btn) btn.classList.add('active');
  document.getElementById('panel-'+who).scrollIntoView({behavior:'smooth',block:'start'});
}

function lockPanel(who) {
  unlocked[who] = false;
  const btn = document.querySelector('.stu-'+who);
  if (btn) { btn.classList.add('locked'); btn.classList.remove('unlocked','active'); }
  document.getElementById('panel-'+who).classList.remove('active');
  document.getElementById('selector').scrollIntoView({behavior:'smooth'});
}

function teacherGoTo(who) {
  // teacher can navigate to any student's section without a PIN (already authenticated as teacher)
  unlocked[who] = true;
  const btn = document.querySelector('.stu-'+who);
  if (btn) { btn.classList.remove('locked'); btn.classList.add('unlocked'); }
  openPanel(who);
}

// ── Week accordion ────────────────────────────────────────────
function toggleWeek(hd) {
  const body = hd.nextElementSibling;
  const open = hd.classList.contains('open');
  hd.classList.toggle('open',!open);
  body.classList.toggle('open',!open);
}

// ════════════════════════════════════════════════════════════════
// CONTENT DATA — edit topics here as curriculum progresses
// ════════════════════════════════════════════════════════════════

// Subject definitions per level
function subjCard(icon, bg, name, topic, base, resources, accClass) {
  const isKS2 = accClass.includes('ks2');
  const resHTML = resources.map(r => `
    <a href="${base}/${r.file}" class="res" target="_blank">
      <div class="res-left"><span>${r.icon}</span><span class="res-label">${r.label}</span></div>
      <div style="display:flex;align-items:center;gap:5px">
        <span class="badge ${r.badge}">${r.badgeText}</span>
        <span class="res-arr">→</span>
      </div>
    </a>`).join('');

  return `
  <div class="subj-card" style="min-height:${resources.length?'auto':'170px'}">
    <div class="subj-top">
      <div class="subj-icon" style="background:${bg}">${icon}</div>
      <div><div class="subj-name">${name}</div><div class="subj-topic">${topic}</div></div>
    </div>
    <div class="resources">${resHTML}</div>
  </div>`;
}

function phCard(icon, bg, name, topic, path) {
  return `
  <div class="subj-card" style="min-height:170px">
    <div class="subj-top">
      <div class="subj-icon" style="background:${bg}">${icon}</div>
      <div><div class="subj-name">${name}</div><div class="subj-topic">${topic}</div></div>
    </div>
    <div class="ph-overlay">
      <div class="ph-icon">📂</div>
      <div class="ph-text">Upload to activate</div>
      <div class="ph-path">${path}</div>
    </div>
  </div>`;
}

const STD_RES = (base) => [
  {icon:'🎮', label:'Interactive Lesson',    file:'lesson.html',             badge:'b-html', badgeText:'HTML'},
  {icon:'📄', label:'Worksheet',             file:'worksheet.pdf',           badge:'b-pdf',  badgeText:'PDF'},
  {icon:'⚡', label:'Challenge Worksheet',   file:'worksheet-challenge.pdf', badge:'b-pdf',  badgeText:'PDF'},
  {icon:'📝', label:'Lesson Notes',          file:'notes.pdf',               badge:'b-tbd',  badgeText:'PDF'},
];

const PDF_RES_W1 = (base, hasLesson, hasWS1, hasWS2) => [
  hasLesson ? {icon:'📚', label:'Learning Notebook', file:'lesson.pdf',    badge:'b-pdf', badgeText:'PDF'} : null,
  hasWS1    ? {icon:'📄', label:'Worksheet 1',        file:'worksheet1.pdf',badge:'b-pdf', badgeText:'PDF'} : null,
  hasWS2    ? {icon:'📄', label:'Worksheet 2',        file:'worksheet2.pdf',badge:'b-pdf', badgeText:'PDF'} : null,
  {icon:'📄', label:'Worksheet 3',        file:'worksheet3.pdf',  badge:'b-tbd',  badgeText:'Upload'},
  {icon:'📄', label:'Worksheet 4',        file:'worksheet4.pdf',  badge:'b-tbd',  badgeText:'Upload'},
].filter(Boolean);

// ── KS2 ABRISH weeks ──────────────────────────────────────────
const KS2_SUBJECTS_W2 = [
  {icon:'📖', bg:'#EDE9FE', name:'Bible',         topic:'Adam & Eve — The First Family',      base:'ks2-abrish/week2/bible'},
  {icon:'✏️', bg:'#FFF1F2', name:'English',       topic:'Sentences — Types & Punctuation',   base:'ks2-abrish/week2/english'},
  {icon:'🔢', bg:'#FFFBEB', name:'Maths',          topic:'Addition — Column Method',          base:'ks2-abrish/week2/maths'},
  {icon:'🌱', bg:'#ECFDF5', name:'Science',        topic:'Plants — Parts & Functions',        base:'ks2-abrish/week2/science'},
  {icon:'🗺️', bg:'#EFF6FF', name:'Social Studies', topic:'Maps — Our Local Area',             base:'ks2-abrish/week2/social'},
];

const KS2_WEEKS_DATA = [
  {w:1,  title:'Introduction',          topics:'Creation · Phonics · Place Value · Working Scientifically · My Community',             status:'s-pending'},
  {w:2,  title:'Core Foundations',      topics:'Adam & Eve · Sentences · Column Addition · Plants · Maps',                            status:'s-partial', subjects: KS2_SUBJECTS_W2},
  {w:3,  title:'Story Writing',         topics:'Noah · Story Sentences · Subtraction · Rocks & Fossils · Ancient Egypt',              status:'s-pending'},
  {w:4,  title:'Character & Number',    topics:'Abraham · Nouns & Verbs · Multiplication · Skeletons · Continents',                   status:'s-pending'},
  {w:5,  title:'Descriptive Writing',   topics:'Joseph · Descriptive Writing · Times Tables · Muscles · Ancient Egypt Achievements',  status:'s-pending'},
  {w:6,  title:'Spelling & Forces',     topics:'Moses · Spelling Rules · Division · Nutrition · Stone Age to Iron Age',               status:'s-pending'},
  {w:7,  title:'Non-Fiction',           topics:'Ten Commandments · Non-Fiction · Fractions · Light · Romans in Britain',              status:'s-pending'},
  {w:8,  title:'Conjunctions',          topics:'Rahab · Compound Sentences · Fractions Compare · Reflection · Rules & Rights',       status:'s-pending'},
  {w:9,  title:'Settings & Magnets',    topics:'Gideon · Settings · Length & Perimeter · Magnets · Local Government',                 status:'s-pending'},
  {w:10, title:'Poetry',                topics:'Ruth · Poetry · Mass & Volume · Habitats · Climate Zones',                           status:'s-pending'},
  {w:11, title:'Adverbs & Sound',       topics:'Samuel · Adverbs · Time · Sound · Famous Explorers',                                  status:'s-pending'},
  {w:12, title:'Review',                topics:'Review & Assessment — All subjects',                                                  status:'s-pending'},
  {w:13, title:'Story Structure',       topics:'David & Goliath · Story Writing · Place Value 10,000 · Forces · Native Peoples',      status:'s-pending'},
  {w:14, title:'Prefixes & Suffixes',   topics:'Solomon · Prefixes & Suffixes · Word Problems · Sound & Hearing · Africa',           status:'s-pending'},
  {w:15, title:'Compare Two Texts',     topics:'Elijah · Compare Texts · Multiplication 6x7x9 · Life Cycles · Asia',                 status:'s-pending'},
  {w:16, title:'Apostrophes',           topics:'Jonah · Apostrophes · 2-digit × 1-digit · Habitats · Economics Basics',              status:'s-pending'},
  {w:17, title:'Information Writing',   topics:'Jesus is Born · Information Writing · Division Remainders · States of Matter · Trade', status:'s-pending'},
  {w:18, title:'Direct Speech',         topics:'Jesus Loves Children · Direct Speech · Fractions of Amounts · Heating & Cooling · Victorian Era', status:'s-pending'},
  {w:19, title:'Spelling Part 2',       topics:'Jesus Heals · Spelling Rules 2 · 2D Shapes · Water Cycle · Significant People',      status:'s-pending'},
  {w:20, title:'Paragraphs',            topics:'Good Samaritan · Paragraphs · 3D Shapes · Weather & Seasons · Environment',          status:'s-pending'},
  {w:21, title:'Letter Writing',        topics:'Jesus Dies & Rises · Letter Writing · Bar Charts · Science Project · World Religions', status:'s-pending'},
  {w:22, title:'Storytelling',          topics:'Holy Spirit · Storytelling · Money · Review Science · Local History',                  status:'s-pending'},
  {w:23, title:'Editing',              topics:'Fruit of the Spirit · Editing Writing · Angles · Cumulative Review · My Country',      status:'s-pending'},
  {w:24, title:'End of Year',           topics:'End-of-Year Review & Showcase — All Subjects',                                        status:'s-pending'},
];

// ── KS3 JESSICA / AREEJ weeks ─────────────────────────────────
const KS3_SUBJ_W1_JESSICA = [
  {icon:'📖', bg:'rgba(139,92,246,0.15)', name:'Bible',   topic:'How the Bible is Organised',   base:'ks3-jessica-areej/week1/bible',   res:'pdf_w1_bible_j'},
  {icon:'✏️', bg:'rgba(244,63,94,0.12)', name:'English', topic:'Introduction to Narrative Writing', base:'ks3-jessica-areej/week1/english', res:'pdf_w1_eng_j'},
  {icon:'🧮', bg:'rgba(245,158,11,0.12)', name:'Maths',  topic:'Place Value & Number Systems',  base:'ks3-jessica-areej/week1/maths',   res:'placeholder'},
  {icon:'🔬', bg:'rgba(16,185,129,0.12)', name:'Science',topic:'Scientific Enquiry & Lab Skills',base:'ks3-jessica-areej/week1/science', res:'placeholder'},
  {icon:'🏛️', bg:'rgba(59,130,246,0.12)', name:'History',topic:'What is History? Sources & Evidence',base:'ks3-jessica-areej/week1/history',res:'placeholder'},
];

const KS3_SUBJ_W2 = (student) => {
  const base = `ks3-${student}/week2`;
  return [
    {icon:'📖', bg:'rgba(139,92,246,0.15)', name:'Bible',   topic:'Creation — Genesis 1 & 2',     base:`${base}/bible`},
    {icon:'✏️', bg:'rgba(244,63,94,0.12)', name:'English', topic:'Parts of Speech Review',        base:`${base}/english`},
    {icon:'🧮', bg:'rgba(245,158,11,0.12)', name:'Maths',  topic:'Factors, Multiples & Primes',   base:`${base}/maths`},
    {icon:'🔬', bg:'rgba(16,185,129,0.12)', name:'Science',topic:'Cells — Building Blocks of Life',base:`${base}/science`},
    {icon:'🏛️', bg:'rgba(59,130,246,0.12)', name:'History',topic:'Mesopotamia & Egypt',           base:`${base}/history`},
  ];
};

const KS3_WEEKS_TOPICS = [
  {w:3, title:'The Fall & Sentences',    topics:'Genesis 3 · Simple/Compound/Complex · Fractions · Tissues & Organs · Ancient Greece'},
  {w:4, title:'Noah & Punctuation',      topics:'Noah · Punctuation · Fractions Add/Sub · Nutrition · Roman Empire'},
  {w:5, title:'Abraham & Figurative',    topics:'Abraham · Descriptive Writing · Fractions Mult/Div · Photosynthesis · Maps & Tools'},
  {w:6, title:'Joseph & Percentages',    topics:'Joseph · Spelling & Vocabulary · Decimals & % · Ecosystems · World Regions'},
  {w:7, title:'Moses & Ratio',           topics:'Moses · Non-Fiction · Ratio · States of Matter · Climate & Biomes'},
  {w:8, title:'Ten Commandments',        topics:'Ten Commandments · Informative Writing · Algebra · Mixtures · Population'},
  {w:9, title:'Joshua & Equations',      topics:'Joshua · Presentations · Equations · Elements & Periodic Table · Medieval Europe'},
  {w:10,title:'David & Coordinates',     topics:'David · Poetry · Coordinates · Chemical Changes · The Crusades'},
  {w:11,title:'Prophets & Negatives',    topics:'Prophets · Pronouns · Negative Numbers · Acids & Alkalis · Trade & Exploration'},
  {w:12,title:'Review',                  topics:'Review & Assessment — All subjects'},
  {w:13,title:'Birth of Jesus',          topics:'Luke 1-2 · Persuasive Writing · Angles · Forces · Transatlantic Slave Trade'},
  {w:14,title:'Ministry of Jesus',       topics:'Ministry · Dialogue & Speech · 2D Shapes · Friction & Pressure · Industrial Revolution'},
  {w:15,title:'Sermon on the Mount',     topics:'Matthew 5-7 · Compare Texts · Perimeter & Circles · Energy & Transfers · Colonialism'},
  {w:16,title:'Parables',               topics:'Parables · Paragraphing · 3D Shapes · Sound & Light · Government & Democracy'},
  {w:17,title:'Last Supper',             topics:'Last Supper · Letter Writing · Data & Averages · Earth & Space · World War I'},
  {w:18,title:'Crucifixion',             topics:'Crucifixion & Resurrection · Drama & Scripts · Data Charts · Earth\'s Structure · WW2 & Holocaust'},
  {w:19,title:'Holy Spirit',             topics:'Acts 2 · Research & Note-taking · Probability · Reproduction · UN & Human Rights'},
  {w:20,title:'Paul',                    topics:'Paul\'s Journeys · Verb Tenses · Two-step Equations · Adaptation · Natural Resources'},
  {w:21,title:'Fruit of the Spirit',     topics:'Galatians 5 · Short Story · Sequences · Human Impact · Globalisation'},
  {w:22,title:'Armour of God',           topics:'Ephesians 6 · Debate · Symmetry · Electricity · Africa Geography'},
  {w:23,title:'Revelation & Hope',       topics:'Revelation · Editing · Real-world Maths · Science Project · Current Issues'},
  {w:24,title:'End of Year',             topics:'End-of-Year Reflection & Celebration — All Subjects'},
];

// ════════════════════════════════════════════════════════════════
// RENDER WEEKS
// ════════════════════════════════════════════════════════════════

function weekHTML(wData, accClass, student) {
  const isOpen = wData.w === 2 ? ' open' : '';
  const bodyOpen = wData.w === 2 ? ' open' : '';

  let subjectsHTML = '';
  if (wData.subjects) {
    subjectsHTML = wData.subjects.map(s => {
      const res = STD_RES(s.base);
      return subjCard(s.icon, s.bg, s.name, s.topic, s.base, res, accClass);
    }).join('');
  } else if (wData.w === 1 && (student === 'jessica' || student === 'areej')) {
    // Week 1 KS3 — mixed real + placeholder
    subjectsHTML = buildKS3W1Cards(student, accClass);
  } else {
    // placeholder week
    subjectsHTML = `
    <div style="padding:20px;text-align:center;color:#6B7280;font-size:0.85rem;">
      <div style="font-size:1.8rem;margin-bottom:8px;">📂</div>
      <div style="font-weight:700;margin-bottom:4px;color:#9CA3AF;">Week ${wData.w} materials not yet uploaded</div>
      <div style="font-size:0.75rem;">Upload files to <code style="background:#1F2937;padding:1px 5px;border-radius:4px;color:#D1FAE5">${student}/week${wData.w}/[subject]/</code></div>
    </div>`;
  }

  return `
  <div class="week-section">
    <div class="week-hd${isOpen}" onclick="toggleWeek(this)">
      <div class="week-hd-left">
        <div class="week-num">${wData.w}</div>
        <div>
          <div class="week-title">Week ${wData.w} — ${wData.title}</div>
          <div class="week-topics">${wData.topics}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <span class="week-status ${wData.status||'s-pending'}">${wData.status==='s-partial'?'Partial':wData.status==='s-complete'?'Complete':'Coming soon'}</span>
        <span class="week-chevron">▼</span>
      </div>
    </div>
    <div class="week-body${bodyOpen}">
      <div class="subjects-grid">${subjectsHTML}</div>
    </div>
  </div>`;
}

function buildKS3W1Cards(student, accClass) {
  // Bible & English have real PDFs; others are placeholders
  const base = 'ks3-jessica-areej/week1';
  const cards = [];

  // Bible — real
  cards.push(subjCard('📖','rgba(139,92,246,0.15)','Bible','How the Bible is Organised',
    base+'/bible',
    PDF_RES_W1(base+'/bible', true, true, true),
    accClass));

  // English — real
  cards.push(subjCard('✏️','rgba(244,63,94,0.12)','English','Introduction to Narrative Writing',
    base+'/english',
    PDF_RES_W1(base+'/english', true, true, true),
    accClass));

  // Maths, Science, History — placeholders
  cards.push(phCard('🧮','rgba(245,158,11,0.12)','Maths','Place Value & Number Systems',
    base+'/maths/lesson.pdf + worksheet1-4.pdf'));
  cards.push(phCard('🔬','rgba(16,185,129,0.12)','Science','Scientific Enquiry & Lab Skills',
    base+'/science/lesson.pdf + worksheet1-4.pdf'));
  cards.push(phCard('🏛️','rgba(59,130,246,0.12)','History','What is History? Sources & Evidence',
    base+'/history/lesson.pdf + worksheet1-4.pdf'));

  return cards.join('');
}

// Build teacher combined weeks
function buildTeacherWeeks() {
  const container = document.getElementById('weeks-teacher');
  // teacher sees KS3 weeks (both jessica + areej share same files)
  const allWeeks = [
    {w:1, title:'Foundations', topics:'How the Bible is Organised · Narrative Writing · Place Value · Scientific Enquiry · History Sources', status:'s-partial'},
    {w:2, title:'Deep Foundations', topics:'Creation · Parts of Speech · Factors & Primes · Cells · Mesopotamia & Egypt', status:'s-partial'},
    ...KS3_WEEKS_TOPICS.map(w => ({...w, status:'s-pending'}))
  ];
  container.innerHTML = allWeeks.map(w => {
    if (w.w === 1) {
      return weekHTML({...w, subjects:null}, 'teach-acc', 'jessica-areej');
    }
    if (w.w === 2) {
      return weekHTML({...w, subjects: KS3_SUBJ_W2('jessica-areej')}, 'teach-acc', 'jessica-areej');
    }
    return weekHTML(w, 'teach-acc', 'all');
  }).join('');
}

// ── Init all panels ────────────────────────────────────────────
function initPanels() {
  // Abrish
  const abrishWeeks = document.getElementById('weeks-abrish');
  abrishWeeks.innerHTML = KS2_WEEKS_DATA.map(w => weekHTML(w, 'ks2-acc', 'ks2-abrish')).join('');

  // Jessica
  const jessicaWeeks = document.getElementById('weeks-jessica');
  const ks3All = [
    {w:1, title:'Foundations', topics:'How the Bible is Organised · Narrative Writing · Place Value · Scientific Enquiry · History Sources', status:'s-partial'},
    {w:2, title:'Deep Foundations', topics:'Creation · Parts of Speech · Factors & Primes · Cells · Mesopotamia & Egypt', status:'s-partial', subjects: KS3_SUBJ_W2('jessica-areej')},
    ...KS3_WEEKS_TOPICS.map(w => ({...w, status:'s-pending'}))
  ];
  jessicaWeeks.innerHTML = ks3All.map(w => weekHTML(w, 'ks3j-acc', 'jessica')).join('');

  // Areej (same curriculum, separate panel)
  const areejWeeks = document.getElementById('weeks-areej');
  areejWeeks.innerHTML = ks3All.map(w => weekHTML(w, 'ks3a-acc', 'areej')).join('');

  // Teacher
  buildTeacherWeeks();
}

initPanels();
</script>
</body>
</html>
