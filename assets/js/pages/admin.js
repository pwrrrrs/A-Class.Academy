import { initLayout, sb, esc, baht, fmtDate, $, $$, requireLogin, currentProfile, notice, youtubeId } from '../core.js';

const app = $('#app');
let c;
const TABS = [
  ['payments', 'ตรวจสลิป'], ['courses', 'คอร์สและบทเรียน'], ['students', 'นักเรียน'], ['coupons', 'คูปอง'], ['settings', 'ตั้งค่าเว็บ'],
];
const STATUS = { pending: 'รอตรวจ', approved: 'อนุมัติแล้ว', rejected: 'ไม่ผ่าน' };

// ---------- small helpers ----------
const slugify = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9ก-๙]+/g, '-').replace(/^-+|-+$/g, '') || `course-${Date.now()}`;
const val = (id) => $(`#${id}`)?.value.trim() ?? '';
const numOrNull = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

function dialog(html, onMount) {
  const d = document.createElement('dialog');
  d.innerHTML = `<div class="dlg">${html}</div>`;
  document.body.appendChild(d);
  d.addEventListener('close', () => d.remove());
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  d.showModal();
  onMount?.(d);
  return d;
}

async function uploadMedia(file, folder) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${folder}/${Date.now()}.${ext}`;
  const { error } = await c.storage.from('media').upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw error;
  return c.storage.from('media').getPublicUrl(path).data.publicUrl;
}

// ---------- payments ----------
async function payments(root, filter = 'pending') {
  root.innerHTML = '<div class="spinner"></div>';
  let q = c.from('payments').select('*, courses(title)').order('created_at', { ascending: false }).limit(200);
  if (filter !== 'all') q = q.eq('status', filter);
  const { data: rows, error } = await q;
  if (error) { root.innerHTML = `<div class="notice bad">${esc(error.message)}</div>`; return; }

  const ids = [...new Set(rows.map((r) => r.user_id))];
  const { data: profs } = ids.length ? await c.from('profiles').select('id,full_name,phone,grade').in('id', ids) : { data: [] };
  const who = Object.fromEntries((profs || []).map((p) => [p.id, p]));
  const paths = rows.map((r) => r.slip_path).filter(Boolean);
  const { data: signed } = paths.length ? await c.storage.from('slips').createSignedUrls(paths, 3600) : { data: [] };
  const urlOf = Object.fromEntries((signed || []).map((s) => [s.path, s.signedUrl]));

  root.innerHTML = `
    <div class="row" style="margin-bottom:16px">
      ${['pending', 'approved', 'rejected', 'all'].map((f) => `<button class="filter" data-f="${f}" aria-pressed="${f === filter}">${f === 'all' ? 'ทั้งหมด' : STATUS[f]}</button>`).join('')}
    </div>
    ${rows.length ? `<div class="table-wrap"><table class="table">
      <thead><tr><th>สลิป</th><th>นักเรียน</th><th>คอร์ส</th><th>ยอด</th><th>วันที่</th><th>สถานะ</th><th></th></tr></thead>
      <tbody>${rows.map((r) => {
        const p = who[r.user_id] || {};
        const u = urlOf[r.slip_path];
        return `<tr>
          <td>${u ? `<img class="slip-thumb" src="${esc(u)}" alt="สลิป" data-big="${esc(u)}">` : '—'}</td>
          <td><b>${esc(p.full_name || '—')}</b><div class="tiny muted">${esc(p.grade || '')} ${esc(p.phone || '')}</div></td>
          <td>${esc(r.courses?.title || '')}<div class="tiny muted">${r.plan === 'full' ? 'จ่ายเต็ม' : `งวด ${r.installment_no}/3`}${r.coupon_code ? ` · โค้ด ${esc(r.coupon_code)}` : ''}</div>${r.note ? `<div class="tiny">“${esc(r.note)}”</div>` : ''}</td>
          <td><b>${baht(r.amount)}</b><div class="tiny muted">จาก ${baht(r.total_price)}</div></td>
          <td class="small">${fmtDate(r.created_at)}</td>
          <td><span class="badge ${r.status}">${STATUS[r.status]}</span>${r.admin_note ? `<div class="tiny muted">${esc(r.admin_note)}</div>` : ''}</td>
          <td>${r.status === 'pending' ? `<div class="row" style="flex-wrap:nowrap"><button class="btn btn-brand btn-sm" data-ok="${r.id}">อนุมัติ</button><button class="btn btn-danger btn-sm" data-no="${r.id}">ไม่ผ่าน</button></div>` : ''}</td>
        </tr>`;
      }).join('')}</tbody></table></div>` : '<div class="empty">ไม่มีรายการ</div>'}`;

  $$('[data-f]', root).forEach((b) => b.addEventListener('click', () => payments(root, b.dataset.f)));
  $$('[data-big]', root).forEach((img) => img.addEventListener('click', () => dialog(`<img src="${esc(img.dataset.big)}" alt="สลิป" style="width:100%"><button class="btn btn-ghost" onclick="this.closest('dialog').close()">ปิด</button>`)));
  $$('[data-ok]', root).forEach((b) => b.addEventListener('click', async () => {
    b.disabled = true;
    const { error: e } = await c.rpc('review_payment', { p_id: b.dataset.ok, p_approve: true, p_note: null });
    if (e) { alert(e.message); b.disabled = false; return; }
    payments(root, filter);
  }));
  $$('[data-no]', root).forEach((b) => b.addEventListener('click', async () => {
    const note = prompt('เหตุผลที่ไม่ผ่าน (นักเรียนจะเห็นข้อความนี้)', 'ยอดเงินในสลิปไม่ตรง กรุณาส่งใหม่');
    if (note === null) return;
    const { error: e } = await c.rpc('review_payment', { p_id: b.dataset.no, p_approve: false, p_note: note });
    if (e) return alert(e.message);
    payments(root, filter);
  }));
}

// ---------- courses ----------
async function courses(root) {
  root.innerHTML = '<div class="spinner"></div>';
  const { data: list } = await c.from('courses').select('*').order('sort_order');
  const { data: counts } = await c.from('lessons').select('course_id');
  const n = {};
  (counts || []).forEach((l) => { n[l.course_id] = (n[l.course_id] || 0) + 1; });
  root.innerHTML = `
    <div class="row between" style="margin-bottom:16px"><p class="muted small">กดชื่อคอร์สเพื่อแก้ไข ราคา รายละเอียด และเพิ่มบทเรียน/แบบทดสอบ</p><button class="btn btn-brand" id="newCourse">+ เพิ่มคอร์ส</button></div>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>คอร์ส</th><th>ระดับ</th><th>ราคา</th><th>บทเรียน</th><th>แสดงบนเว็บ</th></tr></thead>
      <tbody>${(list || []).map((x) => `<tr>
        <td><button class="link" data-edit="${x.id}">${esc(x.title)}</button></td>
        <td>${esc(x.level || '')}</td><td>${x.price ? baht(x.price) : '<span class="muted">ยังไม่ตั้ง</span>'}</td>
        <td><button class="link" data-lessons="${x.id}">${n[x.id] || 0} บท · จัดการ</button></td>
        <td>${x.is_published ? '<span class="badge active">แสดง</span>' : '<span class="badge pending">ซ่อน</span>'}</td>
      </tr>`).join('')}</tbody></table></div>`;
  $('#newCourse').addEventListener('click', () => courseForm(root, null));
  $$('[data-edit]', root).forEach((b) => b.addEventListener('click', () => courseForm(root, list.find((x) => x.id === b.dataset.edit))));
  $$('[data-lessons]', root).forEach((b) => b.addEventListener('click', () => lessonsView(root, list.find((x) => x.id === b.dataset.lessons))));
}

function courseForm(root, x) {
  x = x || { is_published: false, allow_installments: true, sort_order: 100 };
  dialog(`
    <h2 style="font-size:24px">${x.id ? 'แก้ไขคอร์ส' : 'เพิ่มคอร์ส'}</h2>
    <div class="field"><label for="cTitle">ชื่อคอร์ส</label><input class="input" id="cTitle" value="${esc(x.title)}"></div>
    <div class="form-grid">
      <div class="field"><label for="cSubject">วิชา</label><input class="input" id="cSubject" value="${esc(x.subject)}" placeholder="คณิต / เคมี / ชีวะ / อังกฤษ"></div>
      <div class="field"><label for="cLevel">ระดับ (ใช้เป็นตัวกรองหน้าแรก)</label><input class="input" id="cLevel" value="${esc(x.level)}" list="levels" placeholder="ม.ปลาย"><datalist id="levels"><option>ประถม</option><option>ม.ต้น</option><option>ม.ปลาย</option><option>สอบเข้ามหาลัย</option><option>มหาวิทยาลัย</option><option>นานาชาติ</option></datalist></div>
      <div class="field"><label for="cPrice">ราคา (บาท) เว้นว่าง = สอบถามราคา</label><input class="input" id="cPrice" type="number" min="0" step="1" value="${x.price ?? ''}"></div>
      <div class="field"><label for="cSort">ลำดับการแสดง (น้อยขึ้นก่อน)</label><input class="input" id="cSort" type="number" value="${x.sort_order ?? 100}"></div>
    </div>
    <div class="field"><label for="cShort">คำอธิบายสั้น (บนการ์ด)</label><input class="input" id="cShort" value="${esc(x.short_desc)}"></div>
    <div class="field"><label for="cDesc">รายละเอียดคอร์ส</label><textarea class="input" id="cDesc" rows="5">${esc(x.description)}</textarea></div>
    <div class="field"><label for="cSchedule">รอบเรียน / ตารางเรียน / สถานที่</label><textarea class="input" id="cSchedule" rows="3">${esc(x.schedule)}</textarea></div>
    <div class="field"><label for="cCover">รูปปกคอร์ส (ไม่บังคับ)</label><input class="input" id="cCover" type="file" accept="image/*">${x.cover_url ? `<img src="${esc(x.cover_url)}" alt="" style="max-width:200px;border-radius:12px">` : ''}</div>
    <label class="check-row"><input type="checkbox" id="cInst" ${x.allow_installments ? 'checked' : ''}> ให้แบ่งจ่าย 3 งวด (40/30/30)</label>
    <label class="check-row"><input type="checkbox" id="cPub" ${x.is_published ? 'checked' : ''}> แสดงบนเว็บไซต์</label>
    <div id="cMsg" class="hidden" role="status"></div>
    <div class="row between">
      <div class="row"><button class="btn btn-brand" id="cSave">บันทึก</button><button class="btn btn-ghost" id="cCancel">ยกเลิก</button></div>
      ${x.id ? '<button class="btn btn-danger btn-sm" id="cDel">ลบคอร์ส</button>' : ''}
    </div>`, (d) => {
    $('#cCancel', d).addEventListener('click', () => d.close());
    $('#cSave', d).addEventListener('click', async (e) => {
      if (!val('cTitle')) return notice($('#cMsg', d), 'bad', 'กรุณาใส่ชื่อคอร์ส');
      e.target.disabled = true;
      try {
        const row = {
          title: val('cTitle'), subject: val('cSubject') || null, level: val('cLevel') || null,
          price: numOrNull(val('cPrice')), sort_order: Number(val('cSort') || 100),
          short_desc: val('cShort') || null, description: val('cDesc') || null, schedule: val('cSchedule') || null,
          allow_installments: $('#cInst', d).checked, is_published: $('#cPub', d).checked,
        };
        const file = $('#cCover', d).files[0];
        if (file) row.cover_url = await uploadMedia(file, 'covers');
        const res = x.id
          ? await c.from('courses').update(row).eq('id', x.id)
          : await c.from('courses').insert({ ...row, slug: slugify(row.title) });
        if (res.error) throw res.error;
        d.close(); courses(root);
      } catch (err) { notice($('#cMsg', d), 'bad', err.message); e.target.disabled = false; }
    });
    $('#cDel', d)?.addEventListener('click', async () => {
      if (!confirm(`ลบคอร์ส "${x.title}" พร้อมบทเรียนทั้งหมด? กู้คืนไม่ได้`)) return;
      const { error } = await c.from('courses').delete().eq('id', x.id);
      if (error) return notice($('#cMsg', d), 'bad', error.message);
      d.close(); courses(root);
    });
  });
}

async function lessonsView(root, course) {
  root.innerHTML = '<div class="spinner"></div>';
  const { data: ls } = await c.from('lessons').select('*').eq('course_id', course.id).order('sort_order');
  const ids = (ls || []).map((l) => l.id);
  const { data: qs } = ids.length ? await c.from('quiz_questions').select('lesson_id').in('lesson_id', ids) : { data: [] };
  const qn = {};
  (qs || []).forEach((q) => { qn[q.lesson_id] = (qn[q.lesson_id] || 0) + 1; });
  root.innerHTML = `
    <button class="link" id="backC">← คอร์สทั้งหมด</button>
    <div class="row between" style="margin:12px 0 16px"><h2 style="font-size:24px">${esc(course.title)}</h2><button class="btn btn-brand" id="newL">+ เพิ่มบทเรียน</button></div>
    ${ls?.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>บทเรียน</th><th>ดูฟรี</th><th>แบบทดสอบ</th></tr></thead><tbody>
      ${ls.map((l, i) => `<tr><td>${i + 1}</td><td><button class="link" data-l="${l.id}">${esc(l.title)}</button></td><td>${l.is_preview ? 'ใช่' : ''}</td><td><button class="link" data-q="${l.id}">${qn[l.id] || 0} ข้อ · แก้ไข</button></td></tr>`).join('')}
    </tbody></table></div>` : '<div class="empty">ยังไม่มีบทเรียน กด "+ เพิ่มบทเรียน"</div>'}
    <p class="small muted" style="margin-top:12px">วิดีโอ: อัปโหลดขึ้น YouTube แบบ <b>ไม่เป็นสาธารณะ (Unlisted)</b> แล้ววางลิงก์ หรือใช้ลิงก์ Google Drive ที่ตั้งค่า "ทุกคนที่มีลิงก์ดูได้"</p>`;
  $('#backC').addEventListener('click', () => courses(root));
  $('#newL').addEventListener('click', () => lessonForm(root, course, null, (ls?.length || 0) + 1));
  $$('[data-l]', root).forEach((b) => b.addEventListener('click', () => lessonForm(root, course, ls.find((l) => l.id === b.dataset.l))));
  $$('[data-q]', root).forEach((b) => b.addEventListener('click', () => quizEditor(root, course, ls.find((l) => l.id === b.dataset.q))));
}

