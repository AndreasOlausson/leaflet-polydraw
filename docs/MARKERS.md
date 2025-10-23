# Markers

[![Marker Positions](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/marker-positions.png)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/marker-positions.png)

## Delete Marker (Default: North)

- **Purpose**: Delete the entire polygon
- **Icon**: Trash/delete icon
- **Behavior**: Fades during drag operations

## Info Marker (Default: East)

- **Purpose**: Display polygon metrics
- **Features**: Area, perimeter, metric/imperial units
- **Popup**: Shows detailed measurements

[![Info Marker Popup](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/info-marker-popup.png)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/info-marker-popup.png)

## Menu Marker (Default: West)

- **Purpose**: Access advanced polygon editing operations
- **Popup**: Interactive operation menu with the following tools:
  - **Simplify**: Reduce polygon complexity by removing unnecessary vertices using Douglas-Peucker algorithm
  - **Double Elbows**: Add intermediate vertices between existing points for higher resolution editing
  - **Bounding Box**: Convert polygon to its rectangular bounding box
  - **Bezier**: Apply smooth curve interpolation to polygon edges _(alpha feature)_

[![Menu Marker Popup](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/menu-marker-popup.png)](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/menu-marker-popup.png)

## Marker Positioning

Customize marker positions using the `MarkerPosition` enum:

```javascript
const polyDrawControl = L.control.polydraw({
  config: {
    markers: {
      markerDeleteIcon: {
        position: MarkerPosition.North,
        styleClasses: ["custom-delete-marker"],
      },
      markerInfoIcon: {
        position: MarkerPosition.East,
        useMetrics: true,
        areaLabel: "Area",
        perimeterLabel: "Perimeter",
      },
      markerMenuIcon: {
        position: MarkerPosition.West,
        styleClasses: ["custom-menu-marker"],
      },
    },
  },
});
```

This configuration gives this result.

![Marker Positions](https://raw.githubusercontent.com/AndreasOlausson/leaflet-polydraw/main/Leaflet.Polydraw/docs/images/star.png)

```javascript
MarkerPosition {
    SouthWest = 0,
    South = 1,
    SouthEast = 2,
    East = 3,
    NorthEast = 4,
    North = 5,
    NorthWest = 6,
    West = 7
}
```
