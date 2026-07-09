const slugifyLib = require('slugify');

// "Adv. Faheem Uddin" -> "adv-faheem-uddin" -> we strip the "adv" prefix
// so URLs read as advocate.html?slug=faheem-uddin
function slugify(name) {
  const base = slugifyLib(name, { lower: true, strict: true });
  return base.replace(/^adv-/, '');
}

module.exports = slugify;
