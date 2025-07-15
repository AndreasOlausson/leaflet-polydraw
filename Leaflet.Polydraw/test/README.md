# Leaflet Polydraw Test Suite

This document provides an overview of the test suite for the Leaflet Polydraw project. The tests are designed to ensure the reliability and functionality of the polygon drawing, editing, and management features.

---

## Test Files Overview

### 1. **add-elbow.test.ts** (11 tests)

**Purpose**: Tests the edge click functionality for adding new vertices to polygon edges.

**Key Test Areas**:

- **Edge Click Handling**: Validates edge click detection and processing
- **Polygon Modification**: Tests adding vertices to existing polygon edges

---

### 2. **auto-add-polygons.test.ts** (4 tests)

**Purpose**: Tests the automatic polygon addition functionality with various polygon types and coordinate formats.

**Key Test Areas**:

- **Simple Polygons**: Tests the creation of a simple polygon.
- **Polygons with Holes**: Tests the creation of a polygon with an interior hole.
- **Invalid Polygons**: Ensures that invalid polygon data is handled correctly.
- **Multiple Polygons**: Verifies that multiple polygons can be added in a single call.

---

### 3. **dependency.test.ts** (3 tests)

**Purpose**: Enforces architectural constraints on the codebase, ensuring that the Turf.js library is only imported and used within the `turf-helper.ts` file.

---

### 4. **map-state.test.ts** (2 tests)

**Purpose**: Tests the `MapStateService`, which is responsible for holding a reference to the Leaflet map instance.

---

### 5. **markers.test.ts** (3 tests)

**Purpose**: Tests the logic for creating and styling markers, especially the distinction between regular markers and hole markers.

---

### 6. **modifier-drag-integration.test.ts** (1 test)

**Purpose**: Tests the functionality of dragging a polygon while holding a modifier key (e.g., `Ctrl` or `Cmd`) to subtract it from other polygons.

---

### 7. **polygon-information.service.test.ts** (3 tests)

**Purpose**: Tests the `PolygonInformationService`, which is responsible for storing and managing information about the polygons on the map.

---

### 8. **polygon.util.test.ts** (7 tests)

**Purpose**: Tests the `PolygonUtil` class, which provides a collection of utility functions for performing calculations on polygons.

---

### 9. **special-markers.test.ts** (13 tests)

**Purpose**: Tests the functionality of special markers, such as the menu, delete, and info markers.

---

### 10. **turf-helper.test.ts** (4 tests)

**Purpose**: Tests the `TurfHelper` class, which is a wrapper around the Turf.js library and provides a set of utility functions for performing geospatial calculations.

---

### 11. **utils.test.ts** (11 tests)

**Purpose**: Tests the utility classes `Perimeter`, `Area`, `PolyDrawUtil`, and `Compass`.

---

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test File

```bash
npx vitest run test/auto-add-polygons.test.ts
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```
