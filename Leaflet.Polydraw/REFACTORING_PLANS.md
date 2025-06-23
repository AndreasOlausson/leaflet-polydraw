# Leaflet.Polydraw Refactoring Plans

This document serves as the central repository for all major refactoring and migration plans for the Leaflet.Polydraw project. Each plan includes detailed analysis, implementation steps, and progress tracking.

## Table of Contents

1. [MultiPolygon Standardization](#multipolygon-standardization)
2. [Turf.js v7+ Migration](#turfjs-v7-migration)
3. [Type System Improvements](#type-system-improvements)
4. [Concaveman Migration](#concaveman-migration)
5. [Future Plans Template](#future-plans-template)

---

## MultiPolygon Standardization

### Status: 📋 **Planned**
### Priority: 🔥 **High**
### Estimated Effort: 2-3 days

### Overview

Standardize the codebase on `Feature<MultiPolygon>` instead of the current mixed `Feature<Polygon | MultiPolygon>` approach to eliminate complexity and improve maintainability.

### Rationale

#### Current Problems
- **Mixed type handling**: 30+ locations with `Feature<Polygon | MultiPolygon>`
- **Complex branching**: 6+ type checks for `geometry.type === "Polygon"`
- **Inconsistent coordinate access**: Different patterns for Polygon vs MultiPolygon
- **Maintenance overhead**: Duplicate logic for handling both types

#### Benefits of MultiPolygon-Only
- **Unified data model**: Single geometry type to handle
- **Simplified logic**: Eliminate type checking branches
- **Consistent coordinate structure**: Always `coordinates[polygon][ring][point]`
- **Future-proof**: MultiPolygon can represent any polygon scenario
- **Better Turf.js compatibility**: Many operations return MultiPolygon anyway

#### Key Insight
- **Draw operations** already create MultiPolygon via `turfConcaveman()`
- **AutoAdd operations** already create MultiPolygon via `getMultiPolygon()`
- The issue is in mixed handling throughout the pipeline

### Current State Analysis

#### Files with Mixed Types (30 locations)

**TurfHelper.ts (16 methods)**
```typescript
// Methods returning Feature<Polygon | MultiPolygon>
union(poly1, poly2): Feature<Polygon | MultiPolygon>
turfConcaveman(feature): Feature<Polygon | MultiPolygon>  // ✅ Already returns MultiPolygon
getSimplified(polygon, dynamicTolerance): Feature<Polygon | MultiPolygon>
getTurfPolygon(polygon): Feature<Polygon | MultiPolygon>
getMultiPolygon(polygonArray): Feature<Polygon | MultiPolygon>  // ✅ Already returns MultiPolygon
polygonDifference(polygon1, polygon2): Feature<Polygon | MultiPolygon>
getBezierMultiPolygon(polygonArray): Feature<Polygon | MultiPolygon>

// Methods accepting Feature<Polygon | MultiPolygon>
getKinks(feature: Feature<Polygon | MultiPolygon>)
getCoords(feature: Feature<Polygon | MultiPolygon>)
hasKinks(feature: Feature<Polygon | MultiPolygon>)
polygonIntersect(polygon, latlngs): boolean
equalPolygons(polygon1, polygon2)
convertToBoundingBoxPolygon(polygon): Feature<Polygon>  // Returns Polygon
getPolygonArea(poly): number
getPolygonPerimeter(poly): number
```

**Polydraw.ts (14 methods)**
```typescript
// Methods with Feature<Polygon | MultiPolygon>
mouseUpLeave() // Creates: Feature<Polygon | MultiPolygon>
subtractPolygon(latlngs: Feature<Polygon | MultiPolygon>)
addPolygon(latlngs: Feature<Polygon | MultiPolygon>, simplify, noMerge)
subtract(latlngs: Feature<Polygon | MultiPolygon>)
getLatLngsFromJson(feature: Feature<Polygon | MultiPolygon>): ILatLng[][]
addPolygonLayer(latlngs: Feature<Polygon | MultiPolygon>, simplify, dynamicTolerance)
merge(latlngs: Feature<Polygon | MultiPolygon>)
unionPolygons(layers, latlngs: Feature<Polygon | MultiPolygon>, polygonFeature)
getPolygon(latlngs: Feature<Polygon | MultiPolygon>)
polygonClicked(e, poly: Feature<Polygon | MultiPolygon>)
```

#### Type Checking Patterns (6 locations)

**TurfHelper.ts**
```typescript
// Line ~50: getTurfPolygon()
if (polygon.geometry.type === "Polygon") {
    turfPolygon = turf.multiPolygon([polygon.geometry.coordinates]);
} else {
    turfPolygon = turf.multiPolygon(polygon.geometry.coordinates);
}

// Line ~95: polygonIntersect()
if (test?.geometry.type === "Polygon"){
    intersect = !!turf.intersect(poly[i], poly2[j]);
}
```

**Polydraw.ts**
```typescript
// Line ~420: getLatLngsFromJson()
if (feature.geometry.coordinates.length > 1 && feature.geometry.type === "MultiPolygon") {
    coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0][0]);
} else if (feature.geometry.coordinates[0].length > 1 && feature.geometry.type === "Polygon") {
    coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0]);
} else {
    coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0][0]);
}

// Line ~1050: polygonClicked()
if (poly.geometry.type === "MultiPolygon") {
    let newPolygon = this.turfHelper.injectPointToPolygon(poly, [newPoint.lng, newPoint.lat]);
    // ...
}
```

### Migration Plan

#### Phase 1: TurfHelper.ts Cleanup

**1.1 Update Return Types**
```typescript
// Before → After
union(poly1, poly2): Feature<Polygon | MultiPolygon> → Feature<MultiPolygon>
getSimplified(polygon, dynamicTolerance): Feature<Polygon | MultiPolygon> → Feature<MultiPolygon>
getTurfPolygon(polygon): Feature<Polygon | MultiPolygon> → Feature<MultiPolygon>
polygonDifference(polygon1, polygon2): Feature<Polygon | MultiPolygon> → Feature<MultiPolygon>
getBezierMultiPolygon(polygonArray): Feature<Polygon | MultiPolygon> → Feature<MultiPolygon>
```

**1.2 Simplify getTurfPolygon()**
```typescript
// Before
getTurfPolygon(polygon: Feature<Polygon | MultiPolygon>): Feature<MultiPolygon> {
    let turfPolygon;
    if (polygon.geometry.type === "Polygon") {
        turfPolygon = turf.multiPolygon([polygon.geometry.coordinates]);
    } else {
        turfPolygon = turf.multiPolygon(polygon.geometry.coordinates);
    }
    return turfPolygon;
}

// After
getTurfPolygon(polygon: Feature<MultiPolygon>): Feature<MultiPolygon> {
    return turf.multiPolygon(polygon.geometry.coordinates);
}
```

#### Phase 2: Polydraw.ts Updates

**2.1 Update Method Signatures**
```typescript
// Before → After
addPolygon(latlngs: Feature<Polygon | MultiPolygon>, ...) → addPolygon(latlngs: Feature<MultiPolygon>, ...)
subtractPolygon(latlngs: Feature<Polygon | MultiPolygon>) → subtractPolygon(latlngs: Feature<MultiPolygon>)
// ... (7 methods total)
```

**2.2 Simplify getLatLngsFromJson()**
```typescript
// Before
private getLatLngsFromJson(feature: Feature<Polygon | MultiPolygon>): ILatLng[][] {
    let coord;
    if (feature) {
        if (feature.geometry.coordinates.length > 1 && feature.geometry.type === "MultiPolygon") {
            coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0][0]);
        } else if (feature.geometry.coordinates[0].length > 1 && feature.geometry.type === "Polygon") {
            coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0]);
        } else {
            coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0][0]);
        }
    }
    return coord;
}

// After
private getLatLngsFromJson(feature: Feature<MultiPolygon>): ILatLng[][] {
    let coord;
    if (feature) {
        // Always MultiPolygon: coordinates[polygon][ring]
        coord = L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates[0][0]);
    }
    return coord;
}
```

#### Phase 3: AutoAdd Input Normalization

**3.1 Add Input Normalization Helper**
```typescript
/**
 * Normalizes any polygon input to MultiPolygon format
 */
private normalizeToMultiPolygon(input: any): Feature<MultiPolygon> {
    // Handle various input formats
    if (input.type === 'Feature') {
        if (input.geometry.type === 'Polygon') {
            return {
                ...input,
                geometry: {
                    type: 'MultiPolygon',
                    coordinates: [input.geometry.coordinates]
                }
            };
        }
        return input; // Already MultiPolygon
    }
    
    // Handle coordinate arrays
    if (Array.isArray(input)) {
        return turf.multiPolygon(input);
    }
    
    throw new Error('Invalid polygon input format');
}
```

### Implementation Checklist

#### Phase 1: TurfHelper.ts
- [ ] Update return types (7 methods)
- [ ] Update parameter types (8 methods)
- [ ] Simplify getTurfPolygon() logic
- [ ] Fix convertToBoundingBoxPolygon() return type
- [ ] Remove type check in polygonIntersect()
- [ ] Update coordinate access patterns
- [ ] Add type annotations for clarity

#### Phase 2: Polydraw.ts
- [ ] Update method signatures (7 methods)
- [ ] Simplify getLatLngsFromJson()
- [ ] Simplify polygonClicked()
- [ ] Update mouseUpLeave() type annotation
- [ ] Remove any remaining type checks
- [ ] Verify coordinate access patterns

#### Phase 3: Input Normalization
- [ ] Create normalizeToMultiPolygon() helper
- [ ] Update addAutoPolygon() if needed
- [ ] Add input validation
- [ ] Handle legacy input formats

#### Phase 4: Testing & Validation
- [ ] Run existing test suite
- [ ] Add new MultiPolygon-specific tests
- [ ] Test with real polygon data
- [ ] Performance testing
- [ ] Memory usage validation

---

## Turf.js v7+ Migration

### Status: 🚨 **Critical**
### Priority: 🔥 **High**
### Estimated Effort: 1-2 days

### Overview

Migrate from Turf.js v6.5.0 to v7.2.0+ to access latest features and bug fixes. The main blocker is the `polygonDifference` method crashing due to breaking changes in `turf.difference`.

### Current Issue

**Current Version**: `@turf/turf: ^6.5.0`
**Target Version**: `@turf/turf: ^7.2.0`

**Problem**: `polygonDifference` crashes when upgrading to v7+

```typescript
// Current implementation that crashes in v7+
polygonDifference(polygon1: Feature<Polygon | MultiPolygon>, polygon2: Feature<Polygon | MultiPolygon>): Feature<Polygon | MultiPolygon> {
    let diff = turf.difference(polygon1, polygon2);
    console.log("Diff:", diff);
    return this.getTurfPolygon(diff);
}
```

### Breaking Changes Analysis

#### 1. `turf.difference` Return Type Change
- **v6.5.0**: Returns `Feature<Polygon | MultiPolygon> | null`
- **v7.0.0+**: Can return `null` or `undefined` when no difference exists
- **Impact**: Code assumes non-null return value

#### 2. Polygon-Clipping Library Change
- **v7.2.0**: Replaced polygon-clipping with polyclip-ts
- **v6.2.0**: Used polygon-clipping library
- **Impact**: Different edge case handling and precision

#### 3. Stricter Input Validation
- **v7+**: More strict input validation
- **Impact**: May throw errors for edge cases that v6.5 handled gracefully

#### 4. TypeScript Types Update
- **v7.0.0**: Move to @types/geojson package
- **Impact**: Need to import from @types/geojson instead of internal types

#### 5. ES Module Changes
- **v7.0.0**: Move distribution JS to target ES2017
- **Impact**: May affect bundling and compatibility

### Migration Strategy

#### Step 1: Update Dependencies
```json
{
  "dependencies": {
    "@turf/turf": "^7.2.0"
  },
  "devDependencies": {
    "@types/geojson": "^7946.0.16"
  }
}
```

#### Step 2: Fix polygonDifference Method
```typescript
// Option 1: Handle Null Returns with Error Handling
polygonDifference(polygon1: Feature<MultiPolygon>, polygon2: Feature<MultiPolygon>): Feature<MultiPolygon> | null {
    try {
        // Validate inputs
        if (!polygon1?.geometry || !polygon2?.geometry) {
            console.warn('Invalid polygon inputs for difference operation');
            return null;
        }
        
        // Apply truncate to avoid precision issues
        const p1 = turf.truncate(polygon1, { precision: 6 });
        const p2 = turf.truncate(polygon2, { precision: 6 });
        
        let diff = turf.difference(p1, p2);
        console.log("Diff:", diff);
        
        if (!diff) {
            console.log('No difference between polygons');
            return null; // No difference exists
        }
        
        return this.getTurfPolygon(diff);
    } catch (error) {
        console.warn('Polygon difference operation failed:', error);
        return null;
    }
}

// Option 2: Fallback Strategy
polygonDifference(polygon1: Feature<MultiPolygon>, polygon2: Feature<MultiPolygon>): Feature<MultiPolygon> | null {
    try {
        // Primary attempt with v7+ method
        let diff = turf.difference(
            turf.truncate(polygon1, { precision: 6 }),
            turf.truncate(polygon2, { precision: 6 })
        );
        
        if (diff) {
            return this.getTurfPolygon(diff);
        }
        
        // Fallback: return original polygon if no difference
        console.log('No difference found, returning original polygon');
        return polygon1;
        
    } catch (error) {
        console.warn('Polygon difference failed, returning original:', error);
        return polygon1;
    }
}
```

#### Step 3: Update Calling Code
```typescript
// Update subtract method to handle null returns
private subtract(latlngs: Feature<MultiPolygon>) {
    let addHole = latlngs;
    let newPolygons = [];
    
    this.arrayOfFeatureGroups.forEach(featureGroup => {
        let featureCollection = featureGroup.toGeoJSON() as any;
        const layer = featureCollection.features[0];
        let poly = this.getLatLngsFromJson(layer);
        let feature = this.turfHelper.getTurfPolygon(featureCollection.features[0]);
        
        // Handle null return from polygonDifference
        let newPolygon = this.turfHelper.polygonDifference(feature, addHole);
        if (newPolygon) {
            newPolygons.push(newPolygon);
        } else {
            // Handle case where difference operation failed
            console.log('Difference operation returned null, skipping polygon');
        }
        
        this.deletePolygon(poly);
        this.removeFeatureGroupOnMerge(featureGroup);
    });
    
    // After subtracting from all, add the remaining polygons
    newPolygons.forEach(np => {
        this.addPolygon(np, false, true);
    });
}
```

#### Step 4: Update Other Affected Methods

**union() method**:
```typescript
union(poly1, poly2): Feature<MultiPolygon> | null {
    try {
        let union = turf.union(poly1, poly2);
        return union ? this.getTurfPolygon(union) : null;
    } catch (error) {
        console.warn('Union operation failed:', error);
        return null;
    }
}
```

**getIntersection() method**:
```typescript
getIntersection(poly1, poly2): Feature | null {
    try {
        return turf.intersect(poly1, poly2);
    } catch (error) {
        console.warn('Intersection operation failed:', error);
        return null;
    }
}
```

#### Step 5: Update Import Statements
```typescript
// Update imports to use @types/geojson
import type { Feature, Polygon, MultiPolygon, Position, Point } from '@types/geojson';
```

### Testing Strategy

#### Unit Tests
- [ ] Test `polygonDifference` with various polygon combinations
- [ ] Test null return handling
- [ ] Test error cases and edge conditions
- [ ] Test precision issues with truncate

#### Integration Tests
- [ ] Test subtract operations end-to-end
- [ ] Test union operations
- [ ] Test intersection operations
- [ ] Test with real-world polygon data

#### Regression Tests
- [ ] Verify existing functionality unchanged
- [ ] Test polygon drawing and editing
- [ ] Test marker interactions
- [ ] Test area and perimeter calculations

### Implementation Checklist

#### Phase 1: Dependency Updates
- [ ] Update package.json dependencies
- [ ] Add @types/geojson dependency
- [ ] Update import statements
- [ ] Run npm install and verify build

#### Phase 2: Core Method Updates
- [ ] Fix polygonDifference method
- [ ] Update union method
- [ ] Update getIntersection method
- [ ] Add error handling throughout TurfHelper

#### Phase 3: Calling Code Updates
- [ ] Update subtract method
- [ ] Update merge operations
- [ ] Handle null returns in all callers
- [ ] Add logging for debugging

#### Phase 4: Testing & Validation
- [ ] Run existing test suite
- [ ] Add v7-specific tests
- [ ] Test edge cases and error conditions
- [ ] Performance testing
- [ ] Memory usage validation

### Risk Assessment

#### Low Risk
- Most Turf operations remain compatible
- Error handling can gracefully degrade
- Existing functionality preserved

#### Medium Risk
- Precision differences may affect results
- Performance characteristics may change
- Some edge cases may behave differently

#### Mitigation
- Comprehensive testing before deployment
- Gradual rollout with monitoring
- Fallback strategies for critical operations
- User communication about potential changes

---

## Type System Improvements

### Status: 📋 **Planned**
### Priority: 🟡 **Medium**
### Estimated Effort: 1 day

### Overview

Replace custom `ILatLng` interface with Leaflet's native `LatLngLiteral` type and implement smart coordinate detection for flexible input handling.

### Current Issues

#### Custom ILatLng Interface
```typescript
// Current redundant interface in polygon-helpers.ts
export interface ILatLng {
    lat: number, 
    lng: number;
}
```

**Problem**: This is identical to Leaflet's `LatLngLiteral` - unnecessary duplication.

#### Mixed Coordinate Formats
- Leaflet uses `{lat, lng}` format
- GeoJSON uses `[lng, lat]` format
- Various APIs use different conventions

### Migration Plan

#### Phase 1: Replace ILatLng with LatLngLiteral

**1.1 Update polygon-helpers.ts**
```typescript
// Remove custom interface
// export interface ILatLng { lat: number, lng: number; }

// Add import
import type { LatLngLiteral } from 'leaflet';

// Replace all ILatLng with LatLngLiteral in PolygonInfo class
```

**1.2 Update polydraw.ts**
```typescript
// Change import
import type { LatLngLiteral } from 'leaflet';
// Remove: import type { ILatLng } from "./polygon-helpers";

// Replace all ILatLng references with LatLngLiteral
```

#### Phase 2: Smart Coordinate Detection

**2.1 Create Coordinate Normalizer**
```typescript
/**
 * Intelligently converts various coordinate formats to LatLngLiteral
 * Handles: [lng, lat], [lat, lng], {x, y}, {lng, lat}, {lat, lng}
 */
class CoordinateNormalizer {
    /**
     * Normalize any coordinate input to LatLngLiteral format
     */
    static normalizeToLatLng(input: any): LatLngLiteral {
        // Array format [a, b]
        if (Array.isArray(input)) {
            const [a, b] = input;
            // If either value is outside lat range, it must be lng
            if (Math.abs(a) > 90) return { lat: b, lng: a }; // a is lng
            if (Math.abs(b) > 90) return { lat: a, lng: b }; // b is lng
            
            // Ambiguous case - use heuristics or default convention
            return { lat: a, lng: b }; // Assume [lat, lng]
        }
        
        // Object format
        if (typeof input === 'object') {
            // Already correct format
            if ('lat' in input && 'lng' in input) return input;
            
            // GeoJSON/GIS format {lng, lat} or {x, y}
            if ('x' in input && 'y' in input) return { lat: input.y, lng: input.x };
            
            // Handle other variations...
        }
        
        throw new Error('Invalid coordinate format');
    }
    
    /**
     * Detect coordinate format and convert array of coordinates
     */
    static normalizeCoordinateArray(coords: any[]): LatLngLiteral[] {
        return coords.map(coord => this.normalizeToLatLng(coord));
    }
}
```

**2.2 Enhanced Public API**
```typescript
// Enhanced public methods that accept flexible input
addPolygon(coordinates: any[]): void {
    const normalized = CoordinateNormalizer.normalizeCoordinateArray(coordinates);
    // ... rest of logic
}
```

#### Phase 3: Integration Points

**3.1 Update Public Methods**
```typescript
// Update addAutoPolygon to handle flexible input
addAutoPolygon(geographicBorders: any): void {
    // Normalize input to consistent format
    const normalizedBorders = this.normalizeInput(geographicBorders);
    // ... existing logic
}
```

### Implementation Checklist

#### Phase 1: Type Replacement
- [ ] Remove ILatLng interface from polygon-helpers.ts
- [ ] Update imports in all files
- [ ] Replace all ILatLng references with LatLngLiteral
- [ ] Update method signatures
- [ ] Verify TypeScript compilation

#### Phase 2: Smart Detection
- [ ] Create CoordinateNormalizer class
- [ ] Implement normalizeToLatLng method
- [ ] Add coordinate array normalization
- [ ] Add comprehensive tests
- [ ] Handle edge cases

#### Phase 3: API Enhancement
- [ ] Update public methods to accept flexible input
- [ ] Add input validation
- [ ] Maintain backward compatibility
- [ ] Update documentation
- [ ] Add usage examples

---

## Concaveman Migration

### Status: 📋 **Planned**
### Priority: 🟡 **Medium**
### Estimated Effort: 0.5-1 day

### Overview

Evaluate and potentially migrate from the external `concaveman` dependency to either Turf.js's native `@turf/concave` or create an internal concave hull utility to reduce dependencies and improve control over the algorithm.

### Current Implementation

**Current Usage**: `concaveman` v1.1.0 (external dependency)
```typescript
// In turf-helper.ts
import concaveman from "concaveman";

turfConcaveman(feature: Feature<Polygon | MultiPolygon>): Feature<Polygon | MultiPolygon> {
    let points = turf.explode(feature);
    const coordinates = points.features.map(f => f.geometry.coordinates);
    return turf.multiPolygon([[concaveman(coordinates)]]);
}
```

**Purpose**: Converts free-hand drawn polylines into concave hull polygons for natural shape creation.

### Migration Options Analysis

#### Option 1: Turf.js Native `@turf/concave`

**Pros:**
- ✅ **Integrated ecosystem**: Part of Turf.js suite
- ✅ **Consistent API**: Follows Turf conventions
- ✅ **Maintained**: Active development and support
- ✅ **Reduce dependencies**: One less external package
- ✅ **TypeScript support**: Native types included

**Cons:**
- ❌ **Different algorithm**: Uses TIN (Triangulated Irregular Network) approach
- ❌ **Potential quality difference**: May produce different/lower quality results
- ❌ **Parameter differences**: Uses `maxEdge` instead of `concavity`
- ❌ **Performance unknown**: Need to benchmark against current implementation

**Implementation:**
```typescript
// Replace concaveman with @turf/concave
import { concave } from '@turf/turf';

turfConcaveman(feature: Feature<MultiPolygon>): Feature<MultiPolygon> {
    let points = turf.explode(feature);
    
    // Convert to FeatureCollection<Point> format expected by @turf/concave
    const pointCollection = turf.featureCollection(
        points.features.map(f => turf.point(f.geometry.coordinates))
    );
    
    // Use turf.concave with appropriate maxEdge parameter
    const concaveHull = concave(pointCollection, { 
        maxEdge: 1, // Needs tuning - equivalent to concavity parameter
        units: 'kilometers' 
    });
    
    return concaveHull || turf.multiPolygon([]); // Handle null return
}
```

#### Option 2: Internal Concaveman Implementation

**Pros:**
- ✅ **Full control**: Complete control over algorithm and parameters
- ✅ **No external dependency**: Reduce package dependencies
- ✅ **Customizable**: Can optimize for specific use case
- ✅ **Quality preservation**: Keep exact same algorithm and quality
- ✅ **Performance optimization**: Can optimize for our specific needs

**Cons:**
- ❌ **Maintenance burden**: Need to maintain algorithm ourselves
- ❌ **Code complexity**: Additional code to maintain and test
- ❌ **License considerations**: Need to respect ISC license
- ❌ **Updates**: Won't get automatic improvements from upstream

**Implementation:**
```typescript
// Create src/concave-hull.ts utility
export class ConcaveHull {
    /**
     * Fast 2D concave hull algorithm
     * Based on mapbox/concaveman (ISC License)
     */
    static generate(points: number[][], concavity: number = 2, lengthThreshold: number = 0): number[][] {
        // Implementation based on concaveman algorithm
        // ... (algorithm implementation)
    }
}

// Update turf-helper.ts
import { ConcaveHull } from './concave-hull';

turfConcaveman(feature: Feature<MultiPolygon>): Feature<MultiPolygon> {
    let points = turf.explode(feature);
    const coordinates = points.features.map(f => f.geometry.coordinates);
    const hull = ConcaveHull.generate(coordinates);
    return turf.multiPolygon([[hull]]);
}
```

### Recommendation: Option 1 (Turf.js Native)

**Rationale:**
1. **Ecosystem consistency**: Better integration with existing Turf.js usage
2. **Maintenance**: Let Turf.js team handle algorithm maintenance
3. **Future compatibility**: Aligns with Turf.js v7+ migration
4. **Reduced complexity**: Simpler codebase with fewer dependencies

**Quality concerns can be mitigated by:**
- Parameter tuning (`maxEdge` equivalent to `concavity`)
- Fallback mechanism if quality is insufficient
- User testing and feedback

### Migration Plan

#### Phase 1: Research & Testing

**1.1 Create Test Comparison**
```typescript
// Create test utility to compare algorithms
function compareAlgorithms(testPoints: number[][]) {
    // Current concaveman result
    const concavemanResult = concaveman(testPoints);
    
    // Turf.concave result
    const pointCollection = turf.featureCollection(
        testPoints.map(p => turf.point(p))
    );
    const turfResult = turf.concave(pointCollection, { maxEdge: 1 });
    
    return {
        concaveman: concavemanResult,
        turf: turfResult,
        // Quality metrics comparison
    };
}
```

**1.2 Parameter Mapping**
- Research equivalent `maxEdge` values for different `concavity` settings
- Create conversion function: `concavity` → `maxEdge`
- Test with various drawing scenarios

**1.3 Quality Assessment**
- Visual comparison of results
- Performance benchmarking
- User acceptance testing

#### Phase 2: Implementation

**2.1 Update Dependencies**
```json
{
  "dependencies": {
    "@turf/turf": "^7.2.0"  // Already includes @turf/concave
    // Remove: "concaveman": "^1.1.0"
  }
}
```

**2.2 Update TurfHelper**
```typescript
// Replace turfConcaveman implementation
turfConcaveman(feature: Feature<MultiPolygon>): Feature<MultiPolygon> {
    try {
        let points = turf.explode(feature);
        
        const pointCollection = turf.featureCollection(
            points.features.map(f => turf.point(f.geometry.coordinates))
        );
        
        // Start with conservative maxEdge, tune based on testing
        const concaveHull = turf.concave(pointCollection, { 
            maxEdge: this.calculateMaxEdge(points.features.length),
            units: 'kilometers' 
        });
        
        if (concaveHull) {
            return this.getTurfPolygon(concaveHull);
        }
        
        // Fallback: return convex hull if concave fails
        const convexHull = turf.convex(pointCollection);
        return convexHull ? this.getTurfPolygon(convexHull) : turf.multiPolygon([]);
        
    } catch (error) {
        console.warn('Concave hull generation failed:', error);
        // Fallback to convex hull
        return this.generateConvexHull(feature);
    }
}

private calculateMaxEdge(pointCount: number): number {
    // Heuristic to convert point density to maxEdge
    // Needs tuning based on testing
    return Math.max(0.1, 2 / Math.sqrt(pointCount));
}
```

**2.3 Add Configuration**
```typescript
// Add to config.json
{
  "concaveHull": {
    "algorithm": "turf", // "turf" | "concaveman" | "internal"
    "maxEdge": "auto", // number | "auto"
    "fallbackToConvex": true
  }
}
```

#### Phase 3: Fallback Strategy (If Needed)

**3.1 Hybrid Approach**
```typescript
turfConcaveman(feature: Feature<MultiPolygon>): Feature<MultiPolygon> {
    // Try Turf.js first
    const turfResult = this.generateTurfConcave(feature);
    
    if (this.isQualityAcceptable(turfResult, feature)) {
        return turfResult;
    }
    
    // Fallback to original concaveman if quality is poor
    return this.generateConcavemanHull(feature);
}
```

**3.2 User Configuration**
Allow users to choose algorithm via configuration for quality vs. dependency trade-off.

### Implementation Checklist

#### Phase 1: Research & Testing
- [ ] Set up algorithm comparison framework
- [ ] Test with various drawing patterns (simple, complex, sparse, dense)
- [ ] Map concavity parameters to maxEdge values
- [ ] Performance benchmark both algorithms
- [ ] Document quality differences and use cases

#### Phase 2: Implementation
- [ ] Update package.json dependencies
- [ ] Implement new turfConcaveman method
- [ ] Add parameter calculation logic
- [ ] Implement fallback mechanisms
- [ ] Add configuration options
- [ ] Update error handling

#### Phase 3: Testing & Validation
- [ ] Unit tests for new implementation
- [ ] Integration tests with drawing functionality
- [ ] Visual regression testing
- [ ] Performance testing
- [ ] User acceptance testing

#### Phase 4: Documentation & Cleanup
- [ ] Update API documentation
- [ ] Add migration notes
- [ ] Remove old concaveman dependency
- [ ] Update examples and demos

### Testing Strategy

#### Quality Testing
- **Visual comparison**: Side-by-side comparison of hull generation
- **Edge cases**: Test with minimal points, collinear points, duplicate points
- **Performance**: Benchmark with various point densities
- **User scenarios**: Test with real drawing patterns

#### Integration Testing
- **Drawing flow**: End-to-end testing of draw → concave hull → polygon
- **Parameter sensitivity**: Test different maxEdge values
- **Error handling**: Test failure scenarios and fallbacks

### Risk Assessment

#### Low Risk
- Turf.js is well-maintained and stable
- Fallback mechanisms can preserve functionality
- Configuration allows gradual migration

#### Medium Risk
- Quality differences may affect user experience
- Parameter tuning may require iteration
- Performance characteristics may differ

#### Mitigation
- Comprehensive testing before deployment
- User feedback collection and iteration
- Hybrid approach as safety net
- Clear documentation of changes

---

## Future Plans Template

### Status: 📋 **Template**
### Priority: ⚪ **TBD**
### Estimated Effort: TBD

### Overview

[Brief description of the refactoring goal and scope]

### Current Issues

[Detailed analysis of current problems and pain points]

### Benefits

[Expected benefits and improvements after completion]

### Migration Plan

#### Phase 1: [Phase Name]
[Detailed steps and implementation details]

#### Phase 2: [Phase Name]
[Detailed steps and implementation details]

#### Phase 3: [Phase Name]
[Detailed steps and implementation details]

### Implementation Checklist

#### Phase 1: [Phase Name]
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

#### Phase 2: [Phase Name]
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

### Testing Strategy

[Comprehensive testing approach including unit, integration, and regression tests]

### Risk Assessment

[Analysis of risks and mitigation strategies]

---

## Cross-Plan Dependencies

### Dependency Matrix

| Plan | Depends On | Blocks |
|------|------------|--------|
| MultiPolygon Standardization | - | Type System Improvements |
| Turf.js v7+ Migration | - | - |
| Type System Improvements | MultiPolygon Standardization | - |

### Recommended Implementation Order

1. **Turf.js v7+ Migration** (Critical - fixes immediate issue)
2. **MultiPolygon Standardization** (High impact - simplifies codebase)
3. **Type System Improvements** (Quality of life - better developer experience)

---

## Progress Tracking

### Overall Status

- 🚨 **Critical**: Immediate attention required
- 🔥 **High**: Important for next release
- 🟡 **Medium**: Planned for future release
- ⚪ **Low**: Nice to have

### Completion Status

- ✅ **Completed**: Implementation finished and tested
- 🚧 **In Progress**: Currently being worked on
- 📋 **Planned**: Documented and ready to start
- 💭 **Proposed**: Under consideration

---

*This document serves as the master plan for all Leaflet.Polydraw refactoring efforts. All major architectural changes should be documented here to ensure consistency and track progress across the project.*
