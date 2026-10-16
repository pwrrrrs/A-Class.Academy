import { initLayout, sb, esc, baht, param, $, requireLogin, notice } from '../core.js';
import { promptpayPayload, qrSvg } from '../promptpay.js';

const app = $('#app');
const MAX_MB = 5;

(async () => {
  const { settings } = await initLayout();
  const user = await requireLogin();
  const c = await sb();

  const { data: course } = await c.from('courses').select('id,slug,title,price,allow_installments').eq('slug', param('course')).maybeSingle();
  if (!course) { app.innerHTML = '<div class="empty">ไม่พบคอร์สนี้</div>'; return; }

  const [{ data: en }, { data: due }, { data: pending }] = await Promise.all([
    c.from('enrollments').select('status').eq('course_id', course.id).eq('user_id', user.id).maybeSingle(),
    c.rpc('next_installment', { p_course: course.id }),
    c.from('payments').select('id').eq('course_id', course.id).eq('user_id', user.id).eq('status', 'pending'),
  ]);

  const back = `<a class="link" href="/course.html?slug=${encodeURIComponent(course.slug)}">← กลับไปหน้าคอร์ส</a>`;
  if (pending?.length) {
    app.innerHTML = `<div class="auth-box card stack"><h1 style="font-size:26px">รอตรวจสลิป</h1><p class="muted">ครูได้รับสลิปของคอร์ส ${esc(course.title)} แล้ว จะตรวจและเปิดคอร์สให้โดยเร็ว</p><a class="btn btn-brand" href="/my.html">ไปห้องเรียนของฉัน</a></div>`;
    return;
  }
  if (en?.status === 'active' && !due) {
    app.innerHTML = `<div class="auth-box card stack"><h1 style="font-size:26px">ลงทะเบียนคอร์สนี้แล้ว</h1><a class="btn btn-brand" href="/learn.html?course=${encodeURIComponent(course.slug)}">เข้าห้องเรียน</a></div>`;
    return;
  }
  if (!course.price && !due) { app.innerHTML = `<div class="empty">คอร์สนี้ยังไม่ได้ตั้งราคา กรุณาทักไลน์สอบถาม<br>${back}</div>`; return; }

  const state = { plan: 'full', coupon: '', quote: null, amount: due ? Number(due.amount) : Number(course.price) };

  app.innerHTML = `
    <nav class="small" style="margin-bottom:16px">${back}</nav>
    <div class="page-head"><div><div class="eyebrow">ชำระเงิน</div><h1>${esc(course.title)}</h1></div></div>
    <div class="learn">
      <div class="learn-main">
        ${due ? `
          <div class="card stack">
            <h2 style="font-size:22px">ชำระงวดที่ ${due.installment_no} จาก 3</h2>
            <p class="muted">ราคาคอร์ส ${baht(due.total)} · ชำระแล้ว ${baht(due.paid)}</p>
          </div>` : `
          <div class="card stack">
            <h2 style="font-size:22px">1. เลือกวิธีชำระ</h2>
            <div class="stack" style="gap:8px" role="radiogroup">
              <label class="choice"><input type="radio" name="plan" value="full" checked><span><b>จ่ายเต็มจำนวน</b></span></label>
              ${course.allow_installments ? `<label class="choice"><input type="radio" name="plan" value="installment"><span><b>แบ่งจ่าย 3 งวด</b> <span class="muted small">40% ตอนสมัคร · 30% · 30%</span></span></label>` : ''}
            </div>
            <div class="field"><label for="coupon">โค้ดส่วนลด (ถ้ามี)</label>
              <div class="row" style="flex-wrap:nowrap"><input class="input" id="coupon" autocomplete="off" style="text-transform:uppercase"><button class="btn btn-ghost" type="button" id="applyCoupon">ใช้โค้ด</button></div>
            </div>
            <div id="cmsg" class="hidden" role="status"></div>
          </div>`}

        <div class="card stack">
          <h2 style="font-size:22px">${due ? '1' : '2'}. สแกนจ่ายผ่าน PromptPay</h2>
          <div id="summary"></div>
          <div class="qr-box">
            <span class="pp-head">PromptPay</span>
            <div class="qr" id="qr"><div class="spinner"></div></div>
            <div><b id="ppName">${esc(settings.promptpay_name || 'A-Class Academy')}</b></div>
            <div class="price" style="font-size:28px" id="ppAmount"></div>
            <div class="tiny muted">สแกนด้วยแอปธนาคารใดก็ได้ ยอดเงินจะขึ้นให้อัตโนมัติ</div>
          </div>
        </div>

        <form class="card stack" id="slipForm">
          <h2 style="font-size:22px">${due ? '2' : '3'}. แนบสลิป</h2>
          <div class="field"><label for="slip">รูปสลิปโอนเงิน (ไม่เกิน ${MAX_MB} MB)</label><input class="input" id="slip" type="file" accept="image/*" required></div>
          <img id="preview" alt="ตัวอย่างสลิป" class="hidden" style="max-width:220px;border-radius:12px;border:1px solid var(--line)">
          <div class="field"><label for="note">หมายเหตุถึงครู (ถ้ามี)</label><input class="input" id="note" placeholder="เช่น ชื่อนักเรียน หรือรอบเรียนที่ต้องการ"></div>
          <div id="smsg" class="hidden" role="status"></div>
          <button class="btn btn-brand" type="submit" id="sendBtn">ส่งสลิป</button>
        </form>
      </div>
      <aside class="learn-side">
        <div class="card stack small">
          <b>หลังส่งสลิป</b>
          <p class="muted">ครูจะตรวจสลิปและเปิดคอร์สให้ ปกติไม่เกิน 24 ชั่วโมง ติดตามสถานะได้ที่ "ห้องเรียนของฉัน"</p>
        </div>
      </aside>
    </div>`;

  async function renderQr() {
    const lines = [];
    if (!due && state.quote) {
      const q = state.quote;
      lines.push(`<div class="row between"><span>ราคาคอร์ส</span><span>${baht(q.base)}</span></div>`);
      if (Number(q.discount) > 0) lines.push(`<div class="row between" style="color:var(--ok)"><span>ส่วนลด (${esc(state.coupon)})</span><span>−${baht(q.discount)}</span></div>`);
      if (state.plan === 'installment') lines.push(`<div class="row between muted"><span>ราคาหลังส่วนลด</span><span>${baht(q.total)}</span></div>`);
    }
    lines.push(`<div class="row between" style="font-weight:700;font-size:19px"><span>ยอดที่ต้องโอนตอนนี้</span><span>${baht(state.amount)}</span></div>`);
    $('#summary').innerHTML = `<div class="stack" style="gap:4px">${lines.join('')}</div>`;
    $('#ppAmount').textContent = baht(state.amount);
    if (!settings.promptpay_id) {
      $('#qr').innerHTML = '<p class="small muted">ครูยังไม่ได้ตั้งเลขพร้อมเพย์ กรุณาทักไลน์เพื่อขอเลขบัญชี</p>';
      return;
    }
    try {
      $('#qr').innerHTML = await qrSvg(promptpayPayload(settings.promptpay_id, state.amount));
      $('#qr svg')?.setAttribute('role', 'img');
      $('#qr svg')?.setAttribute('aria-label', `QR พร้อมเพย์ ยอด ${baht(state.amount)}`);
    } catch (e) {
      $('#qr').innerHTML = `<p class="small muted">${esc(e.message)}</p>`;
    }
  }

  async function refreshQuote() {
    if (due) return renderQr();
    const { data, error } = await c.rpc('quote_price', { p_course: course.id, p_coupon: state.coupon || null, p_plan: state.plan });
    if (error) { notice($('#cmsg'), 'bad', error.message); return; }
    state.quote = data;
    state.amount = Number(data.due_now);
    if (state.coupon) {
      if (data.coupon_valid) notice($('#cmsg'), 'ok', `ใช้โค้ด ${state.coupon} แล้ว ลด ${baht(data.discount)}`);
      else { notice($('#cmsg'), 'bad', data.coupon_message || 'ใช้โค้ดนี้ไม่ได้'); state.coupon = ''; }
    }
    renderQr();
  }

  if (!due) {
    app.querySelectorAll('input[name="plan"]').forEach((r) => r.addEventListener('change', () => { state.plan = r.value; refreshQuote(); }));
    $('#applyCoupon').addEventListener('click', () => { state.coupon = $('#coupon').value.trim().toUpperCase(); refreshQuote(); });
    $('#coupon').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#applyCoupon').click(); } });
  }
  await refreshQuote();

  $('#slip').addEventListener('change', () => {
    const f = $('#slip').files[0];
    const img = $('#preview');
    if (f) { img.src = URL.createObjectURL(f); img.classList.remove('hidden'); } else img.classList.add('hidden');
  });

  $('#slipForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#smsg');
    const file = $('#slip').files[0];
    if (!file) return notice(msg, 'bad', 'กรุณาเลือกรูปสลิป');
    if (!file.type.startsWith('image/')) return notice(msg, 'bad', 'กรุณาเลือกไฟล์รูปภาพ');
    if (file.size > MAX_MB * 1024 * 1024) return notice(msg, 'bad', `ไฟล์ใหญ่เกิน ${MAX_MB} MB`);
    const btn = $('#sendBtn');
    btn.disabled = true;
    notice(msg, 'info', 'กำลังส่งสลิป…');
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;
      const up = await c.storage.from('slips').upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw up.error;
      const { error } = await c.rpc('create_payment', {
        p_course: course.id, p_plan: state.plan, p_slip_path: path,
        p_coupon: state.coupon || null, p_note: $('#note').value.trim() || null,
      });
      if (error) throw error;
      app.innerHTML = `
        <div class="auth-box card stack" style="text-align:center;padding:40px">
          <h1 style="font-size:28px">ส่งสลิปเรียบร้อย</h1>
          <p class="muted">ครูจะตรวจและเปิดคอร์สให้โดยเร็ว ปกติไม่เกิน 24 ชั่วโมง</p>
          <a class="btn btn-brand" href="/my.html">ไปห้องเรียนของฉัน</a>
        </div>`;
    } catch (err) {
      notice(msg, 'bad', `ส่งไม่สำเร็จ: ${err.message}`);
      btn.disabled = false;
    }
  });
})();
