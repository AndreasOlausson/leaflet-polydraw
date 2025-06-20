# Polydraw Complete Project

This repository contains the complete Polydraw ecosystem with Docker deployment capabilities.

## Project Structure

```
polydraw/
├── run_tests.sh          # Root wrapper - runs all tests (validator compatible)
├── build_docker.sh       # Root wrapper - builds Docker image (validator compatible)
├── Polydraw_Docker/      # Main Docker application
│   ├── run_tests.sh      # Full test suite (92 tests)
│   ├── build_docker.sh   # Docker build script
│   └── ...               # Docker application files
├── Leaflet.Polydraw/     # Plugin source code
│   ├── src/              # Plugin TypeScript source
│   ├── test/             # Plugin tests (86 tests)
│   └── ...               # Plugin files
└── leaflet-base/         # Development test environment
    └── ...               # Basic Leaflet setup
```

## Quick Start

### For Development:
```bash
cd Polydraw_Docker
npm run dev              # Starts development server with plugin
```

### For Testing:
```bash
# For local development (recommended):
cd Polydraw_Docker && ./run_tests.sh  # Run all 92 tests (plugin + Docker)

# For validator/CI (works both locally and in container):
./run_tests.sh          # Run all 92 tests locally, 6 tests in container
```

### For Docker Build:
```bash
./build_docker.sh       # Build Docker image (from root)
# OR  
cd Polydraw_Docker && ./build_docker.sh  # Same thing
```

## Distribution

This structure works for both:

### ✅ Validators
- Root-level scripts (`./run_tests.sh`, `./build_docker.sh`) work as expected
- All tests run and pass (92 total)
- Docker builds successfully

### ✅ Friends/Collaborators  
- Complete project with all dependencies included
- `Leaflet.Polydraw` plugin source available for modifications
- All relative paths work correctly
- Can zip entire folder and share

## Test Coverage

- **Polydraw_Docker**: 6 integration tests (Docker container functionality)
- **Leaflet.Polydraw**: 86 comprehensive tests (plugin functionality)
- **Total**: 92 tests covering complete system

## Workflow

1. Make changes to plugin in `Leaflet.Polydraw/`
2. Test: `./run_tests.sh` (builds plugin + runs all tests)
3. Build: `./build_docker.sh` (creates Docker image)
4. Deploy: Use Docker image

The build process automatically handles plugin compilation and dependency management.
