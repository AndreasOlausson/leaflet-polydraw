[![Leaflet Polydraw](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/logo.jpg)](https://github.com/AndreasOlausson/leaflet-polydraw)

# Leaflet Polydraw

**Live Demo**: [https://polydraw.ao-tech.se](https://polydraw.ao-tech.se)

> **Advanced Leaflet plugin for interactive polygon drawing with point-to-point creation, smart merging, and comprehensive editing tools**

**Leaflet.Polydraw** is a feature-rich plugin that enables interactive polygon drawing and editing on Leaflet maps. It includes support for intelligent shape merging, drag-and-drop manipulation, and detailed editing tools — making it well suited for GIS platforms, mapping applications, and spatial data workflows.

[![npm](https://img.shields.io/npm/v/leaflet-polydraw)](https://www.npmjs.com/package/leaflet-polydraw)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![CI](https://github.com/AndreasOlausson/leaflet-polydraw/actions/workflows/ci.yml/badge.svg)](https://github.com/AndreasOlausson/leaflet-polydraw/actions/workflows/ci.yml)

## Key Features

[![Feature Overview](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/feature-overview.png)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/feature-overview.png)

- **Point-to-Point Drawing**: Precise polygon creation with click-by-click vertex placement (Desktop only)
- **Smart Polygon Merging**: Automatic detection and merging of overlapping polygons (including C-to-O shape completion)
- **Drag & Drop**: Intuitive polygon repositioning with intelligent spatial interactions
- **Advanced Editing**: Drag vertices, add/remove points, and reshape polygons
- **Smart Markers**: Intelligent marker separation prevents overlapping on small polygons
- **Hole Support**: Create complex polygons with holes and nested shapes
- **Performance Optimized**: Efficient rendering and interaction handling
- **Well Tested**: Comprehensive test suite with 167+ passing tests
- **TypeScript Ready**: Full TypeScript support with type definitions

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Features](#features)
5. [API Reference](#api-reference)
6. [Markers](#markers)
7. [Events](#events)
8. [Examples](#examples)
9. [Browser Support](#browser-support)
10. [Contributing](#contributing)
11. [Docker](#docker)

## Installation

```bash
npm install leaflet-polydraw
```

## CDN Usage

You can also use Leaflet.Polydraw directly in the browser via a CDN like [jsDelivr](https://www.jsdelivr.com/) or [unpkg](https://unpkg.com/):

### Include via CDN

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css"
/>
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/leaflet.polydraw@latest/dist/styles/polydraw.css"
/>
<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/leaflet.polydraw@latest/dist/polydraw.umd.min.js"></script>
```

### Example Usage

```html
<script>
  const map = L.map("map").setView([58.4, 15.6], 10);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  const polydraw = new LeafletPolydraw();
  map.addControl(polydraw);
</script>
```

> Note: All icons and styles are included automatically when using the CSS from the CDN.

## Quick Start

### Basic Usage

```javascript
import * as L from "leaflet";
import Polydraw from "leaflet-polydraw";

// Create your map
const map = L.map("map").setView([58.402514, 15.606188], 10);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Add the PolyDraw control (includes all drawing buttons)
const polydraw = new Polydraw();
polydraw.addTo(map);

// Optionally add some predefined polygons
const octagon = [
  [
    [
      L.latLng(58.404493, 15.6),
      L.latLng(58.402928, 15.602928),
      L.latLng(58.4, 15.604493),
      L.latLng(58.397072, 15.602928),
      L.latLng(58.395507, 15.6),
      L.latLng(58.397072, 15.597072),
      L.latLng(58.4, 15.595507),
      L.latLng(58.402928, 15.597072),
      L.latLng(58.404493, 15.6),
    ],
  ],
];

polydraw.addPredefinedPolygon(octagon);
```

### Advanced Configuration

```javascript
import Polydraw from "leaflet-polydraw";

const polyDrawControl = L.control
  .polydraw({
    position: "topright",
    config: {
      mergePolygons: true,
      modes: {
        dragPolygons: true,
        attachElbow: true,
        dragElbow: true,
      },
      dragPolygons: {
        markerBehavior: "hide",
      },
      markers: {
        deleteMarker: true,
        infoMarker: true,
        menuMarker: true,
        markerDeleteIcon: {
          position: 5, // North
        },
        markerInfoIcon: {
          position: 4, // NorthEast
          useMetrics: true,
        },
      },
      polygonOptions: {
        color: "#ff0000",
        fillColor: "#ff0000",
        fillOpacity: 0.3,
      },
    },
  })
  .addTo(map);
```

## Configuration

### Default Configuration

```javascript
{
  "mergePolygons": true,
  "kinks": false,
  "modes": {
    "draw": true,
    "subtract": true,
    "deleteAll": true,
    "p2p": true,
    "attachElbow": true,
    "dragElbow": true,
    "dragPolygons": true,
    "edgeDeletion": true
  },
  "dragPolygons": {
    "opacity": 0.7,
    "dragCursor": "move",
    "hoverCursor": "grab",
    "markerBehavior": "hide",
    "markerAnimationDuration": 200,
    "modifierSubtract": {
      "keys": {
        "windows": "ctrlKey",
        "mac": "metaKey",
        "linux": "ctrlKey"
      },
      "hideMarkersOnDrag": true
    }
  },
  "edgeDeletion": {
    "keys": {
      "windows": "ctrlKey",
      "mac": "metaKey",
      "linux": "ctrlKey"
    },
    "minVertices": 3
  },
  "markers": {
    "deleteMarker": true,
    "infoMarker": true,
    "menuMarker": true,
    "coordsTitle": true,
    "zIndexOffset": 0,
    "markerIcon": {
      "styleClasses": ["polygon-marker"],
      "zIndexOffset": null
    },
    "holeIcon": {
      "styleClasses": ["polygon-marker", "hole"],
      "zIndexOffset": null
    },
    "markerInfoIcon": {
      "position": 3,
      "showArea": true,
      "showPerimeter": true,
      "useMetrics": true,
      "usePerimeterMinValue": false,
      "areaLabel": "Area",
      "perimeterLabel": "Perimeter",
      "values": {
        "min": {
          "metric": "50",
          "imperial": "100"
        },
        "unknown": {
          "metric": "-",
          "imperial": "-"
        }
      },
      "units": {
        "unknownUnit": "",
        "metric": {
          "onlyMetrics": true,
          "perimeter": {
            "m": "m",
            "km": "km"
          },
          "area": {
            "m2": "m²",
            "km2": "km²",
            "daa": "daa",
            "ha": "ha"
          }
        },
        "imperial": {
          "perimeter": {
            "feet": "ft",
            "yards": "yd",
            "miles": "mi"
          },
          "area": {
            "feet2": "ft²",
            "yards2": "yd²",
            "acres": "ac",
            "miles2": "mi²"
          }
        }
      },
      "styleClasses": ["polygon-marker", "info"],
      "zIndexOffset": 10000
    },
    "markerMenuIcon": {
      "position": 7,
      "styleClasses": ["polygon-marker", "menu"],
      "zIndexOffset": 10000
    },
    "markerDeleteIcon": {
      "position": 5,
      "styleClasses": ["polygon-marker", "delete"],
      "zIndexOffset": 10000
    },
    "holeMarkers": {
      "menuMarker": false,
      "deleteMarker": true,
      "infoMarker": false
    },
    "visualOptimization": {
      "sharpAngleThreshold": 30,
      "thresholdBoundingBox": 0.05,
      "thresholdDistance": 0.05,
      "useDistance": true,
      "useBoundingBox": false,
      "useAngles": false
    }
  },
  "polyLineOptions": {
    "opacity": 1,
    "smoothFactor": 0,
    "noClip": true,
    "clickable": false,
    "weight": 2
  },
  "subtractLineOptions": {
    "opacity": 1,
    "smoothFactor": 0,
    "noClip": true,
    "clickable": false,
    "weight": 2
  },
  "polygonOptions": {
    "smoothFactor": 0.3,
    "noClip": true
  },
  "holeOptions": {
    "weight": 2,
    "opacity": 1,
    "fillOpacity": 0.5
  },
  "polygonCreation": {
    "method": "concaveman",
    "simplification": {
      "mode": "simple",
      "tolerance": 0.00001,
      "highQuality": false
    }
  },
  "simplification": {
    "simplifyTolerance": {
      "tolerance": 0.0001,
      "highQuality": false,
      "mutate": false
    },
    "dynamicMode": {
      "fractionGuard": 0.9,
      "multiplier": 2
    }
  },
  "menuOperations": {
    "simplify": {
      "processHoles": true
    },
    "doubleElbows": {
      "processHoles": true
    },
    "bbox": {
      "processHoles": true
    }
  },
  "boundingBox": {
    "addMidPointMarkers": true
  },
  "bezier": {
    "resolution": 10000,
    "sharpness": 0.75
  },
  "colors": {
    "dragPolygons": {
      "subtract": "#D9460F"
    },
    "p2p": {
      "closingMarker": "#4CAF50"
    },
    "edgeHover": "#7a9441",
    "edgeDeletion": {
      "hover": "#D9460F"
    },
    "polyline": "#50622b",
    "subtractLine": "#50622b",
    "polygon": {
      "border": "#50622b",
      "fill": "#b4cd8a"
    },
    "hole": {
      "border": "#aa0000",
      "fill": "#ffcccc"
    },
    "styles": {
      "controlButton": {
        "backgroundColor": "#fff",
        "color": "#000"
      },
      "controlButtonHover": {
        "backgroundColor": "#f4f4f4"
      },
      "controlButtonActive": {
        "backgroundColor": "rgb(128, 218, 255)",
        "color": "#fff"
      },
      "indicatorActive": {
        "backgroundColor": "#ffcc00"
      },
      "p2pMarker": {
        "backgroundColor": "#fff",
        "borderColor": "#50622b"
      }
    }
  }
}
```

### Configuration Options

| Key                                                                | Type    | Default                        | Description                                               |
| ------------------------------------------------------------------ | ------- | ------------------------------ | --------------------------------------------------------- |
| **mergePolygons**                                                  | boolean | `true`                         | Auto-merge polygons during drawing when they intersect    |
| **kinks**                                                          | boolean | `false`                        | Allow self-intersecting polygons                          |
| **modes**                                                          | object  |                                | Feature toggles                                           |
| &nbsp;&nbsp;draw                                                   | boolean | `true`                         | Enable draw mode button                                   |
| &nbsp;&nbsp;subtract                                               | boolean | `true`                         | Enable subtract mode button                               |
| &nbsp;&nbsp;deleteAll                                              | boolean | `true`                         | Enable delete all button                                  |
| &nbsp;&nbsp;p2p                                                    | boolean | `true`                         | Enable point-to-point drawing mode                        |
| &nbsp;&nbsp;attachElbow                                            | boolean | `true`                         | Enable clicking on edges to add vertices                  |
| &nbsp;&nbsp;dragElbow                                              | boolean | `true`                         | Enable dragging vertices                                  |
| &nbsp;&nbsp;dragPolygons                                           | boolean | `true`                         | Enable dragging entire polygons                           |
| &nbsp;&nbsp;edgeDeletion                                           | boolean | `true`                         | Enable edge deletion with modifier keys                   |
| **dragPolygons**                                                   | object  |                                | Polygon dragging configuration                            |
| &nbsp;&nbsp;opacity                                                | number  | `0.7`                          | Polygon opacity during drag (0-1)                         |
| &nbsp;&nbsp;dragCursor                                             | string  | `"move"`                       | Cursor during active dragging                             |
| &nbsp;&nbsp;hoverCursor                                            | string  | `"grab"`                       | Cursor when hovering over draggable polygons              |
| &nbsp;&nbsp;markerBehavior                                         | string  | `"hide"`                       | Marker behavior during drag: `"hide"`, `"show"`, `"fade"` |
| &nbsp;&nbsp;markerAnimationDuration                                | number  | `200`                          | Duration of marker animations in milliseconds             |
| &nbsp;&nbsp;**modifierSubtract**                                   | object  |                                | Modifier key subtract configuration                       |
| &nbsp;&nbsp;&nbsp;&nbsp;**keys**                                   | object  |                                | Platform-specific modifier keys                           |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;windows                        | string  | `"ctrlKey"`                    | Windows modifier key                                      |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;mac                            | string  | `"metaKey"`                    | Mac modifier key                                          |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;linux                          | string  | `"ctrlKey"`                    | Linux modifier key                                        |
| &nbsp;&nbsp;&nbsp;&nbsp;subtractColor                              | string  | `"#D9460F"`                    | Color for subtract mode visualization                     |
| &nbsp;&nbsp;&nbsp;&nbsp;hideMarkersOnDrag                          | boolean | `true`                         | Hide markers during subtract drag                         |
| **edgeDeletion**                                                   | object  |                                | Edge deletion configuration                               |
| &nbsp;&nbsp;**keys**                                               | object  |                                | Platform-specific modifier keys                           |
| &nbsp;&nbsp;&nbsp;&nbsp;windows                                    | string  | `"ctrlKey"`                    | Windows modifier key                                      |
| &nbsp;&nbsp;&nbsp;&nbsp;mac                                        | string  | `"metaKey"`                    | Mac modifier key                                          |
| &nbsp;&nbsp;&nbsp;&nbsp;linux                                      | string  | `"ctrlKey"`                    | Linux modifier key                                        |
| &nbsp;&nbsp;hoverColor                                             | string  | `"#D9460F"`                    | Color when hovering over deletable edges                  |
| &nbsp;&nbsp;minVertices                                            | number  | `3`                            | Minimum vertices required after deletion                  |
| **markers**                                                        | object  |                                | Marker configuration                                      |
| &nbsp;&nbsp;deleteMarker                                           | boolean | `true`                         | Show delete marker                                        |
| &nbsp;&nbsp;infoMarker                                             | boolean | `true`                         | Show info marker with area/perimeter                      |
| &nbsp;&nbsp;menuMarker                                             | boolean | `true`                         | Show menu marker with operations                          |
| &nbsp;&nbsp;coordsTitle                                            | boolean | `true`                         | Show coordinate tooltips on markers                       |
| &nbsp;&nbsp;zIndexOffset                                           | number  | `0`                            | Global z-index offset for markers                         |
| &nbsp;&nbsp;**markerIcon**                                         | object  |                                | Standard marker configuration                             |
| &nbsp;&nbsp;&nbsp;&nbsp;styleClasses                               | array   | `["polygon-marker"]`           | CSS classes for standard markers                          |
| &nbsp;&nbsp;&nbsp;&nbsp;zIndexOffset                               | number  | `null`                         | Z-index offset override                                   |
| &nbsp;&nbsp;**holeIcon**                                           | object  |                                | Hole marker configuration                                 |
| &nbsp;&nbsp;&nbsp;&nbsp;styleClasses                               | array   | `["polygon-marker", "hole"]`   | CSS classes for hole markers                              |
| &nbsp;&nbsp;&nbsp;&nbsp;zIndexOffset                               | number  | `null`                         | Z-index offset override                                   |
| &nbsp;&nbsp;**markerInfoIcon**                                     | object  |                                | Info marker configuration                                 |
| &nbsp;&nbsp;&nbsp;&nbsp;position                                   | number  | `3`                            | Marker position (see MarkerPosition enum)                 |
| &nbsp;&nbsp;&nbsp;&nbsp;showArea                                   | boolean | `true`                         | Display area information                                  |
| &nbsp;&nbsp;&nbsp;&nbsp;showPerimeter                              | boolean | `true`                         | Display perimeter information                             |
| &nbsp;&nbsp;&nbsp;&nbsp;useMetrics                                 | boolean | `true`                         | Use metric units                                          |
| &nbsp;&nbsp;&nbsp;&nbsp;usePerimeterMinValue                       | boolean | `false`                        | Use minimum value for small perimeters                    |
| &nbsp;&nbsp;&nbsp;&nbsp;areaLabel                                  | string  | `"Area"`                       | Label for area display                                    |
| &nbsp;&nbsp;&nbsp;&nbsp;perimeterLabel                             | string  | `"Perimeter"`                  | Label for perimeter display                               |
| &nbsp;&nbsp;&nbsp;&nbsp;**values**                                 | object  |                                | Default values configuration                              |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**min**                        | object  |                                | Minimum value settings                                    |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;metric             | string  | `"50"`                         | Minimum metric value                                      |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;imperial           | string  | `"100"`                        | Minimum imperial value                                    |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**unknown**                    | object  |                                | Unknown value settings                                    |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;metric             | string  | `"-"`                          | Unknown metric placeholder                                |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;imperial           | string  | `"-"`                          | Unknown imperial placeholder                              |
| &nbsp;&nbsp;&nbsp;&nbsp;**units**                                  | object  |                                | Unit configuration                                        |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;unknownUnit                    | string  | `""`                           | Unknown unit placeholder                                  |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**metric**                     | object  |                                | Metric units                                              |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;onlyMetrics        | boolean | `true`                         | Use only m² and km² for area                              |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**perimeter**      | object  |                                | Perimeter units                                           |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;m      | string  | `"m"`                          | Meter unit                                                |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;km     | string  | `"km"`                         | Kilometer unit                                            |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**area**           | object  |                                | Area units                                                |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;m2     | string  | `"m²"`                         | Square meter unit                                         |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;km2    | string  | `"km²"`                        | Square kilometer unit                                     |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;daa    | string  | `"daa"`                        | Decare unit                                               |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ha     | string  | `"ha"`                         | Hectare unit                                              |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**imperial**                   | object  |                                | Imperial units                                            |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**perimeter**      | object  |                                | Perimeter units                                           |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;feet   | string  | `"ft"`                         | Feet unit                                                 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;yards  | string  | `"yd"`                         | Yards unit                                                |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;miles  | string  | `"mi"`                         | Miles unit                                                |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**area**           | object  |                                | Area units                                                |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;feet2  | string  | `"ft²"`                        | Square feet unit                                          |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;yards2 | string  | `"yd²"`                        | Square yards unit                                         |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;acres  | string  | `"ac"`                         | Acres unit                                                |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;miles2 | string  | `"mi²"`                        | Square miles unit                                         |
| &nbsp;&nbsp;&nbsp;&nbsp;styleClasses                               | array   | `["polygon-marker", "info"]`   | CSS classes for info marker                               |
| &nbsp;&nbsp;&nbsp;&nbsp;zIndexOffset                               | number  | `10000`                        | Z-index offset for info marker                            |
| &nbsp;&nbsp;**markerMenuIcon**                                     | object  |                                | Menu marker configuration                                 |
| &nbsp;&nbsp;&nbsp;&nbsp;position                                   | number  | `7`                            | Marker position (see MarkerPosition enum)                 |
| &nbsp;&nbsp;&nbsp;&nbsp;styleClasses                               | array   | `["polygon-marker", "menu"]`   | CSS classes for menu marker                               |
| &nbsp;&nbsp;&nbsp;&nbsp;zIndexOffset                               | number  | `10000`                        | Z-index offset for menu marker                            |
| &nbsp;&nbsp;**markerDeleteIcon**                                   | object  |                                | Delete marker configuration                               |
| &nbsp;&nbsp;&nbsp;&nbsp;position                                   | number  | `5`                            | Marker position (see MarkerPosition enum)                 |
| &nbsp;&nbsp;&nbsp;&nbsp;styleClasses                               | array   | `["polygon-marker", "delete"]` | CSS classes for delete marker                             |
| &nbsp;&nbsp;&nbsp;&nbsp;zIndexOffset                               | number  | `10000`                        | Z-index offset for delete marker                          |
| &nbsp;&nbsp;**holeMarkers**                                        | object  |                                | Configuration for markers on holes                        |
| &nbsp;&nbsp;&nbsp;&nbsp;menuMarker                                 | boolean | `false`                        | Show menu marker on holes                                 |
| &nbsp;&nbsp;&nbsp;&nbsp;deleteMarker                               | boolean | `true`                         | Show delete marker on holes                               |
| &nbsp;&nbsp;&nbsp;&nbsp;infoMarker                                 | boolean | `false`                        | Show info marker on holes                                 |
| &nbsp;&nbsp;**visualOptimization**                                 | object  |                                | Visual optimization settings                              |
| &nbsp;&nbsp;&nbsp;&nbsp;sharpAngleThreshold                        | number  | `30`                           | Angle threshold for optimization                          |
| &nbsp;&nbsp;&nbsp;&nbsp;thresholdBoundingBox                       | number  | `0.05`                         | Bounding box threshold                                    |
| &nbsp;&nbsp;&nbsp;&nbsp;thresholdDistance                          | number  | `0.05`                         | Distance threshold                                        |
| &nbsp;&nbsp;&nbsp;&nbsp;useDistance                                | boolean | `true`                         | Use distance-based optimization                           |
| &nbsp;&nbsp;&nbsp;&nbsp;useBoundingBox                             | boolean | `false`                        | Use bounding box optimization                             |
| &nbsp;&nbsp;&nbsp;&nbsp;useAngles                                  | boolean | `false`                        | Use angle-based optimization                              |
| **polyLineOptions**                                                | object  |                                | Polyline styling options                                  |
| &nbsp;&nbsp;color                                                  | string  | `"#50622b"`                    | Polyline color                                            |
| &nbsp;&nbsp;opacity                                                | number  | `1`                            | Polyline opacity                                          |
| &nbsp;&nbsp;smoothFactor                                           | number  | `0`                            | Polyline smoothing factor                                 |
| &nbsp;&nbsp;noClip                                                 | boolean | `true`                         | Disable polyline clipping                                 |
| &nbsp;&nbsp;clickable                                              | boolean | `false`                        | Make polyline clickable                                   |
| &nbsp;&nbsp;weight                                                 | number  | `2`                            | Polyline weight in pixels                                 |
| **subtractLineOptions**                                            | object  |                                | Subtract mode polyline styling                            |
| &nbsp;&nbsp;color                                                  | string  | `"#50622b"`                    | Subtract polyline color                                   |
| &nbsp;&nbsp;opacity                                                | number  | `1`                            | Subtract polyline opacity                                 |
| &nbsp;&nbsp;smoothFactor                                           | number  | `0`                            | Subtract polyline smoothing                               |
| &nbsp;&nbsp;noClip                                                 | boolean | `true`                         | Disable subtract polyline clipping                        |
| &nbsp;&nbsp;clickable                                              | boolean | `false`                        | Make subtract polyline clickable                          |
| &nbsp;&nbsp;weight                                                 | number  | `2`                            | Subtract polyline weight                                  |
| **polygonOptions**                                                 | object  |                                | Polygon styling options                                   |
| &nbsp;&nbsp;smoothFactor                                           | number  | `0.3`                          | Polygon smoothing factor                                  |
| &nbsp;&nbsp;color                                                  | string  | `"#50622b"`                    | Polygon border color                                      |
| &nbsp;&nbsp;fillColor                                              | string  | `"#b4cd8a"`                    | Polygon fill color                                        |
| &nbsp;&nbsp;noClip                                                 | boolean | `true`                         | Disable polygon clipping                                  |
| **holeOptions**                                                    | object  |                                | Hole styling options                                      |
| &nbsp;&nbsp;color                                                  | string  | `"#aa0000"`                    | Hole border color                                         |
| &nbsp;&nbsp;fillColor                                              | string  | `"#ffcccc"`                    | Hole fill color                                           |
| &nbsp;&nbsp;weight                                                 | number  | `2`                            | Hole border weight                                        |
| &nbsp;&nbsp;opacity                                                | number  | `1`                            | Hole border opacity                                       |
| &nbsp;&nbsp;fillOpacity                                            | number  | `0.5`                          | Hole fill opacity                                         |
| **polygonCreation**                                                | object  |                                | Polygon creation settings                                 |
| &nbsp;&nbsp;method                                                 | string  | `"concaveman"`                 | Creation method                                           |
| &nbsp;&nbsp;**simplification**                                     | object  |                                | Creation simplification                                   |
| &nbsp;&nbsp;&nbsp;&nbsp;mode                                       | string  | `"simple"`                     | Simplification mode                                       |
| &nbsp;&nbsp;&nbsp;&nbsp;tolerance                                  | number  | `0.0001`                       | Simplification tolerance                                  |
| &nbsp;&nbsp;&nbsp;&nbsp;highQuality                                | boolean | `false`                        | High quality simplification                               |
| **simplification**                                                 | object  |                                | General simplification settings                           |
| &nbsp;&nbsp;**simplifyTolerance**                                  | object  |                                | Tolerance settings                                        |
| &nbsp;&nbsp;&nbsp;&nbsp;tolerance                                  | number  | `0.0001`                       | Simplification tolerance                                  |
| &nbsp;&nbsp;&nbsp;&nbsp;highQuality                                | boolean | `false`                        | High quality mode                                         |
| &nbsp;&nbsp;&nbsp;&nbsp;mutate                                     | boolean | `false`                        | Allow input mutation                                      |
| &nbsp;&nbsp;**dynamicMode**                                        | object  |                                | Dynamic simplification                                    |
| &nbsp;&nbsp;&nbsp;&nbsp;fractionGuard                              | number  | `0.9`                          | Fraction guard value                                      |
| &nbsp;&nbsp;&nbsp;&nbsp;multiplier                                 | number  | `2`                            | Tolerance multiplier                                      |
| **boundingBox**                                                    | object  |                                | Bounding box settings                                     |
| &nbsp;&nbsp;addMidPointMarkers                                     | boolean | `true`                         | Add midpoint markers to bounding box                      |
| **bezier**                                                         | object  |                                | Bezier curve settings                                     |
| &nbsp;&nbsp;resolution                                             | number  | `10000`                        | Bezier curve resolution                                   |
| &nbsp;&nbsp;sharpness                                              | number  | `0.75`                         | Bezier curve sharpness                                    |

### External Configuration

Load configuration from an external JSON file:

```javascript
const polyDrawControl = L.control.polydraw({
  configPath: "path/to/your/polydraw.config.json",
});
```

You can also combine external configuration with inline configuration. Inline configuration takes precedence:

```javascript
const polyDrawControl = L.control.polydraw({
  configPath: "config/polydraw.json",
  config: {
    // These settings will override the external config
    polygonOptions: {
      color: "#ff0000",
    },
  },
});
```

**Configuration Priority (highest to lowest):**

1. Inline `config` parameter
2. External configuration file
3. Default configuration

If the external configuration file fails to load, the plugin will fall back to using the default configuration plus any inline configuration provided.

## Features

### Draw Mode

[![Draw Mode](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/draw-mode.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/draw-mode.gif)

Create polygons by drawing freehand shapes on the map. Perfect for:

- Quick area sketching
- Rough boundary mapping
- Freehand polygon creation
- Natural drawing workflow

Simply click the draw button and drag your mouse/finger to create polygon shapes. The plugin automatically converts your drawn path into a clean polygon using advanced algorithms.

**Note**: The number of vertices in the final polygon is controlled by the `polygonCreation.simplification` settings in the configuration.

### Subtract Draw Mode

[![Subtract Mode](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/subtract-mode.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/subtract-mode.gif)

Create holes and complex shapes by subtracting areas from existing polygons. Ideal for:

- Creating holes in polygons
- Removing unwanted areas
- Complex shape editing
- Precision area exclusion

Click the subtract button and draw over existing polygons to remove those areas, creating holes or splitting polygons into multiple parts.

### Point-to-Point Drawing (Desktop only)

[![Point-to-Point Drawing](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/p2p.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/p2p.gif)

Create precise polygons by clicking to place each vertex. Perfect for:

- Accurate boundary mapping
- Property delineation
- Custom shape creation

**How it works:**

1. Click to place the first vertex.
2. Continue clicking to add more vertices.
3. To complete the polygon (requires minimum 3 points):
   - Click on the first vertex again.
   - **or** Double-click anywhere on the map.
4. Press `ESC` to cancel the current drawing.

You can also drag markers to adjust the shape and delete them by holding the modifier key (Cmd/Ctrl) and clicking on a marker, just like with regular polygon editing.

**Note**: This feature is currently available on desktop only due to issues with touch devices.

### Smart Polygon Merging

[![Smart Merging](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/merge.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/merge.gif)

The plugin features **two independent merge systems**:

#### 1. Drawing Merge (`mergePolygons`)

- **When**: During polygon creation
- **Purpose**: Automatically merge new polygons with existing intersecting ones
- **Use case**: Streamlined drawing workflow

#### 2. Drag Merge (`autoMergeOnIntersect`)

- **When**: During polygon dragging
- **Purpose**: Merge polygons when dragged together
- **Use case**: Interactive editing and combining

### Drag & Drop Functionality

[![Drag and Drop](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/drag-drop.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/drag-drop.gif)

**Drag-to-Merge**: Drag polygons together to automatically merge them

**Drag-to-Hole**: Drag a polygon completely inside another to create a hole (requires a modifier key defined in `config.dragPolygons.modifierSubtract.keys`)

**Repositioning**: Drag to empty areas to simply reposition polygons

### Drag Elbows (Vertex Editing)

[![Drag Elbows](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/drag-elbows.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/drag-elbows.gif)

Fine-tune polygon shapes by dragging individual vertices. Perfect for:

- Precision boundary adjustments
- Shape refinement after initial drawing
- Correcting polygon edges
- Detailed polygon editing

Click and drag any vertex (elbow) to reshape your polygons. To add a new vertex, click directly on the line between two existing points. To remove a vertex, hold the configured modifier key (defined in `config.dragPolygons.modifierSubtract.keys`) and click the vertex you want to delete. This provides full control over polygon geometry and shape refinement.

### Advanced Editing Tools

[![Editing Tools](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/editing-tools.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/editing-tools.gif)

Access operations through the menu marker:

- **Simplify**: Reduce polygon complexity using Douglas-Peucker algorithm
- **Double Elbows**: Add intermediate vertices for higher resolution
- **Bounding Box**: Convert to rectangular bounds
- **Bezier Curves**: Apply smooth curve interpolation (alpha)

### Smart Marker System

[![Smart Markers](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/smart-markers.png)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/smart-markers.png)

Intelligent marker positioning prevents overlapping on small polygons:

- **Automatic separation**: Detects potential overlaps and redistributes markers
- **Priority-based**: Resolves conflicts using info → delete → menu priority
- **Smooth animations**: Markers fade during drag operations

## API Reference

For most use cases, simply add the plugin and use the built-in buttons. However, these methods are available for programmatic control:

### Essential Methods

#### `addPredefinedPolygon(geographicBorders: L.LatLng[][][])`

Add polygons programmatically (useful for loading saved data).

```javascript
const polygon = [
  [
    [
      { lat: 59.903, lng: 10.724 },
      { lat: 59.908, lng: 10.728 },
      { lat: 59.91, lng: 10.72 },
      { lat: 59.903, lng: 10.724 },
    ],
  ],
];
polydraw.addPredefinedPolygon(polygon);
```

#### `getAllPolygons()`

Get all polygons for data export.

```javascript
const polygons = polydraw.getAllPolygons();
// Use for saving, exporting, or processing polygon data
```

### Advanced Methods (Optional)

#### `setDrawMode(mode: DrawMode)` & `getDrawMode()`

Programmatically control drawing modes (the buttons do this automatically).

```javascript
import { DrawMode } from "leaflet-polydraw";
polydraw.setDrawMode(DrawMode.Add); // Same as clicking the draw button
```

#### `configurate(config: any)`

Update configuration after initialization.

```javascript
polydraw.configurate({
  polygonOptions: { color: "#ff0000" },
});
```

## Markers

[![Marker Positions](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/marker-positions.png)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/marker-positions.png)

### Delete Marker (Default: North)

- **Purpose**: Delete the entire polygon
- **Icon**: Trash/delete icon
- **Behavior**: Fades during drag operations

### Info Marker (Default: East)

- **Purpose**: Display polygon metrics
- **Features**: Area, perimeter, metric/imperial units
- **Popup**: Shows detailed measurements

[![Info Marker Popup](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/info-marker-popup.png)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/info-marker-popup.png)

### Menu Marker (Default: West)

- **Purpose**: Access advanced polygon editing operations
- **Popup**: Interactive operation menu with the following tools:
  - **Simplify**: Reduce polygon complexity by removing unnecessary vertices using Douglas-Peucker algorithm
  - **Double Elbows**: Add intermediate vertices between existing points for higher resolution editing
  - **Bounding Box**: Convert polygon to its rectangular bounding box
  - **Bezier**: Apply smooth curve interpolation to polygon edges _(alpha feature)_

[![Menu Marker Popup](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/menu-marker-popup.png)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/menu-marker-popup.png)

### Marker Positioning

Customize marker positions using the `MarkerPosition` enum:

```javascript
const polyDrawControl = L.control.polydraw({
  config: {
    markers: {
      markerDeleteIcon: {
        position: MarkerPosition.North,
        styleClasses: ["custom-delete-marker"],
      },
      markerInfoIcon: {
        position: MarkerPosition.East,
        useMetrics: true,
        areaLabel: "Area",
        perimeterLabel: "Perimeter",
      },
      markerMenuIcon: {
        position: MarkerPosition.West,
        styleClasses: ["custom-menu-marker"],
      },
    },
  },
});
```

This configuration gives this result.

![Marker Positions](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/star.png)

```javascript
MarkerPosition {
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

## Events

Polydraw emits various events that allow you to respond to user interactions and polygon changes. These events are useful for implementing features like auto-save, validation, analytics, or custom UI updates.

### Draw Mode Events

Listen for drawing mode changes to update your UI or trigger specific behaviors:

```javascript
polydraw.onDrawModeChanged((mode) => {
  console.log("Draw mode changed to:", mode);

  // Update UI based on current mode
  switch (mode) {
    case DrawMode.Add:
      updateStatusBar("Drawing mode: Add polygons");
      break;
    case DrawMode.Subtract:
      updateStatusBar("Drawing mode: Create holes");
      break;
    case DrawMode.Off:
      updateStatusBar("Drag mode: Move polygons");
      break;
  }
});
```

### Polygon Lifecycle Events

Track polygon creation, modification, and deletion:

```javascript
// Polygon created
map.on("polygon:created", (e) => {
  console.log("New polygon created:", e.polygon);
  // Auto-save, validate, or log the new polygon
  savePolygonToDatabase(e.polygon);
});

// Polygon modified (vertices moved, simplified, etc.)
map.on("polygon:modified", (e) => {
  console.log("Polygon modified:", e.polygon);
  // Mark as unsaved, trigger validation
  markAsUnsaved(e.polygon);
});

// Polygon deleted
map.on("polygon:deleted", (e) => {
  console.log("Polygon deleted:", e.polygon);
  // Remove from database, update counters
  removeFromDatabase(e.polygonId);
});
```

### Drag & Drop Events

Monitor polygon dragging for real-time updates or validation:

```javascript
// Drag start - useful for showing drag indicators
map.on("polygon:dragstart", (e) => {
  console.log("Drag started:", e.polygon);
  showDragIndicator(true);
  logUserAction("drag_start", e.polygon.id);
});

// Drag end - perfect for auto-save or validation
map.on("polygon:dragend", (e) => {
  console.log("Drag ended:", e.polygon);
  console.log("Moved from:", e.oldPosition, "to:", e.newPosition);

  showDragIndicator(false);
  autoSavePolygon(e.polygon);
  validatePolygonPosition(e.polygon);
});

// Real-time drag updates (if realTimeUpdate is enabled)
map.on("polygon:drag", (e) => {
  console.log("Dragging:", e.polygon);
  updateCoordinateDisplay(e.polygon.getLatLngs());
});
```

### Merge & Hole Events

Track automatic merging and hole creation:

```javascript
// Polygons merged automatically
map.on("polygons:merged", (e) => {
  console.log("Polygons merged:", e.originalPolygons, "→", e.resultPolygon);
  updatePolygonCount(-e.originalPolygons.length + 1);
});

// Hole created by dragging polygon inside another
map.on("polygon:hole-created", (e) => {
  console.log("Hole created in:", e.parentPolygon, "by:", e.holePolygon);
  notifyUser("Hole created in polygon");
});
```

### Practical Use Cases

**Auto-save functionality:**

```javascript
map.on("polygon:created polygon:modified polygon:dragend", (e) => {
  debounce(() => saveToLocalStorage(polydraw.getAllPolygons()), 1000);
});
```

**Validation and feedback:**

```javascript
map.on("polygon:created", (e) => {
  const area = calculateArea(e.polygon);
  if (area < MIN_AREA) {
    showWarning("Polygon too small");
    e.polygon.setStyle({ color: "red" });
  }
});
```

**Analytics tracking:**

```javascript
polydraw.onDrawModeChanged((mode) => {
  analytics.track("draw_mode_changed", { mode: mode });
});

map.on("polygon:created", (e) => {
  analytics.track("polygon_created", {
    vertices: e.polygon.getLatLngs()[0].length,
    area: calculateArea(e.polygon),
  });
});
```

## Roadmap & Future Improvements

This section outlines planned fixes and new features. Contributions are highly welcome!

### Fixes and Core Improvements

- **Bezier Curve Refinement**: Improve the bezier curve algorithm for more intuitive results.
- **Simplification Algorithm Review**: Make simplification less aggressive and more predictable.
- **Mobile/Touch Support**: Enhance usability on touch devices, especially for p2p drawing.
- **Visual Optimization for Complex Polygons**: Smartly hide markers on complex polygons to reduce clutter while retaining functionality.

### New Features

- **Polygon Splitting Tool**: A mode to split a polygon by drawing a line across it.
- **Undo/Redo History**: Add undo/redo capabilities for all editing actions.
- **Measurement Tool**: A tool for measuring distances and areas without creating permanent polygons.
- **Multi-Select and Edit**: Allow users to edit multiple polygons at once.
- **Geo-data Format Integration**: Add helpers for importing/exporting GeoJSON, WKT, or KML.

### Low Priority Ideas

- **Topological Operations**: Add advanced GIS operations like intersection and buffering.
- **Drawing with Curves**: Allow drawing curved segments in point-to-point mode.
- **Theming and Customization**: Expand the config to allow for full theming.
- **Extensible Menu**: Allow developers to add custom actions to the menu.
- **Vertex Snapping**: Add snapping to a grid or other features.

## Browser Support

> ⚠️ Mobile support is considered **beta** in this version. While basic touch interaction is implemented, advanced workflows may behave inconsistently across mobile browsers. Full mobile compatibility is planned for a future release.

- **Modern Browsers**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Mobile**: iOS Safari 12+, Chrome Mobile 60+
- **Requirements**: ES6+ support, Leaflet 1.9+, Touch events, CSS transitions

## Demo

A local demo is included in the `demo/` directory for testing and development purposes.

### Running the Demo

To run the local demo:

1. **Build the main library and types**:

   ```bash
   cd Leaflet.Polydraw
   npm run build
   npm run build:types
   ```

2. **Run the demo**:
   ```bash
   cd demo
   npm install
   npm run dev
   ```

The demo will be available at `http://localhost:5173/` and includes examples of all major features.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/AndreasOlausson/leaflet-polydraw.git
cd leaflet-polydraw

# Install dependencies
npm install

# Run tests
npm test

# Build the project
npm run build
npm run build:types

# For development with the demo project
cd demo
npm install
npm run dev  # Automatically builds plugin, generates typings, and installs them
```

**Note**: The demo's `npm run dev` command automatically rebuilds the main plugin and type definitions, then installs them locally for immediate testing of your changes.

### Guidelines

- Follow the existing coding style
- Add tests for new features
- Update documentation when relevant
- Ensure all tests pass before submitting

## Docker

### Install Dependencies

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

The `Polydraw_Docker` directory contains all Docker scripts and wrappers.

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

This setup allows you to develop, test, and deploy Polydraw in a fully containerized environment.

## License

This project is licensed under the [MIT License](./LICENSE).

## Acknowledgments

PolyDraw was initially inspired by:

- [Leaflet.FreeDraw](https://github.com/Wildhoney/Leaflet.FreeDraw) by Adam Timberlake "Wildhoney"
- [leaflet-freehandshapes](https://github.com/bozdoz/leaflet-freehandshapes) by Benjamin DeLong "bozdoz"

Big thank you and kudos to these amazing developers!

**Created and maintained by [Andreas Olausson](https://github.com/AndreasOlausson)**

[![GitHub stars](https://img.shields.io/github/stars/AndreasOlausson/leaflet-polydraw.svg?style=social&label=Star)](https://github.com/AndreasOlausson/leaflet-polydraw)
[![GitHub forks](https://img.shields.io/github/forks/AndreasOlausson/leaflet-polydraw.svg?style=social&label=Fork)](https://github.com/AndreasOlausson/leaflet-polydraw/fork)
