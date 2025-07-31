# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
