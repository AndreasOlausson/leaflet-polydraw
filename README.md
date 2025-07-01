# Polydraw Complete Project

This repository contains the complete Polydraw ecosystem with Docker deployment capabilities.

## Project Structure

```

POLYDRAW/ (root)
├── leaflet-base/
    └── ...               # Basic Leaflet setup
├── Leaflet.Polydraw
│   ├── src/              # Plugin TypeScript source
│   ├── test/             # Plugin tests
│   └── ...               # Plugin files
├── Polydraw_Docker
│   ├── run_tests.sh      # Full test suite
│   ├── build_docker.sh   # Docker build script
│   └── ...               # Docker application files
├── build_docker.sh
├── clean_docker.sh
├── README.md
└── run_tests.sh
```

## Quick Start

### 0. Install dependencies

Before running any development server, tests, or Docker scripts, make sure all dependencies are installed:

```bash
# Plugin
cd Leaflet.Polydraw
npm install

# Browser test project
cd ../leaflet-base
npm install

# Docker wrapper project
cd ../Polydraw_Docker
npm install  # Also runs automatically when building via ./build_docker.sh
```

You only need to run this once (or when dependencies change).

### For Development:

```bash
cd Polydraw_Docker
npm run dev              # Builds a fresh plugin and starts the development server
```

- A fresh build of the Leaflet.Polydraw plugin is generated before launching the Vite dev server

### Plugin Tests (Leaflet.Polydraw)

To run unit and integration tests for the Leaflet.Polydraw plugin in isolation:

```bash
cd Leaflet.Polydraw
npm test
```

- Uses [Vitest](https://vitest.dev/)

### Build Type Definitions

To generate `.d.ts` files for the plugin:

```bash
cd Leaflet.Polydraw
npm run build:types
```

- This uses the script:

```json
"build:types": "tsc --project tsconfig.build.json"
```

### For Docker Build:

```bash
# Must be run from project root
./build_docker.sh       # Builds Docker image with compiled plugin
```

### For Docker Testing

Run the full test suite:

```bash
# Must be run from project root
./run_tests.sh
```

### Aggressive Docker Cleanup

A helper script is included to **aggressively remove all Docker-related data** (containers, images, volumes, caches, etc).  
This is **potentially destructive** and must be used with care.

```bash
# Must be run from project root
./clean_docker.sh wipe
```

- The script only executes if run with the `wipe` argument
- Without the argument, it does nothing and prints a warning
- Intended for complete cleanup before rebuilding or diagnosing Docker issues
- Note: `build_docker.sh` does **not** call this script, even with arguments — cleanup must be run manually if needed.

## Distribution

This structure works for both:

### ✅ Validators

- Root-level scripts (`./run_tests.sh`, `./build_docker.sh`) work as expected
- All tests run and pass
- Docker builds successfully
