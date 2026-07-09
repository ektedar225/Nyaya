// ============================================================================
// FHM-Legal-Solution — Admin Dashboard App
// A small hash-free single-page app: sidebar clicks swap the #content view.
// ============================================================================

let CURRENT_ADVOCATES = []; // cached for the edit modal

function toast(message, isError = false) {
  const el = document.createElement('div');
  el.className = `toast ${isError ? 'error' : ''}`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function esc(str) {
  return (str ?? '').toString().replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function closeModal() {
  const overlay = document.querySelector('.modal-overlay');
  if (overlay) overlay.remove();
}

function openModal(innerHtml) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal">${innerHtml}</div>`;
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
}

// ── Repeatable list-of-objects field helper ─────────────────────────────────
// Renders `items` (array of objects) as removable blocks, each block built by
// `fieldsFn(item, index)` returning an HTML string of <input>/<textarea> tags
// whose name attributes are read back out by collectRepeatList().
function renderRepeatList(containerId, items, fieldsFn) {
  const container = document.getElementById(containerId);
  container.innerHTML = (items || []).map((item, i) => `
    <div class="repeat-block" data-index="${i}">
      <button type="button" class="remove-btn" onclick="this.closest('.repeat-block').remove()">✕</button>
      ${fieldsFn(item, i)}
    </div>
  `).join('');
}

function addRepeatBlock(containerId, fieldsFn) {
  const container = document.getElementById(containerId);
  const div = document.createElement('div');
  div.className = 'repeat-block';
  div.innerHTML = `<button type="button" class="remove-btn" onclick="this.closest('.repeat-block').remove()">✕</button>${fieldsFn({}, container.children.length)}`;
  container.appendChild(div);
}

function collectRepeatList(containerId, fieldNames) {
  const blocks = document.querySelectorAll(`#${containerId} .repeat-block`);
  return Array.from(blocks).map((block) => {
    const obj = {};
    fieldNames.forEach((name) => {
      const el = block.querySelector(`[name="${name}"]`);
      if (!el) return;
      if (el.type === 'checkbox') obj[name] = el.checked;
      else if (el.dataset.list === 'true') obj[name] = el.value.split(',').map((s) => s.trim()).filter(Boolean);
      else obj[name] = el.value;
    });
    return obj;
  });
}

// ── NAV ──────────────────────────────────────────────────────────────────
const VIEWS = {
  advocates: { title: 'Advocates', render: renderAdvocatesView },
  homepage: { title: 'Homepage Content', render: renderHomepageView },
  'practice-areas': { title: 'Practice Areas', render: renderPracticeAreasView },
  testimonials: { title: 'Testimonials', render: renderTestimonialsView },
  consultations: { title: 'Consultations', render: renderConsultationsView },
  settings: { title: 'Settings', render: renderSettingsView },
};

function navigate(view) {
  document.querySelectorAll('.nav-item').forEach((el) => el.classList.toggle('active', el.dataset.view === view));
  document.getElementById('view-title').textContent = VIEWS[view].title;
  document.getElementById('content').innerHTML = '<div class="empty-state">Loading…</div>';
  VIEWS[view].render();
}

document.querySelectorAll('.nav-item').forEach((el) => {
  el.addEventListener('click', () => navigate(el.dataset.view));
});

// ============================================================================
// ADVOCATES
// ============================================================================
async function renderAdvocatesView() {
  const content = document.getElementById('content');
  try {
    CURRENT_ADVOCATES = await AdminAPI.get('/admin/advocates');
  } catch (err) {
    content.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
    return;
  }

  content.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>${CURRENT_ADVOCATES.length} Advocate${CURRENT_ADVOCATES.length === 1 ? '' : 's'}</h3>
        <button class="btn btn-gold" onclick="openAdvocateModal()">+ Add Advocate</button>
      </div>
      ${CURRENT_ADVOCATES.length ? `
        <table>
          <thead><tr><th></th><th>Name</th><th>City</th><th>Fee</th><th>Rating</th><th>Available</th><th>Featured</th><th></th></tr></thead>
          <tbody>
            ${CURRENT_ADVOCATES.map((a) => `
              <tr>
                <td><img class="thumb" src="${esc(a.photo_url || 'https://placehold.co/60x60')}" alt=""></td>
                <td><strong>${esc(a.name)}</strong><br><span style="color:var(--text-muted);font-size:0.75rem;">${esc(a.slug)}</span></td>
                <td>${esc(a.city || '—')}</td>
                <td>₹${a.consultation_fee || 0}/${esc(a.fee_unit || '')}</td>
                <td>${a.rating || 0}★ (${a.review_count || 0})</td>
                <td><span class="badge ${a.is_available ? 'on' : 'off'}">${a.is_available ? 'Available' : 'Unavailable'}</span></td>
                <td><span class="badge ${a.is_featured ? 'on' : 'off'}">${a.is_featured ? 'Featured' : '—'}</span></td>
                <td class="row-actions">
                  <button class="btn btn-outline btn-sm" onclick="openAdvocateModal('${a.id}')">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteAdvocate('${a.id}','${esc(a.name)}')">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<div class="empty-state">No advocates yet. Click "Add Advocate" to create the first profile.</div>'}
    </div>
  `;
}

function whyChooseFields(item) {
  return `
    <div class="form-grid">
      <div class="field full"><label>Title</label><input name="title" value="${esc(item.title)}"></div>
      <div class="field full"><label>Description</label><textarea name="desc">${esc(item.desc)}</textarea></div>
    </div>`;
}
function practiceAreaFields(item) {
  return `
    <div class="form-grid">
      <div class="field full"><label>Title</label><input name="title" value="${esc(item.title)}"></div>
      <div class="field full"><label>Description</label><textarea name="desc">${esc(item.desc)}</textarea></div>
    </div>`;
}
function achievementFields(item) {
  return `
    <div class="form-grid">
      <div class="field full"><label>Title</label><input name="title" value="${esc(item.title)}"></div>
      <div class="field full"><label>Description</label><textarea name="desc">${esc(item.desc)}</textarea></div>
    </div>`;
}
function reviewFields(item) {
  return `
    <div class="form-grid">
      <div class="field"><label>Client Name</label><input name="name" value="${esc(item.name)}"></div>
      <div class="field"><label>Case Label</label><input name="case" value="${esc(item.case)}"></div>
      <div class="field full"><label>Review Text</label><textarea name="text">${esc(item.text)}</textarea></div>
    </div>`;
}
function feeFields(item) {
  return `
    <div class="form-grid">
      <div class="field"><label>Package Name</label><input name="name" value="${esc(item.name)}"></div>
      <div class="field"><label>Type / Subtitle</label><input name="type" value="${esc(item.type)}"></div>
      <div class="field"><label>Original Price (optional)</label><input name="original_price" value="${esc(item.original_price)}"></div>
      <div class="field"><label>Price</label><input name="price" value="${esc(item.price)}"></div>
      <div class="field"><label>Save Text (optional)</label><input name="save_text" value="${esc(item.save_text)}"></div>
      <div class="field"><label>Button Text</label><input name="button_text" value="${esc(item.button_text || 'Book Now')}"></div>
      <div class="field full"><label>Inclusions (comma-separated)</label><input name="inclusions" data-list="true" value="${esc((item.inclusions || []).join(', '))}"></div>
      <div class="field"><label><input type="checkbox" name="featured" ${item.featured ? 'checked' : ''} style="width:auto;display:inline;"> Featured / Most Popular</label></div>
    </div>`;
}

function bioParagraphFields(text) {
  return `<div class="field full"><textarea name="para">${esc(text)}</textarea></div>`;
}

function openAdvocateModal(id) {
  const adv = id ? CURRENT_ADVOCATES.find((a) => a.id === id) : {};
  const isEdit = !!id;

  openModal(`
    <h3>${isEdit ? 'Edit' : 'Add'} Advocate</h3>
    <form id="advocate-form">
      <h4 style="margin:14px 0 8px;color:var(--gold);font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;">Basic Details</h4>
      <div class="form-grid">
        <div class="field full"><label>Full Name *</label><input name="name" value="${esc(adv.name)}" required></div>
        <div class="field"><label>Slug (URL) — leave blank to auto-generate</label><input name="slug" value="${esc(adv.slug)}"></div>
        <div class="field"><label>Designation</label><input name="designation" value="${esc(adv.designation)}"></div>
        <div class="field"><label>Court</label><input name="court" value="${esc(adv.court)}"></div>
        <div class="field"><label>City</label><input name="city" value="${esc(adv.city)}"></div>
        <div class="field"><label>State</label><input name="state" value="${esc(adv.state)}"></div>
        <div class="field"><label>Experience (years)</label><input type="number" name="experience_years" value="${adv.experience_years || 0}"></div>
        <div class="field"><label>Cases Won</label><input type="number" name="cases_won" value="${adv.cases_won || 0}"></div>
        <div class="field"><label>Rating (0-5)</label><input type="number" step="0.1" name="rating" value="${adv.rating || 5}"></div>
        <div class="field"><label>Review Count</label><input type="number" name="review_count" value="${adv.review_count || 0}"></div>
        <div class="field"><label>Success Rate (%)</label><input type="number" name="success_rate" value="${adv.success_rate || 0}"></div>
        <div class="field"><label>Sort Order</label><input type="number" name="sort_order" value="${adv.sort_order || 0}"></div>
        <div class="field"><label>Languages (comma-separated)</label><input name="languages" data-list="true" value="${esc((adv.languages || []).join(', '))}"></div>
        <div class="field"><label>Practice Tags (comma-separated)</label><input name="practice_tags" data-list="true" value="${esc((adv.practice_tags || []).join(', '))}"></div>
        <div class="field"><label>Consultation Fee (₹)</label><input type="number" name="consultation_fee" value="${adv.consultation_fee || 0}"></div>
        <div class="field"><label>Fee Unit</label><input name="fee_unit" value="${esc(adv.fee_unit || 'session')}"></div>
        <div class="field"><label>Bar Council Text</label><input name="bar_council_text" value="${esc(adv.bar_council_text)}"></div>
        <div class="field"><label><input type="checkbox" name="is_available" ${adv.is_available !== false ? 'checked' : ''} style="width:auto;display:inline;"> Available</label></div>
        <div class="field"><label><input type="checkbox" name="is_featured" ${adv.is_featured ? 'checked' : ''} style="width:auto;display:inline;"> Featured on homepage</label></div>
        <div class="field full">
          <label>Profile Photo</label>
          ${adv.photo_url ? `<img src="${esc(adv.photo_url)}" class="img-preview">` : ''}
          <input type="file" id="photo-file" accept="image/*">
          <input type="hidden" name="photo_url" value="${esc(adv.photo_url || '')}">
        </div>
        <div class="field full"><label>Short Bio (shown on homepage card & profile intro)</label><textarea name="short_bio">${esc(adv.short_bio)}</textarea></div>
        <div class="field"><label>Phone</label><input name="phone" value="${esc(adv.phone)}"></div>
        <div class="field"><label>WhatsApp</label><input name="whatsapp" value="${esc(adv.whatsapp)}"></div>
        <div class="field"><label>Email</label><input name="email" value="${esc(adv.email)}"></div>
        <div class="field"><label>Office Address</label><input name="address" value="${esc(adv.address)}"></div>
        <div class="field"><label>SEO Meta Title</label><input name="meta_title" value="${esc(adv.meta_title)}"></div>
        <div class="field full"><label>SEO Meta Description</label><textarea name="meta_description">${esc(adv.meta_description)}</textarea></div>
      </div>

      <h4 style="margin:20px 0 8px;color:var(--gold);font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;">About Page — Long Bio Paragraphs</h4>
      <div id="bio-paragraphs">${(adv.long_bio || []).map((p) => bioParagraphFields(p)).join('')}</div>
      <button type="button" class="btn btn-outline btn-sm add-repeat-btn" onclick="document.getElementById('bio-paragraphs').insertAdjacentHTML('beforeend', bioParagraphFields(''))">+ Add Paragraph</button>

      <div class="form-grid" style="margin-top:14px;">
        <div class="field full"><label>Pull Quote</label><textarea name="quote">${esc(adv.quote)}</textarea></div>
        <div class="field full"><label>Quote Attribution</label><input name="quote_attribution" value="${esc(adv.quote_attribution)}"></div>
      </div>

      <h4 style="margin:20px 0 8px;color:var(--gold);font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;">Why Choose This Advocate</h4>
      <div id="why-choose-list"></div>
      <button type="button" class="btn btn-outline btn-sm add-repeat-btn" onclick="addRepeatBlock('why-choose-list', whyChooseFields)">+ Add Item</button>

      <h4 style="margin:20px 0 8px;color:var(--gold);font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;">Practice Areas (on profile page)</h4>
      <div id="practice-areas-list"></div>
      <button type="button" class="btn btn-outline btn-sm add-repeat-btn" onclick="addRepeatBlock('practice-areas-list', practiceAreaFields)">+ Add Item</button>

      <h4 style="margin:20px 0 8px;color:var(--gold);font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;">Fee Packages</h4>
      <div id="fees-list"></div>
      <button type="button" class="btn btn-outline btn-sm add-repeat-btn" onclick="addRepeatBlock('fees-list', feeFields)">+ Add Package</button>

      <h4 style="margin:20px 0 8px;color:var(--gold);font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;">Achievements</h4>
      <div id="achievements-list"></div>
      <button type="button" class="btn btn-outline btn-sm add-repeat-btn" onclick="addRepeatBlock('achievements-list', achievementFields)">+ Add Achievement</button>

      <h4 style="margin:20px 0 8px;color:var(--gold);font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;">Client Reviews</h4>
      <div id="reviews-list"></div>
      <button type="button" class="btn btn-outline btn-sm add-repeat-btn" onclick="addRepeatBlock('reviews-list', reviewFields)">+ Add Review</button>

      <div class="modal-actions">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-gold" id="save-advocate-btn">${isEdit ? 'Save Changes' : 'Create Advocate'}</button>
      </div>
    </form>
  `);

  renderRepeatList('why-choose-list', adv.why_choose, whyChooseFields);
  renderRepeatList('practice-areas-list', adv.practice_areas, practiceAreaFields);
  renderRepeatList('fees-list', adv.fee_structure, feeFields);
  renderRepeatList('achievements-list', adv.achievements, achievementFields);
  renderRepeatList('reviews-list', adv.reviews, reviewFields);

  document.getElementById('photo-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    toast('Uploading image…');
    try {
      const { url } = await AdminAPI.uploadImage(file, 'advocates');
      document.querySelector('#advocate-form [name="photo_url"]').value = url;
      toast('Image uploaded.');
    } catch (err) {
      toast(err.message, true);
    }
  });

  document.getElementById('advocate-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const payload = {
      name: fd.get('name'),
      slug: fd.get('slug') || undefined,
      designation: fd.get('designation'),
      court: fd.get('court'),
      city: fd.get('city'),
      state: fd.get('state'),
      experience_years: Number(fd.get('experience_years')) || 0,
      cases_won: Number(fd.get('cases_won')) || 0,
      rating: Number(fd.get('rating')) || 0,
      review_count: Number(fd.get('review_count')) || 0,
      success_rate: Number(fd.get('success_rate')) || 0,
      sort_order: Number(fd.get('sort_order')) || 0,
      languages: (fd.get('languages') || '').split(',').map((s) => s.trim()).filter(Boolean),
      practice_tags: (fd.get('practice_tags') || '').split(',').map((s) => s.trim()).filter(Boolean),
      consultation_fee: Number(fd.get('consultation_fee')) || 0,
      fee_unit: fd.get('fee_unit'),
      bar_council_text: fd.get('bar_council_text'),
      is_available: form.querySelector('[name="is_available"]').checked,
      is_featured: form.querySelector('[name="is_featured"]').checked,
      photo_url: fd.get('photo_url'),
      short_bio: fd.get('short_bio'),
      phone: fd.get('phone'),
      whatsapp: fd.get('whatsapp'),
      email: fd.get('email'),
      address: fd.get('address'),
      meta_title: fd.get('meta_title'),
      meta_description: fd.get('meta_description'),
      long_bio: Array.from(document.querySelectorAll('#bio-paragraphs textarea[name="para"]')).map((t) => t.value).filter(Boolean),
      quote: fd.get('quote'),
      quote_attribution: fd.get('quote_attribution'),
      why_choose: collectRepeatList('why-choose-list', ['title', 'desc']),
      practice_areas: collectRepeatList('practice-areas-list', ['title', 'desc']),
      fee_structure: collectRepeatList('fees-list', ['name', 'type', 'original_price', 'price', 'save_text', 'button_text', 'inclusions', 'featured']),
      achievements: collectRepeatList('achievements-list', ['title', 'desc']),
      reviews: collectRepeatList('reviews-list', ['name', 'case', 'text']),
    };

    const btn = document.getElementById('save-advocate-btn');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      if (isEdit) await AdminAPI.put(`/admin/advocates/${id}`, payload);
      else await AdminAPI.post('/admin/advocates', payload);
      toast('Advocate saved.');
      closeModal();
      renderAdvocatesView();
    } catch (err) {
      toast(err.message, true);
      btn.disabled = false;
      btn.textContent = isEdit ? 'Save Changes' : 'Create Advocate';
    }
  });
}

async function deleteAdvocate(id, name) {
  if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
  try {
    await AdminAPI.del(`/admin/advocates/${id}`);
    toast('Advocate deleted.');
    renderAdvocatesView();
  } catch (err) {
    toast(err.message, true);
  }
}

// ============================================================================
// HOMEPAGE CONTENT
// ============================================================================
async function renderHomepageView() {
  const content = document.getElementById('content');
  let sections = {};
  try {
    const rows = await AdminAPI.get('/admin/homepage');
    rows.forEach((r) => { sections[r.section_key] = r.content; });
  } catch (err) {
    content.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
    return;
  }

  const hero = sections.hero || {};
  const footer = sections.footer || {};
  const settings = sections.site_settings || {};
  const stats = (sections.stats || {}).items || [];

  content.innerHTML = `
    <div class="card">
      <div class="card-header"><h3>Hero Banner</h3></div>
      <form id="hero-form" class="form-grid">
        <div class="field full"><label>Heading</label><input name="heading" value="${esc(hero.heading)}"></div>
        <div class="field full"><label>Subheading</label><textarea name="subheading">${esc(hero.subheading)}</textarea></div>
        <div class="full" style="text-align:right;"><button class="btn btn-gold btn-sm">Save Hero</button></div>
      </form>
    </div>

    <div class="card">
      <div class="card-header"><h3>Stats Strip</h3></div>
      <div id="stats-list"></div>
      <button type="button" class="btn btn-outline btn-sm add-repeat-btn" onclick="addRepeatBlock('stats-list', statFields)">+ Add Stat</button>
      <div style="text-align:right;margin-top:12px;"><button class="btn btn-gold btn-sm" onclick="saveStats()">Save Stats</button></div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Footer</h3></div>
      <form id="footer-form" class="form-grid">
        <div class="field full"><label>Tagline</label><input name="tagline" value="${esc(footer.tagline)}"></div>
        <div class="field"><label>Phone</label><input name="phone" value="${esc(footer.phone)}"></div>
        <div class="field"><label>Email</label><input name="email" value="${esc(footer.email)}"></div>
        <div class="field"><label>WhatsApp</label><input name="whatsapp" value="${esc(footer.whatsapp)}"></div>
        <div class="full" style="text-align:right;"><button class="btn btn-gold btn-sm">Save Footer</button></div>
      </form>
    </div>

    <div class="card">
      <div class="card-header"><h3>Site Settings</h3></div>
      <form id="settings-form" class="form-grid">
        <div class="field"><label>Site Name</label><input name="site_name" value="${esc(settings.site_name)}"></div>
        <div class="field"><label>Logo URL</label><input name="logo_url" value="${esc(settings.logo_url)}"></div>
        <div class="field"><label>Facebook URL</label><input name="facebook" value="${esc((settings.social_links || {}).facebook)}"></div>
        <div class="field"><label>Instagram URL</label><input name="instagram" value="${esc((settings.social_links || {}).instagram)}"></div>
        <div class="field"><label>Twitter/X URL</label><input name="twitter" value="${esc((settings.social_links || {}).twitter)}"></div>
        <div class="field"><label>LinkedIn URL</label><input name="linkedin" value="${esc((settings.social_links || {}).linkedin)}"></div>
        <div class="full" style="text-align:right;"><button class="btn btn-gold btn-sm">Save Settings</button></div>
      </form>
    </div>
  `;

  renderRepeatList('stats-list', stats, statFields);

  document.getElementById('hero-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await saveSection('hero', { heading: fd.get('heading'), subheading: fd.get('subheading') });
  });
  document.getElementById('footer-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await saveSection('footer', { tagline: fd.get('tagline'), phone: fd.get('phone'), email: fd.get('email'), whatsapp: fd.get('whatsapp') });
  });
  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await saveSection('site_settings', {
      site_name: fd.get('site_name'),
      logo_url: fd.get('logo_url'),
      social_links: { facebook: fd.get('facebook'), instagram: fd.get('instagram'), twitter: fd.get('twitter'), linkedin: fd.get('linkedin') },
    });
  });
}

function statFields(item) {
  return `
    <div class="form-grid">
      <div class="field"><label>Number</label><input name="number" type="number" value="${item.number || 0}"></div>
      <div class="field"><label>Suffix</label><input name="suffix" value="${esc(item.suffix || '+')}"></div>
      <div class="field"><label>Label</label><input name="label" value="${esc(item.label)}"></div>
    </div>`;
}

async function saveStats() {
  const items = collectRepeatList('stats-list', ['number', 'suffix', 'label']).map((s) => ({ ...s, number: Number(s.number) || 0 }));
  await saveSection('stats', { items });
}

async function saveSection(key, content) {
  try {
    await AdminAPI.put(`/admin/homepage/${key}`, { content });
    toast('Saved.');
  } catch (err) {
    toast(err.message, true);
  }
}

// ============================================================================
// PRACTICE AREAS
// ============================================================================
async function renderPracticeAreasView() {
  const content = document.getElementById('content');
  let areas;
  try {
    areas = await AdminAPI.get('/admin/practice-areas');
  } catch (err) {
    content.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
    return;
  }

  content.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>${areas.length} Practice Area${areas.length === 1 ? '' : 's'}</h3>
        <button class="btn btn-gold" onclick="openPracticeAreaModal()">+ Add Practice Area</button>
      </div>
      ${areas.length ? `
        <table>
          <thead><tr><th>Title</th><th>Description</th><th>Sort</th><th>Active</th><th></th></tr></thead>
          <tbody>
            ${areas.map((a) => `
              <tr>
                <td><strong>${esc(a.title)}</strong></td>
                <td>${esc(a.description)}</td>
                <td>${a.sort_order}</td>
                <td><span class="badge ${a.is_active ? 'on' : 'off'}">${a.is_active ? 'Active' : 'Hidden'}</span></td>
                <td class="row-actions">
                  <button class="btn btn-outline btn-sm" onclick='openPracticeAreaModal(${JSON.stringify(a)})'>Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="deletePracticeArea('${a.id}')">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<div class="empty-state">No practice areas yet.</div>'}
    </div>
  `;
}

function openPracticeAreaModal(area) {
  area = area || {};
  const isEdit = !!area.id;
  openModal(`
    <h3>${isEdit ? 'Edit' : 'Add'} Practice Area</h3>
    <form id="pa-form" class="form-grid">
      <div class="field full"><label>Title</label><input name="title" value="${esc(area.title)}" required></div>
      <div class="field full"><label>Description</label><input name="description" value="${esc(area.description)}"></div>
      <div class="field"><label>Sort Order</label><input type="number" name="sort_order" value="${area.sort_order || 0}"></div>
      <div class="field"><label><input type="checkbox" name="is_active" ${area.is_active !== false ? 'checked' : ''} style="width:auto;display:inline;"> Active (visible on homepage)</label></div>
      <div class="full modal-actions">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button class="btn btn-gold">${isEdit ? 'Save' : 'Create'}</button>
      </div>
    </form>
  `);

  document.getElementById('pa-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      title: fd.get('title'),
      description: fd.get('description'),
      sort_order: Number(fd.get('sort_order')) || 0,
      is_active: e.target.querySelector('[name="is_active"]').checked,
    };
    try {
      if (isEdit) await AdminAPI.put(`/admin/practice-areas/${area.id}`, payload);
      else await AdminAPI.post('/admin/practice-areas', payload);
      toast('Saved.');
      closeModal();
      renderPracticeAreasView();
    } catch (err) {
      toast(err.message, true);
    }
  });
}

async function deletePracticeArea(id) {
  if (!confirm('Delete this practice area?')) return;
  try {
    await AdminAPI.del(`/admin/practice-areas/${id}`);
    toast('Deleted.');
    renderPracticeAreasView();
  } catch (err) {
    toast(err.message, true);
  }
}

// ============================================================================
// TESTIMONIALS
// ============================================================================
async function renderTestimonialsView() {
  const content = document.getElementById('content');
  let items;
  try {
    items = await AdminAPI.get('/admin/testimonials');
  } catch (err) {
    content.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
    return;
  }

  content.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>${items.length} Testimonial${items.length === 1 ? '' : 's'}</h3>
        <button class="btn btn-gold" onclick="openTestimonialModal()">+ Add Testimonial</button>
      </div>
      ${items.length ? `
        <table>
          <thead><tr><th>Client</th><th>Review</th><th>Rating</th><th>Featured</th><th></th></tr></thead>
          <tbody>
            ${items.map((t) => `
              <tr>
                <td><strong>${esc(t.client_name)}</strong><br><span style="color:var(--text-muted);font-size:0.75rem;">${esc(t.client_city)}</span></td>
                <td style="max-width:320px;">${esc((t.review_text || '').slice(0, 90))}${(t.review_text || '').length > 90 ? '…' : ''}</td>
                <td>${t.rating}★</td>
                <td><span class="badge ${t.is_featured ? 'on' : 'off'}">${t.is_featured ? 'Shown' : 'Hidden'}</span></td>
                <td class="row-actions">
                  <button class="btn btn-outline btn-sm" onclick='openTestimonialModal(${JSON.stringify(t)})'>Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteTestimonial('${t.id}')">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<div class="empty-state">No testimonials yet.</div>'}
    </div>
  `;
}

function openTestimonialModal(t) {
  t = t || {};
  const isEdit = !!t.id;
  openModal(`
    <h3>${isEdit ? 'Edit' : 'Add'} Testimonial</h3>
    <form id="testi-form" class="form-grid">
      <div class="field"><label>Client Name</label><input name="client_name" value="${esc(t.client_name)}" required></div>
      <div class="field"><label>Client City</label><input name="client_city" value="${esc(t.client_city)}"></div>
      <div class="field"><label>Rating (1-5)</label><input type="number" min="1" max="5" name="rating" value="${t.rating || 5}"></div>
      <div class="field"><label>Sort Order</label><input type="number" name="sort_order" value="${t.sort_order || 0}"></div>
      <div class="field full"><label>Review Text</label><textarea name="review_text" required>${esc(t.review_text)}</textarea></div>
      <div class="field full"><label>Photo URL (optional)</label><input name="photo_url" value="${esc(t.photo_url)}"></div>
      <div class="field"><label><input type="checkbox" name="is_featured" ${t.is_featured !== false ? 'checked' : ''} style="width:auto;display:inline;"> Show on homepage</label></div>
      <div class="full modal-actions">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button class="btn btn-gold">${isEdit ? 'Save' : 'Create'}</button>
      </div>
    </form>
  `);

  document.getElementById('testi-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      client_name: fd.get('client_name'),
      client_city: fd.get('client_city'),
      rating: Number(fd.get('rating')) || 5,
      sort_order: Number(fd.get('sort_order')) || 0,
      review_text: fd.get('review_text'),
      photo_url: fd.get('photo_url'),
      is_featured: e.target.querySelector('[name="is_featured"]').checked,
    };
    try {
      if (isEdit) await AdminAPI.put(`/admin/testimonials/${t.id}`, payload);
      else await AdminAPI.post('/admin/testimonials', payload);
      toast('Saved.');
      closeModal();
      renderTestimonialsView();
    } catch (err) {
      toast(err.message, true);
    }
  });
}

async function deleteTestimonial(id) {
  if (!confirm('Delete this testimonial?')) return;
  try {
    await AdminAPI.del(`/admin/testimonials/${id}`);
    toast('Deleted.');
    renderTestimonialsView();
  } catch (err) {
    toast(err.message, true);
  }
}

// ============================================================================
// CONSULTATIONS
// ============================================================================
async function renderConsultationsView() {
  const content = document.getElementById('content');
  let items;
  try {
    items = await AdminAPI.get('/admin/consultations');
  } catch (err) {
    content.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
    return;
  }

  content.innerHTML = `
    <div class="card">
      <div class="card-header"><h3>${items.length} Consultation Request${items.length === 1 ? '' : 's'}</h3></div>
      ${items.length ? `
        <table>
          <thead><tr><th>Name</th><th>Contact</th><th>Advocate</th><th>Message</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${items.map((c) => `
              <tr>
                <td><strong>${esc(c.name)}</strong><br><span style="color:var(--text-muted);font-size:0.75rem;">${new Date(c.created_at).toLocaleDateString()}</span></td>
                <td>${esc(c.phone)}<br>${esc(c.email || '')}</td>
                <td>${esc(c.advocates?.name || '—')}</td>
                <td style="max-width:260px;">${esc(c.message || '')}</td>
                <td>
                  <select onchange="updateConsultationStatus('${c.id}', this.value)">
                    ${['new', 'contacted', 'closed'].map((s) => `<option value="${s}" ${c.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                  </select>
                </td>
                <td><button class="btn btn-danger btn-sm" onclick="deleteConsultation('${c.id}')">Delete</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<div class="empty-state">No consultation requests yet.</div>'}
    </div>
  `;
}

async function updateConsultationStatus(id, status) {
  try {
    await AdminAPI.put(`/admin/consultations/${id}`, { status });
    toast('Status updated.');
  } catch (err) {
    toast(err.message, true);
  }
}

async function deleteConsultation(id) {
  if (!confirm('Delete this consultation request?')) return;
  try {
    await AdminAPI.del(`/admin/consultations/${id}`);
    toast('Deleted.');
    renderConsultationsView();
  } catch (err) {
    toast(err.message, true);
  }
}

// ============================================================================
// SETTINGS
// ============================================================================
function renderSettingsView() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="card" style="max-width:420px;">
      <div class="card-header"><h3>Change Password</h3></div>
      <form id="pw-form">
        <div class="field"><label>Current Password</label><input type="password" name="currentPassword" required></div>
        <div class="field"><label>New Password (min 8 characters)</label><input type="password" name="newPassword" minlength="8" required></div>
        <button class="btn btn-gold">Update Password</button>
      </form>
    </div>
  `;
  document.getElementById('pw-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await AdminAPI.post('/auth/change-password', { currentPassword: fd.get('currentPassword'), newPassword: fd.get('newPassword') });
      toast('Password updated.');
      e.target.reset();
    } catch (err) {
      toast(err.message, true);
    }
  });
}

// ============================================================================
// INIT
// ============================================================================
(async function init() {
  const admin = await guardDashboard();
  if (!admin) return;
  document.getElementById('admin-name').textContent = admin.email;
  navigate('advocates');
})();
