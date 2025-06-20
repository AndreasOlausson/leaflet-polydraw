module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        module: 'commonjs'
      }
    }],
  },
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  roots: ['<rootDir>/test'],
};
