# Migration Guide (v1 -> v2)

This guide covers the high-impact changes when moving from v1 config and API usage to v2.

## Config key moves

- `defaultMode` -> `tools.default`
- `modes.draw` -> `tools.draw`
- `modes.subtract` -> `tools.subtract`
- `modes.p2p` -> `tools.p2p`
- `modes.p2pSubtract` -> `tools.p2pSubtract`
- `modes.clonePolygons` -> `tools.clone`
- `modes.deleteAll` -> `tools.erase`
- `dragPolygons.*` -> `interaction.drag.*`
- `edgeDeletion.*` -> `interaction.edgeDeletion.*`
- `menuOperations` -> `polygonTools`
- `boundingBox` -> `polygonTools.bbox`
- `bezier` -> `polygonTools.bezier`
- `polyLineOptions` -> `styles.polyline`
- `subtractLineOptions` -> `styles.subtractLine`
- `polygonOptions` -> `styles.polygon`
- `holeOptions` -> `styles.hole`
- `maxHistorySize` -> `history.maxSize`
- `simplification.mode` -> `simplification.strategy`
- `polygonCreation.method` -> `polygonCreation.algorithm`

## Metadata migration notes

- `addPredefinedPolygon(...)` accepts `options.metadata`.
- `addPredefinedGeoJSONs(...)` uses `feature.properties` as metadata fallback when `options.metadata` is omitted.
- Runtime feature metadata APIs:
  - `getFeatureMetadata(featureGroup)`
  - `setFeatureMetadata(featureGroup, metadata)`
  - `patchFeatureMetadata(featureGroup, metadataPatch)`
- For concrete metadata examples, see `../docs/API.md`.

## Behavior notes

- Polygon operations are layer-aware in v2. Merge/subtract/edit operations apply to the active editable layer.
- Metadata persistence is deterministic across clone/drag, merge/split/subtract, and undo/redo restore.
- Merge metadata strategy:
  - explicit incoming metadata wins
  - otherwise merged result inherits the first intersecting source metadata
  - provenance is tracked internally via `sourceFeatureIds`

## Migration helper

v2 includes runtime deprecation warnings and migration handling for common legacy config paths via `src/guards/config-deprecation-guard.ts`.
