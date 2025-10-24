# Roadmap & Future Improvements

This document lists planned and potential improvements for upcoming versions of **Leaflet.Polydraw**.  
There is no strict priority order — features and fixes are developed based on stability, feedback, and community interest.  
Contributions, ideas, and discussions are always welcome.

## Core Fixes & Improvements

- **Bezier Curve Refinement**: Improve the bezier curve algorithm for more intuitive and natural shapes.
- **Simplification Algorithm Review**: Make polygon simplification less aggressive and more predictable.
- **Visual Optimization for Complex Polygons**: Smartly hide or cluster markers on dense shapes to reduce clutter while retaining editability.
- **Cypress E2E Tests**: Add full end-to-end coverage for interactive drawing and regression validation.
- **Improved Unit Tests**: Expand test coverage and reliability across core modules.

## Planned New Features

- **Undo / Redo History**: Add undo and redo support for all major editing actions.
- **p2pSubtract Mode**: Introduce a dedicated point-to-point subtraction mode for fine-grained shape removal.
- **Magnetic Trace / Auto-Follow Edges**: Allow drawing that automatically snaps and follows existing polygon edges for seamless alignment.
- **Polygon Splitting Tool**: Enable splitting polygons by drawing a cross-cutting line.
- **Measurement Tool**: Add an optional measuring tool for temporary distance and area visualization.
- **Multi-Select Editing**: Enable batch selection and transformation of multiple polygons.
- **Partial Config / Deep Merge Support**: Allow overriding only parts of the config object, using deep-merge logic instead of shallow merge.
- **Default Draw Mode Option**: Allow choosing the default draw mode at initialization, with optional non-collapsible menu.

## Experimental & Long-Term Ideas

- **Geo-Data Format Helpers**: Add import/export utilities for GeoJSON, WKT, and KML.
- **Topological Operations**: Provide advanced GIS operations like intersection, difference, and buffering.
- **Theming & Customization**: Expand the configuration to support complete UI theming.
- **Extensible Menu System**: Allow developers to add custom menu items or contextual actions.
- **Vertex Snapping**: Add snapping to grid, vertices, or nearby geometries.
