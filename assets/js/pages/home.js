import { initLayout, sb, esc, t, priceLabel, lineLink, $ } from '../core.js';

// Shown only if the database can't be reached, so the page is never empty
const FALLBACK = [
  { slug: 'math-m2-break', subject: 'คณิต', level: 'ม.ต้น', title: 'คณิต ม.2 ทวนเทอม 1 + ขึ้นเทอม 2', short_desc: 'ปูพื้นเรื่องที่ต้องใช้ต่อ แล้วเริ่มเนื้อหาใหม่ก่อนเปิดเทอม พร้อมแบบทดสอบวัดพื้นฐานก่อนเรียน' },
  { slug: 'chem-m4-break', subject: 'เคมี', level: 'ม.ปลาย', title: 'เคมี ม.4 ทวน + ขึ้นเนื้อหาใหม่', short_desc: 'เข้าใจหลักการ ไม่ท่องจำ ทวนบทสำคัญของเทอม 1 แล้วต่อเทอม 2 อย่างมั่นใจ' },
  { slug: 'calculus-m6', subject: 'คณิต', level: 'ม.ปลาย', title: 'แคลคูลัส ม.6', short_desc: 'จากเข้าใจไปถึงทำโจทย์ได้จริง ใช้ทั้งสอบเข้ามหาวิทยาลัยและเรียนต่อปี 1' },
  { slug: 'chem-m5-acid-base', subject: 'เคมี', level: 'ม.ปลาย', title: 'เคมี ม.5 กรด-เบส', short_desc: 'มีแบบทดสอบพื้นฐานก่อนเรียน ถ้าพื้นยังไม่แน่น ครูแนะนำคอร์สปูพื้นให้ก่อน' },
  { slug: 'bio-m4-review', subject: 'ชีวะ', level: 'ม.ปลาย', title: 'ชีวะ ม.4 ทวนเนื้อหา', short_desc: 'สรุปภาพรวมให้เห็นความเชื่อมโยง จำง่าย นำไปใช้ทำข้อสอบได้' },
  { slug: 'math-primary', subject: 'คณิต', level: 'ประถม', title: 'คณิตประถม', short_desc: 'เสริมพื้นฐานให้แน่นตามระดับชั้นของน้อง ดูแลในกลุ่มเล็ก' },
  { slug: 'alevel-chem', subject: 'เคมี', level: 'สอบเข้ามหาลัย', title: 'A-Level เคมี', short_desc: 'ตะลุยโจทย์แนวข้อสอบจริง พร้อมเทคนิคทำข้อสอบให้ทันเวลา' },
  { slug: 'tgat1-english', subject: 'อังกฤษ', level: 'สอบเข้ามหาลัย', title: 'TGAT1 อังกฤษ', short_desc: 'ฝึกทักษะการสื่อสารภาษาอังกฤษตามแนวข้อสอบ TGAT' },
];
const LEVEL_ORDER = ['ประถม', 'ม.ต้น', 'ม.ปลาย', 'สอบเข้ามหาลัย'];

let courses = [];
let level = 'all';

function card(c) {
  return `
  <a class="card course-card" href="/course.html?slug=${encodeURIComponent(c.slug)}">
    <div class="row between"><span class="tag">${esc(c.subject)}</span><span class="tiny muted">${esc(c.level)}</span></div>
    <h3>${esc(c.title)}</h3>
    <p class="desc">${esc(c.short_desc)}</p>
    <div class="foot"><span class="price">${priceLabel(c)}</span><span class="link">${t('courses.more')} →</span></div>
  </a>`;
}

function render() {
  const levels = ['all', ...LEVEL_ORDER.filter((l) => courses.some((c) => c.level === l)),
    ...[...new Set(courses.map((c) => c.level).filter((l) => l && !LEVEL_ORDER.includes(l)))]];
  $('#levelFilters').innerHTML = levels.map((l) =>
    `<button type="button" class="filter" data-level="${esc(l)}" aria-pressed="${l === level}">${l === 'all' ? t('courses.all') : esc(l)}</button>`).join('');
  const list = level === 'all' ? courses : courses.filter((c) => c.level === level);
  $('#courseGrid').innerHTML = list.length ? list.map(card).join('') : `<div class="empty">${t('courses.empty')}</div>`;
}

async function loadCourses() {
  try {
    const c = await sb();
    if (!c) return FALLBACK;
    const { data, error } = await c.from('courses')
      .select('slug,title,subject,level,short_desc,price').eq('is_published', true).order('sort_order');
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('Using built-in course list:', e.message);
    return FALLBACK;
  }
}

(async () => {
  const { settings } = await initLayout();
  if (settings.teacher_photo_url) {
    $('#teacherPhoto').innerHTML = `<img src="${esc(settings.teacher_photo_url)}" alt="${esc(t('teacher.name'))}">`;
  }
  const lineHref = lineLink(settings);
  if (lineHref) { const a = $('#heroLine'); a.href = lineHref; a.target = '_blank'; a.rel = 'noopener'; }

  $('#levelFilters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-level]');
    if (!b) return;
    level = b.dataset.level;
    render();
  });
  courses = await loadCourses();
  render();
})();
