// Normalized screen-space polygons for freehand drawing (0-1 coordinates).
export const polys = {
  square: [
    [0.3, 0.3],
    [0.5, 0.3],
    [0.5, 0.5],
    [0.3, 0.5],
    [0.3, 0.3],
  ] as [number, number][],
  smallSquare: [
    [0.35, 0.35],
    [0.42, 0.35],
    [0.42, 0.42],
    [0.35, 0.42],
    [0.35, 0.35],
  ] as [number, number][],
  bigSquare: [
    [0.2, 0.2],
    [0.7, 0.2],
    [0.7, 0.7],
    [0.2, 0.7],
    [0.2, 0.2],
  ] as [number, number][],
  overlapA: [
    [0.3, 0.3],
    [0.55, 0.3],
    [0.55, 0.55],
    [0.3, 0.55],
    [0.3, 0.3],
  ] as [number, number][],
  overlapB: [
    [0.45, 0.45],
    [0.7, 0.45],
    [0.7, 0.7],
    [0.45, 0.7],
    [0.45, 0.45],
  ] as [number, number][],
};

// Lat/Lng polygons for addPredefinedPolygon
export const latlngPolys = {
  square: [
    { lat: 58.404, lng: 15.595 },
    { lat: 58.404, lng: 15.605 },
    { lat: 58.398, lng: 15.605 },
    { lat: 58.398, lng: 15.595 },
    { lat: 58.404, lng: 15.595 },
  ],
  smallSquare: [
    { lat: 58.41, lng: 15.62 },
    { lat: 58.41, lng: 15.625 },
    { lat: 58.406, lng: 15.625 },
    { lat: 58.406, lng: 15.62 },
    { lat: 58.41, lng: 15.62 },
  ],
  bigSquare: [
    { lat: 58.406, lng: 15.593 },
    { lat: 58.406, lng: 15.607 },
    { lat: 58.396, lng: 15.607 },
    { lat: 58.396, lng: 15.593 },
    { lat: 58.406, lng: 15.593 },
  ],
  overlapA: [
    { lat: 58.404, lng: 15.595 },
    { lat: 58.404, lng: 15.605 },
    { lat: 58.398, lng: 15.605 },
    { lat: 58.398, lng: 15.595 },
    { lat: 58.404, lng: 15.595 },
  ],
  overlapB: [
    { lat: 58.402, lng: 15.598 },
    { lat: 58.402, lng: 15.608 },
    { lat: 58.396, lng: 15.608 },
    { lat: 58.396, lng: 15.598 },
    { lat: 58.402, lng: 15.598 },
  ],
  bigSquareDense: [
    { lat: 58.406, lng: 15.593 },
    { lat: 58.406, lng: 15.596 },
    { lat: 58.406, lng: 15.599 },
    { lat: 58.406, lng: 15.602 },
    { lat: 58.406, lng: 15.605 },
    { lat: 58.406, lng: 15.607 },
    { lat: 58.401, lng: 15.607 },
    { lat: 58.396, lng: 15.607 },
    { lat: 58.396, lng: 15.605 },
    { lat: 58.396, lng: 15.602 },
    { lat: 58.396, lng: 15.599 },
    { lat: 58.396, lng: 15.596 },
    { lat: 58.396, lng: 15.593 },
    { lat: 58.401, lng: 15.593 },
    { lat: 58.406, lng: 15.593 },
  ],
};
