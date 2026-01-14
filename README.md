[![Leaflet Polydraw](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/logo.jpg)](https://github.com/AndreasOlausson/leaflet-polydraw)

# Leaflet Polydraw

_A modern Leaflet plugin for intuitive freehand polygon drawing and advanced spatial editing — fully compatible with Leaflet 1.x and 2.x._

**Live Demo**: [https://polydraw.ao-tech.se](https://polydraw.ao-tech.se)

> **Advanced Leaflet plugin for freehand polygon drawing, with smart merging and powerful editing tools**

**Leaflet.Polydraw** lets you draw polygons directly on Leaflet maps in a natural freehand way — click and drag to sketch shapes.  
It also supports point-to-point precision drawing, intelligent polygon merging, drag-and-drop repositioning, and a rich set of editing tools.  
This makes it ideal for GIS platforms, mapping applications, and spatial data workflows.

[![npm](https://img.shields.io/npm/v/leaflet-polydraw)](https://www.npmjs.com/package/leaflet-polydraw)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![CI](https://github.com/AndreasOlausson/leaflet-polydraw/actions/workflows/ci.yml/badge.svg)](https://github.com/AndreasOlausson/leaflet-polydraw/actions/workflows/ci.yml)

---

## Key Features

[![Feature Overview](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/feature-overview.png)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/feature-overview.png)

- **Freehand Drawing**: Draw polygons naturally by sketching directly on the map — click and drag to create shapes in real time.
- **Smart Polygon Merging**: Automatically detects and merges overlapping polygons (including smooth C-to-O shape completion).
- **Drag & Drop Editing**: Intuitive polygon repositioning with intelligent spatial interactions.
- **Advanced Vertex Editing**: Drag vertices, add or remove points, and reshape polygons seamlessly.
- **Scaling & Rotation Handles**: Transform polygons visually using interactive bounding boxes — scale, rotate, or stretch with precision.
- **Undo & Redo History**: Full action history with reversible edits — step backward or forward through vertex moves, shape changes, merges, and freehand strokes.
- **Point-to-Point Mode**: Optional precise vertex-by-vertex drawing for detailed or structured geometry.
- **Hole Support**: Create complex polygons with holes and nested structures effortlessly.
- **Smart Markers**: Adaptive marker placement prevents overlaps and maintains visual clarity.
- **Modifier Shortcuts**: Hold Ctrl or Cmd to toggle erase, subtract, or advanced edit modes for a smooth workflow.
- **Performance Optimized**: Efficient rendering and event handling even for large datasets.
- **GeoJSON Import**: Add Polygon and MultiPolygon features directly from RFC 7946 GeoJSON
- **Coordinate Auto-Detection**: Accepts multiple coordinate formats automatically (lat/lng, DMS, DDM, N/E, etc.).
- **Leaflet 1.x & 2.x Compatible**: Fully compatible with both generations of the Leaflet API.
- **TypeScript Ready**: Includes complete type definitions for modern development workflows.

---

**[Live Demo](https://polydraw.ao-tech.se)** · **[Quick Start](https://github.com/AndreasOlausson/leaflet-polydraw/blob/main/docs/QUICK_START.md)** · **[Full Documentation](https://github.com/AndreasOlausson/leaflet-polydraw/tree/main/docs)**

---

## Documentation

Comprehensive documentation is available in the `/docs` directory:

- [Installation](https://github.com/AndreasOlausson/leaflet-polydraw/blob/main/docs/INSTALLATION.md)
- [Quick Start](https://github.com/AndreasOlausson/leaflet-polydraw/blob/main/docs/QUICK_START.md)
- [Configuration](https://github.com/AndreasOlausson/leaflet-polydraw/blob/main/docs/CONFIGURATION.md)
- [Features](https://github.com/AndreasOlausson/leaflet-polydraw/blob/main/docs/FEATURES.md)
- [API Reference](https://github.com/AndreasOlausson/leaflet-polydraw/blob/main/docs/API.md)
- [Markers](https://github.com/AndreasOlausson/leaflet-polydraw/blob/main/docs/MARKERS.md)
- [Events](https://github.com/AndreasOlausson/leaflet-polydraw/blob/main/docs/EVENTS.md)
- [Coordinate Formats](https://github.com/AndreasOlausson/leaflet-polydraw/blob/main/docs/COORDINATES.md)
- [Demo (Leaflet 1.x / 2.x)](https://github.com/AndreasOlausson/leaflet-polydraw/blob/main/docs/DEMO.md)
- [General (Browser Support, License, Acknowledgments)](https://github.com/AndreasOlausson/leaflet-polydraw/blob/main/docs/GENERAL.md)
- [Roadmap](https://github.com/AndreasOlausson/leaflet-polydraw/blob/main/docs/ROADMAP.md)
