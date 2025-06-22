# Polydraw Docker Testing

> ⚠️ **Note:** Currently only 5 tests are running (4 failing, 1 passing) due to focused testing on specific functionality. Other tests are temporarily skipped.

Docker-based testing environment for the Leaflet Polydraw plugin.

## Project Structure

### 📁 **leaflet-base/**
Basic Leaflet setup for browser testing
```bash
cd leaflet-base
npm install
npm run dev
``` 
# Open browser to test Leaflet functionality

### 📁 __Leaflet.Polydraw/__

Main plugin source code and tests

```bash
cd Leaflet.Polydraw
npm install
npm test
```
# Run plugin tests locally

### 📁 __Polydraw_Docker/__

Docker testing environment
```bash
# Run tests in Docker
./run_tests.sh

# Build and test Docker image
./build_docker.sh
```

Quick Commands

```bash
# Docker testing
./build_docker.sh          # Build & test in Docker
./clean_docker.sh           # Clean Docker artifacts

# Local testing
cd Leaflet.Polydraw && npm test

# Browser testing
cd leaflet-base && npm run dev
```

## Current Test Status

- __Docker Tests:__ 2 skipped (basic.test.ts, suite.test.ts)
- __Plugin Tests:__ Only draw-polygon.test.ts running

## Technologies

- __Leaflet__ - Map library
- __TypeScript__ - Type-safe JavaScript
- __Vitest__ - Testing framework
- __Docker__ - Containerized testing
