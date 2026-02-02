# Release Plan

## [2.0.0-alpha] - Major Release Plan (Breaking)

### Goals

- Reduce the public config surface to the most common, stable options.
- Separate "internal defaults" from user overrides to make configuration easier to maintain.
- Ship a complete Playwright E2E suite that covers core drawing/editing workflows.
- Add polygon metadata and layered polygon sets as first-class v2 features.

### Planned Changes

- Introduce a smaller, focused public config interface.
- Move rarely changed behavior (e.g., tooltip defaults, internal tuning knobs) into code-owned defaults.
- Provide a clear migration guide from v1 config keys to v2 equivalents (including deprecations).
- Define a v2 config schema (grouped by use-case) and remove deprecated keys from runtime merging.
- Add a migration helper or codemod to map common v1 configs to v2.
- Document a strict vs. advanced override mode (if we keep any escape hatches).
- Formalize a polygon metadata system inspired by the Angular `addAutoPolygon` flow.
- Introduce layered polygon sets so overlaps across layers do not merge or affect each other.
- Update docs/examples to reference `config.tools.*` (remove `modes.draw/subtract/p2p/...` references).
- Add a short v2 migration section (breaking config changes + renamed keys).
- Audit type exports/examples to ensure `ModeConfig` no longer includes tool flags.
- Add a minimal test that asserts a warning is logged when legacy `modes.*` tool keys are provided.

### Draft Config Mapping (WIP)

- `modes.*` -> `tools.*` (draw, subtract, p2p, p2pSubtract, clone, erase)
- `defaultMode` -> `tools.default`
- `modifierSubtractMode` -> `modifiers.temporarySubtract`
- `dragPolygons.*` -> `interaction.drag.*`
- `edgeDeletion.*` -> `interaction.edgeDeletion.*`
- `markers.*` -> `markers.*` (keep simple toggles public, move advanced metrics/units to internal defaults)
- `polyLineOptions` -> `styles.drawLine`
- `subtractLineOptions` -> `styles.subtractLine`
- `polygonOptions` -> `styles.polygon`
- `holeOptions` -> `styles.hole`
- `polygonCreation.*` -> `creation.*`
- `simplification.*` -> `simplify.*`
- `menuOperations.*` -> `menu.*`
- `boundingBox.*` -> `transform.boundingBox.*`
- `bezier.*` -> `smooth.bezier.*`
- `colors.*` -> `theme.*` (keep public palette small, move per-state styles to internal defaults)
- `tooltips.*` -> `ui.tooltips.*` (or internal defaults only)

### Polygon Metadata (v2)

- Public metadata bag on polygons (typed, minimal by default), with clear merge/split semantics.
- Optional computed fields: `leafletId`, `polygonCheckSum`, `minMaxPositions` (bounds), `isIdentifiable`.
- Optional control flags per polygon: `mergeable`, `draggable`.
- Optional UI metadata: `infoMarkerContent` and `customName` (for popups/labels).
- Allow `general` to carry app-specific data without polluting core.
- Ensure metadata persists through clone, undo/redo, merge, split, and drag operations.
- Add hooks to inject metadata on addPredefined/addAuto-like flows.

### Layered Polygon Sets (v2)

- Implement layer containers with a single active layer for edits and creation.
- Ensure merges and topology operations only affect polygons within the same layer.
- Add simple layer controls for visibility and active selection.

### Tests

- Unit: migrated config produces identical behavior to v1 defaults.
- Integration: common user overrides map cleanly to v2.
- E2E (Playwright): complete coverage for draw, subtract, clone, P2P, undo/redo, merge/split, and hotkey modifiers.

### Open Questions

- Should v2 offer a strict "public config only" mode, or allow advanced overrides behind a flag?
- Is it worth shipping a transitional helper to auto-migrate v1 configs at runtime?
- Should the Playwright suite validate both Leaflet v1 and v2 builds?
- How should metadata resolve on merge or split (merge rules vs preserve lists)?
- How should layer ordering and selection priority behave when layers overlap?
