# Release Plan

## [1.4.x] - Additional Polygon Metadata

### Goals
- Add per-polygon metadata that is not tied to visual optimization (custom text, colors, tags).
- Preserve backward compatibility with existing polygons and config defaults.

### Planned Changes
- Add a dedicated metadata bag per polygon, separate from visual optimization metadata.
- Allow metadata to flow through core actions (clone, undo/redo, merge, split).
- Provide lightweight hooks to surface metadata in the info popup and styling.

### Tests
- Unit: metadata survives clone and undo/redo.
- Integration: metadata persists through merge and split workflows.
- UI: metadata shows in the info popup when configured.

### Out of Scope
- Full theming system or complex styling rules.

### Open Questions
- Should metadata be stored on polygon objects or in an external store keyed by ID?
- How should metadata resolve on merge or split (merge rules vs preserve lists)?

## [1.4.x] - Layered Polygon Sets

### Goals
- Introduce layered polygon sets so overlaps across layers do not merge or affect each other.
- Preserve backward compatibility with existing polygons and config defaults.

### Planned Changes
- Implement layer containers with a single active layer for edits and creation.
- Ensure merges and topology operations only affect polygons within the same layer.
- Add simple layer controls for visibility and active selection.

### Tests
- Unit: merge behavior follows layer boundaries.
- Integration: overlapping polygons in different layers do not merge or subtract.
- UI: switching the active layer routes new polygons to that layer.

### Out of Scope
- Complex layer import/export workflows beyond existing formats.

### Open Questions
- How should layer ordering and selection priority behave when layers overlap?
