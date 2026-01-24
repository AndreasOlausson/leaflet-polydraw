import 'leaflet/dist/leaflet.css';
import 'leaflet-polydraw/dist/leaflet-polydraw.css';
import * as L from 'leaflet';
import Polydraw from 'leaflet-polydraw';
import { leafletAdapter } from 'leaflet-polydraw';
import './version-test';
import { sampleLibrary, type SampleKey } from './sample-polygons';

declare global {
  interface Window {
    polydrawControl?: Polydraw;
  }
}

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

const pointMarkerState = {
  layer: null as L.LayerGroup | null,
  markers: [] as L.Marker[],
  points: [] as L.LatLngLiteral[],
};

// Status box update functionality
function updateStatusBox() {
  const featureGroups = polydraw.getFeatureGroups();
  const countElement = document.getElementById('count-value');
  const structureElement = document.getElementById('structure-value');

  if (countElement) {
    countElement.textContent = String(featureGroups.length);
  }

  if (!structureElement) return;

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
  structureContainer.style.whiteSpace = 'pre-wrap';
  structureContainer.style.wordBreak = 'break-word';
  structureContainer.style.overflowWrap = 'anywhere';

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
      detailLine.style.display = 'block';
      detailLine.style.whiteSpace = 'pre-wrap';

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
  structureElement.appendChild(structureContainer);
}

type PolygonRings = {
  outer: L.LatLng[];
  holes: L.LatLng[][];
};

const isLatLngValue = (value: any): value is L.LatLng =>
  value && typeof value.lat === 'number' && typeof value.lng === 'number';

const isClosedRing = (ring: L.LatLng[]): boolean => {
  if (!Array.isArray(ring) || ring.length < 2) return false;
  const first = ring[0] as L.LatLng;
  const last = ring[ring.length - 1] as L.LatLng;
  if (first && typeof (first as any).equals === 'function') {
    return (first as any).equals(last, 1e-9);
  }
  return Math.abs(first.lat - last.lat) < 1e-12 && Math.abs(first.lng - last.lng) < 1e-12;
};

const normalizeRing = (ring: L.LatLng[]): L.LatLng[] => {
  if (!Array.isArray(ring) || ring.length === 0) return [];
  return isClosedRing(ring) ? ring.slice(0, -1) : ring;
};

const normalizePolygonLatLngs = (
  latLngs: L.LatLng[] | L.LatLng[][] | L.LatLng[][][],
): PolygonRings[] => {
  if (!Array.isArray(latLngs) || latLngs.length === 0) return [];
  const first = latLngs[0] as any;

  if (isLatLngValue(first)) {
    return [{ outer: latLngs as L.LatLng[], holes: [] }];
  }

  if (Array.isArray(first) && isLatLngValue((first as any)[0])) {
    const rings = latLngs as L.LatLng[][];
    const [outer, ...holes] = rings;
    return outer ? [{ outer, holes }] : [];
  }

  const polygons = latLngs as L.LatLng[][][];
  const result: PolygonRings[] = [];
  polygons.forEach((polygon) => {
    if (!Array.isArray(polygon) || polygon.length === 0) return;
    const [outer, ...holes] = polygon;
    if (outer) {
      result.push({ outer, holes });
    }
  });
  return result;
};

const isPointOnSegment = (point: L.LatLngLiteral, a: L.LatLng, b: L.LatLng): boolean => {
  const ax = a.lng;
  const ay = a.lat;
  const bx = b.lng;
  const by = b.lat;
  const px = point.lng;
  const py = point.lat;
  const cross = (py - ay) * (bx - ax) - (px - ax) * (by - ay);
  if (Math.abs(cross) > 1e-12) return false;
  const dot = (px - ax) * (bx - ax) + (py - ay) * (by - ay);
  if (dot < -1e-12) return false;
  const lenSq = (bx - ax) * (bx - ax) + (by - ay) * (by - ay);
  if (dot - lenSq > 1e-12) return false;
  return true;
};

const isPointInRing = (point: L.LatLngLiteral, ring: L.LatLng[]): boolean => {
  if (!Array.isArray(ring) || ring.length < 3) return false;

  const x = point.lng;
  const y = point.lat;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (isPointOnSegment(point, a, b)) {
      return true;
    }
    const xi = a.lng;
    const yi = a.lat;
    const xj = b.lng;
    const yj = b.lat;
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
};