async function lessonForm(root, course, l, nextOrder) {
  let content = {};
  if (l) ({ data: content } = await c.from('lesson_content').select('*').eq('lesson_id', l.id).maybeSingle());
  content = content || {};
  l = l || { sort_order: nextOrder, is_preview: false };
  dialog(`
    <h2 style="font-size:24px">${l.id ? 'แก้ไขบทเรียน' : 'เพิ่มบทเรียน'}</h2>
    <div class="form-grid">
      <div class="field" style="grid-column:1/-1"><label for="lTitle">ชื่อบทเรียน</label><input class="input" id="lTitle" value="${esc(l.title)}"></div>
      <div class="field"><label for="lOrder">ลำดับ</label><input class="input" id="lOrder" type="number" value="${l.sort_order}"></div>
    </div>
    <div class="field"><label for="lVideo">ลิงก์วิดีโอ (YouTube Unlisted หรือ Google Drive)</label><input class="input" id="lVideo" value="${esc(content.video_url)}" placeholder="https://youtu.be/..."></div>
    <div class="field"><label for="lNotes">สรุปเนื้อหา / คำอธิบาย</label><textarea class="input" id="lNotes" rows="6">${esc(content.notes)}</textarea></div>
    <div class="field"><label for="lFile">ลิงก์ชีท/เอกสาร (เช่น Google Drive PDF)</label><input class="input" id="lFile" value="${esc(content.attachment_url)}"></div>
    <label class="check-row"><input type="checkbox" id="lPrev" ${l.is_preview ? 'checked' : ''}> ให้คนทั่วไปดูฟรี (บทตัวอย่าง)</label>
    <div id="lMsg" class="hidden" role="status"></div>
    <div class="row between">
      <div class="row"><button class="btn btn-brand" id="lSave">บันทึก</button><button class="btn btn-ghost" id="lCancel">ยกเลิก</button></div>
      ${l.id ? '<button class="btn btn-danger btn-sm" id="lDel">ลบบทเรียน</button>' : ''}
    </div>`, (d) => {
    $('#lCancel', d).addEventListener('click', () => d.close());
    $('#lSave', d).addEventListener('click', async (e) => {
      if (!val('lTitle')) return notice($('#lMsg', d), 'bad', 'กรุณาใส่ชื่อบทเรียน');
      const video = val('lVideo');
      if (video && !youtubeId(video) && !/drive\.google\.com/.test(video)) return notice($('#lMsg', d), 'bad', 'ลิงก์วิดีโอต้องเป็น YouTube หรือ Google Drive');
      e.target.disabled = true;
      try {
        const row = { course_id: course.id, title: val('lTitle'), sort_order: Number(val('lOrder') || 0), is_preview: $('#lPrev', d).checked };
        let id = l.id;
        if (id) { const r = await c.from('lessons').update(row).eq('id', id); if (r.error) throw r.error; }
        else { const r = await c.from('lessons').insert(row).select('id').single(); if (r.error) throw r.error; id = r.data.id; }
        const r2 = await c.from('lesson_content').upsert({ lesson_id: id, video_url: video || null, notes: val('lNotes') || null, attachment_url: val('lFile') || null });
        if (r2.error) throw r2.error;
        d.close(); lessonsView(root, course);
      } catch (err) { notice($('#lMsg', d), 'bad', err.message); e.target.disabled = false; }
    });
    $('#lDel', d)?.addEventListener('click', async () => {
      if (!confirm('ลบบทเรียนนี้และแบบทดสอบของบทนี้?')) return;
      const { error } = await c.from('lessons').delete().eq('id', l.id);
      if (error) return notice($('#lMsg', d), 'bad', error.message);
      d.close(); lessonsView(root, course);
    });
  });
}

