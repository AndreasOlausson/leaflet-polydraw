# Release Plan

## [2.0.0-alpha] - Major Release Plan (Breaking)

### Goals

- Reduce the public config surface to the most common, stable options.
- ~~Separate "internal defaults" from user overrides to make configuration easier to maintain.~~ 🚫 Decision: keep a single config object for now (no "second config" split).
- ~~Ship a complete Playwright E2E suite that covers core drawing/editing workflows.~~ ✅ Playwright suite is in place, including Leaflet v1/v2 matrix commands.
- Add polygon metadata as a first-class v2 feature.
- ~~Add layered polygon sets as a first-class v2 feature.~~ ✅ Core layer system is implemented.

### Planned Changes

- ~~Introduce a smaller, focused public config interface.~~
- ~~Move rarely changed behavior (e.g., tooltip defaults, internal tuning knobs) into code-owned defaults.~~ 🚫 Decision: not now; keep `tooltips` public for this cycle.
- Provide a clear migration guide from v1 config keys to v2 equivalents (including deprecations).
- Define a v2 config schema (grouped by use-case) and remove deprecated keys from runtime merging.
- ~~Add a migration helper or codemod to map common v1 configs to v2.~~ ✅ `src/guards/config-deprecation-guard.ts` — runtime migration for `modes.*` → `tools.*` with deprecation warnings.
- Document a strict vs. advanced override mode (if we keep any escape hatches).
- Formalize a polygon metadata system inspired by the Angular `addAutoPolygon` flow.
- ~~Introduce layered polygon sets so overlaps across layers do not merge or affect each other.~~ ✅ Implemented with layer-scoped assignment and layer-aware operations.
- Update docs/examples to reference `config.tools.*` (remove `modes.draw/subtract/p2p/...` references).
- Add a short v2 migration section (breaking config changes + renamed keys).
- ~~Audit type exports/examples to ensure `ModeConfig` no longer includes tool flags.~~ ✅ `ModeConfig` now contains behavior flags only (no tool toggles).
- ~~Add a minimal test that asserts a warning is logged when legacy `modes.*` tool keys are provided.~~ ✅ `test/unit/guards/config-deprecation-guard.test.ts` — 56 tests covering all warning categories + migration logic.
- ~~Add layer reorder support that keeps panel order and map feature-group order in sync.~~ ✅ Implemented (manager + panel drag/drop + feature-group reordering).
- ~~Prevent editing of inactive-layer polygons/markers.~~ ✅ Inactive-layer marker interactions are now read-only.

### Draft Config Mapping (WIP)

- ~~`modes.*` -> `tools.*` (draw, subtract, p2p, p2pSubtract, clone, erase)~~ ✅ Implemented.
- ~~`defaultMode` -> `tools.default`~~ ✅ Implemented.
- `modifierSubtractMode` -> `modifiers.temporarySubtract`
- ~~`dragPolygons.*` -> `interaction.drag.*`~~ ✅ Implemented.
- ~~`edgeDeletion.*` -> `interaction.edgeDeletion.*`~~ ✅ Implemented.
- `markers.*` -> `markers.*` (keep simple toggles public, move advanced metrics/units to internal defaults)
- ~~`polyLineOptions` -> `styles.drawLine`~~ ✅ Implemented via unified `styles.polyline`.
- ~~`subtractLineOptions` -> `styles.subtractLine`~~ ✅ Implemented.
- ~~`polygonOptions` -> `styles.polygon`~~ ✅ Implemented.
- ~~`holeOptions` -> `styles.hole`~~ ✅ Implemented.
- `polygonCreation.*` -> `creation.*`
- `simplification.*` -> `simplify.*`
- `menuOperations.*` -> `menu.*`
- `boundingBox.*` -> `transform.boundingBox.*`
- `bezier.*` -> `smooth.bezier.*`
- ~~`colors.*` -> `theme.*` (keep public palette small, move per-state styles to internal defaults)~~ ✅ Implemented via unified `styles.*` (including `styles.ui.*`).
- ~~`tooltips.*` -> `ui.tooltips.*` (or internal defaults only)~~ 🚫 Decision: keep `tooltips.*` public for now.

### Polygon Metadata (v2)

- Public metadata bag on polygons (typed, minimal by default), with clear merge/split semantics.
- Optional computed fields: `leafletId`, `polygonCheckSum`, `minMaxPositions` (bounds), `isIdentifiable`.
- Optional control flags per polygon: `mergeable`, `draggable`.
- Optional UI metadata: `infoMarkerContent` and `customName` (for popups/labels).
- Allow `general` to carry app-specific data without polluting core.
- Ensure metadata persists through clone, undo/redo, merge, split, and drag operations.
- Add hooks to inject metadata on addPredefined/addAuto-like flows.

### Layered Polygon Sets (v2)

