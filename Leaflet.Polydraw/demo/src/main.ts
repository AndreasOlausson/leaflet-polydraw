import 'leaflet/dist/leaflet.css';
import 'leaflet-polydraw/dist/leaflet-polydraw.css';
import * as L from 'leaflet';
import Polydraw from 'leaflet-polydraw';
import { leafletAdapter } from 'leaflet-polydraw';
import './version-test';

declare global {
  interface Window {
    polydrawControl?: Polydraw;
  }
}

// coords for a octagon shaped polygon
const octagon: L.LatLng[][][] = [
  [
    [
      leafletAdapter.createLatLng(58.404493, 15.6),
      leafletAdapter.createLatLng(58.402928, 15.602928),
      leafletAdapter.createLatLng(58.4, 15.604493),
      leafletAdapter.createLatLng(58.397072, 15.602928),
      leafletAdapter.createLatLng(58.395507, 15.6),
      leafletAdapter.createLatLng(58.397072, 15.597072),
      leafletAdapter.createLatLng(58.4, 15.595507),
      leafletAdapter.createLatLng(58.402928, 15.597072),
      leafletAdapter.createLatLng(58.404493, 15.6), // Close the polygon
    ],
  ],
];
const squareWithHole: L.LatLng[][][] = [
  [
    // Yttre fyrkanten (moturs)
    [
      leafletAdapter.createLatLng(58.407, 15.597),
      leafletAdapter.createLatLng(58.407, 15.603),
      leafletAdapter.createLatLng(58.397, 15.603),
      leafletAdapter.createLatLng(58.397, 15.597),
      leafletAdapter.createLatLng(58.407, 15.597),
    ],
    // Inre fyrkanten (medurs, som hål)
    [
      leafletAdapter.createLatLng(58.403, 15.599),
      leafletAdapter.createLatLng(58.403, 15.601),
      leafletAdapter.createLatLng(58.401, 15.601),
      leafletAdapter.createLatLng(58.401, 15.599),
      leafletAdapter.createLatLng(58.403, 15.599),
    ],
  ],
];
const overlappingSquares: L.LatLng[][][] = [
  [
    [
      leafletAdapter.createLatLng(58.405, 15.595),
      leafletAdapter.createLatLng(58.405, 15.6),
      leafletAdapter.createLatLng(58.4, 15.6),
      leafletAdapter.createLatLng(58.4, 15.595),
      leafletAdapter.createLatLng(58.405, 15.595),
    ],
  ],
  [
    [
      leafletAdapter.createLatLng(58.403, 15.598),
      leafletAdapter.createLatLng(58.403, 15.603),
      leafletAdapter.createLatLng(58.398, 15.603),
      leafletAdapter.createLatLng(58.398, 15.598),
      leafletAdapter.createLatLng(58.403, 15.598),
    ],
  ],
];

// Triangle for testing vertex count (should show 3 vertices)
const triangle: L.LatLng[][][] = [
  [
    [
      leafletAdapter.createLatLng(58.41, 15.59),
      leafletAdapter.createLatLng(58.41, 15.595),
      leafletAdapter.createLatLng(58.405, 15.592),
      leafletAdapter.createLatLng(58.41, 15.59), // Closing point
    ],
  ],
];

const multipleSimplePolygons: L.LatLng[][][] = [
  [
    [
      leafletAdapter.createLatLng(59.9112809995347, 10.720321999999998),
      leafletAdapter.createLatLng(59.91171999953472, 10.720544),
      leafletAdapter.createLatLng(59.911641999534716, 10.723379000000001),
      leafletAdapter.createLatLng(59.9117679995347, 10.723480000000002),
      leafletAdapter.createLatLng(59.91184499953473, 10.721888),
      leafletAdapter.createLatLng(59.912069999534715, 10.721374000000003),
      leafletAdapter.createLatLng(59.912262999534725, 10.721598000000002),
      leafletAdapter.createLatLng(59.91213999953472, 10.721990000000002),
      leafletAdapter.createLatLng(59.9123129995347, 10.722227),
      leafletAdapter.createLatLng(59.91215999953473, 10.722759000000002),
      leafletAdapter.createLatLng(59.9118759995347, 10.722396),
      leafletAdapter.createLatLng(59.911786999534705, 10.72365),
      leafletAdapter.createLatLng(59.911580999534706, 10.723459),
      leafletAdapter.createLatLng(59.91165499953472, 10.722184000000002),
      leafletAdapter.createLatLng(59.91113099953468, 10.722066000000002),
      leafletAdapter.createLatLng(59.9112809995347, 10.720321999999998),
    ],
  ],
  [
    [
      leafletAdapter.createLatLng(59.91343499953473, 10.721424999999998),
      leafletAdapter.createLatLng(59.913602999534724, 10.721683),
      leafletAdapter.createLatLng(59.913030999534726, 10.723528000000002),
      leafletAdapter.createLatLng(59.912470999534726, 10.723031),
      leafletAdapter.createLatLng(59.912536999534716, 10.722772000000003),
      leafletAdapter.createLatLng(59.91236699953473, 10.722519000000002),
      leafletAdapter.createLatLng(59.91255299953473, 10.721880999999998),
      leafletAdapter.createLatLng(59.91275899953473, 10.722159999999999),
      leafletAdapter.createLatLng(59.91295899953471, 10.721596),
      leafletAdapter.createLatLng(59.913231999534716, 10.722003),
      leafletAdapter.createLatLng(59.91343499953473, 10.721424999999998),
    ],
  ],
  [
    [
      leafletAdapter.createLatLng(59.914059999534736, 10.722228000000001),
      leafletAdapter.createLatLng(59.91450499953475, 10.723161999999999),
      leafletAdapter.createLatLng(59.91488299953473, 10.722514),
      leafletAdapter.createLatLng(59.91506199953474, 10.722853),
      leafletAdapter.createLatLng(59.91463499953472, 10.723891),
      leafletAdapter.createLatLng(59.91512799953473, 10.724659),
      leafletAdapter.createLatLng(59.91495399953473, 10.725907),
      leafletAdapter.createLatLng(59.91519099953475, 10.726231),
      leafletAdapter.createLatLng(59.915136999534745, 10.726750000000001),
      leafletAdapter.createLatLng(59.91479399953474, 10.727636999999996),
      leafletAdapter.createLatLng(59.914208999534736, 10.726809),
      leafletAdapter.createLatLng(59.91433099953474, 10.726432),
      leafletAdapter.createLatLng(59.91371499953473, 10.725579999999999),
      leafletAdapter.createLatLng(59.913596999534725, 10.725832),
      leafletAdapter.createLatLng(59.913272999534726, 10.725498),
      leafletAdapter.createLatLng(59.91306499953472, 10.725956),
      leafletAdapter.createLatLng(59.912831999534724, 10.725652000000002),
      leafletAdapter.createLatLng(59.913220999534715, 10.724587999999999),
      leafletAdapter.createLatLng(59.91324999953473, 10.723502999999997),
      leafletAdapter.createLatLng(59.91344499953475, 10.723672000000002),
      leafletAdapter.createLatLng(59.914059999534736, 10.722228000000001),
    ],
  ],
];

// Star/compass base
const starBase: L.LatLngLiteral[] = [
  { lat: 58.001914, lng: 15.344043 },
  { lat: 58.006914, lng: 15.348043 },
  { lat: 58.008914, lng: 15.340043 },
  { lat: 58.010914, lng: 15.348043 },
  { lat: 58.014914, lng: 15.344043 },
  { lat: 58.012914, lng: 15.352043 },
  { lat: 58.016914, lng: 15.356043 },
  { lat: 58.012914, lng: 15.360043 },
  { lat: 58.014914, lng: 15.368043 },
  { lat: 58.010914, lng: 15.364043 },
  { lat: 58.008914, lng: 15.372043 },
  { lat: 58.006914, lng: 15.364043 },
  { lat: 58.001914, lng: 15.368043 },
  { lat: 58.003914, lng: 15.360043 },
  { lat: 57.999914, lng: 15.356043 },
  { lat: 58.003914, lng: 15.352043 },
];

const doubleElbow = (ring: L.LatLngLiteral[]): L.LatLngLiteral[] => {
  const result: L.LatLngLiteral[] = [];
  for (let i = 0; i < ring.length; i++) {
    const p1 = ring[i];
    const p2 = ring[(i + 1) % ring.length];
    result.push(p1);
    result.push({
      lat: (p1.lat + p2.lat) / 2,
      lng: (p1.lng + p2.lng) / 2,
    });
  }
  return result;
};

const buildStar = (iterations: number): L.LatLng[][][] => {
  let ring = [...starBase];
  for (let i = 0; i < iterations; i++) {
    ring = doubleElbow(ring);
  }
  // close the ring
  ring.push(ring[0]);
  const closedRing = ring.map((pt) => leafletAdapter.createLatLng(pt.lat, pt.lng));
  if (
    closedRing[0].lat !== closedRing[closedRing.length - 1].lat ||
    closedRing[0].lng !== closedRing[closedRing.length - 1].lng
  ) {
    closedRing.push(closedRing[0]);
  }
  return [[closedRing]];
};

const star16 = buildStar(0); // 16 points + closure
const star1024 = buildStar(6); // 16 * 2^6 = 1024 points + closure

const map = leafletAdapter.createMap('map').setView([58.402514, 15.606188], 10);

leafletAdapter
  .createTileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  })
  .addTo(map);

const polydraw = new Polydraw();
polydraw.addTo(map as any);
window.polydrawControl = polydraw;

// Status box update functionality
function updateStatusBox() {
  const featureGroups = polydraw.getFeatureGroups();
  const countElement = document.getElementById('count-value');
  const structureElement = document.getElementById('structure-value');

  if (!structureElement) return;

  // Explicitly remove the literal "Structure:" label that appears before #structure-value
  try {
    const structureWrapper = document.getElementById('polygon-structure');
    if (structureWrapper) {
      // Remove any text node children that look like the label "Structure:" (case-insensitive)
      Array.from(structureWrapper.childNodes).forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const txt = (node.textContent || '').trim().toLowerCase();
          if (txt === 'structure:' || txt === 'structure') {
            node.textContent = '';
          }
        }
      });
      // Also hide any element children that render the label
      Array.from(structureWrapper.children).forEach((el) => {
        const t = (el.textContent || '').trim().toLowerCase();
        if (t === 'structure:' || t === 'structure') {
          (el as HTMLElement).style.display = 'none';
        }
      });
    }
  } catch (e) {
    console.warn('Failed to remove inline Structure: label', e);
  }

  // Hide legacy outside labels/rows so only the new panel is visible
  try {
    // Hide the row that contains the old count label, if present
    if (countElement && countElement.parentElement) {
      (countElement.parentElement as HTMLElement).style.display = 'none';
    }

    // Find a local container to scope our cleanup (prefer a box wrapping the status rows)
    const container: HTMLElement =
      (structureElement.closest('#status-box') as HTMLElement) ||
      (structureElement.parentElement as HTMLElement) ||
      document.body;

    // Hide any element whose text content looks like a leftover label such as "Structure:" (case-insensitive)
    const hideIfStructureLabel = (el: Element) => {
      const t = (el.textContent || '').trim().toLowerCase();
      if (t === 'structure:' || t === 'structure') {
        (el as HTMLElement).style.display = 'none';
      }
    };

    // Check previous/next siblings of structureElement
    let prev: Element | null = structureElement.previousElementSibling;
    let guard = 0;
    while (prev && guard++ < 10) {
      hideIfStructureLabel(prev);
      prev = (prev as HTMLElement).previousElementSibling;
    }
    let next: Element | null = structureElement.nextElementSibling;
    guard = 0;
    while (next && guard++ < 10) {
      hideIfStructureLabel(next);
      next = (next as HTMLElement).nextElementSibling;
    }

    // Also scan all *direct* children of the local container
    Array.from(container.children).forEach((child) => {
      if (child !== structureElement) hideIfStructureLabel(child);
    });

    // And finally, scan a few descendants near the container, but avoid our own panel by skipping #structure-value subtree
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT);
    let node: Element | null = walker.currentNode as Element;
    let steps = 0;
    while (node && steps++ < 200) {
      if (node !== structureElement && !structureElement.contains(node)) {
        hideIfStructureLabel(node);
      }
      node = walker.nextNode() as Element | null;
    }
  } catch (e) {
    console.warn('Hide legacy labels failed:', e);
  }

  // Build structure representation
  const structure = featureGroups.map((featureGroup) => {
    let polygonStructure: {
      outer: number;
      holes: number[];
      coordinates: any;
      layer?: L.Polygon;
      metrics?: {
        outerPerimeter: number;
        holePerimeters: number[];
        totalPerimeter: number;
        outerOrientation: 'CW' | 'CCW' | 'N/A';
        holeOrientations: ('CW' | 'CCW' | 'N/A')[];
        bounds?: { sw: L.LatLng; ne: L.LatLng };
      };
      wkt?: string;
    } = {
      outer: 0,
      holes: [],
      coordinates: null,
    };

    featureGroup.eachLayer((layer) => {
      if (layer instanceof L.Polygon) {
        const polygon = layer as L.Polygon;
        const latLngs = polygon.getLatLngs();

        // Store raw coordinates for tooltip
        polygonStructure.coordinates = latLngs;
        polygonStructure.layer = polygon;

        // Helper utilities to count vertices accurately whether ring is closed or not
        const isClosedRing = (ring: L.LatLng[]): boolean => {
          if (!Array.isArray(ring) || ring.length < 2) return false;
          const first = ring[0] as L.LatLng;
          const last = ring[ring.length - 1] as L.LatLng;
          // Leaflet's LatLng has an equals method with an optional margin
          if (first && typeof (first as any).equals === 'function') {
            // use a tiny margin to account for floating errors
            return (first as any).equals(last, 1e-9);
          }
          return Math.abs(first.lat - last.lat) < 1e-12 && Math.abs(first.lng - last.lng) < 1e-12;
        };

        const countVertices = (ring: L.LatLng[]): number => {
          if (!Array.isArray(ring)) return 0;
          return ring.length - (isClosedRing(ring) ? 1 : 0);
        };

        // Metric helpers
        const ensureClosed = (ring: L.LatLng[]): L.LatLng[] => {
          if (!ring || ring.length === 0) return ring;
          return isClosedRing(ring) ? ring : [...ring, ring[0]];
        };

        const ringPerimeterMeters = (ring: L.LatLng[]): number => {
          if (!ring || ring.length < 2) return 0;
          const closed = ensureClosed(ring);
          let sum = 0;
          for (let i = 1; i < closed.length; i++) {
            sum += map.distance(closed[i - 1], closed[i]);
          }
          return sum;
        };

        // Signed area (in projected plan units) to infer orientation
        const ringSignedArea = (ring: L.LatLng[]): number => {
          if (!ring || ring.length < 3) return 0;
          const closed = ensureClosed(ring);
          let area = 0;
          const pts = closed.map((ll) => map.project(ll, map.getZoom()));
          for (let i = 1; i < pts.length; i++) {
            const x1 = pts[i - 1].x,
              y1 = pts[i - 1].y;
            const x2 = pts[i].x,
              y2 = pts[i].y;
            area += x1 * y2 - x2 * y1;
          }
          return area / 2;
        };

        const ringOrientation = (ring: L.LatLng[]): 'CW' | 'CCW' | 'N/A' => {
          const a = ringSignedArea(ring);
          if (a === 0) return 'N/A';
          // In pixel space, positive signed area typically indicates CCW
          return a > 0 ? 'CCW' : 'CW';
        };

        // WKT helpers (lng lat order per WKT spec)
        const toWktCoords = (ring: L.LatLng[]): string => {
          const closed = ensureClosed(ring);
          return closed.map((p) => `${p.lng} ${p.lat}`).join(', ');
        };

        const toWktPolygon = (rings: L.LatLng[][]): string => {
          const parts = rings.map((r) => `(${toWktCoords(r)})`).join(', ');
          return `POLYGON (${parts})`;
        };

        const fmtMeters = (m: number): string => {
          if (m < 1) return `${m.toFixed(2)} m`;
          if (m < 1000) return `${m.toFixed(1)} m`;
          return `${(m / 1000).toFixed(2)} km`;
        };

        // Handle different polygon structures based on actual Leaflet structure
        if (Array.isArray(latLngs) && latLngs.length > 0) {
          // Check if this is a nested array structure (multi-ring)
          if (Array.isArray(latLngs[0])) {
            // Check if it's triple nested: [[[ring1], [ring2]]] or double nested: [[ring]]
            if (Array.isArray(latLngs[0][0])) {
              // Triple nested structure: [[[outer], [hole1], [hole2]]]
              const polygonGroup = latLngs[0] as L.LatLng[][];

              if (polygonGroup.length > 0) {
                // First ring is outer ring
                // count actual vertices; subtract trailing duplicate if the ring is closed
                polygonStructure.outer = countVertices(polygonGroup[0] as L.LatLng[]);

                // Remaining rings are holes
                if (polygonGroup.length > 1) {
                  polygonStructure.holes = polygonGroup
                    .slice(1)
                    .map((ring) => countVertices(ring as L.LatLng[]));
                }
              }
              // Compute metrics (perimeters, orientations), bounds and WKT
              try {
                // Normalize to array of rings: [[outer], [hole1], ...]
                let rings: L.LatLng[][] = [];
                if (Array.isArray(latLngs)) {
                  if (Array.isArray(latLngs[0])) {
                    if (Array.isArray((latLngs as any)[0][0])) {
                      rings = (latLngs as any)[0] as L.LatLng[][];
                    } else {
                      rings = latLngs as L.LatLng[][];
                    }
                  } else {
                    rings = [latLngs as L.LatLng[]];
                  }
                }

                const outerRing = rings[0] || [];
                const holeRings = rings.slice(1);

                const outerPerimeter = ringPerimeterMeters(outerRing);
                const holePerimeters = holeRings.map((r) => ringPerimeterMeters(r));
                const totalPerimeter = outerPerimeter + holePerimeters.reduce((a, b) => a + b, 0);

                const outerOrientation = ringOrientation(outerRing);
                const holeOrientations = holeRings.map((r) => ringOrientation(r));

                const bounds = polygon.getBounds();

                polygonStructure.metrics = {
                  outerPerimeter,
                  holePerimeters,
                  totalPerimeter,
                  outerOrientation,
                  holeOrientations,
                  bounds: { sw: bounds.getSouthWest(), ne: bounds.getNorthEast() },
                };

                polygonStructure.wkt = toWktPolygon(rings);
              } catch (e) {
                console.warn('Metric/WKT computation failed:', e);
              }
            } else {
              // Double nested structure: [[outer], [hole1], [hole2]]
              const polygonRings = latLngs as L.LatLng[][];

              if (polygonRings.length > 0) {
                // First ring is outer ring
                // count actual vertices; subtract trailing duplicate if the ring is closed
                polygonStructure.outer = countVertices(polygonRings[0] as L.LatLng[]);

                // Remaining rings are holes
                if (polygonRings.length > 1) {
                  polygonStructure.holes = polygonRings
                    .slice(1)
                    .map((ring) => countVertices(ring as L.LatLng[]));
                }
              }
              // Compute metrics (perimeters, orientations), bounds and WKT
              try {
                // Normalize to array of rings: [[outer], [hole1], ...]
                let rings: L.LatLng[][] = [];
                if (Array.isArray(latLngs)) {
                  if (Array.isArray(latLngs[0])) {
                    if (Array.isArray((latLngs as any)[0][0])) {
                      rings = (latLngs as any)[0] as L.LatLng[][];
                    } else {
                      rings = latLngs as L.LatLng[][];
                    }
                  } else {
                    rings = [latLngs as L.LatLng[]];
                  }
                }

                const outerRing = rings[0] || [];
                const holeRings = rings.slice(1);

                const outerPerimeter = ringPerimeterMeters(outerRing);
                const holePerimeters = holeRings.map((r) => ringPerimeterMeters(r));
                const totalPerimeter = outerPerimeter + holePerimeters.reduce((a, b) => a + b, 0);

                const outerOrientation = ringOrientation(outerRing);
                const holeOrientations = holeRings.map((r) => ringOrientation(r));

                const bounds = polygon.getBounds();

                polygonStructure.metrics = {
                  outerPerimeter,
                  holePerimeters,
                  totalPerimeter,
                  outerOrientation,
                  holeOrientations,
                  bounds: { sw: bounds.getSouthWest(), ne: bounds.getNorthEast() },
                };

                polygonStructure.wkt = toWktPolygon(rings);
              } catch (e) {
                console.warn('Metric/WKT computation failed:', e);
              }
            }
          } else {
            // Simple polygon - single ring - structure: [LatLng, LatLng, LatLng, ...]
            const simpleRing = latLngs as L.LatLng[];
            // count actual vertices; subtract trailing duplicate if the ring is closed
            polygonStructure.outer = countVertices(simpleRing);
            // Compute metrics (perimeters, orientations), bounds and WKT
            try {
              // Normalize to array of rings: [[outer], [hole1], ...]
              let rings: L.LatLng[][] = [];
              if (Array.isArray(latLngs)) {
                if (Array.isArray(latLngs[0])) {
                  if (Array.isArray((latLngs as any)[0][0])) {
                    rings = (latLngs as any)[0] as L.LatLng[][];
                  } else {
                    rings = latLngs as L.LatLng[][];
                  }
                } else {
                  rings = [latLngs as L.LatLng[]];
                }
              }

              const outerRing = rings[0] || [];
              const holeRings = rings.slice(1);

              const outerPerimeter = ringPerimeterMeters(outerRing);
              const holePerimeters = holeRings.map((r) => ringPerimeterMeters(r));
              const totalPerimeter = outerPerimeter + holePerimeters.reduce((a, b) => a + b, 0);

              const outerOrientation = ringOrientation(outerRing);
              const holeOrientations = holeRings.map((r) => ringOrientation(r));

              const bounds = polygon.getBounds();

              polygonStructure.metrics = {
                outerPerimeter,
                holePerimeters,
                totalPerimeter,
                outerOrientation,
                holeOrientations,
                bounds: { sw: bounds.getSouthWest(), ne: bounds.getNorthEast() },
              };

              polygonStructure.wkt = toWktPolygon(rings);
            } catch (e) {
              console.warn('Metric/WKT computation failed:', e);
            }
          }
        }
      }
    });

    return polygonStructure;
  });

  // Format structure with nice indentation and clickable info buttons
  structureElement.innerHTML = ''; // Clear existing content

  // Helper function to format coordinates as clean JSON
  const formatCoordinatesAsJSON = (coords: any): string => {
    if (!coords) return 'No coordinates available';

    // Convert LatLng objects to simple [lat, lng] arrays for cleaner JSON
    const convertLatLngsToArrays = (latLngs: any): any => {
      if (!Array.isArray(latLngs)) return latLngs;

      return latLngs.map((item: any) => {
        if (item && typeof item.lat === 'number' && typeof item.lng === 'number') {
          // This is a LatLng object, convert to [lat, lng]
          return [item.lat, item.lng];
        } else if (Array.isArray(item)) {
          // This is a nested array, recurse
          return convertLatLngsToArrays(item);
        }
        return item;
      });
    };

    const cleanCoords = convertLatLngsToArrays(coords);
    return JSON.stringify(cleanCoords, null, 2);
  };

  // Function to show coordinates in a modal/popup
  const showCoordinatesModal = (coordsData: string, polygonIndex: number) => {
    // Remove existing modal if any
    const existingModal = document.getElementById('coords-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'coords-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.style.zIndex = '10002';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = 'white';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '8px';
    modalContent.style.maxWidth = '80%';
    modalContent.style.maxHeight = '80%';
    modalContent.style.overflow = 'auto';
    modalContent.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';

    // Create header
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '15px';
    header.style.borderBottom = '1px solid #eee';
    header.style.paddingBottom = '10px';

    const title = document.createElement('h3');
    title.textContent = `Polygon ${polygonIndex + 1} Coordinates`;
    title.style.margin = '0';
    title.style.color = '#333';

    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '24px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.color = '#666';
    closeButton.style.padding = '0';
    closeButton.style.width = '30px';
    closeButton.style.height = '30px';

    header.appendChild(title);
    header.appendChild(closeButton);

    // Create content area
    const content = document.createElement('pre');
    content.textContent = coordsData;
    content.style.fontFamily = 'monospace';
    content.style.fontSize = '12px';
    content.style.backgroundColor = '#f5f5f5';
    content.style.padding = '15px';
    content.style.borderRadius = '4px';
    content.style.overflow = 'auto';
    content.style.maxHeight = '400px';
    content.style.margin = '0';
    content.style.whiteSpace = 'pre-wrap';

    modalContent.appendChild(header);
    modalContent.appendChild(content);
    modal.appendChild(modalContent);

    // Close modal handlers
    const closeModal = () => {
      modal.remove();
    };

    closeButton.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Add to document
    document.body.appendChild(modal);
  };

  // Create the structure display with proper formatting
  const structureContainer = document.createElement('div');
  structureContainer.style.fontFamily = 'monospace';
  structureContainer.style.fontSize = '12px';
  structureContainer.style.lineHeight = '1.4';
  structureContainer.style.whiteSpace = 'pre';

  const formatDisplayText = (polygonStructure: (typeof structure)[0]) => {
    const metrics = polygonStructure.metrics;
    if (polygonStructure.holes.length === 0) {
      const perim =
        metrics && metrics.outerPerimeter !== undefined
          ? metrics.outerPerimeter < 1
            ? `${metrics.outerPerimeter.toFixed(2)} m`
            : metrics.outerPerimeter < 1000
              ? `${metrics.outerPerimeter.toFixed(1)} m`
              : `${(metrics.outerPerimeter / 1000).toFixed(2)} km`
          : '—';
      return `[outer: ${polygonStructure.outer} vtx, perim: ${perim}, ${
        metrics ? metrics.outerOrientation : '—'
      }]`;
    }

    const holeText =
      polygonStructure.holes.length === 1
        ? `inner: ${polygonStructure.holes[0]} vtx`
        : `inner: ${polygonStructure.holes.join(', ')} vtx`;
    const perim =
      metrics && metrics.totalPerimeter !== undefined
        ? metrics.totalPerimeter < 1
          ? `${metrics.totalPerimeter.toFixed(2)} m`
          : metrics.totalPerimeter < 1000
            ? `${metrics.totalPerimeter.toFixed(1)} m`
            : `${(metrics.totalPerimeter / 1000).toFixed(2)} km`
        : '—';
    return `[outer: ${polygonStructure.outer} vtx, ${holeText}, total perim: ${perim}]`;
  };

  const createInfoButton = (polygonIndex: number) => {
    const btn = document.createElement('span');
    btn.textContent = '(i)';
    btn.style.color = '#007bff';
    btn.style.cursor = 'pointer';
    btn.style.textDecoration = 'underline';
    btn.style.fontWeight = 'bold';
    btn.style.fontSize = '12px';
    btn.style.marginLeft = '6px';
    btn.title = 'Click to view coordinates';

    btn.addEventListener('click', () => {
      const item = structure[polygonIndex];
      if (!item) {
        console.warn('No polygon data found for index', polygonIndex);
        return;
      }
      const coordsData = formatCoordinatesAsJSON(item.coordinates);
      try {
        const layer = item.layer as L.Polygon | undefined;
        if (layer && typeof (layer as any).setStyle === 'function') {
          const original = (layer as any).options && { ...(layer as any).options };
          (layer as any).setStyle({ weight: 5 });
          setTimeout(() => {
            if (original) (layer as any).setStyle({ weight: original.weight ?? 3 });
          }, 1200);
        }
      } catch (e) {
        console.warn('Highlight failed:', e);
      }
      showCoordinatesModal(coordsData, polygonIndex);
    });

    return btn;
  };

  const appendTextLine = (text: string) => {
    const line = document.createElement('div');
    line.textContent = text;
    structureContainer.appendChild(line);
  };

  const totalPolygons = structure.length;
  const totalVertices = structure.reduce(
    (acc: number, p: (typeof structure)[0]) =>
      acc + p.outer + p.holes.reduce((a: number, b: number) => a + b, 0),
    0,
  );

  structureContainer.innerHTML = '';

  if (structure.length === 0) {
    appendTextLine('[]');
  } else {
    appendTextLine('[');
    structure.forEach((polygonStructure, polygonIndex) => {
      appendTextLine('    [');

      const detailLine = document.createElement('div');
      detailLine.style.display = 'flex';
      detailLine.style.alignItems = 'center';
      detailLine.style.whiteSpace = 'pre';

      const textSpan = document.createElement('span');
      textSpan.textContent = `        ${formatDisplayText(polygonStructure)} `;
      detailLine.appendChild(textSpan);
      detailLine.appendChild(createInfoButton(polygonIndex));

      structureContainer.appendChild(detailLine);

      appendTextLine(polygonIndex < structure.length - 1 ? '    ],' : '    ]');
    });
    appendTextLine(']');
  }

  const summaryLine = document.createElement('div');
  summaryLine.textContent = `// Summary: ${totalPolygons} polygon(s), ${totalVertices} total vertex/vertices`;
  summaryLine.style.marginTop = '4px';
  summaryLine.style.color = '#4b5563';
  structureContainer.appendChild(summaryLine);

  // --- Expandable panel wrapper ---
  // Preserve collapsed state across updates using a data-attribute on the container element
  const wasCollapsed = structureElement.getAttribute('data-collapsed') === 'true';

  // Clear host element and build panel
  structureElement.innerHTML = '';

  // Try to find an OUTER header that says "Polygon Status" to use as the collapsible toggle
  const findOuterHeader = (): HTMLElement | null => {
    const candidates: HTMLElement[] = [];
    let node: HTMLElement | null = structureElement as HTMLElement;

    // Previous siblings (up to a few steps)
    let prev: HTMLElement | null = node.previousElementSibling as HTMLElement | null;
    let steps = 0;
    while (prev && steps++ < 5) {
      candidates.push(prev);
      prev = prev.previousElementSibling as HTMLElement | null;
    }

    // Parent's previous siblings as a fallback scope
    if (node.parentElement) {
      let pprev: HTMLElement | null = node.parentElement
        .previousElementSibling as HTMLElement | null;
      steps = 0;
      while (pprev && steps++ < 5) {
        candidates.push(pprev);
        pprev = pprev.previousElementSibling as HTMLElement | null;
      }
    }

    for (const c of candidates) {
      const txt = (c.textContent || '').trim().toLowerCase();
      if (txt === 'polygon status' || txt.startsWith('polygon status')) {
        return c;
      }
    }
    return null;
  };

  const outerHeader = findOuterHeader();

  // Wrapper panel (no inner header by default)
  const panel = document.createElement('div');
  panel.style.border = '1px solid #ddd';
  panel.style.borderRadius = '6px';
  panel.style.overflow = 'hidden';
  panel.style.background = '#fff';

  const contentWrap = document.createElement('div');
  contentWrap.style.padding = '8px 10px';
  contentWrap.style.display = wasCollapsed ? 'none' : 'block';

  // Count line inside the collapsible content
  const countLine = document.createElement('div');
  countLine.style.fontFamily = 'monospace';
  countLine.style.fontSize = '12px';
  countLine.style.marginBottom = '6px';
  countLine.textContent = `Count: ${featureGroups.length}`;
  contentWrap.appendChild(countLine);

  // Structure block
  contentWrap.appendChild(structureContainer);

  const toggle = () => {
    const becomingExpanded = contentWrap.style.display === 'none';
    contentWrap.style.display = becomingExpanded ? 'block' : 'none';
    structureElement.setAttribute('data-collapsed', String(!becomingExpanded));
    if (outerHeader) outerHeader.setAttribute('aria-expanded', String(becomingExpanded));
  };

  if (outerHeader) {
    // Use the OUTER header as the one and only toggle. Make it focusable and add/update a chevron.
    outerHeader.setAttribute('tabindex', '0');
    outerHeader.setAttribute('role', 'button');
    outerHeader.setAttribute('aria-expanded', String(!wasCollapsed));

    // Add a lightweight chevron span if missing
    if (!outerHeader.querySelector('[data-chevron]')) {
      const chev = document.createElement('span');
      chev.setAttribute('data-chevron', '');
      chev.textContent = wasCollapsed ? ' ►' : ' ▼';
      chev.style.fontWeight = '600';
      chev.style.marginLeft = '6px';
      outerHeader.appendChild(chev);
    } else {
      const chev = outerHeader.querySelector('[data-chevron]') as HTMLElement;
      chev.textContent = wasCollapsed ? ' ►' : ' ▼';
    }

    const updateChevron = () => {
      const chev = outerHeader.querySelector('[data-chevron]') as HTMLElement | null;
      if (chev) {
        const isCollapsed = contentWrap.style.display === 'none';
        chev.textContent = isCollapsed ? ' ►' : ' ▼';
      }
    };

    const outerToggle = () => {
      toggle();
      updateChevron();
    };

    outerHeader.addEventListener('click', outerToggle);
    outerHeader.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
        e.preventDefault();
        outerToggle();
      }
    });

    // Mount panel without inner header so only the OUTER header is visible when collapsed
    panel.appendChild(contentWrap);
    structureElement.appendChild(panel);
  } else {
    // Fallback: if no outer header exists, render an internal header to allow toggling
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.padding = '6px 10px';
    header.style.cursor = 'pointer';
    header.style.background = '#f7f7f7';
    header.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    header.style.fontSize = '12px';

    const titleSpan = document.createElement('span');
    titleSpan.textContent = 'Polygon status';
    titleSpan.style.fontWeight = '600';

    const chevron = document.createElement('span');
    chevron.setAttribute('data-chevron', '');
    chevron.textContent = wasCollapsed ? '►' : '▼';
    chevron.style.fontWeight = '600';
    chevron.style.marginLeft = '8px';

    const rightSide = document.createElement('div');
    rightSide.style.display = 'flex';
    rightSide.style.alignItems = 'center';
    rightSide.style.gap = '8px';
    rightSide.appendChild(chevron);

    header.appendChild(titleSpan);
    header.appendChild(rightSide);

    header.addEventListener('click', () => {
      toggle();
      const chev = header.querySelector('[data-chevron]') as HTMLElement | null;
      if (chev) {
        const isCollapsed = contentWrap.style.display === 'none';
        chev.textContent = isCollapsed ? '►' : '▼';
      }
    });
    header.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
    header.setAttribute('tabindex', '0');
    header.setAttribute('role', 'button');
    header.setAttribute('aria-expanded', String(!wasCollapsed));

    panel.appendChild(header);
    panel.appendChild(contentWrap);
    structureElement.appendChild(panel);
  }
}

