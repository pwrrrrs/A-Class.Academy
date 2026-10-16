import { initLayout, sb, t, param, $, notice, currentUser, isConfigured } from '../core.js';

const app = $('#app');
const next = () => {
  const n = param('next');
  return n && n.startsWith('/') && !n.startsWith('//') ? n : '/my.html';
};
const GRADES = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6', 'มหาวิทยาลัย', 'อื่นๆ'];

function thaiError(msg = '') {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  if (m.includes('already registered') || m.includes('already been registered')) return 'อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบแทน';
  if (m.includes('email not confirmed')) return 'ยังไม่ได้ยืนยันอีเมล กรุณากดลิงก์ในอีเมลที่ส่งไปก่อน';
  if (m.includes('password') && m.includes('characters')) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
  if (m.includes('rate limit') || m.includes('too many')) return 'ส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่';
  return msg || 'เกิดข้อผิดพลาด กรุณาลองใหม่';
}

function view(mode) {
  const tabs = `
    <div class="tabs" role="tablist">
      <button class="tab" role="tab" data-mode="login" aria-selected="${mode === 'login'}">${t('auth.login')}</button>
      <button class="tab" role="tab" data-mode="signup" aria-selected="${mode === 'signup'}">${t('auth.signup')}</button>
    </div>`;
  const forms = {
    login: `
      <form id="f" class="stack" novalidate>
        <div class="field"><label for="email">${t('auth.email')}</label><input class="input" id="email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="pw">รหัสผ่าน</label><input class="input" id="pw" type="password" autocomplete="current-password" required></div>
        <button class="btn btn-brand" type="submit">${t('auth.login')}</button>
        <button class="link" type="button" data-mode="forgot" style="align-self:flex-start">${t('auth.forgot')}</button>
      </form>`,
    signup: `
      <form id="f" class="stack" novalidate>
        <div class="field"><label for="name">${t('auth.name')}</label><input class="input" id="name" autocomplete="name" required></div>
        <div class="form-grid">
          <div class="field"><label for="grade">${t('auth.grade')}</label>
            <select class="input" id="grade"><option value="">เลือก</option>${GRADES.map((g) => `<option>${g}</option>`).join('')}</select></div>
          <div class="field"><label for="phone">${t('auth.phone')}</label><input class="input" id="phone" type="tel" autocomplete="tel"></div>
        </div>
        <div class="field"><label for="school">${t('auth.school')}</label><input class="input" id="school"></div>
        <div class="field"><label for="email">${t('auth.email')}</label><input class="input" id="email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="pw">${t('auth.password')}</label><input class="input" id="pw" type="password" autocomplete="new-password" minlength="8" required></div>
        <button class="btn btn-brand" type="submit">${t('auth.signup')}</button>
        <p class="tiny muted">ผู้ปกครองสมัครให้น้องได้ ใช้อีเมลของผู้ปกครองหรือของน้องก็ได้</p>
      </form>`,
    forgot: `
      <form id="f" class="stack" novalidate>
        <p class="muted">กรอกอีเมลที่ใช้สมัคร ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้</p>
        <div class="field"><label for="email">${t('auth.email')}</label><input class="input" id="email" type="email" autocomplete="email" required></div>
        <button class="btn btn-brand" type="submit">${t('auth.reset')}</button>
        <button class="link" type="button" data-mode="login" style="align-self:flex-start">← กลับไปเข้าสู่ระบบ</button>
      </form>`,
    reset: `
      <form id="f" class="stack" novalidate>
        <p class="muted">ตั้งรหัสผ่านใหม่</p>
        <div class="field"><label for="pw">รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)</label><input class="input" id="pw" type="password" autocomplete="new-password" minlength="8" required></div>
        <button class="btn btn-brand" type="submit">บันทึกรหัสผ่าน</button>
      </form>`,
  };
  app.innerHTML = `
    <div class="auth-box card stack" style="padding:32px">
      <h1 style="font-size:28px">${mode === 'signup' ? t('auth.signup') : mode === 'forgot' ? t('auth.forgot') : mode === 'reset' ? 'ตั้งรหัสผ่านใหม่' : t('auth.login')}</h1>
      ${mode === 'login' || mode === 'signup' ? tabs : ''}
      <div id="msg" class="hidden" role="status"></div>
      ${forms[mode]}
    </div>`;
  app.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => view(b.dataset.mode)));
  $('#f').addEventListener('submit', (e) => { e.preventDefault(); submit(mode, e.submitter); });
}

async function submit(mode, btn) {
  const msg = $('#msg');
  const email = $('#email')?.value.trim();
  const pw = $('#pw')?.value;
  if ($('#email') && !/^\S+@\S+\.\S+$/.test(email)) return notice(msg, 'bad', 'กรุณากรอกอีเมลให้ถูกต้อง');
  if ((mode === 'signup' || mode === 'reset') && (!pw || pw.length < 8)) return notice(msg, 'bad', 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
  if (mode === 'signup' && !$('#name').value.trim()) return notice(msg, 'bad', 'กรุณากรอกชื่อ-นามสกุล');
  if (mode === 'login' && !pw) return notice(msg, 'bad', 'กรุณากรอกรหัสผ่าน');

  const c = await sb();
  if (btn) btn.disabled = true;
  try {
    if (mode === 'login') {
      const { error } = await c.auth.signInWithPassword({ email, password: pw });
      if (error) throw error;
      location.replace(next());
    } else if (mode === 'signup') {
      const { data, error } = await c.auth.signUp({
        email, password: pw,
        options: {
          emailRedirectTo: `${location.origin}/my.html`,
          data: { full_name: $('#name').value.trim(), phone: $('#phone').value.trim(), grade: $('#grade').value, school: $('#school').value.trim() },
        },
      });
      if (error) throw error;
      if (data.session) return location.replace(next());
      notice(msg, 'ok', `สมัครเรียบร้อย! ระบบส่งอีเมลยืนยันไปที่ ${email} แล้ว กดลิงก์ในอีเมลเพื่อเริ่มใช้งาน (ถ้าไม่เจอ ลองดูในโฟลเดอร์ Junk/Spam)`);
      $('#f').classList.add('hidden');
    } else if (mode === 'forgot') {
      const { error } = await c.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/login.html?mode=reset` });
      if (error) throw error;
      notice(msg, 'ok', 'ส่งลิงก์ไปที่อีเมลแล้ว กรุณาเช็กกล่องจดหมาย');
    } else if (mode === 'reset') {
      const { error } = await c.auth.updateUser({ password: pw });
      if (error) throw error;
      notice(msg, 'ok', 'เปลี่ยนรหัสผ่านเรียบร้อย กำลังพาไปห้องเรียน…');
      setTimeout(() => location.replace('/my.html'), 1200);
    }
  } catch (err) {
    notice(msg, 'bad', thaiError(err.message));
  } finally {
    if (btn) btn.disabled = false;
  }
}

(async () => {
  await initLayout();
  if (!isConfigured()) { app.innerHTML = '<div class="empty">ระบบสมาชิกยังไม่เปิดใช้งาน</div>'; return; }
  const c = await sb();
  if (param('mode') === 'reset') {
    c.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') view('reset'); });
    view('reset');
    return;
  }
  if (await currentUser()) { location.replace(next()); return; }
  view(param('mode') === 'signup' ? 'signup' : 'login');
})();
