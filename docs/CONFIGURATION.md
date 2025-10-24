# Configuration

> **Note:**  
> The configuration file includes several legacy or experimental options that may not currently be used in the codebase.  
> These have been kept intentionally to maintain backward compatibility and for future feature expansion.  
> As of version 1.0.0, approximately **77%** of configuration properties are actively used.  
> The remaining unused options (such as parts of `visualOptimization`, `holeMarkers`, and several polyline settings)  
> are harmless but currently inactive. They may be deprecated or repurposed in a future release.

## Default Configuration

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

## Configuration Options

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

## External Configuration

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
