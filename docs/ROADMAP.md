# Roadmap & Future Improvements

This document lists planned and potential improvements for upcoming versions of **Leaflet.Polydraw**.  
There is no strict priority order — features and fixes are developed based on stability, feedback, and community interest.  
Contributions, ideas, and discussions are always welcome.

## Core Fixes & Improvements
- **Playwright E2E Tests**: Add full end-to-end coverage for interactive drawing and regression validation.
- **Improved Unit Tests**: Expand test coverage and reliability across core modules.

## Planned New Features

- **Magnetic Trace / Auto-Follow Edges**: Allow drawing that automatically snaps and follows existing polygon edges for seamless alignment.
- **Polygon Splitting Tool**: Enable splitting polygons by drawing a cross-cutting line.
- **Measurement Tool**: Add an optional measuring tool for temporary distance and area visualization.
- **Multi-Select Editing**: Enable batch selection and transformation of multiple polygons.
- **Additional Polygon Metadata**: Store extra, non-optimization props per polygon (custom info-popup text, custom color, tags, etc.).
- **Layered Polygon Sets**: Support multiple independent layers so overlapping polygons in different layers do not merge or affect each other.

## Experimental & Long-Term Ideas

- **Geo-Data Format Helpers**: Add import/export utilities for GeoJSON, WKT, and KML.
- **Topological Operations**: Provide advanced GIS operations like intersection, difference, and buffering.
- **Theming & Customization**: Expand the configuration to support complete UI theming.
- **Extensible Menu System**: Allow developers to add custom menu items or contextual actions.
- **Vertex Snapping**: Add snapping to grid, vertices, or nearby geometries.
