# Polydraw Docker

A clean, minimal Docker-ready application for testing and deploying Leaflet.Polydraw plugin.

## What was removed

This project has been cleaned up from a React-based setup to a minimal TypeScript + Leaflet setup:

### Removed React Dependencies:
- `react`, `react-dom`
- `@types/react`, `@types/react-dom`
- `@vitejs/plugin-react`
- `@testing-library/react`, `@testing-library/user-event`
- `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`

### Removed Files:
- `src/App.tsx`, `src/App.css`, `src/App.test.tsx`
- `src/main.tsx`, `src/index.css`
- `src/assets/react.svg`
- `test/setupTests.ts`
- `test/__snapshots__/`
- `public/vite.svg`

## Current Setup

- **TypeScript** + **Vite** for build tooling
- **Leaflet** for mapping functionality
- **Clean HTML structure** with a full-height map container
- **Docker ready** with existing Docker configuration

## Development

```bash
npm install
npm run dev
```

The application will be available at `http://localhost:5173/`

## Leaflet.Polydraw Integration

The plugin is now fully integrated:

1. ✅ Added as a local file dependency: `"leaflet-polydraw": "file:../Leaflet.Polydraw"`
2. ✅ Imported and initialized in `src/main.ts`
3. ✅ Build process automatically builds the plugin first
4. ✅ CSS styles included for proper plugin appearance

The development server will automatically:
- Build the Leaflet.Polydraw plugin
- Install dependencies
- Start the Vite dev server with the plugin ready to use

## Testing

All tests are passing:

**Total: 92 tests** across both projects:
- **Polydraw_Docker tests**: ✅ 6 tests passed (2 test files)
- **Leaflet.Polydraw tests**: ✅ 86 tests passed (7 test suites)

Run tests with:
```bash
npm test                # Run Docker project tests only
./run_tests.sh         # Run FULL test suite (build + all 92 tests)
```

The enhanced `./run_tests.sh` script now runs:
1. Complete build process (plugin + Docker project)
2. Docker container integration tests (6 tests)
3. Comprehensive plugin functionality tests (86 tests)
4. Full test report with clear output sections

## Docker

Use the existing Docker files to build and deploy:

```bash
./build_docker.sh