const isPointInPolygon = (point: L.LatLngLiteral, polygon: PolygonRings): boolean => {
  if (!isPointInRing(point, polygon.outer)) return false;
  for (const hole of polygon.holes) {
    if (isPointInRing(point, hole)) return false;
  }
  return true;
};

const collectPolygonRings = (): PolygonRings[] => {
  const polygons: PolygonRings[] = [];
  const featureGroups = polydraw.getFeatureGroups();
  featureGroups.forEach((featureGroup) => {
    featureGroup.eachLayer((layer) => {
      if (layer instanceof L.Polygon) {
        const latLngs = layer.getLatLngs() as L.LatLng[] | L.LatLng[][] | L.LatLng[][][];
        const normalized = normalizePolygonLatLngs(latLngs);
        normalized.forEach((polygon) => {
          const outer = normalizeRing(polygon.outer);
          if (outer.length < 3) return;
          const holes = polygon.holes
            .map(normalizeRing)
            .filter((ring) => Array.isArray(ring) && ring.length >= 3);
          polygons.push({ outer, holes });
        });
      }
    });
  });
  return polygons;
};

function updatePointFilter(): void {
  const summary = document.getElementById('point-filter-summary');
  if (!summary) return;

  const points = pointMarkerState.points;
  const markers = pointMarkerState.markers;
  if (points.length === 0 || markers.length === 0) {
    summary.textContent = 'Points in polygons: 0 / 0';
    return;
  }

  const polygons = collectPolygonRings();
  if (polygons.length === 0) {
    summary.textContent = `Points in polygons: 0 / ${points.length} (no polygons)`;
    markers.forEach((marker) => {
      const el = marker.getElement();
      if (!el) return;
      el.classList.remove('is-inside', 'is-outside');
    });
    return;
  }

  let insideCount = 0;
  const total = Math.min(points.length, markers.length);
  for (let i = 0; i < total; i++) {
    const point = points[i];
    let inside = false;
    for (const polygon of polygons) {
      if (isPointInPolygon(point, polygon)) {
        inside = true;
        break;
      }
    }
    if (inside) insideCount += 1;
    const el = markers[i]?.getElement();
    if (el) {
      el.classList.toggle('is-inside', inside);
      el.classList.toggle('is-outside', !inside);
    }
  }

  summary.textContent = `Points in polygons: ${insideCount} / ${points.length}`;
}

// Subscribe to polygon changes using proper event handling
const refreshPolygonViews = () => {
  updateStatusBox();
  updatePointFilter();
};

(polydraw as any).on('polydraw:polygon:created', refreshPolygonViews);
(polydraw as any).on('polydraw:polygon:updated', refreshPolygonViews);
(polydraw as any).on('polydraw:polygon:deleted', refreshPolygonViews);
(polydraw as any).on('polydraw:history:undo', refreshPolygonViews);
(polydraw as any).on('polydraw:history:redo', refreshPolygonViews);

(polydraw as any).on('polydraw:mode:change', (data: any) => {
  updateStatusBox();
});

// Listen for any polygon operations (add, subtract, delete)
(polydraw as any).on('polygonOperationComplete', refreshPolygonViews);

(polydraw as any).on('polygonDeleted', refreshPolygonViews);

// Initial status update
refreshPolygonViews();

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
        setTimeout(refreshPolygonViews, 100);
      } catch (error) {
        console.warn(`Failed to add sample polygon "${key}":`, error);
      }
    });
  });
}

registerSampleButtons();

const clampCount = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
};

