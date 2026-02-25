# Configuration

> **Note:**  
> Most configuration properties are active in the current release. When deprecated keys remain (for example `markers.visualOptimization`), they are honored only for backward compatibility—see the footnotes below for migration tips. Future major versions may remove these legacy options entirely.

## Default Configuration

```typescript
import { defaultConfig } from "leaflet-polydraw";

const config = {
  ...defaultConfig,
  tools: {
    ...defaultConfig.tools,
    draw: true,
    subtract: true,
    clone: true,
    erase: true,
  },
  interaction: {
    ...defaultConfig.interaction,
    drag: {
      ...defaultConfig.interaction.drag,
      markerBehavior: "hide",
    },
  },
  styles: {
    ...defaultConfig.styles,
    polygon: {
      ...defaultConfig.styles.polygon,
      color: "#50622b",
      fillColor: "#b4cd8a",
    },
  },
  polygonCreation: {
    algorithm: "concaveman",
  },
  simplification: {
    strategy: "simple",
    simple: { tolerance: 0.0001, highQuality: false },
    dynamic: { baseTolerance: 0.0001, highQuality: false, fractionGuard: 0.9, multiplier: 2 },
  },
  polygonTools: {
    ...defaultConfig.polygonTools,
    bbox: {
      ...defaultConfig.polygonTools.bbox,
      addMidPointMarkers: true,
    },
  },
  history: {
    ...defaultConfig.history,
    maxSize: 50,
  },
};
```

## Deep Merge Configuration

The configuration system uses deep merging, which means you only need to specify the properties you want to change. All other properties will use their default values from the base configuration.

**Example:**

```typescript
// Only override specific style colors - everything else uses defaults
const polydraw = L.control.polydraw({
  config: {
    styles: {
      polygon: {
        color: "#ff0000",
        fillColor: "#ffcccc",
      },
    },
  },
});
```

**Benefits:**

- **Type Safety**: All configuration properties are validated at compile time
- **Partial Updates**: Override only what you need to change
- **No Runtime Errors**: All properties are guaranteed to exist
- **Better IDE Support**: Full autocomplete and validation

## Configuration Options

