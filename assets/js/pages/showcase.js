import { initLayout, sb, esc, t, lineLink, youtubeId, $, $$ } from '../core.js';

const app = $('#app');
const PLAY = '<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';

async function loadItems() {
  try {
    const c = await sb();
    if (!c) return [];
    const { data, error } = await c.from('showcase').select('*').eq('is_published', true).order('sort_order').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('Showcase not available:', e.message);
    return [];
  }
}

// Shows a thumbnail first and loads the YouTube player only when clicked, so the page stays light.
function videoCard(v) {
  const id = youtubeId(v.media_url);
  if (!id) return '';
  const title = v.title || t('sc.videos');
  return `
    <figure>
      <div class="video">
        <button type="button" class="yt-facade" data-yt="${id}" data-title="${esc(title)}" aria-label="${esc(t('sc.play', { title }))}">
          <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy">
          <span class="play">${PLAY}</span>
        </button>
      </div>
      ${v.title || v.body ? `<figcaption>${v.title ? `<b>${esc(v.title)}</b>` : ''}${v.body ? `<span class="small muted">${esc(v.body)}</span>` : ''}</figcaption>` : ''}
    </figure>`;
}

function photoCard(p) {
  if (!p.media_url) return '';
  return `
    <button type="button" class="sc-photo" data-big="${esc(p.media_url)}" data-caption="${esc(p.title || '')}">
      <img src="${esc(p.media_url)}" alt="${esc(p.title || t('sc.photoAlt'))}" loading="lazy">
      ${p.title ? `<span>${esc(p.title)}</span>` : ''}
    </button>`;
}

function reviewCard(r) {
  if (!r.body && !r.media_url) return '';
  return `
    <article class="card review">
      ${r.body ? `<blockquote>${esc(r.body)}</blockquote>` : ''}
      ${r.media_url ? `<button type="button" class="shot" data-big="${esc(r.media_url)}" data-caption="${esc(r.author || '')}"><img src="${esc(r.media_url)}" alt="${esc(t('sc.reviewImg'))}" loading="lazy"></button>` : ''}
      ${r.author || r.author_detail ? `<div class="who">${r.author ? `<b>${esc(r.author)}</b>` : ''}${r.author_detail ? `<div class="muted">${esc(r.author_detail)}</div>` : ''}</div>` : ''}
    </article>`;
}

function section(id, titleKey, bodyKey, inner) {
  if (!inner) return '';
  return `
    <section class="sc-section" id="${id}" aria-labelledby="${id}-h">
      <header><h2 id="${id}-h">${t(titleKey)}</h2><p class="muted">${t(bodyKey)}</p></header>
      ${inner}
    </section>`;
}

function openImage(src, caption) {
  const d = document.createElement('dialog');
  d.innerHTML = `<div class="dlg">
    <img src="${esc(src)}" alt="${esc(caption || t('sc.photoAlt'))}" style="width:100%;border-radius:12px">
    <div class="row between">${caption ? `<span class="small muted">${esc(caption)}</span>` : '<span></span>'}<button type="button" class="btn btn-ghost btn-sm">${t('sc.close')}</button></div>
  </div>`;
  document.body.appendChild(d);
  d.addEventListener('close', () => d.remove());
  d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('button')) d.close(); });
  d.showModal();
}

(async () => {
  const { settings } = await initLayout();
  document.title = `${t('sc.pageTitle')} | A-Class Academy`;
  const items = await loadItems();
  const of = (kind, fn) => items.filter((x) => x.kind === kind).map(fn).join('');
  const videos = of('video', videoCard);
  const photos = of('photo', photoCard);
  const reviews = of('review', reviewCard);
  const line = lineLink(settings);

  app.innerHTML = `
    <div class="page-head" style="margin-bottom:0">
      <div class="stack" style="gap:8px;max-width:720px">
        <div class="eyebrow">${t('sc.eyebrow')}</div>
        <h1>${t('sc.title')}</h1>
        <p class="muted" style="font-size:18px">${t('sc.body')}</p>
      </div>
    </div>
    ${videos || photos || reviews ? `
      <nav class="filters" aria-label="${esc(t('sc.jump'))}" style="margin-top:24px">
        ${videos ? `<a class="filter" href="#videos" style="text-decoration:none;display:inline-flex;align-items:center">${t('sc.videos')}</a>` : ''}
        ${photos ? `<a class="filter" href="#photos" style="text-decoration:none;display:inline-flex;align-items:center">${t('sc.photos')}</a>` : ''}
        ${reviews ? `<a class="filter" href="#reviews" style="text-decoration:none;display:inline-flex;align-items:center">${t('sc.reviews')}</a>` : ''}
      </nav>` : `<div class="empty" style="margin-top:40px">${t('sc.empty')}</div>`}
    ${section('videos', 'sc.videos', 'sc.videosBody', videos && `<div class="sc-videos">${videos}</div>`)}
    ${section('photos', 'sc.photos', 'sc.photosBody', photos && `<div class="sc-photos">${photos}</div>`)}
    ${section('reviews', 'sc.reviews', 'sc.reviewsBody', reviews && `<div class="sc-reviews">${reviews}</div>`)}
    <aside class="sc-cta">
      <div class="stack" style="gap:6px;max-width:520px">
        <h2 style="font-size:clamp(22px,2.6vw,30px)">${t('sc.ctaTitle')}</h2>
        <p class="muted">${t('sc.ctaBody')}</p>
      </div>
      <div class="row">
        ${line ? `<a class="btn btn-accent" href="${esc(line)}" target="_blank" rel="noopener">${t('hero.cta2')}</a>` : ''}
        <a class="btn btn-ghost" href="/#courses">${t('hero.cta')}</a>
      </div>
    </aside>`;

  $$('[data-yt]', app).forEach((b) => b.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${b.dataset.yt}?autoplay=1&rel=0&playsinline=1`;
    f.title = b.dataset.title;
    f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    b.replaceWith(f);
  }));
  $$('[data-big]', app).forEach((b) => b.addEventListener('click', () => openImage(b.dataset.big, b.dataset.caption)));
})();
