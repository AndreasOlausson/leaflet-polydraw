# Leaflet Polydraw Test Suite

This document provides an overview of the test suite for the Leaflet Polydraw project. The tests are designed to ensure the reliability and functionality of the polygon drawing, editing, and management features. All 164 tests are currently passing, ensuring a stable and robust codebase.

---

## Test Files Overview

### 1. **`add-elbow.test.ts`** (11 tests)

**Purpose**: Tests the edge click functionality for adding new vertices ("elbows") to polygon edges.
**Key Test Areas**:

- Edge click detection and processing.
- Correctly adding new vertices to polygon rings.
- Integration with the `PolygonInteractionManager`.

### 2. **`auto-add-polygons.test.ts`** (4 tests)

**Purpose**: Tests the automatic polygon addition functionality with various polygon types and coordinate formats.
**Key Test Areas**:

- Creation of simple polygons and polygons with holes.
- Handling of invalid polygon data.
- Adding multiple polygons in a single call.

### 3. **`drag-polygon.test.ts`** (24 tests)

**Purpose**: Provides comprehensive testing for all polygon dragging functionality, including normal drags and modifier-key drags for subtraction.
**Key Test Areas**:

- Normal polygon dragging and coordinate updates.
- Modifier drag "subtract" operation (the "bite" effect).
- Visual feedback, including color changes and cursor updates.
- Performance with complex polygons and polygons with holes.

### 4. **`integration-workflows.test.ts`** (23 tests)

**Purpose**: Simulates end-to-end user workflows to test the integration of different modes and features.
**Key Test Areas**:

- C-to-O (closed-to-open) polygon merging workflows.
- Integration of Point-to-Point (P2P) drawing with existing polygons.
- Performance and stress testing with rapid polygon creations.
- Real-world usage scenarios like create, edit, and merge.

### 5. **`map-state.test.ts`** (2 tests)

**Purpose**: Tests the `MapStateService`, which is responsible for holding a reference to the Leaflet map instance.

### 6. **`marker-through-hole.test.ts`** (1 test)

**Purpose**: Tests the specific edge case of dragging a marker through a hole in a polygon, ensuring it creates a single solid polygon.

### 7. **`mode-manager.test.ts`** (6 tests)

**Purpose**: Tests the `ModeManager`, which controls the current drawing/editing mode of the application (e.g., Draw, Edit, Off).

### 8. **`p2p-drawing.test.ts`** (19 tests)

**Purpose**: Tests the Point-to-Point (P2P) drawing mode.
**Key Test Areas**:

- Adding points and creating polygons by clicking.
- Completing polygons by clicking the first point.
- Handling of the tracer line during drawing.

### 9. **`polygon-information.service.test.ts`** (3 tests)

**Purpose**: Tests the `PolygonInformationService`, which stores and manages metadata about the polygons on the map.

### 10. **`polygon.util.test.ts`** (7 tests)

**Purpose**: Tests the `PolygonUtil` class, which provides a collection of utility functions for performing calculations on polygons.

### 11. **`turf-helper.test.ts`** (53 tests)

**Purpose**: Tests the `TurfHelper` class, a wrapper around the Turf.js library that provides utility functions for geospatial calculations.
**Key Test Areas**:

- Polygon creation, union, and difference operations.
- Kink detection and fixing.
- Area and perimeter calculations.

### 12. **`utils.test.ts`** (11 tests)

**Purpose**: Tests various utility classes like `Perimeter`, `Area`, `PolyDrawUtil`, and `Compass`.

---

## Running Tests

### Run All Tests

To run the entire test suite:

```bash
npm test -- --run
```

### Run a Specific Test File

To run a single test file, specify its path:

```bash
npm test -- --run test/drag-polygon.test.ts
```

### Run Tests in Watch Mode

To run tests in watch mode, which automatically re-runs tests on file changes:

```bash
npm test -- --watch
```

### Run Tests with Coverage

To generate a test coverage report:

```bash
npm test -- --coverage
```
