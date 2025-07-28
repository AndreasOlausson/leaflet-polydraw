# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
