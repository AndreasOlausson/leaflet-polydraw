# Events

Polydraw emits various events that allow you to respond to user interactions and polygon changes. These events are useful for implementing features like auto-save, validation, analytics, or custom UI updates.

## Draw Mode Events

Listen for drawing mode changes to update your UI or trigger specific behaviors:

```javascript
import { drawMode } from "leaflet-polydraw";

polydraw.onDrawModeChanged((mode) => {
  console.log("Draw mode changed to:", mode);

  // Update UI based on current mode
  switch (mode) {
    case drawMode.Add:
      updateStatusBar("Drawing mode: Add polygons");
      break;
    case drawMode.Subtract:
      updateStatusBar("Drawing mode: Create holes");
      break;
    case drawMode.Off:
      updateStatusBar("Drag mode: Move polygons");
      break;
  }
});
```

## Polygon Lifecycle Events

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

## Drag & Drop Events

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

## Merge & Hole Events

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

## Practical Use Cases

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
