import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, normalize } from 'node:path';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const packed = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'], { encoding: 'utf8' }))[0];
const contents = new Set(packed.files.map(({ path }) => normalize(path)));
const required = new Set();

function addEntry(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid package ${label} entry: ${JSON.stringify(value)}`);
  }
  const path = normalize(value.replace(/^\.\//, ''));
  if (path === '..' || path.startsWith(`..${join('', '/')}`) || path.startsWith('/')) {
    throw new Error(`Package ${label} entry must stay inside the package: ${value}`);
  }
  required.add(path);
}

for (const [name, target] of Object.entries(pkg.bin ?? {})) addEntry(target, `bin.${name}`);
function collectExports(value, label = 'exports') {
  if (typeof value === 'string') addEntry(value, label);
  else if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, target] of Object.entries(value)) collectExports(target, `${label}.${key}`);
  }
}
collectExports(pkg.exports);

const missing = [...required].filter((path) => !contents.has(path));
if (missing.length) {
  console.error(`npm pack is missing declared package entries: ${missing.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`Verified ${required.size} declared package entry point(s) in npm pack output.`);
}
