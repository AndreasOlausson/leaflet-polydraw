# Leaflet Polydraw Test Suite

This document provides a comprehensive overview of all tests in the Leaflet Polydraw project. The test suite ensures the reliability and functionality of the polygon drawing, editing, and management features.

## Test Status: ✅ 100% Passing (146/146 tests)

---

## Test Files Overview

### 1. **add-elbow.test.ts** (11 tests)

**Purpose**: Tests the edge click functionality for adding new vertices to polygon edges.

**Key Test Areas**:

- **Edge Click Handling**: Validates edge click detection and processing
- **Polygon Modification**: Tests adding vertices to existing polygon edges
- **GeoJSON Processing**: Ensures proper coordinate injection and polygon updates
- **Integration**: Tests interaction between edge manager and polygon operations

**Sample Tests**:

- `should process edge information and call toGeoJSON`
- `should call turf helper injectPointToPolygon with correct parameters`
- `should handle edge click events properly`

---

### 2. **auto-add-polygons.test.ts** (22 tests)

**Purpose**: Tests the automatic polygon addition functionality with various polygon types and coordinate formats.

**Key Test Areas**:

- **Octagon Polygon**: Tests complex multi-sided polygon creation
- **Square with Hole**: Tests polygon with interior holes
- **Complex Polygon (LKPG)**: Tests large polygons with coordinate format validation
- **Overlapping Squares**: Tests merge behavior with overlapping geometries
- **Polygon Validation**: Tests input validation and error handling
- **State Management**: Tests polygon state after addition and clearing

**Sample Tests**:

- `should successfully add an octagon polygon`
- `should have correct structure for polygon with hole`
- `should detect wrong coordinate format [lng, lat] instead of [lat, lng]`
- `should merge overlapping squares into one polygon`

---

### 3. **core/state-manager.test.ts** (42 tests)

**Purpose**: Tests the centralized state management system for draw modes, drag states, and polygon tracking.

**Key Test Areas**:

- **Draw Mode Management**: Tests mode switching (Off, Add, Subtract)
- **Event System**: Tests event listeners and callbacks
- **Drag State Management**: Tests polygon dragging state tracking
- **Feature Group Management**: Tests polygon collection management
- **State Consistency**: Tests state synchronization across operations

**Sample Tests**:

- `should initialize with default state`
- `should emit events when draw mode changes`
- `should track drag state correctly`
- `should manage feature groups properly`

---

### 4. **dependency.test.ts** (3 tests)

**Purpose**: Tests external library dependencies and integration.

**Key Test Areas**:

- **Leaflet Integration**: Tests Leaflet library compatibility
- **Turf.js Integration**: Tests geometric operations library
- **Library Versions**: Tests dependency version compatibility

**Sample Tests**:

- `should have Leaflet available`
- `should have Turf.js available`
- `should have compatible versions`

---

### 5. **map-state.test.ts** (2 tests)

**Purpose**: Tests map state management and coordinate system handling.

**Key Test Areas**:

- **Map State Tracking**: Tests map bounds and zoom state
- **Coordinate Systems**: Tests coordinate transformation and validation

**Sample Tests**:

- `should track map state correctly`
- `should handle coordinate transformations`

---

### 6. **modifier-drag-integration.test.ts** (4 tests)

**Purpose**: Tests modifier key integration during polygon dragging operations.

**Key Test Areas**:

- **Modifier Key Detection**: Tests Ctrl/Cmd key detection during drag
- **Subtract on Drag**: Tests subtract operation triggered by modifier + drag
- **Drag Integration**: Tests integration between drag and subtract operations
- **Event Handling**: Tests complex event sequences

**Sample Tests**:

- `should properly detect modifier key and perform subtract operation`
- `should handle modifier key state changes during drag`
- `should integrate drag and subtract operations`

---

### 7. **polygon-information.service.test.ts** (3 tests)

**Purpose**: Tests polygon information calculation and display services.

**Key Test Areas**:

- **Area Calculation**: Tests polygon area computation
- **Perimeter Calculation**: Tests polygon perimeter computation
- **Information Display**: Tests polygon information UI components

**Sample Tests**:

- `should calculate polygon area correctly`
- `should calculate polygon perimeter correctly`
- `should display polygon information`

---

### 8. **polygon.util.test.ts** (7 tests)

**Purpose**: Tests polygon utility functions for geometric calculations.

**Key Test Areas**:

- **Geometric Calculations**: Tests area, perimeter, and bounds calculations
- **Coordinate Utilities**: Tests coordinate transformation and validation
- **Polygon Validation**: Tests polygon structure validation
- **Helper Functions**: Tests various polygon manipulation utilities

**Sample Tests**:

- `should calculate area correctly`
- `should calculate perimeter correctly`
- `should validate polygon structure`
- `should handle coordinate transformations`

---

### 9. **polydraw.test.ts** (19 tests)

**Purpose**: Tests the main Polydraw control class and its core functionality.

**Key Test Areas**:

- **Control Initialization**: Tests Polydraw control creation and setup
- **Configuration**: Tests configuration options and defaults
- **Public API**: Tests public methods and properties
- **Integration**: Tests integration with Leaflet map
- **Event Handling**: Tests control event management

