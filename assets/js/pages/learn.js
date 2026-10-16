import { initLayout, sb, esc, param, $, $$, requireLogin, currentProfile, youtubeId, notice } from '../core.js';

const app = $('#app');

function driveId(url) {
  const m = String(url || '').match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([A-Za-z0-9_-]{20,})/);
  return m ? m[1] : '';
}
function videoEmbed(url, who) {
  const yt = youtubeId(url);
  const dr = driveId(url);
  let src = '';
  if (yt) src = `https://www.youtube-nocookie.com/embed/${yt}?rel=0&modestbranding=1&playsinline=1`;
  else if (dr) src = `https://drive.google.com/file/d/${dr}/preview`;
  if (!src) return '';
  return `
    <div class="video" oncontextmenu="return false">
      <iframe src="${src}" title="วิดีโอบทเรียน" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
      <div class="watermark" aria-hidden="true">${esc(who)}</div>
    </div>`;
}
const linkify = (text) => esc(text).replace(/(https?:\/\/[^\s<]+)/g, '<a class="link" href="$1" target="_blank" rel="noopener">$1</a>');

(async () => {
  await initLayout();
  const user = await requireLogin();
  const profile = await currentProfile();
  const c = await sb();
  const slug = param('course');

  const { data: course } = await c.from('courses').select('id,slug,title').eq('slug', slug).maybeSingle();
  if (!course) { app.innerHTML = '<div class="empty">ไม่พบคอร์สนี้</div>'; return; }

  const [{ data: lessons }, { data: en }, { data: prog }] = await Promise.all([
    c.from('lessons').select('id,title,is_preview,sort_order').eq('course_id', course.id).order('sort_order'),
    c.from('enrollments').select('status').eq('course_id', course.id).eq('user_id', user.id).maybeSingle(),
    c.from('lesson_progress').select('lesson_id').eq('user_id', user.id),
  ]);
  const isAdmin = profile?.role === 'admin';
  const enrolled = en?.status === 'active' || isAdmin;
  const done = new Set((prog || []).map((p) => p.lesson_id));
  const canOpen = (l) => enrolled || l.is_preview;

  if (!lessons?.length) {
    app.innerHTML = `<div class="empty">คอร์สนี้ยังไม่มีบทเรียนออนไลน์ ครูกำลังเตรียมเนื้อหาอยู่<br><a class="link" href="/my">← กลับห้องเรียนของฉัน</a></div>`;
    return;
  }
  let lesson = lessons.find((l) => l.id === param('lesson')) || lessons.find((l) => canOpen(l) && !done.has(l.id)) || lessons.find(canOpen);
  if (!lesson || !canOpen(lesson)) {
    app.innerHTML = `<div class="empty">บทเรียนนี้สำหรับนักเรียนที่ลงทะเบียนแล้ว<br><a class="btn btn-brand" style="margin-top:16px" href="/course?slug=${encodeURIComponent(course.slug)}">ดูรายละเอียดคอร์ส</a></div>`;
    return;
  }

  const [{ data: content }, { data: quiz }] = await Promise.all([
    c.from('lesson_content').select('*').eq('lesson_id', lesson.id).maybeSingle(),
    c.rpc('get_quiz', { p_lesson: lesson.id }),
  ]);

  const idx = lessons.findIndex((l) => l.id === lesson.id);
  const prev = lessons.slice(0, idx).reverse().find(canOpen);
  const next = lessons.slice(idx + 1).find(canOpen);
  const href = (l) => `/learn?course=${encodeURIComponent(course.slug)}&lesson=${l.id}`;

  const side = lessons.map((l, i) => `<li>${canOpen(l)
    ? `<a href="${href(l)}" ${l.id === lesson.id ? 'aria-current="page"' : ''}><span class="dot ${done.has(l.id) ? 'done' : ''}">${done.has(l.id) ? '✓' : ''}</span>${i + 1}. ${esc(l.title)}</a>`
    : `<span class="locked"><span class="dot"></span>${i + 1}. ${esc(l.title)}</span>`}</li>`).join('');

  const quizHtml = quiz?.length ? `
    <section class="card stack" id="quiz">
      <h2 style="font-size:22px">แบบทดสอบท้ายบท (${quiz.length} ข้อ)</h2>
      <form id="qf" class="stack">
        ${quiz.map((q, i) => `
          <fieldset class="quiz-q" style="border:0;margin:0" data-q="${q.id}">
            <legend style="font-weight:600;padding:0;margin-bottom:8px">${i + 1}. ${esc(q.question)}</legend>
            ${(q.choices || []).map((ch, j) => `
              <label class="choice" data-j="${j}"><input type="radio" name="q_${q.id}" value="${j}"><span>${esc(ch)}</span></label>`).join('')}
            <div class="small muted hidden" data-exp></div>
          </fieldset>`).join('')}
        <div id="qmsg" class="hidden" role="status"></div>
        <div class="row"><button class="btn btn-brand" type="submit">ส่งคำตอบ</button><button class="btn btn-ghost hidden" type="button" id="qretry">ทำใหม่</button></div>
      </form>
    </section>` : '';

  app.innerHTML = `
    <nav class="small" style="margin-bottom:16px"><a class="link" href="/my">← ห้องเรียนของฉัน</a> <span class="muted">/ ${esc(course.title)}</span></nav>
    <div class="learn">
      <div class="learn-main">
        <h1 style="font-size:clamp(24px,3vw,32px)">${esc(lesson.title)}</h1>
        ${videoEmbed(content?.video_url, profile?.full_name || user.email) || ''}
        ${content?.notes ? `<section class="card"><h2 style="font-size:20px;margin-bottom:8px">สรุปเนื้อหา</h2><div style="white-space:pre-line">${linkify(content.notes)}</div></section>` : ''}
        ${content?.attachment_url ? `<a class="btn btn-ghost" href="${esc(content.attachment_url)}" target="_blank" rel="noopener" style="align-self:flex-start">เปิดชีท / เอกสารประกอบ</a>` : ''}
        ${quizHtml}
        <div class="row between">
          <button class="btn ${done.has(lesson.id) ? 'btn-ghost' : 'btn-brand'}" id="doneBtn" ${enrolled ? '' : 'disabled title="สำหรับนักเรียนที่ลงทะเบียน"'}>${done.has(lesson.id) ? '✓ เรียนบทนี้แล้ว' : 'ทำเครื่องหมายว่าเรียนแล้ว'}</button>
          <div class="row">
            ${prev ? `<a class="btn btn-ghost btn-sm" href="${href(prev)}">← บทก่อนหน้า</a>` : ''}
            ${next ? `<a class="btn btn-brand btn-sm" href="${href(next)}">บทถัดไป →</a>` : ''}
          </div>
        </div>
      </div>
      <aside class="learn-side card"><b style="display:block;margin-bottom:8px">บทเรียน</b><ul class="lesson-list">${side}</ul></aside>
    </div>`;

  async function markDone(on) {
    if (!enrolled) return;
    const btn = $('#doneBtn');
    if (on) await c.from('lesson_progress').upsert({ user_id: user.id, lesson_id: lesson.id }, { onConflict: 'user_id,lesson_id', ignoreDuplicates: true });
    else await c.from('lesson_progress').delete().eq('user_id', user.id).eq('lesson_id', lesson.id);
    on ? done.add(lesson.id) : done.delete(lesson.id);
    btn.className = `btn ${on ? 'btn-ghost' : 'btn-brand'}`;
    btn.textContent = on ? '✓ เรียนบทนี้แล้ว' : 'ทำเครื่องหมายว่าเรียนแล้ว';
    const dot = $(`.lesson-list a[aria-current="page"] .dot`);
    if (dot) { dot.classList.toggle('done', on); dot.textContent = on ? '✓' : ''; }
  }
  $('#doneBtn').addEventListener('click', () => markDone(!done.has(lesson.id)));

  const qf = $('#qf');
  if (qf) {
    qf.addEventListener('submit', async (e) => {
      e.preventDefault();
      const answers = {};
      quiz.forEach((q) => { const v = qf.querySelector(`input[name="q_${q.id}"]:checked`); if (v) answers[q.id] = Number(v.value); });
      if (Object.keys(answers).length < quiz.length && !confirm('ยังตอบไม่ครบทุกข้อ ส่งเลยไหม?')) return;
      e.submitter.disabled = true;
      const { data, error } = await c.rpc('submit_quiz', { p_lesson: lesson.id, p_answers: answers });
      e.submitter.disabled = false;
      if (error) return notice($('#qmsg'), 'bad', `ส่งคำตอบไม่สำเร็จ: ${error.message}`);
      data.results.forEach((r) => {
        const fs = qf.querySelector(`[data-q="${r.id}"]`);
        if (!fs) return;
        $$('.choice', fs).forEach((lab) => {
          const j = Number(lab.dataset.j);
          lab.classList.toggle('correct', j === r.correct);
          lab.classList.toggle('wrong', j === r.chosen && r.chosen !== r.correct);
        });
        $$('input', fs).forEach((i) => { i.disabled = true; });
        const ex = $('[data-exp]', fs);
        if (r.explanation) { ex.textContent = `เฉลย: ${r.explanation}`; ex.classList.remove('hidden'); }
      });
      const pct = data.total ? data.score / data.total : 0;
      notice($('#qmsg'), pct >= 0.6 ? 'ok' : 'warn', `ได้ ${data.score}/${data.total} คะแนน${pct >= 0.6 ? ' เก่งมาก!' : ' ลองทบทวนแล้วทำใหม่อีกครั้งนะ'}`);
      e.submitter.classList.add('hidden');
      $('#qretry').classList.remove('hidden');
      if (pct >= 0.6 && !done.has(lesson.id)) markDone(true);
    });
    $('#qretry').addEventListener('click', () => location.reload());
  }
})();
