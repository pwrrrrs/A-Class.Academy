import { initLayout, sb, esc, baht, fmtDate, $, requireLogin, currentProfile, notice } from '../core.js';

const app = $('#app');
const STATUS = { pending: 'รอตรวจสลิป', approved: 'อนุมัติแล้ว', rejected: 'ไม่ผ่าน' };

(async () => {
  await initLayout();
  const user = await requireLogin();
  const c = await sb();
  const profile = await currentProfile();

  const [{ data: enrolls }, { data: pays }, { data: progress }, { data: attempts }] = await Promise.all([
    c.from('enrollments').select('course_id,status,created_at,courses(id,slug,title,subject,level)').eq('user_id', user.id),
    c.from('payments').select('id,course_id,plan,installment_no,amount,total_price,status,admin_note,created_at,courses(slug,title)').eq('user_id', user.id).order('created_at', { ascending: false }),
    c.from('lesson_progress').select('lesson_id').eq('user_id', user.id),
    c.from('quiz_attempts').select('score,total,created_at,lessons(title,courses(title))').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
  ]);

  const courseIds = (enrolls || []).map((e) => e.course_id);
  const { data: lessons } = courseIds.length
    ? await c.from('lessons').select('id,course_id').in('course_id', courseIds)
    : { data: [] };
  const done = new Set((progress || []).map((p) => p.lesson_id));

  // Next instalment per course (only for instalment plans)
  const instCourses = [...new Set((pays || []).filter((p) => p.plan === 'installment' && p.status !== 'rejected').map((p) => p.course_id))];
  const nextDue = {};
  await Promise.all(instCourses.map(async (id) => {
    const { data } = await c.rpc('next_installment', { p_course: id });
    if (data) nextDue[id] = data;
  }));

  const courseCards = (enrolls || []).filter((e) => e.courses).map((e) => {
    const ls = (lessons || []).filter((l) => l.course_id === e.course_id);
    const n = ls.filter((l) => done.has(l.id)).length;
    const pct = ls.length ? Math.round((n / ls.length) * 100) : 0;
    const due = nextDue[e.course_id];
    return `
    <div class="card stack" style="gap:12px">
      <div class="row between"><span class="tag">${esc(e.courses.subject)}</span><span class="tiny muted">${esc(e.courses.level)}</span></div>
      <h3 style="font-size:20px">${esc(e.courses.title)}</h3>
      <div class="row between small"><span class="muted">เรียนแล้ว ${n}/${ls.length} บท</span><b>${pct}%</b></div>
      <div class="bar"><span style="width:${pct}%"></span></div>
      ${due ? `<div class="notice warn">ค้างชำระงวดที่ ${due.installment_no}: ${baht(due.amount)} <a class="link" href="/checkout.html?course=${encodeURIComponent(e.courses.slug)}">ชำระงวดนี้ →</a></div>` : ''}
      <a class="btn btn-brand" href="/learn.html?course=${encodeURIComponent(e.courses.slug)}">${n ? 'เรียนต่อ' : 'เริ่มเรียน'}</a>
    </div>`;
  }).join('');

  const payRows = (pays || []).map((p) => `
    <tr>
      <td>${fmtDate(p.created_at)}</td>
      <td>${esc(p.courses?.title || '')}</td>
      <td>${p.plan === 'full' ? 'จ่ายเต็ม' : `งวดที่ ${p.installment_no}/3`}</td>
      <td>${baht(p.amount)}</td>
      <td><span class="badge ${p.status}">${STATUS[p.status]}</span>${p.admin_note ? `<div class="tiny muted">${esc(p.admin_note)}</div>` : ''}</td>
    </tr>`).join('');

  const quizRows = (attempts || []).map((a) => `
    <tr><td>${fmtDate(a.created_at)}</td><td>${esc(a.lessons?.courses?.title || '')}</td><td>${esc(a.lessons?.title || '')}</td><td><b>${a.score}/${a.total}</b></td></tr>`).join('');

  const p = profile || {};
  app.innerHTML = `
    <div class="page-head">
      <div><div class="eyebrow">ห้องเรียนของฉัน</div><h1>สวัสดี ${esc(p.full_name || user.email)}</h1></div>
      <a class="btn btn-ghost" href="/#courses">ดูคอร์สอื่น</a>
    </div>

    <section class="stack" style="gap:16px;margin-bottom:48px">
      <h2 style="font-size:24px">คอร์สของฉัน</h2>
      ${courseCards ? `<div class="grid-courses">${courseCards}</div>` : `<div class="empty">ยังไม่มีคอร์ส <a class="link" href="/#courses">เลือกคอร์สที่สนใจ →</a></div>`}
    </section>

    ${pays?.length ? `
    <section class="stack" style="gap:16px;margin-bottom:48px">
      <h2 style="font-size:24px">การชำระเงิน</h2>
      <div class="table-wrap"><table class="table"><thead><tr><th>วันที่</th><th>คอร์ส</th><th>งวด</th><th>ยอด</th><th>สถานะ</th></tr></thead><tbody>${payRows}</tbody></table></div>
    </section>` : ''}

    ${attempts?.length ? `
    <section class="stack" style="gap:16px;margin-bottom:48px">
      <h2 style="font-size:24px">คะแนนแบบทดสอบล่าสุด</h2>
      <div class="table-wrap"><table class="table"><thead><tr><th>วันที่</th><th>คอร์ส</th><th>บทเรียน</th><th>คะแนน</th></tr></thead><tbody>${quizRows}</tbody></table></div>
    </section>` : ''}

    <section class="stack" style="gap:16px">
      <h2 style="font-size:24px">ข้อมูลของฉัน</h2>
      <form id="pf" class="card stack">
        <div class="form-grid">
          <div class="field"><label for="full_name">ชื่อ-นามสกุล (นักเรียน)</label><input class="input" id="full_name" value="${esc(p.full_name)}"></div>
          <div class="field"><label for="grade">ระดับชั้น</label><input class="input" id="grade" value="${esc(p.grade)}"></div>
          <div class="field"><label for="school">โรงเรียน</label><input class="input" id="school" value="${esc(p.school)}"></div>
          <div class="field"><label for="phone">เบอร์โทร</label><input class="input" id="phone" type="tel" value="${esc(p.phone)}"></div>
          <div class="field"><label for="line_id">LINE ID</label><input class="input" id="line_id" value="${esc(p.line_id)}"></div>
          <div class="field"><label for="parent_name">ชื่อผู้ปกครอง</label><input class="input" id="parent_name" value="${esc(p.parent_name)}"></div>
          <div class="field"><label for="parent_phone">เบอร์ผู้ปกครอง</label><input class="input" id="parent_phone" type="tel" value="${esc(p.parent_phone)}"></div>
        </div>
        <div id="pmsg" class="hidden" role="status"></div>
        <div class="row"><button class="btn btn-brand" type="submit">บันทึก</button><span class="small muted">อีเมล: ${esc(user.email)}</span></div>
      </form>
    </section>`;

  $('#pf').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fields = ['full_name', 'grade', 'school', 'phone', 'line_id', 'parent_name', 'parent_phone'];
    const row = Object.fromEntries(fields.map((f) => [f, $(`#${f}`).value.trim() || null]));
    const { error } = await c.from('profiles').update(row).eq('id', user.id);
    notice($('#pmsg'), error ? 'bad' : 'ok', error ? `บันทึกไม่สำเร็จ: ${error.message}` : 'บันทึกเรียบร้อย');
  });
})();
