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

    it('should only allow turf-helper.ts to import any Turf packages', () => {
      const allSourceFiles = getAllSourceFiles('src');

      for (const file of allSourceFiles) {
        const content = readFileSync(file, 'utf8');

        // Detect ANY @turf/ import (wildcard, specific, default, multi-line)
        const hasTurfImport = /import[\s\S]*?from\s+['"]@turf\//.test(content);

        if (allowedFiles.includes(file)) {
          // turf-helper.ts is allowed to import from @turf/
          // (We'll validate it has imports in a separate test)
        } else {
          // ALL other files should NOT import from @turf/
          expect(hasTurfImport).toBe(false);
        }
      }
    });

    it('should not have any Turf library references in non-helper files', () => {
      const allSourceFiles = getAllSourceFiles('src');
      const restrictedFiles = allSourceFiles.filter((file) => !allowedFiles.includes(file));

      for (const file of restrictedFiles) {
        const content = readFileSync(file, 'utf8');

        // Check for any @turf/ imports
        const hasTurfImport = /import[\s\S]*?from\s+['"]@turf\//.test(content);

        // Check for legitimate turf imports (from turf-helper or similar)
        const hasLegitTurfImport = /import[\s\S]*?turf[\s\S]*?from\s+['"]\.\//.test(content);

        // Check for direct turf.* calls
        const hasDirectTurfUsage = /\bturf\.[a-zA-Z]/.test(content);

        // Extract imported Turf function names to check for direct calls
        const turfImportMatches = content.match(/import\s+\{([^}]+)\}\s+from\s+['"]@turf\//g);
        const importedTurfFunctions: string[] = [];

        if (turfImportMatches) {
          turfImportMatches.forEach((match) => {
            const functionsMatch = match.match(/\{([^}]+)\}/);
            if (functionsMatch) {
              const functions = functionsMatch[1]
                .split(',')
                .map((f) => f.trim().split(' as ')[0].trim())
                .filter((f) => f.length > 0);
              importedTurfFunctions.push(...functions);
            }
          });
        }

        // Check for calls to imported Turf functions
        let hasImportedTurfFunctionCalls = false;
        for (const funcName of importedTurfFunctions) {
          const funcCallRegex = new RegExp(`\\b${funcName}\\s*\\(`, 'g');
          if (funcCallRegex.test(content)) {
            hasImportedTurfFunctionCalls = true;
            break;
          }
        }

        // No Turf imports should exist in non-helper files
        expect(hasTurfImport).toBe(false);

        // Only block direct turf.* calls if there's no legitimate turf import
        if (hasDirectTurfUsage && !hasLegitTurfImport) {
          expect(hasDirectTurfUsage).toBe(false);
        }

        // No calls to imported Turf functions should exist
        expect(hasImportedTurfFunctionCalls).toBe(false);
      }
    });

    it('should validate that turf-helper.ts imports Turf somehow', () => {
      const turfHelperPath = 'src/turf-helper.ts';

      // Ensure turf-helper.ts exists
      expect(existsSync(turfHelperPath)).toBe(true);

      const content = readFileSync(turfHelperPath, 'utf8');

      // Check for ANY @turf/ import (flexible - allows any import style)
      const hasTurfImport = /import[\s\S]*?from\s+['"]@turf\//.test(content);

      // turf-helper.ts SHOULD have some kind of Turf import
      expect(hasTurfImport).toBe(true);
    });
  });
});
