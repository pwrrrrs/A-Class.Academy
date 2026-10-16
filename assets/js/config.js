// ===== ตั้งค่าเว็บไซต์ =====
// ใส่ค่าจาก Supabase → Project Settings → API (หรือปุ่ม Connect)
// ค่า anon / publishable key เปิดเผยได้ ปลอดภัยเพราะข้อมูลถูกป้องกันด้วย Row Level Security
// ห้ามใส่ service_role / secret key ในไฟล์นี้เด็ดขาด

export const CONFIG = {
  SUPABASE_URL: 'https://itynuuiypiegtcudunre.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_1wrHAElSry6qtzybkHBVVA_vlZCYoIZ',

  // โทนสี: 'indigo' (ครามทอง) | 'emerald' (เขียวมรกต) | 'plum' (ม่วงพลัม)
  TONE: 'indigo',

  // ค่าเริ่มต้นของข้อมูลติดต่อ — แก้ได้จากหน้า "หลังบ้าน → ตั้งค่า" หลังเชื่อม Supabase แล้ว
  DEFAULTS: {
    line_id: '',
    line_url: '',
    phone: '',
    address: 'จ.ลำพูน',
    facebook_url: '',
    promptpay_id: '',
    promptpay_name: 'A-Class Academy',
    teacher_photo_url: '',
  },
};
