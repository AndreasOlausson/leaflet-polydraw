import { TurfHelper } from '../src/turf-helper';
import defaultConfig from '../src/config.json';
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { Feature, MultiPolygon, Point, Polygon, Position } from 'geojson';

describe('TurfHelper', () => {
  let turfHelper: TurfHelper;

  beforeEach(() => {
    // Create the helper with default config
    turfHelper = new TurfHelper(defaultConfig);
  });

  it('can be instantiated', () => {
    expect(turfHelper).toBeInstanceOf(TurfHelper);
  });

  it('can generate a concave polygon from square points', () => {
    const squareFeature: Feature<Polygon> = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [0, 2],
            [2, 2],
            [2, 0],
            [0, 0], // close the loop
          ],
        ],
      },
      properties: {},
    };

    const result = turfHelper.turfConcaveman(squareFeature);

    expect(result.type).toBe('Feature');
    expect(result.geometry.type).toBe('MultiPolygon');
    expect(result.geometry.coordinates.length).toBe(1);
    expect(result.geometry.coordinates[0][0].length).toBeGreaterThanOrEqual(3);
  });

  it('can generate a concave polygon from a highly complex shape', () => {
    const complexFeature: Feature<Polygon> = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [4, 10],
            [5, 2],
            [10, 10],
            [8, 0],
            [12, -4],
            [7, -6],
            [10, -12],
            [4, -10],
            [0, -15],
            [-4, -10],
            [-10, -12],
            [-7, -6],
            [-12, -4],
            [-8, 0],
            [-10, 10],
            [-5, 2],
            [-4, 10],
            [0, 0], // closed loop
          ],
        ],
      },
      properties: {},
    };

    const result = turfHelper.turfConcaveman(complexFeature);

    expect(result.type).toBe('Feature');
    expect(result.geometry.type).toBe('MultiPolygon');
    expect(result.geometry.coordinates.length).toBe(1);
    expect(result.geometry.coordinates[0][0].length).toBeGreaterThanOrEqual(3);
  });
});

describe('Dependency validation for Polydraw plugin', () => {
  const bannedModules = ['concaveman', 'this_package_does_not_exist_and_should_pass'];

  describe('Disallowed node_modules folders', () => {
    for (const mod of bannedModules) {
      it(`should NOT have "${mod}" installed in node_modules`, () => {
        const modPath = `node_modules/${mod}`;
        expect(existsSync(modPath)).toBe(false);
      });
    }
  });

  describe('Forbidden dependencies in package.json', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
      ...pkg.optionalDependencies,
    };

    for (const dep of bannedModules) {
      it(`should NOT declare "${dep}" as a dependency`, () => {
        expect(allDeps[dep]).toBeUndefined();
      });
    }

    it('should NOT contain "@turf/turf" in source files', () => {
      const basePath = './src';
      const sourceFiles = readdirSync(basePath);
      for (const file of sourceFiles) {
        const fullPath = `${basePath}/${file}`;
        if (statSync(fullPath).isDirectory()) continue;
        const content = readFileSync(fullPath, 'utf8');
        expect(content.includes('@turf/turf')).toBe(false);
      }
    });
    it('should NOT use concaveman in source files', () => {
      const basePath = './src';
      const sourceFiles = readdirSync(basePath);
      for (const file of sourceFiles) {
        const fullPath = `${basePath}/${file}`;
        if (statSync(fullPath).isDirectory()) continue;
        const content = readFileSync(fullPath, 'utf8');
        expect(content.includes('concaveman')).toBe(false);
      }
    });
    it('should import geojson types using "import type"', () => {
      const basePath = './src';
      const sourceFiles = readdirSync(basePath);
      const regex =
        /import\s+type\s+{[^}]*\bFeature\b[^}]*\bPolygon\b[^}]*\bMultiPolygon\b[^}]*\bPosition\b[^}]*\bPoint\b[^}]*}\s+from\s+['"]geojson['"]/s;
      let found = false;

      for (const file of sourceFiles) {
        const fullPath = `${basePath}/${file}`;
        if (statSync(fullPath).isDirectory()) continue;
        const content = readFileSync(fullPath, 'utf8');
        if (regex.test(content)) {
          found = true;
          break;
        }
      }

      expect(found).toBe(true);
    });
    it('should NOT import geojson types from "@turf/turf"', () => {
      const basePath = './src';
      const sourceFiles = readdirSync(basePath);
      const regex =
        /import\s+type?\s+{[^}]*\b(Feature|Polygon|MultiPolygon|Position|Point)\b(\s+as\s+\w+)?[^}]*}\s+from\s+['"]@turf\/turf['"]/s;
      for (const file of sourceFiles) {
        const fullPath = `${basePath}/${file}`;
        if (statSync(fullPath).isDirectory()) continue;
        const content = readFileSync(fullPath, 'utf8');
        expect(regex.test(content)).toBe(false);
      }
    });
    it('should use modular turf imports with alias', () => {
      const basePath = './src';
      const sourceFiles = readdirSync(basePath);
      const modularImportRegex =
        /import\s+{\s*\w+\s+as\s+turf[A-Z]\w*\s*}\s+from\s+['"]@turf\/[\w-]+['"]/g;
      const turfImportRegex = /from\s+['"]@turf\/turf['"]/;

      for (const file of sourceFiles) {
        const fullPath = `${basePath}/${file}`;
        if (statSync(fullPath).isDirectory()) continue;
        const content = readFileSync(fullPath, 'utf8');

        // Fail if legacy turf import is found
        expect(turfImportRegex.test(content)).toBe(false);

        // Require modular imports with alias (if turf module is imported)
        const usesTurfModule = /from\s+['"]@turf\/[\w-]+['"]/.test(content);
        if (usesTurfModule) {
          expect(modularImportRegex.test(content)).toBe(true);
        }
      }
    });
  });

  describe('Required types are importable', () => {
    it('should allow importing required geojson types', async () => {
      // This test is mostly symbolic – it confirms that the import does not crash
      const typesUsed: [Feature, Polygon, MultiPolygon, Position, Point] = [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} },
        {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 1],
              [0, 0],
            ],
          ],
        },
        {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [0, 0],
                [1, 1],
                [0, 0],
              ],
            ],
          ],
        },
        [0, 0],
        { type: 'Point', coordinates: [0, 0] },
      ];
      expect(typesUsed.length).toBe(5);
    });
  });
  //   describe('4. Bundle size check (UMD)', () => {
  //     it('should keep UMD bundle size under 100 KB (gzipped)', () => {
  //       const path = 'dist/polydraw.umd.js';
  //       if (existsSync(path)) {
  //         const stats = statSync(path);
  //         expect(stats.size).toBeLessThan(100 * 1024); // 100 KB
  //       }
  //     });
  //   });
});
