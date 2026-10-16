-- =====================================================================
-- A-Class Academy — database setup
-- How to run: Supabase → SQL Editor → New query → paste this whole file → Run
-- Safe to run again: it uses "if not exists" / "or replace" where possible.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- tables ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  line_id text,
  school text,
  grade text,
  parent_name text,
  parent_phone text,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value text
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subject text,
  level text,
  short_desc text,
  description text,
  price numeric(10,2),
  cover_url text,
  schedule text,
  mode text default 'onsite',
  allow_installments boolean not null default true,
  is_published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  is_preview boolean not null default false,
  created_at timestamptz not null default now()
);

-- Protected part of a lesson: only enrolled students (or preview lessons) can read it
create table if not exists public.lesson_content (
  lesson_id uuid primary key references public.lessons(id) on delete cascade,
  video_url text,
  notes text,
  attachment_url text
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  question text not null,
  choices jsonb not null default '[]'::jsonb,   -- ["ตัวเลือก 1", "ตัวเลือก 2", ...]
  answer_index int not null default 0,          -- 0 = first choice
  explanation text,
  sort_order int not null default 0
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'expired')),
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table if not exists public.coupons (
  code text primary key,
  description text,
  percent_off numeric(5,2) default 0,
  amount_off numeric(10,2) default 0,
  course_id uuid references public.courses(id) on delete cascade,  -- null = any course
  max_uses int,
  used_count int not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  plan text not null check (plan in ('full', 'installment')),
  installment_no int not null default 0,    -- 0 = full payment, 1..3 = instalment
  total_price numeric(10,2) not null,       -- course price after discount
  amount numeric(10,2) not null,            -- amount of this transfer
  coupon_code text,
  slip_path text,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  score int not null,
  total int not null,
  answers jsonb,
  created_at timestamptz not null default now()
);

-- Public "showcase" page: sample teaching clips, classroom photos, reviews
create table if not exists public.showcase (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('video', 'photo', 'review')),
  title text,            -- clip title / photo caption
  body text,             -- review text or clip description
  media_url text,        -- YouTube link (video) or image URL (photo, review screenshot)
  author text,           -- who wrote the review
  author_detail text,    -- e.g. "ผู้ปกครองน้อง ม.4"
  is_published boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

create index if not exists lessons_course_idx on public.lessons(course_id, sort_order);
create index if not exists quiz_lesson_idx on public.quiz_questions(lesson_id, sort_order);
create index if not exists payments_user_idx on public.payments(user_id, course_id);
create index if not exists payments_status_idx on public.payments(status, created_at);
create index if not exists attempts_user_idx on public.quiz_attempts(user_id, lesson_id);

-- ---------- helper functions ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_enrolled(p_course uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.enrollments
                 where user_id = auth.uid() and course_id = p_course and status = 'active');
$$;

create or replace function public.can_view_lesson(p_lesson uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.lessons l
    where l.id = p_lesson and (l.is_preview or public.is_enrolled(l.course_id)));
$$;

-- New sign-up → profile row (name/phone/grade/school come from the sign-up form)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, grade, school)
  values (new.id,
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'phone',
          new.raw_user_meta_data->>'grade',
          new.raw_user_meta_data->>'school')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Students cannot make themselves admin
create or replace function public.protect_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null in the SQL Editor, so the owner can still promote herself there
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_role();

