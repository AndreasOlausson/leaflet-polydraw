# Mock Factory for Leaflet Polydraw Tests

This mock factory provides centralized mock creation to reduce duplication across test files and ensure consistency in testing patterns.

## Benefits

- **Reduces Code Duplication**: Eliminates ~60-70% of repetitive mock setup code
- **Ensures Consistency**: Standardized mock behavior across all tests
- **Improves Maintainability**: Single source of truth for mock interfaces
- **Enhances Reliability**: Centralized updates when Leaflet interfaces change
- **Better Readability**: Tests focus on logic, not mock setup

## Quick Start

### Before (Original Pattern)

```typescript
// Every test file had to recreate these mocks
const mockMap = {
  addLayer: vi.fn(),
  removeLayer: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  dragging: { enable: vi.fn(), disable: vi.fn() },
  doubleClickZoom: { enable: vi.fn(), disable: vi.fn() },
  scrollWheelZoom: { enable: vi.fn(), disable: vi.fn() },
  getContainer: vi.fn(() => ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    classList: { add: vi.fn(), remove: vi.fn() },
  })),
  containerPointToLatLng: vi.fn((point) => ({ lat: point[1], lng: point[0] })),
  // ... 20+ more properties
} as unknown as L.Map;

const mockPolyline = {
  addTo: vi.fn(),
  setLatLngs: vi.fn(),
  addLatLng: vi.fn(),
  setStyle: vi.fn(),
  toGeoJSON: vi.fn(() => ({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    },
    properties: {},
  })),
  // ... more properties
} as unknown as L.Polyline;

// And many more mocks...
```

### After (Mock Factory Pattern)

```typescript
import { createMockMap, createMockPolyline, createMockTurfHelper } from './utils/mock-factory';

describe('MyComponent', () => {
  let mockMap: any;
  let mockPolyline: any;
  let mockTurfHelper: any;

  beforeEach(() => {
    mockMap = createMockMap();
    mockPolyline = createMockPolyline();
    mockTurfHelper = createMockTurfHelper();
  });

  // Your tests here - focus on logic, not mock setup!
});
```

## Available Mock Creators

### Leaflet Object Mocks

#### `createMockMap(options?: MockMapOptions)`

Creates a comprehensive Leaflet Map mock with all commonly used methods.

```typescript
const mockMap = createMockMap({
  containerPointToLatLng: (point) => ({ lat: point[1] + 10, lng: point[0] + 10 }),
  closePopup: vi.fn(() => console.log('Popup closed')),
});
```

#### `createMockPolyline(options?: MockPolylineOptions)`

Creates a Leaflet Polyline mock with customizable GeoJSON output.

```typescript
const mockPolyline = createMockPolyline({
  toGeoJSON: () => ({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [1, 2],
        [3, 4],
      ],
    },
    properties: { custom: 'data' },
  }),
});
```

#### `createMockFeatureGroup(options?: MockFeatureGroupOptions)`

Creates a FeatureGroup mock with layer management capabilities.

```typescript
const mockFeatureGroup = createMockFeatureGroup({
  eachLayerCallback: (callback) => {
    // Custom layer iteration logic
    callback(mockLayer1);
    callback(mockLayer2);
  },
});
```

#### `createMockMarker(options?: MockMarkerOptions)`

Creates a Marker mock with dragging and element support.

```typescript
const mockMarker = createMockMarker({
  draggable: true,
  element: customElement,
});
```

#### `createMockPolygon(latlngs?, options?)`

Creates a Polygon mock with proper GeoJSON conversion.

```typescript
const mockPolygon = createMockPolygon([
  [
    { lat: 0, lng: 0 },
    { lat: 1, lng: 0 },
    { lat: 1, lng: 1 },
  ],
]);
```

### Event Mocks

#### `createMockMouseEvent(options?: MockMouseEventOptions)`

```typescript
const mouseEvent = createMockMouseEvent({
  latlng: { lat: 45.5, lng: -122.6 },
  preventDefault: vi.fn(),
});
```

#### `createMockTouchEvent(options?: MockTouchEventOptions)`

```typescript
const touchEvent = createMockTouchEvent({
  clientX: 100,
  clientY: 200,
});
```

#### `createMockKeyboardEvent(options?: MockKeyboardEventOptions)`

```typescript
const keyEvent = createMockKeyboardEvent({
  key: 'Escape',
  ctrlKey: true,
});
```

### Console Mocks

#### `suppressConsole()`

Temporarily suppresses console output for tests that expect errors/warnings.

```typescript
it('should handle errors gracefully', () => {
  const consoleMock = suppressConsole();

  // Test code that logs errors
  expect(() => riskyOperation()).not.toThrow();

  consoleMock.restore();
});
```

#### `createConsoleSpy()`

Creates spies for console methods that can be inspected and restored.

```typescript
it('should log warnings', () => {
  const consoleSpy = createConsoleSpy();

  performOperation();

  expect(consoleSpy.warn).toHaveBeenCalledWith('Expected warning message');
  consoleSpy.restore();
});
```

### Test Helpers

#### `setupPolydrawTest(options?: PolydrawTestSetupOptions)`

Sets up a complete test environment with all common mocks and cleanup.

```typescript
describe('Polydraw Integration', () => {
  let testSetup: ReturnType<typeof setupPolydrawTest>;

  beforeEach(() => {
    testSetup = setupPolydrawTest({
      suppressConsole: true,
      mapOptions: {
        containerPointToLatLng: (point) => ({ lat: point[1], lng: point[0] }),
      },
    });
  });

  afterEach(() => {
    testSetup.cleanup();
  });

  it('should work with all mocks', () => {
    const { mocks } = testSetup;
    // Use mocks.map, mocks.polyline, mocks.featureGroup, mocks.marker
  });
});
```