| Key                                                                | Type    | Default                           | Description                                                                                                                                              |
| ------------------------------------------------------------------ | ------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **mergePolygons**                                                  | boolean | `true`                            | Auto-merge polygons during drawing when they intersect                                                                                                   |
| **kinks**                                                          | boolean | `false`                           | `true`, keeps self-intersecting polygons intact; `false` automatically splits them into multiple simple polygons (safer for GIS exports). <sup>\*1</sup> |
| **tools** / **modes**                                              | object  |                                   | Tool toggles (`tools.*`) and edit behavior flags (`modes.*`)                                                                                           |
| &nbsp;&nbsp;draw                                                   | boolean | `true`                            | Enable draw mode button                                                                                                                                  |
| &nbsp;&nbsp;subtract                                               | boolean | `true`                            | Enable subtract mode button                                                                                                                              |
| &nbsp;&nbsp;erase                                              | boolean | `true`                            | Enable delete all button                                                                                                                                 |
| &nbsp;&nbsp;p2p                                                    | boolean | `true`                            | Enable point-to-point drawing mode                                                                                                                       |
| &nbsp;&nbsp;p2pSubtract                                            | boolean | `true`                            | Enable point-to-point subtract mode                                                                                                                      |
| &nbsp;&nbsp;clone                                          | boolean | `false`                           | Enable clone mode button for drag-duplicating polygons                                                                                                   |
| &nbsp;&nbsp;attachElbow                                            | boolean | `true`                            | Enable clicking on edges to add vertices                                                                                                                 |
| &nbsp;&nbsp;dragElbow                                              | boolean | `true`                            | Enable dragging vertices                                                                                                                                 |
| &nbsp;&nbsp;dragPolygons                                           | boolean | `true`                            | Enable dragging entire polygons                                                                                                                          |
| &nbsp;&nbsp;edgeDeletion                                           | boolean | `true`                            | Enable edge deletion with modifier keys                                                                                                                  |
| **tools.default**                                                    | number  | `DrawMode.Off`                    | Default drawing mode when control is initialized                                                                                                         |
| **interaction.drag**                                               | object  |                                   | Polygon dragging configuration                                                                                                                           |
| &nbsp;&nbsp;opacity                                                | number  | `0.7`                             | Polygon opacity during drag (0-1)                                                                                                                        |
| &nbsp;&nbsp;dragCursor                                             | string  | `"move"`                          | Cursor during active dragging                                                                                                                            |
| &nbsp;&nbsp;hoverCursor                                            | string  | `"grab"`                          | Cursor when hovering over draggable polygons                                                                                                             |
| &nbsp;&nbsp;markerBehavior                                         | string  | `"hide"`                          | Marker behavior during drag: `"hide"`, `"show"`, `"fade"`                                                                                                |
| &nbsp;&nbsp;markerAnimationDuration                                | number  | `200`                             | Duration of marker animations in milliseconds                                                                                                            |
| &nbsp;&nbsp;**modifierSubtract**                                   | object  |                                   | Modifier key subtract configuration                                                                                                                      |
| &nbsp;&nbsp;&nbsp;&nbsp;**keys**                                   | object  |                                   | Platform-specific modifier keys                                                                                                                          |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;windows                        | string  | `"ctrlKey"`                       | Windows modifier key                                                                                                                                     |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;mac                            | string  | `"metaKey"`                       | Mac modifier key                                                                                                                                         |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;linux                          | string  | `"ctrlKey"`                       | Linux modifier key                                                                                                                                       |
| &nbsp;&nbsp;&nbsp;&nbsp;hideMarkersOnDrag                          | boolean | `true`                            | Hide markers during subtract drag                                                                                                                        |
| **interaction.edgeDeletion**                                       | object  |                                   | Edge deletion configuration                                                                                                                              |
| &nbsp;&nbsp;**keys**                                               | object  |                                   | Platform-specific modifier keys                                                                                                                          |
| &nbsp;&nbsp;&nbsp;&nbsp;windows                                    | string  | `"ctrlKey"`                       | Windows modifier key                                                                                                                                     |
| &nbsp;&nbsp;&nbsp;&nbsp;mac                                        | string  | `"metaKey"`                       | Mac modifier key                                                                                                                                         |
| &nbsp;&nbsp;&nbsp;&nbsp;linux                                      | string  | `"ctrlKey"`                       | Linux modifier key                                                                                                                                       |
| &nbsp;&nbsp;minVertices                                            | number  | `3`                               | Minimum vertices required after deletion                                                                                                                 |
| **markers**                                                        | object  |                                   | Marker configuration                                                                                                                                     |
| &nbsp;&nbsp;deleteMarker                                           | boolean | `true`                            | Show delete marker                                                                                                                                       |
| &nbsp;&nbsp;infoMarker                                             | boolean | `true`                            | Show info marker with area/perimeter                                                                                                                     |
| &nbsp;&nbsp;menuMarker                                             | boolean | `true`                            | Show menu marker with operations                                                                                                                         |
| &nbsp;&nbsp;coordsTitle                                            | boolean | `true`                            | Show coordinate tooltips on markers                                                                                                                      |
| &nbsp;&nbsp;zIndexOffset                                           | number  | `0`                               | Global z-index offset for markers                                                                                                                        |
| &nbsp;&nbsp;**markerIcon**                                         | object  |                                   | Standard marker configuration                                                                                                                            |
| &nbsp;&nbsp;&nbsp;&nbsp;styleClasses                               | array   | `["polygon-marker"]`              | CSS classes for standard markers                                                                                                                         |
| &nbsp;&nbsp;&nbsp;&nbsp;zIndexOffset                               | number  | `null`                            | Z-index offset override                                                                                                                                  |
| &nbsp;&nbsp;**holeIcon**                                           | object  |                                   | Hole marker configuration                                                                                                                                |
| &nbsp;&nbsp;&nbsp;&nbsp;styleClasses                               | array   | `["polygon-marker", "hole"]`      | CSS classes for hole markers                                                                                                                             |
| &nbsp;&nbsp;&nbsp;&nbsp;zIndexOffset                               | number  | `null`                            | Z-index offset override                                                                                                                                  |
| &nbsp;&nbsp;**markerInfoIcon**                                     | object  |                                   | Info marker configuration                                                                                                                                |
| &nbsp;&nbsp;&nbsp;&nbsp;position                                   | number  | `3`                               | Marker position (see MarkerPosition enum)                                                                                                                |
| &nbsp;&nbsp;&nbsp;&nbsp;showArea                                   | boolean | `true`                            | Display area information                                                                                                                                 |
| &nbsp;&nbsp;&nbsp;&nbsp;showPerimeter                              | boolean | `true`                            | Display perimeter information                                                                                                                            |
| &nbsp;&nbsp;&nbsp;&nbsp;useMetrics                                 | boolean | `true`                            | Use metric units                                                                                                                                         |
| &nbsp;&nbsp;&nbsp;&nbsp;usePerimeterMinValue                       | boolean | `false`                           | Use minimum value for small perimeters                                                                                                                   |
| &nbsp;&nbsp;&nbsp;&nbsp;areaLabel                                  | string  | `"Area"`                          | Label for area display                                                                                                                                   |
| &nbsp;&nbsp;&nbsp;&nbsp;perimeterLabel                             | string  | `"Perimeter"`                     | Label for perimeter display                                                                                                                              |
| &nbsp;&nbsp;&nbsp;&nbsp;**values**                                 | object  |                                   | Default values configuration                                                                                                                             |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**min**                        | object  |                                   | Minimum value settings                                                                                                                                   |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;metric             | string  | `"50"`                            | Minimum metric value                                                                                                                                     |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;imperial           | string  | `"100"`                           | Minimum imperial value                                                                                                                                   |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**unknown**                    | object  |                                   | Unknown value settings                                                                                                                                   |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;metric             | string  | `"-"`                             | Unknown metric placeholder                                                                                                                               |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;imperial           | string  | `"-"`                             | Unknown imperial placeholder                                                                                                                             |
| &nbsp;&nbsp;&nbsp;&nbsp;**units**                                  | object  |                                   | Unit configuration                                                                                                                                       |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;unknownUnit                    | string  | `""`                              | Unknown unit placeholder                                                                                                                                 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**metric**                     | object  |                                   | Metric units                                                                                                                                             |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;onlyMetrics        | boolean | `true`                            | Use only m² and km² for area                                                                                                                             |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**perimeter**      | object  |                                   | Perimeter units                                                                                                                                          |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;m      | string  | `"m"`                             | Meter unit                                                                                                                                               |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;km     | string  | `"km"`                            | Kilometer unit                                                                                                                                           |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**area**           | object  |                                   | Area units                                                                                                                                               |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;m2     | string  | `"m²"`                            | Square meter unit                                                                                                                                        |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;km2    | string  | `"km²"`                           | Square kilometer unit                                                                                                                                    |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;daa    | string  | `"daa"`                           | Decare unit                                                                                                                                              |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ha     | string  | `"ha"`                            | Hectare unit                                                                                                                                             |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**imperial**                   | object  |                                   | Imperial units                                                                                                                                           |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**perimeter**      | object  |                                   | Perimeter units                                                                                                                                          |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;feet   | string  | `"ft"`                            | Feet unit                                                                                                                                                |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;yards  | string  | `"yd"`                            | Yards unit                                                                                                                                               |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;miles  | string  | `"mi"`                            | Miles unit                                                                                                                                               |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**area**           | object  |                                   | Area units                                                                                                                                               |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;feet2  | string  | `"ft²"`                           | Square feet unit                                                                                                                                         |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;yards2 | string  | `"yd²"`                           | Square yards unit                                                                                                                                        |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;acres  | string  | `"ac"`                            | Acres unit                                                                                                                                               |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;miles2 | string  | `"mi²"`                           | Square miles unit                                                                                                                                        |
| &nbsp;&nbsp;&nbsp;&nbsp;styleClasses                               | array   | `["polygon-marker", "info"]`      | CSS classes for info marker                                                                                                                              |
| &nbsp;&nbsp;&nbsp;&nbsp;zIndexOffset                               | number  | `10000`                           | Z-index offset for info marker                                                                                                                           |
| &nbsp;&nbsp;**markerMenuIcon**                                     | object  |                                   | Menu marker configuration                                                                                                                                |
| &nbsp;&nbsp;&nbsp;&nbsp;position                                   | number  | `1`                               | Marker position (see MarkerPosition enum)                                                                                                                |
| &nbsp;&nbsp;&nbsp;&nbsp;styleClasses                               | array   | `["polygon-marker", "menu"]`      | CSS classes for menu marker                                                                                                                              |
| &nbsp;&nbsp;&nbsp;&nbsp;zIndexOffset                               | number  | `10000`                           | Z-index offset for menu marker                                                                                                                           |
| &nbsp;&nbsp;**markerDeleteIcon**                                   | object  |                                   | Delete marker configuration                                                                                                                              |
| &nbsp;&nbsp;&nbsp;&nbsp;position                                   | number  | `5`                               | Marker position (see MarkerPosition enum)                                                                                                                |
| &nbsp;&nbsp;&nbsp;&nbsp;styleClasses                               | array   | `["polygon-marker", "delete"]`    | CSS classes for delete marker                                                                                                                            |
| &nbsp;&nbsp;&nbsp;&nbsp;zIndexOffset                               | number  | `10000`                           | Z-index offset for delete marker                                                                                                                         |
| &nbsp;&nbsp;**holeMarkers**                                        | object  |                                   | Configuration for markers on holes                                                                                                                       |
| &nbsp;&nbsp;&nbsp;&nbsp;menuMarker                                 | boolean | `false`                           | Show menu marker on holes                                                                                                                                |
| &nbsp;&nbsp;&nbsp;&nbsp;deleteMarker                               | boolean | `true`                            | Show delete marker on holes                                                                                                                              |
| &nbsp;&nbsp;&nbsp;&nbsp;infoMarker                                 | boolean | `false`                           | Show info marker on holes                                                                                                                                |
| &nbsp;&nbsp;**visualOptimization**<sup>\*4</sup>                   | object  |                                   | Visual optimization settings (deprecated; see note below)                                                                                                |
| &nbsp;&nbsp;&nbsp;&nbsp;toleranceMin                               | number  | `0.000005`                        | Minimum simplification tolerance used when `visualOptimizationLevel` > 0                                                                                 |
| &nbsp;&nbsp;&nbsp;&nbsp;toleranceMax                               | number  | `0.005`                           | Maximum tolerance used at the highest optimization level                                                                                                 |
| &nbsp;&nbsp;&nbsp;&nbsp;curve                                      | number  | `1.35`                            | Exponent controlling how quickly tolerance grows across the 0–10 level range                                                                             |
| &nbsp;&nbsp;&nbsp;&nbsp;sharpAngleThreshold                        | number  | `30`                              | (Deprecated) Previous sharp-angle cutoff; no longer used                                                                                                 |
| &nbsp;&nbsp;&nbsp;&nbsp;thresholdBoundingBox                       | number  | `0.05`                            | (Deprecated) Previous bounding-box threshold; no longer used                                                                                             |
| &nbsp;&nbsp;&nbsp;&nbsp;thresholdDistance                          | number  | `0.05`                            | (Deprecated) Previous distance threshold; no longer used                                                                                                 |
| &nbsp;&nbsp;&nbsp;&nbsp;useDistance                                | boolean | `true`                            | (Deprecated) Legacy distance toggle                                                                                                                      |
| &nbsp;&nbsp;&nbsp;&nbsp;useBoundingBox                             | boolean | `false`                           | (Deprecated) Legacy bounding-box toggle                                                                                                                  |
| &nbsp;&nbsp;&nbsp;&nbsp;useAngles                                  | boolean | `true`                            | Angle-based elbow visibility toggle                                                                                                                      |
| **styles.polyline**                                                | object  |                                   | Polyline styling options                                                                                                                                 |
| &nbsp;&nbsp;opacity                                                | number  | `1`                               | Polyline opacity                                                                                                                                         |
| &nbsp;&nbsp;weight                                                 | number  | `2`                               | Polyline weight in pixels                                                                                                                                |
| **styles.subtractLine**                                            | object  |                                   | Subtract mode polyline styling                                                                                                                           |
| &nbsp;&nbsp;opacity                                                | number  | `1`                               | Subtract polyline opacity                                                                                                                                |
| &nbsp;&nbsp;weight                                                 | number  | `2`                               | Subtract polyline weight                                                                                                                                 |
| **styles.polygon**                                                 | object  |                                   | Polygon styling options                                                                                                                                  |
| &nbsp;&nbsp;weight                                                 | number  | `2`                               | Polygon border weight in pixels                                                                                                                          |
| &nbsp;&nbsp;opacity                                                | number  | `1`                               | Polygon border opacity (0-1)                                                                                                                             |
| &nbsp;&nbsp;fillOpacity                                            | number  | `0.2`                             | Polygon fill opacity (0-1)                                                                                                                               |
| &nbsp;&nbsp;smoothFactor                                           | number  | `0.3`                             | Polygon smoothing factor                                                                                                                                 |
| &nbsp;&nbsp;noClip                                                 | boolean | `true`                            | Disable polygon clipping                                                                                                                                 |
| **styles.hole**                                                    | object  |                                   | Hole styling options                                                                                                                                     |
| &nbsp;&nbsp;weight                                                 | number  | `2`                               | Hole border weight                                                                                                                                       |
| &nbsp;&nbsp;opacity                                                | number  | `1`                               | Hole border opacity                                                                                                                                      |
| &nbsp;&nbsp;fillOpacity                                            | number  | `0.5`                             | Hole fill opacity                                                                                                                                        |
| **polygonCreation**                                                | object  |                                   | Polygon creation settings                                                                                                                                |
| &nbsp;&nbsp;algorithm                                              | string  | `"concaveman"`<sup>\*1, \*2</sup> | Creation algorithm (`'concaveman'` or `'direct'`; `'buffer'` is deprecated and falls back to `'concaveman'`)                                          |
| **simplification**                                                 | object  |                                   | General simplification settings                                                                                                                          |
| &nbsp;&nbsp;strategy                                               | string  | `"simple"`                        | Simplification strategy: `"simple"` or `"dynamic"`                                                                                                       |
| &nbsp;&nbsp;**simple**                                             | object  |                                   | Simple simplification settings                                                                                                                           |
| &nbsp;&nbsp;&nbsp;&nbsp;tolerance                                  | number  | `0.001`                           | Simplification tolerance                                                                                                                                 |
| &nbsp;&nbsp;&nbsp;&nbsp;highQuality                                | boolean | `false`                           | High quality mode                                                                                                                                        |
| &nbsp;&nbsp;**dynamic**                                            | object  |                                   | Dynamic simplification settings                                                                                                                          |
| &nbsp;&nbsp;&nbsp;&nbsp;baseTolerance                              | number  | `0.0001`                          | Base tolerance for dynamic mode                                                                                                                          |
| &nbsp;&nbsp;&nbsp;&nbsp;highQuality                                | boolean | `false`                           | High quality mode                                                                                                                                        |
| &nbsp;&nbsp;&nbsp;&nbsp;fractionGuard                              | number  | `0.9`                             | Fraction guard value                                                                                                                                     |
| &nbsp;&nbsp;&nbsp;&nbsp;multiplier                                 | number  | `2`                               | Tolerance multiplier                                                                                                                                     |
| **polygonTools.bbox**                                                    | object  |                                   | Bounding box settings                                                                                                                                    |
| &nbsp;&nbsp;addMidPointMarkers                                     | boolean | `true`                            | Add midpoint markers to bounding box                                                                                                                     |
| **polygonTools.bezier**                                            | object  |                                   | Bezier curve settings                                                                                                                                    |
| &nbsp;&nbsp;resolution                                             | number  | `10000`                           | Bezier curve resolution                                                                                                                                  |
| &nbsp;&nbsp;sharpness                                              | number  | `0.75`                            | Bezier curve sharpness                                                                                                                                   |
| &nbsp;&nbsp;resampleMultiplier                                     | number  | `10`                              | Output points per input vertex when resampling                                                                                                           |
| &nbsp;&nbsp;maxNodes                                               | number  | `1000`                            | Maximum number of nodes after bezier smoothing                                                                                                           |
| &nbsp;&nbsp;visualOptimizationLevel                                | number  | `10`                              | Visual optimization level applied after bezier                                                                                                           |
| &nbsp;&nbsp;ghostMarkers                                           | boolean | `false`                           | Make the bezier result almost invisible while keeping it draggable                                                                                       |
| **history**                                                        | object  |                                   | History capture settings                                                                                                                                 |
| &nbsp;&nbsp;**capture**                                            | object  |                                   | Toggle which actions create undo/redo snapshots                                                                                                          |
| &nbsp;&nbsp;&nbsp;&nbsp;freehand                                   | boolean | `true`                            | Save history for freehand drawing                                                                                                                        |
| &nbsp;&nbsp;&nbsp;&nbsp;pointToPoint                               | boolean | `true`                            | Save history for point-to-point drawing                                                                                                                  |
| &nbsp;&nbsp;&nbsp;&nbsp;addPredefinedPolygon                       | boolean | `true`                            | Save history for predefined polygons                                                                                                                     |
| &nbsp;&nbsp;&nbsp;&nbsp;eraseAll                                   | boolean | `true`                            | Save history for erase-all                                                                                                                               |
| &nbsp;&nbsp;&nbsp;&nbsp;markerDrag                                 | boolean | `true`                            | Save history when dragging markers                                                                                                                       |
| &nbsp;&nbsp;&nbsp;&nbsp;polygonDrag                                | boolean | `true`                            | Save history when dragging polygons                                                                                                                      |
| &nbsp;&nbsp;&nbsp;&nbsp;polygonClone                               | boolean | `true`                            | Save history when cloning polygons                                                                                                                       |
| &nbsp;&nbsp;&nbsp;&nbsp;addVertex                                  | boolean | `true`                            | Save history when adding vertices                                                                                                                        |
| &nbsp;&nbsp;&nbsp;&nbsp;removeVertex                               | boolean | `true`                            | Save history when removing vertices                                                                                                                      |
| &nbsp;&nbsp;&nbsp;&nbsp;removeHole                                 | boolean | `true`                            | Save history when deleting holes                                                                                                                         |
| &nbsp;&nbsp;&nbsp;&nbsp;modifierSubtract                           | boolean | `true`                            | Save history for modifier-key subtract drags                                                                                                              |
| &nbsp;&nbsp;&nbsp;&nbsp;deletePolygon                              | boolean | `true`                            | Save history when deleting polygons                                                                                                                      |
| &nbsp;&nbsp;&nbsp;&nbsp;**polygonActions**                         | object  |                                   | History toggles for polygon menu actions                                                                                                                 |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;simplify                        | boolean | `true`                            | Save history for simplify                                                                                                                                |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;doubleElbows                    | boolean | `true`                            | Save history for double elbows                                                                                                                           |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;bbox                            | boolean | `true`                            | Save history for bounding box                                                                                                                            |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;bezier                          | boolean | `true`                            | Save history for bezier                                                                                                                                    |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;scale                           | boolean | `true`                            | Save history for scale                                                                                                                                    |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;rotate                          | boolean | `true`                            | Save history for rotate                                                                                                                                   |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;toggleOptimization              | boolean | `true`                            | Save history for visual optimization toggle                                                                                                              |
| **history.maxSize**                                                 | number  | `50`                              | Maximum number of snapshots stored in undo history                                                                                                       |
| **polygonTools**                                                 | object  |                                   | Menu operation toggles                                                                                                                                   |
| &nbsp;&nbsp;**simplify**                                           | object  |                                   | Simplify operation configuration                                                                                                                         |
| &nbsp;&nbsp;&nbsp;&nbsp;enabled                                    | boolean | `true`                            | Enable simplify operation                                                                                                                                |
| &nbsp;&nbsp;&nbsp;&nbsp;processHoles                               | boolean | `true`                            | Process holes during simplify                                                                                                                            |
| &nbsp;&nbsp;**doubleElbows**                                       | object  |                                   | Double elbows operation configuration                                                                                                                    |
| &nbsp;&nbsp;&nbsp;&nbsp;enabled                                    | boolean | `true`                            | Enable double elbows operation                                                                                                                           |
| &nbsp;&nbsp;&nbsp;&nbsp;processHoles                               | boolean | `true`                            | Process holes during double elbows                                                                                                                       |
| &nbsp;&nbsp;**bbox**                                               | object  |                                   | Bounding box operation configuration                                                                                                                     |
| &nbsp;&nbsp;&nbsp;&nbsp;enabled                                    | boolean | `true`                            | Enable bounding box operation                                                                                                                            |
| &nbsp;&nbsp;&nbsp;&nbsp;processHoles                               | boolean | `true`                            | Process holes during bounding box                                                                                                                        |
| &nbsp;&nbsp;**bezier**                                             | object  |                                   | Bezier operation configuration                                                                                                                           |
| &nbsp;&nbsp;&nbsp;&nbsp;enabled                                    | boolean | `true`                            | Enable bezier operation                                                                                                                                  |
| &nbsp;&nbsp;**scale**                                              | object  |                                   | Scale operation configuration                                                                                                                            |
| &nbsp;&nbsp;&nbsp;&nbsp;enabled                                    | boolean | `true`                            | Enable scale operation                                                                                                                                   |
| &nbsp;&nbsp;**rotate**                                             | object  |                                   | Rotate operation configuration                                                                                                                           |
| &nbsp;&nbsp;&nbsp;&nbsp;enabled                                    | boolean | `true`                            | Enable rotate operation                                                                                                                                  |
| &nbsp;&nbsp;**visualOptimizationToggle**                           | object  |                                   | Visual optimization toggle in marker menu                                                                                                                |
| &nbsp;&nbsp;&nbsp;&nbsp;enabled                                    | boolean | `true`                            | Enable the visual optimization toggle button in the polygon menu                                                                                         |
| **styles**                                                         | object  |                                   | Line, polygon, hole, and UI style configuration                                                                                                          |
| &nbsp;&nbsp;**polyline.color**                                    | string  | `"#50622b"`                       | Freehand polyline color                                                                                                                                  |
| &nbsp;&nbsp;**subtractLine.color**                                | string  | `"#D9460F"`                       | Subtract polyline color                                                                                                                                  |
| &nbsp;&nbsp;**polygon.color**                                     | string  | `"#50622b"`                       | Polygon border color                                                                                                                                     |
| &nbsp;&nbsp;**polygon.fillColor**                                 | string  | `"#b4cd8a"`                       | Polygon fill color                                                                                                                                       |
| &nbsp;&nbsp;**hole.color**                                        | string  | `"#aa0000"`                       | Hole border color                                                                                                                                        |
| &nbsp;&nbsp;**hole.fillColor**                                    | string  | `"#ffcccc"`                       | Hole fill color                                                                                                                                          |
| &nbsp;&nbsp;**ui.dragSubtract.color**                             | string  | `"#D9460F"`                       | Drag-subtract preview color                                                                                                                              |
| &nbsp;&nbsp;**ui.p2pClosingMarker.color**                         | string  | `"#4CAF50"`                       | Point-to-point closing marker color                                                                                                                      |
| &nbsp;&nbsp;**ui.edgeHover.color**                                | string  | `"#7a9441"`                       | Edge hover color                                                                                                                                         |
| &nbsp;&nbsp;**ui.edgeDeletion.color**                             | string  | `"#D9460F"`                       | Edge-deletion hover color                                                                                                                                |
| &nbsp;&nbsp;**ui**                                                | object  |                                   | UI style colors                                                                                                                                          |
| &nbsp;&nbsp;&nbsp;&nbsp;**controlButton**                          | object  |                                   | Control button colors                                                                                                                                    |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;backgroundColor                | string  | `"#fff"`                          | Control button background color                                                                                                                          |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;color                          | string  | `"#000"`                          | Control button text color                                                                                                                                |
| &nbsp;&nbsp;&nbsp;&nbsp;controlButtonHover                         | string  | `"#f4f4f4"`                       | Control button hover background color                                                                                                                    |
| &nbsp;&nbsp;&nbsp;&nbsp;**controlButtonActive**                    | object  |                                   | Active control button colors                                                                                                                             |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;backgroundColor                | string  | `"rgb(128, 218, 255)"`            | Active control button background color                                                                                                                   |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;color                          | string  | `"#fff"`                          | Active control button text color                                                                                                                         |
| &nbsp;&nbsp;&nbsp;&nbsp;indicatorActive                            | string  | `"#ffcc00"`                       | Active indicator background color                                                                                                                        |
| &nbsp;&nbsp;&nbsp;&nbsp;**p2pMarker**                              | object  |                                   | P2P marker colors                                                                                                                                        |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;backgroundColor                | string  | `"#fff"`                          | P2P marker background color                                                                                                                              |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;borderColor                    | string  | `"#50622b"`                       | P2P marker border color                                                                                                                                  |

