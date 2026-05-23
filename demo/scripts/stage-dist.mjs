import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, '..');
const outputRoot = resolve(root, 'dist');
const wrapperDist = resolve(root, 'apps/wrapper/dist');
const v1Dist = resolve(root, 'apps/leaflet-v1/dist');
const v2Dist = resolve(root, 'apps/leaflet-v2/dist');

rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(outputRoot, { recursive: true });

const copyContents = (source, target) => {
  if (!existsSync(source)) {
    throw new Error(`Missing build output: ${source}`);
  }
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source)) {
    cpSync(resolve(source, entry), resolve(target, entry), { recursive: true });
  }
};

copyContents(wrapperDist, outputRoot);
copyContents(v1Dist, resolve(outputRoot, 'leaflet-v1'));
copyContents(v2Dist, resolve(outputRoot, 'leaflet-v2'));
