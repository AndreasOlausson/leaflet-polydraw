# Leaflet.Polydraw

> PolyDraw is a free-hand drawing tool that allows you to draw shapes which are converted to polygons on your Leaflet map. The tool supports concaving by default, subtracting (donut polygons) and are fully editable by adding edges, dragging edges.

PolyDraw was initially heavily inspired by [Leaflet.FreeDraw (Adam Timberlake "Wildhoney")](https://github.com/Wildhoney/Leaflet.FreeDraw) and [leaflet-freehandshapes (Benjamin DeLong "bozdoz")](https://github.com/bozdoz/leaflet-freehandshapes), so a big thank you and kudos for you!

This is a native Leaflet plugin ported from an Angular service implementation.

## Author

Created and maintained by [Andreas Olausson](https://github.com/andreasolausson).  
Feel free to reach out via GitHub for suggestions, feedback or collaboration.

## Table of Contents

1. [Summary](#summary)
2. [Installation](#installation)
3. [Getting started](#getting-started)
   1. [Basic Usage](#basic-usage)
   2. [Configuration](#configuration)
   3. [Configuration explained](#config-explained)
   4. [Draw modes](#draw-modes)
   5. [Enums](#enums)
4. [Features](#features)
   1. [Polygon Dragging](#polygon-dragging)
   2. [Smart Merge Systems](#smart-merge-systems)
   3. [Polygon Operations](#polygon-operations)
   4. [Visual Feedback](#visual-feedback)
5. [API Reference](#api-reference)
6. [Markers](#markers)
7. [Marker position](#marker-position)

## Summary

PolyDraw is a powerful Leaflet plugin that enables free-hand drawing of polygons with advanced features like:

- **Free-hand drawing**: Draw natural shapes with your mouse or touch
- **Concave polygons**: Automatically creates concave polygons from your drawings
- **Hole support**: Create donut-shaped polygons by subtracting areas
- **Editable polygons**: Drag vertices to modify shapes after creation
- **🆕 Polygon dragging**: Drag entire polygons to reposition them with smart interactions
- **🆕 Drag-to-merge**: Automatically merge polygons when dragged together
- **🆕 Drag-to-hole**: Create holes by dragging polygons inside others
- **Merge polygons**: Automatically merge overlapping polygons during drawing
- **Simplification**: Reduce polygon complexity while maintaining shape
- **Double the vertices**: Insert midpoints between each pair of vertices to increase shape resolution
- **Bounding box conversion**: Convert polygons to their bounding rectangles
- **Bezier curves**: Smooth polygon edges with bezier interpolation (alpha phase)

## Installation

```bash
npm install leaflet-polydraw
```

### TypeScript Support

This package includes TypeScript declarations. However, due to potential conflicts with different versions of `@types/leaflet`, you may need to create a custom declaration file in your project.

If you encounter the error:

```
Could not find a declaration file for module 'leaflet-polydraw'
```

Create a file `src/leaflet-polydraw.d.ts` in your project with the following content:

```typescript
declare module 'leaflet-polydraw' {
  import * as L from 'leaflet';

  export default class Polydraw extends L.Control {
    constructor(options?: L.ControlOptions & { config?: any });
    addTo(map: L.Map): this;
    configurate(config: any): void;
    onAdd(map: L.Map): HTMLElement;
    addAutoPolygon(geographicBorders: L.LatLng[][][]): void;
    setDrawMode(mode: any): void;
    deletePolygon(polygon: any): void;
    removeAllFeatureGroups(): void;
    getDrawMode(): any;
    enablePolygonDraggingMode(enable?: boolean): void;
  }
}
```

This ensures proper TypeScript support while avoiding version conflicts with `@types/leaflet`.

## Getting started

### Basic Usage

```javascript
import * as L from 'leaflet';
import Polydraw from 'leaflet-polydraw';

// Create your map
const map = L.map('map').setView([59.911491, 10.757933], 16);

// Add a tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Add the PolyDraw control to your map
const polyDrawControl = L.control
  .polydraw({
    position: 'topright',
  })
  .addTo(map);

// Listen for draw mode changes
polyDrawControl.onDrawModeChanged((mode) => {
  console.log('Draw mode changed to:', mode);
});
```

### Advanced Usage with Custom Configuration

```javascript
import * as L from 'leaflet';
import Polydraw, { DrawMode, MarkerPosition } from 'leaflet-polydraw';

const map = L.map('map').setView([59.911491, 10.757933], 16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Create PolyDraw with custom configuration
const polyDrawControl = L.control
  .polydraw({
    position: 'topright',
    config: {
      touchSupport: true,
      mergePolygons: true,
      modes: {
        attachElbow: true,
        dragElbow: true,
        dragPolygons: true,
      },
      dragPolygons: {
        autoMergeOnIntersect: true,
        autoHoleOnContained: true,
        markerBehavior: 'hide',
      },
      markers: {
        deleteMarker: true,
        infoMarker: true,
        menuMarker: true,
        markerDeleteIcon: {
          position: MarkerPosition.NorthWest,
        },
        markerInfoIcon: {
          position: MarkerPosition.NorthEast,
          useMetrics: true,
        },
      },
      polygonOptions: {
        color: '#ff0000',
        fillColor: '#ff0000',
        fillOpacity: 0.3,
      },
    },
  })
  .addTo(map);

// Programmatically control drawing modes
polyDrawControl.setDrawMode(DrawMode.Add);

// Enable/disable polygon dragging
polyDrawControl.enablePolygonDraggingMode(true);

// Add predefined polygons - octagon example
const octagonPolygon = [
  [
    [
      { lat: 59.911491, lng: 10.757933 }, // Center point
      { lat: 59.912491, lng: 10.757933 }, // North
      { lat: 59.912198, lng: 10.759433 }, // North-East
      { lat: 59.911491, lng: 10.759933 }, // East
      { lat: 59.910784, lng: 10.759433 }, // South-East
      { lat: 59.910491, lng: 10.757933 }, // South
      { lat: 59.910784, lng: 10.756433 }, // South-West
      { lat: 59.911491, lng: 10.755933 }, // West
      { lat: 59.912198, lng: 10.756433 }, // North-West
      { lat: 59.912491, lng: 10.757933 }, // Close the polygon
    ],
  ],
];
polyDrawControl.addAutoPolygon(octagonPolygon);
```

## Configuration

### Default configuration

The plugin comes with sensible defaults, but you can customize every aspect:

```javascript
const polyDrawControl = L.control.polydraw({
  config: {
    touchSupport: true,
    mergePolygons: true,
    kinks: false,
    modes: {
      attachElbow: false,
      dragElbow: true,
      dragPolygons: true,
    },
    dragPolygons: {
      autoMergeOnIntersect: true,
      autoHoleOnContained: true,
      markerBehavior: 'hide',
      hoverCursor: 'grab',
      dragCursor: 'move',
    },
    markers: {
      deleteMarker: true,
      infoMarker: true,
      menuMarker: true,
      coordsTitle: true,
    },
    polygonOptions: {
      color: '#50622b',
      fillColor: '#b4cd8a',
      smoothFactor: 0.3,
    },
    // ... see full configuration below
  },
});
```

### External configuration file

You can also load configuration from an external JSON file:

```javascript
const polyDrawControl = L.control.polydraw({
  configPath: 'path/to/your/polydraw.config.json',
});
```

## Config explained

| Key                                             | Type    | Default   | Description                                                                      |
| ----------------------------------------------- | ------- | --------- | -------------------------------------------------------------------------------- |
| touchSupport                                    | boolean | `true`    | Allow touch support for mobile devices.                                          |
| mergePolygons                                   | boolean | `true`    | PolyDraw attempts to merge polygons if they are intersecting **during drawing**. |
| kinks                                           | boolean | `false`   | Allow self-intersecting polygons.                                                |
| **modes**                                       | object  |           | Turn on or off features                                                          |
| &nbsp;&nbsp;&nbsp;attachElbow                   | boolean | `false`   | When enabled, clicking on polygon edges adds new vertices                        |
| &nbsp;&nbsp;&nbsp;dragElbow                     | boolean | `true`    | When enabled, dragging vertices is allowed                                       |
| &nbsp;&nbsp;&nbsp;dragPolygons                  | boolean | `true`    | When enabled, entire polygons can be dragged to reposition them                  |
| **dragPolygons**                                | object  |           | 🆕 Configuration for polygon dragging behavior                                   |
| &nbsp;&nbsp;&nbsp;autoMergeOnIntersect          | boolean | `true`    | Automatically merge polygons when dragged into each other                        |
| &nbsp;&nbsp;&nbsp;autoHoleOnContained           | boolean | `true`    | Create holes when dragging polygons completely inside others                     |
| &nbsp;&nbsp;&nbsp;markerBehavior                | string  | `"hide"`  | How markers behave during drag: `"hide"` or `"drag"`                             |
| &nbsp;&nbsp;&nbsp;hoverCursor                   | string  | `"grab"`  | Cursor when hovering over draggable polygons                                     |
| &nbsp;&nbsp;&nbsp;dragCursor                    | string  | `"move"`  | Cursor during active dragging                                                    |
| &nbsp;&nbsp;&nbsp;opacity                       | number  | `0.7`     | Polygon opacity during drag (0-1)                                                |
| &nbsp;&nbsp;&nbsp;markerAnimationDuration       | number  | `200`     | Duration of marker fade animations in milliseconds                               |
| **markers**                                     | object  |           | Main object for marker configuration.                                            |
| &nbsp;&nbsp;&nbsp;deleteMarker                  | boolean | `true`    | When enabled, show delete marker icon.                                           |
| &nbsp;&nbsp;&nbsp;infoMarker                    | boolean | `true`    | When enabled, show info marker icon with area/perimeter.                         |
| &nbsp;&nbsp;&nbsp;menuMarker                    | boolean | `true`    | When enabled, show menu marker icon with polygon operations.                     |
| &nbsp;&nbsp;&nbsp;coordsTitle                   | boolean | `true`    | When enabled, show tooltip with coordinate information on vertex markers.        |
| &nbsp;&nbsp;&nbsp;zIndexOffset                  | number  | `0`       | Global z-index offset for all markers.                                           |
| **polygonOptions**                              | object  |           | Leaflet polygon styling options.                                                 |
| &nbsp;&nbsp;&nbsp;color                         | string  | `#50622b` | Polygon border color                                                             |
| &nbsp;&nbsp;&nbsp;fillColor                     | string  | `#b4cd8a` | Polygon fill color.                                                              |
| &nbsp;&nbsp;&nbsp;smoothFactor                  | number  | `0.3`     | How much to simplify the polygon on zoom.                                        |
| **simplification**                              | object  |           | Polygon simplification settings.                                                 |
| &nbsp;&nbsp;&nbsp;**simplifyTolerance**         | object  |           | Tolerance configuration for Douglas-Peucker algorithm                            |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;tolerance   | number  | `0.0001`  | Simplification tolerance (lower = higher quality, more points).                  |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;highQuality | boolean | `false`   | Use high-quality simplification (slower but better results).                     |

### Understanding Merge Behaviors

The plugin has **two independent merge systems** that work at different stages:

#### 1. Drawing Merge (`mergePolygons`)

- **When**: During polygon creation/drawing
- **Purpose**: Automatically merge new polygons with existing ones they intersect
- **Use case**: Streamlined drawing workflow

#### 2. Drag Merge (`autoMergeOnIntersect`)

- **When**: During polygon dragging
- **Purpose**: Merge polygons when dragged together
- **Use case**: Interactive editing and combining

**Example configurations:**

```javascript
// Merge during drawing, but not during dragging
{
  mergePolygons: true,
  dragPolygons: {
    autoMergeOnIntersect: false
  }
}

// No merge during drawing, but merge when dragging
{
  mergePolygons: false,
  dragPolygons: {
    autoMergeOnIntersect: true
  }
}

// Merge in both scenarios (default)
{
  mergePolygons: true,
  dragPolygons: {
    autoMergeOnIntersect: true
  }
}
```

## Draw modes

The plugin supports several drawing modes accessible through the `DrawMode` enum:

```javascript
import { DrawMode } from 'leaflet-polydraw';

// Available modes:
DrawMode.Off; // Drawing disabled, polygon dragging enabled
DrawMode.Add; // Add new polygons, polygon dragging disabled
DrawMode.Subtract; // Create holes in existing polygons, polygon dragging disabled
DrawMode.Edit; // Edit existing polygons
```

## Enums

### DrawMode

```javascript
enum DrawMode {
    Off = 0,
    Add = 1,
    Edit = 2,
    Subtract = 4,
    AppendMarker = 8,
    LoadPredefined = 16
}
```

### MarkerPosition

```javascript
enum MarkerPosition {
    SouthWest = 0,
    South = 1,
    SouthEast = 2,
    East = 3,
    NorthEast = 4,
    North = 5,
    NorthWest = 6,
    West = 7
}
```

## Features

This section covers the key features that make Leaflet.Polydraw a powerful polygon editing tool.

### Polygon Dragging

🆕 **Drag entire polygons** to reposition them with intelligent spatial interactions.

#### Basic Dragging

Once polygon dragging is enabled (default), you can:

1. **Switch to normal mode** (DrawMode.Off) - dragging only works when not in draw/subtract mode
2. **Hover over a polygon** - cursor changes to `grab` to indicate it's draggable
3. **Click and drag** - cursor changes to `move`, polygon becomes semi-transparent
4. **Release** - polygon is repositioned, cursor resets, markers fade back in

```javascript
// Enable/disable polygon dragging
polyDrawControl.enablePolygonDraggingMode(true);

// Check if dragging is enabled
const isDragEnabled = polyDrawControl.config.modes.dragPolygons;
```

#### Smart Drag Interactions

The plugin provides intelligent behavior when dragging polygons:

**🔗 Drag-to-Merge**: When you drag a polygon so it **intersects** with another polygon, both polygons are automatically **merged** into a single shape.

**🕳️ Drag-to-Hole**: When you drag a polygon **completely inside** another polygon, the dragged polygon creates a **hole** in the containing polygon.

**📍 Normal Repositioning**: When you drag a polygon to an **empty area**, it's simply repositioned without geometric operations.

#### Drag Events

```javascript
// Listen for drag events
map.on('polygon:dragstart', (e) => {
  console.log('Drag started:', e.polygon);
});

map.on('polygon:dragend', (e) => {
  console.log('Drag ended:', e.polygon);
  console.log('Old position:', e.oldPosition);
  console.log('New position:', e.newPosition);
});
```

### Smart Merge Systems

The plugin features **two independent merge systems** for different workflows:

#### Drawing Merge (`mergePolygons`)

- **When**: During polygon creation/drawing
- **Purpose**: Automatically merge new polygons with existing ones they intersect
- **Use case**: Streamlined drawing workflow

#### Drag Merge (`autoMergeOnIntersect`)

- **When**: During polygon dragging
- **Purpose**: Merge polygons when dragged together
- **Use case**: Interactive editing and combining

```javascript
// Configure merge behaviors independently
const polyDrawControl = L.control.polydraw({
  config: {
    mergePolygons: true, // Merge during drawing
    dragPolygons: {
      autoMergeOnIntersect: true, // Merge during dragging
      autoHoleOnContained: true, // Create holes when appropriate
    },
  },
});
```

### Polygon Operations

Access powerful polygon transformation tools through the **menu marker**:

#### Simplification

- **Purpose**: Reduce polygon complexity while maintaining shape
- **Algorithm**: Douglas-Peucker simplification
- **Configurable**: Tolerance and quality settings

#### Bounding Box Conversion

- **Purpose**: Convert polygons to their rectangular bounds
- **Use case**: Quick area approximation or collision detection

#### Double Elbows

- **Purpose**: Insert midpoints between vertices to increase resolution
- **Use case**: Preparing polygons for further editing or smoothing

#### Bezier Curves (Alpha)

- **Purpose**: Apply bezier curve smoothing to polygon edges
- **Use case**: Creating organic, flowing shapes

```javascript
// Access operations through menu marker or programmatically
const polyDrawControl = L.control.polydraw({
  config: {
    markers: {
      menuMarker: true, // Enable menu marker
      markerMenuIcon: {
        position: MarkerPosition.West,
      },
    },
    simplification: {
      simplifyTolerance: {
        tolerance: 0.0001, // Lower = higher quality
        highQuality: true, // Better results, slower
      },
    },
  },
});
```

### Visual Feedback

The plugin provides rich visual feedback for all interactions:

#### Cursor Management

- **Crosshair**: During draw and subtract modes
- **Grab**: When hovering over draggable polygons
- **Move**: During active polygon dragging
- **Default**: In normal mode

#### Marker Animations

- **Fade Out**: Markers smoothly disappear during polygon drag
- **Fade In**: Markers smoothly reappear when drag ends
- **Configurable**: Animation duration and behavior

#### Polygon States

- **Semi-transparent**: During drag operations
- **Highlighted**: On hover (configurable)
- **Normal**: Default appearance

```javascript
// Customize visual feedback
const polyDrawControl = L.control.polydraw({
  config: {
    dragPolygons: {
      opacity: 0.7, // Drag transparency
      hoverCursor: 'grab', // Hover cursor
      dragCursor: 'move', // Drag cursor
      markerBehavior: 'hide', // Marker behavior
      markerAnimationDuration: 200, // Animation speed
    },
    polygonOptions: {
      color: '#50622b', // Border color
      fillColor: '#b4cd8a', // Fill color
      fillOpacity: 0.5, // Fill transparency
    },
  },
});
```

## API Reference

### Methods

#### `setDrawMode(mode: DrawMode)`

Set the current drawing mode.

```javascript
polyDrawControl.setDrawMode(DrawMode.Add);
```

#### `getDrawMode(): DrawMode`

Get the current drawing mode.

```javascript
const currentMode = polyDrawControl.getDrawMode();
```

#### `enablePolygonDraggingMode(enable: boolean)`

🆕 Enable or disable polygon dragging functionality.

```javascript
// Enable dragging
polyDrawControl.enablePolygonDraggingMode(true);

// Disable dragging
polyDrawControl.enablePolygonDraggingMode(false);
```

#### `addAutoPolygon(geographicBorders: L.LatLng[][][])`

Programmatically add a polygon to the map.

```javascript
const polygon = [
  [
    [
      { lat: 59.903, lng: 10.724 },
      { lat: 59.908, lng: 10.728 },
      { lat: 59.91, lng: 10.72 },
    ],
  ],
];
polyDrawControl.addAutoPolygon(polygon);
```

#### `configurate(config: any)`

Update the configuration after initialization.

```javascript
polyDrawControl.configurate({
  dragPolygons: {
    autoMergeOnIntersect: false,
    hoverCursor: 'pointer',
  },
  polygonOptions: {
    color: '#ff0000',
    fillColor: '#ff0000',
  },
});
```

#### `removeAllFeatureGroups()`

Remove all polygons from the map.

```javascript
polyDrawControl.removeAllFeatureGroups();
```

### Events

#### `onDrawModeChanged(callback: (mode: DrawMode) => void)`

Listen for draw mode changes.

```javascript
polyDrawControl.onDrawModeChanged((mode) => {
  console.log('Draw mode changed to:', mode);

  // Dragging is only available in Off mode
  if (mode === DrawMode.Off) {
    console.log('Polygon dragging is now available');
  }
});
```

#### 🆕 Polygon Drag Events

**`polygon:dragstart`** - Fired when polygon drag begins

```javascript
map.on('polygon:dragstart', (e) => {
  // e.polygon - The polygon being dragged
  // e.featureGroup - The feature group containing the polygon
  // e.originalLatLngs - Original coordinates before drag
});
```

**`polygon:drag`** - Fired during polygon drag (if realTimeUpdate is enabled)

```javascript
map.on('polygon:drag', (e) => {
  // e.polygon - The polygon being dragged
  // e.featureGroup - The feature group containing the polygon
});
```

**`polygon:dragend`** - Fired when polygon drag ends

```javascript
map.on('polygon:dragend', (e) => {
  // e.polygon - The polygon that was dragged
  // e.featureGroup - The feature group containing the polygon
  // e.oldPosition - Coordinates before drag
  // e.newPosition - Coordinates after drag
});
```

## Markers

The plugin provides three types of special markers on each polygon:

### Delete Marker (Default: North West)

- **Purpose**: Delete the entire polygon
- **Styling**: Configurable via `markerDeleteIcon` settings
- **Position**: Configurable via `MarkerPosition` enum
- **🆕 Drag behavior**: Fades out during polygon drag, fades back in when released

### Info Marker (Default: North East)

- **Purpose**: Display polygon information (area, perimeter)
- **Features**:
  - Metric/Imperial units
  - Customizable labels
  - Area and perimeter calculations
- **Styling**: Configurable via `markerInfoIcon` settings
- **🆕 Drag behavior**: Fades out during polygon drag, fades back in when released

### Menu Marker (Default: West)

- **Purpose**: Access polygon operations
- **Operations**:
  - **Simplify**: Reduce number of vertices
  - **Bounding Box**: Convert to rectangular bounds
  - **Double Elbows**: Add intermediate vertices
  - **Bezier**: Apply bezier curve smoothing
- **Styling**: Configurable via `markerMenuIcon` settings
- **🆕 Drag behavior**: Fades out during polygon drag, fades back in when released

## Marker Position

You can customize marker positions using the `MarkerPosition` enum:

```javascript
const polyDrawControl = L.control.polydraw({
  config: {
    markers: {
      markerDeleteIcon: {
        position: MarkerPosition.North,
      },
      markerInfoIcon: {
        position: MarkerPosition.East,
      },
      markerMenuIcon: {
        position: MarkerPosition.West,
      },
    },
  },
});
```

Available positions:

- `MarkerPosition.SouthWest` (0)
- `MarkerPosition.South` (1)
- `MarkerPosition.SouthEast` (2)
- `MarkerPosition.East` (3)
- `MarkerPosition.NorthEast` (4)
- `MarkerPosition.North` (5)
- `MarkerPosition.NorthWest` (6)
- `MarkerPosition.West` (7)

## Dependencies

- **Leaflet** (^1.9.4): Core mapping library
- **@turf/turf** (^6.5.0): Geospatial analysis functions
- **concaveman** (^1.1.0): Concave hull generation

## Browser Support

This plugin supports all modern browsers that support:

- ES6+ JavaScript features
- Leaflet 1.9+
- Touch events (for mobile support)
- CSS transitions (for smooth animations)

## License

This project is licensed under the [MIT License](./LICENSE). You are free to use, modify, and distribute it as you wish, as long as the original license is included.

---

## Contributing

Contributions are welcome! If you find a bug, have a feature request, or want to improve the documentation, feel free to open an issue or submit a pull request.

Before submitting a pull request, make sure to:

- Follow the existing coding style.
- Update or add documentation when relevant.
- Include tests if applicable.

## Changelog

### v0.0.2 (Latest)

- 🆕 **Polygon Dragging**: Complete drag-and-drop functionality for repositioning polygons
- 🆕 **Drag-to-Merge**: Automatically merge polygons when dragged together
- 🆕 **Drag-to-Hole**: Create holes by dragging polygons inside others
- 🆕 **Smart Cursors**: Context-aware cursor changes (grab, move, crosshair)
- 🆕 **Marker Animations**: Smooth fade effects during polygon operations
- 🆕 **Comprehensive Events**: Rich event system for drag operations
- 🆕 **Configurable Behavior**: Extensive configuration options for drag interactions
- ✅ **Mode Isolation**: Drag functionality properly isolated from draw/subtract modes
- ✅ **Performance Optimized**: Efficient geometric operations using Turf.js
- ✅ **Fully Tested**: Comprehensive test coverage for all drag functionality

### v0.0.1

- Initial release
- Ported from Angular service to native Leaflet plugin
- Full feature parity with original implementation

## Planned Work

### Enhanced Drag Features

- **Multi-polygon selection** - Drag multiple polygons simultaneously
- **Snap-to-grid** - Optional grid snapping during drag operations
- **Drag constraints** - Limit drag to specific areas or directions
- **Undo/Redo** - History management for drag operations

### Type System Improvements

- **Replace custom ILatLng** - Use Leaflet's native `LatLngLiteral` type
- **Smart coordinate detection** - Auto-detect and convert `[lng,lat]` ↔ `[lat,lng]` formats
- **Flexible input handling** - Accept GeoJSON, Leaflet, or custom coordinate formats

### Performance Optimizations

- **Reduce type conversions** - Minimize coordinate format switching overhead
- **Memory usage** - Optimize polygon storage and processing
- **Large dataset handling** - Improved performance with many polygons

### Developer Experience

- **Better TypeScript support** - Enhanced type safety and IntelliSense
- **Coordinate format flexibility** - Automatic format detection and conversion
- **More examples** - Additional use cases and integration patterns
- **Interactive demos** - Live examples showcasing all features