## Footnotes

#### \*1 (kinks)

The `kinks` option controls how self‑intersecting polygons are handled:

- `true` keeps the full shape as a single geometry
- `false` automatically splits it into valid, simple polygons

This setting only has an effect when the polygon still contains its self‑intersections.

The default `polygonCreation.algorithm` is `concaveman`, which builds a concave hull around a freehand trace and always removes self‑intersections.  
Because of this, `kinks` has no effect when using `concaveman`.

If you need self‑intersections to be preserved (e.g., so `kinks=false` can split a figure‑eight), switch to the `direct` creation algorithm, or use the point‑to‑point drawing mode.

#### \*2 (creation methods)

Polydraw can convert a freehand trace into a polygon in multiple ways. Set the behavior via `polygonCreation.algorithm`:

- `concaveman` – Builds a concave hull from the drawn points so you get a clean outline with relatively few vertices. (Self-intersections are removed, so figure-eight “kinks” won’t be preserved.)
- `direct` – Converts the raw trace directly into a closed polygon ring. Every wiggle and self-intersection remains. Use this when geometric fidelity matters more than vertex count.
  - With `kinks: false`, a figure-eight is automatically split into separate loops.
  - With `kinks: true`, the intersections stay intact.
- `buffer` – Deprecated in v2. If provided, it falls back to `concaveman`.