// Subscribe to polygon changes using proper event handling
(polydraw as any).on('polydraw:polygon:created', () => {
  updateStatusBox();
});

(polydraw as any).on('polydraw:mode:change', (data: any) => {
  updateStatusBox();
});

// Listen for any polygon operations (add, subtract, delete)
(polydraw as any).on('polygonOperationComplete', () => {
  updateStatusBox();
});

(polydraw as any).on('polygonDeleted', () => {
  updateStatusBox();
});

// Initial status update
updateStatusBox();

const linkoping: L.LatLng[][][] = [
  [
    [
      leafletAdapter.createLatLng(58.621761, 15.612239),
      leafletAdapter.createLatLng(58.622466, 15.611612),
      leafletAdapter.createLatLng(58.623898, 15.61012),
      leafletAdapter.createLatLng(58.626891, 15.607075),
      leafletAdapter.createLatLng(58.628121, 15.605318),
      leafletAdapter.createLatLng(58.628474, 15.604815),
      leafletAdapter.createLatLng(58.628834, 15.604301),
      leafletAdapter.createLatLng(58.632572, 15.598969),
      leafletAdapter.createLatLng(58.63271, 15.598731),
      leafletAdapter.createLatLng(58.633655, 15.589027),
      leafletAdapter.createLatLng(58.636204, 15.580448),
      leafletAdapter.createLatLng(58.636341, 15.580106),
      leafletAdapter.createLatLng(58.636227, 15.58005),
      leafletAdapter.createLatLng(58.633503, 15.578705),
      leafletAdapter.createLatLng(58.622402, 15.573214),
      leafletAdapter.createLatLng(58.621586, 15.57281),
      leafletAdapter.createLatLng(58.612588, 15.566578),
      leafletAdapter.createLatLng(58.607271, 15.54934),
      leafletAdapter.createLatLng(58.606553, 15.547136),
      leafletAdapter.createLatLng(58.606108, 15.545568),
      leafletAdapter.createLatLng(58.604218, 15.539497),
      leafletAdapter.createLatLng(58.602288, 15.533263),
      leafletAdapter.createLatLng(58.600858, 15.52867),
      leafletAdapter.createLatLng(58.60017, 15.526344),
      leafletAdapter.createLatLng(58.605523, 15.53608),
      leafletAdapter.createLatLng(58.606088, 15.535783),
      leafletAdapter.createLatLng(58.60676, 15.535457),
      leafletAdapter.createLatLng(58.607459, 15.535082),
      leafletAdapter.createLatLng(58.608403, 15.534608),
      leafletAdapter.createLatLng(58.609304, 15.534155),
      leafletAdapter.createLatLng(58.610696, 15.533418),
      leafletAdapter.createLatLng(58.61084, 15.533342),
      leafletAdapter.createLatLng(58.612104, 15.532725),
      leafletAdapter.createLatLng(58.61285, 15.532365),
      leafletAdapter.createLatLng(58.613064, 15.532261),
      leafletAdapter.createLatLng(58.613474, 15.532751),
      leafletAdapter.createLatLng(58.614086, 15.53329),
      leafletAdapter.createLatLng(58.614896, 15.533935),
      leafletAdapter.createLatLng(58.615397, 15.534317),
      leafletAdapter.createLatLng(58.615584, 15.534442),
      leafletAdapter.createLatLng(58.615769, 15.534522),
      leafletAdapter.createLatLng(58.616022, 15.534487),
      leafletAdapter.createLatLng(58.61629, 15.534411),
      leafletAdapter.createLatLng(58.616699, 15.534313),
      leafletAdapter.createLatLng(58.617153, 15.534193),
      leafletAdapter.createLatLng(58.617524, 15.534105),
      leafletAdapter.createLatLng(58.617791, 15.534105),
      leafletAdapter.createLatLng(58.618066, 15.534128),
      leafletAdapter.createLatLng(58.618259, 15.534274),
      leafletAdapter.createLatLng(58.618473, 15.534512),
      leafletAdapter.createLatLng(58.618587, 15.534692),
      leafletAdapter.createLatLng(58.61869, 15.534832),
      leafletAdapter.createLatLng(58.619962, 15.533558),
      leafletAdapter.createLatLng(58.621675, 15.531751),
      leafletAdapter.createLatLng(58.622321, 15.532068),
      leafletAdapter.createLatLng(58.627427, 15.535073),
      leafletAdapter.createLatLng(58.628063, 15.535435),
      leafletAdapter.createLatLng(58.627674, 15.537027),
      leafletAdapter.createLatLng(58.629326, 15.538423),
      leafletAdapter.createLatLng(58.631021, 15.539131),
      leafletAdapter.createLatLng(58.63301, 15.540818),
      leafletAdapter.createLatLng(58.63375, 15.54068),
      leafletAdapter.createLatLng(58.634986, 15.540509),
      leafletAdapter.createLatLng(58.636136, 15.540356),
      leafletAdapter.createLatLng(58.636814, 15.540295),
      leafletAdapter.createLatLng(58.638645, 15.540157),
      leafletAdapter.createLatLng(58.640064, 15.539708),
      leafletAdapter.createLatLng(58.640029, 15.538382),
      leafletAdapter.createLatLng(58.63976, 15.527922),
      leafletAdapter.createLatLng(58.639919, 15.51925),
      leafletAdapter.createLatLng(58.639287, 15.513104),
      leafletAdapter.createLatLng(58.638584, 15.510494),
      leafletAdapter.createLatLng(58.638423, 15.509917),
      leafletAdapter.createLatLng(58.637701, 15.507293),
      leafletAdapter.createLatLng(58.637613, 15.506961),
      leafletAdapter.createLatLng(58.636797, 15.503897),
      leafletAdapter.createLatLng(58.636484, 15.501082),
      leafletAdapter.createLatLng(58.635803, 15.494761),
      leafletAdapter.createLatLng(58.635505, 15.492916),
      leafletAdapter.createLatLng(58.635372, 15.492099),
      leafletAdapter.createLatLng(58.634651, 15.488169),
      leafletAdapter.createLatLng(58.632159, 15.475122),
      leafletAdapter.createLatLng(58.631753, 15.470026),
      leafletAdapter.createLatLng(58.628733, 15.469428),
      leafletAdapter.createLatLng(58.631396, 15.460876),
      leafletAdapter.createLatLng(58.63298, 15.456199),
      leafletAdapter.createLatLng(58.635021, 15.450343),
      leafletAdapter.createLatLng(58.635033, 15.450309),
      leafletAdapter.createLatLng(58.640016, 15.436154),
      leafletAdapter.createLatLng(58.641818, 15.434785),
      leafletAdapter.createLatLng(58.641495, 15.434355),
      leafletAdapter.createLatLng(58.644483, 15.430601),
      leafletAdapter.createLatLng(58.645166, 15.429734),
      leafletAdapter.createLatLng(58.652192, 15.417492),
      leafletAdapter.createLatLng(58.652182, 15.417337),
      leafletAdapter.createLatLng(58.652107, 15.417263),
      leafletAdapter.createLatLng(58.651934, 15.417089),
      leafletAdapter.createLatLng(58.649466, 15.409809),
      leafletAdapter.createLatLng(58.649252, 15.409192),
      leafletAdapter.createLatLng(58.649151, 15.408973),
      leafletAdapter.createLatLng(58.649163, 15.408474),
      leafletAdapter.createLatLng(58.649119, 15.408261),
      leafletAdapter.createLatLng(58.649041, 15.408063),
      leafletAdapter.createLatLng(58.648706, 15.407768),
      leafletAdapter.createLatLng(58.648266, 15.406804),
      leafletAdapter.createLatLng(58.648166, 15.406492),
      leafletAdapter.createLatLng(58.648088, 15.406245),
      leafletAdapter.createLatLng(58.648047, 15.405939),
      leafletAdapter.createLatLng(58.64783, 15.405058),
      leafletAdapter.createLatLng(58.647686, 15.404357),
      leafletAdapter.createLatLng(58.647624, 15.403749),
      leafletAdapter.createLatLng(58.647348, 15.402466),
      leafletAdapter.createLatLng(58.646964, 15.400805),
      leafletAdapter.createLatLng(58.646818, 15.400143),
      leafletAdapter.createLatLng(58.646811, 15.399812),
      leafletAdapter.createLatLng(58.646653, 15.399178),
      leafletAdapter.createLatLng(58.646285, 15.398467),
      leafletAdapter.createLatLng(58.646152, 15.398242),
      leafletAdapter.createLatLng(58.646089, 15.398248),
      leafletAdapter.createLatLng(58.644808, 15.398847),
      leafletAdapter.createLatLng(58.641511, 15.399672),
      leafletAdapter.createLatLng(58.641345, 15.399251),
      leafletAdapter.createLatLng(58.63849, 15.391591),
      leafletAdapter.createLatLng(58.637184, 15.390523),
      leafletAdapter.createLatLng(58.636397, 15.386178),
      leafletAdapter.createLatLng(58.635395, 15.380653),
      leafletAdapter.createLatLng(58.633024, 15.37778),
      leafletAdapter.createLatLng(58.629858, 15.373945),
      leafletAdapter.createLatLng(58.629528, 15.373524),
      leafletAdapter.createLatLng(58.628604, 15.37235),
      leafletAdapter.createLatLng(58.628377, 15.372758),
      leafletAdapter.createLatLng(58.628098, 15.372922),
      leafletAdapter.createLatLng(58.627768, 15.37309),
      leafletAdapter.createLatLng(58.627431, 15.373213),
      leafletAdapter.createLatLng(58.627189, 15.37329),
      leafletAdapter.createLatLng(58.626979, 15.373488),
      leafletAdapter.createLatLng(58.626872, 15.373602),
      leafletAdapter.createLatLng(58.626731, 15.373713),
      leafletAdapter.createLatLng(58.626496, 15.373977),
      leafletAdapter.createLatLng(58.626329, 15.374095),
      leafletAdapter.createLatLng(58.626125, 15.374134),
      leafletAdapter.createLatLng(58.625866, 15.374029),
      leafletAdapter.createLatLng(58.625511, 15.373898),
      leafletAdapter.createLatLng(58.625374, 15.373882),
      leafletAdapter.createLatLng(58.625186, 15.373835),
      leafletAdapter.createLatLng(58.624885, 15.37404),
      leafletAdapter.createLatLng(58.62465, 15.374193),
      leafletAdapter.createLatLng(58.62435, 15.373841),
      leafletAdapter.createLatLng(58.624017, 15.373427),
      leafletAdapter.createLatLng(58.623667, 15.373299),
      leafletAdapter.createLatLng(58.623577, 15.373283),
      leafletAdapter.createLatLng(58.623491, 15.373218),
      leafletAdapter.createLatLng(58.62339, 15.373036),
      leafletAdapter.createLatLng(58.623284, 15.372851),
      leafletAdapter.createLatLng(58.623192, 15.372818),
      leafletAdapter.createLatLng(58.623086, 15.372829),
      leafletAdapter.createLatLng(58.622946, 15.372833),
      leafletAdapter.createLatLng(58.622754, 15.372769),
      leafletAdapter.createLatLng(58.62258, 15.372729),
      leafletAdapter.createLatLng(58.622318, 15.372642),
      leafletAdapter.createLatLng(58.622113, 15.372626),
      leafletAdapter.createLatLng(58.621882, 15.372604),
      leafletAdapter.createLatLng(58.617958, 15.371282),
      leafletAdapter.createLatLng(58.616388, 15.374985),
      leafletAdapter.createLatLng(58.612221, 15.384808),
      leafletAdapter.createLatLng(58.608773, 15.390762),
      leafletAdapter.createLatLng(58.604102, 15.383906),
      leafletAdapter.createLatLng(58.596776, 15.380934),
      leafletAdapter.createLatLng(58.594204, 15.381367),
      leafletAdapter.createLatLng(58.590936, 15.379897),
      leafletAdapter.createLatLng(58.590188, 15.375308),
      leafletAdapter.createLatLng(58.590029, 15.374329),
      leafletAdapter.createLatLng(58.588151, 15.375333),
      leafletAdapter.createLatLng(58.583892, 15.377609),
      leafletAdapter.createLatLng(58.57971, 15.381767),
      leafletAdapter.createLatLng(58.57733, 15.38028),
      leafletAdapter.createLatLng(58.577019, 15.380085),
      leafletAdapter.createLatLng(58.57616, 15.379549),
      leafletAdapter.createLatLng(58.572336, 15.37712),
      leafletAdapter.createLatLng(58.571515, 15.3766),
      leafletAdapter.createLatLng(58.569871, 15.375557),
      leafletAdapter.createLatLng(58.569201, 15.375132),
      leafletAdapter.createLatLng(58.569127, 15.375089),
      leafletAdapter.createLatLng(58.568626, 15.374802),
      leafletAdapter.createLatLng(58.568488, 15.374723),
      leafletAdapter.createLatLng(58.568456, 15.374704),
      leafletAdapter.createLatLng(58.568219, 15.37486),
      leafletAdapter.createLatLng(58.567105, 15.375591),
      leafletAdapter.createLatLng(58.56645, 15.378857),
      leafletAdapter.createLatLng(58.563535, 15.378176),
      leafletAdapter.createLatLng(58.561402, 15.377678),
      leafletAdapter.createLatLng(58.560732, 15.377522),
      leafletAdapter.createLatLng(58.557602, 15.37704),
      leafletAdapter.createLatLng(58.557321, 15.377006),
      leafletAdapter.createLatLng(58.557437, 15.375926),
      leafletAdapter.createLatLng(58.556593, 15.376586),
      leafletAdapter.createLatLng(58.555532, 15.375733),
      leafletAdapter.createLatLng(58.554567, 15.375074),
      leafletAdapter.createLatLng(58.553739, 15.374826),
      leafletAdapter.createLatLng(58.55373, 15.374149),
      leafletAdapter.createLatLng(58.552839, 15.373494),
      leafletAdapter.createLatLng(58.552627, 15.374162),
      leafletAdapter.createLatLng(58.552594, 15.374259),
      leafletAdapter.createLatLng(58.552538, 15.374752),
      leafletAdapter.createLatLng(58.552486, 15.37477),
      leafletAdapter.createLatLng(58.552581, 15.375091),
      leafletAdapter.createLatLng(58.552647, 15.375313),
      leafletAdapter.createLatLng(58.552677, 15.375535),
      leafletAdapter.createLatLng(58.547644, 15.372365),
      leafletAdapter.createLatLng(58.54718, 15.375836),
      leafletAdapter.createLatLng(58.546759, 15.383702),
      leafletAdapter.createLatLng(58.542115, 15.380416),
      leafletAdapter.createLatLng(58.541971, 15.380366),
      leafletAdapter.createLatLng(58.541451, 15.380242),
      leafletAdapter.createLatLng(58.541184, 15.380178),
      leafletAdapter.createLatLng(58.541134, 15.380121),
      leafletAdapter.createLatLng(58.540906, 15.379858),
      leafletAdapter.createLatLng(58.541168, 15.379049),
      leafletAdapter.createLatLng(58.540284, 15.378796),
      leafletAdapter.createLatLng(58.538756, 15.37836),
      leafletAdapter.createLatLng(58.537862, 15.378092),
      leafletAdapter.createLatLng(58.537749, 15.378073),
      leafletAdapter.createLatLng(58.537658, 15.378066),
      leafletAdapter.createLatLng(58.537052, 15.378148),
      leafletAdapter.createLatLng(58.53619, 15.378269),
      leafletAdapter.createLatLng(58.534186, 15.378551),
      leafletAdapter.createLatLng(58.532126, 15.378817),
      leafletAdapter.createLatLng(58.52944, 15.379164),
      leafletAdapter.createLatLng(58.529055, 15.379219),
      leafletAdapter.createLatLng(58.528961, 15.379232),
      leafletAdapter.createLatLng(58.525464, 15.379727),
      leafletAdapter.createLatLng(58.522375, 15.380164),
      leafletAdapter.createLatLng(58.521298, 15.377882),
      leafletAdapter.createLatLng(58.51842, 15.377695),
      leafletAdapter.createLatLng(58.517825, 15.377656),
      leafletAdapter.createLatLng(58.514579, 15.377446),
      leafletAdapter.createLatLng(58.51412, 15.377416),
      leafletAdapter.createLatLng(58.511493, 15.377245),
      leafletAdapter.createLatLng(58.511427, 15.376273),
      leafletAdapter.createLatLng(58.51141, 15.375871),
      leafletAdapter.createLatLng(58.511322, 15.374309),
      leafletAdapter.createLatLng(58.51124, 15.372872),
      leafletAdapter.createLatLng(58.511197, 15.372115),
      leafletAdapter.createLatLng(58.51117, 15.371639),
      leafletAdapter.createLatLng(58.5111, 15.370404),
      leafletAdapter.createLatLng(58.510295, 15.370924),
      leafletAdapter.createLatLng(58.509452, 15.371429),
      leafletAdapter.createLatLng(58.50909, 15.371645),
      leafletAdapter.createLatLng(58.508158, 15.372302),
      leafletAdapter.createLatLng(58.507825, 15.372503),
      leafletAdapter.createLatLng(58.507818, 15.372507),
      leafletAdapter.createLatLng(58.507359, 15.372785),
      leafletAdapter.createLatLng(58.506835, 15.373101),
      leafletAdapter.createLatLng(58.505917, 15.373668),
      leafletAdapter.createLatLng(58.505445, 15.373943),
      leafletAdapter.createLatLng(58.503114, 15.374882),
      leafletAdapter.createLatLng(58.501465, 15.375546),
      leafletAdapter.createLatLng(58.499885, 15.374811),
      leafletAdapter.createLatLng(58.4999, 15.369295),
      leafletAdapter.createLatLng(58.498643, 15.368846),
      leafletAdapter.createLatLng(58.49722, 15.368457),
      leafletAdapter.createLatLng(58.49615, 15.368124),
      leafletAdapter.createLatLng(58.495924, 15.372959),
      leafletAdapter.createLatLng(58.495863, 15.372936),
      leafletAdapter.createLatLng(58.495814, 15.372908),
      leafletAdapter.createLatLng(58.49597, 15.368006),
      leafletAdapter.createLatLng(58.493868, 15.367341),
      leafletAdapter.createLatLng(58.493189, 15.36556),
      leafletAdapter.createLatLng(58.489853, 15.3638),
      leafletAdapter.createLatLng(58.489668, 15.365956),
      leafletAdapter.createLatLng(58.488102, 15.365976),
      leafletAdapter.createLatLng(58.487915, 15.366499),
      leafletAdapter.createLatLng(58.48701, 15.366611),
      leafletAdapter.createLatLng(58.486976, 15.364541),
      leafletAdapter.createLatLng(58.486578, 15.364487),
      leafletAdapter.createLatLng(58.484931, 15.364879),
      leafletAdapter.createLatLng(58.483073, 15.365369),
      leafletAdapter.createLatLng(58.483052, 15.365375),
      leafletAdapter.createLatLng(58.483915, 15.37661),
      leafletAdapter.createLatLng(58.484056, 15.378581),
      leafletAdapter.createLatLng(58.483639, 15.378749),
      leafletAdapter.createLatLng(58.483319, 15.378897),
      leafletAdapter.createLatLng(58.483033, 15.379164),
      leafletAdapter.createLatLng(58.482729, 15.379545),
      leafletAdapter.createLatLng(58.482487, 15.379873),
      leafletAdapter.createLatLng(58.482304, 15.380244),
      leafletAdapter.createLatLng(58.482067, 15.380602),
      leafletAdapter.createLatLng(58.481808, 15.380824),
      leafletAdapter.createLatLng(58.481718, 15.380933),
      leafletAdapter.createLatLng(58.481482, 15.381391),
      leafletAdapter.createLatLng(58.481256, 15.381769),
      leafletAdapter.createLatLng(58.48103, 15.382066),
      leafletAdapter.createLatLng(58.480799, 15.382184),
      leafletAdapter.createLatLng(58.48057, 15.382323),
      leafletAdapter.createLatLng(58.480516, 15.382351),
      leafletAdapter.createLatLng(58.480257, 15.382482),
      leafletAdapter.createLatLng(58.48004, 15.382744),
      leafletAdapter.createLatLng(58.479847, 15.383266),
      leafletAdapter.createLatLng(58.479792, 15.383647),
      leafletAdapter.createLatLng(58.479719, 15.384057),
      leafletAdapter.createLatLng(58.479635, 15.384367),
      leafletAdapter.createLatLng(58.479513, 15.384569),
      leafletAdapter.createLatLng(58.479377, 15.384672),
      leafletAdapter.createLatLng(58.479309, 15.384796),
      leafletAdapter.createLatLng(58.479254, 15.384897),
      leafletAdapter.createLatLng(58.479184, 15.385105),
      leafletAdapter.createLatLng(58.479034, 15.385235),
      leafletAdapter.createLatLng(58.478898, 15.385372),
      leafletAdapter.createLatLng(58.47871, 15.385664),
      leafletAdapter.createLatLng(58.478647, 15.385648),
      leafletAdapter.createLatLng(58.478465, 15.385659),
      leafletAdapter.createLatLng(58.478229, 15.385949),
      leafletAdapter.createLatLng(58.47795, 15.386247),
      leafletAdapter.createLatLng(58.477759, 15.386419),
      leafletAdapter.createLatLng(58.477618, 15.386532),
      leafletAdapter.createLatLng(58.477437, 15.386588),
      leafletAdapter.createLatLng(58.477349, 15.386528),
      leafletAdapter.createLatLng(58.4773, 15.386497),
      leafletAdapter.createLatLng(58.477143, 15.386396),
      leafletAdapter.createLatLng(58.47691, 15.386093),
      leafletAdapter.createLatLng(58.476557, 15.385912),
      leafletAdapter.createLatLng(58.476489, 15.384631),
      leafletAdapter.createLatLng(58.476261, 15.380311),
      leafletAdapter.createLatLng(58.476458, 15.376701),
      leafletAdapter.createLatLng(58.476537, 15.375541),
      leafletAdapter.createLatLng(58.477004, 15.368707),
      leafletAdapter.createLatLng(58.477171, 15.366266),
      leafletAdapter.createLatLng(58.475799, 15.365655),
      leafletAdapter.createLatLng(58.47399, 15.366964),
      leafletAdapter.createLatLng(58.473021, 15.357483),
      leafletAdapter.createLatLng(58.471949, 15.358052),
      leafletAdapter.createLatLng(58.470781, 15.358672),
      leafletAdapter.createLatLng(58.471368, 15.365457),
      leafletAdapter.createLatLng(58.471803, 15.36559),
      leafletAdapter.createLatLng(58.471967, 15.365836),
      leafletAdapter.createLatLng(58.472045, 15.36605),
      leafletAdapter.createLatLng(58.472206, 15.367798),
      leafletAdapter.createLatLng(58.472231, 15.368312),
      leafletAdapter.createLatLng(58.472237, 15.368415),
      leafletAdapter.createLatLng(58.472038, 15.372376),
      leafletAdapter.createLatLng(58.470963, 15.375904),
      leafletAdapter.createLatLng(58.470942, 15.375972),
      leafletAdapter.createLatLng(58.470925, 15.376768),
      leafletAdapter.createLatLng(58.470838, 15.380577),
      leafletAdapter.createLatLng(58.470843, 15.380619),
      leafletAdapter.createLatLng(58.471313, 15.384776),
      leafletAdapter.createLatLng(58.471457, 15.386046),
      leafletAdapter.createLatLng(58.471284, 15.3876),
      leafletAdapter.createLatLng(58.471056, 15.389657),
      leafletAdapter.createLatLng(58.465115, 15.392891),
      leafletAdapter.createLatLng(58.464908, 15.392765),
      leafletAdapter.createLatLng(58.464769, 15.392645),
      leafletAdapter.createLatLng(58.464736, 15.392512),
      leafletAdapter.createLatLng(58.464708, 15.392399),
      leafletAdapter.createLatLng(58.46471, 15.391851),
      leafletAdapter.createLatLng(58.464705, 15.391303),
      leafletAdapter.createLatLng(58.464847, 15.390467),
      leafletAdapter.createLatLng(58.465067, 15.389876),
      leafletAdapter.createLatLng(58.465214, 15.389468),
      leafletAdapter.createLatLng(58.465804, 15.388362),
      leafletAdapter.createLatLng(58.466294, 15.387453),
      leafletAdapter.createLatLng(58.46653, 15.386961),
      leafletAdapter.createLatLng(58.466646, 15.386557),
      leafletAdapter.createLatLng(58.466744, 15.386133),
      leafletAdapter.createLatLng(58.466768, 15.385639),
      leafletAdapter.createLatLng(58.466743, 15.384958),
      leafletAdapter.createLatLng(58.466723, 15.384599),
      leafletAdapter.createLatLng(58.466249, 15.382827),
      leafletAdapter.createLatLng(58.465852, 15.381175),
      leafletAdapter.createLatLng(58.465848, 15.380606),
      leafletAdapter.createLatLng(58.465884, 15.380235),
      leafletAdapter.createLatLng(58.465997, 15.379478),
      leafletAdapter.createLatLng(58.466118, 15.378715),
      leafletAdapter.createLatLng(58.466097, 15.378441),
      leafletAdapter.createLatLng(58.465828, 15.376994),
      leafletAdapter.createLatLng(58.465801, 15.376831),
      leafletAdapter.createLatLng(58.465572, 15.376014),
      leafletAdapter.createLatLng(58.465517, 15.375545),
      leafletAdapter.createLatLng(58.465474, 15.375334),
      leafletAdapter.createLatLng(58.465461, 15.375222),
      leafletAdapter.createLatLng(58.465423, 15.37491),
      leafletAdapter.createLatLng(58.465357, 15.374072),
      leafletAdapter.createLatLng(58.465304, 15.373696),
      leafletAdapter.createLatLng(58.465542, 15.372806),
      leafletAdapter.createLatLng(58.465604, 15.372575),
      leafletAdapter.createLatLng(58.465731, 15.370823),
      leafletAdapter.createLatLng(58.4658, 15.369869),
      leafletAdapter.createLatLng(58.465552, 15.369354),
      leafletAdapter.createLatLng(58.465492, 15.369244),
      leafletAdapter.createLatLng(58.465273, 15.368842),
      leafletAdapter.createLatLng(58.465061, 15.368454),
      leafletAdapter.createLatLng(58.464217, 15.368587),
      leafletAdapter.createLatLng(58.463066, 15.368683),
      leafletAdapter.createLatLng(58.462437, 15.367725),
      leafletAdapter.createLatLng(58.462181, 15.365849),
      leafletAdapter.createLatLng(58.46215, 15.365627),
      leafletAdapter.createLatLng(58.462014, 15.36535),
      leafletAdapter.createLatLng(58.461631, 15.364509),
      leafletAdapter.createLatLng(58.461297, 15.363842),
      leafletAdapter.createLatLng(58.46116, 15.363033),
      leafletAdapter.createLatLng(58.460972, 15.362047),
      leafletAdapter.createLatLng(58.460912, 15.361609),
      leafletAdapter.createLatLng(58.460694, 15.361001),
      leafletAdapter.createLatLng(58.460299, 15.359917),
      leafletAdapter.createLatLng(58.459972, 15.358969),
      leafletAdapter.createLatLng(58.459885, 15.358909),
      leafletAdapter.createLatLng(58.459759, 15.358776),
      leafletAdapter.createLatLng(58.459673, 15.358685),
      leafletAdapter.createLatLng(58.459602, 15.358601),
      leafletAdapter.createLatLng(58.459357, 15.358312),
      leafletAdapter.createLatLng(58.458608, 15.357494),
      leafletAdapter.createLatLng(58.457809, 15.35664),
      leafletAdapter.createLatLng(58.457717, 15.356635),
      leafletAdapter.createLatLng(58.457313, 15.356624),
      leafletAdapter.createLatLng(58.457065, 15.356658),
      leafletAdapter.createLatLng(58.456471, 15.357159),
      leafletAdapter.createLatLng(58.456142, 15.357451),
      leafletAdapter.createLatLng(58.456058, 15.357438),
      leafletAdapter.createLatLng(58.455822, 15.357401),
      leafletAdapter.createLatLng(58.455448, 15.357339),
      leafletAdapter.createLatLng(58.455337, 15.357344),
      leafletAdapter.createLatLng(58.455126, 15.356972),
      leafletAdapter.createLatLng(58.454709, 15.356341),
      leafletAdapter.createLatLng(58.454365, 15.355819),
      leafletAdapter.createLatLng(58.454139, 15.355444),
      leafletAdapter.createLatLng(58.454118, 15.35541),
      leafletAdapter.createLatLng(58.453856, 15.354975),
      leafletAdapter.createLatLng(58.453066, 15.353682),
      leafletAdapter.createLatLng(58.452967, 15.352947),
      leafletAdapter.createLatLng(58.452742, 15.3514),
      leafletAdapter.createLatLng(58.452694, 15.350912),
      leafletAdapter.createLatLng(58.452601, 15.35017),
      leafletAdapter.createLatLng(58.45251, 15.3496),
      leafletAdapter.createLatLng(58.452466, 15.349317),
      leafletAdapter.createLatLng(58.452403, 15.348986),
      leafletAdapter.createLatLng(58.452326, 15.348378),
      leafletAdapter.createLatLng(58.45222, 15.347665),
      leafletAdapter.createLatLng(58.452176, 15.347292),
      leafletAdapter.createLatLng(58.452113, 15.34667),
      leafletAdapter.createLatLng(58.452081, 15.345992),
      leafletAdapter.createLatLng(58.45206, 15.345722),
      leafletAdapter.createLatLng(58.45206, 15.345427),
      leafletAdapter.createLatLng(58.452024, 15.344948),
      leafletAdapter.createLatLng(58.452044, 15.34466),
      leafletAdapter.createLatLng(58.451946, 15.343929),
      leafletAdapter.createLatLng(58.45188, 15.343475),
      leafletAdapter.createLatLng(58.451798, 15.343148),
      leafletAdapter.createLatLng(58.451729, 15.34289),
      leafletAdapter.createLatLng(58.451604, 15.342605),
      leafletAdapter.createLatLng(58.451539, 15.34245),
      leafletAdapter.createLatLng(58.451437, 15.342208),
      leafletAdapter.createLatLng(58.451333, 15.341967),
      leafletAdapter.createLatLng(58.451181, 15.341605),
      leafletAdapter.createLatLng(58.451131, 15.341414),
      leafletAdapter.createLatLng(58.451034, 15.341019),
      leafletAdapter.createLatLng(58.450947, 15.340658),
      leafletAdapter.createLatLng(58.450797, 15.33998),
      leafletAdapter.createLatLng(58.45072, 15.339533),
      leafletAdapter.createLatLng(58.450616, 15.339032),
      leafletAdapter.createLatLng(58.450518, 15.338609),
      leafletAdapter.createLatLng(58.450423, 15.338125),
      leafletAdapter.createLatLng(58.450346, 15.337829),
      leafletAdapter.createLatLng(58.450338, 15.337692),
      leafletAdapter.createLatLng(58.450331, 15.33751),
      leafletAdapter.createLatLng(58.450335, 15.337257),
      leafletAdapter.createLatLng(58.450343, 15.337188),
      leafletAdapter.createLatLng(58.450381, 15.336868),
      leafletAdapter.createLatLng(58.450496, 15.336125),
      leafletAdapter.createLatLng(58.450522, 15.335809),
      leafletAdapter.createLatLng(58.450557, 15.335637),
      leafletAdapter.createLatLng(58.450615, 15.33542),
      leafletAdapter.createLatLng(58.450616, 15.335012),
      leafletAdapter.createLatLng(58.45061, 15.334159),
      leafletAdapter.createLatLng(58.450598, 15.333923),
      leafletAdapter.createLatLng(58.45062, 15.333583),
      leafletAdapter.createLatLng(58.450683, 15.332472),
      leafletAdapter.createLatLng(58.450641, 15.332115),
      leafletAdapter.createLatLng(58.450635, 15.332068),
      leafletAdapter.createLatLng(58.450617, 15.332033),
      leafletAdapter.createLatLng(58.45055, 15.331899),
      leafletAdapter.createLatLng(58.450378, 15.331239),
      leafletAdapter.createLatLng(58.450297, 15.330854),
      leafletAdapter.createLatLng(58.449965, 15.329704),
      leafletAdapter.createLatLng(58.449799, 15.329269),
      leafletAdapter.createLatLng(58.449635, 15.328814),
      leafletAdapter.createLatLng(58.449372, 15.32804),
      leafletAdapter.createLatLng(58.449046, 15.327257),
      leafletAdapter.createLatLng(58.44896, 15.32706),
      leafletAdapter.createLatLng(58.448926, 15.326883),
      leafletAdapter.createLatLng(58.448907, 15.326736),
      leafletAdapter.createLatLng(58.44889, 15.326527),
      leafletAdapter.createLatLng(58.448908, 15.326249),
      leafletAdapter.createLatLng(58.448862, 15.325935),
      leafletAdapter.createLatLng(58.448859, 15.325719),
      leafletAdapter.createLatLng(58.448864, 15.325315),
      leafletAdapter.createLatLng(58.448858, 15.325089),
      leafletAdapter.createLatLng(58.448871, 15.324818),
      leafletAdapter.createLatLng(58.448855, 15.324572),
      leafletAdapter.createLatLng(58.448853, 15.324284),
      leafletAdapter.createLatLng(58.448851, 15.324048),
      leafletAdapter.createLatLng(58.448899, 15.323666),
      leafletAdapter.createLatLng(58.448922, 15.323429),
      leafletAdapter.createLatLng(58.448925, 15.323282),
      leafletAdapter.createLatLng(58.448933, 15.322928),
      leafletAdapter.createLatLng(58.44893, 15.32275),
      leafletAdapter.createLatLng(58.448955, 15.322479),
      leafletAdapter.createLatLng(58.448966, 15.322215),
      leafletAdapter.createLatLng(58.44896, 15.322054),
      leafletAdapter.createLatLng(58.448899, 15.321925),
      leafletAdapter.createLatLng(58.448868, 15.321755),
      leafletAdapter.createLatLng(58.448829, 15.321612),
      leafletAdapter.createLatLng(58.448796, 15.321561),
      leafletAdapter.createLatLng(58.448755, 15.321504),
      leafletAdapter.createLatLng(58.448697, 15.321458),
      leafletAdapter.createLatLng(58.448601, 15.321405),
      leafletAdapter.createLatLng(58.44851, 15.321366),
      leafletAdapter.createLatLng(58.448408, 15.321414),
      leafletAdapter.createLatLng(58.448318, 15.321467),
      leafletAdapter.createLatLng(58.448243, 15.321548),
      leafletAdapter.createLatLng(58.448015, 15.321742),
      leafletAdapter.createLatLng(58.447781, 15.321923),
      leafletAdapter.createLatLng(58.447533, 15.322155),
      leafletAdapter.createLatLng(58.447122, 15.322149),
      leafletAdapter.createLatLng(58.446675, 15.321896),
      leafletAdapter.createLatLng(58.446536, 15.3218),
      leafletAdapter.createLatLng(58.446393, 15.321739),
      leafletAdapter.createLatLng(58.446289, 15.321694),
      leafletAdapter.createLatLng(58.446131, 15.321725),
      leafletAdapter.createLatLng(58.446004, 15.321749),
      leafletAdapter.createLatLng(58.445875, 15.321817),
      leafletAdapter.createLatLng(58.4458, 15.321884),
      leafletAdapter.createLatLng(58.44571, 15.321886),
      leafletAdapter.createLatLng(58.445571, 15.321838),
      leafletAdapter.createLatLng(58.445487, 15.321803),
      leafletAdapter.createLatLng(58.445424, 15.321756),
      leafletAdapter.createLatLng(58.445266, 15.321743),
      leafletAdapter.createLatLng(58.44517, 15.32167),
      leafletAdapter.createLatLng(58.445067, 15.321543),
      leafletAdapter.createLatLng(58.444964, 15.321429),
      leafletAdapter.createLatLng(58.444801, 15.3213),
      leafletAdapter.createLatLng(58.444659, 15.321248),
      leafletAdapter.createLatLng(58.44457, 15.321189),
      leafletAdapter.createLatLng(58.444448, 15.321168),
      leafletAdapter.createLatLng(58.444329, 15.321103),
      leafletAdapter.createLatLng(58.44427, 15.321049),
      leafletAdapter.createLatLng(58.4441, 15.320954),
      leafletAdapter.createLatLng(58.443938, 15.320852),
      leafletAdapter.createLatLng(58.443812, 15.32079),
      leafletAdapter.createLatLng(58.443673, 15.320705),
      leafletAdapter.createLatLng(58.443552, 15.320646),
      leafletAdapter.createLatLng(58.443395, 15.320554),
      leafletAdapter.createLatLng(58.443291, 15.320492),
      leafletAdapter.createLatLng(58.443156, 15.320433),
      leafletAdapter.createLatLng(58.443002, 15.320311),
      leafletAdapter.createLatLng(58.442746, 15.320156),
      leafletAdapter.createLatLng(58.442137, 15.319812),
      leafletAdapter.createLatLng(58.44197, 15.319755),
      leafletAdapter.createLatLng(58.441929, 15.319728),
      leafletAdapter.createLatLng(58.441656, 15.319535),
      leafletAdapter.createLatLng(58.441377, 15.319326),
      leafletAdapter.createLatLng(58.441, 15.319161),
      leafletAdapter.createLatLng(58.440636, 15.318999),
      leafletAdapter.createLatLng(58.440441, 15.318903),
      leafletAdapter.createLatLng(58.440199, 15.318795),
      leafletAdapter.createLatLng(58.439909, 15.318695),
      leafletAdapter.createLatLng(58.439686, 15.318614),
      leafletAdapter.createLatLng(58.439432, 15.318534),
      leafletAdapter.createLatLng(58.439212, 15.318466),
      leafletAdapter.createLatLng(58.438997, 15.318477),
      leafletAdapter.createLatLng(58.438749, 15.318499),
      leafletAdapter.createLatLng(58.438557, 15.318489),
      leafletAdapter.createLatLng(58.438404, 15.318463),
      leafletAdapter.createLatLng(58.438375, 15.318468),
      leafletAdapter.createLatLng(58.438037, 15.318404),
      leafletAdapter.createLatLng(58.437841, 15.318411),
      leafletAdapter.createLatLng(58.437649, 15.318366),
      leafletAdapter.createLatLng(58.437455, 15.318215),
      leafletAdapter.createLatLng(58.43734, 15.318065),
      leafletAdapter.createLatLng(58.437213, 15.317881),
      leafletAdapter.createLatLng(58.437039, 15.317582),
      leafletAdapter.createLatLng(58.436878, 15.317263),
      leafletAdapter.createLatLng(58.436666, 15.316835),
      leafletAdapter.createLatLng(58.436498, 15.316423),
      leafletAdapter.createLatLng(58.43634, 15.315973),
      leafletAdapter.createLatLng(58.436169, 15.315383),
      leafletAdapter.createLatLng(58.436026, 15.314922),
      leafletAdapter.createLatLng(58.435898, 15.314495),
      leafletAdapter.createLatLng(58.435741, 15.314),
      leafletAdapter.createLatLng(58.435583, 15.313492),
      leafletAdapter.createLatLng(58.435432, 15.312943),
      leafletAdapter.createLatLng(58.435349, 15.312528),
      leafletAdapter.createLatLng(58.435229, 15.311919),
      leafletAdapter.createLatLng(58.435093, 15.311495),
      leafletAdapter.createLatLng(58.435061, 15.311298),
      leafletAdapter.createLatLng(58.434973, 15.310791),
      leafletAdapter.createLatLng(58.434881, 15.310721),
      leafletAdapter.createLatLng(58.434677, 15.310575),
      leafletAdapter.createLatLng(58.434295, 15.310229),
      leafletAdapter.createLatLng(58.434041, 15.309991),
      leafletAdapter.createLatLng(58.433912, 15.309876),
      leafletAdapter.createLatLng(58.433814, 15.309746),
      leafletAdapter.createLatLng(58.433803, 15.309684),
      leafletAdapter.createLatLng(58.43378, 15.309555),
      leafletAdapter.createLatLng(58.433777, 15.309504),
      leafletAdapter.createLatLng(58.433769, 15.309322),
      leafletAdapter.createLatLng(58.433742, 15.309025),
      leafletAdapter.createLatLng(58.433731, 15.308913),
      leafletAdapter.createLatLng(58.433704, 15.308766),
      leafletAdapter.createLatLng(58.433656, 15.308624),
      leafletAdapter.createLatLng(58.43361, 15.308516),
      leafletAdapter.createLatLng(58.433463, 15.308395),
      leafletAdapter.createLatLng(58.433364, 15.308306),
      leafletAdapter.createLatLng(58.433254, 15.308306),
      leafletAdapter.createLatLng(58.432998, 15.30838),
      leafletAdapter.createLatLng(58.432728, 15.308456),
      leafletAdapter.createLatLng(58.432679, 15.30847),
      leafletAdapter.createLatLng(58.432317, 15.308565),
      leafletAdapter.createLatLng(58.431999, 15.308658),
      leafletAdapter.createLatLng(58.431962, 15.308668),
      leafletAdapter.createLatLng(58.431882, 15.30869),
      leafletAdapter.createLatLng(58.431772, 15.308642),
      leafletAdapter.createLatLng(58.431692, 15.308556),
      leafletAdapter.createLatLng(58.431627, 15.308438),
      leafletAdapter.createLatLng(58.431502, 15.308323),
      leafletAdapter.createLatLng(58.431387, 15.308221),
      leafletAdapter.createLatLng(58.431356, 15.308116),
      leafletAdapter.createLatLng(58.431325, 15.307932),
      leafletAdapter.createLatLng(58.431222, 15.307679),
      leafletAdapter.createLatLng(58.431055, 15.307486),
      leafletAdapter.createLatLng(58.430583, 15.307092),
      leafletAdapter.createLatLng(58.430532, 15.307275),
      leafletAdapter.createLatLng(58.430441, 15.307514),
      leafletAdapter.createLatLng(58.430259, 15.307819),
      leafletAdapter.createLatLng(58.430099, 15.307996),
      leafletAdapter.createLatLng(58.429727, 15.306999),
      leafletAdapter.createLatLng(58.429687, 15.306895),
      leafletAdapter.createLatLng(58.428915, 15.304914),
      leafletAdapter.createLatLng(58.428375, 15.303519),
      leafletAdapter.createLatLng(58.427391, 15.302355),
      leafletAdapter.createLatLng(58.427278, 15.302003),
      leafletAdapter.createLatLng(58.426549, 15.299666),
      leafletAdapter.createLatLng(58.426122, 15.299209),
      leafletAdapter.createLatLng(58.425111, 15.298129),
      leafletAdapter.createLatLng(58.424362, 15.297329),
      leafletAdapter.createLatLng(58.424067, 15.297218),
      leafletAdapter.createLatLng(58.4231, 15.296984),
      leafletAdapter.createLatLng(58.421268, 15.296535),
      leafletAdapter.createLatLng(58.42092, 15.296716),
      leafletAdapter.createLatLng(58.419928, 15.297299),
      leafletAdapter.createLatLng(58.419387, 15.297066),
      leafletAdapter.createLatLng(58.41921, 15.297066),
      leafletAdapter.createLatLng(58.418652, 15.297317),
      leafletAdapter.createLatLng(58.418569, 15.297322),
      leafletAdapter.createLatLng(58.418346, 15.296996),
      leafletAdapter.createLatLng(58.417684, 15.296821),
      leafletAdapter.createLatLng(58.416731, 15.296623),
      leafletAdapter.createLatLng(58.41681, 15.295439),
      leafletAdapter.createLatLng(58.41657, 15.295301),
      leafletAdapter.createLatLng(58.416462, 15.295239),
      leafletAdapter.createLatLng(58.416322, 15.295159),
      leafletAdapter.createLatLng(58.415728, 15.29471),
      leafletAdapter.createLatLng(58.414668, 15.29468),
      leafletAdapter.createLatLng(58.412866, 15.289728),
      leafletAdapter.createLatLng(58.409819, 15.285129),
      leafletAdapter.createLatLng(58.413103, 15.2849),
      leafletAdapter.createLatLng(58.413251, 15.286806),
      leafletAdapter.createLatLng(58.413513, 15.286787),
      leafletAdapter.createLatLng(58.413389, 15.284807),
      leafletAdapter.createLatLng(58.415014, 15.284561),
      leafletAdapter.createLatLng(58.4151, 15.283856),
      leafletAdapter.createLatLng(58.415172, 15.283166),
      leafletAdapter.createLatLng(58.414911, 15.28048),
      leafletAdapter.createLatLng(58.414814, 15.280264),
      leafletAdapter.createLatLng(58.414623, 15.279716),
      leafletAdapter.createLatLng(58.414589, 15.279461),
      leafletAdapter.createLatLng(58.414541, 15.279188),
      leafletAdapter.createLatLng(58.414284, 15.278252),
      leafletAdapter.createLatLng(58.414193, 15.277968),
      leafletAdapter.createLatLng(58.414065, 15.27775),
      leafletAdapter.createLatLng(58.413889, 15.277369),
      leafletAdapter.createLatLng(58.413375, 15.276532),
      leafletAdapter.createLatLng(58.413034, 15.275513),
      leafletAdapter.createLatLng(58.412815, 15.274768),
      leafletAdapter.createLatLng(58.412455, 15.273383),
      leafletAdapter.createLatLng(58.412134, 15.272018),
      leafletAdapter.createLatLng(58.411794, 15.27062),
      leafletAdapter.createLatLng(58.41161, 15.270014),
      leafletAdapter.createLatLng(58.410696, 15.267235),
      leafletAdapter.createLatLng(58.410295, 15.267229),
      leafletAdapter.createLatLng(58.409824, 15.266887),
      leafletAdapter.createLatLng(58.40962, 15.266695),
      leafletAdapter.createLatLng(58.40951, 15.266514),
      leafletAdapter.createLatLng(58.409404, 15.266501),
      leafletAdapter.createLatLng(58.408953, 15.266815),
      leafletAdapter.createLatLng(58.408739, 15.266956),
      leafletAdapter.createLatLng(58.408605, 15.267095),
      leafletAdapter.createLatLng(58.408499, 15.267287),
      leafletAdapter.createLatLng(58.407453, 15.26718),
      leafletAdapter.createLatLng(58.407098, 15.267611),
      leafletAdapter.createLatLng(58.406029, 15.26718),
      leafletAdapter.createLatLng(58.405425, 15.267383),
      leafletAdapter.createLatLng(58.404858, 15.267568),
      leafletAdapter.createLatLng(58.40385, 15.263513),
      leafletAdapter.createLatLng(58.403212, 15.263475),
      leafletAdapter.createLatLng(58.402726, 15.262085),
      leafletAdapter.createLatLng(58.402236, 15.260894),
      leafletAdapter.createLatLng(58.40209, 15.26064),
      leafletAdapter.createLatLng(58.401851, 15.260313),
      leafletAdapter.createLatLng(58.401428, 15.259814),
      leafletAdapter.createLatLng(58.401317, 15.259606),
      leafletAdapter.createLatLng(58.401209, 15.259213),
      leafletAdapter.createLatLng(58.401077, 15.258479),
      leafletAdapter.createLatLng(58.401016, 15.25793),
      leafletAdapter.createLatLng(58.400736, 15.255551),
      leafletAdapter.createLatLng(58.398646, 15.256561),
      leafletAdapter.createLatLng(58.398856, 15.259106),
      leafletAdapter.createLatLng(58.398937, 15.260442),
      leafletAdapter.createLatLng(58.398998, 15.261452),
      leafletAdapter.createLatLng(58.399124, 15.263543),
      leafletAdapter.createLatLng(58.399154, 15.264348),
      leafletAdapter.createLatLng(58.399116, 15.264523),
      leafletAdapter.createLatLng(58.399096, 15.264615),
      leafletAdapter.createLatLng(58.398547, 15.268311),
      leafletAdapter.createLatLng(58.398493, 15.268528),
      leafletAdapter.createLatLng(58.397495, 15.271316),
      leafletAdapter.createLatLng(58.397467, 15.271399),
      leafletAdapter.createLatLng(58.397059, 15.272514),
      leafletAdapter.createLatLng(58.396791, 15.273196),
      leafletAdapter.createLatLng(58.395785, 15.276169),
      leafletAdapter.createLatLng(58.395233, 15.278484),
      leafletAdapter.createLatLng(58.394895, 15.279903),
      leafletAdapter.createLatLng(58.393917, 15.283831),
      leafletAdapter.createLatLng(58.39373, 15.284472),
      leafletAdapter.createLatLng(58.391105, 15.287552),
      leafletAdapter.createLatLng(58.391272, 15.288453),
      leafletAdapter.createLatLng(58.391899, 15.291641),
      leafletAdapter.createLatLng(58.392, 15.292236),
      leafletAdapter.createLatLng(58.393571, 15.299751),
      leafletAdapter.createLatLng(58.39383, 15.301013),
      leafletAdapter.createLatLng(58.393843, 15.301076),
      leafletAdapter.createLatLng(58.395686, 15.307681),
      leafletAdapter.createLatLng(58.395987, 15.308827),
      leafletAdapter.createLatLng(58.396772, 15.312628),
      leafletAdapter.createLatLng(58.39722, 15.312568),
      leafletAdapter.createLatLng(58.397552, 15.312575),
      leafletAdapter.createLatLng(58.397768, 15.312267),
      leafletAdapter.createLatLng(58.39795, 15.311727),
      leafletAdapter.createLatLng(58.398451, 15.311559),
      leafletAdapter.createLatLng(58.398359, 15.318138),
      leafletAdapter.createLatLng(58.398304, 15.322079),
      leafletAdapter.createLatLng(58.397951, 15.322375),
      leafletAdapter.createLatLng(58.397564, 15.322662),
      leafletAdapter.createLatLng(58.397259, 15.322847),
      leafletAdapter.createLatLng(58.39623, 15.323678),
      leafletAdapter.createLatLng(58.396345, 15.324375),
      leafletAdapter.createLatLng(58.396287, 15.324656),
      leafletAdapter.createLatLng(58.396448, 15.326638),
      leafletAdapter.createLatLng(58.395843, 15.326704),
      leafletAdapter.createLatLng(58.395991, 15.330438),
      leafletAdapter.createLatLng(58.396182, 15.33033),
      leafletAdapter.createLatLng(58.396327, 15.332661),
      leafletAdapter.createLatLng(58.396184, 15.332824),
      leafletAdapter.createLatLng(58.396591, 15.341669),
      leafletAdapter.createLatLng(58.395238, 15.344041),
      leafletAdapter.createLatLng(58.394819, 15.344777),
      leafletAdapter.createLatLng(58.39392, 15.346355),
      leafletAdapter.createLatLng(58.391911, 15.348749),
      leafletAdapter.createLatLng(58.389788, 15.351278),
      leafletAdapter.createLatLng(58.389108, 15.352088),
      leafletAdapter.createLatLng(58.385413, 15.350119),
      leafletAdapter.createLatLng(58.384983, 15.34989),
      leafletAdapter.createLatLng(58.383941, 15.349335),
      leafletAdapter.createLatLng(58.383399, 15.349059),
      leafletAdapter.createLatLng(58.382295, 15.348496),
      leafletAdapter.createLatLng(58.381255, 15.347967),
      leafletAdapter.createLatLng(58.380235, 15.347447),
      leafletAdapter.createLatLng(58.379681, 15.347163),
      leafletAdapter.createLatLng(58.376835, 15.345706),
      leafletAdapter.createLatLng(58.376408, 15.345488),
      leafletAdapter.createLatLng(58.376201, 15.345385),
      leafletAdapter.createLatLng(58.375651, 15.345111),
      leafletAdapter.createLatLng(58.374411, 15.344495),
      leafletAdapter.createLatLng(58.374206, 15.344393),
      leafletAdapter.createLatLng(58.374308, 15.343652),
      leafletAdapter.createLatLng(58.374004, 15.343502),
      leafletAdapter.createLatLng(58.373953, 15.343791),
      leafletAdapter.createLatLng(58.372788, 15.342364),
      leafletAdapter.createLatLng(58.372502, 15.342182),
      leafletAdapter.createLatLng(58.37199, 15.342042),
      leafletAdapter.createLatLng(58.371995, 15.34186),
      leafletAdapter.createLatLng(58.371174, 15.341667),
      leafletAdapter.createLatLng(58.371072, 15.340744),
      leafletAdapter.createLatLng(58.372535, 15.340625),
      leafletAdapter.createLatLng(58.372735, 15.33933),
      leafletAdapter.createLatLng(58.373281, 15.339285),
      leafletAdapter.createLatLng(58.373293, 15.340084),
      leafletAdapter.createLatLng(58.374552, 15.339984),
      leafletAdapter.createLatLng(58.374853, 15.339618),
      leafletAdapter.createLatLng(58.374656, 15.335852),
      leafletAdapter.createLatLng(58.370772, 15.335821),
      leafletAdapter.createLatLng(58.368569, 15.334511),
      leafletAdapter.createLatLng(58.365963, 15.341737),
      leafletAdapter.createLatLng(58.365772, 15.341855),
      leafletAdapter.createLatLng(58.365485, 15.341871),
      leafletAdapter.createLatLng(58.364039, 15.341902),
      leafletAdapter.createLatLng(58.363949, 15.341886),
      leafletAdapter.createLatLng(58.363354, 15.341782),
      leafletAdapter.createLatLng(58.362514, 15.341859),
      leafletAdapter.createLatLng(58.362117, 15.341867),
      leafletAdapter.createLatLng(58.361772, 15.341807),
      leafletAdapter.createLatLng(58.361652, 15.341808),
      leafletAdapter.createLatLng(58.36124, 15.341812),
      leafletAdapter.createLatLng(58.361172, 15.341812),
      leafletAdapter.createLatLng(58.360545, 15.341817),
      leafletAdapter.createLatLng(58.360393, 15.341819),
      leafletAdapter.createLatLng(58.359323, 15.341827),
      leafletAdapter.createLatLng(58.35926, 15.341828),
      leafletAdapter.createLatLng(58.358433, 15.341835),
      leafletAdapter.createLatLng(58.357647, 15.341857),
      leafletAdapter.createLatLng(58.356791, 15.341882),
      leafletAdapter.createLatLng(58.355166, 15.340585),
      leafletAdapter.createLatLng(58.352427, 15.338399),
      leafletAdapter.createLatLng(58.352353, 15.338366),
      leafletAdapter.createLatLng(58.352001, 15.338034),
      leafletAdapter.createLatLng(58.351842, 15.337931),
      leafletAdapter.createLatLng(58.351722, 15.337826),
      leafletAdapter.createLatLng(58.351354, 15.336829),
      leafletAdapter.createLatLng(58.351068, 15.33606),
      leafletAdapter.createLatLng(58.350943, 15.335682),
      leafletAdapter.createLatLng(58.350829, 15.335235),
      leafletAdapter.createLatLng(58.350756, 15.334791),
      leafletAdapter.createLatLng(58.350677, 15.334404),
      leafletAdapter.createLatLng(58.350623, 15.334051),
      leafletAdapter.createLatLng(58.35057, 15.333773),
      leafletAdapter.createLatLng(58.350467, 15.333445),
      leafletAdapter.createLatLng(58.350353, 15.333176),
      leafletAdapter.createLatLng(58.350213, 15.332836),
      leafletAdapter.createLatLng(58.350043, 15.332514),
      leafletAdapter.createLatLng(58.349891, 15.332271),
      leafletAdapter.createLatLng(58.349828, 15.332082),
      leafletAdapter.createLatLng(58.349743, 15.331832),
      leafletAdapter.createLatLng(58.349667, 15.33162),
      leafletAdapter.createLatLng(58.349615, 15.331475),
      leafletAdapter.createLatLng(58.349506, 15.331328),
      leafletAdapter.createLatLng(58.349353, 15.331139),
      leafletAdapter.createLatLng(58.349266, 15.331064),
      leafletAdapter.createLatLng(58.349075, 15.331078),
      leafletAdapter.createLatLng(58.348881, 15.331232),
      leafletAdapter.createLatLng(58.34872, 15.331392),
      leafletAdapter.createLatLng(58.348568, 15.331494),
      leafletAdapter.createLatLng(58.348362, 15.33164),
      leafletAdapter.createLatLng(58.34833, 15.332989),
      leafletAdapter.createLatLng(58.348504, 15.333297),
      leafletAdapter.createLatLng(58.348611, 15.333542),
      leafletAdapter.createLatLng(58.348701, 15.33371),
      leafletAdapter.createLatLng(58.348784, 15.333942),
      leafletAdapter.createLatLng(58.348835, 15.334149),
      leafletAdapter.createLatLng(58.348868, 15.334411),
      leafletAdapter.createLatLng(58.348883, 15.334646),
      leafletAdapter.createLatLng(58.348852, 15.334814),
      leafletAdapter.createLatLng(58.348833, 15.335574),
      leafletAdapter.createLatLng(58.348785, 15.336314),
      leafletAdapter.createLatLng(58.348782, 15.336471),
      leafletAdapter.createLatLng(58.348944, 15.336512),
      leafletAdapter.createLatLng(58.349088, 15.33651),
      leafletAdapter.createLatLng(58.349221, 15.336547),
      leafletAdapter.createLatLng(58.349277, 15.336562),
      leafletAdapter.createLatLng(58.349327, 15.336597),
      leafletAdapter.createLatLng(58.349397, 15.3367),
      leafletAdapter.createLatLng(58.349421, 15.336802),
      leafletAdapter.createLatLng(58.349386, 15.336913),
      leafletAdapter.createLatLng(58.349306, 15.336946),
      leafletAdapter.createLatLng(58.349179, 15.336985),
      leafletAdapter.createLatLng(58.349066, 15.33702),
      leafletAdapter.createLatLng(58.349002, 15.337101),
      leafletAdapter.createLatLng(58.348962, 15.337209),
      leafletAdapter.createLatLng(58.348958, 15.337359),
      leafletAdapter.createLatLng(58.349004, 15.337446),
      leafletAdapter.createLatLng(58.349092, 15.337583),
      leafletAdapter.createLatLng(58.349224, 15.337729),
      leafletAdapter.createLatLng(58.34937, 15.337891),
      leafletAdapter.createLatLng(58.349467, 15.338058),
      leafletAdapter.createLatLng(58.349508, 15.338217),
      leafletAdapter.createLatLng(58.34953, 15.338431),
      leafletAdapter.createLatLng(58.349532, 15.338629),
      leafletAdapter.createLatLng(58.349497, 15.339034),
      leafletAdapter.createLatLng(58.349452, 15.339261),
      leafletAdapter.createLatLng(58.349424, 15.339433),
      leafletAdapter.createLatLng(58.349418, 15.339618),
      leafletAdapter.createLatLng(58.349441, 15.339863),
      leafletAdapter.createLatLng(58.349502, 15.340059),
      leafletAdapter.createLatLng(58.349591, 15.340158),
      leafletAdapter.createLatLng(58.349725, 15.340225),
      leafletAdapter.createLatLng(58.349876, 15.340233),
      leafletAdapter.createLatLng(58.349998, 15.340296),
      leafletAdapter.createLatLng(58.350107, 15.340354),
      leafletAdapter.createLatLng(58.350226, 15.340431),
      leafletAdapter.createLatLng(58.350295, 15.340507),
      leafletAdapter.createLatLng(58.35033, 15.340612),
      leafletAdapter.createLatLng(58.350341, 15.340769),
      leafletAdapter.createLatLng(58.350271, 15.341971),
      leafletAdapter.createLatLng(58.35024, 15.342792),
      leafletAdapter.createLatLng(58.350255, 15.343027),
      leafletAdapter.createLatLng(58.350274, 15.343146),
      leafletAdapter.createLatLng(58.350332, 15.343305),
      leafletAdapter.createLatLng(58.350444, 15.343434),
      leafletAdapter.createLatLng(58.350557, 15.343542),
      leafletAdapter.createLatLng(58.35064, 15.343652),
      leafletAdapter.createLatLng(58.350703, 15.343772),
      leafletAdapter.createLatLng(58.350746, 15.343904),
      leafletAdapter.createLatLng(58.350765, 15.344091),
      leafletAdapter.createLatLng(58.350756, 15.344355),
      leafletAdapter.createLatLng(58.350685, 15.344778),
      leafletAdapter.createLatLng(58.350639, 15.345049),
      leafletAdapter.createLatLng(58.350612, 15.345228),
      leafletAdapter.createLatLng(58.350616, 15.345402),
      leafletAdapter.createLatLng(58.350673, 15.345731),
      leafletAdapter.createLatLng(58.35075, 15.346023),
      leafletAdapter.createLatLng(58.350788, 15.346294),
      leafletAdapter.createLatLng(58.350813, 15.346598),
      leafletAdapter.createLatLng(58.350834, 15.34686),
      leafletAdapter.createLatLng(58.350831, 15.347082),
      leafletAdapter.createLatLng(58.350805, 15.347418),
      leafletAdapter.createLatLng(58.350792, 15.34789),
      leafletAdapter.createLatLng(58.350782, 15.348085),
      leafletAdapter.createLatLng(58.350784, 15.348502),
      leafletAdapter.createLatLng(58.350841, 15.349077),
      leafletAdapter.createLatLng(58.350919, 15.349355),
      leafletAdapter.createLatLng(58.35084, 15.349503),
      leafletAdapter.createLatLng(58.35068, 15.349932),
      leafletAdapter.createLatLng(58.350303, 15.350947),
      leafletAdapter.createLatLng(58.348032, 15.357051),
      leafletAdapter.createLatLng(58.344296, 15.367089),
      leafletAdapter.createLatLng(58.343882, 15.367258),
      leafletAdapter.createLatLng(58.343199, 15.367536),
      leafletAdapter.createLatLng(58.338482, 15.369408),
      leafletAdapter.createLatLng(58.335112, 15.366281),
      leafletAdapter.createLatLng(58.332256, 15.363889),
      leafletAdapter.createLatLng(58.332222, 15.363859),
      leafletAdapter.createLatLng(58.33181, 15.363494),
      leafletAdapter.createLatLng(58.331175, 15.362931),
      leafletAdapter.createLatLng(58.330946, 15.362687),
      leafletAdapter.createLatLng(58.328902, 15.362496),
      leafletAdapter.createLatLng(58.328446, 15.362048),
      leafletAdapter.createLatLng(58.328119, 15.361856),
      leafletAdapter.createLatLng(58.327153, 15.360457),
      leafletAdapter.createLatLng(58.3266, 15.360204),
      leafletAdapter.createLatLng(58.325033, 15.359238),
      leafletAdapter.createLatLng(58.324389, 15.359183),
      leafletAdapter.createLatLng(58.324073, 15.359181),
      leafletAdapter.createLatLng(58.323183, 15.358757),
      leafletAdapter.createLatLng(58.322877, 15.358631),
      leafletAdapter.createLatLng(58.322702, 15.358628),
      leafletAdapter.createLatLng(58.32159, 15.358628),
      leafletAdapter.createLatLng(58.321368, 15.358524),
      leafletAdapter.createLatLng(58.320334, 15.358043),
      leafletAdapter.createLatLng(58.31953, 15.357018),
      leafletAdapter.createLatLng(58.318922, 15.355401),
      leafletAdapter.createLatLng(58.31884, 15.354585),
      leafletAdapter.createLatLng(58.318787, 15.354181),
      leafletAdapter.createLatLng(58.318775, 15.35398),
      leafletAdapter.createLatLng(58.318739, 15.353797),
      leafletAdapter.createLatLng(58.318646, 15.353554),
      leafletAdapter.createLatLng(58.318515, 15.353221),
      leafletAdapter.createLatLng(58.318364, 15.352848),
      leafletAdapter.createLatLng(58.318245, 15.352617),
      leafletAdapter.createLatLng(58.318151, 15.352426),
      leafletAdapter.createLatLng(58.318082, 15.352275),
      leafletAdapter.createLatLng(58.317978, 15.352149),
      leafletAdapter.createLatLng(58.317887, 15.352087),
      leafletAdapter.createLatLng(58.317739, 15.351997),
      leafletAdapter.createLatLng(58.317501, 15.351883),
      leafletAdapter.createLatLng(58.317281, 15.351786),
      leafletAdapter.createLatLng(58.317077, 15.351711),
      leafletAdapter.createLatLng(58.316759, 15.35172),
      leafletAdapter.createLatLng(58.316341, 15.351769),
      leafletAdapter.createLatLng(58.315743, 15.351816),
      leafletAdapter.createLatLng(58.3156, 15.351814),
      leafletAdapter.createLatLng(58.31559, 15.351767),
      leafletAdapter.createLatLng(58.315197, 15.349828),
      leafletAdapter.createLatLng(58.315051, 15.349127),
      leafletAdapter.createLatLng(58.314991, 15.348684),
      leafletAdapter.createLatLng(58.31479, 15.346822),
      leafletAdapter.createLatLng(58.312113, 15.348496),
      leafletAdapter.createLatLng(58.311847, 15.347782),
      leafletAdapter.createLatLng(58.311311, 15.345823),
      leafletAdapter.createLatLng(58.311265, 15.345799),
      leafletAdapter.createLatLng(58.310679, 15.345491),
      leafletAdapter.createLatLng(58.310264, 15.345481),
      leafletAdapter.createLatLng(58.308634, 15.345442),
      leafletAdapter.createLatLng(58.307842, 15.345591),
      leafletAdapter.createLatLng(58.307563, 15.34569),
      leafletAdapter.createLatLng(58.307348, 15.345731),
      leafletAdapter.createLatLng(58.307146, 15.345642),
      leafletAdapter.createLatLng(58.306914, 15.345534),
      leafletAdapter.createLatLng(58.306406, 15.345277),
      leafletAdapter.createLatLng(58.303137, 15.343625),
      leafletAdapter.createLatLng(58.302426, 15.344112),
      leafletAdapter.createLatLng(58.302187, 15.342554),
      leafletAdapter.createLatLng(58.301872, 15.341833),
      leafletAdapter.createLatLng(58.302025, 15.341141),
      leafletAdapter.createLatLng(58.301964, 15.340838),
      leafletAdapter.createLatLng(58.301024, 15.341329),
      leafletAdapter.createLatLng(58.301857, 15.344689),
      leafletAdapter.createLatLng(58.301593, 15.345004),
      leafletAdapter.createLatLng(58.300725, 15.344332),
      leafletAdapter.createLatLng(58.298638, 15.342714),
      leafletAdapter.createLatLng(58.297706, 15.341993),
      leafletAdapter.createLatLng(58.297139, 15.34173),
      leafletAdapter.createLatLng(58.295814, 15.341162),
      leafletAdapter.createLatLng(58.294335, 15.340528),
      leafletAdapter.createLatLng(58.293804, 15.340545),
      leafletAdapter.createLatLng(58.293173, 15.340511),
      leafletAdapter.createLatLng(58.292932, 15.340499),
      leafletAdapter.createLatLng(58.2927, 15.340735),
      leafletAdapter.createLatLng(58.292625, 15.340794),
      leafletAdapter.createLatLng(58.292461, 15.340623),
      leafletAdapter.createLatLng(58.29237, 15.340785),
      leafletAdapter.createLatLng(58.290409, 15.3386),
      leafletAdapter.createLatLng(58.290256, 15.338399),
      leafletAdapter.createLatLng(58.289998, 15.338061),
      leafletAdapter.createLatLng(58.289507, 15.33937),
      leafletAdapter.createLatLng(58.289178, 15.339541),
      leafletAdapter.createLatLng(58.289114, 15.339575),
      leafletAdapter.createLatLng(58.288389, 15.339953),
      leafletAdapter.createLatLng(58.288399, 15.340137),
      leafletAdapter.createLatLng(58.287842, 15.34191),
      leafletAdapter.createLatLng(58.287692, 15.342742),
      leafletAdapter.createLatLng(58.286119, 15.344325),
      leafletAdapter.createLatLng(58.286023, 15.344204),
      leafletAdapter.createLatLng(58.285323, 15.345066),
      leafletAdapter.createLatLng(58.285112, 15.345179),
      leafletAdapter.createLatLng(58.284888, 15.345384),
      leafletAdapter.createLatLng(58.284704, 15.345553),
      leafletAdapter.createLatLng(58.284578, 15.345665),
      leafletAdapter.createLatLng(58.284391, 15.34583),
      leafletAdapter.createLatLng(58.283947, 15.346224),
      leafletAdapter.createLatLng(58.283615, 15.346518),
      leafletAdapter.createLatLng(58.283384, 15.346748),
      leafletAdapter.createLatLng(58.283093, 15.34694),
      leafletAdapter.createLatLng(58.282844, 15.347078),
      leafletAdapter.createLatLng(58.282745, 15.347127),
      leafletAdapter.createLatLng(58.282616, 15.347133),
      leafletAdapter.createLatLng(58.28257, 15.34726),
      leafletAdapter.createLatLng(58.282517, 15.347506),
      leafletAdapter.createLatLng(58.282496, 15.347606),
      leafletAdapter.createLatLng(58.282419, 15.347689),
      leafletAdapter.createLatLng(58.282231, 15.347836),
      leafletAdapter.createLatLng(58.282032, 15.347958),
      leafletAdapter.createLatLng(58.281938, 15.347996),
      leafletAdapter.createLatLng(58.281864, 15.348026),
      leafletAdapter.createLatLng(58.281401, 15.348137),
      leafletAdapter.createLatLng(58.281164, 15.348219),
      leafletAdapter.createLatLng(58.280933, 15.348271),
      leafletAdapter.createLatLng(58.280734, 15.348302),
      leafletAdapter.createLatLng(58.280477, 15.348293),
      leafletAdapter.createLatLng(58.280167, 15.348203),
      leafletAdapter.createLatLng(58.280052, 15.348171),
      leafletAdapter.createLatLng(58.279943, 15.348173),
      leafletAdapter.createLatLng(58.279739, 15.348071),
      leafletAdapter.createLatLng(58.279556, 15.347958),
      leafletAdapter.createLatLng(58.279442, 15.347878),
      leafletAdapter.createLatLng(58.279368, 15.347839),
      leafletAdapter.createLatLng(58.279169, 15.347822),
      leafletAdapter.createLatLng(58.279015, 15.347862),
      leafletAdapter.createLatLng(58.278864, 15.347909),
      leafletAdapter.createLatLng(58.27843, 15.347726),
      leafletAdapter.createLatLng(58.278167, 15.34758),
      leafletAdapter.createLatLng(58.278067, 15.347534),
      leafletAdapter.createLatLng(58.277989, 15.347461),
      leafletAdapter.createLatLng(58.27754, 15.347503),
      leafletAdapter.createLatLng(58.277478, 15.347616),
      leafletAdapter.createLatLng(58.277434, 15.347754),
      leafletAdapter.createLatLng(58.277378, 15.347871),
      leafletAdapter.createLatLng(58.277255, 15.347924),
      leafletAdapter.createLatLng(58.276979, 15.348011),
      leafletAdapter.createLatLng(58.276769, 15.3481),
      leafletAdapter.createLatLng(58.276593, 15.34815),
      leafletAdapter.createLatLng(58.274468, 15.349477),
      leafletAdapter.createLatLng(58.273412, 15.350795),
      leafletAdapter.createLatLng(58.272727, 15.352713),
      leafletAdapter.createLatLng(58.272285, 15.354316),
      leafletAdapter.createLatLng(58.272141, 15.354158),
      leafletAdapter.createLatLng(58.268854, 15.357008),
      leafletAdapter.createLatLng(58.267258, 15.358393),
      leafletAdapter.createLatLng(58.267193, 15.358462),
      leafletAdapter.createLatLng(58.266886, 15.35873),
      leafletAdapter.createLatLng(58.264298, 15.360987),
      leafletAdapter.createLatLng(58.263179, 15.361963),
      leafletAdapter.createLatLng(58.263133, 15.362003),
      leafletAdapter.createLatLng(58.262822, 15.362252),
      leafletAdapter.createLatLng(58.262731, 15.362324),
      leafletAdapter.createLatLng(58.262705, 15.362354),
      leafletAdapter.createLatLng(58.25771, 15.368034),
      leafletAdapter.createLatLng(58.256903, 15.368568),
      leafletAdapter.createLatLng(58.255192, 15.3697),
      leafletAdapter.createLatLng(58.254967, 15.369822),
      leafletAdapter.createLatLng(58.253723, 15.370494),
      leafletAdapter.createLatLng(58.253574, 15.370575),
      leafletAdapter.createLatLng(58.250252, 15.369708),
      leafletAdapter.createLatLng(58.249207, 15.369436),
      leafletAdapter.createLatLng(58.248502, 15.369252),
      leafletAdapter.createLatLng(58.24839, 15.369221),
      leafletAdapter.createLatLng(58.248046, 15.369227),
      leafletAdapter.createLatLng(58.247271, 15.369239),
      leafletAdapter.createLatLng(58.246127, 15.369257),
      leafletAdapter.createLatLng(58.242153, 15.368372),
      leafletAdapter.createLatLng(58.237085, 15.367842),
      leafletAdapter.createLatLng(58.236296, 15.366605),
      leafletAdapter.createLatLng(58.236209, 15.366469),
      leafletAdapter.createLatLng(58.233822, 15.362728),
      leafletAdapter.createLatLng(58.23246, 15.36171),
      leafletAdapter.createLatLng(58.2324, 15.361665),
      leafletAdapter.createLatLng(58.230986, 15.360608),
      leafletAdapter.createLatLng(58.228827, 15.368579),
      leafletAdapter.createLatLng(58.228024, 15.36849),
      leafletAdapter.createLatLng(58.227924, 15.368459),
      leafletAdapter.createLatLng(58.224224, 15.367278),
      leafletAdapter.createLatLng(58.222137, 15.36846),
      leafletAdapter.createLatLng(58.221916, 15.368587),
      leafletAdapter.createLatLng(58.221778, 15.368792),
      leafletAdapter.createLatLng(58.221148, 15.369734),
      leafletAdapter.createLatLng(58.21994, 15.371536),
      leafletAdapter.createLatLng(58.217872, 15.371605),
      leafletAdapter.createLatLng(58.215994, 15.371666),
      leafletAdapter.createLatLng(58.214844, 15.371672),
      leafletAdapter.createLatLng(58.214332, 15.371964),
      leafletAdapter.createLatLng(58.213469, 15.372707),
      leafletAdapter.createLatLng(58.212883, 15.373105),
      leafletAdapter.createLatLng(58.212574, 15.373296),
      leafletAdapter.createLatLng(58.211279, 15.373579),
      leafletAdapter.createLatLng(58.211186, 15.373635),
      leafletAdapter.createLatLng(58.211126, 15.373671),
      leafletAdapter.createLatLng(58.210388, 15.374114),
      leafletAdapter.createLatLng(58.209823, 15.375312),
      leafletAdapter.createLatLng(58.207442, 15.376431),
      leafletAdapter.createLatLng(58.203311, 15.374155),
      leafletAdapter.createLatLng(58.201519, 15.373133),
      leafletAdapter.createLatLng(58.198556, 15.371489),
      leafletAdapter.createLatLng(58.197628, 15.370974),
      leafletAdapter.createLatLng(58.197381, 15.370835),
      leafletAdapter.createLatLng(58.197097, 15.370698),
      leafletAdapter.createLatLng(58.19699, 15.370677),
      leafletAdapter.createLatLng(58.196909, 15.370679),
      leafletAdapter.createLatLng(58.196793, 15.370726),
      leafletAdapter.createLatLng(58.196559, 15.371135),
      leafletAdapter.createLatLng(58.196354, 15.371354),
      leafletAdapter.createLatLng(58.196229, 15.37146),
      leafletAdapter.createLatLng(58.19547, 15.372001),
      leafletAdapter.createLatLng(58.194228, 15.372867),
      leafletAdapter.createLatLng(58.193089, 15.37523),
      leafletAdapter.createLatLng(58.193017, 15.375312),
      leafletAdapter.createLatLng(58.192988, 15.375318),
      leafletAdapter.createLatLng(58.192936, 15.375304),
      leafletAdapter.createLatLng(58.192888, 15.375235),
      leafletAdapter.createLatLng(58.192848, 15.375087),
      leafletAdapter.createLatLng(58.192798, 15.37489),
      leafletAdapter.createLatLng(58.192726, 15.374659),
      leafletAdapter.createLatLng(58.192648, 15.374483),
      leafletAdapter.createLatLng(58.192536, 15.374326),
      leafletAdapter.createLatLng(58.192387, 15.374128),
      leafletAdapter.createLatLng(58.192199, 15.373924),
      leafletAdapter.createLatLng(58.191916, 15.373692),
      leafletAdapter.createLatLng(58.191454, 15.373304),
      leafletAdapter.createLatLng(58.191281, 15.373093),
      leafletAdapter.createLatLng(58.191187, 15.372948),
      leafletAdapter.createLatLng(58.191104, 15.3728),
      leafletAdapter.createLatLng(58.191004, 15.372615),
      leafletAdapter.createLatLng(58.190946, 15.372445),
      leafletAdapter.createLatLng(58.190873, 15.372262),
      leafletAdapter.createLatLng(58.190819, 15.37218),
      leafletAdapter.createLatLng(58.190793, 15.372138),
      leafletAdapter.createLatLng(58.190746, 15.372113),
      leafletAdapter.createLatLng(58.190632, 15.372045),
      leafletAdapter.createLatLng(58.190542, 15.372043),
      leafletAdapter.createLatLng(58.190239, 15.372109),
      leafletAdapter.createLatLng(58.18977, 15.372313),
      leafletAdapter.createLatLng(58.189414, 15.3725),
      leafletAdapter.createLatLng(58.189222, 15.372654),
      leafletAdapter.createLatLng(58.189047, 15.372818),
      leafletAdapter.createLatLng(58.188879, 15.372991),
      leafletAdapter.createLatLng(58.188618, 15.37304),
      leafletAdapter.createLatLng(58.188408, 15.37308),
      leafletAdapter.createLatLng(58.188383, 15.373084),
      leafletAdapter.createLatLng(58.188281, 15.37309),
      leafletAdapter.createLatLng(58.188173, 15.373127),
      leafletAdapter.createLatLng(58.18809, 15.373176),
      leafletAdapter.createLatLng(58.187996, 15.373253),
      leafletAdapter.createLatLng(58.187928, 15.373417),
      leafletAdapter.createLatLng(58.187894, 15.37363),
      leafletAdapter.createLatLng(58.187857, 15.37378),
      leafletAdapter.createLatLng(58.187852, 15.373799),
      leafletAdapter.createLatLng(58.18778, 15.373997),
      leafletAdapter.createLatLng(58.187387, 15.374966),
      leafletAdapter.createLatLng(58.18716, 15.375047),
      leafletAdapter.createLatLng(58.187068, 15.375117),
      leafletAdapter.createLatLng(58.187022, 15.375137),
      leafletAdapter.createLatLng(58.186966, 15.37513),
      leafletAdapter.createLatLng(58.186875, 15.375088),
      leafletAdapter.createLatLng(58.186797, 15.375018),
      leafletAdapter.createLatLng(58.186702, 15.374907),
      leafletAdapter.createLatLng(58.186526, 15.374584),
      leafletAdapter.createLatLng(58.186462, 15.374527),
      leafletAdapter.createLatLng(58.186411, 15.374479),
      leafletAdapter.createLatLng(58.186333, 15.374449),
      leafletAdapter.createLatLng(58.186225, 15.374445),
      leafletAdapter.createLatLng(58.186141, 15.37443),
      leafletAdapter.createLatLng(58.186034, 15.374388),
      leafletAdapter.createLatLng(58.185981, 15.37433),
      leafletAdapter.createLatLng(58.185711, 15.37407),
      leafletAdapter.createLatLng(58.185486, 15.373746),
      leafletAdapter.createLatLng(58.185384, 15.373644),
      leafletAdapter.createLatLng(58.185298, 15.37357),
      leafletAdapter.createLatLng(58.185192, 15.373576),
      leafletAdapter.createLatLng(58.185134, 15.373638),
      leafletAdapter.createLatLng(58.185063, 15.373683),
      leafletAdapter.createLatLng(58.184984, 15.373697),
      leafletAdapter.createLatLng(58.184898, 15.373692),
      leafletAdapter.createLatLng(58.184831, 15.373672),
      leafletAdapter.createLatLng(58.184778, 15.373634),
      leafletAdapter.createLatLng(58.184701, 15.37354),
      leafletAdapter.createLatLng(58.18466, 15.373427),
      leafletAdapter.createLatLng(58.184625, 15.373283),
      leafletAdapter.createLatLng(58.184832, 15.371934),
      leafletAdapter.createLatLng(58.1854, 15.371087),
      leafletAdapter.createLatLng(58.184804, 15.370009),
      leafletAdapter.createLatLng(58.184282, 15.36905),
      leafletAdapter.createLatLng(58.184, 15.368516),
      leafletAdapter.createLatLng(58.18351, 15.367591),
      leafletAdapter.createLatLng(58.182139, 15.366136),
      leafletAdapter.createLatLng(58.181961, 15.366453),
      leafletAdapter.createLatLng(58.18188, 15.366577),
      leafletAdapter.createLatLng(58.181743, 15.366609),
      leafletAdapter.createLatLng(58.181388, 15.366624),
      leafletAdapter.createLatLng(58.180397, 15.368055),
      leafletAdapter.createLatLng(58.179469, 15.368368),
      leafletAdapter.createLatLng(58.178133, 15.369814),
      leafletAdapter.createLatLng(58.177869, 15.370077),
      leafletAdapter.createLatLng(58.177727, 15.371527),
      leafletAdapter.createLatLng(58.177808, 15.371751),
      leafletAdapter.createLatLng(58.177866, 15.371951),
      leafletAdapter.createLatLng(58.177909, 15.372095),
      leafletAdapter.createLatLng(58.177944, 15.372233),
      leafletAdapter.createLatLng(58.177947, 15.372328),
      leafletAdapter.createLatLng(58.177909, 15.372442),
      leafletAdapter.createLatLng(58.177836, 15.372566),
      leafletAdapter.createLatLng(58.177754, 15.372713),
      leafletAdapter.createLatLng(58.17767, 15.37283),
      leafletAdapter.createLatLng(58.177554, 15.372891),
      leafletAdapter.createLatLng(58.177361, 15.372991),
      leafletAdapter.createLatLng(58.175689, 15.373935),
      leafletAdapter.createLatLng(58.175455, 15.374031),
      leafletAdapter.createLatLng(58.174311, 15.3744),
      leafletAdapter.createLatLng(58.173124, 15.374427),
      leafletAdapter.createLatLng(58.17299, 15.37443),
      leafletAdapter.createLatLng(58.172502, 15.37437),
      leafletAdapter.createLatLng(58.171973, 15.374466),
      leafletAdapter.createLatLng(58.171394, 15.374571),
      leafletAdapter.createLatLng(58.171166, 15.374612),
      leafletAdapter.createLatLng(58.170516, 15.374259),
      leafletAdapter.createLatLng(58.170025, 15.374368),
      leafletAdapter.createLatLng(58.169567, 15.374469),
      leafletAdapter.createLatLng(58.168925, 15.374758),
      leafletAdapter.createLatLng(58.166861, 15.375906),
      leafletAdapter.createLatLng(58.165845, 15.373683),
      leafletAdapter.createLatLng(58.16402, 15.371567),
      leafletAdapter.createLatLng(58.163506, 15.370971),
      leafletAdapter.createLatLng(58.16301, 15.365711),
      leafletAdapter.createLatLng(58.16297, 15.365286),
      leafletAdapter.createLatLng(58.162748, 15.362937),
      leafletAdapter.createLatLng(58.162471, 15.360005),
      leafletAdapter.createLatLng(58.162041, 15.357609),
      leafletAdapter.createLatLng(58.161871, 15.357288),
      leafletAdapter.createLatLng(58.159193, 15.352217),
      leafletAdapter.createLatLng(58.157724, 15.345303),
      leafletAdapter.createLatLng(58.157507, 15.344725),
      leafletAdapter.createLatLng(58.157422, 15.344499),
      leafletAdapter.createLatLng(58.157274, 15.344105),
      leafletAdapter.createLatLng(58.15705, 15.343878),
      leafletAdapter.createLatLng(58.156769, 15.343593),
      leafletAdapter.createLatLng(58.153048, 15.339824),
      leafletAdapter.createLatLng(58.151542, 15.339081),
      leafletAdapter.createLatLng(58.150267, 15.338451),
      leafletAdapter.createLatLng(58.14984, 15.338151),
      leafletAdapter.createLatLng(58.149412, 15.337849),
      leafletAdapter.createLatLng(58.146984, 15.33614),
      leafletAdapter.createLatLng(58.144066, 15.329674),
      leafletAdapter.createLatLng(58.144054, 15.329674),
      leafletAdapter.createLatLng(58.144744, 15.329239),
      leafletAdapter.createLatLng(58.144133, 15.328622),
      leafletAdapter.createLatLng(58.143422, 15.327753),
      leafletAdapter.createLatLng(58.142904, 15.327558),
      leafletAdapter.createLatLng(58.141887, 15.316681),
      leafletAdapter.createLatLng(58.141872, 15.316517),
      leafletAdapter.createLatLng(58.141577, 15.312904),
      leafletAdapter.createLatLng(58.141451, 15.311485),
      leafletAdapter.createLatLng(58.141256, 15.309994),
      leafletAdapter.createLatLng(58.140686, 15.307811),
      leafletAdapter.createLatLng(58.139803, 15.304469),
      leafletAdapter.createLatLng(58.139617, 15.303766),
      leafletAdapter.createLatLng(58.138989, 15.301374),
      leafletAdapter.createLatLng(58.138873, 15.300934),
      leafletAdapter.createLatLng(58.137724, 15.296566),
      leafletAdapter.createLatLng(58.137696, 15.296461),
      leafletAdapter.createLatLng(58.137689, 15.29643),
      leafletAdapter.createLatLng(58.137188, 15.295912),
      leafletAdapter.createLatLng(58.137079, 15.294222),
      leafletAdapter.createLatLng(58.136845, 15.290626),
      leafletAdapter.createLatLng(58.136607, 15.286966),
      leafletAdapter.createLatLng(58.13532, 15.281394),
      leafletAdapter.createLatLng(58.135144, 15.280635),
      leafletAdapter.createLatLng(58.134568, 15.278142),
      leafletAdapter.createLatLng(58.134539, 15.277991),
      leafletAdapter.createLatLng(58.13442, 15.277865),
      leafletAdapter.createLatLng(58.133629, 15.27796),
      leafletAdapter.createLatLng(58.133142, 15.278288),
      leafletAdapter.createLatLng(58.131438, 15.279517),
      leafletAdapter.createLatLng(58.131127, 15.279601),
      leafletAdapter.createLatLng(58.130759, 15.279521),
      leafletAdapter.createLatLng(58.127742, 15.279636),
      leafletAdapter.createLatLng(58.124979, 15.27965),
      leafletAdapter.createLatLng(58.117179, 15.28524),
      leafletAdapter.createLatLng(58.115386, 15.285815),
      leafletAdapter.createLatLng(58.112894, 15.286056),
      leafletAdapter.createLatLng(58.112496, 15.286401),
      leafletAdapter.createLatLng(58.104466, 15.293378),
      leafletAdapter.createLatLng(58.10281, 15.295232),
      leafletAdapter.createLatLng(58.102608, 15.295459),
      leafletAdapter.createLatLng(58.103062, 15.300189),
      leafletAdapter.createLatLng(58.104074, 15.310748),
      leafletAdapter.createLatLng(58.102213, 15.320367),
      leafletAdapter.createLatLng(58.102209, 15.320388),
      leafletAdapter.createLatLng(58.101729, 15.322887),
      leafletAdapter.createLatLng(58.101703, 15.323007),
      leafletAdapter.createLatLng(58.101483, 15.324145),
      leafletAdapter.createLatLng(58.101474, 15.324189),
      leafletAdapter.createLatLng(58.101395, 15.324597),
      leafletAdapter.createLatLng(58.101351, 15.324826),
      leafletAdapter.createLatLng(58.100444, 15.329513),
      leafletAdapter.createLatLng(58.101046, 15.336733),
      leafletAdapter.createLatLng(58.101233, 15.338975),
      leafletAdapter.createLatLng(58.102682, 15.347804),
      leafletAdapter.createLatLng(58.10269, 15.347853),
      leafletAdapter.createLatLng(58.102817, 15.348775),
      leafletAdapter.createLatLng(58.101825, 15.349616),
      leafletAdapter.createLatLng(58.101538, 15.349632),
      leafletAdapter.createLatLng(58.100754, 15.349399),
      leafletAdapter.createLatLng(58.098121, 15.350573),
      leafletAdapter.createLatLng(58.097932, 15.349967),
      leafletAdapter.createLatLng(58.09779, 15.349255),
      leafletAdapter.createLatLng(58.096248, 15.347746),
      leafletAdapter.createLatLng(58.094655, 15.346186),
      leafletAdapter.createLatLng(58.090421, 15.346267),
      leafletAdapter.createLatLng(58.083694, 15.344528),
      leafletAdapter.createLatLng(58.083408, 15.355412),
      leafletAdapter.createLatLng(58.083392, 15.35601),
      leafletAdapter.createLatLng(58.083147, 15.357156),
      leafletAdapter.createLatLng(58.082454, 15.360573),
      leafletAdapter.createLatLng(58.081283, 15.366348),
      leafletAdapter.createLatLng(58.078726, 15.378958),
      leafletAdapter.createLatLng(58.076611, 15.378548),
      leafletAdapter.createLatLng(58.072419, 15.377736),
      leafletAdapter.createLatLng(58.071421, 15.377834),
      leafletAdapter.createLatLng(58.068003, 15.378168),
      leafletAdapter.createLatLng(58.067209, 15.378274),
      leafletAdapter.createLatLng(58.066803, 15.378302),
      leafletAdapter.createLatLng(58.063272, 15.378992),
      leafletAdapter.createLatLng(58.063071, 15.381675),
      leafletAdapter.createLatLng(58.06299, 15.382759),
      leafletAdapter.createLatLng(58.062928, 15.383865),
      leafletAdapter.createLatLng(58.063123, 15.387801),
      leafletAdapter.createLatLng(58.063153, 15.388405),
      leafletAdapter.createLatLng(58.063927, 15.392555),
      leafletAdapter.createLatLng(58.064263, 15.395726),
      leafletAdapter.createLatLng(58.06431, 15.396173),
      leafletAdapter.createLatLng(58.064577, 15.398685),
      leafletAdapter.createLatLng(58.064725, 15.400851),
      leafletAdapter.createLatLng(58.064723, 15.400899),
      leafletAdapter.createLatLng(58.064803, 15.401626),
      leafletAdapter.createLatLng(58.064969, 15.403125),
      leafletAdapter.createLatLng(58.065139, 15.404664),
      leafletAdapter.createLatLng(58.065593, 15.408784),
      leafletAdapter.createLatLng(58.06579, 15.410659),
      leafletAdapter.createLatLng(58.065979, 15.412367),
      leafletAdapter.createLatLng(58.066133, 15.413717),
      leafletAdapter.createLatLng(58.066164, 15.414084),
      leafletAdapter.createLatLng(58.066178, 15.414245),
      leafletAdapter.createLatLng(58.066181, 15.414453),
      leafletAdapter.createLatLng(58.066229, 15.416823),
      leafletAdapter.createLatLng(58.06737, 15.415702),
      leafletAdapter.createLatLng(58.067501, 15.415546),
      leafletAdapter.createLatLng(58.069745, 15.41686),
      leafletAdapter.createLatLng(58.06991, 15.416956),
      leafletAdapter.createLatLng(58.070282, 15.417703),
      leafletAdapter.createLatLng(58.074721, 15.426617),
      leafletAdapter.createLatLng(58.075884, 15.428953),
      leafletAdapter.createLatLng(58.075959, 15.429738),
      leafletAdapter.createLatLng(58.076333, 15.433665),
      leafletAdapter.createLatLng(58.076363, 15.433979),
      leafletAdapter.createLatLng(58.076665, 15.434769),
      leafletAdapter.createLatLng(58.080839, 15.433912),
      leafletAdapter.createLatLng(58.081991, 15.432441),
      leafletAdapter.createLatLng(58.083138, 15.433146),
      leafletAdapter.createLatLng(58.083281, 15.433182),
      leafletAdapter.createLatLng(58.083392, 15.433211),
      leafletAdapter.createLatLng(58.085471, 15.434069),
      leafletAdapter.createLatLng(58.086545, 15.434477),
      leafletAdapter.createLatLng(58.087891, 15.434989),
      leafletAdapter.createLatLng(58.08697, 15.441956),
      leafletAdapter.createLatLng(58.088799, 15.454223),
      leafletAdapter.createLatLng(58.08345, 15.453425),
      leafletAdapter.createLatLng(58.082302, 15.453258),
      leafletAdapter.createLatLng(58.081559, 15.45315),
      leafletAdapter.createLatLng(58.072629, 15.451848),
      leafletAdapter.createLatLng(58.072485, 15.451686),
      leafletAdapter.createLatLng(58.072373, 15.451852),
      leafletAdapter.createLatLng(58.072282, 15.452582),
      leafletAdapter.createLatLng(58.072413, 15.452732),
      leafletAdapter.createLatLng(58.072424, 15.45315),
      leafletAdapter.createLatLng(58.072333, 15.453665),
      leafletAdapter.createLatLng(58.072152, 15.454095),
      leafletAdapter.createLatLng(58.071948, 15.454137),
      leafletAdapter.createLatLng(58.071737, 15.454443),
      leafletAdapter.createLatLng(58.071721, 15.45535),
      leafletAdapter.createLatLng(58.071804, 15.455834),
      leafletAdapter.createLatLng(58.071839, 15.456031),
      leafletAdapter.createLatLng(58.072095, 15.456852),
      leafletAdapter.createLatLng(58.072271, 15.457093),
      leafletAdapter.createLatLng(58.071971, 15.460306),
      leafletAdapter.createLatLng(58.071834, 15.461755),
      leafletAdapter.createLatLng(58.071407, 15.466551),
      leafletAdapter.createLatLng(58.072267, 15.468793),
      leafletAdapter.createLatLng(58.075105, 15.47628),
      leafletAdapter.createLatLng(58.075187, 15.476593),
      leafletAdapter.createLatLng(58.075896, 15.479289),
      leafletAdapter.createLatLng(58.076026, 15.479439),
      leafletAdapter.createLatLng(58.076233, 15.479984),
      leafletAdapter.createLatLng(58.076373, 15.480465),
      leafletAdapter.createLatLng(58.076489, 15.480804),
      leafletAdapter.createLatLng(58.076501, 15.481287),
      leafletAdapter.createLatLng(58.076815, 15.483341),
      leafletAdapter.createLatLng(58.079712, 15.49533),
      leafletAdapter.createLatLng(58.083568, 15.49916),
      leafletAdapter.createLatLng(58.086733, 15.502662),
      leafletAdapter.createLatLng(58.08718, 15.503157),
      leafletAdapter.createLatLng(58.08721, 15.503252),
      leafletAdapter.createLatLng(58.08744, 15.504041),
      leafletAdapter.createLatLng(58.090208, 15.513496),
      leafletAdapter.createLatLng(58.091992, 15.512047),
      leafletAdapter.createLatLng(58.093218, 15.511052),
      leafletAdapter.createLatLng(58.103525, 15.515444),
      leafletAdapter.createLatLng(58.106532, 15.514818),
      leafletAdapter.createLatLng(58.108668, 15.51082),
      leafletAdapter.createLatLng(58.111366, 15.510552),
      leafletAdapter.createLatLng(58.112785, 15.509938),
      leafletAdapter.createLatLng(58.114207, 15.511034),
      leafletAdapter.createLatLng(58.117386, 15.510343),
      leafletAdapter.createLatLng(58.118942, 15.511342),
      leafletAdapter.createLatLng(58.119482, 15.514995),
      leafletAdapter.createLatLng(58.120397, 15.515628),
      leafletAdapter.createLatLng(58.120639, 15.515918),
      leafletAdapter.createLatLng(58.120885, 15.516214),
      leafletAdapter.createLatLng(58.126621, 15.523096),
      leafletAdapter.createLatLng(58.127113, 15.523687),
      leafletAdapter.createLatLng(58.127576, 15.524243),
      leafletAdapter.createLatLng(58.12789, 15.524619),
      leafletAdapter.createLatLng(58.12852, 15.525376),
      leafletAdapter.createLatLng(58.133979, 15.531923),
      leafletAdapter.createLatLng(58.136823, 15.535337),
      leafletAdapter.createLatLng(58.137002, 15.53555),
      leafletAdapter.createLatLng(58.137338, 15.535954),
      leafletAdapter.createLatLng(58.138317, 15.537128),
      leafletAdapter.createLatLng(58.138637, 15.537872),
      leafletAdapter.createLatLng(58.14217, 15.546091),
      leafletAdapter.createLatLng(58.142795, 15.547544),
      leafletAdapter.createLatLng(58.14286, 15.549552),
      leafletAdapter.createLatLng(58.142891, 15.550513),
      leafletAdapter.createLatLng(58.142936, 15.551674),
      leafletAdapter.createLatLng(58.142956, 15.553015),
      leafletAdapter.createLatLng(58.143124, 15.553059),
      leafletAdapter.createLatLng(58.148814, 15.554523),
      leafletAdapter.createLatLng(58.150152, 15.554867),
      leafletAdapter.createLatLng(58.150975, 15.555047),
      leafletAdapter.createLatLng(58.151714, 15.555208),
      leafletAdapter.createLatLng(58.153825, 15.555668),
      leafletAdapter.createLatLng(58.155861, 15.556111),
      leafletAdapter.createLatLng(58.155862, 15.556112),
      leafletAdapter.createLatLng(58.155959, 15.556138),
      leafletAdapter.createLatLng(58.159837, 15.556987),
      leafletAdapter.createLatLng(58.159914, 15.557004),
      leafletAdapter.createLatLng(58.160927, 15.557226),
      leafletAdapter.createLatLng(58.161019, 15.557246),
      leafletAdapter.createLatLng(58.161204, 15.557286),
      leafletAdapter.createLatLng(58.161664, 15.557364),
      leafletAdapter.createLatLng(58.163301, 15.55764),
      leafletAdapter.createLatLng(58.167334, 15.557351),
      leafletAdapter.createLatLng(58.170541, 15.557121),
      leafletAdapter.createLatLng(58.173104, 15.556664),
      leafletAdapter.createLatLng(58.173477, 15.556648),
      leafletAdapter.createLatLng(58.173685, 15.556626),
      leafletAdapter.createLatLng(58.173983, 15.556567),
      leafletAdapter.createLatLng(58.174402, 15.556438),
      leafletAdapter.createLatLng(58.175077, 15.556209),
      leafletAdapter.createLatLng(58.175625, 15.556137),
      leafletAdapter.createLatLng(58.175656, 15.556133),
      leafletAdapter.createLatLng(58.176821, 15.556017),
      leafletAdapter.createLatLng(58.17713, 15.55599),
      leafletAdapter.createLatLng(58.177718, 15.555939),
      leafletAdapter.createLatLng(58.177735, 15.555937),
      leafletAdapter.createLatLng(58.177851, 15.555927),
      leafletAdapter.createLatLng(58.178895, 15.555828),
      leafletAdapter.createLatLng(58.178934, 15.555824),
      leafletAdapter.createLatLng(58.180136, 15.555749),
      leafletAdapter.createLatLng(58.181631, 15.555718),
      leafletAdapter.createLatLng(58.183195, 15.555639),
      leafletAdapter.createLatLng(58.185677, 15.555476),
      leafletAdapter.createLatLng(58.185694, 15.555475),
      leafletAdapter.createLatLng(58.185823, 15.555649),
      leafletAdapter.createLatLng(58.186364, 15.554375),
      leafletAdapter.createLatLng(58.186628, 15.554803),
      leafletAdapter.createLatLng(58.186941, 15.554417),
      leafletAdapter.createLatLng(58.187131, 15.555496),
      leafletAdapter.createLatLng(58.18807, 15.555395),
      leafletAdapter.createLatLng(58.189074, 15.555281),
      leafletAdapter.createLatLng(58.190234, 15.555162),
      leafletAdapter.createLatLng(58.191055, 15.555091),
      leafletAdapter.createLatLng(58.191813, 15.555002),
      leafletAdapter.createLatLng(58.193883, 15.555634),
      leafletAdapter.createLatLng(58.198245, 15.557731),
      leafletAdapter.createLatLng(58.198419, 15.5583),
      leafletAdapter.createLatLng(58.198812, 15.55873),
      leafletAdapter.createLatLng(58.198811, 15.558735),
      leafletAdapter.createLatLng(58.199485, 15.559478),
      leafletAdapter.createLatLng(58.199777, 15.559664),
      leafletAdapter.createLatLng(58.200691, 15.560273),
      leafletAdapter.createLatLng(58.200888, 15.560404),
      leafletAdapter.createLatLng(58.201735, 15.560989),
      leafletAdapter.createLatLng(58.203848, 15.562435),
      leafletAdapter.createLatLng(58.204165, 15.562666),
      leafletAdapter.createLatLng(58.203862, 15.562915),
      leafletAdapter.createLatLng(58.202848, 15.563793),
      leafletAdapter.createLatLng(58.202614, 15.563958),
      leafletAdapter.createLatLng(58.202382, 15.564095),
      leafletAdapter.createLatLng(58.20219, 15.564185),
      leafletAdapter.createLatLng(58.20202, 15.564248),
      leafletAdapter.createLatLng(58.201853, 15.564267),
      leafletAdapter.createLatLng(58.201666, 15.564232),
      leafletAdapter.createLatLng(58.201136, 15.563999),
      leafletAdapter.createLatLng(58.200975, 15.56395),
      leafletAdapter.createLatLng(58.200887, 15.563919),
      leafletAdapter.createLatLng(58.200829, 15.563905),
      leafletAdapter.createLatLng(58.200713, 15.56387),
      leafletAdapter.createLatLng(58.200575, 15.563916),
      leafletAdapter.createLatLng(58.200355, 15.564047),
      leafletAdapter.createLatLng(58.20023, 15.56412),
      leafletAdapter.createLatLng(58.199793, 15.564395),
      leafletAdapter.createLatLng(58.199622, 15.564499),
      leafletAdapter.createLatLng(58.199463, 15.564576),
      leafletAdapter.createLatLng(58.199267, 15.564768),
      leafletAdapter.createLatLng(58.198963, 15.565075),
      leafletAdapter.createLatLng(58.198727, 15.565331),
      leafletAdapter.createLatLng(58.19856, 15.565496),
      leafletAdapter.createLatLng(58.198314, 15.565654),
      leafletAdapter.createLatLng(58.198174, 15.565737),
      leafletAdapter.createLatLng(58.198073, 15.565822),
      leafletAdapter.createLatLng(58.197967, 15.565977),
      leafletAdapter.createLatLng(58.197821, 15.566193),
      leafletAdapter.createLatLng(58.197684, 15.566454),
      leafletAdapter.createLatLng(58.197601, 15.566609),
      leafletAdapter.createLatLng(58.197534, 15.566816),
      leafletAdapter.createLatLng(58.197471, 15.567104),
      leafletAdapter.createLatLng(58.197429, 15.567294),
      leafletAdapter.createLatLng(58.197364, 15.567505),
      leafletAdapter.createLatLng(58.197277, 15.567708),
      leafletAdapter.createLatLng(58.197204, 15.567809),
      leafletAdapter.createLatLng(58.197065, 15.568056),
      leafletAdapter.createLatLng(58.196966, 15.568252),
      leafletAdapter.createLatLng(58.196888, 15.568438),
      leafletAdapter.createLatLng(58.196859, 15.56856),
      leafletAdapter.createLatLng(58.196839, 15.568764),
      leafletAdapter.createLatLng(58.196827, 15.56905),
      leafletAdapter.createLatLng(58.196834, 15.569342),
      leafletAdapter.createLatLng(58.196887, 15.569686),
      leafletAdapter.createLatLng(58.196934, 15.57007),
      leafletAdapter.createLatLng(58.196957, 15.570254),
      leafletAdapter.createLatLng(58.19695, 15.5704),
      leafletAdapter.createLatLng(58.196908, 15.570491),
      leafletAdapter.createLatLng(58.196833, 15.570524),
      leafletAdapter.createLatLng(58.196657, 15.570455),
      leafletAdapter.createLatLng(58.196532, 15.570434),
      leafletAdapter.createLatLng(58.196442, 15.57048),
      leafletAdapter.createLatLng(58.196359, 15.570527),
      leafletAdapter.createLatLng(58.196264, 15.570645),
      leafletAdapter.createLatLng(58.196066, 15.571007),
      leafletAdapter.createLatLng(58.195922, 15.571213),
      leafletAdapter.createLatLng(58.195758, 15.571467),
      leafletAdapter.createLatLng(58.19565, 15.57169),
      leafletAdapter.createLatLng(58.195545, 15.571883),
      leafletAdapter.createLatLng(58.195421, 15.572086),
      leafletAdapter.createLatLng(58.195302, 15.572183),
      leafletAdapter.createLatLng(58.195141, 15.572283),
      leafletAdapter.createLatLng(58.193934, 15.572765),
      leafletAdapter.createLatLng(58.193783, 15.572812),
      leafletAdapter.createLatLng(58.193719, 15.572848),
      leafletAdapter.createLatLng(58.193688, 15.572967),
      leafletAdapter.createLatLng(58.193651, 15.573296),
      leafletAdapter.createLatLng(58.193642, 15.573497),
      leafletAdapter.createLatLng(58.193641, 15.57367),
      leafletAdapter.createLatLng(58.193693, 15.573851),
      leafletAdapter.createLatLng(58.193771, 15.574032),
      leafletAdapter.createLatLng(58.193884, 15.574104),
      leafletAdapter.createLatLng(58.193999, 15.574098),
      leafletAdapter.createLatLng(58.194155, 15.574062),
      leafletAdapter.createLatLng(58.194245, 15.57408),
      leafletAdapter.createLatLng(58.194295, 15.574145),
      leafletAdapter.createLatLng(58.194319, 15.574352),
      leafletAdapter.createLatLng(58.19434, 15.574713),
      leafletAdapter.createLatLng(58.194327, 15.574988),
      leafletAdapter.createLatLng(58.194273, 15.575151),
      leafletAdapter.createLatLng(58.194193, 15.575327),
      leafletAdapter.createLatLng(58.194151, 15.57553),
      leafletAdapter.createLatLng(58.194126, 15.575679),
      leafletAdapter.createLatLng(58.194127, 15.575815),
      leafletAdapter.createLatLng(58.194041, 15.575927),
      leafletAdapter.createLatLng(58.193899, 15.576038),
      leafletAdapter.createLatLng(58.193782, 15.576115),
      leafletAdapter.createLatLng(58.193687, 15.576165),
      leafletAdapter.createLatLng(58.193587, 15.576113),
      leafletAdapter.createLatLng(58.193451, 15.575938),
      leafletAdapter.createLatLng(58.193329, 15.575754),
      leafletAdapter.createLatLng(58.19327, 15.575665),
      leafletAdapter.createLatLng(58.193252, 15.575634),
      leafletAdapter.createLatLng(58.193231, 15.575655),
      leafletAdapter.createLatLng(58.193141, 15.575728),
      leafletAdapter.createLatLng(58.193041, 15.575748),
      leafletAdapter.createLatLng(58.192913, 15.575757),
      leafletAdapter.createLatLng(58.192684, 15.57569),
      leafletAdapter.createLatLng(58.192526, 15.575577),
      leafletAdapter.createLatLng(58.192451, 15.575481),
      leafletAdapter.createLatLng(58.192381, 15.575426),
      leafletAdapter.createLatLng(58.191941, 15.575687),
      leafletAdapter.createLatLng(58.191928, 15.575779),
      leafletAdapter.createLatLng(58.191947, 15.57599),
      leafletAdapter.createLatLng(58.192108, 15.577004),
      leafletAdapter.createLatLng(58.19215, 15.577381),
      leafletAdapter.createLatLng(58.19215, 15.577684),
      leafletAdapter.createLatLng(58.192149, 15.577867),
      leafletAdapter.createLatLng(58.192131, 15.577979),
      leafletAdapter.createLatLng(58.192077, 15.57804),
      leafletAdapter.createLatLng(58.191951, 15.57809),
      leafletAdapter.createLatLng(58.191858, 15.578075),
      leafletAdapter.createLatLng(58.191659, 15.577999),
      leafletAdapter.createLatLng(58.191596, 15.57795),
      leafletAdapter.createLatLng(58.191423, 15.577847),
      leafletAdapter.createLatLng(58.191328, 15.577809),
      leafletAdapter.createLatLng(58.191238, 15.577798),
      leafletAdapter.createLatLng(58.191134, 15.577868),
      leafletAdapter.createLatLng(58.19101, 15.577965),
      leafletAdapter.createLatLng(58.190916, 15.578141),
      leafletAdapter.createLatLng(58.190772, 15.578364),
      leafletAdapter.createLatLng(58.190678, 15.578476),
      leafletAdapter.createLatLng(58.190601, 15.578523),
      leafletAdapter.createLatLng(58.190519, 15.578532),
      leafletAdapter.createLatLng(58.190443, 15.578548),
      leafletAdapter.createLatLng(58.190418, 15.578565),
      leafletAdapter.createLatLng(58.19033, 15.578805),
      leafletAdapter.createLatLng(58.190035, 15.579),
      leafletAdapter.createLatLng(58.189875, 15.579087),
      leafletAdapter.createLatLng(58.189789, 15.579151),
      leafletAdapter.createLatLng(58.189746, 15.579191),
      leafletAdapter.createLatLng(58.18969, 15.579316),
      leafletAdapter.createLatLng(58.189652, 15.579441),
      leafletAdapter.createLatLng(58.189616, 15.579587),
      leafletAdapter.createLatLng(58.189556, 15.579838),
      leafletAdapter.createLatLng(58.1896, 15.579917),
      leafletAdapter.createLatLng(58.18967, 15.580097),
      leafletAdapter.createLatLng(58.189664, 15.580474),
      leafletAdapter.createLatLng(58.189632, 15.580929),
      leafletAdapter.createLatLng(58.18961, 15.581283),
      leafletAdapter.createLatLng(58.189566, 15.581639),
      leafletAdapter.createLatLng(58.189538, 15.581856),
      leafletAdapter.createLatLng(58.189465, 15.582457),
      leafletAdapter.createLatLng(58.189408, 15.582875),
      leafletAdapter.createLatLng(58.189373, 15.583279),
      leafletAdapter.createLatLng(58.189322, 15.583523),
      leafletAdapter.createLatLng(58.188252, 15.586941),
      leafletAdapter.createLatLng(58.187699, 15.592661),
      leafletAdapter.createLatLng(58.189136, 15.597146),
      leafletAdapter.createLatLng(58.188972, 15.601623),
      leafletAdapter.createLatLng(58.188591, 15.612475),
      leafletAdapter.createLatLng(58.185167, 15.620778),
      leafletAdapter.createLatLng(58.182383, 15.635217),
      leafletAdapter.createLatLng(58.182234, 15.635986),
      leafletAdapter.createLatLng(58.179194, 15.651802),
      leafletAdapter.createLatLng(58.179114, 15.65222),
      leafletAdapter.createLatLng(58.178956, 15.652176),
      leafletAdapter.createLatLng(58.17109, 15.649997),
      leafletAdapter.createLatLng(58.159859, 15.650108),
      leafletAdapter.createLatLng(58.158854, 15.65009),
      leafletAdapter.createLatLng(58.158932, 15.651718),
      leafletAdapter.createLatLng(58.159193, 15.660092),
      leafletAdapter.createLatLng(58.159212, 15.661384),
      leafletAdapter.createLatLng(58.159789, 15.661987),
      leafletAdapter.createLatLng(58.163276, 15.66628),
      leafletAdapter.createLatLng(58.164405, 15.667671),
      leafletAdapter.createLatLng(58.164688, 15.668017),
      leafletAdapter.createLatLng(58.164737, 15.668078),
      leafletAdapter.createLatLng(58.164448, 15.672233),
      leafletAdapter.createLatLng(58.164127, 15.676699),
      leafletAdapter.createLatLng(58.164081, 15.677409),
      leafletAdapter.createLatLng(58.164481, 15.678852),
      leafletAdapter.createLatLng(58.164481, 15.678853),
      leafletAdapter.createLatLng(58.164481, 15.678854),
      leafletAdapter.createLatLng(58.164583, 15.679228),
      leafletAdapter.createLatLng(58.166183, 15.685116),
      leafletAdapter.createLatLng(58.16555, 15.688717),
      leafletAdapter.createLatLng(58.1669, 15.691501),
      leafletAdapter.createLatLng(58.167323, 15.692267),
      leafletAdapter.createLatLng(58.167358, 15.692329),
      leafletAdapter.createLatLng(58.167307, 15.692942),
      leafletAdapter.createLatLng(58.167233, 15.693829),
      leafletAdapter.createLatLng(58.167228, 15.69388),
      leafletAdapter.createLatLng(58.16747, 15.694577),
      leafletAdapter.createLatLng(58.167631, 15.695043),
      leafletAdapter.createLatLng(58.167872, 15.695741),
      leafletAdapter.createLatLng(58.169734, 15.700901),
      leafletAdapter.createLatLng(58.170495, 15.70301),
      leafletAdapter.createLatLng(58.170596, 15.703289),
      leafletAdapter.createLatLng(58.170733, 15.703669),
      leafletAdapter.createLatLng(58.17084, 15.703961),
      leafletAdapter.createLatLng(58.171239, 15.705052),
      leafletAdapter.createLatLng(58.171614, 15.706077),
      leafletAdapter.createLatLng(58.171741, 15.706423),
      leafletAdapter.createLatLng(58.171916, 15.706901),
      leafletAdapter.createLatLng(58.172551, 15.708635),
      leafletAdapter.createLatLng(58.172264, 15.711273),
      leafletAdapter.createLatLng(58.171926, 15.71438),
      leafletAdapter.createLatLng(58.171958, 15.714397),
      leafletAdapter.createLatLng(58.172779, 15.714827),
      leafletAdapter.createLatLng(58.172876, 15.714298),
      leafletAdapter.createLatLng(58.173467, 15.711619),
      leafletAdapter.createLatLng(58.17367, 15.711892),
      leafletAdapter.createLatLng(58.174106, 15.712391),
      leafletAdapter.createLatLng(58.174264, 15.712638),
      leafletAdapter.createLatLng(58.17427, 15.713389),
      leafletAdapter.createLatLng(58.174414, 15.713518),
      leafletAdapter.createLatLng(58.174461, 15.71417),
      leafletAdapter.createLatLng(58.17497, 15.714388),
      leafletAdapter.createLatLng(58.175652, 15.714737),
      leafletAdapter.createLatLng(58.175698, 15.714774),
      leafletAdapter.createLatLng(58.175754, 15.714712),
      leafletAdapter.createLatLng(58.175791, 15.714661),
      leafletAdapter.createLatLng(58.176111, 15.71413),
      leafletAdapter.createLatLng(58.176195, 15.714123),
      leafletAdapter.createLatLng(58.176748, 15.71413),
      leafletAdapter.createLatLng(58.177089, 15.714024),
      leafletAdapter.createLatLng(58.177207, 15.713927),
      leafletAdapter.createLatLng(58.178755, 15.711785),
      leafletAdapter.createLatLng(58.181597, 15.711688),
      leafletAdapter.createLatLng(58.18373, 15.709797),
      leafletAdapter.createLatLng(58.184198, 15.709635),
      leafletAdapter.createLatLng(58.184439, 15.709551),
      leafletAdapter.createLatLng(58.185982, 15.708745),
      leafletAdapter.createLatLng(58.191503, 15.700987),
      leafletAdapter.createLatLng(58.191443, 15.702861),
      leafletAdapter.createLatLng(58.191431, 15.703582),
      leafletAdapter.createLatLng(58.191348, 15.706095),
      leafletAdapter.createLatLng(58.191376, 15.706262),
      leafletAdapter.createLatLng(58.191392, 15.70636),
      leafletAdapter.createLatLng(58.191467, 15.706808),
      leafletAdapter.createLatLng(58.191731, 15.708518),
      leafletAdapter.createLatLng(58.19202, 15.708936),
      leafletAdapter.createLatLng(58.194022, 15.711606),
      leafletAdapter.createLatLng(58.194171, 15.711577),
      leafletAdapter.createLatLng(58.194338, 15.71182),
      leafletAdapter.createLatLng(58.194343, 15.712228),
      leafletAdapter.createLatLng(58.194394, 15.712506),
      leafletAdapter.createLatLng(58.194486, 15.713015),
      leafletAdapter.createLatLng(58.194408, 15.713376),
      leafletAdapter.createLatLng(58.194448, 15.714049),
      leafletAdapter.createLatLng(58.194449, 15.71428),
      leafletAdapter.createLatLng(58.194307, 15.714863),
      leafletAdapter.createLatLng(58.193975, 15.716441),
      leafletAdapter.createLatLng(58.193686, 15.717029),
      leafletAdapter.createLatLng(58.193281, 15.717738),
      leafletAdapter.createLatLng(58.193144, 15.718127),
      leafletAdapter.createLatLng(58.193094, 15.718389),
      leafletAdapter.createLatLng(58.193175, 15.718902),
      leafletAdapter.createLatLng(58.193249, 15.719666),
      leafletAdapter.createLatLng(58.192975, 15.720179),
      leafletAdapter.createLatLng(58.19275, 15.720943),
      leafletAdapter.createLatLng(58.192606, 15.721072),
      leafletAdapter.createLatLng(58.192445, 15.721176),
      leafletAdapter.createLatLng(58.192351, 15.721262),
      leafletAdapter.createLatLng(58.192248, 15.721519),
      leafletAdapter.createLatLng(58.192142, 15.72187),
      leafletAdapter.createLatLng(58.191972, 15.722299),
      leafletAdapter.createLatLng(58.191781, 15.722864),
      leafletAdapter.createLatLng(58.191678, 15.723129),
      leafletAdapter.createLatLng(58.191668, 15.723209),
      leafletAdapter.createLatLng(58.191652, 15.723343),
      leafletAdapter.createLatLng(58.191621, 15.723684),
      leafletAdapter.createLatLng(58.1916, 15.724171),
      leafletAdapter.createLatLng(58.191601, 15.724478),
      leafletAdapter.createLatLng(58.191633, 15.724947),
      leafletAdapter.createLatLng(58.191666, 15.725365),
      leafletAdapter.createLatLng(58.19164, 15.725784),
      leafletAdapter.createLatLng(58.191592, 15.726322),
      leafletAdapter.createLatLng(58.191601, 15.726458),
      leafletAdapter.createLatLng(58.191783, 15.727225),
      leafletAdapter.createLatLng(58.191756, 15.727438),
      leafletAdapter.createLatLng(58.191663, 15.728113),
      leafletAdapter.createLatLng(58.191548, 15.728729),
      leafletAdapter.createLatLng(58.191469, 15.729208),
      leafletAdapter.createLatLng(58.191398, 15.729464),
      leafletAdapter.createLatLng(58.191291, 15.729755),
      leafletAdapter.createLatLng(58.191184, 15.730004),
      leafletAdapter.createLatLng(58.191, 15.730347),
      leafletAdapter.createLatLng(58.190703, 15.73088),
      leafletAdapter.createLatLng(58.190678, 15.730949),
      leafletAdapter.createLatLng(58.190544, 15.731219),
      leafletAdapter.createLatLng(58.190525, 15.731291),
      leafletAdapter.createLatLng(58.190387, 15.731523),
      leafletAdapter.createLatLng(58.190122, 15.73201),
      leafletAdapter.createLatLng(58.190052, 15.732127),
      leafletAdapter.createLatLng(58.189969, 15.732371),
      leafletAdapter.createLatLng(58.18992, 15.732651),
      leafletAdapter.createLatLng(58.189908, 15.732874),
      leafletAdapter.createLatLng(58.189895, 15.73374),
      leafletAdapter.createLatLng(58.189882, 15.733837),
      leafletAdapter.createLatLng(58.189886, 15.734102),
      leafletAdapter.createLatLng(58.189859, 15.734957),
      leafletAdapter.createLatLng(58.189828, 15.735257),
      leafletAdapter.createLatLng(58.18977, 15.735446),
      leafletAdapter.createLatLng(58.189675, 15.735569),
      leafletAdapter.createLatLng(58.189532, 15.735805),
      leafletAdapter.createLatLng(58.189462, 15.735908),
      leafletAdapter.createLatLng(58.189327, 15.736079),
      leafletAdapter.createLatLng(58.189224, 15.736137),
      leafletAdapter.createLatLng(58.189156, 15.736229),
      leafletAdapter.createLatLng(58.189058, 15.736324),
      leafletAdapter.createLatLng(58.188954, 15.736528),
      leafletAdapter.createLatLng(58.188914, 15.73662),
      leafletAdapter.createLatLng(58.188889, 15.736731),
      leafletAdapter.createLatLng(58.188827, 15.736834),
      leafletAdapter.createLatLng(58.188597, 15.737436),
      leafletAdapter.createLatLng(58.188552, 15.737502),
      leafletAdapter.createLatLng(58.1884, 15.737728),
      leafletAdapter.createLatLng(58.188257, 15.737864),
      leafletAdapter.createLatLng(58.188229, 15.737932),
      leafletAdapter.createLatLng(58.188121, 15.738134),
      leafletAdapter.createLatLng(58.188111, 15.738202),
      leafletAdapter.createLatLng(58.187634, 15.741335),
      leafletAdapter.createLatLng(58.18678, 15.74252),
      leafletAdapter.createLatLng(58.187808, 15.744644),
      leafletAdapter.createLatLng(58.18864, 15.745507),
      leafletAdapter.createLatLng(58.18921, 15.748612),
      leafletAdapter.createLatLng(58.189574, 15.749543),
      leafletAdapter.createLatLng(58.19043, 15.751733),
      leafletAdapter.createLatLng(58.191138, 15.753544),
      leafletAdapter.createLatLng(58.192025, 15.755816),
      leafletAdapter.createLatLng(58.194239, 15.761484),
      leafletAdapter.createLatLng(58.194584, 15.762367),
      leafletAdapter.createLatLng(58.194864, 15.763063),
      leafletAdapter.createLatLng(58.195225, 15.763072),
      leafletAdapter.createLatLng(58.196642, 15.76311),
      leafletAdapter.createLatLng(58.197076, 15.763121),
      leafletAdapter.createLatLng(58.198056, 15.763147),
      leafletAdapter.createLatLng(58.202458, 15.763262),
      leafletAdapter.createLatLng(58.202492, 15.763263),
      leafletAdapter.createLatLng(58.204738, 15.767152),
      leafletAdapter.createLatLng(58.204757, 15.767183),
      leafletAdapter.createLatLng(58.204828, 15.773204),
      leafletAdapter.createLatLng(58.204837, 15.77393),
      leafletAdapter.createLatLng(58.204832, 15.773992),
      leafletAdapter.createLatLng(58.204772, 15.774864),
      leafletAdapter.createLatLng(58.204459, 15.779389),
      leafletAdapter.createLatLng(58.203464, 15.78425),
      leafletAdapter.createLatLng(58.204586, 15.786417),
      leafletAdapter.createLatLng(58.207172, 15.791433),
      leafletAdapter.createLatLng(58.209075, 15.803855),
      leafletAdapter.createLatLng(58.208731, 15.805191),
      leafletAdapter.createLatLng(58.20611, 15.815473),
      leafletAdapter.createLatLng(58.2072, 15.820462),
      leafletAdapter.createLatLng(58.208787, 15.825061),
      leafletAdapter.createLatLng(58.209062, 15.825857),
      leafletAdapter.createLatLng(58.209768, 15.827905),
      leafletAdapter.createLatLng(58.210179, 15.827937),
      leafletAdapter.createLatLng(58.212325, 15.828109),
      leafletAdapter.createLatLng(58.218609, 15.831215),
      leafletAdapter.createLatLng(58.221979, 15.832881),
      leafletAdapter.createLatLng(58.228159, 15.837632),
      leafletAdapter.createLatLng(58.228331, 15.837766),
      leafletAdapter.createLatLng(58.229131, 15.838354),
      leafletAdapter.createLatLng(58.244309, 15.82793),
      leafletAdapter.createLatLng(58.244642, 15.827763),
      leafletAdapter.createLatLng(58.247049, 15.823285),
      leafletAdapter.createLatLng(58.249252, 15.821135),
      leafletAdapter.createLatLng(58.250288, 15.820122),
      leafletAdapter.createLatLng(58.255554, 15.821963),
      leafletAdapter.createLatLng(58.25913, 15.823413),
      leafletAdapter.createLatLng(58.258984, 15.827385),
      leafletAdapter.createLatLng(58.262088, 15.833226),
      leafletAdapter.createLatLng(58.262677, 15.834336),
      leafletAdapter.createLatLng(58.263078, 15.835089),
      leafletAdapter.createLatLng(58.263499, 15.834852),
      leafletAdapter.createLatLng(58.269905, 15.831655),
      leafletAdapter.createLatLng(58.278145, 15.816938),
      leafletAdapter.createLatLng(58.277923, 15.807542),
      leafletAdapter.createLatLng(58.281112, 15.80696),
      leafletAdapter.createLatLng(58.281215, 15.806401),
      leafletAdapter.createLatLng(58.281244, 15.806121),
      leafletAdapter.createLatLng(58.281479, 15.805189),
      leafletAdapter.createLatLng(58.282171, 15.802892),
      leafletAdapter.createLatLng(58.28288, 15.802656),
      leafletAdapter.createLatLng(58.283062, 15.802293),
      leafletAdapter.createLatLng(58.283121, 15.802157),
      leafletAdapter.createLatLng(58.283578, 15.800889),
      leafletAdapter.createLatLng(58.283834, 15.800249),
      leafletAdapter.createLatLng(58.286092, 15.796707),
      leafletAdapter.createLatLng(58.288232, 15.805189),
      leafletAdapter.createLatLng(58.288335, 15.805551),
      leafletAdapter.createLatLng(58.288326, 15.805828),
      leafletAdapter.createLatLng(58.288536, 15.806196),
      leafletAdapter.createLatLng(58.289145, 15.807312),
      leafletAdapter.createLatLng(58.289454, 15.807981),
      leafletAdapter.createLatLng(58.289716, 15.808616),
      leafletAdapter.createLatLng(58.289769, 15.809063),
      leafletAdapter.createLatLng(58.290091, 15.809755),
      leafletAdapter.createLatLng(58.290204, 15.810339),
      leafletAdapter.createLatLng(58.290753, 15.810513),
      leafletAdapter.createLatLng(58.291048, 15.810837),
      leafletAdapter.createLatLng(58.291046, 15.811864),
      leafletAdapter.createLatLng(58.290963, 15.813021),
      leafletAdapter.createLatLng(58.291148, 15.813035),
      leafletAdapter.createLatLng(58.291282, 15.813089),
      leafletAdapter.createLatLng(58.292702, 15.814414),
      leafletAdapter.createLatLng(58.293173, 15.815694),
      leafletAdapter.createLatLng(58.294008, 15.815149),
      leafletAdapter.createLatLng(58.2945, 15.815743),
      leafletAdapter.createLatLng(58.296973, 15.815475),
      leafletAdapter.createLatLng(58.29731, 15.815165),
      leafletAdapter.createLatLng(58.297447, 15.815103),
      leafletAdapter.createLatLng(58.298269, 15.814913),
      leafletAdapter.createLatLng(58.300213, 15.813549),
      leafletAdapter.createLatLng(58.300647, 15.813707),
      leafletAdapter.createLatLng(58.300888, 15.81357),
      leafletAdapter.createLatLng(58.300872, 15.812809),
      leafletAdapter.createLatLng(58.300965, 15.812417),
      leafletAdapter.createLatLng(58.300937, 15.812185),
      leafletAdapter.createLatLng(58.301084, 15.811332),
      leafletAdapter.createLatLng(58.301257, 15.810987),
      leafletAdapter.createLatLng(58.301535, 15.810042),
      leafletAdapter.createLatLng(58.302094, 15.809394),
      leafletAdapter.createLatLng(58.303389, 15.807787),
      leafletAdapter.createLatLng(58.305998, 15.80548),
      leafletAdapter.createLatLng(58.306305, 15.8059),
      leafletAdapter.createLatLng(58.306751, 15.805188),
      leafletAdapter.createLatLng(58.30671, 15.80504),
      leafletAdapter.createLatLng(58.306737, 15.804863),
      leafletAdapter.createLatLng(58.306836, 15.804594),
      leafletAdapter.createLatLng(58.306917, 15.804445),
      leafletAdapter.createLatLng(58.307001, 15.804285),
      leafletAdapter.createLatLng(58.30708, 15.804091),
      leafletAdapter.createLatLng(58.30735, 15.803789),
      leafletAdapter.createLatLng(58.307434, 15.80369),
      leafletAdapter.createLatLng(58.307538, 15.803629),
      leafletAdapter.createLatLng(58.307578, 15.803609),
      leafletAdapter.createLatLng(58.307632, 15.803582),
      leafletAdapter.createLatLng(58.307722, 15.803467),
      leafletAdapter.createLatLng(58.307819, 15.803382),
      leafletAdapter.createLatLng(58.307902, 15.803275),
      leafletAdapter.createLatLng(58.307935, 15.803232),
      leafletAdapter.createLatLng(58.308108, 15.802892),
      leafletAdapter.createLatLng(58.308189, 15.802685),
      leafletAdapter.createLatLng(58.308266, 15.802477),
      leafletAdapter.createLatLng(58.308335, 15.802314),
      leafletAdapter.createLatLng(58.308398, 15.802209),
      leafletAdapter.createLatLng(58.308533, 15.802217),
      leafletAdapter.createLatLng(58.308747, 15.802379),
      leafletAdapter.createLatLng(58.308944, 15.802533),
      leafletAdapter.createLatLng(58.3091, 15.802823),
      leafletAdapter.createLatLng(58.309242, 15.803086),
      leafletAdapter.createLatLng(58.309317, 15.803378),
      leafletAdapter.createLatLng(58.309359, 15.803563),
      leafletAdapter.createLatLng(58.309389, 15.803611),
      leafletAdapter.createLatLng(58.309518, 15.803655),
      leafletAdapter.createLatLng(58.309687, 15.803673),
      leafletAdapter.createLatLng(58.309744, 15.803756),
      leafletAdapter.createLatLng(58.309784, 15.803893),
      leafletAdapter.createLatLng(58.309835, 15.804072),
      leafletAdapter.createLatLng(58.309894, 15.804175),
      leafletAdapter.createLatLng(58.310024, 15.80423),
      leafletAdapter.createLatLng(58.310173, 15.804253),
      leafletAdapter.createLatLng(58.310272, 15.804307),
      leafletAdapter.createLatLng(58.31033, 15.804394),
      leafletAdapter.createLatLng(58.310369, 15.804572),
      leafletAdapter.createLatLng(58.310405, 15.804842),
      leafletAdapter.createLatLng(58.310463, 15.805014),
      leafletAdapter.createLatLng(58.310559, 15.805091),
      leafletAdapter.createLatLng(58.310608, 15.805188),
      leafletAdapter.createLatLng(58.310562, 15.80557),
      leafletAdapter.createLatLng(58.310716, 15.806032),
      leafletAdapter.createLatLng(58.310671, 15.806297),
      leafletAdapter.createLatLng(58.310724, 15.806435),
      leafletAdapter.createLatLng(58.310684, 15.806847),
      leafletAdapter.createLatLng(58.310723, 15.806943),
      leafletAdapter.createLatLng(58.310791, 15.806949),
      leafletAdapter.createLatLng(58.310881, 15.806921),
      leafletAdapter.createLatLng(58.310972, 15.806794),
      leafletAdapter.createLatLng(58.311342, 15.806835),
      leafletAdapter.createLatLng(58.311461, 15.806549),
      leafletAdapter.createLatLng(58.311765, 15.806899),
      leafletAdapter.createLatLng(58.311988, 15.806806),
      leafletAdapter.createLatLng(58.312101, 15.80684),
      leafletAdapter.createLatLng(58.312248, 15.807114),
      leafletAdapter.createLatLng(58.312361, 15.807142),
      leafletAdapter.createLatLng(58.312556, 15.806953),
      leafletAdapter.createLatLng(58.312636, 15.807081),
      leafletAdapter.createLatLng(58.312809, 15.807288),
      leafletAdapter.createLatLng(58.312984, 15.807317),
      leafletAdapter.createLatLng(58.313541, 15.807589),
      leafletAdapter.createLatLng(58.315541, 15.810249),
      leafletAdapter.createLatLng(58.312273, 15.820351),
      leafletAdapter.createLatLng(58.315117, 15.822549),
      leafletAdapter.createLatLng(58.315174, 15.822595),
      leafletAdapter.createLatLng(58.315506, 15.822407),
      leafletAdapter.createLatLng(58.315607, 15.822386),
      leafletAdapter.createLatLng(58.315726, 15.822267),
      leafletAdapter.createLatLng(58.315848, 15.822096),
      leafletAdapter.createLatLng(58.315907, 15.821945),
      leafletAdapter.createLatLng(58.315974, 15.821834),
      leafletAdapter.createLatLng(58.316206, 15.821619),
      leafletAdapter.createLatLng(58.316434, 15.821462),
      leafletAdapter.createLatLng(58.316623, 15.82129),
      leafletAdapter.createLatLng(58.316925, 15.822173),
      leafletAdapter.createLatLng(58.316978, 15.822284),
      leafletAdapter.createLatLng(58.317033, 15.822405),
      leafletAdapter.createLatLng(58.317239, 15.822384),
      leafletAdapter.createLatLng(58.317304, 15.823509),
      leafletAdapter.createLatLng(58.317412, 15.823819),
      leafletAdapter.createLatLng(58.317397, 15.824399),
      leafletAdapter.createLatLng(58.317619, 15.82514),
      leafletAdapter.createLatLng(58.317676, 15.82581),
      leafletAdapter.createLatLng(58.317872, 15.825966),
      leafletAdapter.createLatLng(58.31799, 15.826052),
      leafletAdapter.createLatLng(58.318415, 15.827133),
      leafletAdapter.createLatLng(58.3188, 15.82821),
      leafletAdapter.createLatLng(58.319094, 15.82928),
      leafletAdapter.createLatLng(58.319164, 15.829542),
      leafletAdapter.createLatLng(58.319461, 15.830483),
      leafletAdapter.createLatLng(58.319994, 15.831366),
      leafletAdapter.createLatLng(58.320891, 15.832786),
      leafletAdapter.createLatLng(58.321337, 15.833721),
      leafletAdapter.createLatLng(58.321185, 15.834072),
      leafletAdapter.createLatLng(58.32118, 15.834471),
      leafletAdapter.createLatLng(58.321608, 15.835003),
      leafletAdapter.createLatLng(58.321814, 15.835323),
      leafletAdapter.createLatLng(58.321989, 15.835663),
      leafletAdapter.createLatLng(58.322062, 15.835942),
      leafletAdapter.createLatLng(58.322183, 15.836495),
      leafletAdapter.createLatLng(58.322954, 15.838329),
      leafletAdapter.createLatLng(58.324454, 15.841893),
      leafletAdapter.createLatLng(58.324823, 15.841946),
      leafletAdapter.createLatLng(58.325868, 15.841988),
      leafletAdapter.createLatLng(58.325959, 15.84212),
      leafletAdapter.createLatLng(58.326481, 15.843242),
      leafletAdapter.createLatLng(58.32692, 15.844772),
      leafletAdapter.createLatLng(58.327649, 15.847556),
      leafletAdapter.createLatLng(58.328505, 15.85054),
      leafletAdapter.createLatLng(58.328487, 15.850778),
      leafletAdapter.createLatLng(58.328488, 15.851045),
      leafletAdapter.createLatLng(58.328589, 15.853298),
      leafletAdapter.createLatLng(58.328579, 15.854462),
      leafletAdapter.createLatLng(58.328583, 15.855288),
      leafletAdapter.createLatLng(58.328563, 15.856548),
      leafletAdapter.createLatLng(58.328633, 15.861675),
      leafletAdapter.createLatLng(58.328663, 15.862165),
      leafletAdapter.createLatLng(58.328921, 15.863777),
      leafletAdapter.createLatLng(58.329032, 15.864553),
      leafletAdapter.createLatLng(58.32917, 15.86497),
      leafletAdapter.createLatLng(58.32953, 15.865371),
      leafletAdapter.createLatLng(58.329624, 15.865227),
      leafletAdapter.createLatLng(58.330025, 15.865885),
      leafletAdapter.createLatLng(58.330773, 15.866775),
      leafletAdapter.createLatLng(58.332245, 15.868276),
      leafletAdapter.createLatLng(58.331935, 15.868765),
      leafletAdapter.createLatLng(58.331742, 15.869305),
      leafletAdapter.createLatLng(58.331676, 15.869641),
      leafletAdapter.createLatLng(58.331624, 15.869718),
      leafletAdapter.createLatLng(58.331237, 15.869791),
      leafletAdapter.createLatLng(58.33102, 15.869979),
      leafletAdapter.createLatLng(58.330883, 15.870016),
      leafletAdapter.createLatLng(58.331242, 15.871482),
      leafletAdapter.createLatLng(58.331757, 15.872987),
      leafletAdapter.createLatLng(58.332838, 15.876043),
      leafletAdapter.createLatLng(58.333313, 15.877325),
      leafletAdapter.createLatLng(58.334357, 15.880937),
      leafletAdapter.createLatLng(58.333025, 15.885765),
      leafletAdapter.createLatLng(58.334314, 15.887626),
      leafletAdapter.createLatLng(58.334416, 15.887482),
      leafletAdapter.createLatLng(58.334494, 15.88743),
      leafletAdapter.createLatLng(58.334679, 15.887579),
      leafletAdapter.createLatLng(58.334766, 15.887698),
      leafletAdapter.createLatLng(58.334869, 15.887876),
      leafletAdapter.createLatLng(58.335172, 15.888483),
      leafletAdapter.createLatLng(58.33579, 15.88935),
      leafletAdapter.createLatLng(58.335911, 15.889466),
      leafletAdapter.createLatLng(58.336018, 15.889518),
      leafletAdapter.createLatLng(58.336076, 15.889495),
      leafletAdapter.createLatLng(58.336148, 15.889443),
      leafletAdapter.createLatLng(58.336248, 15.889337),
      leafletAdapter.createLatLng(58.336378, 15.889181),
      leafletAdapter.createLatLng(58.336465, 15.889334),
      leafletAdapter.createLatLng(58.336546, 15.889336),
      leafletAdapter.createLatLng(58.337279, 15.889517),
      leafletAdapter.createLatLng(58.33801, 15.890548),
      leafletAdapter.createLatLng(58.338203, 15.890798),
      leafletAdapter.createLatLng(58.33842, 15.891122),
      leafletAdapter.createLatLng(58.338571, 15.891535),
      leafletAdapter.createLatLng(58.338662, 15.891738),
      leafletAdapter.createLatLng(58.338728, 15.892054),
      leafletAdapter.createLatLng(58.338913, 15.89273),
      leafletAdapter.createLatLng(58.339067, 15.893369),
      leafletAdapter.createLatLng(58.339148, 15.893726),
      leafletAdapter.createLatLng(58.3393, 15.894246),
      leafletAdapter.createLatLng(58.339391, 15.894503),
      leafletAdapter.createLatLng(58.339545, 15.894808),
      leafletAdapter.createLatLng(58.339635, 15.894929),
      leafletAdapter.createLatLng(58.339731, 15.89506),
      leafletAdapter.createLatLng(58.339986, 15.895362),
      leafletAdapter.createLatLng(58.340093, 15.895551),
      leafletAdapter.createLatLng(58.34014, 15.895612),
      leafletAdapter.createLatLng(58.340239, 15.8956),
      leafletAdapter.createLatLng(58.340381, 15.895587),
      leafletAdapter.createLatLng(58.34054, 15.895539),
      leafletAdapter.createLatLng(58.340592, 15.895559),
      leafletAdapter.createLatLng(58.340612, 15.895606),
      leafletAdapter.createLatLng(58.340636, 15.895647),
      leafletAdapter.createLatLng(58.340818, 15.895524),
      leafletAdapter.createLatLng(58.340956, 15.895402),
      leafletAdapter.createLatLng(58.341022, 15.895349),
      leafletAdapter.createLatLng(58.341058, 15.896001),
      leafletAdapter.createLatLng(58.341203, 15.895878),
      leafletAdapter.createLatLng(58.341635, 15.895491),
      leafletAdapter.createLatLng(58.341913, 15.895301),
      leafletAdapter.createLatLng(58.342079, 15.895179),
      leafletAdapter.createLatLng(58.342188, 15.895119),
      leafletAdapter.createLatLng(58.342291, 15.895141),
      leafletAdapter.createLatLng(58.342469, 15.895301),
      leafletAdapter.createLatLng(58.342674, 15.89557),
      leafletAdapter.createLatLng(58.342808, 15.895813),
      leafletAdapter.createLatLng(58.342908, 15.895996),
      leafletAdapter.createLatLng(58.343005, 15.896131),
      leafletAdapter.createLatLng(58.343117, 15.896258),
      leafletAdapter.createLatLng(58.343265, 15.896361),
      leafletAdapter.createLatLng(58.343361, 15.896452),
      leafletAdapter.createLatLng(58.343471, 15.896593),
      leafletAdapter.createLatLng(58.343554, 15.896707),
      leafletAdapter.createLatLng(58.343683, 15.896899),
      leafletAdapter.createLatLng(58.343795, 15.897078),
      leafletAdapter.createLatLng(58.343907, 15.897319),
      leafletAdapter.createLatLng(58.344018, 15.897555),
      leafletAdapter.createLatLng(58.344102, 15.897738),
      leafletAdapter.createLatLng(58.344176, 15.897925),
      leafletAdapter.createLatLng(58.344228, 15.898098),
      leafletAdapter.createLatLng(58.344307, 15.898236),
      leafletAdapter.createLatLng(58.344426, 15.898388),
      leafletAdapter.createLatLng(58.344568, 15.89859),
      leafletAdapter.createLatLng(58.344727, 15.898877),
      leafletAdapter.createLatLng(58.344764, 15.898953),
      leafletAdapter.createLatLng(58.344807, 15.899043),
      leafletAdapter.createLatLng(58.344926, 15.899228),
      leafletAdapter.createLatLng(58.345005, 15.899401),
      leafletAdapter.createLatLng(58.346465, 15.901938),
      leafletAdapter.createLatLng(58.345657, 15.908199),
      leafletAdapter.createLatLng(58.343842, 15.910896),
      leafletAdapter.createLatLng(58.342576, 15.912778),
      leafletAdapter.createLatLng(58.338169, 15.923082),
      leafletAdapter.createLatLng(58.335537, 15.929292),
      leafletAdapter.createLatLng(58.335036, 15.933271),
      leafletAdapter.createLatLng(58.334949, 15.934115),
      leafletAdapter.createLatLng(58.336447, 15.937469),
      leafletAdapter.createLatLng(58.336656, 15.938045),
      leafletAdapter.createLatLng(58.337548, 15.940791),
      leafletAdapter.createLatLng(58.338069, 15.942332),
      leafletAdapter.createLatLng(58.337983, 15.942767),
      leafletAdapter.createLatLng(58.337977, 15.942979),
      leafletAdapter.createLatLng(58.338112, 15.943085),
      leafletAdapter.createLatLng(58.338213, 15.943162),
      leafletAdapter.createLatLng(58.338328, 15.943129),
      leafletAdapter.createLatLng(58.338521, 15.943092),
      leafletAdapter.createLatLng(58.338597, 15.9431),
      leafletAdapter.createLatLng(58.338774, 15.943248),
      leafletAdapter.createLatLng(58.338833, 15.943318),
      leafletAdapter.createLatLng(58.338865, 15.943311),
      leafletAdapter.createLatLng(58.339, 15.943213),
      leafletAdapter.createLatLng(58.339126, 15.942972),
      leafletAdapter.createLatLng(58.339195, 15.9428),
      leafletAdapter.createLatLng(58.339247, 15.942717),
      leafletAdapter.createLatLng(58.339365, 15.942759),
      leafletAdapter.createLatLng(58.339445, 15.942812),
      leafletAdapter.createLatLng(58.339479, 15.942907),
      leafletAdapter.createLatLng(58.339541, 15.943435),
      leafletAdapter.createLatLng(58.339904, 15.946498),
      leafletAdapter.createLatLng(58.34006, 15.947827),
      leafletAdapter.createLatLng(58.340206, 15.948995),
      leafletAdapter.createLatLng(58.340302, 15.94996),
      leafletAdapter.createLatLng(58.340386, 15.950703),
      leafletAdapter.createLatLng(58.340418, 15.951365),
      leafletAdapter.createLatLng(58.34046, 15.951825),
      leafletAdapter.createLatLng(58.34047, 15.952142),
      leafletAdapter.createLatLng(58.340484, 15.95235),
      leafletAdapter.createLatLng(58.340567, 15.952584),
      leafletAdapter.createLatLng(58.340639, 15.952791),
      leafletAdapter.createLatLng(58.340718, 15.95295),
      leafletAdapter.createLatLng(58.340719, 15.953165),
      leafletAdapter.createLatLng(58.340768, 15.954267),
      leafletAdapter.createLatLng(58.340778, 15.95494),
      leafletAdapter.createLatLng(58.340777, 15.955404),
      leafletAdapter.createLatLng(58.34077, 15.955937),
      leafletAdapter.createLatLng(58.340694, 15.956501),
      leafletAdapter.createLatLng(58.340541, 15.957453),
      leafletAdapter.createLatLng(58.340463, 15.957854),
      leafletAdapter.createLatLng(58.340473, 15.957963),
      leafletAdapter.createLatLng(58.340543, 15.958379),
      leafletAdapter.createLatLng(58.340606, 15.958828),
      leafletAdapter.createLatLng(58.340893, 15.960704),
      leafletAdapter.createLatLng(58.341127, 15.962336),
      leafletAdapter.createLatLng(58.341161, 15.962642),
      leafletAdapter.createLatLng(58.341171, 15.962799),
      leafletAdapter.createLatLng(58.341875, 15.962811),
      leafletAdapter.createLatLng(58.342674, 15.962872),
      leafletAdapter.createLatLng(58.34295, 15.961556),
      leafletAdapter.createLatLng(58.343231, 15.96023),
      leafletAdapter.createLatLng(58.343717, 15.958166),
      leafletAdapter.createLatLng(58.34415, 15.956321),
      leafletAdapter.createLatLng(58.344431, 15.955169),
      leafletAdapter.createLatLng(58.344528, 15.954741),
      leafletAdapter.createLatLng(58.344597, 15.954422),
      leafletAdapter.createLatLng(58.344642, 15.9541),
      leafletAdapter.createLatLng(58.34466, 15.953769),
      leafletAdapter.createLatLng(58.344703, 15.953341),
      leafletAdapter.createLatLng(58.344727, 15.953126),
      leafletAdapter.createLatLng(58.344776, 15.952882),
      leafletAdapter.createLatLng(58.344931, 15.952173),
      leafletAdapter.createLatLng(58.344989, 15.951895),
      leafletAdapter.createLatLng(58.345015, 15.951697),
      leafletAdapter.createLatLng(58.345028, 15.951508),
      leafletAdapter.createLatLng(58.345022, 15.95127),
      leafletAdapter.createLatLng(58.345069, 15.950965),
      leafletAdapter.createLatLng(58.345126, 15.950592),
      leafletAdapter.createLatLng(58.345207, 15.950256),
      leafletAdapter.createLatLng(58.345324, 15.949915),
      leafletAdapter.createLatLng(58.345411, 15.949726),
      leafletAdapter.createLatLng(58.345496, 15.949523),
      leafletAdapter.createLatLng(58.345551, 15.949358),
      leafletAdapter.createLatLng(58.3456, 15.949125),
      leafletAdapter.createLatLng(58.345676, 15.948861),
      leafletAdapter.createLatLng(58.345843, 15.94851),
      leafletAdapter.createLatLng(58.346494, 15.947498),
      leafletAdapter.createLatLng(58.346742, 15.947138),
      leafletAdapter.createLatLng(58.346936, 15.946878),
      leafletAdapter.createLatLng(58.347058, 15.946767),
      leafletAdapter.createLatLng(58.347174, 15.946765),
      leafletAdapter.createLatLng(58.347501, 15.946728),
      leafletAdapter.createLatLng(58.347828, 15.946706),
      leafletAdapter.createLatLng(58.34812, 15.94668),
      leafletAdapter.createLatLng(58.348341, 15.949159),
      leafletAdapter.createLatLng(58.347525, 15.952731),
      leafletAdapter.createLatLng(58.349601, 15.959023),
      leafletAdapter.createLatLng(58.349595, 15.968039),
      leafletAdapter.createLatLng(58.351214, 15.968301),
      leafletAdapter.createLatLng(58.351628, 15.972229),
      leafletAdapter.createLatLng(58.35317, 15.974934),
      leafletAdapter.createLatLng(58.353572, 15.975984),
      leafletAdapter.createLatLng(58.35461, 15.979026),
      leafletAdapter.createLatLng(58.359437, 15.993427),
      leafletAdapter.createLatLng(58.360619, 15.996956),
      leafletAdapter.createLatLng(58.362689, 15.994485),
      leafletAdapter.createLatLng(58.365358, 15.991801),
      leafletAdapter.createLatLng(58.36583, 15.995614),
      leafletAdapter.createLatLng(58.36567, 15.995969),
      leafletAdapter.createLatLng(58.365248, 15.996804),
      leafletAdapter.createLatLng(58.365147, 15.997007),
      leafletAdapter.createLatLng(58.36504, 15.997302),
      leafletAdapter.createLatLng(58.364997, 15.99746),
      leafletAdapter.createLatLng(58.364987, 15.997836),
      leafletAdapter.createLatLng(58.365032, 15.998996),
      leafletAdapter.createLatLng(58.365149, 16.001282),
      leafletAdapter.createLatLng(58.365247, 16.003195),
      leafletAdapter.createLatLng(58.365679, 16.012597),
      leafletAdapter.createLatLng(58.365668, 16.012752),
      leafletAdapter.createLatLng(58.365466, 16.015372),
      leafletAdapter.createLatLng(58.365392, 16.01633),
      leafletAdapter.createLatLng(58.365344, 16.016935),
      leafletAdapter.createLatLng(58.365261, 16.017984),
      leafletAdapter.createLatLng(58.365122, 16.019245),
      leafletAdapter.createLatLng(58.36501, 16.020251),
      leafletAdapter.createLatLng(58.365752, 16.021926),
      leafletAdapter.createLatLng(58.365775, 16.021988),
      leafletAdapter.createLatLng(58.36587, 16.022263),
      leafletAdapter.createLatLng(58.366592, 16.023873),
      leafletAdapter.createLatLng(58.367102, 16.025023),
      leafletAdapter.createLatLng(58.367194, 16.025204),
      leafletAdapter.createLatLng(58.367701, 16.026291),
      leafletAdapter.createLatLng(58.367837, 16.026697),
      leafletAdapter.createLatLng(58.370397, 16.035407),
      leafletAdapter.createLatLng(58.370507, 16.036458),
      leafletAdapter.createLatLng(58.370797, 16.03883),
      leafletAdapter.createLatLng(58.370945, 16.040028),
      leafletAdapter.createLatLng(58.371176, 16.041752),
      leafletAdapter.createLatLng(58.371356, 16.042987),
      leafletAdapter.createLatLng(58.371398, 16.043339),
      leafletAdapter.createLatLng(58.371448, 16.043547),
      leafletAdapter.createLatLng(58.371761, 16.044504),
      leafletAdapter.createLatLng(58.371903, 16.045016),
      leafletAdapter.createLatLng(58.37376, 16.051034),
      leafletAdapter.createLatLng(58.374038, 16.054979),
      leafletAdapter.createLatLng(58.373951, 16.055397),
      leafletAdapter.createLatLng(58.373389, 16.05896),
      leafletAdapter.createLatLng(58.373328, 16.059275),
      leafletAdapter.createLatLng(58.373341, 16.060201),
      leafletAdapter.createLatLng(58.373378, 16.061198),
      leafletAdapter.createLatLng(58.373425, 16.061525),
      leafletAdapter.createLatLng(58.373494, 16.064192),
      leafletAdapter.createLatLng(58.371947, 16.074452),
      leafletAdapter.createLatLng(58.371839, 16.075166),
      leafletAdapter.createLatLng(58.371823, 16.075272),
      leafletAdapter.createLatLng(58.371855, 16.075191),
      leafletAdapter.createLatLng(58.374963, 16.067336),
      leafletAdapter.createLatLng(58.375095, 16.067002),
      leafletAdapter.createLatLng(58.375218, 16.066775),
      leafletAdapter.createLatLng(58.378042, 16.061559),
      leafletAdapter.createLatLng(58.3796, 16.057386),
      leafletAdapter.createLatLng(58.380813, 16.052898),
      leafletAdapter.createLatLng(58.382839, 16.054141),
      leafletAdapter.createLatLng(58.382956, 16.054208),
      leafletAdapter.createLatLng(58.383414, 16.054323),
      leafletAdapter.createLatLng(58.385975, 16.051695),
      leafletAdapter.createLatLng(58.390278, 16.046537),
      leafletAdapter.createLatLng(58.393014, 16.043277),
      leafletAdapter.createLatLng(58.394177, 16.041667),
      leafletAdapter.createLatLng(58.394193, 16.041645),
      leafletAdapter.createLatLng(58.397965, 16.036288),
      leafletAdapter.createLatLng(58.398391, 16.03574),
      leafletAdapter.createLatLng(58.398927, 16.036418),
      leafletAdapter.createLatLng(58.405947, 16.0453),
      leafletAdapter.createLatLng(58.404939, 16.034159),
      leafletAdapter.createLatLng(58.404708, 16.031606),
      leafletAdapter.createLatLng(58.404655, 16.031188),
      leafletAdapter.createLatLng(58.404472, 16.030655),
      leafletAdapter.createLatLng(58.404602, 16.02996),
      leafletAdapter.createLatLng(58.405452, 16.025167),
      leafletAdapter.createLatLng(58.405798, 16.023811),
      leafletAdapter.createLatLng(58.407183, 16.018362),
      leafletAdapter.createLatLng(58.408583, 16.013365),
      leafletAdapter.createLatLng(58.408916, 16.013397),
      leafletAdapter.createLatLng(58.409162, 16.013463),
      leafletAdapter.createLatLng(58.411834, 16.00983),
      leafletAdapter.createLatLng(58.418746, 16.009208),
      leafletAdapter.createLatLng(58.419713, 16.009133),
      leafletAdapter.createLatLng(58.420373, 16.006539),
      leafletAdapter.createLatLng(58.422721, 15.996678),
      leafletAdapter.createLatLng(58.424863, 15.991425),
      leafletAdapter.createLatLng(58.425961, 15.98873),
      leafletAdapter.createLatLng(58.426016, 15.986984),
      leafletAdapter.createLatLng(58.423805, 15.978431),
      leafletAdapter.createLatLng(58.423804, 15.978351),
      leafletAdapter.createLatLng(58.423786, 15.976321),
      leafletAdapter.createLatLng(58.423812, 15.972978),
      leafletAdapter.createLatLng(58.423849, 15.971011),
      leafletAdapter.createLatLng(58.424034, 15.970426),
      leafletAdapter.createLatLng(58.424357, 15.969386),
      leafletAdapter.createLatLng(58.424687, 15.968024),
      leafletAdapter.createLatLng(58.42481, 15.967301),
      leafletAdapter.createLatLng(58.425089, 15.965927),
      leafletAdapter.createLatLng(58.425345, 15.964584),
      leafletAdapter.createLatLng(58.425493, 15.963878),
      leafletAdapter.createLatLng(58.425561, 15.963308),
      leafletAdapter.createLatLng(58.425701, 15.962349),
      leafletAdapter.createLatLng(58.425895, 15.960871),
      leafletAdapter.createLatLng(58.425933, 15.960454),
      leafletAdapter.createLatLng(58.425976, 15.960178),
      leafletAdapter.createLatLng(58.426168, 15.958761),
      leafletAdapter.createLatLng(58.426507, 15.95639),
      leafletAdapter.createLatLng(58.426604, 15.955645),
      leafletAdapter.createLatLng(58.426836, 15.953894),
      leafletAdapter.createLatLng(58.426949, 15.953157),
      leafletAdapter.createLatLng(58.427038, 15.95245),
      leafletAdapter.createLatLng(58.427096, 15.952058),
      leafletAdapter.createLatLng(58.427629, 15.952315),
      leafletAdapter.createLatLng(58.428274, 15.952596),
      leafletAdapter.createLatLng(58.42885, 15.95267),
      leafletAdapter.createLatLng(58.429885, 15.952674),
      leafletAdapter.createLatLng(58.430477, 15.952525),
      leafletAdapter.createLatLng(58.432454, 15.951745),
      leafletAdapter.createLatLng(58.434261, 15.951111),
      leafletAdapter.createLatLng(58.435935, 15.950526),
      leafletAdapter.createLatLng(58.435696, 15.951569),
      leafletAdapter.createLatLng(58.435254, 15.953474),
      leafletAdapter.createLatLng(58.435586, 15.954289),
      leafletAdapter.createLatLng(58.43685, 15.954384),
      leafletAdapter.createLatLng(58.438751, 15.954581),
      leafletAdapter.createLatLng(58.43923, 15.95532),
      leafletAdapter.createLatLng(58.440487, 15.957014),
      leafletAdapter.createLatLng(58.441002, 15.957737),
      leafletAdapter.createLatLng(58.44106, 15.95853),
      leafletAdapter.createLatLng(58.441004, 15.959134),
      leafletAdapter.createLatLng(58.44091, 15.959907),
      leafletAdapter.createLatLng(58.440827, 15.96086),
      leafletAdapter.createLatLng(58.440726, 15.961615),
      leafletAdapter.createLatLng(58.440917, 15.962989),
      leafletAdapter.createLatLng(58.440986, 15.963699),
      leafletAdapter.createLatLng(58.441256, 15.96366),
      leafletAdapter.createLatLng(58.441865, 15.963601),
      leafletAdapter.createLatLng(58.441969, 15.964155),
      leafletAdapter.createLatLng(58.442082, 15.964842),
      leafletAdapter.createLatLng(58.442122, 15.965329),
      leafletAdapter.createLatLng(58.442138, 15.965949),
      leafletAdapter.createLatLng(58.442166, 15.96632),
      leafletAdapter.createLatLng(58.442459, 15.967107),
      leafletAdapter.createLatLng(58.442964, 15.968445),
      leafletAdapter.createLatLng(58.443101, 15.968761),
      leafletAdapter.createLatLng(58.443478, 15.969766),
      leafletAdapter.createLatLng(58.44371, 15.973936),
      leafletAdapter.createLatLng(58.44372, 15.974258),
      leafletAdapter.createLatLng(58.443875, 15.976245),
      leafletAdapter.createLatLng(58.444192, 15.976413),
      leafletAdapter.createLatLng(58.444234, 15.97642),
      leafletAdapter.createLatLng(58.444288, 15.976432),
      leafletAdapter.createLatLng(58.444584, 15.97651),
      leafletAdapter.createLatLng(58.444552, 15.976958),
      leafletAdapter.createLatLng(58.444596, 15.976995),
      leafletAdapter.createLatLng(58.445244, 15.977527),
      leafletAdapter.createLatLng(58.445397, 15.9775),
      leafletAdapter.createLatLng(58.445519, 15.976865),
      leafletAdapter.createLatLng(58.445612, 15.976881),
      leafletAdapter.createLatLng(58.445983, 15.976944),
      leafletAdapter.createLatLng(58.446445, 15.976931),
      leafletAdapter.createLatLng(58.446463, 15.97693),
      leafletAdapter.createLatLng(58.446974, 15.976908),
      leafletAdapter.createLatLng(58.44733, 15.976845),
      leafletAdapter.createLatLng(58.447498, 15.976815),
      leafletAdapter.createLatLng(58.447604, 15.976786),
      leafletAdapter.createLatLng(58.448055, 15.976665),
      leafletAdapter.createLatLng(58.448057, 15.976618),
      leafletAdapter.createLatLng(58.448042, 15.976432),
      leafletAdapter.createLatLng(58.448054, 15.976209),
      leafletAdapter.createLatLng(58.448825, 15.974705),
      leafletAdapter.createLatLng(58.449711, 15.97304),
      leafletAdapter.createLatLng(58.451149, 15.970418),
      leafletAdapter.createLatLng(58.453063, 15.969129),
      leafletAdapter.createLatLng(58.455048, 15.967025),
      leafletAdapter.createLatLng(58.456277, 15.965347),
      leafletAdapter.createLatLng(58.456454, 15.96446),
      leafletAdapter.createLatLng(58.459329, 15.961714),
      leafletAdapter.createLatLng(58.459672, 15.961393),
      leafletAdapter.createLatLng(58.459683, 15.961095),
      leafletAdapter.createLatLng(58.460057, 15.961161),
      leafletAdapter.createLatLng(58.460083, 15.959421),
      leafletAdapter.createLatLng(58.460187, 15.959374),
      leafletAdapter.createLatLng(58.460345, 15.959261),
      leafletAdapter.createLatLng(58.460484, 15.95909),
      leafletAdapter.createLatLng(58.460681, 15.958752),
      leafletAdapter.createLatLng(58.460839, 15.958457),
      leafletAdapter.createLatLng(58.46113, 15.958445),
      leafletAdapter.createLatLng(58.46176, 15.958433),
      leafletAdapter.createLatLng(58.46213, 15.95842),
      leafletAdapter.createLatLng(58.462354, 15.958369),
      leafletAdapter.createLatLng(58.462551, 15.958301),
      leafletAdapter.createLatLng(58.462675, 15.958192),
      leafletAdapter.createLatLng(58.462839, 15.958041),
      leafletAdapter.createLatLng(58.462954, 15.957805),
      leafletAdapter.createLatLng(58.463073, 15.95761),
      leafletAdapter.createLatLng(58.463207, 15.957285),
      leafletAdapter.createLatLng(58.463301, 15.957032),
      leafletAdapter.createLatLng(58.463402, 15.956806),
      leafletAdapter.createLatLng(58.463588, 15.956591),
      leafletAdapter.createLatLng(58.463858, 15.956318),
      leafletAdapter.createLatLng(58.464179, 15.955941),
      leafletAdapter.createLatLng(58.464244, 15.956096),
      leafletAdapter.createLatLng(58.464516, 15.956182),
      leafletAdapter.createLatLng(58.464551, 15.958289),
      leafletAdapter.createLatLng(58.464565, 15.959156),
      leafletAdapter.createLatLng(58.464578, 15.959965),
      leafletAdapter.createLatLng(58.464588, 15.960577),
      leafletAdapter.createLatLng(58.464598, 15.961188),
      leafletAdapter.createLatLng(58.464613, 15.962088),
      leafletAdapter.createLatLng(58.464634, 15.963383),
      leafletAdapter.createLatLng(58.466524, 15.963292),
      leafletAdapter.createLatLng(58.467319, 15.963438),
      leafletAdapter.createLatLng(58.467565, 15.961922),
      leafletAdapter.createLatLng(58.467602, 15.961682),
      leafletAdapter.createLatLng(58.467649, 15.961302),
      leafletAdapter.createLatLng(58.467677, 15.960915),
      leafletAdapter.createLatLng(58.467677, 15.960665),
      leafletAdapter.createLatLng(58.467667, 15.9606),
      leafletAdapter.createLatLng(58.467643, 15.960432),
      leafletAdapter.createLatLng(58.467588, 15.959877),
      leafletAdapter.createLatLng(58.467504, 15.959192),
      leafletAdapter.createLatLng(58.46737, 15.958267),
      leafletAdapter.createLatLng(58.466899, 15.95535),
      leafletAdapter.createLatLng(58.467061, 15.954484),
      leafletAdapter.createLatLng(58.46716, 15.954238),
      leafletAdapter.createLatLng(58.467314, 15.954019),
      leafletAdapter.createLatLng(58.467465, 15.953769),
      leafletAdapter.createLatLng(58.467605, 15.953495),
      leafletAdapter.createLatLng(58.467821, 15.952896),
      leafletAdapter.createLatLng(58.468102, 15.952205),
      leafletAdapter.createLatLng(58.468201, 15.951904),
      leafletAdapter.createLatLng(58.468272, 15.950393),
      leafletAdapter.createLatLng(58.46831, 15.95004),
      leafletAdapter.createLatLng(58.468154, 15.949523),
      leafletAdapter.createLatLng(58.468758, 15.948308),
      leafletAdapter.createLatLng(58.468846, 15.948119),
      leafletAdapter.createLatLng(58.468948, 15.947856),
      leafletAdapter.createLatLng(58.469099, 15.947342),
      leafletAdapter.createLatLng(58.469256, 15.946818),
      leafletAdapter.createLatLng(58.46938, 15.946462),
      leafletAdapter.createLatLng(58.469571, 15.946007),
      leafletAdapter.createLatLng(58.470109, 15.945981),
      leafletAdapter.createLatLng(58.47073, 15.94627),
      leafletAdapter.createLatLng(58.470865, 15.944954),
      leafletAdapter.createLatLng(58.471171, 15.94072),
      leafletAdapter.createLatLng(58.471425, 15.939806),
      leafletAdapter.createLatLng(58.471668, 15.938936),
      leafletAdapter.createLatLng(58.471848, 15.938186),
      leafletAdapter.createLatLng(58.471961, 15.937621),
      leafletAdapter.createLatLng(58.472015, 15.937361),
      leafletAdapter.createLatLng(58.472111, 15.935254),
      leafletAdapter.createLatLng(58.473107, 15.93235),
      leafletAdapter.createLatLng(58.473127, 15.932295),
      leafletAdapter.createLatLng(58.474845, 15.931383),
      leafletAdapter.createLatLng(58.474745, 15.93006),
      leafletAdapter.createLatLng(58.474656, 15.929084),
      leafletAdapter.createLatLng(58.474405, 15.925935),
      leafletAdapter.createLatLng(58.474298, 15.924605),
      leafletAdapter.createLatLng(58.47423, 15.924235),
      leafletAdapter.createLatLng(58.473664, 15.921133),
      leafletAdapter.createLatLng(58.474092, 15.919356),
      leafletAdapter.createLatLng(58.474195, 15.918979),
      leafletAdapter.createLatLng(58.475149, 15.917658),
      leafletAdapter.createLatLng(58.475224, 15.917798),
      leafletAdapter.createLatLng(58.475472, 15.917538),
      leafletAdapter.createLatLng(58.475605, 15.91736),
      leafletAdapter.createLatLng(58.475732, 15.91774),
      leafletAdapter.createLatLng(58.476149, 15.915353),
      leafletAdapter.createLatLng(58.476453, 15.915058),
      leafletAdapter.createLatLng(58.476745, 15.914743),
      leafletAdapter.createLatLng(58.477338, 15.914144),
      leafletAdapter.createLatLng(58.477431, 15.914041),
      leafletAdapter.createLatLng(58.478016, 15.913453),
      leafletAdapter.createLatLng(58.477437, 15.911887),
      leafletAdapter.createLatLng(58.476971, 15.910704),
      leafletAdapter.createLatLng(58.476347, 15.909127),
      leafletAdapter.createLatLng(58.47641, 15.908819),
      leafletAdapter.createLatLng(58.478226, 15.913368),
      leafletAdapter.createLatLng(58.480183, 15.918466),
      leafletAdapter.createLatLng(58.481962, 15.917544),
      leafletAdapter.createLatLng(58.482007, 15.913788),
      leafletAdapter.createLatLng(58.481444, 15.912547),
      leafletAdapter.createLatLng(58.483828, 15.910659),
      leafletAdapter.createLatLng(58.483495, 15.908983),
      leafletAdapter.createLatLng(58.485215, 15.907769),
      leafletAdapter.createLatLng(58.484653, 15.904358),
      leafletAdapter.createLatLng(58.48505, 15.904112),
      leafletAdapter.createLatLng(58.485211, 15.904016),
      leafletAdapter.createLatLng(58.48556, 15.900209),
      leafletAdapter.createLatLng(58.486346, 15.89898),
      leafletAdapter.createLatLng(58.486752, 15.89838),
      leafletAdapter.createLatLng(58.486894, 15.898106),
      leafletAdapter.createLatLng(58.487916, 15.89775),
      leafletAdapter.createLatLng(58.488979, 15.897379),
      leafletAdapter.createLatLng(58.489433, 15.899831),
      leafletAdapter.createLatLng(58.488945, 15.900444),
      leafletAdapter.createLatLng(58.489251, 15.904236),
      leafletAdapter.createLatLng(58.489435, 15.906461),
      leafletAdapter.createLatLng(58.48996, 15.910332),
      leafletAdapter.createLatLng(58.490433, 15.91374),
      leafletAdapter.createLatLng(58.49191, 15.923644),
      leafletAdapter.createLatLng(58.492377, 15.926909),
      leafletAdapter.createLatLng(58.492659, 15.928833),
      leafletAdapter.createLatLng(58.491404, 15.932083),
      leafletAdapter.createLatLng(58.491523, 15.932279),
      leafletAdapter.createLatLng(58.491591, 15.932392),
      leafletAdapter.createLatLng(58.491657, 15.932468),
      leafletAdapter.createLatLng(58.491702, 15.932523),
      leafletAdapter.createLatLng(58.491775, 15.932571),
      leafletAdapter.createLatLng(58.491852, 15.932619),
      leafletAdapter.createLatLng(58.495388, 15.934541),
      leafletAdapter.createLatLng(58.496239, 15.934073),
      leafletAdapter.createLatLng(58.497002, 15.933725),
      leafletAdapter.createLatLng(58.498184, 15.931564),
      leafletAdapter.createLatLng(58.49918, 15.929794),
      leafletAdapter.createLatLng(58.500816, 15.926814),
      leafletAdapter.createLatLng(58.504025, 15.92097),
      leafletAdapter.createLatLng(58.50773, 15.919325),
      leafletAdapter.createLatLng(58.507946, 15.919225),
      leafletAdapter.createLatLng(58.511963, 15.917508),
      leafletAdapter.createLatLng(58.512608, 15.909496),
      leafletAdapter.createLatLng(58.513213, 15.901689),
      leafletAdapter.createLatLng(58.51176, 15.89257),
      leafletAdapter.createLatLng(58.512351, 15.890966),
      leafletAdapter.createLatLng(58.51412, 15.886385),
      leafletAdapter.createLatLng(58.516041, 15.875002),
      leafletAdapter.createLatLng(58.511755, 15.856362),
      leafletAdapter.createLatLng(58.51759, 15.849062),
      leafletAdapter.createLatLng(58.5155, 15.833579),
      leafletAdapter.createLatLng(58.515491, 15.833511),
      leafletAdapter.createLatLng(58.515523, 15.833465),
      leafletAdapter.createLatLng(58.517257, 15.830919),
      leafletAdapter.createLatLng(58.518583, 15.817458),
      leafletAdapter.createLatLng(58.514178, 15.80527),
      leafletAdapter.createLatLng(58.514178, 15.805182),
      leafletAdapter.createLatLng(58.514319, 15.790415),
      leafletAdapter.createLatLng(58.514378, 15.782698),
      leafletAdapter.createLatLng(58.511736, 15.759419),
      leafletAdapter.createLatLng(58.51938, 15.761044),
      leafletAdapter.createLatLng(58.521965, 15.761592),
      leafletAdapter.createLatLng(58.525274, 15.760639),
      leafletAdapter.createLatLng(58.529373, 15.75904),
      leafletAdapter.createLatLng(58.532828, 15.75765),
      leafletAdapter.createLatLng(58.535743, 15.756775),
      leafletAdapter.createLatLng(58.541831, 15.753963),
      leafletAdapter.createLatLng(58.544699, 15.754245),
      leafletAdapter.createLatLng(58.551581, 15.756666),
      leafletAdapter.createLatLng(58.551315, 15.751583),
      leafletAdapter.createLatLng(58.551245, 15.750057),
      leafletAdapter.createLatLng(58.551017, 15.745229),
      leafletAdapter.createLatLng(58.550953, 15.743834),
      leafletAdapter.createLatLng(58.551207, 15.739646),
      leafletAdapter.createLatLng(58.551524, 15.734117),
      leafletAdapter.createLatLng(58.552321, 15.723104),
      leafletAdapter.createLatLng(58.553639, 15.721428),
      leafletAdapter.createLatLng(58.553639, 15.721332),
      leafletAdapter.createLatLng(58.553691, 15.719957),
      leafletAdapter.createLatLng(58.555911, 15.720477),
      leafletAdapter.createLatLng(58.555951, 15.71929),
      leafletAdapter.createLatLng(58.555989, 15.718917),
      leafletAdapter.createLatLng(58.556281, 15.716583),
      leafletAdapter.createLatLng(58.556286, 15.716538),
      leafletAdapter.createLatLng(58.558593, 15.698075),
      leafletAdapter.createLatLng(58.55947, 15.691043),
      leafletAdapter.createLatLng(58.559448, 15.6907),
      leafletAdapter.createLatLng(58.559782, 15.690886),
      leafletAdapter.createLatLng(58.560014, 15.691045),
      leafletAdapter.createLatLng(58.560086, 15.691116),
      leafletAdapter.createLatLng(58.560158, 15.691215),
      leafletAdapter.createLatLng(58.560344, 15.691519),
      leafletAdapter.createLatLng(58.560504, 15.69184),
      leafletAdapter.createLatLng(58.560539, 15.691943),
      leafletAdapter.createLatLng(58.560562, 15.692019),
      leafletAdapter.createLatLng(58.560588, 15.692211),
      leafletAdapter.createLatLng(58.560596, 15.69242),
      leafletAdapter.createLatLng(58.560596, 15.692644),
      leafletAdapter.createLatLng(58.56057, 15.69284),
      leafletAdapter.createLatLng(58.56204, 15.692868),
      leafletAdapter.createLatLng(58.562368, 15.692874),
      leafletAdapter.createLatLng(58.563007, 15.692886),
      leafletAdapter.createLatLng(58.563573, 15.692897),
      leafletAdapter.createLatLng(58.564961, 15.692923),
      leafletAdapter.createLatLng(58.565072, 15.692801),
      leafletAdapter.createLatLng(58.566157, 15.691755),
      leafletAdapter.createLatLng(58.566766, 15.691645),
      leafletAdapter.createLatLng(58.566873, 15.691484),
      leafletAdapter.createLatLng(58.567379, 15.690718),
      leafletAdapter.createLatLng(58.56899, 15.689829),
      leafletAdapter.createLatLng(58.569096, 15.689855),
      leafletAdapter.createLatLng(58.569167, 15.689875),
      leafletAdapter.createLatLng(58.569265, 15.689939),
      leafletAdapter.createLatLng(58.569747, 15.690368),
      leafletAdapter.createLatLng(58.572817, 15.686797),
      leafletAdapter.createLatLng(58.573424, 15.687033),
      leafletAdapter.createLatLng(58.573726, 15.687146),
      leafletAdapter.createLatLng(58.573983, 15.687226),
      leafletAdapter.createLatLng(58.574328, 15.687305),
      leafletAdapter.createLatLng(58.575233, 15.687475),
      leafletAdapter.createLatLng(58.576068, 15.686563),
      leafletAdapter.createLatLng(58.576173, 15.686449),
      leafletAdapter.createLatLng(58.576564, 15.685451),
      leafletAdapter.createLatLng(58.577667, 15.684208),
      leafletAdapter.createLatLng(58.578282, 15.68363),
      leafletAdapter.createLatLng(58.57831, 15.683113),
      leafletAdapter.createLatLng(58.578845, 15.673457),
      leafletAdapter.createLatLng(58.57908, 15.669207),
      leafletAdapter.createLatLng(58.579381, 15.663758),
      leafletAdapter.createLatLng(58.579425, 15.662992),
      leafletAdapter.createLatLng(58.579467, 15.662616),
      leafletAdapter.createLatLng(58.579754, 15.662697),
      leafletAdapter.createLatLng(58.580158, 15.662811),
      leafletAdapter.createLatLng(58.580343, 15.662702),
      leafletAdapter.createLatLng(58.580439, 15.66265),
      leafletAdapter.createLatLng(58.580569, 15.662579),
      leafletAdapter.createLatLng(58.580947, 15.662451),
      leafletAdapter.createLatLng(58.581243, 15.662396),
      leafletAdapter.createLatLng(58.581514, 15.662327),
      leafletAdapter.createLatLng(58.581687, 15.662414),
      leafletAdapter.createLatLng(58.581947, 15.662408),
      leafletAdapter.createLatLng(58.582125, 15.662394),
      leafletAdapter.createLatLng(58.582255, 15.662383),
      leafletAdapter.createLatLng(58.582569, 15.662208),
      leafletAdapter.createLatLng(58.582884, 15.662097),
      leafletAdapter.createLatLng(58.583166, 15.662066),
      leafletAdapter.createLatLng(58.58336, 15.662119),
      leafletAdapter.createLatLng(58.583467, 15.662242),
      leafletAdapter.createLatLng(58.58353, 15.662406),
      leafletAdapter.createLatLng(58.58359, 15.662519),
      leafletAdapter.createLatLng(58.583651, 15.662631),
      leafletAdapter.createLatLng(58.583692, 15.662731),
      leafletAdapter.createLatLng(58.583704, 15.662847),
      leafletAdapter.createLatLng(58.583727, 15.662947),
      leafletAdapter.createLatLng(58.583756, 15.663053),
      leafletAdapter.createLatLng(58.583812, 15.663163),
      leafletAdapter.createLatLng(58.58391, 15.663333),
      leafletAdapter.createLatLng(58.583957, 15.663484),
      leafletAdapter.createLatLng(58.583982, 15.663621),
      leafletAdapter.createLatLng(58.584015, 15.663752),
      leafletAdapter.createLatLng(58.58408, 15.663899),
      leafletAdapter.createLatLng(58.584168, 15.663959),
      leafletAdapter.createLatLng(58.584231, 15.664024),
      leafletAdapter.createLatLng(58.584268, 15.664123),
      leafletAdapter.createLatLng(58.584293, 15.664223),
      leafletAdapter.createLatLng(58.584306, 15.664336),
      leafletAdapter.createLatLng(58.584443, 15.665081),
      leafletAdapter.createLatLng(58.585285, 15.664507),
      leafletAdapter.createLatLng(58.585397, 15.664228),
      leafletAdapter.createLatLng(58.585504, 15.663961),
      leafletAdapter.createLatLng(58.585687, 15.663474),
      leafletAdapter.createLatLng(58.585821, 15.663173),
      leafletAdapter.createLatLng(58.585923, 15.662976),
      leafletAdapter.createLatLng(58.585969, 15.662892),
      leafletAdapter.createLatLng(58.586064, 15.662798),
      leafletAdapter.createLatLng(58.586277, 15.662624),
      leafletAdapter.createLatLng(58.586656, 15.662258),
      leafletAdapter.createLatLng(58.587215, 15.661743),
      leafletAdapter.createLatLng(58.587509, 15.661189),
      leafletAdapter.createLatLng(58.587663, 15.66096),
      leafletAdapter.createLatLng(58.587849, 15.660793),
      leafletAdapter.createLatLng(58.588064, 15.660632),
      leafletAdapter.createLatLng(58.588291, 15.660523),
      leafletAdapter.createLatLng(58.588566, 15.660396),
      leafletAdapter.createLatLng(58.589028, 15.660094),
      leafletAdapter.createLatLng(58.590297, 15.659405),
      leafletAdapter.createLatLng(58.590983, 15.65897),
      leafletAdapter.createLatLng(58.591296, 15.658836),
      leafletAdapter.createLatLng(58.591659, 15.658636),
      leafletAdapter.createLatLng(58.592105, 15.658389),
      leafletAdapter.createLatLng(58.592299, 15.658125),
      leafletAdapter.createLatLng(58.592474, 15.657827),
      leafletAdapter.createLatLng(58.592602, 15.657458),
      leafletAdapter.createLatLng(58.592679, 15.657213),
      leafletAdapter.createLatLng(58.592728, 15.657016),
      leafletAdapter.createLatLng(58.592752, 15.656954),
      leafletAdapter.createLatLng(58.592785, 15.656861),
      leafletAdapter.createLatLng(58.594069, 15.656257),
      leafletAdapter.createLatLng(58.596557, 15.651855),
      leafletAdapter.createLatLng(58.598058, 15.649197),
      leafletAdapter.createLatLng(58.599686, 15.647908),
      leafletAdapter.createLatLng(58.604394, 15.644178),
      leafletAdapter.createLatLng(58.604735, 15.64512),
      leafletAdapter.createLatLng(58.604999, 15.645805),
      leafletAdapter.createLatLng(58.606458, 15.643537),
      leafletAdapter.createLatLng(58.606702, 15.641813),
      leafletAdapter.createLatLng(58.611135, 15.633105),
      leafletAdapter.createLatLng(58.613106, 15.629168),
      leafletAdapter.createLatLng(58.613772, 15.627873),
      leafletAdapter.createLatLng(58.614172, 15.627027),
      leafletAdapter.createLatLng(58.615106, 15.618395),
      leafletAdapter.createLatLng(58.619265, 15.614723),
      leafletAdapter.createLatLng(58.619452, 15.614558),
      leafletAdapter.createLatLng(58.620663, 15.613407),
      leafletAdapter.createLatLng(58.621761, 15.612239),
    ],
    [
      leafletAdapter.createLatLng(58.464796, 15.393734),
      leafletAdapter.createLatLng(58.464737, 15.394753),
      leafletAdapter.createLatLng(58.464737, 15.395912),
      leafletAdapter.createLatLng(58.464782, 15.396566),
      leafletAdapter.createLatLng(58.464389, 15.396985),
      leafletAdapter.createLatLng(58.463699, 15.396255),
      leafletAdapter.createLatLng(58.463766, 15.395992),
      leafletAdapter.createLatLng(58.464162, 15.394882),
      leafletAdapter.createLatLng(58.464661, 15.393852),
      leafletAdapter.createLatLng(58.464796, 15.393734),
    ],
    [
      leafletAdapter.createLatLng(58.485199, 15.379095),
      leafletAdapter.createLatLng(58.487997, 15.378971),
      leafletAdapter.createLatLng(58.488053, 15.380634),
      leafletAdapter.createLatLng(58.48461, 15.380924),
      leafletAdapter.createLatLng(58.485179, 15.379314),
      leafletAdapter.createLatLng(58.485199, 15.379095),
    ],
  ],
  [
    [
      leafletAdapter.createLatLng(58.511221, 15.370173),
      leafletAdapter.createLatLng(58.512656, 15.370606),
      leafletAdapter.createLatLng(58.518128, 15.371269),
      leafletAdapter.createLatLng(58.51626, 15.367437),
      leafletAdapter.createLatLng(58.512864, 15.366753),
      leafletAdapter.createLatLng(58.512043, 15.368367),
      leafletAdapter.createLatLng(58.511221, 15.370173),
    ],
  ],
];

