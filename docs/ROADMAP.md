# Roadmap & Future Improvements

This document lists planned and potential improvements for upcoming versions of **Leaflet.Polydraw**.  
There is no strict priority order — features and fixes are developed based on stability, feedback, and community interest.  
Contributions, ideas, and discussions are always welcome.

## Core Fixes & Improvements
- **Playwright E2E Tests**: Expand end-to-end coverage for additional interactive edge cases and regression validation.
- **Improved Unit Tests**: Continue expanding coverage and reliability across core modules.

## Recently Completed in 2.0

- **Additional Polygon Metadata**: Store and update per-feature metadata through import options and public APIs.
- **Layered Polygon Sets**: Organize polygons into layers with visibility, ordering, color, interaction policy, panel state, and metadata.
- **Extensible Menu System**: Add custom polygon menu actions through `polygonTools.menuActions`.

## Planned for 2.1

- **Multiple Draw Layers**: Create independent editable drawing targets with deterministic colors, visibility, ordering, naming, and per-layer styling.
- **Layer Workflows**: Move individual polygons or merge complete draw/reference layers into a draw layer with optional target-style adoption and undo/redo support.
- **Layer-Aware Polygon UI**: Show layer context and geometry metadata in polygon panels while keeping automatic polygon merges isolated to their assigned layer.
- **Polygon Color Action**: Change feature fill color and opacity with live preview and configurable merge behavior.

## Planned New Features

- **Custom Toolbox Tools**: Add a public API for registering application-specific toolbar tools with their own icon, activation lifecycle, map pointer handlers, feature handlers, cursor state, history integration, and optional exclusive-mode behavior.
- **Freehand Drawing Preview**: Explore an optional live drawing preview that stays stable during tracing and does not misrepresent the final topology-cleaned polygon, especially for self-intersecting traces.
- **Magnetic Trace / Auto-Follow Edges**: Allow drawing that automatically snaps and follows existing polygon edges for seamless alignment.
- **Polygon Splitting Tool**: Enable splitting polygons by drawing a cross-cutting line.
- **Measurement Tool**: Add an optional measuring tool for temporary distance and area visualization.
- **Multi-Select Editing**: Enable batch selection and transformation of multiple polygons.

## Experimental & Long-Term Ideas

- **Geo-Data Format Helpers**: Add import/export utilities for GeoJSON, WKT, and KML.
- **Topological Operations**: Provide advanced GIS operations like intersection, difference, and buffering.
- **Theming & Customization**: Expand the configuration to support complete UI theming.
- **Vertex Snapping**: Add snapping to grid, vertices, or nearby geometries.
