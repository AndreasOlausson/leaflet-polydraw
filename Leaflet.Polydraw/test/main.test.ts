import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('TypeScript Quality Control', () => {
  describe('ESLint "Unexpected any" warnings elimination', () => {
    it('should have ZERO "Unexpected any" warnings in polydraw.ts', () => {
      let unexpectedAnyCount = 0;

      try {
        // Run ESLint and count "Unexpected any" warnings
        const eslintOutput = execSync('npx eslint src/polydraw.ts', {
          encoding: 'utf8',
          cwd: process.cwd(),
        });

        // Count occurrences of "Unexpected any"
        unexpectedAnyCount = (eslintOutput.match(/Unexpected any/g) || []).length;
      } catch (error) {
        // ESLint returns non-zero exit code when warnings/errors are found
        // We need to parse the output from the error
        const eslintOutput = error.stdout || error.message || '';
        unexpectedAnyCount = (eslintOutput.match(/Unexpected any/g) || []).length;
      }

      // Log the current count for tracking
      console.log(`Current "Unexpected any" warnings: ${unexpectedAnyCount}`);

      // THE GOAL: Zero "any" types - this test should FAIL until we fix all of them
      if (unexpectedAnyCount > 0) {
        throw new Error(
          `Found ${unexpectedAnyCount} "Unexpected any" warnings. Goal is 0. Please fix all 'any' types before this test will pass.`,
        );
      }

      expect(unexpectedAnyCount).toBe(0);
    });
  });

  describe('TypeScript compilation', () => {
    it('should compile without TypeScript errors', () => {
      try {
        execSync('npx tsc --noEmit --skipLibCheck', {
          encoding: 'utf8',
          cwd: process.cwd(),
        });

        // If we get here, compilation succeeded
        expect(true).toBe(true);
      } catch (error) {
        // TypeScript compilation failed
        console.error('TypeScript compilation errors:', error.stdout || error.message);
        throw new Error('TypeScript compilation failed');
      }
    });
  });
});
