const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const roots = ['apps','packages'];
const exDirs = new Set(['node_modules','dist','build','.next','.turbo','.cache','coverage','out']);
const exFiles = [/\.d\.ts$/];

function shouldSkipDir(name){ return exDirs.has(name); }
function shouldCheckFile(file){
  if (!/\.(ts|tsx|js|jsx)$/.test(file)) return false;
  for (const rx of exFiles) if (rx.test(file)) return false;
  return true;
}

function walk(dir, out) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (!shouldSkipDir(f)) walk(p, out);
    } else {
      if (shouldCheckFile(p)) out.push(p);
    }
  }
}

function listAll(){
  const files = [];
  for (const r of roots) if (fs.existsSync(r)) walk(r, files);
  return files;
}

function listChanged(){
  try {
    // Prefer diff with origin/main if available
    const diff = cp.execSync('git diff --name-only origin/main...HEAD', { encoding: 'utf8' }).trim();
    return diff.split(/\r?\n/).filter(Boolean);
  } catch {
    try {
      const diff = cp.execSync('git diff --name-only HEAD^ HEAD', { encoding: 'utf8' }).trim();
      return diff.split(/\r?\n/).filter(Boolean);
    } catch {
      return [];
    }
  }
}

const onlyChanged = process.env.SPDX_ONLY_CHANGED === '1' || process.env.CI === '1';
const candidates = onlyChanged ? listChanged() : listAll();
const files = candidates
  .filter((p) => roots.some((r) => p.startsWith(r + path.sep)))
  .filter((p) => shouldCheckFile(p))
  .filter((p) => fs.existsSync(p));

const failed = [];
for (const p of files) {
  const s = fs.readFileSync(p, 'utf8');
  if (!s.includes('SPDX-License-Identifier: MIT')) failed.push(p);
}

if (failed.length) {
  console.error('Missing SPDX header in files:\n' + failed.join('\n'));
  process.exit(1);
} else {
  console.log(`All checked files have SPDX headers. Files checked: ${files.length}${onlyChanged ? ' (changed only)' : ''}`);
}