async function quizEditor(root, course, lesson) {
  const { data: qs } = await c.from('quiz_questions').select('*').eq('lesson_id', lesson.id).order('sort_order');
  const block = (q = {}, i = 0) => `
    <fieldset class="quiz-q" style="border:1px solid var(--line)" data-row>
      <legend class="small" style="font-weight:600">ข้อ ${i + 1}</legend>
      <div class="field"><label>คำถาม</label><textarea class="input" data-k="question" rows="2">${esc(q.question)}</textarea></div>
      <div class="field"><label>ตัวเลือก (บรรทัดละ 1 ตัวเลือก)</label><textarea class="input" data-k="choices" rows="4">${esc((q.choices || []).join('\n'))}</textarea></div>
      <div class="form-grid">
        <div class="field"><label>ข้อที่ถูก (เลขบรรทัด เริ่มที่ 1)</label><input class="input" data-k="answer" type="number" min="1" value="${(q.answer_index ?? 0) + 1}"></div>
      </div>
      <div class="field"><label>เฉลย/คำอธิบาย</label><textarea class="input" data-k="explanation" rows="2">${esc(q.explanation)}</textarea></div>
      <button type="button" class="btn btn-danger btn-sm" data-rm style="align-self:flex-start">ลบข้อนี้</button>
    </fieldset>`;
  dialog(`
    <h2 style="font-size:24px">แบบทดสอบ: ${esc(lesson.title)}</h2>
    <div class="stack" id="qList">${(qs || []).map(block).join('')}</div>
    <button class="btn btn-ghost" id="qAdd" type="button">+ เพิ่มข้อ</button>
    <div id="qMsg" class="hidden" role="status"></div>
    <div class="row"><button class="btn btn-brand" id="qSave">บันทึกทั้งหมด</button><button class="btn btn-ghost" id="qCancel">ยกเลิก</button></div>`, (d) => {
    const list = $('#qList', d);
    const renumber = () => $$('[data-row] legend', list).forEach((lg, i) => { lg.textContent = `ข้อ ${i + 1}`; });
    list.addEventListener('click', (e) => { if (e.target.matches('[data-rm]')) { e.target.closest('[data-row]').remove(); renumber(); } });
    $('#qAdd', d).addEventListener('click', () => { list.insertAdjacentHTML('beforeend', block({}, $$('[data-row]', list).length)); });
    if (!qs?.length) $('#qAdd', d).click();
    $('#qCancel', d).addEventListener('click', () => d.close());
    $('#qSave', d).addEventListener('click', async (e) => {
      const rows = [];
      for (const [i, fs] of $$('[data-row]', list).entries()) {
        const get = (k) => $(`[data-k="${k}"]`, fs).value.trim();
        const choices = get('choices').split('\n').map((s) => s.trim()).filter(Boolean);
        if (!get('question') && !choices.length) continue;
        const ans = Number(get('answer')) - 1;
        if (!get('question') || choices.length < 2) return notice($('#qMsg', d), 'bad', `ข้อ ${i + 1}: ต้องมีคำถามและตัวเลือกอย่างน้อย 2 ตัว`);
        if (!(ans >= 0 && ans < choices.length)) return notice($('#qMsg', d), 'bad', `ข้อ ${i + 1}: เลขข้อที่ถูกต้องอยู่ระหว่าง 1–${choices.length}`);
        rows.push({ lesson_id: lesson.id, question: get('question'), choices, answer_index: ans, explanation: get('explanation') || null, sort_order: i });
      }
      e.target.disabled = true;
      const del = await c.from('quiz_questions').delete().eq('lesson_id', lesson.id);
      if (del.error) { e.target.disabled = false; return notice($('#qMsg', d), 'bad', del.error.message); }
      if (rows.length) {
        const ins = await c.from('quiz_questions').insert(rows);
        if (ins.error) { e.target.disabled = false; return notice($('#qMsg', d), 'bad', ins.error.message); }
      }
      d.close(); lessonsView(root, course);
    });
  });
}