type SampleKey =
  | 'octagon'
  | 'star16'
  | 'star1024'
  | 'squareHole'
  | 'overlap'
  | 'linkoping-0'
  | 'linkoping-4'
  | 'linkoping-7'
  | 'linkoping-10';

interface SampleDefinition {
  coordinates: L.LatLng[][][];
  visualOptimizationLevel?: number;
  viewport?: {
    center: L.LatLngExpression;
    zoom?: number;
  };
}

const sampleLibrary: Record<SampleKey, SampleDefinition> = {
  star16: {
    coordinates: star16,
    viewport: { center: leafletAdapter.createLatLng(58.01, 15.35), zoom: 12 },
  },
  star1024: {
    coordinates: star1024,
    viewport: { center: leafletAdapter.createLatLng(58.01, 15.35), zoom: 12 },
  },
  octagon: {
    coordinates: octagon,
    visualOptimizationLevel: 2,
    viewport: { center: leafletAdapter.createLatLng(58.4015, 15.6), zoom: 13 },
  },
  squareHole: {
    coordinates: squareWithHole,
    viewport: { center: leafletAdapter.createLatLng(58.402, 15.6), zoom: 14 },
  },
  overlap: {
    coordinates: overlappingSquares,
    viewport: { center: leafletAdapter.createLatLng(58.402, 15.6), zoom: 14 },
  },
  'linkoping-0': {
    coordinates: linkoping,
    visualOptimizationLevel: 0,
    viewport: { center: leafletAdapter.createLatLng(58.41, 15.62), zoom: 11 },
  },
  'linkoping-4': {
    coordinates: linkoping,
    visualOptimizationLevel: 4,
    viewport: { center: leafletAdapter.createLatLng(58.41, 15.62), zoom: 11 },
  },
  'linkoping-7': {
    coordinates: linkoping,
    visualOptimizationLevel: 7,
    viewport: { center: leafletAdapter.createLatLng(58.41, 15.62), zoom: 11 },
  },
  'linkoping-10': {
    coordinates: linkoping,
    visualOptimizationLevel: 10,
    viewport: { center: leafletAdapter.createLatLng(58.41, 15.62), zoom: 11 },
  },
};