```ts
// concaveman (default)
const polydrawConcave = new Polydraw({
  config: {
    polygonCreation: {
      algorithm: "concaveman",
    },
    simplification: {
      strategy: "simple",
      simple: { tolerance: 0.00001, highQuality: false },
    },
  },
});

// direct (preserve raw path)
const polydrawDirect = new Polydraw({
  config: {
    polygonCreation: {
      algorithm: "direct",
    },
    simplification: { strategy: "simple" },
    kinks: false, // set to true if you want to keep self-intersections intact
  },
});

// buffer (deprecated, falls back to concaveman)
const polydrawDeprecatedBuffer = new Polydraw({
  config: {
    polygonCreation: {
      algorithm: "buffer",
    },
    simplification: {
      strategy: "dynamic",
      dynamic: { baseTolerance: 0.0001, fractionGuard: 0.9, multiplier: 2 },
    },
  },
});
```

For Leaflet v1 control usage, pass the same `config` object into `L.control.polydraw({ config: { ... } })`.

#### \*3 (simplification tolerance)

Simplification tolerance controls how aggressively vertices are removed.  
Lower values preserve more detail but create larger polygons with more vertices.  
Higher values reduce vertex count but may noticeably alter the polygon’s shape.  
Tolerance is expressed in map units (latitude/longitude degrees when using EPSG:3857)  
and should generally be kept very small (e.g., 0.0001–0.001) to avoid distortion.