### Module Mocks

#### `createLeafletModuleMock()`

For complete Leaflet module mocking with `vi.mock('leaflet')`.

```typescript
vi.mock('leaflet', async () => {
  const actual = await vi.importActual('leaflet');
  return {
    ...actual,
    ...createLeafletModuleMock(),
  };
});
```

## Migration Guide

### Step 1: Identify Mock Patterns

Look for repeated mock creation in your test files:

- `const mockMap = { ... }`
- `const mockPolyline = { ... }`
- `vi.mock('leaflet', ...)`
- Console suppression patterns

### Step 2: Replace with Factory Functions

```typescript
// Before
const mockMap = {
  addLayer: vi.fn(),
  removeLayer: vi.fn(),
  // ... 20+ lines
};

// After
import { createMockMap } from './utils/mock-factory';
const mockMap = createMockMap();
```

### Step 3: Customize When Needed

```typescript
// For special cases, use options
const mockMap = createMockMap({
  containerPointToLatLng: (point) => ({ lat: point[1] * 2, lng: point[0] * 2 }),
});
```

### Step 4: Use Test Helpers for Complex Setup

```typescript
// Replace complex beforeEach/afterEach with
const testSetup = setupPolydrawTest({ suppressConsole: true });
// Use testSetup.mocks and testSetup.cleanup()
```

## Best Practices

### 1. Use Factory Functions by Default

```typescript
// ✅ Good
const mockMap = createMockMap();

// ❌ Avoid (unless you need very specific behavior)
const mockMap = { addLayer: vi.fn() /* custom implementation */ };
```

### 2. Customize Only When Necessary

```typescript
// ✅ Good - use options for customization
const mockPolyline = createMockPolyline({
  toGeoJSON: () => myCustomGeoJSON,
});

// ❌ Avoid - don't recreate the entire mock
const mockPolyline = {
  /* entire mock redefined */
};
```

### 3. Use setupPolydrawTest for Integration Tests

```typescript
// ✅ Good for complex tests
const testSetup = setupPolydrawTest();

// ✅ Good for simple unit tests
const mockTurfHelper = createMockTurfHelper();
```

### 4. Always Clean Up

```typescript
afterEach(() => {
  testSetup.cleanup(); // or vi.clearAllMocks()
});
```

## Examples

### Simple Unit Test

```typescript
import { createMockTurfHelper } from './utils/mock-factory';

describe('CoordinateUtils', () => {
  let mockTurfHelper: any;

  beforeEach(() => {
    mockTurfHelper = createMockTurfHelper();
  });

  it('should convert coordinates', () => {
    vi.mocked(mockTurfHelper.isWithin).mockReturnValue(true);

    const result = CoordinateUtils.convertToCoords(latlngs, mockTurfHelper);

    expect(result).toHaveLength(1);
  });
});
```

### Integration Test

```typescript
import { setupPolydrawTest } from './utils/mock-factory';

describe('Polydraw Integration', () => {
  let testSetup: ReturnType<typeof setupPolydrawTest>;

  beforeEach(() => {
    testSetup = setupPolydrawTest({ suppressConsole: true });
  });

  afterEach(() => {
    testSetup.cleanup();
  });

  it('should handle complete workflow', () => {
    const polydraw = new Polydraw();
    polydraw.onAdd(testSetup.mocks.map);

    // Test complete workflow with all mocks available
  });
});
```

### Event Testing

```typescript
import { createMockMouseEvent, createMockKeyboardEvent } from './utils/mock-factory';

it('should handle mouse and keyboard events', () => {
  const mouseEvent = createMockMouseEvent({
    latlng: { lat: 45, lng: -122 },
  });

  const keyEvent = createMockKeyboardEvent({
    key: 'Escape',
    ctrlKey: true,
  });

  component.handleMouseDown(mouseEvent);
  component.handleKeyDown(keyEvent);

  expect(mouseEvent.preventDefault).toHaveBeenCalled();
});
```

## Extending the Mock Factory

To add new mock creators:

1. **Add the interface** (if needed):

```typescript
export interface MockNewComponentOptions {
  customProperty?: string;
}
```

2. **Create the factory function**:

```typescript
export function createMockNewComponent(options: MockNewComponentOptions = {}): any {
  return {
    // Mock implementation
    customMethod: vi.fn(),
    customProperty: options.customProperty || 'default',
  } as unknown as NewComponent;
}
```

3. **Add tests** for the new mock creator
4. **Update documentation**

## Troubleshooting

### Mock Not Working as Expected

- Check if you're using the latest mock factory version
- Verify that you're calling `vi.clearAllMocks()` in `beforeEach`
- Ensure you're using the correct options interface

### TypeScript Errors

- Make sure you're importing the correct types
- Use `as any` for complex mock scenarios if needed
- Check that your mock matches the expected interface

### Test Failures After Migration

- Compare the old mock with the factory-created mock
- Use options to customize behavior if needed
- Check that cleanup is happening properly

## Performance

The mock factory is designed for performance:

- **Lazy Creation**: Mocks are only created when called
- **Reusable**: Same factory functions across all tests
- **Minimal Overhead**: Simple object creation with vi.fn() calls
- **Memory Efficient**: Proper cleanup prevents memory leaks

## Contributing

When adding new mock creators:

1. Follow existing patterns and naming conventions
2. Add comprehensive TypeScript interfaces
3. Include usage examples in documentation
4. Add tests for the new mock creators
5. Update this README with examples
