/* Enforce license allowlist for direct production deps */
const fs = require('fs');

const ALLOWED = new Set(['MIT','BSD','BSD-2-Clause','BSD-3-Clause','ISC','Apache-2.0','CC-BY-4.0','MPL-2.0']);

const data = JSON.parse(fs.readFileSync('LICENSES.json','utf8'));
const violations = [];
for (const [pkg, info] of Object.entries(data)) {
  const lic = String(info.licenses || '').trim();
  if (!ALLOWED.has(lic)) violations.push(`${pkg} -> ${lic}`);
}

if (violations.length) {
  console.error('License policy violations:\n' + violations.join('\n'));
  process.exit(1);
} else {
  console.log('License check passed.');
}