-- ---------- pricing & payments (computed on the server so prices can't be faked) ----------
create or replace function public.quote_price(p_course uuid, p_coupon text default null, p_plan text default 'full')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  c public.courses;
  k public.coupons;
  base numeric; discount numeric := 0; total numeric; msg text := null; valid boolean := false;
begin
  select * into c from public.courses where id = p_course and is_published;
  if not found then raise exception 'ไม่พบคอร์สนี้'; end if;
  if c.price is null or c.price <= 0 then raise exception 'คอร์สนี้ยังไม่ได้ตั้งราคา กรุณาทักไลน์สอบถาม'; end if;
  base := c.price;
  if coalesce(trim(p_coupon), '') <> '' then
    select * into k from public.coupons where code = upper(trim(p_coupon));
    if not found or not k.active then msg := 'ไม่พบโค้ดส่วนลดนี้';
    elsif k.expires_at is not null and k.expires_at < now() then msg := 'โค้ดส่วนลดนี้หมดอายุแล้ว';
    elsif k.max_uses is not null and k.used_count >= k.max_uses then msg := 'โค้ดส่วนลดนี้ถูกใช้ครบแล้ว';
    elsif k.course_id is not null and k.course_id <> p_course then msg := 'โค้ดนี้ใช้กับคอร์สนี้ไม่ได้';
    else
      valid := true;
      discount := round(base * coalesce(k.percent_off, 0) / 100, 0) + coalesce(k.amount_off, 0);
      if discount > base then discount := base; end if;
    end if;
  end if;
  total := base - discount;
  return jsonb_build_object(
    'base', base, 'discount', discount, 'total', total,
    'due_now', case when p_plan = 'installment' and c.allow_installments then round(total * 0.4, 0) else total end,
    'coupon_valid', valid, 'coupon_message', msg,
    'allow_installments', c.allow_installments);
end $$;

create or replace function public.create_payment(
  p_course uuid, p_plan text, p_slip_path text, p_coupon text default null, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  first_p public.payments;
  n int;
  paid numeric;
  q jsonb;
  new_id uuid;
  amt numeric; tot numeric; plan text; inst int; coupon text;
begin
  if uid is null then raise exception 'กรุณาเข้าสู่ระบบก่อน'; end if;
  if p_slip_path is null or split_part(p_slip_path, '/', 1) <> uid::text then raise exception 'กรุณาแนบสลิป'; end if;

  select * into first_p from public.payments
   where user_id = uid and course_id = p_course and status <> 'rejected'
   order by created_at limit 1;

  if not found then
    plan := case when p_plan = 'installment' then 'installment' else 'full' end;
    q := public.quote_price(p_course, p_coupon, plan);
    if plan = 'installment' and not (q->>'allow_installments')::boolean then plan := 'full'; end if;
    tot := (q->>'total')::numeric;
    amt := case when plan = 'installment' then round(tot * 0.4, 0) else tot end;
    inst := case when plan = 'installment' then 1 else 0 end;
    coupon := case when (q->>'coupon_valid')::boolean then upper(trim(p_coupon)) else null end;
  else
    if first_p.plan = 'full' then raise exception 'ชำระคอร์สนี้ครบแล้ว'; end if;
    select count(*), coalesce(sum(amount), 0) into n, paid from public.payments
     where user_id = uid and course_id = p_course and status <> 'rejected';
    if n >= 3 then raise exception 'ชำระครบ 3 งวดแล้ว'; end if;
    plan := 'installment'; inst := n + 1; tot := first_p.total_price; coupon := first_p.coupon_code;
    amt := case when inst = 3 then tot - paid else round(tot * 0.3, 0) end;
  end if;

  insert into public.payments (user_id, course_id, plan, installment_no, total_price, amount, coupon_code, slip_path, note)
  values (uid, p_course, plan, inst, tot, amt, coupon, p_slip_path, nullif(trim(p_note), ''))
  returning id into new_id;
  return new_id;
end $$;

-- What the student owes next for a course (null when nothing is due)
create or replace function public.next_installment(p_course uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  first_p public.payments; n int; paid numeric;
begin
  select * into first_p from public.payments
   where user_id = auth.uid() and course_id = p_course and status <> 'rejected'
   order by created_at limit 1;
  if not found or first_p.plan = 'full' then return null; end if;
  select count(*), coalesce(sum(amount), 0) into n, paid from public.payments
   where user_id = auth.uid() and course_id = p_course and status <> 'rejected';
  if n >= 3 then return null; end if;
  return jsonb_build_object('installment_no', n + 1,
    'amount', case when n + 1 = 3 then first_p.total_price - paid else round(first_p.total_price * 0.3, 0) end,
    'total', first_p.total_price, 'paid', paid);
end $$;

create or replace function public.review_payment(p_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare p public.payments;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  select * into p from public.payments where id = p_id for update;
  if not found then raise exception 'payment not found'; end if;
  update public.payments
     set status = case when p_approve then 'approved' else 'rejected' end,
         admin_note = p_note, reviewed_at = now()
   where id = p_id;
  if p_approve and p.status <> 'approved' then
    insert into public.enrollments (user_id, course_id, status) values (p.user_id, p.course_id, 'active')
      on conflict (user_id, course_id) do update set status = 'active';
    if p.coupon_code is not null and p.installment_no in (0, 1) then
      update public.coupons set used_count = used_count + 1 where code = p.coupon_code;
    end if;
  end if;
end $$;

-- ---------- quizzes (answers never leave the server until submitted) ----------
create or replace function public.get_quiz(p_lesson uuid)
returns table (id uuid, question text, choices jsonb, sort_order int)
language sql stable security definer set search_path = public as $$
  select q.id, q.question, q.choices, q.sort_order
    from public.quiz_questions q
   where q.lesson_id = p_lesson and public.can_view_lesson(p_lesson)
   order by q.sort_order, q.id;
$$;

create or replace function public.submit_quiz(p_lesson uuid, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  q record; s int := 0; tot int := 0; chosen int; results jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not public.can_view_lesson(p_lesson) then raise exception 'not allowed'; end if;
  for q in select * from public.quiz_questions where lesson_id = p_lesson order by sort_order, id loop
    tot := tot + 1;
    chosen := nullif(p_answers->>(q.id::text), '')::int;
    if chosen = q.answer_index then s := s + 1; end if;
    results := results || jsonb_build_object('id', q.id, 'chosen', chosen, 'correct', q.answer_index, 'explanation', q.explanation);
  end loop;
  insert into public.quiz_attempts (user_id, lesson_id, score, total, answers) values (auth.uid(), p_lesson, s, tot, p_answers);
  return jsonb_build_object('score', s, 'total', tot, 'results', results);
end $$;

-- ---------- row level security ----------
alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_content enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.enrollments enable row level security;
alter table public.coupons enable row level security;
alter table public.payments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.showcase enable row level security;

do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' and policyname like 'ac_%' loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy ac_profiles_read on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy ac_profiles_update on public.profiles for update using (id = auth.uid() or public.is_admin());
create policy ac_profiles_insert on public.profiles for insert with check (id = auth.uid());

create policy ac_settings_read on public.site_settings for select using (true);
create policy ac_settings_admin on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

create policy ac_courses_read on public.courses for select using (is_published or public.is_admin());
create policy ac_courses_admin on public.courses for all using (public.is_admin()) with check (public.is_admin());

create policy ac_lessons_read on public.lessons for select
  using (public.is_admin() or exists (select 1 from public.courses c where c.id = course_id and c.is_published));
create policy ac_lessons_admin on public.lessons for all using (public.is_admin()) with check (public.is_admin());

create policy ac_content_read on public.lesson_content for select using (public.can_view_lesson(lesson_id));
create policy ac_content_admin on public.lesson_content for all using (public.is_admin()) with check (public.is_admin());

create policy ac_quiz_admin on public.quiz_questions for all using (public.is_admin()) with check (public.is_admin());

create policy ac_enroll_read on public.enrollments for select using (user_id = auth.uid() or public.is_admin());
create policy ac_enroll_admin on public.enrollments for all using (public.is_admin()) with check (public.is_admin());

create policy ac_coupons_admin on public.coupons for all using (public.is_admin()) with check (public.is_admin());

create policy ac_payments_read on public.payments for select using (user_id = auth.uid() or public.is_admin());
create policy ac_payments_admin on public.payments for all using (public.is_admin()) with check (public.is_admin());

create policy ac_progress_read on public.lesson_progress for select using (user_id = auth.uid() or public.is_admin());
create policy ac_progress_insert on public.lesson_progress for insert
  with check (user_id = auth.uid() and public.can_view_lesson(lesson_id));
create policy ac_progress_delete on public.lesson_progress for delete using (user_id = auth.uid());

create policy ac_attempts_read on public.quiz_attempts for select using (user_id = auth.uid() or public.is_admin());

create policy ac_showcase_read on public.showcase for select using (is_published or public.is_admin());
create policy ac_showcase_admin on public.showcase for all using (public.is_admin()) with check (public.is_admin());

-- ---------- file storage ----------
insert into storage.buckets (id, name, public) values ('slips', 'slips', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('media', 'media', true)
  on conflict (id) do nothing;

drop policy if exists ac_slips_insert on storage.objects;
drop policy if exists ac_slips_read on storage.objects;
drop policy if exists ac_media_read on storage.objects;
drop policy if exists ac_media_write on storage.objects;
drop policy if exists ac_media_update on storage.objects;
drop policy if exists ac_media_delete on storage.objects;

create policy ac_slips_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'slips' and (storage.foldername(name))[1] = auth.uid()::text);
create policy ac_slips_read on storage.objects for select to authenticated
  using (bucket_id = 'slips' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy ac_media_read on storage.objects for select using (bucket_id = 'media');
create policy ac_media_write on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());
create policy ac_media_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_admin());
create policy ac_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());

-- ---------- starter content (edit or delete later from the admin page) ----------
insert into public.site_settings (key, value) values
  ('line_id', ''), ('line_url', ''), ('phone', ''), ('address', 'จ.ลำพูน'), ('facebook_url', ''),
  ('promptpay_id', ''), ('promptpay_name', 'A-Class Academy'), ('teacher_photo_url', '')
on conflict (key) do nothing;

insert into public.courses (slug, title, subject, level, short_desc, is_published, sort_order) values
  ('math-m2-break', 'คณิต ม.2 ทวนเทอม 1 + ขึ้นเทอม 2', 'คณิต', 'ม.ต้น', 'ปูพื้นเรื่องที่ต้องใช้ต่อ แล้วเริ่มเนื้อหาใหม่ก่อนเปิดเทอม พร้อมแบบทดสอบวัดพื้นฐานก่อนเรียน', true, 10),
  ('chem-m4-break', 'เคมี ม.4 ทวน + ขึ้นเนื้อหาใหม่', 'เคมี', 'ม.ปลาย', 'เข้าใจหลักการ ไม่ท่องจำ ทวนบทสำคัญของเทอม 1 แล้วต่อเทอม 2 อย่างมั่นใจ', true, 20),
  ('calculus-m6', 'แคลคูลัส ม.6', 'คณิต', 'ม.ปลาย', 'จากเข้าใจไปถึงทำโจทย์ได้จริง ใช้ทั้งสอบเข้ามหาวิทยาลัยและเรียนต่อปี 1', true, 30),
  ('chem-m5-acid-base', 'เคมี ม.5 กรด-เบส', 'เคมี', 'ม.ปลาย', 'มีแบบทดสอบพื้นฐานก่อนเรียน ถ้าพื้นยังไม่แน่น ครูแนะนำคอร์สปูพื้นให้ก่อน', true, 40),
  ('bio-m4-review', 'ชีวะ ม.4 ทวนเนื้อหา', 'ชีวะ', 'ม.ปลาย', 'สรุปภาพรวมให้เห็นความเชื่อมโยง จำง่าย นำไปใช้ทำข้อสอบได้', true, 50),
  ('math-primary', 'คณิตประถม', 'คณิต', 'ประถม', 'เสริมพื้นฐานให้แน่นตามระดับชั้นของน้อง ดูแลในกลุ่มเล็ก', true, 60),
  ('alevel-chem', 'A-Level เคมี', 'เคมี', 'สอบเข้ามหาลัย', 'ตะลุยโจทย์แนวข้อสอบจริง พร้อมเทคนิคทำข้อสอบให้ทันเวลา', true, 70),
  ('tgat1-english', 'TGAT1 อังกฤษ', 'อังกฤษ', 'สอบเข้ามหาลัย', 'ฝึกทักษะการสื่อสารภาษาอังกฤษตามแนวข้อสอบ TGAT', true, 80)
on conflict (slug) do nothing;

-- =====================================================================
-- AFTER you sign up on the website, make yourself admin (run once):
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'YOUR_EMAIL_HERE');
-- =====================================================================
