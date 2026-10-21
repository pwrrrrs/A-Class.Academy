// Shared helpers: Supabase client, auth, settings, layout, i18n, formatting.
import { CONFIG } from './config.js';
import { t, getLang, setLang, applyI18n } from './i18n.js';

export { t, getLang };

const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.100.0/+esm';

let clientPromise = null;
export const isConfigured = () => Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);

/** Returns the Supabase client, or null when the site is not connected yet. */
export function sb() {
  if (!isConfigured()) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import(SUPABASE_JS).then(({ createClient }) =>
      createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    );
  }
  return clientPromise;
}

// ---------- auth ----------
let profileCache;
export async function currentUser() {
  const c = await sb();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  return data.session?.user ?? null;
}
export async function currentProfile() {
  if (profileCache !== undefined) return profileCache;
  const user = await currentUser();
  if (!user) return (profileCache = null);
  const c = await sb();
  const { data } = await c.from('profiles').select('*').eq('id', user.id).maybeSingle();
  profileCache = data ? { ...data, email: user.email } : { id: user.id, email: user.email, role: 'student' };
  return profileCache;
}
export async function requireLogin() {
  const user = await currentUser();
  if (!user) {
    const back = encodeURIComponent(location.pathname + location.search);
    location.replace(`/login?next=${back}`);
    return new Promise(() => {}); // stop the page
  }
  return user;
}
export async function signOut() {
  const c = await sb();
  if (c) await c.auth.signOut();
  location.href = '/';
}

// ---------- settings ----------
let settingsPromise;
export function getSettings() {
  if (!settingsPromise) {
    settingsPromise = (async () => {
      const s = { ...CONFIG.DEFAULTS };
      const c = await sb();
      if (c) {
        const { data } = await c.from('site_settings').select('key,value');
        (data || []).forEach((r) => { if (r.value !== null && r.value !== '') s[r.key] = r.value; });
      }
      return s;
    })().catch(() => ({ ...CONFIG.DEFAULTS }));
  }
  return settingsPromise;
}

// ---------- formatting ----------
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
export const baht = (n) => (n === null || n === undefined || n === '') ? '' : `฿${Number(n).toLocaleString('th-TH', { maximumFractionDigits: 2 })}`;
export const param = (k) => new URLSearchParams(location.search).get(k);
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString(getLang() === 'en' ? 'en-GB' : 'th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}
export function notice(el, kind, msg) {
  el.className = `notice ${kind}`;
  el.textContent = msg;
  el.classList.remove('hidden');
}
export function lineLink(s, fallback = '') {
  if (s.line_url) return s.line_url;
  if (!s.line_id) return fallback;
  const id = s.line_id.trim();
  return id.startsWith('@')
    ? `https://line.me/R/ti/p/@${encodeURIComponent(id.slice(1))}`
    : `https://line.me/R/ti/p/~${encodeURIComponent(id)}`;
}
export const priceLabel = (c) => (c.price ? baht(c.price) : t('price.ask'));

export function youtubeId(input) {
  if (!input) return '';
  const s = String(input).trim();
  const m = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : (/^[A-Za-z0-9_-]{11}$/.test(s) ? s : '');
}

// ---------- layout ----------
const icons = {
  check: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
};
export { icons };

function headerHtml(profile) {
  const authLinks = profile
    ? `<a href="/my" data-i18n="nav.my">${t('nav.my')}</a>
       ${profile.role === 'admin' ? `<a href="/admin" data-i18n="nav.admin">${t('nav.admin')}</a>` : ''}
       <button type="button" class="btn btn-ghost btn-sm" id="logoutBtn">${t('nav.logout')}</button>`
    : `<a href="/login" class="btn btn-ghost btn-sm">${t('nav.login')}</a>`;
  return `
  <div class="wrap">
    <a href="/" class="logo" aria-label="A-Class Academy หน้าแรก">
      <img class="logo-mark" src="/assets/img/logo-mark.png" alt="" width="44" height="44"><span class="logo-text">A-Class Academy</span>
    </a>
    <nav class="nav" aria-label="เมนูหลัก">
      <a href="/#courses">${t('nav.courses')}</a>
      <a href="/#online">${t('nav.online')}</a>
      <a href="/#teacher">${t('nav.teacher')}</a>
      <a href="/showcase">${t('nav.showcase')}</a>
      ${authLinks}
      <button type="button" class="lang-btn" id="langBtn" aria-label="Switch language">${getLang() === 'th' ? 'EN' : 'ไทย'}</button>
    </nav>
  </div>`;
}

function footerHtml(s) {
  const lineHref = lineLink(s);
  const fb = s.facebook_url ? `<a href="${esc(s.facebook_url)}" target="_blank" rel="noopener">${t('footer.fbOpen')}</a>` : '—';
  return `
  <div class="wrap" id="contact">
    <div class="row between" style="gap:32px;align-items:flex-end">
      <div class="stack" style="gap:12px;max-width:520px">
        <h2 style="font-size:clamp(26px,3vw,36px)">${t('footer.title')}</h2>
        <p class="muted">${t('footer.body')}</p>
      </div>
      ${lineHref ? `<a href="${esc(lineHref)}" target="_blank" rel="noopener" class="btn btn-accent">${t('footer.line')} ${esc(s.line_id || '')}</a>` : ''}
    </div>
    <div class="footer-grid">
      <div><b>${t('footer.address')}</b><span>${esc(s.address || '—')}</span></div>
      <div><b>${t('footer.phone')}</b><span>${s.phone ? `<a href="tel:${esc(s.phone.replace(/[^0-9+]/g, ''))}">${esc(s.phone)}</a>` : '—'}</span></div>
      <div><b>Facebook</b><span>${fb}</span></div>
      <div><b>LINE</b><span>${esc(s.line_id || '—')}</span></div>
    </div>
    <div class="tiny" style="opacity:.7">© ${new Date().getFullYear()} A-Class Academy</div>
  </div>`;
}

/** Call once per page. Renders header/footer, applies tone and language. */
export async function initLayout() {
  document.documentElement.dataset.tone = CONFIG.TONE || 'indigo';
  document.documentElement.lang = getLang();
  const header = $('#siteHeader');
  const footer = $('#siteFooter');
  let profile = null;
  try { profile = await currentProfile(); } catch { profile = null; }
  if (header) {
    header.innerHTML = headerHtml(profile);
    $('#logoutBtn')?.addEventListener('click', signOut);
    $('#langBtn')?.addEventListener('click', () => { setLang(getLang() === 'th' ? 'en' : 'th'); location.reload(); });
  }
  const settings = await getSettings();
  if (footer) footer.innerHTML = footerHtml(settings);
  applyI18n();
  if (!isConfigured()) document.body.dataset.demo = 'true';
  return { profile, settings };
}
