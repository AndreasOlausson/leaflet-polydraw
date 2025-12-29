# Events

Polydraw emits events through the control instance (use `polydraw.on(...)`, not `map.on(...)`). These events are useful for implementing features like auto-save, validation, analytics, or custom UI updates.

## Draw Mode Events

Listen for drawing mode changes to update your UI or trigger specific behaviors:

```typescript
polydraw.on("polydraw:mode:change", ({ mode }) => {
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

## Polygon Lifecycle Events

Track polygon creation, modification, and deletion:

```typescript
// Polygon created
polydraw.on("polydraw:polygon:created", ({ polygon, isPointToPoint, mode }) => {
  console.log("New polygon created:", polygon, { isPointToPoint, mode });
  // Auto-save, validate, or log the new polygon
  savePolygonToDatabase(polygon);
});

// Polygon updated (vertices moved, simplified, etc.)
polydraw.on("polydraw:polygon:updated", ({ polygon, operation }) => {
  console.log("Polygon updated:", operation);
  // Mark as unsaved, trigger validation
  markAsUnsaved(polygon);
});

// Polygon deleted
polydraw.on("polydraw:polygon:deleted", () => {
  console.log("Polygon deleted");
  // Remove from database, update counters
  updateCounters();
});
```

## Marker Events

Listen for marker interactions (menu, delete, info, elbows):

```typescript
polydraw.on("polydraw:marker:click", (event) => {
  console.log("Marker clicked:", event.target);
});

polydraw.on("polydraw:marker:dragstart", (event) => {
  console.log("Marker drag start:", event.target);
});

polydraw.on("polydraw:marker:dragend", (event) => {
  console.log("Marker drag end:", event.target);
});
```

## History Events

Keep UI state in sync with undo/redo:

```typescript
polydraw.on("polydraw:history:changed", ({ canUndo, canRedo }) => {
  updateHistoryButtons(canUndo, canRedo);
});

polydraw.on("polydraw:history:undo", ({ action }) => {
  console.log("Undo:", action);
});

polydraw.on("polydraw:history:redo", ({ action }) => {
  console.log("Redo:", action);
});
```

## Menu Actions

```typescript
polydraw.on("polydraw:menu:action", ({ action, featureGroup }) => {
  console.log("Menu action:", action, featureGroup);
});
```

## Draw Cancel Events

```typescript
polydraw.on("polydraw:draw:cancel", ({ mode }) => {
  console.log("Draw cancelled:", mode);
});
```

## Practical Use Cases

**Auto-save functionality:**

```typescript
const scheduleSave = debounce(() => saveToLocalStorage(polydraw.getAllPolygons()), 1000);

polydraw.on("polydraw:polygon:created", scheduleSave);
polydraw.on("polydraw:polygon:updated", scheduleSave);
polydraw.on("polydraw:polygon:deleted", scheduleSave);
```

**Validation and feedback:**

```typescript
polydraw.on("polydraw:polygon:created", ({ polygon }) => {
  const area = calculateArea(polygon);
  if (area < MIN_AREA) {
    showWarning("Polygon too small");
    // Apply styling via your own layer reference if needed
  }
});
```

**Analytics tracking:**

```typescript
polydraw.on("polydraw:mode:change", ({ mode }) => {
  analytics.track("draw_mode_changed", { mode });
});

polydraw.on("polydraw:polygon:created", ({ polygon }) => {
  analytics.track("polygon_created", {
    vertices: polygon.geometry.coordinates[0].length,
    area: calculateArea(polygon),
  });
});
```
