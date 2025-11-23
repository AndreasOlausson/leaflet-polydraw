# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [next version]

### Added

- Visual optimization support for predefined polygons: `visualOptimizationLevel` now feeds a simplification pass so you can hide nonessential elbows while keeping geometry intact.
- Marker info popups honor the `markerInfoIcon` config toggles (`showArea`, `showPerimeter`, labels, metric/imperial switch).
- Kink handling for polygon merges: self-intersecting polygons are split/merged correctly without forcing the user to toggle `kinks`.
- Playwright end-to-end suite replaces the old Cypress harness and now runs as part of the repo (first tests live under `test/playwright`).
- Visual optimization toggle button now ships with dedicated show/hide icons and state-aware tooltips, so the menu immediately reflects whether extra elbows are currently visible.
- Added automatic AI-powered pull request reviews using ChatGPT (gpt-5.1) to improve code quality and provide consistent feedback.

### Changed

- `markers.visualOptimization` now exposes `toleranceMin`, `toleranceMax`, and `curve` to tune the level-to-tolerance mapping (legacy fields remain for backward compatibility but are ignored).
- Documentation updates for polygon creation methods, deprecated config blocks, and simplification behavior.
- Tracer styling obeys the configured colors, so draw mode renders green polylines and subtract mode renders red (matching user expectations).
- Reporting location unit toggles and labels now honor the config across the demo and plugin, avoiding misleading UI text.

### Fixed

- Missing runtime usage for `showArea`, `showPerimeter`, `areaLabel`, and `perimeterLabel` has been wired up so toggles take effect.
- Bounding-box midpoint markers for predefined bounding boxes now respect the config (`boundingBox.addMidPointMarkers`).
- Removed metadata from all SVG icons to reduce file size and ensure clean, editor-neutral assets.

## [1.1.2] - 2025-11-06

### Added

- Playwright end-to-end harness under `test/playwright`, replacing the legacy Cypress setup.

### Fixed

- Polygons now rotate/scale reliably on touch (Leaflet 1.9 & 2.x); buttons stay responsive.
- Removed noisy console output from the demo and plugin.

## [1.1.1] - 2025-11-06

### Fixed

- **P2P touch input**: Prevented duplicate vertices by ignoring simulated pointer+touch double delivery when drawing on touch devices.
- **Immediate undo tap**: Added a brief post-creation guard so the delete marker no longer removes a polygon right after it is closed.
- **General touch handling**: Smoothed pointer/touch interplay so double-taps no longer leave stray first taps behind.

### Changed

- **P2P closing gesture**: Double-clicks (or double-taps) that finish a point-to-point polygon now stop propagating, so the map no longer zooms while closing the ring.

## [1.1.0] - 2025-11-04

### Added

- **Config deepmerging** Use deep merge to allow partial config settings
- **Expose default config** Change config from json file to TS object to enforce typing and expose default config to users
- **Default drawMode** User can configure the default draw mode
- **GeoJSON Support**: New `addPredefinedGeoJSONs()` method for loading polygons from standard GeoJSON format
  - Supports `Feature<Polygon>` and `Feature<MultiPolygon>` types
  - Automatically converts GeoJSON `[lng, lat]` to Leaflet `[lat, lng]` format
  - Preserves polygon holes (inner rings)
  - Includes comprehensive test coverage (50+ tests)
- **Scale and Rotate**: New transform actions accessible from the polygon menu

### Changed

- **Icon placement**: Minor adjustments to the placement/alignment of toolbar and menu icons

## [1.0.0] - 2025-10-23

_(First dual-version release with Leaflet 1.x and 2.x compatibility)_

### Added

- **Leaflet v2 Compatibility**: Full support for both Leaflet v1.x and v2.x with automatic version detection and adapter pattern
- **Coordinate Auto-Detection**: Smart coordinate format detection for predefined polygons supporting multiple formats (lat/lng, latitude/longitude, DMS, DDM, N/E format, UTM, MGRS, Plus Codes)
- **Touch-Friendly P2P Drawing**: Enhanced point-to-point drawing for touch devices with increased tolerance and double-tap closing
- **Pointer Events Support**: Full pointer events support for Leaflet v2 compatibility
- **Comprehensive Test Suite**: Complete rewrite of test suite with feature-based organization and 200+ tests covering all major functionality

