# Features

## Draw Mode

[![Draw Mode](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/gifs/draw.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/mp4/draw.mp4)

Create polygons by drawing freehand shapes on the map. Perfect for:

- Quick area sketching
- Rough boundary mapping
- Freehand polygon creation
- Natural drawing workflow

Simply click the draw button and drag your mouse/finger to create polygon shapes. The plugin automatically converts your drawn path into a clean polygon using advanced algorithms.

**Note**: The number of vertices in the final polygon is controlled by the `polygonCreation.simplification` settings in the configuration.

## Subtract Draw Mode

[![Subtract Mode](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/gifs/subtract.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/mp4/subtract.mp4)

Create holes and complex shapes by subtracting areas from existing polygons. Ideal for:

- Creating holes in polygons
- Removing unwanted areas
- Complex shape editing
- Precision area exclusion

Click the subtract button and draw over existing polygons to remove those areas, creating holes or splitting polygons into multiple parts.

**Tip**: You can enable `modifierSubtractMode` to hold Cmd/Ctrl and temporarily subtract while staying in Draw or Point-to-Point mode, even if subtract buttons are hidden.

## Point-to-Point Drawing

[![Point-to-Point Drawing](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/gifs/p2p-draw.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/mp4/p2p-draw.mp4)

Create precise polygons by clicking to place each vertex. Perfect for:

- Accurate boundary mapping
- Property delineation
- Custom shape creation

**How it works:**

1. Click to place the first vertex.
2. Continue clicking to add more vertices.
3. To complete the polygon (requires minimum 3 points):
   - **Desktop**: Click on the first vertex again or double-click anywhere on the map.
   - **Touch devices**: Tap near the first vertex (~5× larger close tolerance than desktop) or double-tap anywhere on the map.
4. Press `ESC` to cancel the current drawing.

You can also drag markers to adjust the shape and delete them by holding the modifier key (Cmd/Ctrl) and clicking on a marker, just like with regular polygon editing.

## Point-to-Point Subtract

[![Point-to-Point Subtract](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/gifs/p2p-subtract.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/mp4/p2p-subtract.mp4)

Use point-to-point with subtraction to cut precise holes or remove segments:

- Click to place each vertex of the subtracting shape
- Complete the ring (click first vertex or double-click/tap)
- The ring subtracts from existing polygons, creating holes or splits

This mode mirrors point-to-point drawing but applies the shape as a subtraction instead of an addition.

## Clone Drag Mode
[![Clone Drag Mode](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/gifs/clone.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/mp4/clone.mp4)

Duplicate existing polygons by dragging out a copy while the original stays in place:

- Creating multiple similar polygons
- Duplicating complex shapes with holes
- Quick area replication
- Template-based polygon creation
- Opt-in interaction: Clone Drag Mode is available only when explicitly enabled via `config.modes.clonePolygons`.

Clone Drag Mode operates independently of the standard polygon dragging setting (`dragPolygons`). Even when global polygon dragging is disabled, clone operations via drag remain fully functional.

Simply click the clone button in the toolbar and drag any polygon on the map. A dashed ghost outline indicates the original position during the drag operation. Upon release, a new polygon is created at the drop location, and the original returns to its starting coordinates.
Press Esc to abort the clone. If history capture is enabled (`config.history.capture.polygonClone`), the clone can be reverted using Undo.

**Key Features**:

- **Hole Integrity**: Clones preserve all inner rings and optimization metadata.
- **Merge Support**: Respects `config.mergePolygons` — clones will merge with intersecting shapes if enabled.
- **Independence**: Operates even if global polygon dragging (`dragPolygons`) is disabled.
- **History Capture**: Each clone is recorded as a distinct action for easy undo/redo (configurable via `config.history.capture.polygonClone`).

## Undo & Redo

[![Undo and Redo](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/gifs/undo.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/mp4/undo.mp4)

Step backward or forward through edits:

- Undo/redo polygon drawing, subtraction, vertex edits, and transforms
- Undo/redo polygon menu operations (simplify, bbox, double elbows, bezier)
- Accessible via toolbar buttons or keyboard shortcuts
- History is capped to keep memory under control (`config.maxHistorySize`)
- You can opt out of specific action types via `config.history.capture` (snapshots still store full state)

## Smart Polygon Merging

[![Smart Merging](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/gifs/merge.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/mp4/merge.mp4)

The plugin features **two independent merge systems**:

### 1. Drawing Merge (`mergePolygons`)

- **When**: During polygon creation
- **Purpose**: Automatically merge new polygons with existing intersecting ones
- **Use case**: Streamlined drawing workflow

### 2. Drag Merge (`autoMergeOnIntersect`)

- **When**: During polygon dragging
- **Purpose**: Merge polygons when dragged together
- **Use case**: Interactive editing and combining

## Drag & Drop Functionality

[![Drag and Drop](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/gifs/merge2.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/mp4/merge2.mp4)

**Drag-to-Merge**: Drag polygons together to automatically merge them

**Drag-to-Hole**: Drag a polygon completely inside another to create a hole (requires a modifier key defined in `config.dragPolygons.modifierSubtract.keys`)

**Repositioning**: Drag to empty areas to simply reposition polygons

## Drag Elbows (Vertex Editing)

[![Drag Elbows](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/gifs/elbow.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/mp4/elbow.mp4)

Fine-tune polygon shapes by dragging individual vertices. Perfect for:

- Precision boundary adjustments
- Shape refinement after initial drawing
- Correcting polygon edges
- Detailed polygon editing

Click and drag any vertex (elbow) to reshape your polygons. To add a new vertex, click directly on the line between two existing points. To remove a vertex, hold the configured modifier key (defined in `config.dragPolygons.modifierSubtract.keys`) and click the vertex you want to delete. This provides full control over polygon geometry and shape refinement.

## Advanced Editing Tools

[![Editing Tools](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/gifs/polygon-tools.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/mp4/polygon-tools.mp4)

Access operations through the menu marker:

- **Simplify**: Reduce polygon complexity using Douglas-Peucker algorithm
- **Double Elbows**: Add intermediate vertices for higher resolution
- **Bounding Box**: Convert to rectangular bounds
- **Bezier Curves**: Apply smooth curve interpolation (alpha)
- **Scale**: Use the transform handles to resize the polygon without redrawing it.
- **Rotate**: Use the transform handles to rotate the polygon without redrawing it.
- **Visual Optimization Toggle**: Quickly show or hide the pruned “elbow” markers on predefined polygons, so you can inspect every
  vertex or keep the view uncluttered. (see [API.md](API.md))

## Programmatic Import & Export

Load and save polygon data directly from your app:

- **Predefined polygons**: Add polygons from saved data with automatic coordinate format detection.
- **GeoJSON support**: Import `Polygon` and `MultiPolygon` features, including holes.
- **Export**: Read back all polygons for persistence or server sync.

See [API.md](API.md) for method details and examples.

## Smart Marker System

Intelligent marker positioning prevents overlapping on small polygons:

- **Automatic separation**: Detects potential overlaps and redistributes markers
- **Priority-based**: Resolves conflicts using info → delete → menu priority
- **Smooth animations**: Markers fade during drag operations