// ---------- students ----------
async function students(root) {
  root.innerHTML = '<div class="spinner"></div>';
  const [{ data: profs }, { data: ens }, { data: cs }, { data: prog }] = await Promise.all([
    c.from('profiles').select('*').order('created_at', { ascending: false }),
    c.from('enrollments').select('id,user_id,course_id,status,courses(title)'),
    c.from('courses').select('id,title').order('sort_order'),
    c.from('lesson_progress').select('user_id'),
  ]);
  const done = {};
  (prog || []).forEach((p) => { done[p.user_id] = (done[p.user_id] || 0) + 1; });
  root.innerHTML = `
    <div class="row between" style="margin-bottom:16px"><input class="input" id="sFind" placeholder="ค้นหาชื่อ / โรงเรียน / เบอร์" style="max-width:320px"><span class="small muted">${(profs || []).length} คน</span></div>
    <div class="table-wrap"><table class="table"><thead><tr><th>นักเรียน</th><th>ติดต่อ</th><th>คอร์สที่เรียน</th><th>บทที่เรียนแล้ว</th><th></th></tr></thead>
    <tbody id="sBody">${(profs || []).map((p) => {
      const mine = (ens || []).filter((e) => e.user_id === p.id);
      return `<tr data-search="${esc([p.full_name, p.school, p.phone, p.grade, p.parent_name].join(' ').toLowerCase())}">
        <td><b>${esc(p.full_name || '—')}</b>${p.role === 'admin' ? ' <span class="tag">แอดมิน</span>' : ''}<div class="tiny muted">${esc(p.grade || '')} ${esc(p.school || '')}</div><div class="tiny muted">สมัคร ${fmtDate(p.created_at)}</div></td>
        <td class="small">${esc(p.phone || '')}${p.line_id ? `<div>LINE: ${esc(p.line_id)}</div>` : ''}${p.parent_name || p.parent_phone ? `<div class="muted">ผปค. ${esc(p.parent_name || '')} ${esc(p.parent_phone || '')}</div>` : ''}</td>
        <td class="small">${mine.map((e) => `<div>${esc(e.courses?.title || '')} <button class="link tiny" data-revoke="${e.id}">ถอนสิทธิ์</button></div>`).join('') || '<span class="muted">—</span>'}</td>
        <td>${done[p.id] || 0}</td>
        <td><button class="btn btn-ghost btn-sm" data-grant="${p.id}" data-name="${esc(p.full_name || '')}">+ เพิ่มคอร์ส</button></td>
      </tr>`;
    }).join('')}</tbody></table></div>
    <p class="small muted" style="margin-top:12px">"+ เพิ่มคอร์ส" ใช้เปิดคอร์สให้นักเรียนที่จ่ายเงินสด/โอนนอกระบบ</p>`;
  $('#sFind').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    $$('#sBody tr').forEach((tr) => tr.classList.toggle('hidden', q && !tr.dataset.search.includes(q)));
  });
  $$('[data-revoke]', root).forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('ถอนสิทธิ์เข้าเรียนคอร์สนี้?')) return;
    const { error } = await c.from('enrollments').delete().eq('id', b.dataset.revoke);
    if (error) return alert(error.message);
    students(root);
  }));
  $$('[data-grant]', root).forEach((b) => b.addEventListener('click', () => dialog(`
    <h2 style="font-size:22px">เปิดคอร์สให้ ${esc(b.dataset.name)}</h2>
    <div class="field"><label for="gCourse">คอร์ส</label><select class="input" id="gCourse">${(cs || []).map((x) => `<option value="${x.id}">${esc(x.title)}</option>`).join('')}</select></div>
    <div class="row"><button class="btn btn-brand" id="gOk">เปิดคอร์ส</button><button class="btn btn-ghost" id="gNo">ยกเลิก</button></div>`, (d) => {
    $('#gNo', d).addEventListener('click', () => d.close());
    $('#gOk', d).addEventListener('click', async () => {
      const { error } = await c.from('enrollments').upsert({ user_id: b.dataset.grant, course_id: $('#gCourse', d).value, status: 'active' }, { onConflict: 'user_id,course_id' });
      if (error) return alert(error.message);
      d.close(); students(root);
    });
  })));
}

