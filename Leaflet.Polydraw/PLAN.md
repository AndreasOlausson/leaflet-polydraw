# Release Plan

## [1.3.x] - Bezier Tool Production Readiness

### Goals
- Make the Bezier tool reliable and predictable for production use.
- Treat a Bezier apply as a single, undoable operation.
- Preserve user expectations (holes, metadata, and visual optimization behavior).

### Planned Changes
- Replace on Bezier apply: remove the original polygon and re-add it using its points as a predefined polygon with visual optimization enabled.
- History: ensure the replace is recorded as one history entry (no intermediate states).
- Metadata: keep or reattach relevant polygon metadata (e.g., optimization flags, IDs).
- Algorithm trimming: reduce spikes/loops, keep rings closed, and clamp smoothing to avoid over-simplification.
- Holes: apply Bezier consistently to outer ring and holes, preserving ring orientation.
- UX: disable Bezier for insufficient points; keep the menu behavior consistent.

### Tests
- Unit: Bezier keeps ring closed, preserves hole count, and respects min vertices.
- Integration: Bezier apply -> undo restores original polygon.
- Visual: sample polygons (dense/sparse) produce stable results.

### Out of Scope
- New UI controls beyond existing Bezier menu entry.
- Large refactor of history storage (beyond the single action grouping).

### Open Questions
- Should Bezier preserve polygon IDs or generate new ones?
- Should visual optimization be forced on, or inherit per-polygon setting?
- Should Bezier be skipped for very small polygons or only warn?
