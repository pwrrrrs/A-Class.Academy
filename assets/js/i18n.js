// Two-language UI text. Course content itself is entered by the teacher and shown as-is.
const dict = {
  th: {
    'nav.courses': 'คอร์สเรียน', 'nav.online': 'เรียนออนไลน์', 'nav.teacher': 'ครูผู้สอน',
    'nav.login': 'เข้าสู่ระบบ', 'nav.my': 'ห้องเรียนของฉัน', 'nav.admin': 'หลังบ้าน', 'nav.logout': 'ออกจากระบบ',
    'price.ask': 'สอบถามราคา',

    'hero.pill': 'สถาบันกวดวิชาที่ลำพูน · เรียนออนไลน์ได้ทั่วประเทศ',
    'hero.title': 'เรียนกลุ่มเล็ก<br>เข้าใจจริง <em>คะแนนขึ้นจริง</em>',
    'hero.body': 'คณิต เคมี ชีวะ อังกฤษ ม.1–ม.6 ติวสอบเข้า ม.1 ม.4 และมหาวิทยาลัย ครูดูแลน้องทุกคนด้วยตัวเอง ตั้งแต่วัดพื้นฐานจนถึงวันสอบ',
    'hero.cta': 'ดูคอร์สทั้งหมด', 'hero.cta2': 'ทักไลน์ปรึกษาฟรี',
    'stat.1': 'ของนักเรียนกลับมาเรียนต่อ', 'stat.2n': '6 ปี', 'stat.2': 'ประสบการณ์สอนพิเศษ', 'stat.3n': 'กลุ่มเล็ก', 'stat.3': 'ครูดูแลรายคน',
    'mock.caption': 'ตัวอย่างหน้าของน้องในระบบ', 'mock.title': 'ความคืบหน้าของฉัน',
    'mock.r1': 'สมดุลเคมี', 'mock.r1v': 'ดูคลิปแล้ว 8/10', 'mock.r2': 'แบบทดสอบท้ายบท', 'mock.r2v': 'ผ่าน 3/4 ชุด', 'mock.r3': 'โจทย์ทบทวน', 'mock.r3v': 'ทำแล้ว 12/30 ข้อ',
    'mock.next': '<strong>แบบทดสอบถัดไป:</strong> สมดุลเคมี บทที่ 3<br><span class="muted">ครูสรุปผลส่งให้ผู้ปกครองทุกสัปดาห์</span>',

    'why.title': 'ทำไมผู้ปกครองถึงไว้ใจให้น้องเรียนกับเรา',
    'why.1t': 'วัดพื้นฐานก่อนเรียน', 'why.1b': 'รู้ว่าน้องติดตรงไหน ก่อนเลือกคอร์สที่ใช่ ไม่เสียเวลาเรียนซ้ำในสิ่งที่รู้แล้ว',
    'why.2t': 'กลุ่มเล็ก ดูแลรายคน', 'why.2b': 'ครูเห็นทุกคน ถามได้ทุกเรื่อง ไม่มีใครถูกทิ้งไว้ข้างหลัง',
    'why.3t': 'ทวนของเก่า ต่อของใหม่', 'why.3b': 'คอร์สปิดเทอมเชื่อมเนื้อหาเทอมเก่ากับเทอมใหม่ให้ต่อกันพอดี',
    'why.4t': 'ผู้ปกครองเห็นพัฒนาการ', 'why.4b': 'สรุปคะแนนและความคืบหน้าส่งให้ผู้ปกครองอย่างสม่ำเสมอ',

    'courses.eyebrow': 'คอร์สเปิดรับสมัคร', 'courses.title': 'คอร์สเรียน',
    'courses.all': 'ทั้งหมด', 'courses.more': 'ดูรายละเอียด',
    'courses.note': 'มีคอร์ส A-Level, TGAT, GED, IGCSE, IB และวิชาระดับมหาวิทยาลัย ทักไลน์สอบถามได้เลย',
    'courses.empty': 'ยังไม่มีคอร์สในระดับนี้ ทักไลน์สอบถามได้เลย',

    'online.eyebrow': 'เรียนออนไลน์', 'online.title': 'อยู่ไกลแค่ไหน ก็เรียนกับครูคนเดิมได้',
    'online.body': 'ดูคลิปทบทวนได้ทุกเวลา ทำแบบทดสอบท้ายบท และเห็นความคืบหน้าของตัวเองทุกสัปดาห์ นักเรียนที่ชลบุรีและกรุงเทพฯ ก็เรียนกับเราผ่านระบบนี้',
    'online.1t': 'คลิปบทเรียน', 'online.1b': 'ดูซ้ำได้ไม่จำกัด เฉพาะนักเรียนที่ลงทะเบียน',
    'online.2t': 'แบบทดสอบท้ายบท', 'online.2b': 'รู้ผลทันที พร้อมเฉลยละเอียด',
    'online.3t': 'ความคืบหน้ารายคน', 'online.3b': 'เห็นว่าเรียนถึงไหน จุดไหนต้องทวน',
    'online.4t': 'ชีทสรุปเนื้อหา', 'online.4b': 'สรุปจากครู เปิดอ่านทบทวนได้ในบทเรียน',

    'teacher.eyebrow': 'ครูผู้สอน', 'teacher.name': 'ครูพรรณธร วัฒนวิเชียร',
    'teacher.body': 'ศึกษาศาสตรบัณฑิต สาขาเคมี เกียรตินิยมอันดับ 1 สอนพิเศษที่ชลบุรีมา 6 ปี มีลูกศิษย์ที่เรียนด้วยกันตั้งแต่ ม.2 จนจบ ม.6 ก่อนย้ายมาเปิด A-Class Academy ที่ลำพูน เพื่อออกแบบหลักสูตรเองและดูแลน้องทุกคนด้วยตัวเอง',
    'teacher.c1': 'สอนคณิต เคมี ชีวะ อังกฤษ ตั้งแต่ ม.1 ถึงมหาวิทยาลัย',
    'teacher.c2': 'ติว A-Level, TGAT, TPAT และหลักสูตรนานาชาติ GED, IGCSE, IB',
    'teacher.c3': 'นักเรียนกลับมาเรียนต่อราว 80%',
    'teacher.photo': 'รูปครู',

    'enroll.title': 'สมัครเรียนง่ายๆ ใน 3 ขั้นตอน',
    'enroll.1t': 'เลือกคอร์ส', 'enroll.1b': 'สมัครสมาชิกฟรี แล้วเลือกคอร์สที่ต้องการ หรือทักไลน์ให้ครูช่วยแนะนำ',
    'enroll.2t': 'ชำระผ่าน PromptPay', 'enroll.2b': 'สแกน QR แล้วแนบสลิปในเว็บ แบ่งจ่ายได้ 3 งวด',
    'enroll.3t': 'เริ่มเรียนได้เลย', 'enroll.3b': 'ครูตรวจสลิปแล้วเปิดคอร์สให้ เข้าเรียนได้ทันทีจากห้องเรียนของฉัน',
    'enroll.note': 'ส่วนลด 10% สำหรับนักเรียนรุ่นก่อตั้ง และส่วนลดเมื่อชวนเพื่อนมาเรียนด้วยกัน',

    'footer.title': 'ไม่แน่ใจว่าน้องควรเริ่มคอร์สไหน?', 'footer.body': 'ทักมาเล่าเกรดและเป้าหมายของน้องได้เลย ครูจะแนะนำคอร์สที่เหมาะให้',
    'footer.line': 'ทักไลน์', 'footer.address': 'ที่ตั้ง', 'footer.phone': 'โทร', 'footer.fbOpen': 'เปิดเพจ',

    'auth.login': 'เข้าสู่ระบบ', 'auth.signup': 'สมัครสมาชิก', 'auth.email': 'อีเมล', 'auth.password': 'รหัสผ่าน (อย่างน้อย 8 ตัว)',
    'auth.name': 'ชื่อ-นามสกุล (ของนักเรียน)', 'auth.phone': 'เบอร์โทร', 'auth.grade': 'ระดับชั้น', 'auth.school': 'โรงเรียน',
    'auth.forgot': 'ลืมรหัสผ่าน?', 'auth.reset': 'ส่งลิงก์ตั้งรหัสผ่านใหม่',
  },
  en: {
    'nav.courses': 'Courses', 'nav.online': 'Learn online', 'nav.teacher': 'Teacher',
    'nav.login': 'Log in', 'nav.my': 'My classroom', 'nav.admin': 'Admin', 'nav.logout': 'Log out',
    'price.ask': 'Ask for price',

    'hero.pill': 'Tutoring school in Lamphun · Online classes nationwide',
    'hero.title': 'Small groups.<br>Real understanding. <em>Real results.</em>',
    'hero.body': 'Maths, Chemistry, Biology and English for M.1–M.6, entrance exam prep and university courses. Every student is looked after personally, from the first diagnostic to exam day.',
    'hero.cta': 'See all courses', 'hero.cta2': 'Free consultation on LINE',
    'stat.1': 'of students come back', 'stat.2n': '6 yrs', 'stat.2': 'years of tutoring', 'stat.3n': 'Small', 'stat.3': 'groups, personal care',
    'mock.caption': 'What students see in the system', 'mock.title': 'My progress',
    'mock.r1': 'Chemical equilibrium', 'mock.r1v': '8/10 videos', 'mock.r2': 'Chapter quizzes', 'mock.r2v': '3/4 passed', 'mock.r3': 'Review problems', 'mock.r3v': '12/30 done',
    'mock.next': '<strong>Next quiz:</strong> Equilibrium, chapter 3<br><span class="muted">Weekly progress reports for parents</span>',

    'why.title': 'Why parents trust us',
    'why.1t': 'Diagnostic first', 'why.1b': 'We find the gaps before choosing a course, so no time is wasted relearning what is already known.',
    'why.2t': 'Small groups, personal care', 'why.2b': 'The teacher sees every student. Nobody gets left behind.',
    'why.3t': 'Review, then move ahead', 'why.3b': 'Break courses connect last term to the next one seamlessly.',
    'why.4t': 'Parents see progress', 'why.4b': 'Scores and progress summaries are shared with parents regularly.',

    'courses.eyebrow': 'Now enrolling', 'courses.title': 'Courses',
    'courses.all': 'All', 'courses.more': 'Details',
    'courses.note': 'We also teach A-Level, TGAT, GED, IGCSE, IB and university subjects — ask us on LINE.',
    'courses.empty': 'No courses at this level yet — ask us on LINE.',

    'online.eyebrow': 'Learn online', 'online.title': 'Wherever you are, learn with the same teacher',
    'online.body': 'Rewatch lessons any time, take end-of-chapter quizzes and track your own progress every week. Students in Chonburi and Bangkok already learn with us this way.',
    'online.1t': 'Video lessons', 'online.1b': 'Unlimited replays for enrolled students only',
    'online.2t': 'Chapter quizzes', 'online.2b': 'Instant results with full explanations',
    'online.3t': 'Personal progress', 'online.3b': 'See where you are and what to review',
    'online.4t': 'Summary notes', 'online.4b': 'Teacher-made summaries inside each lesson',

    'teacher.eyebrow': 'Your teacher', 'teacher.name': 'Punnathorn Wattanawichian',
    'teacher.body': 'B.Ed. in Chemistry, First-Class Honours. Six years of tutoring in Chonburi — some students stayed from M.2 all the way to M.6 — before founding A-Class Academy in Lamphun to design her own curriculum and care for every student personally.',
    'teacher.c1': 'Maths, Chemistry, Biology and English from M.1 to university',
    'teacher.c2': 'A-Level, TGAT, TPAT and international GED, IGCSE, IB',
    'teacher.c3': 'Around 80% of students return',
    'teacher.photo': 'Teacher photo',

    'enroll.title': 'Enrol in 3 easy steps',
    'enroll.1t': 'Choose a course', 'enroll.1b': 'Create a free account and pick a course, or ask on LINE for a recommendation.',
    'enroll.2t': 'Pay with PromptPay', 'enroll.2b': 'Scan the QR and upload your slip. Pay in 3 instalments if you like.',
    'enroll.3t': 'Start learning', 'enroll.3b': 'Once the slip is checked, the course opens in My classroom.',
    'enroll.note': '10% off for founding students, plus a discount when you bring a friend.',

    'footer.title': 'Not sure where to start?', 'footer.body': 'Tell us about your grades and goals and we will recommend the right course.',
    'footer.line': 'LINE us', 'footer.address': 'Location', 'footer.phone': 'Phone', 'footer.fbOpen': 'Open page',

    'auth.login': 'Log in', 'auth.signup': 'Sign up', 'auth.email': 'Email', 'auth.password': 'Password (8+ characters)',
    'auth.name': "Student's full name", 'auth.phone': 'Phone', 'auth.grade': 'Grade', 'auth.school': 'School',
    'auth.forgot': 'Forgot password?', 'auth.reset': 'Send reset link',
  },
};

export function getLang() {
  try { return localStorage.getItem('lang') === 'en' ? 'en' : 'th'; } catch { return 'th'; }
}
export function setLang(l) { try { localStorage.setItem('lang', l); } catch { /* ignore */ } }
export function t(key) { const l = getLang(); return dict[l][key] ?? dict.th[key] ?? key; }

/** Fills elements marked data-i18n (text) or data-i18n-html (trusted markup from the dictionary). */
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
}
