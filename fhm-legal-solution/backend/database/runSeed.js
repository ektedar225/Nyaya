// One-time bootstrap script.
// Run with:  npm run seed   (from the backend/ folder, after schema.sql has
// been executed in Supabase and your .env is filled in)
//
// This is idempotent-ish: it will skip creating the admin account if that
// email already exists, and skip advocates whose slug already exists, so
// it's safe to re-run if it fails partway through.

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { supabase } = require('../src/config/supabase');
const { advocates, practiceAreas, homepageContent, testimonials } = require('./seedData');

async function seedAdmin() {
  const email = (process.env.INITIAL_ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('⚠️  INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD not set — skipping admin creation.');
    return;
  }

  const { data: existing } = await supabase.from('admin_users').select('id').eq('email', email).maybeSingle();
  if (existing) {
    console.log(`ℹ️  Admin account ${email} already exists — skipping.`);
    return;
  }

  const password_hash = await bcrypt.hash(password, 12);
  const { error } = await supabase
    .from('admin_users')
    .insert({ name: 'Site Admin', email, password_hash });

  if (error) console.error('❌ Failed to create admin account:', error.message);
  else console.log(`✅ Admin account created: ${email}  (log in, then change this password immediately)`);
}

async function seedAdvocates() {
  for (const advocate of advocates) {
    const { data: existing } = await supabase
      .from('advocates')
      .select('id')
      .eq('slug', advocate.slug)
      .maybeSingle();

    if (existing) {
      console.log(`ℹ️  Advocate "${advocate.slug}" already exists — skipping.`);
      continue;
    }

    const { error } = await supabase.from('advocates').insert(advocate);
    if (error) console.error(`❌ Failed to seed advocate "${advocate.slug}":`, error.message);
    else console.log(`✅ Seeded advocate: ${advocate.name}`);
  }
}

async function seedPracticeAreas() {
  const { count } = await supabase.from('practice_areas').select('*', { count: 'exact', head: true });
  if (count && count > 0) {
    console.log('ℹ️  Practice areas already seeded — skipping.');
    return;
  }
  const { error } = await supabase.from('practice_areas').insert(practiceAreas);
  if (error) console.error('❌ Failed to seed practice areas:', error.message);
  else console.log(`✅ Seeded ${practiceAreas.length} practice areas.`);
}

async function seedHomepageContent() {
  for (const [section_key, content] of Object.entries(homepageContent)) {
    const { error } = await supabase
      .from('homepage_content')
      .upsert({ section_key, content }, { onConflict: 'section_key' });

    if (error) console.error(`❌ Failed to seed homepage section "${section_key}":`, error.message);
    else console.log(`✅ Seeded homepage section: ${section_key}`);
  }
}

async function seedTestimonials() {
  if (!testimonials.length) {
    console.log('ℹ️  No starter testimonials defined — add these from the admin dashboard.');
    return;
  }
  const { error } = await supabase.from('testimonials').insert(testimonials);
  if (error) console.error('❌ Failed to seed testimonials:', error.message);
  else console.log(`✅ Seeded ${testimonials.length} testimonials.`);
}

(async function main() {
  console.log('── Seeding FHM-Legal-Solution database ──');
  await seedAdmin();
  await seedAdvocates();
  await seedPracticeAreas();
  await seedHomepageContent();
  await seedTestimonials();
  console.log('── Done ──');
  process.exit(0);
})().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
