import { initLayout, sb, esc, priceLabel, param, $, currentUser, baht, lineLink } from '../core.js';

const app = $('#app');

const lineHref = (s) => lineLink(s, '/#contact');

(async () => {
  const { settings } = await initLayout();
  const slug = param('slug');
  const c = await sb();
  if (!c || !slug) { app.innerHTML = `<div class="empty">ไม่พบคอร์สนี้ <a class="link" href="/#courses">กลับไปดูคอร์สทั้งหมด</a></div>`; return; }

  const { data: course } = await c.from('courses').select('*').eq('slug', slug).maybeSingle();
  if (!course) { app.innerHTML = `<div class="empty">ไม่พบคอร์สนี้ <a class="link" href="/#courses">กลับไปดูคอร์สทั้งหมด</a></div>`; return; }
  document.title = `${course.title} | A-Class Academy`;

  const [{ data: lessons }, user] = await Promise.all([
    c.from('lessons').select('id,title,is_preview,sort_order').eq('course_id', course.id).order('sort_order'),
    currentUser(),
  ]);
  let enrolled = false;
  let pending = false;
  if (user) {
    const [{ data: en }, { data: pays }] = await Promise.all([
      c.from('enrollments').select('status').eq('course_id', course.id).eq('user_id', user.id).maybeSingle(),
      c.from('payments').select('status').eq('course_id', course.id).eq('user_id', user.id).eq('status', 'pending'),
    ]);
    enrolled = en?.status === 'active';
    pending = (pays || []).length > 0;
  }

  let action;
  if (enrolled) {
    action = `<a class="btn btn-brand" href="/learn?course=${encodeURIComponent(course.slug)}">เข้าห้องเรียน</a>`;
  } else if (pending) {
    action = `<div class="notice warn">ได้รับสลิปแล้ว รอครูตรวจสอบ ปกติไม่เกิน 24 ชั่วโมง</div><a class="link" href="/my">ดูสถานะในห้องเรียนของฉัน →</a>`;
  } else if (course.price) {
    action = `<a class="btn btn-brand" href="/checkout?course=${encodeURIComponent(course.slug)}">สมัครเรียนคอร์สนี้</a>
      ${course.allow_installments ? `<p class="small muted">แบ่งจ่ายได้ 3 งวด (40% / 30% / 30%) งวดแรก ${baht(Math.round(course.price * 0.4))}</p>` : ''}`;
  } else {
    action = `<a class="btn btn-accent" href="${esc(lineHref(settings))}" target="_blank" rel="noopener">ทักไลน์สอบถามราคาและรอบเรียน</a>`;
  }

  const lessonItems = (lessons || []).map((l, i) => {
    const open = enrolled || l.is_preview;
    const label = `${i + 1}. ${esc(l.title)}`;
    return `<li>${open
      ? `<a href="/learn?course=${encodeURIComponent(course.slug)}&lesson=${l.id}">${label}${l.is_preview && !enrolled ? ' <span class="tag">ดูฟรี</span>' : ''}</a>`
      : `<span class="locked"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>${label}</span>`}</li>`;
  }).join('');

  app.innerHTML = `
  <nav class="small muted" style="margin-bottom:16px"><a href="/#courses" class="link">← คอร์สทั้งหมด</a></nav>
  <div class="learn">
    <div class="learn-main">
      ${course.cover_url ? `<img src="${esc(course.cover_url)}" alt="" style="border-radius:20px;aspect-ratio:16/9;object-fit:cover;width:100%">` : ''}
      <div class="row"><span class="tag">${esc(course.subject)}</span><span class="small muted">${esc(course.level)}</span></div>
      <h1 class="h2">${esc(course.title)}</h1>
      <p class="muted" style="font-size:18px">${esc(course.short_desc)}</p>
      ${course.description ? `<div style="white-space:pre-line">${esc(course.description)}</div>` : ''}
      ${course.schedule ? `<div class="card"><b>รอบเรียน / ตารางเรียน</b><div style="white-space:pre-line" class="muted">${esc(course.schedule)}</div></div>` : ''}
      ${lessons?.length ? `<div class="stack" style="gap:8px"><h2 style="font-size:22px">บทเรียนในคอร์ส (${lessons.length} บท)</h2><ul class="lesson-list card" style="padding:12px">${lessonItems}</ul></div>` : ''}
    </div>
    <aside class="learn-side">
      <div class="card stack" style="position:sticky;top:96px">
        <div class="price" style="font-size:30px">${priceLabel(course)}</div>
        ${action}
        <hr style="border:0;border-top:1px solid var(--line);margin:4px 0">
        <a class="link small" href="${esc(lineHref(settings))}" target="_blank" rel="noopener">มีคำถาม? ทักไลน์ครูได้เลย</a>
      </div>
    </aside>
  </div>`;
})();
