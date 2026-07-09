// ============================================================================
// FHM-Legal-Solution — Advocate profile dynamic loader
// Reads ?slug= from the URL, fetches that advocate from the API, and fills
// in every placeholder in advocate.html. Falls back to a friendly
// "not found" message if the slug doesn't match anyone.
// ============================================================================

function starString(rating) {
  const r = Math.round(Number(rating || 0) * 2) / 2;
  const full = Math.floor(r);
  const half = r % 1 !== 0;
  return '★'.repeat(full) + (half ? '½' : '');
}

function getSlugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('slug');
}

function waLink(number, name) {
  const digits = (number || '').replace(/[^\d+]/g, '');
  return `https://wa.me/${digits.replace('+', '')}?text=${encodeURIComponent(`Hello Advocate ${name}, I need legal help`)}`;
}

const GENERIC_ICON_SVG = `<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
const CHECK_ICON_SVG = `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`;
const TROPHY_ICON_SVG = `<svg viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/></svg>`;

function renderAboutText(longBio, shortBio) {
  const container = document.getElementById('about-text');
  const paragraphs = Array.isArray(longBio) && longBio.length ? longBio : [shortBio].filter(Boolean);
  container.innerHTML = paragraphs.map((p) => `<p>${p}</p>`).join('');
}

function renderQuote(quote, attribution) {
  if (!quote) return;
  const box = document.createElement('div');
  box.className = 'quote-box';
  box.innerHTML = `<p>"${quote}"</p>${attribution ? `<div class="q-attr">${attribution}</div>` : ''}`;
  document.getElementById('about-text').appendChild(box);
}

function renderWhyChoose(items) {
  const list = document.getElementById('why-list');
  list.innerHTML = (items || []).map((item) => `
    <div class="why-item">
      <div class="why-icon">${CHECK_ICON_SVG}</div>
      <div class="why-txt"><div class="wt">${item.title}</div><div class="wd">${item.desc}</div></div>
    </div>
  `).join('');
}

function renderPracticeAreas(items) {
  const section = document.getElementById('practice-areas-section');
  if (!items || !items.length) return;
  section.style.display = '';
  const grid = document.getElementById('practice-grid-2');
  grid.innerHTML = items.map((item, i) => `
    <div class="pa-card">
      <div class="pa-num">${String(i + 1).padStart(2, '0')}</div>
      <div class="pa-icon">${GENERIC_ICON_SVG}</div>
      <div class="pa-name">${item.title}</div>
      <div class="pa-desc">${item.desc}</div>
    </div>
  `).join('');
}

function renderFees(items) {
  const grid = document.getElementById('fees-grid');
  if (!items || !items.length) {
    document.getElementById('fees').style.display = 'none';
    return;
  }
  grid.innerHTML = items.map((fee) => `
    <div class="fee-card ${fee.featured ? 'featured' : ''}">
      ${fee.featured ? '<span class="best-badge">MOST POPULAR</span>' : ''}
      <div class="fee-name">${fee.name}</div>
      <div class="fee-type">${fee.type || ''}</div>
      ${fee.original_price ? `<div class="fee-orig">${fee.original_price}</div>` : ''}
      <div class="fee-amount">${fee.price}</div>
      ${fee.save_text ? `<div class="fee-save">${fee.save_text}</div>` : ''}
      <ul class="fee-inc">${(fee.inclusions || []).map((inc) => `<li>${inc}</li>`).join('')}</ul>
      <button class="fee-btn" onclick="document.getElementById('contact').scrollIntoView({behavior:'smooth'})">${fee.button_text || 'Book Now'}</button>
    </div>
  `).join('');
}

function renderAchievements(items, name) {
  const section = document.getElementById('achieve-section');
  if (!items || !items.length) return;
  section.style.display = '';
  document.getElementById('achieve-sub').textContent = `A track record built through years of dedicated advocacy by ${name}.`;
  document.getElementById('achieve-grid').innerHTML = items.map((a) => `
    <div class="ach-card">
      <div class="ach-icon">${TROPHY_ICON_SVG}</div>
      <div><div class="ach-title">${a.title}</div><div class="ach-desc">${a.desc}</div></div>
    </div>
  `).join('');
}

function renderReviews(items) {
  const section = document.getElementById('reviews-section');
  if (!items || !items.length) return;
  section.style.display = '';
  document.getElementById('reviews-grid').innerHTML = items.map((r) => {
    const initial = (r.name || '?').trim().charAt(0).toUpperCase();
    return `
      <div class="rv-card">
        <div class="rv-stars">${starString(r.rating || 5)}</div>
        <p class="rv-text">${r.text}</p>
        <div class="rv-person">
          <div class="rv-avatar">${initial}</div>
          <div><div class="rv-name">${r.name}</div><div class="rv-case">${r.case || ''}</div></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderHero(adv) {
  document.getElementById('page-title').textContent = adv.meta_title || `${adv.name} — ${adv.designation || 'Advocate'} | FHM-Legal-Solution`;
  document.getElementById('page-description').setAttribute('content', adv.meta_description || adv.short_bio || '');

  document.getElementById('avail-pill').style.display = adv.is_available ? '' : 'none';

  const nameEl = document.getElementById('hero-name');
  const displayName = adv.name.replace(/^Adv\.?\s*/i, '');
  nameEl.innerHTML = `Adv. <span>${displayName}</span>`;

  document.getElementById('hero-title').textContent = adv.designation || '';
  document.getElementById('hero-sub-title').textContent = [adv.court, adv.city].filter(Boolean).join(' · ');

  document.getElementById('hero-tags').innerHTML = [
    ...(adv.practice_tags || []),
    `${adv.rating || 0}★ Rating`,
    ...(adv.languages || []).slice(0, 1),
  ].map((t) => `<span class="htag">${t}</span>`).join('');

  document.getElementById('hero-desc').textContent = adv.short_bio || '';

  document.getElementById('hero-stats').innerHTML = `
    <div class="hstat"><span class="hstat-n">${adv.experience_years || 0}+</span><span class="hstat-l">Years Experience</span></div>
    <div class="hstat"><span class="hstat-n">${adv.cases_won || 0}+</span><span class="hstat-l">Cases Won</span></div>
    <div class="hstat"><span class="hstat-n">${adv.success_rate || 0}%</span><span class="hstat-l">Success Rate</span></div>
    <div class="hstat"><span class="hstat-n">${adv.rating || 0}★</span><span class="hstat-l">${adv.review_count || 0} Reviews</span></div>
  `;

  document.getElementById('hero-photo').src = adv.photo_url || 'images.jpeg';
  document.getElementById('hero-photo').alt = adv.name;
  document.getElementById('photo-name').textContent = adv.name;
  document.getElementById('bar-badge-text').textContent = adv.bar_council_text || 'Bar Council Verified';

  // Floating badges reuse the first two achievements if present, else stay hidden.
  if (adv.achievements && adv.achievements[0]) {
    document.getElementById('floating-badge-1').style.display = '';
    document.getElementById('fb1-label').textContent = 'Highlight';
    document.getElementById('fb1-val').textContent = adv.achievements[0].title;
  }
  if (adv.consultation_fee) {
    document.getElementById('floating-badge-2').style.display = '';
    document.getElementById('fb2-label').textContent = 'Consultation';
    document.getElementById('fb2-val').textContent = `₹${Number(adv.consultation_fee).toLocaleString('en-IN')}`;
  }
}

