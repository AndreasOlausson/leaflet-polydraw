import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';

describe('Dependency validation for Polydraw plugin', () => {
  // const bannedModules = [
  //   '@turf/turf',
  //   'lodash',
  //   'moment',
  //   'underscore',
  //   'ramda',
  //   'axios',
  //   'jquery',
  // ];

  // describe('Disallowed node_modules folders', () => {
  //   for (const mod of bannedModules) {
  //     it(`should NOT have "${mod}" installed in node_modules`, () => {
  //       const modPath = `node_modules/${mod}`;
  //       expect(existsSync(modPath)).toBe(false);
  //     });
  //   }
  // });

  // describe('Forbidden dependencies in package.json', () => {
  //   const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  //   const allDeps = {
  //     ...pkg.dependencies,
  //     ...pkg.devDependencies,
  //     ...pkg.peerDependencies,
  //     ...pkg.optionalDependencies,
  //   };

  //   for (const dep of bannedModules) {
  //     it(`should NOT declare "${dep}" as a dependency`, () => {
  //       expect(allDeps[dep]).toBeUndefined();
  //     });
  //   }
  // });

  // describe('Modular Turf usage enforcement', () => {
  //   it('should only include used Turf modules (not whole @turf/turf)', () => {
  //     const turfPath = 'node_modules/@turf';
  //     if (existsSync(turfPath)) {
  //       const modules = readdirSync(turfPath);
  //       expect(modules.length).toBeGreaterThan(0);
  //       expect(modules).not.toContain('turf');
  //     }
  //   });
  // });

  describe('Turf import restrictions', () => {
    const allowedFiles = ['src/turf-helper.ts'];

    // Dynamically find all TypeScript files in src directory
    const getAllSourceFiles = (dir: string): string[] => {
      const files: string[] = [];
      if (existsSync(dir)) {
        const items = readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          const fullPath = `${dir}/${item.name}`;
          if (item.isDirectory()) {
            files.push(...getAllSourceFiles(fullPath));
          } else if (item.name.endsWith('.ts') && !item.name.endsWith('.d.ts')) {
            files.push(fullPath);
          }
        }
      }
      return files;
    };

    it('should only allow turf-helper.ts to import * as turf', () => {
      const allSourceFiles = getAllSourceFiles('src');

      for (const file of allSourceFiles) {
        const content = readFileSync(file, 'utf8');
        const hasWildcardTurfImport = /import\s+\*\s+as\s+turf\s+from/.test(content);

        if (allowedFiles.includes(file)) {
          // turf-helper.ts is allowed to import * as turf
          expect(hasWildcardTurfImport).toBe(true);
        } else {
          // ALL other files should NOT import * as turf
          expect(hasWildcardTurfImport).toBe(false);
        }
      }
    });

    it('should use specific turf imports in non-helper files', () => {
      const allSourceFiles = getAllSourceFiles('src');
      const restrictedFiles = allSourceFiles.filter((file) => !allowedFiles.includes(file));

      for (const file of restrictedFiles) {
        const content = readFileSync(file, 'utf8');
        const hasWildcardImport = /import\s+\*\s+as\s+turf\s+from/.test(content);
        const hasSpecificImports = /import\s+\{[^}]+\}\s+from\s+['"]@turf\//.test(content);

        if (content.includes('turf')) {
          expect(hasWildcardImport).toBe(false);
          // If using turf, should use specific imports
          expect(hasSpecificImports).toBe(true);
        }
      }
    });
  });

  //   describe('5. Bundle size check (UMD)', () => {
  //     it('should keep UMD bundle size under 100 KB (gzipped)', () => {
  //       const path = 'dist/polydraw.umd.js';
  //       if (existsSync(path)) {
  //         const stats = statSync(path);
  //         expect(stats.size).toBeLessThan(100 * 1024); // 100 KB
  //       }
  //     });
  //   });
});
