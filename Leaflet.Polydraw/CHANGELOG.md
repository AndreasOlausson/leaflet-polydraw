# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