### Fixed

- **Touch Device P2P**: Resolved "nearly impossible to close the ring by clicking the startnode" issue on touch devices
- **Map Dragging Conflicts**: Fixed polygon dragging interfering with map dragging in Leaflet v2
- **Event Handling**: Improved event handling across different Leaflet versions and device types
- **Build Warnings**: Resolved all TypeScript compilation warnings and build issues

### Changed

- **API Enhancement**: `addPredefinedPolygon()` now accepts flexible `unknown[][][]` input with automatic coordinate conversion
- **Default Coordinate Format**: GeoJSON order (lng, lat) as default for ambiguous numeric coordinate pairs
- **Test Architecture**: Complete test suite reorganization with `test/unit` and `test/cypress` structure
- **Version Detection**: Automatic Leaflet version detection with adapter pattern for seamless compatibility

### Enhanced

- **P2P Touch Experience**: 5x increased tolerance for closing polygons on touch devices
- **Double-Tap Support**: Double-tap anywhere to close P2P polygons on touch devices
- **Coordinate Format Support**: Added support for Degrees Minutes Seconds (DMS), Degrees Decimal Minutes (DDM), and various coordinate systems
- **Error Handling**: Improved error messages for unsupported coordinate formats with helpful guidance

---

# ## [0.9.6] - 2025-10-04

### Improved

- **Demo Enhancements**: Refined demo layout and examples for clarity and visual consistency.
- **UI Polish**: Minor improvements to styling and interactivity in demo environment.

## [0.9.5] - 2025-09-12

### Added

- **"Intelligent" Merging System**: Implemented "smart" polygon merging that only merges polygons when they actually intersect, preventing unwanted merging behavior
- **Comprehensive Test Suite**: Added extensive unit tests (mix of manual and AI-generated) covering all major functionality with ~80% code coverage, though with varying quality
- **Mock Factory (in progress)**: Initial implementation of centralized mock factory; work still ongoing
- **Cypress E2E Testing**: Initial setup of Cypress end-to-end testing framework; actual tests still to be implemented

### Fixed

- **Critical Bug**: Fixed missing markers when drawing polygons inside holes (donut polygons) - a major usability issue
- **Coordinate Normalization**: Implemented robust coordinate handling for complex nested polygon structures with holes
- **Map Container Coordinates**: Fixed relative coordinate calculations for proper positioning Thanks to @hlozancic for the original fix!
- **Polygon Inside Polygon**: Resolved complex scenarios involving multiple nested polygons
- **Merge Conflicts**: Fixed polygon merging issues that occurred with polygons drawn inside holes
- **Test Stability**: Resolved all failing tests and improved test reliability

### Changed

- **Architecture Refactor**: Major refactoring to use manager pattern for better separation of concerns
- **TypeScript Strict Mode**: Enhanced type safety with strict TypeScript configuration
- **Code Organization**: Moved unit tests to dedicated `test/unit` directory structure
- **Dependency Management**: Centralized constants and removed ~10 Turf.js dependencies, reducing bundle size and improving performance
- **ESLint Configuration**: Updated linting rules and fixed all linting issues

### Enhanced

- **Hole Detection**: Advanced algorithm to detect when polygons are drawn inside existing holes
- **Coordinate Processing**: Improved handling of complex MultiPolygon and nested coordinate structures

### Security

- **Dependency Updates**: Updated dependencies to address security vulnerabilities
- **Input Validation**: Enhanced validation of polygon coordinates and user inputs

## [0.9.4] - 2025-08-21

### Added

- Implemented several visual feedback features for polygon dragging, including `opacity`, `markerBehavior` (hide/fade), and `hideMarkersOnDrag` for subtract mode.
- Added a "Roadmap & Future Improvements" section to the README.
- Installed Cypress for end-to-end testing (initial setup without tests).

### Changed

- Refactored edge deletion logic to use the `minVertices` property from `config.json` instead of a hardcoded value.
- **Breaking**: Enabled TypeScript strict mode for improved type safety and code quality.
- General code cleanup and optimization.

### Fixed

- Fixed all failing tests that arose from the configuration cleanup.
- Resolved all TypeScript `@typescript-eslint/no-explicit-any` warnings through strategic use of eslint-disable comments and proper typing.