- ~~Implement layer containers with a single active layer for edits and creation.~~ ✅
- ~~Ensure merges and topology operations only affect polygons within the same layer.~~ ✅ Core layer-scoped behavior implemented.
- ~~Add simple layer controls for visibility and active selection.~~ ✅ Layer panel supports active, visibility, delete, collapse, and reorder.

### Tests

- Unit: migrated config produces identical behavior to v1 defaults.
- Integration: common user overrides map cleanly to v2.
- E2E (Playwright): complete coverage for draw, subtract, clone, P2P, undo/redo, merge/split, and hotkey modifiers.
- ~~Run unit tests against both Leaflet v1 and v2 in one command.~~ ✅ `npm run test:leaflet:matrix`
- ~~Run Playwright tests against both Leaflet v1 and v2 in one command.~~ ✅ `npm run test:playwright:matrix`

### Open Questions

- Should v2 offer a strict "public config only" mode, or allow advanced overrides behind a flag?
- ~~Is it worth shipping a transitional helper to auto-migrate v1 configs at runtime?~~ ✅ Yes, runtime migration helper is implemented.
- ~~Should the Playwright suite validate both Leaflet v1 and v2 builds?~~ ✅ Yes, matrix scripts are in place.
- How should metadata resolve on merge or split (merge rules vs preserve lists)?
- How should layer ordering and selection priority behave when layers overlap?

### Rethink Notes

- ~~`dynamicTolerance` should be totally internal.~~ ✅
- ~~Do not expose `dynamicTolerance` as a public config key or option type.~~ ✅
- ~~Keep dynamic-iteration behavior controlled by internal code paths only.~~ ✅
- If needed for debugging, gate it behind a dev-only/internal flag (not documented in public API).

## Part II - addPredefinedPolygon(s) Input and Layer Policy (Draft, no code yet)

### Why

- This phase is primarily API and state-model design.
- Goal: make imported/predefined polygon behavior explicit for editable vs informational layers.

### Draft Input Direction

- Expand layer input from simple `name/color` to a layer descriptor:
  - `layer: { id, label?, color?, visibility?, panel?, interaction?, metadata? }`
- Keep backwards compatibility with existing simple layer input.

### Draft Interaction Policy

- Use an explicit layer interaction mode:
  - `editable`: current behavior (full edit handles/markers/tools where applicable)
  - `readonly`: visible + inspectable, but geometry edits disabled
  - `static`: pure information layer, no edit controls/markers
- Allow optional per-feature override when needed, but apply precedence:
  - feature override > layer policy > global defaults
- Safety rule: lock wins (a readonly/static layer cannot be made editable by per-feature override).

### Draft Panel Policy

- Add layer panel visibility intent:
  - `panel: "visible" | "hidden"`
- Supports use cases like hazard/info overlays that should exist on map but not appear in operator layer panel.

### Draft Metadata Channel

- Add metadata bag at layer and/or feature level:
  - `metadata: Record<string, unknown>`
- Intended for domain data (e.g. erosion risk class, source ID, confidence, timestamps) without polluting core geometry APIs.

### Draft Scope for Part II

- Define/lock TypeScript interfaces first.
- Define behavior rules and conflict resolution in docs before implementation.
- Add focused tests for readonly/static/panel-hidden semantics once interfaces are finalized.

## Part II.b - Layer Public API (Draft, naming-first)

### Goal

- Provide an intentionally ergonomic API for layer-driven workflows (hazard maps, overlay catalogs, editable-vs-info separation).
- Keep this as a proposal set first; we can trim/rename after usage review.

### Read / Query

- `getAllLayers(): LayerState[]`
- `getLayerById(layerId: string): LayerState | undefined`
- `hasLayer(layerId: string): boolean`
- `getActiveLayer(): LayerState | undefined`
- `getActiveLayerId(): string`
- `getLayerForFeatureGroup(featureGroup: L.FeatureGroup): string | undefined`
- `getFeatureGroupsByLayer(layerId: string): L.FeatureGroup[]`

### Create / Upsert / Delete

- `createLayer(input: CreateLayerInput): LayerState`
- `ensureLayer(input: EnsureLayerInput): LayerState` (idempotent upsert-style)
- `updateLayer(layerId: string, patch: UpdateLayerInput): LayerState | undefined`
- `deleteLayer(layerId: string, options?: DeleteLayerOptions): DeleteLayerResult`
- `clearLayers(options?: ClearLayersOptions): void`

### Activation / Visibility / Order

- `setActiveLayer(layerId: string): boolean`
- `showLayer(layerId: string): boolean`
- `hideLayer(layerId: string): boolean`
- `setLayerVisibility(layerId: string, visible: boolean): boolean`
- `reorderLayer(layerId: string, targetLayerId: string): boolean`
- `moveLayerToIndex(layerId: string, index: number): boolean`
- `setLayerOrder(layerIds: string[]): boolean`