const createSpreadPoints = (count: number, bounds: L.LatLngBounds): L.LatLngLiteral[] => {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const width = Math.max(0.000001, Math.abs(ne.lng - sw.lng));
  const height = Math.max(0.000001, Math.abs(ne.lat - sw.lat));
  const aspect = width / height;
  const cols = Math.max(1, Math.ceil(Math.sqrt(count * aspect)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const lngStep = width / cols;
  const latStep = height / rows;
  const points: L.LatLngLiteral[] = [];

  for (let row = 0; row < rows && points.length < count; row++) {
    for (let col = 0; col < cols && points.length < count; col++) {
      const lat = sw.lat + row * latStep + Math.random() * latStep;
      const lng = sw.lng + col * lngStep + Math.random() * lngStep;
      points.push({ lat, lng });
    }
  }

  return points;
};

function setupMarkerGenerator(): void {
  const input = document.getElementById('marker-count') as HTMLInputElement | null;
  const button = document.getElementById('marker-generate') as HTMLButtonElement | null;
  if (!input || !button) return;

  const sortPointsByAngle = (
    points: L.LatLngLiteral[],
    anchor: L.LatLngLiteral,
  ): L.LatLngLiteral[] => {
    return [...points].sort(
      (a, b) =>
        Math.atan2(a.lat - anchor.lat, a.lng - anchor.lng) -
        Math.atan2(b.lat - anchor.lat, b.lng - anchor.lng),
    );
  };

  const generate = () => {
    const count = clampCount(Number.parseInt(input.value, 10), 3, 2000);
    input.value = String(count);

    const points = createSpreadPoints(count, map.getBounds());
    if (points.length < 3) {
      return;
    }

    const center = map.getBounds().getCenter();
    const sorted = sortPointsByAngle(points, { lat: center.lat, lng: center.lng });
    const ring = sorted.map((pt) => leafletAdapter.createLatLng(pt.lat, pt.lng));
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first && last && (first.lat !== last.lat || first.lng !== last.lng)) {
      ring.push(leafletAdapter.createLatLng(first.lat, first.lng));
    }

    polydraw.addPredefinedPolygon([[ring]], { visualOptimizationLevel: 0 });
    setTimeout(refreshPolygonViews, 100);
  };

  button.addEventListener('click', generate);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      generate();
    }
  });
}

setupMarkerGenerator();

function setupPointMarkerGenerator(): void {
  const input = document.getElementById('point-count') as HTMLInputElement | null;
  const button = document.getElementById('point-generate') as HTMLButtonElement | null;
  if (!input || !button) return;

  const pointIcon = leafletAdapter.createDivIcon({
    className: 'demo-point-marker leaflet-div-icon',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });

  const generate = () => {
    const count = clampCount(Number.parseInt(input.value, 10), 1, 2000);
    input.value = String(count);

    if (pointMarkerState.layer) {
      map.removeLayer(pointMarkerState.layer);
      pointMarkerState.layer = null;
    }

    const points = createSpreadPoints(count, map.getBounds());
    const markers = points.map((pt) =>
      leafletAdapter.createMarker(leafletAdapter.createLatLng(pt.lat, pt.lng), {
        icon: pointIcon,
        interactive: false,
        keyboard: false,
      }),
    );
    pointMarkerState.points = points;
    pointMarkerState.markers = markers;
    pointMarkerState.layer = leafletAdapter.createLayerGroup(markers).addTo(map);
    setTimeout(updatePointFilter, 0);
  };

  button.addEventListener('click', generate);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      generate();
    }
  });
}

setupPointMarkerGenerator();

type PanelCollapseOptions = {
  headerId: string;
  contentId: string;
  chevronSelector: string;
  expandedDisplay?: string;
  extraId?: string;
  extraExpandedDisplay?: string;
};

function setupPanelCollapse({
  headerId,
  contentId,
  chevronSelector,
  expandedDisplay = 'block',
  extraId,
  extraExpandedDisplay = 'block',
}: PanelCollapseOptions): void {
  const header = document.getElementById(headerId);
  const content = document.getElementById(contentId);
  const extra = extraId ? document.getElementById(extraId) : null;
  const chevron = header?.querySelector(chevronSelector) as HTMLElement | null;
  if (!header || !content) return;

  let collapsed = header.getAttribute('aria-expanded') === 'false';
  const updateState = () => {
    content.style.display = collapsed ? 'none' : expandedDisplay;
    if (extra) {
      extra.style.display = collapsed ? 'none' : extraExpandedDisplay;
    }
    if (chevron) {
      chevron.style.transform = collapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
    }
    header.setAttribute('aria-expanded', String(!collapsed));
  };

  header.addEventListener('click', () => {
    collapsed = !collapsed;
    updateState();
  });
  updateState();
}

setupPanelCollapse({
  headerId: 'samples-header',
  contentId: 'samples-content',
  chevronSelector: '[data-chevron="sample"]',
  expandedDisplay: 'grid',
  extraId: 'samples-extra',
  extraExpandedDisplay: 'block',
});

setupPanelCollapse({
  headerId: 'status-header',
  contentId: 'polygon-status-content',
  chevronSelector: '[data-chevron="status"]',
});
