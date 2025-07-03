import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';

describe('Dependency validation for Polydraw plugin', () => {
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

        // Check for direct Turf library usage (not TurfHelper usage)
        const hasDirectTurfUsage = /\bturf\.[a-zA-Z]/.test(content);

        if (hasDirectTurfUsage) {
          expect(hasWildcardImport).toBe(false);
          // If using turf directly, should use specific imports
          expect(hasSpecificImports).toBe(true);
        }
      }
    });

    it('should validate that turf-helper.ts correctly imports * as turf', () => {
      const turfHelperPath = 'src/turf-helper.ts';

      // Ensure turf-helper.ts exists
      expect(existsSync(turfHelperPath)).toBe(true);

      const content = readFileSync(turfHelperPath, 'utf8');
      const hasWildcardTurfImport = /import\s+\*\s+as\s+turf\s+from\s+['"]@turf\/turf['"]/.test(
        content,
      );

      // turf-helper.ts SHOULD have the wildcard import
      expect(hasWildcardTurfImport).toBe(true);
    });
  });
});
