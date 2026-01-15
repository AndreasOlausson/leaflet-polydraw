import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

const baseParserOptions = {
  ecmaVersion: 'latest',
  sourceType: 'module',
};

const basePlugins = {
  '@typescript-eslint': typescript,
  prettier: prettier,
};

const baseRules = {
  ...typescript.configs.recommended.rules,
  ...prettierConfig.rules,
  'prettier/prettier': 'error',
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-unused-vars': 'warn',
  '@typescript-eslint/no-unused-expressions': 'warn',
};

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: baseParserOptions,
      globals: {
        ...globals.browser,
        ...globals.es2021,
        L: 'readonly',
        GeoJSON: 'readonly',
      },
    },
    plugins: basePlugins,
    rules: baseRules,
  },
  {
    files: ['test/**/*.ts', 'test/**/*.tsx', '**/*.test.ts', '**/*.spec.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: baseParserOptions,
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node,
        L: 'readonly',
        // Vitest globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
        vitest: 'readonly',
        // Canvas API globals for test setup
        CanvasLineCap: 'readonly',
        CanvasLineJoin: 'readonly',
        GlobalCompositeOperation: 'readonly',
        CanvasTextAlign: 'readonly',
        CanvasTextBaseline: 'readonly',
        CanvasDirection: 'readonly',
      },
    },
    plugins: basePlugins,
    rules: baseRules,
  },
  {
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      'demo/dist/',
      '**/*.min.js',
      '**/*.bundle.js',
    ],
  },
];
