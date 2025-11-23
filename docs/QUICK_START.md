# Quick Start

## Basic Usage

```typescript
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

// Or load from GeoJSON format (useful for API data)
const geojsonPolygon = {
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [15.6, 58.404493],
        [15.602928, 58.402928],
        [15.604493, 58.4],
        [15.602928, 58.397072],
        [15.6, 58.395507],
        [15.597072, 58.397072],
        [15.595507, 58.4],
        [15.597072, 58.402928],
        [15.6, 58.404493],
      ],
    ],
  },
  properties: {},
};

await polydraw.addPredefinedGeoJSONs([geojsonPolygon]);
```

## Advanced Configuration

Polydraw can be fully customized using a configuration object.  
For example:

```typescript
import Polydraw from "leaflet-polydraw";

const polyDrawControl = L.control
  .polydraw({
    position: "topright",
    config: {
      // Your custom options here
    },
  })
  .addTo(map);
```

See the [Configuration](https://github.com/AndreasOlausson/leaflet-polydraw/blob/main/docs/CONFIGURATION.md) for a full list of available options.
