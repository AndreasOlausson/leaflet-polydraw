import { copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const sourceReadme = resolve(scriptDir, '..', '..', 'README.md');
const targetReadme = resolve(scriptDir, '..', 'README.md');

if (!existsSync(sourceReadme)) {
  console.error(`Source README not found: ${sourceReadme}`);
  process.exit(1);
}

copyFileSync(sourceReadme, targetReadme);
console.log(`Synced README: ${sourceReadme} -> ${targetReadme}`);