// ---------- coupons ----------
async function coupons(root) {
  root.innerHTML = '<div class="spinner"></div>';
  const [{ data: list }, { data: cs }] = await Promise.all([
    c.from('coupons').select('*, courses(title)').order('created_at', { ascending: false }),
    c.from('courses').select('id,title').order('sort_order'),
  ]);
  root.innerHTML = `
    <form class="card stack" id="kForm" style="margin-bottom:24px">
      <h2 style="font-size:20px">สร้างโค้ดส่วนลด</h2>
      <div class="form-grid">
        <div class="field"><label for="kCode">โค้ด</label><input class="input" id="kCode" placeholder="FOUNDER10" style="text-transform:uppercase"></div>
        <div class="field"><label for="kPct">ลด (%)</label><input class="input" id="kPct" type="number" min="0" max="100" placeholder="10"></div>
        <div class="field"><label for="kAmt">หรือ ลด (บาท)</label><input class="input" id="kAmt" type="number" min="0" placeholder="0"></div>
        <div class="field"><label for="kMax">ใช้ได้กี่ครั้ง (ว่าง = ไม่จำกัด)</label><input class="input" id="kMax" type="number" min="1"></div>
        <div class="field"><label for="kExp">หมดอายุ (ไม่บังคับ)</label><input class="input" id="kExp" type="date"></div>
        <div class="field"><label for="kCourse">ใช้กับคอร์ส</label><select class="input" id="kCourse"><option value="">ทุกคอร์ส</option>${(cs || []).map((x) => `<option value="${x.id}">${esc(x.title)}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label for="kDesc">หมายเหตุ (เห็นเฉพาะครู)</label><input class="input" id="kDesc" placeholder="เช่น ส่วนลดรุ่นก่อตั้ง / ชวนเพื่อน"></div>
      <div id="kMsg" class="hidden" role="status"></div>
      <button class="btn btn-brand" type="submit" style="align-self:flex-start">สร้างโค้ด</button>
    </form>
    ${list?.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>โค้ด</th><th>ส่วนลด</th><th>ใช้แล้ว</th><th>เงื่อนไข</th><th>สถานะ</th><th></th></tr></thead><tbody>
      ${list.map((k) => `<tr>
        <td><b>${esc(k.code)}</b><div class="tiny muted">${esc(k.description || '')}</div></td>
        <td>${Number(k.percent_off) ? `${Number(k.percent_off)}%` : ''}${Number(k.amount_off) ? ` ${baht(k.amount_off)}` : ''}</td>
        <td>${k.used_count}${k.max_uses ? ` / ${k.max_uses}` : ''}</td>
        <td class="small">${k.courses?.title ? esc(k.courses.title) : 'ทุกคอร์ส'}${k.expires_at ? `<div class="muted">ถึง ${fmtDate(k.expires_at)}</div>` : ''}</td>
        <td><button class="link" data-toggle="${esc(k.code)}" data-on="${k.active}">${k.active ? 'เปิดใช้ (กดเพื่อปิด)' : 'ปิดอยู่ (กดเพื่อเปิด)'}</button></td>
        <td><button class="btn btn-danger btn-sm" data-del="${esc(k.code)}">ลบ</button></td>
      </tr>`).join('')}</tbody></table></div>` : ''}`;
  $('#kForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = val('kCode').toUpperCase().replace(/\s+/g, '');
    if (!code) return notice($('#kMsg'), 'bad', 'กรุณาใส่โค้ด');
    if (!Number(val('kPct')) && !Number(val('kAmt'))) return notice($('#kMsg'), 'bad', 'กรุณาใส่ส่วนลดเป็น % หรือบาท');
    const { error } = await c.from('coupons').insert({
      code, percent_off: Number(val('kPct') || 0), amount_off: Number(val('kAmt') || 0),
      max_uses: numOrNull(val('kMax')), expires_at: val('kExp') ? `${val('kExp')}T23:59:59+07:00` : null,
      course_id: val('kCourse') || null, description: val('kDesc') || null,
    });
    if (error) return notice($('#kMsg'), 'bad', error.code === '23505' ? 'มีโค้ดนี้อยู่แล้ว' : error.message);
    coupons(root);
  });
  $$('[data-toggle]', root).forEach((b) => b.addEventListener('click', async () => {
    await c.from('coupons').update({ active: b.dataset.on !== 'true' }).eq('code', b.dataset.toggle);
    coupons(root);
  }));
  $$('[data-del]', root).forEach((b) => b.addEventListener('click', async () => {
    if (!confirm(`ลบโค้ด ${b.dataset.del}?`)) return;
    await c.from('coupons').delete().eq('code', b.dataset.del);
    coupons(root);
  }));
}