function renderContact(adv) {
  document.getElementById('cta-heading').textContent = `Ready to Get Expert Legal Help From ${adv.name}?`;

  document.getElementById('contact-phone-text').textContent = adv.phone || '';
  document.getElementById('contact-call').addEventListener('click', () => {
    window.location.href = `tel:${(adv.phone || '').replace(/\s/g, '')}`;
  });

  document.getElementById('contact-whatsapp').addEventListener('click', () => {
    window.open(waLink(adv.whatsapp || adv.phone, adv.name), '_blank');
  });

  document.getElementById('contact-email-text').textContent = adv.email || 'fhmlegalsolution@gmail.com';
  document.getElementById('contact-address-text').textContent = adv.address || adv.city || '';

  document.getElementById('wp-float').href = waLink(adv.whatsapp || adv.phone, adv.name);

  document.getElementById('footer-text').textContent = `© 2026 FHM-Legal-Solution · ${adv.name}`;
}

async function loadAdvocateProfile() {
  const slug = getSlugFromUrl();
  const loadingEl = document.getElementById('loading-state');

  if (!slug) {
    loadingEl.textContent = 'No advocate specified. Please go back and select a lawyer from the homepage.';
    return;
  }

  try {
    const adv = await FHM.getAdvocateBySlug(slug);

    renderHero(adv);
    renderAboutText(adv.long_bio, adv.short_bio);
    renderQuote(adv.quote, adv.quote_attribution);
    renderWhyChoose(adv.why_choose);
    renderPracticeAreas(adv.practice_areas);
    renderFees(adv.fee_structure);
    renderAchievements(adv.achievements, adv.name);
    renderReviews(adv.reviews);
    renderContact(adv);

    loadingEl.style.display = 'none';
    document.getElementById('profile-root').style.display = '';

    if (window.reobserveFadeIns) window.reobserveFadeIns();
  } catch (err) {
    console.error('Failed to load advocate:', err);
    loadingEl.textContent = "We couldn't find that advocate profile. Please go back and choose a lawyer from the homepage.";
  }
}

document.addEventListener('DOMContentLoaded', loadAdvocateProfile);
