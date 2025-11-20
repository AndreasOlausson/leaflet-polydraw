# Features

## Draw Mode

[![Draw Mode](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/draw-mode.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/draw-mode.gif)

Create polygons by drawing freehand shapes on the map. Perfect for:

- Quick area sketching
- Rough boundary mapping
- Freehand polygon creation
- Natural drawing workflow

Simply click the draw button and drag your mouse/finger to create polygon shapes. The plugin automatically converts your drawn path into a clean polygon using advanced algorithms.

**Note**: The number of vertices in the final polygon is controlled by the `polygonCreation.simplification` settings in the configuration.

## Subtract Draw Mode

[![Subtract Mode](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/subtract-mode.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/subtract-mode.gif)

Create holes and complex shapes by subtracting areas from existing polygons. Ideal for:

- Creating holes in polygons
- Removing unwanted areas
- Complex shape editing
- Precision area exclusion

Click the subtract button and draw over existing polygons to remove those areas, creating holes or splitting polygons into multiple parts.

## Point-to-Point Drawing

[![Point-to-Point Drawing](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/p2p.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/p2p.gif)

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

## Smart Polygon Merging

[![Smart Merging](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/merge.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/merge.gif)

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

[![Drag and Drop](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/drag-drop.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/drag-drop.gif)

**Drag-to-Merge**: Drag polygons together to automatically merge them

**Drag-to-Hole**: Drag a polygon completely inside another to create a hole (requires a modifier key defined in `config.dragPolygons.modifierSubtract.keys`)

**Repositioning**: Drag to empty areas to simply reposition polygons

## Drag Elbows (Vertex Editing)

[![Drag Elbows](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/drag-elbows.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/drag-elbows.gif)

Fine-tune polygon shapes by dragging individual vertices. Perfect for:

- Precision boundary adjustments
- Shape refinement after initial drawing
- Correcting polygon edges
- Detailed polygon editing

Click and drag any vertex (elbow) to reshape your polygons. To add a new vertex, click directly on the line between two existing points. To remove a vertex, hold the configured modifier key (defined in `config.dragPolygons.modifierSubtract.keys`) and click the vertex you want to delete. This provides full control over polygon geometry and shape refinement.

## Advanced Editing Tools

[![Editing Tools](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/editing-tools.gif)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/editing-tools.gif)

Access operations through the menu marker:

- **Simplify**: Reduce polygon complexity using Douglas-Peucker algorithm
- **Double Elbows**: Add intermediate vertices for higher resolution
- **Bounding Box**: Convert to rectangular bounds
- **Bezier Curves**: Apply smooth curve interpolation (alpha)
- **Scale**: Use the transform handles to resize the polygon without redrawing it.
- **Rotate**: Use the transform handles to rotate the polygon without redrawing it.
- **Visual Optimization Toggle**: Quickly show or hide the pruned “elbow” markers on predefined polygons, so you can inspect every
  vertex or keep the view uncluttered.

## Smart Marker System

[![Smart Markers](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/smart-markers.png)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/smart-markers.png)

Intelligent marker positioning prevents overlapping on small polygons:

- **Automatic separation**: Detects potential overlaps and redistributes markers
- **Priority-based**: Resolves conflicts using info → delete → menu priority
- **Smooth animations**: Markers fade during drag operations