// ---------- settings ----------
async function settingsTab(root) {
  const { data } = await c.from('site_settings').select('key,value');
  const s = Object.fromEntries((data || []).map((r) => [r.key, r.value || '']));
  const fields = [
    ['promptpay_id', 'เลขพร้อมเพย์ (เบอร์มือถือ หรือเลขบัตรประชาชน 13 หลัก)', 'ใช้สร้าง QR รับเงิน'],
    ['promptpay_name', 'ชื่อบัญชีที่แสดงใต้ QR', ''],
    ['line_id', 'LINE ID (เช่น @aclass หรือ ไอดีส่วนตัว)', ''],
    ['line_url', 'ลิงก์ LINE (ไม่บังคับ ถ้ามีลิงก์จาก LINE OA ให้ใส่ตรงนี้)', 'https://lin.ee/...'],
    ['phone', 'เบอร์โทร', ''],
    ['address', 'ที่อยู่สถาบัน', ''],
    ['facebook_url', 'ลิงก์เพจ Facebook', 'https://facebook.com/...'],
  ];
  root.innerHTML = `
    <form class="card stack" id="setForm">
      <div class="form-grid">${fields.map(([k, label, ph]) => `<div class="field"><label for="s_${k}">${label}</label><input class="input" id="s_${k}" value="${esc(s[k])}" placeholder="${esc(ph)}"></div>`).join('')}</div>
      <div class="field"><label for="tPhoto">รูปครู (หน้าแรก)</label><input class="input" id="tPhoto" type="file" accept="image/*">${s.teacher_photo_url ? `<img src="${esc(s.teacher_photo_url)}" alt="รูปครูปัจจุบัน" style="max-width:160px;border-radius:16px">` : ''}</div>
      <div id="setMsg" class="hidden" role="status"></div>
      <button class="btn btn-brand" type="submit" style="align-self:flex-start">บันทึกการตั้งค่า</button>
    </form>`;
  $('#setForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    e.submitter.disabled = true;
    try {
      const rows = fields.map(([k]) => ({ key: k, value: val(`s_${k}`) }));
      const f = $('#tPhoto').files[0];
      if (f) rows.push({ key: 'teacher_photo_url', value: await uploadMedia(f, 'site') });
      const { error } = await c.from('site_settings').upsert(rows);
      if (error) throw error;
      notice($('#setMsg'), 'ok', 'บันทึกแล้ว หน้าเว็บจะใช้ข้อมูลใหม่ทันที');
    } catch (err) { notice($('#setMsg'), 'bad', err.message); }
    e.submitter.disabled = false;
  });
}

const RENDER = { payments, courses, students, coupons, settings: settingsTab };

(async () => {
  await initLayout();
  await requireLogin();
  const profile = await currentProfile();
  if (profile?.role !== 'admin') {
    app.innerHTML = '<div class="empty">หน้านี้สำหรับครูเท่านั้น</div>';
    return;
  }
  c = await sb();
  const { count } = await c.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'pending');
  app.innerHTML = `
    <div class="page-head"><div><div class="eyebrow">หลังบ้าน</div><h1>จัดการ A-Class Academy</h1></div></div>
    <div class="tabs" role="tablist">${TABS.map(([k, label]) => `<button class="tab" role="tab" data-tab="${k}" aria-selected="false">${label}${k === 'payments' && count ? ` <span class="badge pending">${count}</span>` : ''}</button>`).join('')}</div>
    <div id="panel" role="tabpanel"></div>`;
  const open = (k) => {
    $$('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === k)));
    try { history.replaceState(null, '', `#${k}`); } catch { /* ignore */ }
    RENDER[k]($('#panel'));
  };
  $$('[data-tab]').forEach((b) => b.addEventListener('click', () => open(b.dataset.tab)));
  const start = location.hash.slice(1);
  open(RENDER[start] ? start : 'payments');
})();
