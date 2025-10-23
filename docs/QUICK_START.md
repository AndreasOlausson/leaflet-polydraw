# Quick Start

## Basic Usage

```javascript
import * as L from "leaflet";
import Polydraw from "leaflet-polydraw";

// Create your map
const map = L.map("map").setView([58.402514, 15.606188], 10);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Add the PolyDraw control (includes all drawing buttons)
const polydraw = new Polydraw();
polydraw.addTo(map);

// Optionally add some predefined polygons
const octagon = [
  [
    [
      L.latLng(58.404493, 15.6),
      L.latLng(58.402928, 15.602928),
      L.latLng(58.4, 15.604493),
      L.latLng(58.397072, 15.602928),
      L.latLng(58.395507, 15.6),
      L.latLng(58.397072, 15.597072),
      L.latLng(58.4, 15.595507),
      L.latLng(58.402928, 15.597072),
      L.latLng(58.404493, 15.6),
    ],
  ],
];

polydraw.addPredefinedPolygon(octagon);
```

## Advanced Configuration

```javascript
import Polydraw from "leaflet-polydraw";

const polyDrawControl = L.control
  .polydraw({
    position: "topright",
    config: {
      mergePolygons: true,
      modes: {
        dragPolygons: true,
        attachElbow: true,
        dragElbow: true,
      },
      dragPolygons: {
        markerBehavior: "hide",
      },
      markers: {
        deleteMarker: true,
        infoMarker: true,
        menuMarker: true,
        markerDeleteIcon: {
          position: 5, // North
        },
        markerInfoIcon: {
          position: 4, // NorthEast
          useMetrics: true,
        },
      },
      polygonOptions: {
        color: "#ff0000",
        fillColor: "#ff0000",
        fillOpacity: 0.3,
      },
    },
  })
  .addTo(map);
```