## External Configuration

Load configuration from an external JSON file:

```typescript
const polyDrawControl = L.control.polydraw({
  configPath: "path/to/your/polydraw.config.json",
});
```

You can also combine external configuration with inline configuration. Inline configuration takes precedence:

```typescript
const polyDrawControl = L.control.polydraw({
  configPath: "config/polydraw.json",
  config: {
    // These settings will override the external config
    styles: {
      polygon: {
        color: "#ff0000",
      },
    },
  },
});
```

**Configuration Priority (highest to lowest):**

1. Inline `config` parameter
2. External configuration file
3. Default configuration

If the external configuration file fails to load, the plugin will fall back to using the default configuration plus any inline configuration provided.

**Simplification migration**: Polydraw logs a console warning when it detects the legacy structure. Prefer the unified block:

```ts
{
  strategy: 'dynamic',
  simple: { tolerance: 0.00005, highQuality: true },
  dynamic: { baseTolerance: 0.0001, highQuality: false, fractionGuard: 0.9, multiplier: 2 },
}
```

```ts
// Legacy (still supported but deprecated)
{
  simplification: {
    mode: 'dynamic',
    simple: { tolerance: 0.00005, highQuality: true },
    dynamic: { baseTolerance: 0.0001, highQuality: false, fractionGuard: 0.9, multiplier: 2 },
  },
}
```

#### \*4 (visual optimization)

`markers.visualOptimization` is preserved for backward compatibility only. For predefined polygons, prefer the `visualOptimizationLevel` option (0–10) when calling `addPredefinedPolygon`/`addPredefinedGeoJSONs`. Higher levels apply a larger simplification tolerance (between `toleranceMin` and `toleranceMax`) and hide more elbows, while level 0 keeps every handle visible. The polygon geometry itself is never altered.