### Styling / Policy / Metadata

- `setLayerColor(layerId: string, color: string): boolean`
- `setLayerInteraction(layerId: string, interaction: 'editable' | 'readonly' | 'static'): boolean`
- `setLayerPanelVisibility(layerId: string, panel: 'visible' | 'hidden'): boolean`
- `setLayerMetadata(layerId: string, metadata: Record<string, unknown>): boolean`
- `patchLayerMetadata(layerId: string, metadataPatch: Record<string, unknown>): boolean`

### Feature Assignment Helpers

- `assignFeatureGroupToLayer(featureGroup: L.FeatureGroup, layerId: string): void`
- `moveFeatureGroupToLayer(featureGroup: L.FeatureGroup, layerId: string): void`
- `removeFeatureGroupFromLayer(featureGroup: L.FeatureGroup): void`

### Optional Transaction / Batch Helpers

- `batchUpdateLayers(fn: (api: LayerBatchApi) => void): void` (single refresh/event flush)
- `suspendLayerEvents<T>(fn: () => T): T` (advanced, optional)

### Event Surface (if exposed publicly)

- `onLayerCreated`
- `onLayerUpdated`
- `onLayerDeleted`
- `onLayerActivated`
- `onLayerVisibilityChanged`
- `onLayerOrderChanged`

### Notes

- Current `getLayerManager()` can remain for advanced users in v2, but high-level methods above should cover common usage.
- Prefer small DTOs (`CreateLayerInput`, `UpdateLayerInput`, etc.) over many positional args.
- Keep backwards compatibility for simple `layer: 'id'` and `{ layer: { id, color } }` inputs in predefined polygon APIs.

## Part II.c - Execution Plan (Proposed)

### Phase 1 - Contract Freeze (Types + Rules)

- Finalize and document:
  - layer interaction policy: `editable | readonly | static`
  - panel policy: `visible | hidden`
  - metadata shape: `Record<string, unknown>` at layer and feature level
- Define precedence and conflict rules:
  - feature override > layer policy > global defaults
  - lock wins: readonly/static cannot be elevated to editable by a weaker override
- Add migration behavior for legacy input forms where needed.

Exit criteria:
- TypeScript interfaces are finalized and reviewed.
- Behavior rules are written in docs comments and `PLAN.md`.

### Phase 2 - Input Normalization for Predefined APIs

- Add a single internal normalizer for predefined input:
  - accepts `layer: 'id'`
  - accepts `layer: { id, color }`
  - accepts extended `layer` descriptor (`interaction`, `panel`, `metadata`, etc.)
- Keep all existing calls working without behavior regressions.

Exit criteria:
- Existing predefined tests pass unchanged.
- New tests verify backward-compatible parsing.

### Phase 3 - Layer Policy Plumbing

- Extend layer state with:
  - `interaction`
  - `panel`
  - `metadata`
- Enforce layer policies in mutation/interaction managers:
  - `readonly`: no geometry mutation
  - `static`: no geometry mutation and no edit handles/markers
- Keep info/selection behaviors explicit and documented.

Exit criteria:
- Inactive + readonly/static behavior is deterministic across mouse/touch paths.
- No unguarded mutation path can bypass policy checks.

### Phase 4 - Panel Visibility + Ordering Behavior

- Respect `panel: hidden` in layer panel rendering.
- Ensure hidden-panel layers still participate in map rendering and z-order rules.
- Keep reorder behavior consistent between visible panel rows and full map feature-group order.

Exit criteria:
- Panel order and map order remain in sync.
- Hidden-panel layers do not create panel/UI inconsistency.

### Phase 5 - Metadata Persistence + Lifecycle

- Persist metadata through:
  - add predefined
  - clone
  - undo/redo
  - merge/split (with explicit merge strategy)
- Add helper accessors/setters for layer and feature metadata.

Exit criteria:
- Snapshot/restore includes metadata deterministically.
- Merge/split metadata behavior is documented and tested.

### Phase 6 - Public API Surface

- Add high-level `Polydraw` methods for common layer workflows:
  - read/query
  - create/update/delete
  - activation/visibility/order
  - metadata/policy updates
- Keep `getLayerManager()` for advanced workflows.

Exit criteria:
- API methods are typed, documented, and covered by focused unit tests.

### Phase 7 - QA + Docs Gate

- Unit coverage for:
  - policy enforcement
  - metadata persistence
  - panel hidden behavior
  - compatibility of legacy and v2 input shapes
- Matrix validation:
  - `npm run test:leaflet:matrix`
  - `npm run test:playwright:matrix` (targeted scenarios at minimum)
- Update changelog and migration notes.

Exit criteria:
- Green matrix tests and migration notes complete.
- No unresolved high-severity issues in review pass.
