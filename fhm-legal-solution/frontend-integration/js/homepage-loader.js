// ============================================================================
// FHM-Legal-Solution — Homepage dynamic loader
//
// This script does NOT change any design. It only replaces the *content* of
// three sections (lawyer cards, practice areas, testimonials) with data
// fetched from the API, re-using the exact same HTML classes the static
// page already used — so the CSS in <style> keeps working untouched.
//
// It also fills in any element carrying a `data-cms="section.key"` attribute
// from the homepage_content API, e.g.:
//   <h1 data-cms="hero.heading">Find the Right Lawyer, ...</h1>
// See the accompanying README for the exact attributes to add.
// ============================================================================

function starString(rating) {
  const r = Math.round(Number(rating || 0) * 2) / 2;
  const full = Math.floor(r);
  const half = r % 1 !== 0;
  return '★'.repeat(full) + (half ? '½' : '');
}

function waLink(number, name) {
  const digits = (number || '').replace(/[^\d+]/g, '');
  return `https://wa.me/${digits.replace('+', '')}?text=${encodeURIComponent(`Hello Advocate ${name}, I need legal help`)}`;
}

function telLink(number) {
  return `tel:${(number || '').replace(/\s/g, '')}`;
}

// ── LAWYER CARDS ────────────────────────────────────────────────────────────
function renderLawyerCard(adv) {
  const card = document.createElement('div');
  card.className = 'lawyer-card fade-in';
  card.dataset.slug = adv.slug;

  const tags = (adv.practice_tags || []).map((t) => `<span class="tag">${t}</span>`).join('');
  const langs = (adv.languages || []).join(', ');

  card.innerHTML = `
    <div class="lawyer-card-top">
      ${adv.is_available ? '<div class="avail-badge">Available</div>' : ''}
      <div class="lawyer-photo"><img src="${adv.photo_url || 'images.jpeg'}" alt="${adv.name}" style="width:100%;height:100%;object-fit:cover;"></div>
      <div class="lawyer-info">
        <div class="name">${adv.name}</div>
        <div class="desig">${[adv.designation, adv.court].filter(Boolean).join(' · ')}</div>
        <div class="stars">${starString(adv.rating)} <span class="rating-num">${adv.rating} (${adv.review_count || 0})</span></div>
        <div class="verified-chip">Bar Council Verified</div>
      </div>
    </div>
    <div class="lawyer-card-body">
      <div class="tags-row">${tags}</div>
      <div class="lawyer-meta">
        <div class="meta-item"><strong>${adv.experience_years || 0} Years</strong>Experience</div>
        <div class="meta-item"><strong>${adv.city || ''}</strong>Location</div>
        <div class="meta-item"><strong>${langs}</strong>Languages</div>
        <div class="meta-item"><strong>${adv.success_rate || 0}%</strong>Success Rate</div>
      </div>
      <div class="fee-row">
        <span class="fee-label">Consultation Fee</span>
        <span class="fee-amount">₹${Number(adv.consultation_fee || 0).toLocaleString('en-IN')} / ${adv.fee_unit || 'session'}</span>
      </div>
      <div class="lawyer-actions">
        <button class="btn-book" data-nav="advocate.html?slug=${adv.slug}">Book Consultation</button>
        <button class="btn-wp" data-nav="${waLink(adv.whatsapp, adv.name)}">Chat</button>
        <button class="btn-call" data-nav="${telLink(adv.phone)}">Call</button>
      </div>
    </div>
  `;

  card.addEventListener('click', () => {
    window.location.href = `advocate.html?slug=${adv.slug}`;
  });
  card.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = btn.dataset.nav;
    });
  });

  return card;
}

async function loadLawyerCards() {
  const grid = document.querySelector('.lawyers-grid');
  if (!grid) return;

  try {
    const advocates = await FHM.getAdvocates();
    grid.innerHTML = '';
    advocates.forEach((adv) => grid.appendChild(renderLawyerCard(adv)));

    // Re-run the existing fade-in observer (defined later in index.html)
    // on the freshly-inserted cards so the same scroll animation applies.
    if (window.reobserveFadeIns) window.reobserveFadeIns();
    else document.querySelectorAll('.lawyer-card').forEach((el) => el.classList.add('visible'));
  } catch (err) {
    console.error('Failed to load advocates:', err);
    grid.innerHTML = '<p style="padding:40px;text-align:center;color:var(--text-muted)">Unable to load lawyers right now. Please refresh the page.</p>';
  }
}

// ── PRACTICE AREAS ──────────────────────────────────────────────────────────
const PRACTICE_ICON_SVG = `<svg class="practice-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`;

function renderPracticeCard(area) {
  const card = document.createElement('div');
  card.className = 'practice-card';
  card.innerHTML = `
    ${PRACTICE_ICON_SVG}
    <div class="practice-name">${area.title}</div>
    <div class="practice-count">${area.description || ''}</div>
  `;
  return card;
}

async function loadPracticeAreas() {
  const grid = document.querySelector('.practice-grid');
  if (!grid) return;

  try {
    const areas = await FHM.getPracticeAreas();
    if (!areas.length) return; // keep static content if nothing seeded yet
    grid.innerHTML = '';
    areas.forEach((area) => grid.appendChild(renderPracticeCard(area)));
  } catch (err) {
    console.error('Failed to load practice areas:', err);
    // Fail silently — the original static cards stay in place.
  }
}

// ── TESTIMONIALS ─────────────────────────────────────────────────────────────
function renderTestimonialCard(t) {
  const card = document.createElement('div');
  card.className = 'testi-card';
  const initial = (t.client_name || '?').trim().charAt(0).toUpperCase();
  card.innerHTML = `
    <div class="testi-stars">${starString(t.rating)}</div>
    <p class="testi-text">${t.review_text}</p>
    <div class="testi-person">
      <div class="testi-avatar">${initial}</div>
      <div>
        <div class="testi-name">${t.client_name}</div>
        <div class="testi-loc">${t.client_city || ''}</div>
      </div>
    </div>
  `;
  return card;
}

async function loadTestimonials() {
  const grid = document.querySelector('.testi-grid');
  if (!grid) return;

  try {
    const testimonials = await FHM.getTestimonials();
    if (!testimonials.length) return; // keep static testimonials if none added yet
    grid.innerHTML = '';
    testimonials.forEach((t) => grid.appendChild(renderTestimonialCard(t)));
  } catch (err) {
    console.error('Failed to load testimonials:', err);
  }
}

// ── GENERIC CMS TEXT BINDING ─────────────────────────────────────────────────
// Any element with data-cms="sectionKey.path.to.value" gets its text (or, for
// <img>, its src) replaced by the matching value from /api/homepage.
function getByPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

async function loadCmsText() {
  const nodes = document.querySelectorAll('[data-cms]');
  if (!nodes.length) return;

  try {
    const content = await FHM.getHomepageContent();
    nodes.forEach((el) => {
      const value = getByPath(content, el.dataset.cms);
      if (value === undefined || value === null) return;
      if (el.tagName === 'IMG') el.src = value;
      else el.textContent = value;
    });
  } catch (err) {
    console.error('Failed to load homepage content:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadLawyerCards();
  loadPracticeAreas();
  loadTestimonials();
  loadCmsText();
});
