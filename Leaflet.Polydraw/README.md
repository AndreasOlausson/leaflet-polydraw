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
4. [API Reference](#api-reference)
5. [Markers](#markers)
6. [Marker position](#marker-position)

## Summary

PolyDraw is a powerful Leaflet plugin that enables free-hand drawing of polygons with advanced features like:

- **Free-hand drawing**: Draw natural shapes with your mouse or touch
- **Concave polygons**: Automatically creates concave polygons from your drawings
- **Hole support**: Create donut-shaped polygons by subtracting areas
- **Editable polygons**: Drag vertices to modify shapes after creation
- **Merge polygons**: Automatically merge overlapping polygons
- **Simplification**: Reduce polygon complexity while maintaining shape
- **Double the vertices**: Insert midpoints between each pair of vertices to increase shape resolution
- **Bounding box conversion**: Convert polygons to their bounding rectangles
- **Bezier curves**: Smooth polygon edges with bezier interpolation (alpha phase)

## Installation

```bash
npm install leaflet-polydraw
```

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
const polyDrawControl = L.control.polydraw({
  position: 'topright'
}).addTo(map);

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
const polyDrawControl = L.control.polydraw({
  position: 'topright',
  config: {
    touchSupport: true,
    mergePolygons: true,
    modes: {
      attachElbow: true,
      dragElbow: true
    },
    markers: {
      deleteMarker: true,
      infoMarker: true,
      menuMarker: true,
      markerDeleteIcon: {
        position: MarkerPosition.NorthWest
      },
      markerInfoIcon: {
        position: MarkerPosition.NorthEast,
        useMetrics: true
      }
    },
    polygonOptions: {
      color: '#ff0000',
      fillColor: '#ff0000',
      fillOpacity: 0.3
    }
  }
}).addTo(map);

// Programmatically control drawing modes
polyDrawControl.setDrawMode(DrawMode.Add);

// Add predefined polygons
const starPolygon = [[[
  { lat: 59.903, lng: 10.724 },
  { lat: 59.908, lng: 10.728 },
  { lat: 59.91, lng: 10.720 },
  // ... more coordinates
]]];
polyDrawControl.addAutoPolygon(starPolygon);
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
      dragElbow: true
    },
    markers: {
      deleteMarker: true,
      infoMarker: true,
      menuMarker: true,
      coordsTitle: true
    },
    polygonOptions: {
      color: "#50622b",
      fillColor: "#b4cd8a",
      smoothFactor: 0.3
    }
    // ... see full configuration below
  }
});
```

### External configuration file

You can also load configuration from an external JSON file:

```javascript
const polyDrawControl = L.control.polydraw({
  configPath: "path/to/your/polydraw.config.json"
});
```

## Config explained

|Key|Type|Default|Description|
|---|----|-------|-----------|
| touchSupport			|boolean| `true`        | Allow touch support for mobile devices. |
| mergePolygons           |boolean| `true`        | PolyDraw attempts to merge polygons if they are intersecting. |
| kinks              		|boolean| `false`        | Allow self-intersecting polygons. |
| **modes**              	|object|         | Turn on or off features |
| &nbsp;&nbsp;&nbsp;attachElbow             |boolean| `false`        | When enabled, clicking on polygon edges adds new vertices |
| &nbsp;&nbsp;&nbsp;dragElbow             |boolean| `true`        | When enabled, dragging vertices is allowed |
| **markers**             |object|         | Main object for marker configuration. |
| &nbsp;&nbsp;&nbsp;deleteMarker            |boolean| `true`        | When enabled, show delete marker icon. |
| &nbsp;&nbsp;&nbsp;infoMarker              |boolean| `true`        | When enabled, show info marker icon with area/perimeter. |
| &nbsp;&nbsp;&nbsp;menuMarker              |boolean| `true`        | When enabled, show menu marker icon with polygon operations. |
| &nbsp;&nbsp;&nbsp;coordsTitle             |boolean| `true`        | When enabled, show tooltip with coordinate information on vertex markers. |
| &nbsp;&nbsp;&nbsp;zIndexOffset             |number| `0`        | Global z-index offset for all markers. |
| **polygonOptions**        	|object|         | Leaflet polygon styling options. |
| &nbsp;&nbsp;&nbsp;color              		|string| `#50622b`        | Polygon border color |
| &nbsp;&nbsp;&nbsp;fillColor           	|string| `#b4cd8a`        | Polygon fill color. |
| &nbsp;&nbsp;&nbsp;smoothFactor         	|number| `0.3`        | How much to simplify the polygon on zoom. |
| **simplification**        	|object|         | Polygon simplification settings. |
| &nbsp;&nbsp;&nbsp;**simplifyTolerance**       |object|         | Tolerance configuration for Douglas-Peucker algorithm |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;tolerance           	|number| `0.0001`        | Simplification tolerance (lower = higher quality, more points). |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;highQuality         	|boolean| `false`        | Use high-quality simplification (slower but better results). |

## Draw modes

The plugin supports several drawing modes accessible through the `DrawMode` enum:

```javascript
import { DrawMode } from 'leaflet-polydraw';

// Available modes:
DrawMode.Off        // Drawing disabled
DrawMode.Add        // Add new polygons
DrawMode.Subtract   // Create holes in existing polygons
DrawMode.Edit       // Edit existing polygons
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

#### `addAutoPolygon(geographicBorders: L.LatLng[][][])`
Programmatically add a polygon to the map.

```javascript
const polygon = [[[
  { lat: 59.903, lng: 10.724 },
  { lat: 59.908, lng: 10.728 },
  { lat: 59.91, lng: 10.720 }
]]];
polyDrawControl.addAutoPolygon(polygon);
```

#### `configurate(config: any)`
Update the configuration after initialization.

```javascript
polyDrawControl.configurate({
  polygonOptions: {
    color: '#ff0000',
    fillColor: '#ff0000'
  }
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
});
```

## Markers

The plugin provides three types of special markers on each polygon:

### Delete Marker (Default: North West)
- **Purpose**: Delete the entire polygon
- **Styling**: Configurable via `markerDeleteIcon` settings
- **Position**: Configurable via `MarkerPosition` enum

### Info Marker (Default: North East)
- **Purpose**: Display polygon information (area, perimeter)
- **Features**: 
  - Metric/Imperial units
  - Customizable labels
  - Area and perimeter calculations
- **Styling**: Configurable via `markerInfoIcon` settings

### Menu Marker (Default: West)
- **Purpose**: Access polygon operations
- **Operations**:
  - **Simplify**: Reduce number of vertices
  - **Bounding Box**: Convert to rectangular bounds
  - **Double Elbows**: Add intermediate vertices
  - **Bezier**: Apply bezier curve smoothing
- **Styling**: Configurable via `markerMenuIcon` settings

## Marker Position

You can customize marker positions using the `MarkerPosition` enum:

```javascript
const polyDrawControl = L.control.polydraw({
  config: {
    markers: {
      markerDeleteIcon: {
        position: MarkerPosition.North
      },
      markerInfoIcon: {
        position: MarkerPosition.East
      },
      markerMenuIcon: {
        position: MarkerPosition.West
      }
    }
  }
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

### v0.0.1
- Initial release
- Ported from Angular service to native Leaflet plugin
- Full feature parity with original implementation