**Sample Tests**:

- `should initialize with default configuration`
- `should add to map correctly`
- `should handle configuration changes`
- `should expose correct public API`

---

### 10. **simplified-approach.test.ts** (5 tests)

**Purpose**: Tests the simplified polygon management architecture and single point of truth pattern.

**Key Test Areas**:

- **PolygonStateManager**: Tests centralized polygon state management
- **SimplifiedMarkerManager**: Tests simplified marker handling
- **Integration**: Tests integration between simplified components
- **Single Point of Truth**: Tests that all operations go through centralized state

**Sample Tests**:

- `should follow the deletePolygon -> addPolygon pattern`
- `should handle MultiPolygon by splitting into separate polygons`
- `should handle subtract operations`
- `should maintain single point of truth throughout operations`

---

### 11. **special-markers.test.ts** (13 tests)

**Purpose**: Tests special marker functionality including menu, delete, and info markers.

**Key Test Areas**:

- **Menu Markers**: Tests polygon menu marker functionality
- **Delete Markers**: Tests polygon deletion via markers
- **Info Markers**: Tests polygon information display markers
- **Marker Positioning**: Tests marker placement algorithms
- **Marker Interactions**: Tests marker click and drag behaviors

**Sample Tests**:

- `should create menu markers correctly`
- `should handle delete marker clicks`
- `should display info markers with correct data`
- `should position markers correctly on polygon`

---

### 12. **turf-helper.test.ts** (4 tests)

**Purpose**: Tests the Turf.js integration helper for geometric operations.

**Key Test Areas**:

- **Geometric Operations**: Tests union, intersection, difference operations
- **Coordinate Conversion**: Tests coordinate system conversions
- **Polygon Validation**: Tests geometric validation
- **Helper Methods**: Tests utility methods for geometric calculations

**Sample Tests**:

- `should perform union operations correctly`
- `should handle coordinate conversions`
- `should validate geometric operations`
- `should provide correct helper methods`

---

### 13. **utils.test.ts** (11 tests)

**Purpose**: Tests general utility functions used throughout the application.

**Key Test Areas**:

- **Coordinate Utilities**: Tests coordinate manipulation functions
- **Validation Utilities**: Tests input validation helpers
- **Conversion Utilities**: Tests data format conversions
- **Helper Functions**: Tests miscellaneous utility functions

**Sample Tests**:

- `should validate coordinates correctly`
- `should convert data formats properly`
- `should provide correct utility functions`
- `should handle edge cases in utilities`

---

## Test Architecture

### Testing Framework

- **Vitest**: Modern testing framework with TypeScript support
- **JSDOM**: Browser environment simulation for DOM testing
- **Mocking**: Comprehensive mocking of Leaflet and external dependencies

### Test Categories

#### 1. **Unit Tests**

- Individual function and method testing
- Isolated component behavior validation
- Input/output validation

#### 2. **Integration Tests**

- Component interaction testing
- Manager coordination validation
- State synchronization testing

#### 3. **System Tests**

- End-to-end workflow testing
- Complete feature validation
- User interaction simulation

### Test Environment Features

#### **Test Environment Compatibility**

- **Map Rendering Fallback**: Tests work without full Leaflet map rendering
- **DOM Simulation**: JSDOM provides browser-like environment
- **Mock Integration**: Comprehensive mocking of external dependencies
- **Error Handling**: Graceful handling of test environment limitations

#### **State Management Testing**

- **Single Point of Truth**: All tests validate centralized state management
- **State Consistency**: Tests ensure state remains consistent across operations
- **Event System**: Tests validate proper event emission and handling

#### **Geometric Operations Testing**

- **Turf.js Integration**: Tests validate geometric calculations
- **Coordinate Systems**: Tests handle various coordinate formats
- **Polygon Validation**: Tests ensure geometric validity

---

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test File

```bash
npm test -- test/auto-add-polygons.test.ts
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

---

## Test Quality Metrics

### **Coverage**: Comprehensive coverage of core functionality

### **Reliability**: 100% pass rate with consistent results

### **Maintainability**: Well-organized test structure with clear descriptions

### **Performance**: Fast test execution with efficient mocking

---

## Key Testing Principles

1. **Single Point of Truth**: All tests validate that PolygonStateManager is the authoritative source
2. **Test Environment Compatibility**: Tests work reliably in simulated browser environment
3. **Comprehensive Coverage**: Tests cover happy paths, edge cases, and error conditions
4. **Clear Documentation**: Each test has descriptive names and clear purpose
5. **Isolated Testing**: Tests are independent and don't affect each other
6. **Realistic Scenarios**: Tests simulate real user interactions and workflows

---

## Maintenance Notes

- **Test Environment**: Tests are designed to work in JSDOM environment with Leaflet mocking
- **State Management**: All tests respect the centralized PolygonStateManager architecture
- **Error Handling**: Tests include proper error handling for test environment limitations
- **Future Additions**: New tests should follow the established patterns and architecture

---

_Last Updated: November 2025_
_Test Suite Version: 1.0_
_Total Tests: 146_
_Pass Rate: 100%_