### Removed

- Removed numerous unused properties from `config.json` and the `PolydrawConfig` interface to clean up the configuration.

## [0.9.3] - 2025-08-10

### Fixed

- Corrected a minor typo in the README.md file.

## [0.9.2] - 2025-08-10

### Fixed

- Fixed a bug where deleting a marker (vertex) inside a hole did not work correctly.
- Fixed an issue where the "subtract drag" modifier key was hardcoded and did not respect the configuration file.

### Changed

- Updated most of the codebase to improve TypeScript typing, removing `any` where possible.
- The configuration for the edge deletion modifier key is now consistent with the "subtract drag" modifier, using a platform-specific object.

## [0.9.1] - 2025-08-01

### Fixed

- Resolved a browser warning by marking the `touchstart` event listener as passive, improving performance on touch devices.
- Corrected the positioning of `menuMarker` and `infoMarker` popups on touch devices to ensure they consistently open at the polygon's center of mass.

## [0.9.0] - 2025-07-31

### Added

- Menu and info popups now use native Leaflet `L.Popup` for correct behavior and positioning
- `eventManager` is now used to emit menu actions cleanly from UI buttons

### Fixed

- Popups now close when polygon is deleted (via trash icon or erase-all button)
- Improved popup handling on touch devices (e.g. iOS) with consistent `pointerEvents`
- General touch support improved for mobile and tablet devices

### Changed

- Menu popup logic refactored for maintainability
- Info popup converted to consistent Leaflet popup rendering

## [0.8.10] - 2025-07-31

### Fixed

- **Test Suite**: Repaired the entire test suite after a major touch support refactoring. This involved mocking `isTouchDevice` to ensure consistent behavior in the JSDOM environment and fixing incomplete Leaflet mocks.

## [0.8.9] - 2025-07-31

### Added

- **Touch Support**: Implemented comprehensive touch support for drawing and interacting with polygons on mobile devices.

### Fixed

- **Click Events**: Refactored click events to accommodate both mouse and touch interactions, resolving inconsistencies between platforms.

## [0.8.8] – 2025-07-28

### Fixed

- **Mobile Touch Behavior**: Prevents unintended scroll and pull-to-refresh on mobile devices during drawing operations. All relevant touch events now use `passive: false` and properly call `preventDefault()`.

## [0.8.7] – 2025-07-28

### Enhanced

- **Point-to-Point Drawing**: Now supports marker dragging and deletion, mirroring the behavior of regular polygon editing for a consistent user experience.
- **Visual Feedback**: Point-to-point markers now provide visual feedback (turning red and scaling up) when hovered over with the modifier key held down, indicating that they can be deleted.

### Fixed

- **Configuration**: Point-to-point drawing now respects the `dragElbow` and `edgeDeletion` settings from `config.json`.
- **Start Point Deletion**: Resolved an issue where deleting the starting marker in point-to-point drawing would prevent the polygon from being closed. The special properties of the starting marker are now correctly transferred to the new starting marker.

## [0.8.6] – 2025-07-28

### Added

- **Menu Operations Configuration**: New `menuOperations` configuration section allowing control over hole processing for menu operations
  - `simplify.processHoles`: Configure whether simplify operation processes holes (default: true)
  - `doubleElbows.processHoles`: Configure whether double elbows operation processes holes (default: true)
  - `bbox.processHoles`: Configure whether bounding box operation processes holes or ignores them (default: true)
- **Alpha Banner**: Added diagonal "ALPHA" banner to bezier button in menu popup to indicate experimental status

### Enhanced

- **Bounding Box Operation**: Now supports configurable hole processing - can either create rectangular holes or ignore them completely
- **Simplify Operation**: Enhanced to respect the `processHoles` configuration for consistent behavior
- **Double Elbows Operation**: Enhanced to respect the `processHoles` configuration for consistent behavior

### Fixed

- **Hole Preservation**: Fixed issue where holes were deleted during simplify operations when `processHoles` was enabled
- **Menu Operations**: All menu operations now properly handle complete polygon data including holes

### Documentation

- Updated README with comprehensive `menuOperations` configuration documentation
- Added configuration examples and usage patterns for hole processing control

## [0.8.5] – 2025-07-27

### Initial

- First official npm release 🎉