function registerSampleButtons(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-sample]');
  buttons.forEach((button) => {
    const key = button.dataset.sample as SampleKey | undefined;
    if (!key || !(key in sampleLibrary)) {
      button.disabled = true;
      return;
    }
    button.addEventListener('click', () => {
      const sample = sampleLibrary[key];
      try {
        polydraw.addPredefinedPolygon(sample.coordinates, {
          visualOptimizationLevel: sample.visualOptimizationLevel ?? 0,
        });
        if (sample.viewport) {
          map.setView(sample.viewport.center, sample.viewport.zoom ?? map.getZoom());
        }
        setTimeout(updateStatusBox, 100);
      } catch (error) {
        console.warn(`Failed to add sample polygon "${key}":`, error);
      }
    });
  });
}

registerSampleButtons();

function setupSamplePanelCollapse(): void {
  const header = document.getElementById('samples-header');
  const content = document.getElementById('samples-content');
  const chevron = header?.querySelector('[data-chevron="sample"]') as HTMLElement | null;
  if (!header || !content) return;

  let collapsed = false;
  const updateState = () => {
    content.style.display = collapsed ? 'none' : 'grid';
    if (chevron) {
      chevron.style.transform = collapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
    }
    header.setAttribute('aria-expanded', String(!collapsed));
  };
  const toggle = () => {
    collapsed = !collapsed;
    updateState();
  };

  header.addEventListener('click', toggle);
  header.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  });
  header.setAttribute('tabindex', '0');
  header.setAttribute('role', 'button');
  updateState();
}

setupSamplePanelCollapse();
